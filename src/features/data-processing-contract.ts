import { z } from "zod";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i, "Expected a SHA-256 hex digest.");
const opaqueReferenceSchema = z.string().trim().min(8).max(256);

export const processingJobStatusSchema = z.enum([
  "DRAFT",
  "AUTHORIZED",
  "QUEUED",
  "RUNNING",
  "VALIDATING",
  "REVIEW_REQUIRED",
  "SUCCEEDED",
  "FAILED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED"
]);

export type ProcessingJobStatus = z.infer<typeof processingJobStatusSchema>;

/**
 * Metadata-only request contract. Document bytes and extracted values are
 * deliberately excluded from this API contract and must never be logged here.
 */
export const createProcessingJobSchema = z.object({
  tenantRef: opaqueReferenceSchema,
  customerRef: opaqueReferenceSchema,
  authorizationRef: opaqueReferenceSchema,
  documentType: z.string().trim().min(2).max(64).regex(/^[a-z0-9][a-z0-9._-]*$/),
  extractionSchemaVersion: z.string().trim().min(1).max(64),
  acceptancePolicyVersion: z.string().trim().min(1).max(64),
  inputSha256: sha256Schema,
  sourceObjectRef: opaqueReferenceSchema,
  idempotencyKey: z.string().trim().min(16).max(128)
}).strict();

export type CreateProcessingJobInput = z.infer<typeof createProcessingJobSchema>;

export const processingExecutionEvidenceSchema = z.object({
  executionId: z.string().uuid(),
  jobId: z.string().uuid(),
  workerId: z.literal("data-processing-ai"),
  workerVersion: z.string().trim().min(1).max(80),
  modelProvider: z.string().trim().min(1).max(80),
  modelVersion: z.string().trim().min(1).max(120),
  promptConfigVersion: z.string().trim().min(1).max(80),
  inputSha256: sha256Schema,
  outputSha256: sha256Schema,
  outputObjectRef: opaqueReferenceSchema,
  traceRef: opaqueReferenceSchema,
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }),
  attempt: z.number().int().min(1).max(5),
  resourceUnits: z.number().finite().nonnegative()
}).strict().superRefine((evidence, context) => {
  if (Date.parse(evidence.completedAt) < Date.parse(evidence.startedAt)) {
    context.addIssue({
      code: "custom",
      path: ["completedAt"],
      message: "Execution completion cannot precede its start."
    });
  }
});

export type ProcessingExecutionEvidence = z.infer<typeof processingExecutionEvidenceSchema>;

export const processingVerificationEvidenceSchema = z.object({
  executionId: z.string().uuid(),
  verifierId: z.string().trim().min(3).max(128),
  verifierKind: z.enum(["INDEPENDENT_AUTOMATED", "HUMAN_REVIEW"]),
  inputSha256: sha256Schema,
  outputSha256: sha256Schema,
  verdict: z.enum(["PASS", "REVIEW_REQUIRED", "REJECT"]),
  fieldsReviewed: z.number().int().nonnegative(),
  requiredFields: z.number().int().positive(),
  sourceEvidenceCoverage: z.number().min(0).max(1),
  policyVersion: z.string().trim().min(1).max(80),
  reasonCode: z.string().trim().min(2).max(80)
}).strict().superRefine((evidence, context) => {
  if (evidence.fieldsReviewed > evidence.requiredFields) {
    context.addIssue({
      code: "custom",
      path: ["fieldsReviewed"],
      message: "Reviewed fields cannot exceed the required field count."
    });
  }
});

export type ProcessingVerificationEvidence = z.infer<typeof processingVerificationEvidenceSchema>;

const allowedTransitions: Record<ProcessingJobStatus, readonly ProcessingJobStatus[]> = {
  DRAFT: ["AUTHORIZED", "CANCELLED"],
  AUTHORIZED: ["QUEUED", "CANCELLED"],
  QUEUED: ["RUNNING", "CANCELLED", "EXPIRED"],
  RUNNING: ["VALIDATING", "FAILED", "CANCELLED"],
  VALIDATING: ["SUCCEEDED", "REVIEW_REQUIRED", "REJECTED", "FAILED"],
  REVIEW_REQUIRED: ["SUCCEEDED", "REJECTED", "CANCELLED"],
  SUCCEEDED: [],
  FAILED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: []
};

export class ProcessingContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProcessingContractError";
  }
}

export function canTransitionProcessingJob(
  current: ProcessingJobStatus,
  next: ProcessingJobStatus
): boolean {
  return allowedTransitions[current].includes(next);
}

export function transitionProcessingJob(
  current: ProcessingJobStatus,
  next: ProcessingJobStatus
): ProcessingJobStatus {
  if (!canTransitionProcessingJob(current, next)) {
    throw new ProcessingContractError(`Invalid processing job transition: ${current} -> ${next}.`);
  }
  return next;
}

/**
 * Binds independently supplied verification evidence to the exact execution.
 * The producing worker cannot verify its own output.
 */
export function assertIndependentVerification(
  job: CreateProcessingJobInput,
  execution: ProcessingExecutionEvidence,
  verification: ProcessingVerificationEvidence
): void {
  if (execution.inputSha256.toLowerCase() !== job.inputSha256.toLowerCase()) {
    throw new ProcessingContractError("Execution input hash does not match the authorized job input.");
  }
  if (verification.executionId !== execution.executionId) {
    throw new ProcessingContractError("Verification evidence references a different execution.");
  }
  if (verification.inputSha256.toLowerCase() !== execution.inputSha256.toLowerCase()) {
    throw new ProcessingContractError("Verification input hash does not match the execution.");
  }
  if (verification.outputSha256.toLowerCase() !== execution.outputSha256.toLowerCase()) {
    throw new ProcessingContractError("Verification output hash does not match the execution.");
  }
  if (verification.verifierId === execution.workerId) {
    throw new ProcessingContractError("The producing worker cannot verify its own output.");
  }
  if (verification.verdict === "PASS" && verification.sourceEvidenceCoverage < 1) {
    throw new ProcessingContractError("A passing verification requires complete source-evidence coverage.");
  }
}
