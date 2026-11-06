# CEDARS Worker + Grid Task — restricted pilot launch runbook

## Current verified implementation boundary

This repository contains:
- Authenticated worker catalogue and audited desired-state controls.
- Independent approval requests for worker enablement and scale-up.
- Authenticated grid catalogue and audited desired-state controls.
- Independent approval requests before a grid changes to `WORKING`.
- A Grid Task API for task creation, listing, assignment, manual start, delivery evidence, buyer acceptance, and cancellation.
- A database-backed audit trail and a restricted pilot gate.

This repository does **not** currently contain:
- A worker process, job queue, lease/heartbeat system, AI model/provider adapter, tool execution sandbox, or autonomous task executor.
- A production grid/provider adapter.
- Payment intake, customer wallet balances, settlement, or payout.
- A verified live treasury signing wallet.

Therefore, the first pilot can exercise **human-operated task workflow and evidence capture**. It must not be described as an autonomous AI-worker launch or a paid/settled work platform. Worker desired state `enabled=true` is configuration only and must not be presented as a running process. Runtime remains `NOT_CONNECTED` outside the non-production simulator.

## Non-negotiable launch posture

- Public launch: OFF.
- Production worker runtime: OFF / NOT CONNECTED.
- Financial execution, customer balance credits, settlement, and payouts: OFF.
- Treasury: read-only observation only.
- Grid Task pilot: isolated Preview environment, approved internal users only.
- Use synthetic task records and no customer money until payment, refund/dispute, reconciliation, legal/compliance, and security gates are separately implemented and signed off.

## Stage 0 — Repository and deployment preparation

1. Review the open treasury-observation PR and this runbook; merge only after normal repository review.
2. Create a dedicated Vercel Preview deployment and isolated PostgreSQL database. Do not point Preview at Production.
3. Configure the six authentication settings in the Preview environment. Use a dedicated Preview identity-provider application/tenant and trusted role claims.
4. Apply migrations to the Preview database using the deployment pipeline: `npx prisma migrate deploy`.
5. Seed the control-plane catalog: `npm run db:seed`. Seeding creates disabled modules/workers and STANDBY grids; it does not start workers.
6. Run `npm ci`, `npm run build`, `npm test`, and `npm run runtime:check` in the repository's CI or controlled development environment. Do not treat this document as evidence that these commands have passed.
7. Verify `GET /api/ready` reports database, identity, module, worker, and grid control planes configured. It intentionally reports live operations as not ready and worker/grid runtimes as disconnected.

## Stage 1 — Configure the internal pilot gate

In Preview environment secrets only:
- Set `CEDARS_GRID_TASKS_ENABLED=true` only after the pilot owner approves the test window.
- Set `CEDARS_GRID_TASK_TESTER_SUBJECTS` to a comma-separated list of exact, verified identity-provider `sub` values for the approved pilot users. Do not put emails, names, wildcard values, or broad role names here.
- Keep the list as small as possible. Remove access by deleting the subject and setting the environment kill switch to `false` when pausing the pilot.
- Keep the database feature flag `grid_tasks` OFF until an independent Founder/Super Admin approval is recorded.

For local smoke testing, the local development server issues two fixed identities: `local-dev-founder` and `local-dev-super-admin`. Add both exact subjects to the local `CEDARS_GRID_TASK_TESTER_SUBJECTS` value and set `CEDARS_GRID_TASKS_ENABLED=true` in the local `.env` file before running `npm run smoke`. Do not copy these local-only subjects into a hosted Preview or Production environment. The smoke suite exercises create, list, assign, start, independent-operator delivery, buyer acceptance, cancellation, and then disables the module flag.\n\nAll three gates are required for task API access:
1. environment kill switch,
2. exact subject allowlist,
3. database `grid_tasks` feature flag.

The task API is not public. Every request must authenticate, and the task API returns `settlementMode: NOT_CONNECTED`.

## Stage 2 — Validate admin controls

Use a Founder or Super Admin Preview identity:
- `GET /api/workers` — inspect catalogue, desired enabled state, and runtime status.
- `GET /api/grids` — inspect grid catalogue, dependencies, desired state, and integration status.
- `PUT /api/admin/workers/{worker}` — request worker enablement. Enabling or scaling up returns HTTP 202 with an approval request; a different authorized administrator must approve it.
- `PUT /api/admin/grids/{grid}` — request a grid state of `WORKING`. It returns HTTP 202 with an approval request; an independent administrator must approve it.
- `GET /api/admin/approvals` — review pending requests.
- `PUT /api/admin/approvals/{approval}` — approve or reject with a reason. Requesters cannot approve their own requests.

Use the API's exact allowlisted worker and grid IDs from the catalog. Keep grids in STANDBY unless a real integration exists and has been independently verified. A `WORKING` desired state is not evidence of a connected grid.

Worker configuration must remain OFF unless there is a named human operator responsible for the manual pilot. Do not call a configured worker "running"; its runtime is not connected.

## Stage 3 — Exercise the human-operated Grid Task lifecycle

After the environment kill switch and exact allowlist are configured, a Founder/Super Admin requests `grid_tasks` ON through `PUT /api/admin/modules/grid_tasks`. A different authorized administrator approves the request.

For an allowlisted pilot user:
1. `POST /api/tasks` creates a task with grid, scope, acceptance criteria, amount, and currency.
2. `GET /api/tasks` lists tasks. Non-admin users see only their own tasks.
3. Founder/Super Admin uses `PUT /api/tasks/{task}` with `action=assign` and a catalog worker ID.
4. Founder/Super Admin uses `action=start` to record manual work start.
5. A non-buyer Founder/Super Admin uses `action=deliver` with evidence and a reason.
6. The buyer uses `action=accept` only after independently checking the delivery against the written acceptance criteria.
7. The buyer or an administrator can cancel only while the task is OPEN or ASSIGNED.

Use separate buyer and operator identities in testing. The buyer cannot submit their own delivery evidence. Record test evidence and audit events for every transition. The agreed amount is descriptive task metadata only; it is not an invoice, payment, payable balance, or proof of receipt. The API explicitly reports settlement as `NOT_RECORDED`.

## Stage 4 — Worker runtime build gate (required before autonomous worker launch)

Do not activate autonomous workers until engineering implements and tests:
- A durable job queue with atomic claim/lease, heartbeat, expiry, retry policy, dead-letter handling, and idempotency keys.
- A worker execution service isolated from the web/API process, with per-worker concurrency and timeouts.
- Explicit model-provider adapters with spend limits, request logging, data-retention controls, and provider failure handling.
- A strict tool allowlist and sandbox; no shell, arbitrary network, secrets, or unrestricted database access for agents.
- Task-to-worker authorization, task scope enforcement, input/output validation, and evidence provenance.
- Human approval gates for external side effects; workers must have no treasury signing keys or payout authority.
- Kill switch, per-worker pause, global pause, alerting, metrics, and recovery runbooks.
- Integration, load, failure-injection, authorization, and security tests.
- Clear UI separation between desired state, observed process health, and task execution state.

## Stage 5 — Evidence required for pilot acceptance

- [ ] Preview is isolated from Production.
- [ ] Migrations and seed completed successfully.
- [ ] Build, unit tests, runtime checks, and smoke tests pass in CI.
- [ ] Readiness endpoint reports control planes configured and live operations not ready.
- [ ] Unauthorized users and non-allowlisted subjects receive 403 from task endpoints.
- [ ] Grid Task module cannot be enabled without independent approval.
- [ ] Worker enablement and grid WORKING transitions require independent approval.
- [ ] Buyer cannot submit own delivery evidence or accept another buyer's task.
- [ ] Task state transitions reject invalid/out-of-order updates.
- [ ] Task and control changes are audit logged.
- [ ] Repeated requests do not create duplicate state changes or bypass gates.
- [ ] Pause procedure is rehearsed: set environment kill switch false, disable module flag, and verify task APIs return 403.
- [ ] No real customer money, wallet credits, settlement, or payouts are involved.
- [ ] Operations, engineering, security, and compliance owners record their review.

## Pilot stop conditions

Immediately pause the task pilot if there is an authorization bypass, missing audit event, unexpected task transition, cross-buyer data exposure, unexplained worker/grid state, database inconsistency, or any attempt to treat task amounts as received or payable funds.

A successful human-operated task pilot is not approval for autonomous worker execution, live financial activity, or public launch.
