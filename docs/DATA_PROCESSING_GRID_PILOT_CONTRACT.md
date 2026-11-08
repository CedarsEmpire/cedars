# CEDARS Data Processing Grid — Preview Pilot Contract

**Status:** Draft architecture contract — not an authorization to process real customer data  
**Canonical Grid:** `data-processing`  
**Target:** One narrow, repeatable document-processing service  
**Environment:** Preview only  
**Release state:** Production FROZEN · Public launch OFF · Financial execution OFF  
**Financial boundary:** NO FIAT TRANSACTIONS

## 1. Service proposition

The Data Processing Grid will provide secure document processing and structured data extraction for an explicitly defined business use case. The first deliverable must be narrow enough to measure field-level accuracy, completeness, turnaround time, exception rate and unit cost.

The service is not considered operational merely because the Grid appears in the catalogue, a worker is enabled, a model API responds, or a dashboard displays a successful status.

## 2. Pilot scope must be fixed before customer data is accepted

The pilot owner must record and approve:

- Document family and supported file formats.
- Customer problem and intended business use.
- Exact extraction schema and version.
- Required fields, types, validation rules and source evidence for each extracted value.
- Acceptance thresholds, error severity and treatment of missing or ambiguous values.
- Maximum file size, page count, batch size and execution time.
- Customer data authority, purpose limitation and permitted processing.
- Applicable jurisdiction, privacy/security requirements and retention/deletion schedule.
- Buyer-approved price basis and delivery terms outside CEDARS.

Until these are fixed, use synthetic documents only. Do not upload personal, confidential, regulated or commercially sensitive documents.

## 3. Bounded job lifecycle

A processing job must move through explicit states:

`DRAFT → AUTHORIZED → QUEUED → RUNNING → VALIDATING → SUCCEEDED`

Alternative terminal or intervention states:

- `REVIEW_REQUIRED`
- `FAILED`
- `REJECTED`
- `CANCELLED`
- `EXPIRED`

A job is not customer-delivered merely because a worker returns output. Customer delivery and acceptance are separate events.

Each job must carry:
- Unique job ID and idempotency key.
- Tenant/customer scope and authorization reference.
- Non-sensitive document metadata and cryptographic input hash.
- Document type and extraction schema version.
- Acceptance policy version and deadline.
- Execution attempt lineage and terminal reason.

## 4. AI-worker execution contract

A qualifying execution must be attributable to an authenticated, versioned worker identity. The record must include:

- Worker ID, worker build/version and execution identity.
- Model/provider identifier and model version where applicable.
- Prompt/template and configuration version.
- Start/end timestamps, resource usage and attempt number.
- Input and output hashes.
- Structured output reference and schema validation result.
- Tool/provider calls and bounded execution trace, excluding secrets and document contents.
- Failure, retry, timeout and cancellation events.

The execution environment must be isolated and resource-bounded. It must not have unrestricted network access, shell access, production secrets, arbitrary filesystem access or authority to change governance, customer permissions or financial state.

Simulator runs, manually entered outputs and human review must never qualify as autonomous AI-worker production.

## 5. Independent verification

Verification must be separate from the producing worker.

Minimum checks:
1. File type, size, integrity and malware screening.
2. Deterministic structured-output schema validation.
3. Required-field and type validation.
4. Field-level source evidence (page/region or equivalent source locator).
5. Consistency and duplicate checks.
6. Confidence/uncertainty handling; no invented values for absent evidence.
7. Independent source-to-output quality checks using a separately configured verifier or approved reviewer.
8. Risk-based escalation for ambiguous, low-confidence or high-impact fields.
9. Tamper-evident linkage between job, execution, output, verification and audit events.

The producer must not approve its own output. Human exception review may resolve cases but must be recorded as human review, not AI execution.

## 6. Data protection and tenant isolation

Before real customer data:
- Approve a data-flow diagram and threat model.
- Define encryption in transit and at rest, key ownership and access boundaries.
- Enforce tenant isolation on every read/write path.
- Restrict access by least privilege and record access events.
- Never place document contents, credentials or sensitive extracted values in ordinary logs.
- Define retention, customer deletion, backup expiry and incident response.
- Define subprocessors, model-provider retention/training settings and permitted data regions.
- Validate legal basis, customer authority and applicable jurisdictional requirements.

Do not retain raw documents by default longer than required for the agreed service. Store hashes and minimum evidence metadata where sufficient.

## 7. Commercial evidence boundary

Commercial contracting, invoicing and actual payment occur outside CEDARS using lawful external processes selected by the buyer and service provider.

CEDARS may eventually retain minimum non-sensitive evidence references and independently reviewed status metadata. It must not:
- Receive or store customer payment credentials.
- Initiate or route fiat payments.
- Create fiat deposits, withdrawals, payouts or settlement flows.
- Credit member/customer cash-equivalent balances.
- Treat an invoice, quote, receivable, free demo or test payment as money received.

The `GRID_REVENUE_PROVEN` gate requires actual external receipt evidence from an authoritative source, customer acceptance, verified AI-worker delivery, measured costs and repeatability. No payment credential or unnecessary bank data should be copied into CEDARS.

## 8. Preview implementation sequence

1. Finalize the first document family, extraction schema and buyer acceptance policy.
2. Approve data handling, provider and threat-model decisions.
3. Implement a provider-neutral job contract and deterministic validation using synthetic fixtures.
4. Implement authenticated worker identity, isolated execution, provenance and independent verification.
5. Add negative tests for cross-tenant access, self-approval, simulator/manual-task substitution, idempotency failure, secret/document leakage and financial side effects.
6. Review the proposed persistence model and migration separately. Do not apply a migration until the Preview database read-only connection gate passes and the user explicitly approves the migration.
7. Run a controlled Preview proof with synthetic data, then separately authorize a non-sensitive customer sample if legal/security checks pass.
8. Only after successful evidence review, propose a bounded paid pilot with a real buyer.

## 9. Acceptance gates

### Gate A — Safe technical proof
- All required automated tests pass.
- Authenticated worker execution and full provenance are demonstrated.
- Independent verification and exception handling are demonstrated.
- Data isolation, deletion, audit and failure paths pass.
- No financial or production side effects are possible.

### Gate B — Customer delivery proof
- Real buyer and written scope.
- Lawful data authority and approved data-processing terms.
- Accepted deliverable and customer confirmation.
- Actual AI-worker execution evidence and independent QA.
- Costs and delivery performance measured.

### Gate C — GRID_REVENUE_PROVEN
- Actual external payment/receipt independently confirmed.
- Direct provider, compute, storage, review and support costs measured.
- Net contribution calculated from source records.
- Repeatable delivery and reliability shown over an agreed sample.
- Legal, privacy, security and jurisdictional checks complete.

No gate is passed by assertion. No Grid status becomes LIVE without evidence and separate release authorization.

## 10. Governance and change control

- Preview-only implementation.
- Production FROZEN.
- Public launch OFF.
- Financial execution OFF.
- NO FIAT TRANSACTIONS.
- No production secrets, production database changes or production deployment.
- No database migration until separately reviewed and explicitly approved.
- Human governance retains authorization, policy, exception, dispute and release decisions; bounded AI workers perform the authorized processing work.
