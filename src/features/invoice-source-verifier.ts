import type { InvoiceExtraction } from "./invoice-extraction-schema.js";

export interface InvoiceSourcePage {
  pageNumber: number;
  text: string;
}

export interface InvoiceSourceVerification {
  verdict: "PASS" | "REVIEW_REQUIRED";
  fieldsReviewed: number;
  requiredFields: number;
  sourceEvidenceCoverage: number;
  reasonCode: "ALL_FIELD_EVIDENCE_SUPPORTED" | "SOURCE_EVIDENCE_INCOMPLETE" | "INVALID_SOURCE_PAGES";
}

export interface InvoicePageTextExtractor {
  extractPages(input: Uint8Array, signal: AbortSignal): Promise<readonly InvoiceSourcePage[]>;
}

type EvidencedField = {
  key: "dueDate" | "taxAmount" | "other";
  value: string | null;
  evidence: readonly { pageNumber: number; textQuote: string }[];
};

function normalize(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

function valueIsSupported(value: string | null, quote: string, key: EvidencedField["key"]): boolean {
  const normalizedQuote = normalize(quote);
  if (value === null) {
    if (key === "dueDate") return /\\bdue(?: date)?\\s*[:=-]?\\s*(?:n\\/a|not applicable|not provided|not stated|none)\\b/u.test(normalizedQuote);
    if (key === "taxAmount") return /\\btax(?: amount)?\\s*[:=-]?\\s*(?:n\\/a|not applicable|not provided|not stated|none)\\b/u.test(normalizedQuote);
    return false;
  }

  const normalizedValue = normalize(value);
  if (!normalizedValue) return false;
  const escapedValue = normalizedValue.replace(/[.*+?^\u0024{}()|[\\]\\\\]/g, "\\\\$&");
  return new RegExp(`(?<![\\\\p{L}\\\\p{N}])${escapedValue}(?![\\\\p{L}\\\\p{N}])`, "u").test(normalizedQuote);
}

function getFields(output: InvoiceExtraction): EvidencedField[] {
  return [
    { ...output.supplierName, key: "other" },
    { ...output.invoiceNumber, key: "other" },
    { ...output.invoiceDate, key: "other" },
    { ...output.dueDate, key: "dueDate" },
    { ...output.currency, key: "other" },
    { ...output.subtotal, key: "other" },
    { ...output.taxAmount, key: "taxAmount" },
    { ...output.totalAmount, key: "other" },
    ...output.lineItems.flatMap((item) => [
      { ...item.description, key: "other" as const },
      { ...item.quantity, key: "other" as const },
      { ...item.unitPrice, key: "other" as const },
      { ...item.lineTotal, key: "other" as const }
    ])
  ];
}

/**
 * Checks evidence quotes against already-extracted page text. This deliberately
 * does not parse PDFs/OCR, call a model, persist records, or establish semantic
 * correctness beyond source presence and value support.
 */
export function verifyInvoiceSourceEvidence(
  pages: readonly InvoiceSourcePage[],
  output: InvoiceExtraction
): InvoiceSourceVerification {
  const pageMap = new Map<number, string>();
  const invalidPages = pages.length === 0 || pages.some((page) => {
    if (!Number.isSafeInteger(page.pageNumber) || page.pageNumber < 1 || !page.text.trim() || pageMap.has(page.pageNumber)) {
      return true;
    }
    pageMap.set(page.pageNumber, normalize(page.text));
    return false;
  });

  const fields = getFields(output);
  const incomplete = {
    verdict: "REVIEW_REQUIRED" as const,
    fieldsReviewed: 0,
    requiredFields: fields.length,
    sourceEvidenceCoverage: 0,
    reasonCode: "INVALID_SOURCE_PAGES" as const
  };
  if (invalidPages) return incomplete;

  const supportedCount = fields.filter((field) => {
    return field.evidence.length > 0 && field.evidence.every((evidence) => {
      const sourceText = pageMap.get(evidence.pageNumber);
      const quote = normalize(evidence.textQuote);
      return Boolean(sourceText && quote && sourceText.includes(quote) && valueIsSupported(field.value, quote, field.key));
    });
  }).length;
  const coverage = supportedCount / fields.length;
  const complete = supportedCount === fields.length;

  return {
    verdict: complete ? "PASS" : "REVIEW_REQUIRED",
    fieldsReviewed: fields.length,
    requiredFields: fields.length,
    sourceEvidenceCoverage: coverage,
    reasonCode: complete ? "ALL_FIELD_EVIDENCE_SUPPORTED" : "SOURCE_EVIDENCE_INCOMPLETE"
  };
}

/** Adapts a trusted page-text extractor to the worker verifier interface. */
export function createIndependentInvoiceVerifier(
  policyVersion: string,
  extractor: InvoicePageTextExtractor
) {
  return {
    policyVersion,
    async verify(input: Uint8Array, output: InvoiceExtraction, signal: AbortSignal) {
      if (signal.aborted) throw new Error("Source verification was cancelled before extraction.");
      const pages = await extractor.extractPages(input, signal);
      if (signal.aborted) throw new Error("Source verification was cancelled during extraction.");
      return verifyInvoiceSourceEvidence(pages, output);
    }
  };
}
