# M6-05 — Durable AI Execution Infrastructure

**Document status:** Technical specification proposed; implementation not yet authorized by this document.  
**Repository:** `CedarsEmpire/cedars`  
**Baseline:** `main` at `927c175a008ddce3df2b08a86fd43c5b685edc1a`  
**Scope:** Shared durable software-AI execution foundation for all 53 canonical CEDARS Grids.

## 1. Purpose and non-goals

M6-05 replaces simulated/disconnected worker execution with a persistent, recoverable, auditable execution plane. It provides job intake, authorization-aware dispatch, worker claiming, leases, heartbeats, retries, recovery, output persistence and verification hand-off.

It is one shared platform capability, not 53 independent queue implementations. Every job retains its canonical Grid identity and is evaluated against that Grid's current parent controls and worker assignment.

This milestone does not:
- activate autonomous workers in Preview or Production by itself;
- create live model-provider connections, customer-work dispatch or public-facing service execution without separate approval;
- implement auto-scaling (M6-09), robotics integration/physical actions (M6-10/M6-11), payment, settlement, payout, token transfer or fiat transaction flows;
- change Production configuration, production database, deployment, launch state or financial execution;
- assume that a catalogue entry is a connected worker or that a model response is verified work.

**Permanent constraints:** NO FIAT TRANSACTIONS · Production FROZEN · Financial execution OFF · Public launch OFF. No physical-action authority is granted by this software execution engine.

## 2. Architectural placement

The execution path is:

1. Grid work request and canonical Grid identity.
2. M6-01/M6-02 authorization gate: global software control → economic layer → Grid → worker type → job.
3. Durable job transaction: persist job, idempotency key and outbox event atomically.
4. Dispatcher/claim service: atomically claim eligible jobs and create an attempt/lease.
5. Worker adapter: execute only the registered capability and bounded tool set.
6. Persist result and execution metadata.
7. Independent verifier: evaluate output against versioned acceptance criteria.
8. Final state and append-only audit events.

PostgreSQL is the initial system of record and durable queue substrate, using Prisma for schema authority and parameterized SQL for atomic claim operations. Do not add a queue vendor, Supabase extension, pgmq, pg_cron, Redis, or another paid service in this milestone. PostgreSQL job rows plus transactional outbox are the baseline; re-evaluate only with measured evidence and explicit approval.

The scheduler may poll the database in a controlled worker process. Vercel request handlers must not be relied on for indefinite background execution. Runtime placement, concurrency and deployment mechanism are implementation decisions to be validated against current Hobby limits before activation.

## 3. Core invariants

1. **Fail closed:** missing, stale, malformed or unavailable authorization means no claim and no execution.
2. **Parent dominance:** global OFF or layer OFF blocks all descendant jobs; Grid eligibility must match current authorized parent generations.
3. **Recheck at claim and start:** enqueue-time authorization is not sufficient. Re-read authorization immediately before claim and immediately before invoking a worker.
4. **Version-bound authorization:** each job stores the relevant global, layer and Grid control versions plus the approval/authorization reference. A version mismatch invalidates the job for execution.
5. **No self-authorization:** a worker, scheduler, controller or verifier cannot approve its own work, grant permissions or change control policy.
6. **Idempotent effects:** delivery is at-least-once. Every handler must use the job idempotency key for side effects. Never claim universal exactly-once execution.
7. **Durable state transitions:** every state change is committed transactionally with its event/outbox effects.
8. **Lease fencing:** a worker whose lease expired or whose fencing token is superseded cannot commit output or complete a job.
9. **Independent verification:** executor identity and verifier identity must differ. An executor cannot mark its own output verified.
10. **Evidence before success:** SUCCEEDED requires persisted output and a passing verification record.
11. **Bounded execution:** attempts, wall time, input/output size, concurrency, tool access and resource use are bounded by policy. No worker may raise its own limits.
12. **No hidden activation:** creating schema, enabling a Grid or deploying code does not activate a worker. Dispatch requires a separately approved execution mode and explicit runtime authorization.
13. **Auditability:** execution events are append-only to application roles; corrections are compensating events, not edits that erase history.
14. **Canonical identity:** jobs reference only canonical Grid IDs and registered worker IDs. No fuzzy or inferred mapping.
15. **Separation of domains:** physical robotics missions and commands are not accepted by this software job API.

## 4. Job state machine

Primary states:

- `CREATED`: request accepted and persisted; not dispatchable.
- `AUTHORIZATION_CHECK`: current control and worker eligibility is being checked.
- `QUEUED`: authorization passed and job is eligible for claim.
- `CLAIMED`: a worker attempt and lease were atomically assigned.
- `RUNNING`: worker has started under a valid lease.
- `OUTPUT_PERSISTED`: output and digest are durable; not yet verified.
- `VERIFYING`: independent verifier has claimed verification.
- `SUCCEEDED`: verification passed and all completion records committed.

Terminal or holding states:

- `BLOCKED`: authorization, policy or prerequisite not satisfied.
- `RETRY_WAIT`: retryable failure; next eligible time is recorded.
- `FAILED`: non-retryable error or attempt policy exhausted.
- `CANCELLED`: authorized cancellation before final completion.
- `DEAD_LETTER`: exhausted/poisoned job retained for review and replay decision.

Allowed transitions are explicit and validated server-side. Terminal states do not silently reopen. Replay creates a new linked job or a separately authorized replay event with a new execution lineage; it does not erase prior history. Cancellation of a running job is cooperative and bounded; the system records whether the worker acknowledged cancellation.

## 5. Proposed Prisma data model

Names below are proposed schema contracts, not yet committed Prisma models. Use Prisma enums and relations where practical. Add a new tracked Prisma migration only after M6-01/M6-02 Preview acceptance has passed and the schema is reviewed.

### 5.1 Enums

- `ExecutionJobStatus`: CREATED, AUTHORIZATION_CHECK, QUEUED, CLAIMED, RUNNING, OUTPUT_PERSISTED, VERIFYING, SUCCEEDED, BLOCKED, RETRY_WAIT, FAILED, CANCELLED, DEAD_LETTER.
- `ExecutionAttemptStatus`: CLAIMED, RUNNING, SUCCEEDED, RETRYABLE_FAILURE, PERMANENT_FAILURE, LEASE_EXPIRED, CANCELLED, FENCED.
- `ExecutionLeaseStatus`: ACTIVE, RELEASED, EXPIRED, REVOKED.
- `ExecutionVerificationStatus`: PENDING, RUNNING, PASSED, FAILED, INCONCLUSIVE, REVOKED.
- `ExecutionEventActorType`: USER, SYSTEM, DISPATCHER, WORKER, VERIFIER, ADMIN.
- `ExecutionOutboxStatus`: PENDING, PUBLISHED, RETRY_WAIT, DEAD_LETTER.

### 5.2 ExecutionJob

Required fields:
- UUID primary key; canonical `gridId`; registered `workerId`; status.
- `jobType`, `contractVersion`, `inputSchemaVersion`, `acceptanceSchemaVersion`.
- JSON input and acceptance criteria, with size limits and schema validation before persistence.
- `idempotencyScope` and `idempotencyKey`; unique together.
- `priority`, `availableAt`, optional `deadlineAt`, `maxAttempts`, `attemptCount`.
- `requestedById`/actor reference, request reason and correlation ID.
- Authorization snapshot: global control version, layer control version, Grid authorization version, approval reference, authorization checked-at timestamp and policy version.
- `createdAt`, `updatedAt`, `startedAt`, `completedAt`, `cancelledAt`, `lastErrorCode`.

Indexes: (status, availableAt, priority), (gridId, status, createdAt), (workerId, status, createdAt), correlation ID, and unique idempotency scope/key. Use deterministic priority ordering with age tie-break to reduce starvation.

### 5.3 ExecutionAttempt

Required fields:
- UUID primary key; job foreign key; attempt number unique per job.
- Worker ID and immutable worker-instance identity; status.
- Claimed, started and ended timestamps; duration; model/runtime adapter and version.
- Input digest; output digest when available; trace/correlation ID.
- Sanitized error code/class and retryability; no secrets or raw credentials.
- Fencing token/generation.
- Unique (jobId, attemptNumber).

### 5.4 WorkerLease

Required fields:
- UUID primary key; unique active lease per job enforced transactionally/with a partial unique index.
- Job and attempt foreign keys; worker-instance identity.
- Lease status, issued-at, expires-at, last-heartbeat-at, released-at.
- Monotonically increasing fencing generation/token.
- Store only a cryptographic hash of any opaque lease bearer token; never log raw tokens.
- Index on status and expiry for recovery scans.

Heartbeat and lease renewal must be conditional on matching lease ID, active status, unexpired lease and current fencing generation. A stale worker must be unable to update job/output after a new lease is issued.

### 5.5 ExecutionOutput

Required fields:
- UUID primary key; job and attempt foreign keys.
- Output schema/version; structured JSON output for bounded small payloads, otherwise an approved private artifact reference.
- SHA-256 content digest, byte size, media/content type, created-at.
- Provenance metadata: worker identity, adapter/model version, input digest, tool-call references and execution correlation.
- No public URL or public storage bucket by default. Artifact storage requires a separately approved private-storage design.

### 5.6 VerificationRecord

Required fields:
- UUID primary key; job/output foreign keys; verifier identity distinct from executor.
- Verification policy ID/version, status, checks performed, structured findings, output digest checked, started/finished timestamps.
- Failure/inconclusive reason codes and evidence references.
- Unique policy execution key to prevent duplicate verifier commits for the same output/policy version.

### 5.7 ExecutionEvent

Append-only event stream:
- UUID primary key; job foreign key; monotonically increasing per-job sequence.
- Event type, actor type/id, prior and new state, timestamp, correlation ID, structured non-secret payload.
- Optional hash-chain fields (previous event digest/current digest) if implemented and tested; do not advertise tamper-proofing unless key management and verification are implemented.
- Database permissions and repository code must prohibit ordinary update/delete paths. Retention and export policies require separate governance.

### 5.8 ExecutionOutbox

Required fields:
- UUID primary key; aggregate/job ID; event type; schema version; JSON payload; status.
- created-at, available-at, published-at, attempts, last sanitized error.
- Unique deduplication key; indexes for pending publication and retry time.
- Insert in the same database transaction as the job and initial event. Publisher marks published only after delivery acknowledgement; duplicate publication is expected and consumers deduplicate.

### 5.9 Relations and deletion policy

Jobs, attempts, leases, outputs, verification records and events are operational evidence. Use restrictive deletion semantics; do not cascade-delete evidence when a user, worker or Grid record is removed. Prefer deactivation/tombstone references. Do not add destructive retention or automatic purge in M6-05.

## 6. Execution contracts

### 6.1 Job submission contract

Input (conceptual TypeScript):

```ts
type SubmitExecutionJob = {
  gridId: CanonicalGridId;
  workerId: RegisteredWorkerId;
  jobType: string;
  contractVersion: string;
  inputSchemaVersion: string;
  input: unknown;
  acceptanceSchemaVersion: string;
  acceptanceCriteria: unknown;
  idempotencyKey: string;
  priority?: number;
  availableAt?: string;
  deadlineAt?: string;
  maxAttempts?: number;
  correlationId?: string;
  reason: string;
};
```

Rules:
- Authenticate actor and authorize request scope.
- Validate canonical Grid and worker IDs and an explicit, verified worker-to-Grid mapping.
- Validate payload and criteria against registered schemas; reject unknown properties where contract requires strictness.
- Enforce size, rate, time and attempt limits.
- Read current global/layer/Grid authorization and approval generation.
- Persist job + event + outbox atomically. Return job ID and state; never return a claim of execution.
- Duplicate idempotency key with identical canonical request returns the original job; same key with materially different request returns conflict.

### 6.2 Claim contract

A claim operation:
- runs in a short database transaction;
- selects eligible QUEUED/RETRY_WAIT jobs whose availableAt has arrived;
- locks candidates with `FOR UPDATE SKIP LOCKED`;
- rechecks current control hierarchy, worker mapping and policy in the same transaction or a transactionally safe authorization snapshot;
- increments attempt count, creates attempt and lease, advances state and appends event;
- returns a bounded claim envelope with lease ID, fencing generation, job contract and expiry.
- never holds a database transaction open while the model/worker executes.

If authorization cannot be checked, the claim fails closed and job remains BLOCKED or unclaimed with a reason event.

### 6.3 Worker execution contract

Worker adapter interface:

```ts
interface ExecutionWorker {
  readonly workerId: RegisteredWorkerId;
  readonly capabilities: readonly string[];
  execute(
    context: ExecutionContext,
    input: unknown,
    signal: AbortSignal
  ): Promise<ExecutionResult>;
}

type ExecutionContext = {
  jobId: string;
  attemptId: string;
  gridId: CanonicalGridId;
  workerInstanceId: string;
  leaseId: string;
  fencingGeneration: number;
  idempotencyKey: string;
  deadlineAt?: string;
  allowedTools: readonly string[];
  contractVersion: string;
};
```

Worker adapters have no direct database-admin access, no control-plane write authority, no secret enumeration, and no unlisted tools. Tool calls pass through a policy-enforcing broker. Worker execution cannot perform physical robotics actions, payments or fiat transactions.

### 6.4 Heartbeat/lease contract

- Heartbeat cadence and lease duration are configuration with hard upper bounds; final numeric defaults are set by implementation tests and measured Preview conditions.
- Renew only while lease is active, unexpired and fencing generation matches.
- A missed heartbeat does not immediately prove a worker crashed; recovery waits until lease expiry plus bounded clock-skew tolerance.
- Expired leases are marked expired and attempt outcome recorded. Job becomes RETRY_WAIT if retryable and within policy, otherwise DEAD_LETTER/FAILED.
- Recovery is idempotent and safe when run concurrently.

### 6.5 Retry contract

- Retry only classified transient errors (provider timeout, transient network/service failure, lease expiry) and only while attempts/deadline policy permits.
- Use exponential backoff with jitter and a configured maximum delay.
- Validation errors, authorization failures, revoked credentials, unsupported worker/Grid mapping and policy violations are not retried automatically.
- Every retry creates a new attempt; old attempt evidence remains.
- Exhausted jobs enter DEAD_LETTER or FAILED with explicit reason. Replay requires authorized decision.

### 6.6 Output and verification contract

- Persist output before verification; compute digest from canonical serialized bytes.
- Verifier independently checks schema, acceptance criteria, provenance, uniqueness/anti-duplication evidence where applicable, policy compliance and required source evidence.
- Verifier identity must differ from worker identity and must not share worker write credentials.
- PASSED verification can advance to SUCCEEDED only if the output digest still matches and the authorization/contract versions remain valid.
- FAILED or INCONCLUSIVE verification cannot be promoted by the executor. Human review/exception flow is separate and audited.
- Never equate generated text, model confidence or task completion callback with verified productive value.

### 6.7 Cancellation and control changes

- Global/layer/Grid OFF blocks new claims immediately.
- Existing jobs are marked BLOCKED or cancellation/drain requested according to the approved job policy. No new worker invocation after OFF is observed.
- Running workers receive cooperative abort; lease fencing prevents late writes.
- E-stop is not part of this software job control and must not be used as a substitute for physical robotics safety.
- Re-enabling a parent control does not automatically re-authorize stale jobs; fresh authorization generation is required.

## 7. Security, privacy and operations

- All job submission and administrative APIs require authenticated, role-checked access.
- Workers use short-lived scoped execution credentials; never use user session tokens as worker credentials.
- Secrets are resolved only by an approved secret broker; never included in job payloads, logs, traces or outputs.
- Sanitize and bound error messages and structured event payloads.
- Validate JSON against versioned schemas; reject arbitrary executable code.
- Separate worker, dispatcher, verifier and administrator privileges.
- Rate-limit per actor, Grid, worker type and global policy.
- Add concurrency and cost ceilings before any model provider is enabled. The worker cannot change these ceilings.
- Track queue depth/age, claims, lease expiries, retries, failures, verification backlog, output bytes, provider latency/cost (when applicable), and blocked reasons.
- Provide operational controls for pause/resume, cancel, retry/replay approval, quarantine and audit search. Control changes remain governed by M6-01/M6-02.
- Initial data access remains server-side Prisma/PostgreSQL. If any table is reachable through Supabase Data API, enable RLS and grant only the minimum intended access. Prefer no anon/authenticated grants for internal execution tables.
- Do not store secrets or sensitive personal data in general-purpose JSON payloads. Define data classification and retention before production acceptance.

## 8. API surface (proposed)

- `POST /api/execution/jobs` — submit a job (authenticated; no direct execution).
- `GET /api/execution/jobs/:id` — inspect state and safe metadata.
- `POST /api/execution/jobs/:id/cancel` — authorized cancellation request.
- `POST /api/execution/jobs/:id/replay-request` — request audited replay approval; not direct replay.
- Internal-only dispatcher operations: claim, heartbeat, start, persist output, fail/retry and complete.
- Internal-only verifier operations: claim verification and record findings.
- Admin read APIs: queue health, worker runtime connectivity, blocked reasons, lease/retry/dead-letter summaries and audit trail.

No unauthenticated claim, heartbeat, worker callback or verifier endpoint. Do not expose raw payloads/results unless caller has Grid/job access.

## 9. Acceptance test plan

### A. Persistence and atomicity
- A1: submit job and restart API/process; job remains present with same ID and state.
- A2: job, initial event and outbox record commit together; forced transaction failure leaves none of them.
- A3: duplicate idempotency key + identical request returns same job; changed request returns conflict.
- A4: outbox publisher crash before acknowledgement causes safe duplicate delivery; consumer deduplicates.
- A5: job state transition and event append are atomic.

### B. Authorization and control hierarchy
- B1: missing global control blocks submission/claim.
- B2: global OFF blocks all 53 Grid descendants.
- B3: layer OFF blocks all Grids in that layer.
- B4: Grid desired state not WORKING blocks claim.
- B5: worker/Grid assignment missing or ambiguous blocks claim.
- B6: stale parent control generation blocks claim.
- B7: parent control changes after enqueue but before claim blocks job.
- B8: parent control changes after claim but before worker start blocks start.
- B9: revoked approval/permission blocks execution and records reason.
- B10: worker cannot request/approve its own authorization or change parent controls.
- B11: re-enabling parent does not revive stale authorization without fresh approval.
- B12: API actor without required role cannot submit/administer protected work.

### C. Claim concurrency and leases
- C1: N concurrent dispatchers claiming one job produce exactly one active lease.
- C2: separate jobs can be claimed concurrently within configured limits.
- C3: worker heartbeat renews only its current lease.
- C4: expired lease cannot be renewed.
- C5: stale fencing generation cannot persist output, heartbeat or completion.
- C6: concurrent recovery workers expire/requeue a lease only once.
- C7: database transaction is short and is not held during model execution.
- C8: worker identity and instance are recorded on every attempt.

### D. Retry and recovery
- D1: transient failure enters RETRY_WAIT with bounded backoff.
- D2: permanent validation/authorization error is not retried.
- D3: attempt ceiling moves job to FAILED/DEAD_LETTER.
- D4: process crash after claim but before start recovers after lease expiry.
- D5: process crash during execution cannot allow stale completion.
- D6: crash after output persistence but before verification resumes verification without rerunning worker.
- D7: repeated recovery run is idempotent.
- D8: expired deadline prevents further attempts.

### E. Output and independent verification
- E1: output persists with canonical digest and provenance.
- E2: schema-invalid output cannot be verified.
- E3: verifier identity equal to executor is rejected.
- E4: failed or inconclusive verification cannot yield SUCCEEDED.
- E5: digest mismatch after persistence blocks completion.
- E6: duplicate output/evidence is detected according to the versioned verifier policy.
- E7: verifier crash resumes verification without losing output or prior attempt evidence.

### F. Cancellation, safety and boundaries
- F1: global/layer/Grid OFF prevents new claims immediately.
- F2: running job receives bounded cancellation signal; late result is fenced.
- F3: cancellation is auditable and idempotent.
- F4: job APIs reject robotics mission/physical-action job types.
- F5: no payment, settlement, payout, token transfer or fiat transaction handler exists in this milestone.
- F6: production runtime cannot be activated through Preview/simulator flags.
- F7: no production database or production environment secret is used by Preview workflow.
- F8: worker cannot alter retry, concurrency, cost, permissions or safety ceilings.

### G. Audit, privacy and operations
- G1: every transition records actor, timestamp, correlation ID and reason.
- G2: ordinary runtime role cannot update/delete execution events.
- G3: credentials and secrets are absent from logs, events and error payloads.
- G4: payload/output size and API rate limits are enforced.
- G5: queue health metrics distinguish queued, blocked, running, retry, verification and dead-letter counts.
- G6: audit query can reconstruct complete job lineage, attempts, leases, outputs and verifier decisions.
- G7: retention/export controls are explicit; no automatic evidence purge.

### H. 53-Grid coverage
- H1: every canonical Grid ID is accepted as a registry identity in the Grid catalogue.
- H2: no Grid receives a worker assignment by fuzzy name or inferred mapping.
- H3: unconfigured Grid/worker pair remains blocked.
- H4: test fixture covers all 53 Grid identities and all four economic layers without claiming all 53 are connected.
- H5: each Grid has independent queue metrics and fair scheduling visibility.

### I. Preview and release gates
- I1: M6-01/M6-02 migration is applied only through the existing Preview-only Prisma workflow after its SQL and target checks pass.
- I2: migration history, tables, columns, indexes, RLS and grants are verified from the dedicated Preview database.
- I3: Preview deployment is READY for the exact tested commit.
- I4: authenticated API tests prove global/layer/Grid fail-closed behavior at runtime.
- I5: worker runtime remains disconnected/disabled unless a separately approved, isolated test adapter is explicitly enabled.
- I6: no production deployment, production DB access, public launch or financial execution occurs.
- I7: all tests and evidence are linked to commit SHA, workflow run, Preview deployment and database migration state.

**M6-05 pass rule:** all applicable A–I tests pass in CI and Preview; no unresolved P0/P1 safety/security failures; evidence is reproducible and tied to the exact commit. A green CI run alone is not Preview acceptance or production acceptance.

## 10. Implementation sequence and checklist

### Phase 0 — unblock prerequisite
- [ ] Correct and test the merged M6-01/M6-02 migration SQL.
- [ ] Run Prisma schema validation and migration SQL syntax checks.
- [ ] Confirm dedicated Preview database target using existing workflow guard.
- [ ] Apply tracked Prisma migrations through GitHub Actions only.
- [ ] Verify all expected migrations, tables, columns, indexes, RLS and grants.
- [ ] Obtain a READY Preview deployment without changing Vercel plan/billing.
- [ ] Execute M6-01/M6-02 runtime acceptance tests; retain production freeze.

### Phase 1 — contracts and schema
- [ ] Review this specification and lock enum/state-transition matrix.
- [ ] Define canonical Grid/worker registry types and explicit mapping table.
- [ ] Define Zod schemas for submit, claim, heartbeat, output and verification.
- [ ] Add Prisma models/enums and migration on a separate implementation branch.
- [ ] Add unique constraints and partial indexes with safe preflight checks.
- [ ] Validate migration on a disposable/local test DB and dedicated Preview only after authorization.

### Phase 2 — durable core
- [ ] Implement transactional job submission + event + outbox.
- [ ] Implement atomic `SKIP LOCKED` claiming.
- [ ] Implement lease/fencing and heartbeat.
- [ ] Implement bounded retry/backoff and dead-letter.
- [ ] Implement idempotent recovery and cancellation.
- [ ] Add unit, integration, concurrency and crash-injection tests.

### Phase 3 — worker and verifier adapters
- [ ] Implement a deterministic test worker adapter first (no external model/provider).
- [ ] Implement strict tool broker and scoped execution context.
- [ ] Persist output and provenance.
- [ ] Implement independent deterministic verifier.
- [ ] Test executor/verifier separation and all failure cases.
- [ ] Keep production/model-provider connections disabled pending separate approval.

### Phase 4 — operations and Preview
- [ ] Add authenticated read/admin APIs.
- [ ] Add Admin Control Center queue/lease/retry/verification visibility.
- [ ] Add operational metrics and audit retrieval.
- [ ] Run full acceptance suite in CI and Preview.
- [ ] Capture exact commit, workflow, deployment and DB evidence.
- [ ] Record gaps; do not mark LIVE by assertion.

### Phase 5 — separate future authorization
- [ ] Review provider/model selection, privacy, cost and tool policy separately.
- [ ] Obtain explicit authorization for any real model connection or worker activation.
- [ ] Keep auto-scaling in M6-09 and robotics in M6-10/M6-11.
- [ ] Production acceptance remains a separate decision with independent release gates.

## 11. Current prerequisite evidence and blockers

At the time this specification was prepared:
- PR #54 is merged; PR #55 is also merged to main at `927c175a008ddce3df2b08a86fd43c5b685edc1a`.
- Main CI push run `42608040002` reports success for that merge commit; this is source/CI evidence only.
- The merged migration file contains an invalid single-dollar PL/pgSQL dollar-quote delimiter in its first DO block (`DO $` / `END $`). It must be corrected to a valid paired delimiter and revalidated before any migration attempt.
- Supabase project `cedars-preview` (`ncpftcmkiqkgfqeguyuc`, us-east-1) is ACTIVE_HEALTHY, but the Supabase connection's migration and public-table listings returned empty arrays. This does not establish successful Prisma migration; it indicates Preview schema acceptance is not demonstrated.
- No migration was run by this work. Do not use Supabase `apply_migration`, manual SQL, or production credentials. Use the existing guarded GitHub Preview Prisma workflow after the migration correction is reviewed and merged.
- Vercel access for the linked team was not available in this inspection; deployment state and build-rate-limit resolution remain unverified. Do not upgrade Vercel Hobby or change billing.

## 12. Release posture

M6-05 specification: **PROPOSED / READY FOR REVIEW**  
M6-05 implementation: **NOT STARTED**  
M6-01/M6-02 source: **MERGED**  
M6-01/M6-02 Preview acceptance: **BLOCKED / NOT VERIFIED**  
Production: **FROZEN**  
Financial execution: **OFF**  
Public launch: **OFF**  
Fiat transactions: **PROHIBITED**
