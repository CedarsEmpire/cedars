import { describe, expect, it } from "vitest";
import { invoiceExtractionSchema } from "../src/features/invoice-extraction-schema.js";

const evidence = [{ pageNumber: 1, textQuote: "Invoice total 120.00", locator: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 } }];

const invoice = {
  schemaVersion: "invoice-extraction-v1",
  documentType: "invoice",
  supplierName: { value: "Example Supplies Ltd", evidence },
  invoiceNumber: { value: "INV-2026-001", evidence },
  invoiceDate: { value: "2026-11-01", evidence },
  dueDate: { value: "2026-11-30", evidence },
  currency: { value: "UGX", evidence },
  subtotal: { value: "100.00", evidence },
  taxAmount: { value: "20.00", evidence },
  totalAmount: { value: "120.00", evidence },
  lineItems: [{
    description: { value: "Office paper", evidence },
    quantity: { value: "2", evidence },
    unitPrice: { value: "50.00", evidence },
    lineTotal: { value: "100.00", evidence }
  }]
};

describe("invoice extraction schema", () => {
  it("accepts a complete invoice with source evidence for every field", () => {
    expect(invoiceExtractionSchema.safeParse(invoice).success).toBe(true);
  });

  it("rejects extracted fields without source evidence", () => {
    expect(invoiceExtractionSchema.safeParse({
      ...invoice,
      invoiceNumber: { value: "INV-2026-001", evidence: [] }
    }).success).toBe(false);
  });

  it("rejects invalid currency, dates and non-decimal amounts", () => {
    expect(invoiceExtractionSchema.safeParse({ ...invoice, currency: { value: "US", evidence } }).success).toBe(false);
    expect(invoiceExtractionSchema.safeParse({ ...invoice, invoiceDate: { value: "01/11/2026", evidence } }).success).toBe(false);
    expect(invoiceExtractionSchema.safeParse({ ...invoice, totalAmount: { value: "1,200.00", evidence } }).success).toBe(false);
  });

  it("rejects source regions outside normalized page bounds", () => {
    const invalidEvidence = [{ pageNumber: 1, textQuote: "Outside page", locator: { x: 0.9, y: 0.2, width: 0.2, height: 0.1 } }];
    expect(invoiceExtractionSchema.safeParse({
      ...invoice,
      invoiceNumber: { value: "INV-2026-001", evidence: invalidEvidence }
    }).success).toBe(false);
  });

  it("does not accept unsupported or unreviewed extra fields", () => {
    expect(invoiceExtractionSchema.safeParse({ ...invoice, bankAccountNumber: { value: "123", evidence } }).success).toBe(false);
  });
});
