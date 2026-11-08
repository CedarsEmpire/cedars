# CEDARS OS™ CORE TEAM Architecture

**Status:** Proposed architecture — Preview implementation only  
**Master work register:** [Issue #26](https://github.com/CedarsEmpire/cedars/issues/26)  
**Initial workstream:** CORE-001 / CORE-002 design foundation  
**Target workforce:** 50,000 logical AI-worker identities; this is a target, not a claim of provisioned or running workers.

## 1. Purpose

The CEDARS CORE TEAM is the coordinated AI development and operations workforce for constructing, testing, diagnosing, verifying and improving CEDARS OS™. It must support parallel, independently scoped workstreams while preserving accountability, evidence and human governance.

The platform must distinguish:
- **Worker definition:** a versioned role, capabilities, model/provider configuration reference and policy.
- **Worker identity:** a unique, auditable principal with its own permissions and lifecycle.
- **Worker execution:** one bounded attempt to perform one assigned task.
- **Task:** the approved unit of work with scope, acceptance criteria, dependencies and owner.
- **Report:** the worker's signed/attributed account of what it attempted and produced.
- **Verification:** an independent check of the result against acceptance criteria.
- **Approval:** a human governance decision; never self-issued by the worker that performed the work.

A catalogue entry, desired instance count, enabled switch, simulator status or dashboard metric is not evidence that a worker has executed real work.

## 2. Workforce and scaling model

The design target is 50,000 logical worker identities across the Core Team. Identity count is not the same as active concurrency. Actual concurrent execution must be bounded by measured provider quotas, compute capacity, queue throughput, database capacity, cost budgets, rate limits and safety controls.

Use a hierarchical control plane:
1. Core Team Coordinator — decomposes approved objectives into scoped work packages.
2. Domain Leads — coordinate bounded teams (for example Balance, Deposits, Withdrawals, Referrals, API, Database, Security and Regression).
3. Task Scheduler — assigns eligible work based on capability, dependencies, permissions, capacity and priority.
4. Worker Runtime — executes a task in an isolated, time- and resource-bounded environment.
5. Evidence and Report Service — records outputs and execution provenance.
6. Independent Verifier — tests work without relying solely on the producing worker's assertions.
7. Human Approval Queue — authorized people accept, reject or request revision.

The Coordinator cannot grant permissions, bypass a policy, approve its own decomposition as completed, or promote a release.

## 3. Parallel workstreams

Each workstream has a separate task namespace, owner, branch/workspace, dependency list and acceptance criteria. Initial domains:
- Balance and account records
- Deposits
- Withdrawals
- Referrals
- Worker registry and orchestration
- Database and migration verification
- API, identity and permissions
- Admin Control Center and audit
- Security, abuse and compliance controls
- Regression and release evidence

Parallel work is permitted only where dependencies and shared-file conflicts are understood. Database schema changes, shared contracts and cross-domain interfaces require coordination and human review. Workstreams must not silently modify one another's files or assumptions.

## 4. Task lifecycle

`DRAFT → APPROVED_FOR_PREVIEW → QUEUED → LEASED → RUNNING → SUBMITTED → VERIFYING → PENDING_HUMAN_APPROVAL → APPROVED`

Alternative terminal or holding states:
- `BLOCKED` — dependency, permission, environment or evidence is missing.
- `FAILED` — execution failed; preserve logs and diagnostics.
- `REVISION_REQUIRED` — reviewer/verifier specifies corrections.
- `REJECTED` — work or proposal is not accepted.
- `CANCELLED` — authorized cancellation with reason.
- `EXPIRED` — lease or task deadline elapsed.

Every state transition records actor, timestamp, prior state, new state, reason and correlation ID. A worker lease has an expiry and heartbeat; expired work can be retried safely. Retries use idempotency keys and never duplicate side effects.

## 5. Worker identity and permissions

Every worker identity must have:
- Stable unique ID and identity version
- Assigned role, domain and approved capability set
- Least-privilege permissions scoped to repository, branch, environment and task
- Explicit enabled/suspended/revoked lifecycle
- Provider/model reference without exposing credentials
- Resource and cost limits
- Created/updated timestamps and audit history

Workers cannot self-register privileged identities, elevate their own permissions, access Production secrets, approve their own changes, or use another worker's credentials. Use short-lived task-scoped credentials and revoke them after execution. Secrets remain in managed secret stores and must never appear in prompts, reports or logs.

## 6. Execution isolation and safety

Initial implementation and validation are Preview-only. A worker execution must be sandboxed with:
- No Production database, credentials, deployment targets or financial providers
- Explicit network allowlist and outbound restrictions
- Read/write scope limited to its assigned branch/workspace and artifacts
- CPU, memory, duration, concurrency and cost ceilings
- No access to unrelated tasks or customer data
- Cancellation, timeout and emergency stop
- Complete structured logs and execution correlation IDs

Workers may perform read-only inspections, run tests and propose patches within approved Preview scope. Source changes, schema changes, migrations, secrets, merges and releases require human approval. Migrations are not run merely because a worker proposes them.

## 7. Required worker report

Every submitted report must include:
1. Task ID, worker ID and worker/version identity
2. Assignment, scope, constraints and acceptance criteria
3. Start/end timestamps, execution ID and idempotency key
4. Repository, branch and exact base/head commit SHAs
5. Changed files and artifact references
6. Commands/tests run and exact exit codes/results
7. Logs, evidence locations and cryptographic hashes where appropriate
8. Independent verification results (or explicit NOT_YET_VERIFIED)
9. Security, privacy, regression and dependency findings
10. Unresolved issues, limitations and next recommendation
11. Submission status and requested human decision

A report is a claim plus evidence; it is not itself proof of correctness.

## 8. Independent verification and approvals

Verification must be performed by a separate identity/process with no shared self-approval path. For consequential work, require independent test execution and human approval. The verifier checks the exact commit/artifact submitted, not a later moving branch.

Approval decisions record reviewer identity, role, timestamp, decision, rationale, reviewed commit and evidence. The requester/author cannot approve their own work. A rejection or revision request preserves all prior reports and decisions.

## 9. Protected verification gates

A passing gate is stored with:
- Gate ID and version
- Exact commit and environment
- Test definition/version
- Timestamp and execution identity
- Full result, logs and artifact hashes
- Dependencies and known limitations

A later failure creates a new regression event; it does not erase the earlier PASS. Promotion is blocked for affected work until diagnosis and re-verification. A PASS is valid only for its recorded commit/environment/test definition and must not be represented as a permanent guarantee.

## 10. Domain-specific safety boundaries

Balance, deposits, withdrawals and referrals can be designed and tested using synthetic or explicitly authorized Preview data. Development must distinguish ledger records, pending instructions, provider acknowledgements, confirmed settlement and user-visible balance changes.

No live financial execution, deposit collection, withdrawal, payout, balance credit or external money movement is enabled by this architecture document. Financial execution remains OFF. Any future live capability requires separate legal, compliance, security, fraud, provider, customer-consent, reconciliation and production-acceptance approvals.

Public launch remains OFF. Individual Production accounts remain prohibited. No worker or region switch may be used to shut down global productive grids; account restrictions must remain scoped to the relevant account and must not interrupt unrelated global grid operations.

## 11. Observability and work register

The Admin Control Center should report, at minimum:
- Logical identities registered, enabled, suspended and revoked
- Workers actually provisioned and currently executing (separate counts)
- Queue depth, active leases, retries, failures and expired leases
- Task state by workstream and owner
- Verification pass/fail/blocked/regression counts
- Pending approvals and reviewer turnaround
- Cost, provider quota, compute utilization and rate-limit events
- Evidence completeness and audit-log health

Every work item links to the master work register and records its branch/PR, owner, status, dependencies, evidence and approval. Never display desired configuration as actual runtime execution.

## 12. Phased delivery

**Phase A — Foundation:** inventory existing worker catalogue, control APIs, approval/audit infrastructure and test coverage; document threat model and contracts.

**Phase B — Registry and task control plane:** introduce durable worker identities, task records, assignment, leases, idempotency and status transitions. Keep execution disabled until reviewed.

**Phase C — Reports and evidence:** add structured reports, artifact metadata/hashes, verifier records and human approval links.

**Phase D — Safe Preview execution:** introduce a narrowly scoped runtime with sandboxing, bounded permissions, resource controls and observable execution. Start with read-only validation workers.

**Phase E — Parallel domain pilots:** Balance, Deposits, Withdrawals and Referrals on separate Preview workstreams with synthetic data and independent verification.

**Phase F — Capacity scaling:** benchmark identity storage, scheduling, queue throughput, provider limits, cost and concurrency in stages. Do not claim 50,000 concurrent workers until measured and accepted.

## 13. Initial non-goals

This document does not provision 50,000 workers, connect an AI provider, create a job queue, execute tasks, change database schema, run migrations, change secrets, deploy code, enable financial execution or authorize Production. Those are separate implementation tasks with explicit review and acceptance evidence.
