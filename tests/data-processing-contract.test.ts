import { describe, expect, it } from "vitest";
import {
  assertIndependentVerification,
  canTransitionProcessingJob,
  createProcessingJobSchema,
  processingExecutionEvidenceSchema,
  processingVerificationEvidenceSchema,
  ProcessingContractError,
  transitionProcessingJob
} from "../src/features/data-processing-contract.js";

const jobInput = {
  tenantRef: "tenant-ref-001",
  customerRef: "customer-ref-001",
  authorizationRef: "authorization-ref-001",
  documentType: "generic-document",
  extractionSchemaVersion: "v1",
  acceptancePolicyVersion: "v1",
  inputSha256: "a".repeat(64),
  sourceObjectRef: "object-ref-001",
  idempotencyKey: "idempotency-key-0001"
};

const executionInput = {
  executionId: "11111111-1111-4111-8111-111111111111",
  jobId: "22222222-2222-4222-8222-222222222222",
  workerId: "data-processing-ai",
  workerPrincipalId: "worker-principal-001",
  workerVersion: "0.1.0",
  modelProvider: "test-provider",
  modelVersion: "test-model-v1",
  promptConfigVersion: "extract-v1",
  inputSha256: "a".repeat(64),
  outputSha256: "b".repeat(64),
  outputObjectRef: "output-ref-001",
  traceRef: "trace-ref-001",
  startedAt: "2026-11-08T10:00:00.000Z",
  completedAt: "2026-11-08T10:00:05.000Z",
  attempt: 1,
  resourceUnits: 1
};

const verificationInput = {
  executionId: executionInput.executionId,
  verifierId: "independent-verifier-01",
  verifierKind: "INDEPENDENT_AUTOMATED",
  inputSha256: executionInput.inputSha256,
  outputSha256: executionInput.outputSha256,
  verdict: "PASS",
  fieldsReviewed: 4,
  requiredFields: 4,
  sourceEvidenceCoverage: 1,
  policyVersion: "qa-v1",
  reasonCode: "ALL_CHECKS_PASSED"
};

describe("Data Processing Grid job contract", () => {
  it("accepts metadata-only job requests and rejects document payloads", () => {
    expect(createProcessingJobSchema.safeParse(jobInput).success).toBe(true);
    expect(createProcessingJobSchema.safeParse({ ...jobInput, documentContent: "private content" }).success).toBe(false);
    expect(createProcessingJobSchema.safeParse({ ...jobInput, inputSha256: "not-a-hash" }).success).toBe(false);
  });

  it("requires complete and ordered execution provenance", () => {
    expect(processingExecutionEvidenceSchema.safeParse(executionInput).success).toBe(true);
    expect(processingExecutionEvidenceSchema.safeParse({
      ...executionInput,
      completedAt: "2026-11-08T09:59:59.000Z"
    }).success).toBe(false);
    expect(processingExecutionEvidenceSchema.safeParse({
      ...executionInput,
      workerId: "manual-admin"
    }).success).toBe(false);
  });

  it("validates verification evidence and binds it to the exact execution", () => {
    const job = createProcessingJobSchema.parse(jobInput);
    const execution = processingExecutionEvidenceSchema.parse(executionInput);
    const verification = processingVerificationEvidenceSchema.parse(verificationInput);
    expect(() => assertIndependentVerification(job, execution, verification)).not.toThrow();
  });

  it("rejects self-verification and mismatched input/output provenance", () => {
    const job = createProcessingJobSchema.parse(jobInput);
    const execution = processingExecutionEvidenceSchema.parse(executionInput);
    const selfVerification = processingVerificationEvidenceSchema.parse({
      ...verificationInput,
      verifierId: execution.workerPrincipalId
    });
    expect(() => assertIndependentVerification(job, execution, selfVerification))
      .toThrow(/cannot verify its own output/);

    const mismatchedOutput = processingVerificationEvidenceSchema.parse({
      ...verificationInput,
      outputSha256: "c".repeat(64)
    });
    expect(() => assertIndependentVerification(job, execution, mismatchedOutput))
      .toThrow(/output hash does not match/);
  });

  it("does not allow a passing QA verdict without complete source evidence", () => {
    const job = createProcessingJobSchema.parse(jobInput);
    const execution = processingExecutionEvidenceSchema.parse(executionInput);
    const partial = processingVerificationEvidenceSchema.parse({
      ...verificationInput,
      sourceEvidenceCoverage: 0.75
    });
    expect(() => assertIndependentVerification(job, execution, partial))
      .toThrow(/complete source-evidence coverage/);
  });

  it("enforces the explicit job state machine and terminal states", () => {
    expect(canTransitionProcessingJob("AUTHORIZED", "QUEUED")).toBe(true);
    expect(transitionProcessingJob("QUEUED", "RUNNING")).toBe("RUNNING");
    expect(canTransitionProcessingJob("SUCCEEDED", "RUNNING")).toBe(false);
    expect(() => transitionProcessingJob("SUCCEEDED", "RUNNING"))
      .toThrow(ProcessingContractError);
    expect(canTransitionProcessingJob("DRAFT", "SUCCEEDED")).toBe(false);
  });
});
