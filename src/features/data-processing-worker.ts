import { createHash, randomUUID } from "node:crypto";
import {
  assertIndependentVerification,
  processingExecutionEvidenceSchema,
  processingVerificationEvidenceSchema,
  transitionProcessingJob,
  type ProcessingJobRecord
} from "./data-processing-contract.js";
import { invoiceExtractionSchema, type InvoiceExtraction } from "./invoice-extraction-schema.js";

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export interface AuthenticatedWorkerIdentity {
  subject: string;
  workerId: "data-processing-ai";
}

export interface AuthenticatedVerifierIdentity {
  subject: string;
}

export interface WorkerIdentityAuthenticator {
  authenticate(assertion: string): Promise<AuthenticatedWorkerIdentity>;
}

export interface VerifierIdentityAuthenticator {
  authenticate(assertion: string): Promise<AuthenticatedVerifierIdentity>;
}

export interface InvoiceModelAdapter {
  provider: string;
  modelVersion: string;
  promptConfigVersion: string;
  extract(input: Uint8Array, signal: AbortSignal): Promise<{
    output: unknown;
    traceRef: string;
    resourceUnits: number;
  }>;
}

export interface IndependentInvoiceVerifier {
  policyVersion: string;
  verify(input: Uint8Array, output: InvoiceExtraction, signal: AbortSignal): Promise<{
    verdict: "PASS" | "REVIEW_REQUIRED" | "REJECT";
    fieldsReviewed: number;
    requiredFields: number;
    sourceEvidenceCoverage: number;
    reasonCode: string;
  }>;
}

export interface ExecuteInvoiceJobInput {
  job: ProcessingJobRecord;
  input: Uint8Array;
  workerAssertion: string;
  verifierAssertion: string;
  workerIdentity: WorkerIdentityAuthenticator;
  verifierIdentity: VerifierIdentityAuthenticator;
  model: InvoiceModelAdapter;
  verifier: IndependentInvoiceVerifier;
  signal: AbortSignal;
  now?: () => Date;
}

export interface InvoiceJobExecutionResult {
  status: "SUCCEEDED" | "REVIEW_REQUIRED" | "REJECTED";
  execution: ReturnType<typeof processingExecutionEvidenceSchema.parse>;
  verification: ReturnType<typeof processingVerificationEvidenceSchema.parse>;
  output: InvoiceExtraction;
  lifecycle: readonly string[];
}

/**
 * Provider-neutral, fail-closed orchestration. It does not persist documents,
 * accept credentials itself, or provide a production provider adapter.
 * Callers must supply trusted identity authenticators and isolated adapters.
 */
export async function executeInvoiceProcessingJob(
  input: ExecuteInvoiceJobInput
): Promise<InvoiceJobExecutionResult> {
  if (input.job.status !== "AUTHORIZED") {
    throw new Error("Only an AUTHORIZED processing job can be executed.");
  }
  if (input.job.documentType !== "invoice") {
    throw new Error("This executor only accepts invoice jobs.");
  }
  if (input.signal.aborted) throw new Error("Execution was cancelled before start.");

  const inputHash = sha256(input.input);
  if (inputHash.toLowerCase() !== input.job.inputSha256.toLowerCase()) {
    throw new Error("Input bytes do not match the authorized job hash.");
  }

  const worker = await input.workerIdentity.authenticate(input.workerAssertion);
  if (worker.workerId !== "data-processing-ai") {
    throw new Error("Authenticated principal is not the Data Processing AI worker.");
  }
  const verifierIdentity = await input.verifierIdentity.authenticate(input.verifierAssertion);
  if (verifierIdentity.subject === worker.subject) {
    throw new Error("The producing worker and independent verifier must have different identities.");
  }

  const lifecycle = ["AUTHORIZED"];
  let status = transitionProcessingJob("AUTHORIZED", "QUEUED");
  lifecycle.push(status);
  status = transitionProcessingJob(status, "RUNNING");
  lifecycle.push(status);

  const startedAt = (input.now ?? (() => new Date()))().toISOString();
  const modelResult = await input.model.extract(input.input, input.signal);
  if (input.signal.aborted) throw new Error("Execution was cancelled during model processing.");
  const completedAt = (input.now ?? (() => new Date()))().toISOString();

  status = transitionProcessingJob(status, "VALIDATING");
  lifecycle.push(status);
  const output = invoiceExtractionSchema.parse(modelResult.output);
  const outputBytes = new TextEncoder().encode(JSON.stringify(output));
  const execution = processingExecutionEvidenceSchema.parse({
    executionId: randomUUID(),
    jobId: input.job.jobId,
    workerId: worker.workerId,
    workerPrincipalId: worker.subject,
    workerVersion: "data-processing-worker-runtime-v1",
    modelProvider: input.model.provider,
    modelVersion: input.model.modelVersion,
    promptConfigVersion: input.model.promptConfigVersion,
    inputSha256: inputHash,
    outputSha256: sha256(outputBytes),
    outputObjectRef: `ephemeral-output:${input.job.jobId}`,
    traceRef: modelResult.traceRef,
    startedAt,
    completedAt,
    attempt: 1,
    resourceUnits: modelResult.resourceUnits
  });

  const verifierResult = await input.verifier.verify(input.input, output, input.signal);
  if (verifierResult.verdict === "PASS" && verifierResult.fieldsReviewed !== verifierResult.requiredFields) {
    throw new Error("A passing verification must review every required field.");
  }
  const verification = processingVerificationEvidenceSchema.parse({
    executionId: execution.executionId,
    verifierPrincipalId: verifierIdentity.subject,
    verifierKind: "INDEPENDENT_AUTOMATED",
    inputSha256: inputHash,
    outputSha256: execution.outputSha256,
    verdict: verifierResult.verdict,
    fieldsReviewed: verifierResult.fieldsReviewed,
    requiredFields: verifierResult.requiredFields,
    sourceEvidenceCoverage: verifierResult.sourceEvidenceCoverage,
    policyVersion: input.verifier.policyVersion,
    reasonCode: verifierResult.reasonCode
  });

  assertIndependentVerification(input.job, execution, verification);
  const finalStatus = verifierResult.verdict === "PASS"
    ? transitionProcessingJob(status, "SUCCEEDED")
    : verifierResult.verdict === "REVIEW_REQUIRED"
      ? transitionProcessingJob(status, "REVIEW_REQUIRED")
      : transitionProcessingJob(status, "REJECTED");
  lifecycle.push(finalStatus);

  return { status: finalStatus, execution, verification, output, lifecycle };
}
