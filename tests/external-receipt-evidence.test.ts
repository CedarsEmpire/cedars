import { describe, expect, it } from "vitest";
import {
  adjudicateExternalReceiptObservation,
  createExternalReceiptObservation
} from "../src/features/external-receipt-evidence.js";

const syntheticEvidence = {
  externalReference: "synthetic-receipt-001",
  payerReference: "synthetic-payer-001",
  sourceReportedAmount: "125.40",
  currency: "USD",
  reportedAt: "2026-11-08T12:00:00Z",
  evidenceSourceReference: "synthetic-evidence-001",
  evidenceVerifierReference: "synthetic-verifier-001",
  customerAcceptanceReference: "synthetic-acceptance-001",
  evidenceSha256: "a".repeat(64)
};

describe("external receipt evidence controls", () => {
  it("creates only an unverified metadata observation with no financial effect", () => {
    const observation = createExternalReceiptObservation(syntheticEvidence);

    expect(observation.reconciliationState).toBe("UNVERIFIED");
    expect(observation.controls).toEqual({
      ledgerMode: "EXTERNAL_RECEIPT_METADATA_ONLY",
      payableBalanceCreated: false,
      memberCreditCreated: false,
      settlementInitiated: false,
      fiatTransactionCreated: false
    });
    expect(Object.isFrozen(observation)).toBe(true);
  });

  it("rejects malformed amounts and fields outside the metadata contract", () => {
    expect(() => createExternalReceiptObservation({
      ...syntheticEvidence,
      sourceReportedAmount: "1e3"
    })).toThrow();
    expect(() => createExternalReceiptObservation({
      ...syntheticEvidence,
      cardNumber: "4111111111111111"
    })).toThrow();
  });

  it("requires two distinct approvers independent of the evidence verifier", () => {
    const observation = createExternalReceiptObservation(syntheticEvidence);

    expect(() => adjudicateExternalReceiptObservation(observation, {
      to: "MATCHED",
      reason: "Synthetic single-approver attempt",
      approverReferences: ["synthetic-approver-a", "synthetic-approver-a"],
      recordedAt: "2026-11-08T12:10:00Z"
    })).toThrow(/Two distinct approvers/);

    expect(() => adjudicateExternalReceiptObservation(observation, {
      to: "MATCHED",
      reason: "Verifier attempts own approval",
      approverReferences: ["synthetic-verifier-001", "synthetic-approver-b"],
      recordedAt: "2026-11-08T12:10:00Z"
    })).toThrow(/cannot approve its own/);
  });

  it("records an explicit state transition while preserving no-effect controls", () => {
    const unverified = createExternalReceiptObservation(syntheticEvidence);
    const matched = adjudicateExternalReceiptObservation(unverified, {
      to: "MATCHED",
      reason: "Synthetic evidence independently matched",
      approverReferences: ["synthetic-approver-a", "synthetic-approver-b"],
      recordedAt: "2026-11-08T12:10:00Z"
    });

    expect(matched.reconciliationState).toBe("MATCHED");
    expect(matched.adjudications).toHaveLength(1);
    expect(matched.adjudications[0]).toMatchObject({
      from: "UNVERIFIED",
      to: "MATCHED",
      approverReferences: ["synthetic-approver-a", "synthetic-approver-b"]
    });
    expect(matched.controls.memberCreditCreated).toBe(false);
    expect(matched.controls.payableBalanceCreated).toBe(false);
    expect(matched.controls.settlementInitiated).toBe(false);
    expect(matched.controls.fiatTransactionCreated).toBe(false);
  });

  it("rejects unsupported and terminal-state transitions", () => {
    const unverified = createExternalReceiptObservation(syntheticEvidence);
    expect(() => adjudicateExternalReceiptObservation(unverified, {
      to: "REVERSED",
      reason: "Cannot reverse unverified observation",
      approverReferences: ["synthetic-approver-a", "synthetic-approver-b"],
      recordedAt: "2026-11-08T12:10:00Z"
    })).toThrow(/cannot move/);

    const matched = adjudicateExternalReceiptObservation(unverified, {
      to: "MATCHED",
      reason: "Synthetic evidence independently matched",
      approverReferences: ["synthetic-approver-a", "synthetic-approver-b"],
      recordedAt: "2026-11-08T12:10:00Z"
    });
    const reversed = adjudicateExternalReceiptObservation(matched, {
      to: "REVERSED",
      reason: "Synthetic source evidence documents a reversal",
      approverReferences: ["synthetic-approver-c", "synthetic-approver-d"],
      recordedAt: "2026-11-08T12:20:00Z"
    });
    expect(() => adjudicateExternalReceiptObservation(reversed, {
      to: "MATCHED",
      reason: "Attempt to reopen terminal reversal",
      approverReferences: ["synthetic-approver-a", "synthetic-approver-b"],
      recordedAt: "2026-11-08T12:30:00Z"
    })).toThrow(/cannot move/);
  });
});
