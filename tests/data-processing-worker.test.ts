import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { processingJobRecordSchema } from "../src/features/data-processing-contract.js";
import {
  executeInvoiceProcessingJob,
  type InvoiceModelAdapter,
  type IndependentInvoiceVerifier
} from "../src/features/data-processing-worker.js";
import { invoiceExtractionSchema } from "../src/features/invoice-extraction-schema.js";

const bytes = new TextEncoder().encode("SYNTHETIC INVOICE\nSupplier: Example Supplies Ltd\nInvoice: INV-001\nDate: 2026-11-01\nDue: 2026-11-30\nCurrency: UGX\nSubtotal: 100.00\nTax: 20.00\nTotal: 120.00\nPaper 2 x 50.00 = 100.00");
const hash = createHash("sha256").update(bytes).digest("hex");
const evidence = [{ pageNumber: 1, textQuote: "Invoice: INV-001" }];
const fixtureOutput = {
  schemaVersion: "invoice-extraction-v1",
  documentType: "invoice",
  supplierName: { value: "Example Supplies Ltd", evidence: [{ pageNumber: 1, textQuote: "Supplier: Example Supplies Ltd" }] },
  invoiceNumber: { value: "INV-001", evidence },
  invoiceDate: { value: "2026-11-01", evidence: [{ pageNumber: 1, textQuote: "Date: 2026-11-01" }] },
  dueDate: { value: "2026-11-30", evidence: [{ pageNumber: 1, textQuote: "Due: 2026-11-30" }] },
  currency: { value: "UGX", evidence: [{ pageNumber: 1, textQuote: "Currency: UGX" }] },
  subtotal: { value: "100.00", evidence: [{ pageNumber: 1, textQuote: "Subtotal: 100.00" }] },
  taxAmount: { value: "20.00", evidence: [{ pageNumber: 1, textQuote: "Tax: 20.00" }] },
  totalAmount: { value: "120.00", evidence: [{ pageNumber: 1, textQuote: "Total: 120.00" }] },
  lineItems: [{
    description: { value: "Paper", evidence: [{ pageNumber: 1, textQuote: "Paper 2 x 50.00 = 100.00" }] },
    quantity: { value: "2", evidence: [{ pageNumber: 1, textQuote: "Paper 2 x 50.00 = 100.00" }] },
    unitPrice: { value: "50.00", evidence: [{ pageNumber: 1, textQuote: "Paper 2 x 50.00 = 100.00" }] },
    lineTotal: { value: "100.00", evidence: [{ pageNumber: 1, textQuote: "Paper 2 x 50.00 = 100.00" }] }
  }]
};
const job = processingJobRecordSchema.parse({
  tenantRef: "tenant-ref-001",
  customerRef: "customer-ref-001",
  authorizationRef: "authorization-ref-001",
  documentType: "invoice",
  extractionSchemaVersion: "invoice-extraction-v1",
  acceptancePolicyVersion: "invoice-qa-v1",
  inputSha256: hash,
  sourceObjectRef: "synthetic-fixture:invoice-001",
  idempotencyKey: "synthetic-invoice-job-0001",
  jobId: "22222222-2222-4222-8222-222222222222",
  status: "AUTHORIZED"
});

describe("isolated Data Processing worker orchestration", () => {
  it("runs a synthetic invoice through authenticated worker, schema validation and separate verifier", async () => {
    const model: InvoiceModelAdapter = {
      provider: "test-fixture-only",
      modelVersion: "fixture-v1",
      promptConfigVersion: "fixture-prompt-v1",
      extract: vi.fn().mockResolvedValue({
        output: fixtureOutput,
        traceRef: "synthetic-trace-0001",
        resourceUnits: 1
      })
    };
    const verifier: IndependentInvoiceVerifier = {
      policyVersion: "synthetic-qa-v1",
      verify: vi.fn().mockResolvedValue({
        verdict: "PASS",
        fieldsReviewed: 12,
        requiredFields: 12,
        sourceEvidenceCoverage: 1,
        reasonCode: "SYNTHETIC_FIXTURE_ACCEPTED"
      })
    };

    const result = await executeInvoiceProcessingJob({
      job,
      input: bytes,
      workerAssertion: "test-worker-assertion",
      verifierAssertion: "test-verifier-assertion",
      workerIdentity: {
        authenticate: vi.fn().mockResolvedValue({
          subject: "worker-principal-001",
          workerId: "data-processing-ai"
        })
      },
      verifierIdentity: {
        authenticate: vi.fn().mockResolvedValue({ subject: "independent-verifier-001" })
      },
      model,
      verifier,
      signal: new AbortController().signal,
      now: () => new Date("2026-11-08T12:00:00.000Z")
    });

    expect(result.status).toBe("SUCCEEDED");
    expect(result.lifecycle).toEqual(["AUTHORIZED", "QUEUED", "RUNNING", "VALIDATING", "SUCCEEDED"]);
    expect(result.execution.jobId).toBe(job.jobId);
    expect(result.execution.inputSha256).toBe(hash);
    expect(result.verification.executionId).toBe(result.execution.executionId);
    expect(result.verification.verifierPrincipalId).not.toBe(result.execution.workerPrincipalId);
    expect(invoiceExtractionSchema.safeParse(result.output).success).toBe(true);
    expect(model.extract).toHaveBeenCalledOnce();
    expect(verifier.verify).toHaveBeenCalledOnce();
  });

  it("rejects mismatched input bytes before calling the model", async () => {
    const model: InvoiceModelAdapter = {
      provider: "test-fixture-only",
      modelVersion: "fixture-v1",
      promptConfigVersion: "fixture-prompt-v1",
      extract: vi.fn()
    };
    await expect(executeInvoiceProcessingJob({
      job,
      input: new TextEncoder().encode("different bytes"),
      workerAssertion: "test-worker-assertion",
      verifierAssertion: "test-verifier-assertion",
      workerIdentity: { authenticate: vi.fn() },
      verifierIdentity: { authenticate: vi.fn() },
      model,
      verifier: { policyVersion: "qa-v1", verify: vi.fn() },
      signal: new AbortController().signal
    })).rejects.toThrow(/authorized job hash/);
    expect(model.extract).not.toHaveBeenCalled();
  });

  it("rejects a verifier identity that is the producing worker", async () => {
    const model: InvoiceModelAdapter = {
      provider: "test-fixture-only",
      modelVersion: "fixture-v1",
      promptConfigVersion: "fixture-prompt-v1",
      extract: vi.fn().mockResolvedValue({ output: fixtureOutput, traceRef: "trace-0001", resourceUnits: 1 })
    };
    const verifier: IndependentInvoiceVerifier = {
      policyVersion: "qa-v1",
      verify: vi.fn().mockResolvedValue({
        verdict: "PASS", fieldsReviewed: 12, requiredFields: 12,
        sourceEvidenceCoverage: 1, reasonCode: "PASS"
      })
    };
    await expect(executeInvoiceProcessingJob({
      job, input: bytes,
      workerAssertion: "worker", verifierAssertion: "same",
      workerIdentity: { authenticate: vi.fn().mockResolvedValue({ subject: "same-principal", workerId: "data-processing-ai" }) },
      verifierIdentity: { authenticate: vi.fn().mockResolvedValue({ subject: "same-principal" }) },
      model, verifier, signal: new AbortController().signal
    })).rejects.toThrow(/must have different identities/);
  });

  it("refuses non-authorized jobs and cancelled executions", async () => {
    const model: InvoiceModelAdapter = {
      provider: "test-fixture-only", modelVersion: "fixture-v1",
      promptConfigVersion: "fixture-prompt-v1", extract: vi.fn()
    };
    const args = {
      job: { ...job, status: "QUEUED" as const }, input: bytes,
      workerAssertion: "worker", verifierAssertion: "verifier",
      workerIdentity: { authenticate: vi.fn() },
      verifierIdentity: { authenticate: vi.fn() },
      model,
      verifier: { policyVersion: "qa-v1", verify: vi.fn() },
      signal: new AbortController().signal
    };
    await expect(executeInvoiceProcessingJob(args)).rejects.toThrow(/AUTHORIZED/);
    const controller = new AbortController();
    controller.abort();
    await expect(executeInvoiceProcessingJob({ ...args, job, signal: controller.signal }))
      .rejects.toThrow(/cancelled before start/);
  });
});
