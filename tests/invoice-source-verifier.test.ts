import { describe, expect, it } from "vitest";
import { invoiceExtractionSchema } from "../src/features/invoice-extraction-schema.js";
import { createIndependentInvoiceVerifier, verifyInvoiceSourceEvidence } from "../src/features/invoice-source-verifier.js";

const quote = "Supplier: Example Co | Invoice: INV-001 | Date: 2026-11-01 | Due: N/A | Currency: USD | Subtotal: 10.00 | Tax: N/A | Total: 10.00 | Books 1 x 10.00 = 10.00";
const evidence = [{ pageNumber: 1, textQuote: quote }];
const output = invoiceExtractionSchema.parse({
  schemaVersion: "invoice-extraction-v1",
  documentType: "invoice",
  supplierName: { value: "Example Co", evidence },
  invoiceNumber: { value: "INV-001", evidence },
  invoiceDate: { value: "2026-11-01", evidence },
  dueDate: { value: null, evidence },
  currency: { value: "USD", evidence },
  subtotal: { value: "10.00", evidence },
  taxAmount: { value: null, evidence },
  totalAmount: { value: "10.00", evidence },
  lineItems: [{
    description: { value: "Books", evidence },
    quantity: { value: "1", evidence },
    unitPrice: { value: "10.00", evidence },
    lineTotal: { value: "10.00", evidence }
  }]
});

describe("source-grounded invoice evidence verifier", () => {
  it("passes only when every quoted field value is present on its cited page", () => {
    const result = verifyInvoiceSourceEvidence([{ pageNumber: 1, text: quote }], output);

    expect(result).toEqual({
      verdict: "PASS",
      fieldsReviewed: 12,
      requiredFields: 12,
      sourceEvidenceCoverage: 1,
      reasonCode: "ALL_FIELD_EVIDENCE_SUPPORTED"
    });
  });

  it("requires explicit source evidence for nullable fields", () => {
    const withUnstatedDueDate = {
      ...output,
      dueDate: { value: null, evidence: [{ pageNumber: 1, textQuote: "Invoice: INV-001" }] }
    };

    const result = verifyInvoiceSourceEvidence([{ pageNumber: 1, text: quote }], withUnstatedDueDate);

    expect(result.verdict).toBe("REVIEW_REQUIRED");
    expect(result.reasonCode).toBe("SOURCE_EVIDENCE_INCOMPLETE");
    expect(result.sourceEvidenceCoverage).toBeLessThan(1);
  });

  it("routes a value that conflicts with its cited source quote to review", () => {
    const conflictingOutput = {
      ...output,
      invoiceNumber: { ...output.invoiceNumber, value: "INV-999" }
    };

    const result = verifyInvoiceSourceEvidence([{ pageNumber: 1, text: quote }], conflictingOutput);

    expect(result.verdict).toBe("REVIEW_REQUIRED");
    expect(result.sourceEvidenceCoverage).toBeLessThan(1);
  });

  it("routes missing pages, missing quotes, and duplicate page numbers to review", () => {
    expect(verifyInvoiceSourceEvidence([], output)).toMatchObject({
      verdict: "REVIEW_REQUIRED",
      fieldsReviewed: 0,
      reasonCode: "INVALID_SOURCE_PAGES"
    });
    expect(verifyInvoiceSourceEvidence([{ pageNumber: 1, text: "Other source text" }], output).verdict)
      .toBe("REVIEW_REQUIRED");
    expect(verifyInvoiceSourceEvidence([
      { pageNumber: 1, text: quote },
      { pageNumber: 1, text: quote }
    ], output).reasonCode).toBe("INVALID_SOURCE_PAGES");
  });

  it("requires a null marker to refer to the nullable field being checked", () => {
    const unrelatedNullMarker = {
      ...output,
      dueDate: { value: null, evidence: [{ pageNumber: 1, textQuote: "Tax: N/A" }] }
    };

    const result = verifyInvoiceSourceEvidence([
      { pageNumber: 1, text: `${quote} | Tax: N/A` }
    ], unrelatedNullMarker);

    expect(result.verdict).toBe("REVIEW_REQUIRED");
  });

  it("does not accept a numeric substring as evidence for a different value", () => {
    const quantityMismatch = {
      ...output,
      lineItems: [{
        ...output.lineItems[0],
        quantity: { value: "1", evidence: [{ pageNumber: 1, textQuote: "Books 10" }] }
      }]
    };

    const result = verifyInvoiceSourceEvidence([
      { pageNumber: 1, text: `${quote} | Books 10` }
    ], quantityMismatch);

    expect(result.verdict).toBe("REVIEW_REQUIRED");
    expect(result.sourceEvidenceCoverage).toBeLessThan(1);
  });

  it("adapts an injected page-text extractor and honors cancellation", async () => {
    const input = new TextEncoder().encode("synthetic invoice");
    const extractor = {
      extractPages: async (received: Uint8Array, signal: AbortSignal) => {
        expect(received).toBe(input);
        expect(signal.aborted).toBe(false);
        return [{ pageNumber: 1, text: quote }];
      }
    };
    const verifier = createIndependentInvoiceVerifier("source-evidence-v1", extractor);
    const result = await verifier.verify(input, output, new AbortController().signal);

    expect(verifier.policyVersion).toBe("source-evidence-v1");
    expect(result.verdict).toBe("PASS");

    const controller = new AbortController();
    controller.abort();
    await expect(verifier.verify(input, output, controller.signal))
      .rejects.toThrow(/cancelled before extraction/);
  });
});
