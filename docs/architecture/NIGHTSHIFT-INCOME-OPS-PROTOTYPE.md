# CEDARS NIGHTSHIFT AI — Prototype 001

## Purpose

Provide a one-page cloud operations control surface for productive AI work, customer delivery, independently evidenced external receipts, operating costs, and governance. The initial performance objective is a **$100/day revenue target**. This is a target only; it is not a forecast, guarantee, or current operating result.

## Verified repository baseline

The existing CEDARS API already models customer Grid Tasks, buyer acceptance, worker desired state, approval requests, and audit logs. Its documented behavior is explicit: Grid Tasks are manually administered work orders; worker execution is not connected; task acceptance is not payment; settlement is `NOT_RECORDED`; and there is no payment intake, member balance, payout, or withdrawal endpoint.

The Nightshift page therefore does not invent revenue from task values, accepted work, invoices, grants, internal transfers, investments, or treasury observations.

## Prototype scope

- Static one-page route: `/nightshift`.
- Shows the $100/day target and unavailable (not fabricated) revenue, cost, net, and target-attainment metrics.
- Shows six proposed worker roles as NOT CONNECTED and execution DISABLED.
- Shows an empty customer-work pipeline and audit feed until authenticated source records exist.
- Offers read-only `GET /api/health` and `GET /api/ready` diagnostics.
- Exports a static evidence checklist; it does not export customer data.
- No browser storage, payment integration, worker runtime, job queue, AI model provider, customer messaging, external account credentials, or database writes.

## Revenue evidence and recognition

The eventual reporting layer may record an externally completed customer payment as evidence only. Recognition requires all of the following:

1. A real customer and agreed scope.
2. A unique invoice or work-order reference.
3. Delivery evidence and customer acceptance where applicable.
4. External receipt evidence from an independently verifiable source.
5. Reconciliation by an authorized reviewer, including fees, refunds, reversals, disputes, currency, and timestamp.
6. An append-only audit event identifying the evidence source, verifier, decision, and correction history.

A quote, prospect, signed scope, invoice, accepted task, unconfirmed receipt, grant, donation, internal transfer, investment, or treasury observation is not earned customer revenue. Revenue must not be counted twice. Reversals must be linked to the original evidence and reflected in the same reporting period or a traceable adjustment.

## Cost and net result

Costs must be recorded from verifiable provider statements or usage records: AI inference, cloud compute, storage, bandwidth, third-party tools, refunds/chargebacks where applicable, and other approved direct operating expenses. Net operating result is calculated only from reconciled revenue and costs for the same period. Missing data means NOT AVAILABLE, never an assumed zero.

Each worker/job requires pre-authorized per-job and aggregate daily/monthly spend ceilings. Workers must fail closed and stop or request approval when limits are reached.

## Worker and approval boundaries

Proposed worker roles are Opportunity Research, Sales & Proposals, Work Production, Quality & Delivery, Revenue Reconciliation, and Cost & Audit Monitor.

- Workers may research public opportunities and prepare internal drafts only after runtime and data-access controls are approved.
- Human approval is required before binding customer commitments, sending external proposals/messages, accepting terms, or publishing deliverables.
- Worker tools must not include wallet signing, payment initiation, deposits, withdrawals, payouts, transfers, or trading.
- Sensitive customer data must be minimized and tenant-isolated.
- Every run needs a durable job ID, worker identity, tool/action log, input/output provenance, cost record, outcome, and retry/idempotency key.
- A global kill switch must stop new work and revoke execution leases; safe-state changes must be audited.
- Requesters cannot approve their own privileged actions. Independent approvers and role quorum are required for activation or spend-limit increases.

## Non-negotiable CEDARS constraints

- Production FROZEN.
- Public launch OFF.
- Financial execution OFF.
- NO FIAT TRANSACTIONS.
- No production credentials or production database access in Preview.
- No schema migration until the dedicated Preview database connection check passes and a separate migration action is authorized.
- No deployment/promotion or spend upgrade is implied by this prototype.

The system may report independently evidenced business outcomes; it must not initiate, receive, hold, route, or settle fiat funds. This page does not connect to a payment rail or wallet.

## Delivery gates before any real overnight worker run

1. Confirm current branch and Preview deployment baseline.
2. Configure and verify isolated Preview identity and database connectivity without exposing secrets.
3. Review and apply only approved Preview migrations; seed and verify required tables.
4. Implement authenticated tenant-scoped opportunity, customer-scope, work-order, delivery, receipt-evidence, cost, reconciliation, and audit records.
5. Implement a durable cloud queue/worker runtime with bounded retries, idempotency, least-privilege tools, network allowlists, secrets isolation, and emergency stop.
6. Add independent human approvals for external communication/commitments and budget increases.
7. Add independent receipt-evidence reconciliation and cost ingestion; test corrections, refunds, duplicate evidence, missing data, and audit immutability.
8. Verify worker OFF by default and prove that no fiat transaction capability exists.
9. Run security, tenant isolation, budget exhaustion, replay, failure recovery, backup/restore, and kill-switch tests in Preview.
10. Obtain separate written governance/security/finance acceptance before any production change. Public launch remains a separate approval.

## Current status

**DESIGN-ONLY / NOT OPERATIONAL.** The page and evidence checklist are the prototype deliverable. It does not earn money or run while the user's PC is off. Cloud execution is a future integration requiring the gates above.