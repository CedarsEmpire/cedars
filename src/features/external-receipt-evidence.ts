import { z } from "zod";

/**
 * Pure, non-persistent contract for externally evidenced receipts.
 * References must be opaque identifiers, never names, account credentials, or card data.
 * This module performs no network, database, payment, balance, or settlement operation.
 */
const opaqueReferenceSchema = z.string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/);

export const externalReceiptEvidenceSchema = z.object({
  externalReference: opaqueReferenceSchema,
  payerReference: opaqueReferenceSchema,
  sourceReportedAmount: z.string()
    .regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
    .refine((value) => /[1-9]/.test(value), "Amount must be greater than zero."),
  currency: z.string().regex(/^[A-Z]{3}$/),
  reportedAt: z.string().datetime({ offset: true }),
  evidenceSourceReference: opaqueReferenceSchema,
  evidenceVerifierReference: opaqueReferenceSchema,
  customerAcceptanceReference: opaqueReferenceSchema.nullable(),
  evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/i)
}).strict();

export type ExternalReceiptEvidence = z.infer<typeof externalReceiptEvidenceSchema>;

export const reconciliationStates = [
  "UNVERIFIED",
  "MATCHED",
  "EXCEPTION",
  "REVERSED",
  "DISPUTED"
] as const;

export type ReconciliationState = typeof reconciliationStates[number];

export interface ReceiptAdjudication {
  from: ReconciliationState;
  to: ReconciliationState;
  reason: string;
  approverReferences: readonly [string, string];
  recordedAt: string;
}

export interface ExternalReceiptObservation {
  evidence: ExternalReceiptEvidence;
  reconciliationState: ReconciliationState;
  adjudications: readonly ReceiptAdjudication[];
  controls: {
    ledgerMode: "EXTERNAL_RECEIPT_METADATA_ONLY";
    payableBalanceCreated: false;
    memberCreditCreated: false;
    settlementInitiated: false;
    fiatTransactionCreated: false;
  };
}

const allowedTransitions: Record<ReconciliationState, readonly ReconciliationState[]> = {
  UNVERIFIED: ["MATCHED", "EXCEPTION", "DISPUTED"],
  MATCHED: ["REVERSED", "DISPUTED"],
  EXCEPTION: ["MATCHED", "DISPUTED"],
  REVERSED: [],
  DISPUTED: ["MATCHED", "EXCEPTION", "REVERSED"]
};

const noFinancialEffect = Object.freeze({
  ledgerMode: "EXTERNAL_RECEIPT_METADATA_ONLY" as const,
  payableBalanceCreated: false as const,
  memberCreditCreated: false as const,
  settlementInitiated: false as const,
  fiatTransactionCreated: false as const
});

export function createExternalReceiptObservation(input: unknown): ExternalReceiptObservation {
  const evidence = Object.freeze(externalReceiptEvidenceSchema.parse(input));
  return Object.freeze({
    evidence,
    reconciliationState: "UNVERIFIED" as const,
    adjudications: Object.freeze([]),
    controls: noFinancialEffect
  });
}

const adjudicationInputSchema = z.object({
  to: z.enum(reconciliationStates),
  reason: z.string().trim().min(8).max(500),
  approverReferences: z.array(opaqueReferenceSchema).length(2),
  recordedAt: z.string().datetime({ offset: true })
}).strict().superRefine((input, context) => {
  if (input.approverReferences[0] === input.approverReferences[1]) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Two distinct approvers are required.", path: ["approverReferences"] });
  }
});

export function adjudicateExternalReceiptObservation(
  observation: ExternalReceiptObservation,
  input: unknown
): ExternalReceiptObservation {
  const adjudication = adjudicationInputSchema.parse(input);
  const [firstApprover, secondApprover] = adjudication.approverReferences;
  if (firstApprover === observation.evidence.evidenceVerifierReference ||
      secondApprover === observation.evidence.evidenceVerifierReference) {
    throw new Error("Evidence verifier cannot approve its own receipt adjudication.");
  }
  if (!allowedTransitions[observation.reconciliationState].includes(adjudication.to)) {
    throw new Error(`Receipt reconciliation cannot move from ${observation.reconciliationState} to ${adjudication.to}.`);
  }

  const approverReferences = Object.freeze([firstApprover, secondApprover]) as readonly [string, string];
  const event = Object.freeze({
    from: observation.reconciliationState,
    to: adjudication.to,
    reason: adjudication.reason,
    approverReferences,
    recordedAt: adjudication.recordedAt
  });
  return Object.freeze({
    evidence: observation.evidence,
    reconciliationState: adjudication.to,
    adjudications: Object.freeze([...observation.adjudications, event]),
    controls: noFinancialEffect
  });
}
