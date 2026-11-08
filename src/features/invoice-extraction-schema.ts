import { z } from "zod";

const decimalAmountSchema = z.string().regex(
  /^(0|[1-9][0-9]*)(\.[0-9]{1,4})?$/,
  "Use a non-negative decimal string with up to four fractional digits."
);

const sourceEvidenceSchema = z.object({
  pageNumber: z.number().int().positive(),
  textQuote: z.string().trim().min(1).max(1000),
  locator: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1)
  }).strict().optional()
}).strict().superRefine((evidence, context) => {
  if (evidence.locator && evidence.locator.x + evidence.locator.width > 1) {
    context.addIssue({ code: "custom", path: ["locator", "width"], message: "Evidence region exceeds page width." });
  }
  if (evidence.locator && evidence.locator.y + evidence.locator.height > 1) {
    context.addIssue({ code: "custom", path: ["locator", "height"], message: "Evidence region exceeds page height." });
  }
});

const evidencedFieldSchema = <T extends z.ZodType>(valueSchema: T) => z.object({
  value: valueSchema,
  evidence: z.array(sourceEvidenceSchema).min(1)
}).strict();

export const invoiceExtractionSchema = z.object({
  schemaVersion: z.literal("invoice-extraction-v1"),
  documentType: z.literal("invoice"),
  supplierName: evidencedFieldSchema(z.string().trim().min(1).max(200)),
  invoiceNumber: evidencedFieldSchema(z.string().trim().min(1).max(100)),
  invoiceDate: evidencedFieldSchema(z.iso.date()),
  dueDate: evidencedFieldSchema(z.iso.date().nullable()),
  currency: evidencedFieldSchema(z.string().regex(/^[A-Z]{3}$/)),
  subtotal: evidencedFieldSchema(decimalAmountSchema),
  taxAmount: evidencedFieldSchema(decimalAmountSchema.nullable()),
  totalAmount: evidencedFieldSchema(decimalAmountSchema),
  lineItems: z.array(z.object({
    description: evidencedFieldSchema(z.string().trim().min(1).max(500)),
    quantity: evidencedFieldSchema(decimalAmountSchema),
    unitPrice: evidencedFieldSchema(decimalAmountSchema),
    lineTotal: evidencedFieldSchema(decimalAmountSchema)
  }).strict()).min(1).max(500)
}).strict();

export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
