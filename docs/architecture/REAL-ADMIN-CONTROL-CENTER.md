# CEDARS OS™ — Real Admin Control Center Dashboard

**Status:** Preview implementation specification  
**Target:** Existing authenticated application entry point (`index.html`, copied to `public/index.html` by the build)  
**Branch:** Preview only  
**Governance:** Production frozen; financial execution OFF; public launch OFF

## 1. Objective

Build one real operational Admin Control Center that reduces repeated manual checking across the repository, Preview deployment, identity provider, database, grids, AI workers, and external integrations. The dashboard must save operator time by showing current verified state, exceptions, next actions, and evidence in one place.

This is an operational console, not a decorative mock-up or a second disconnected prototype. Extend the existing authenticated application rather than creating a competing dashboard. The separate `hybrid-preview.html` experience is explicitly a browser-side demonstration and must not be treated as the live control plane.

## 2. Core design rules

- **Evidence over assertion:** Every operational status must identify its source, observation time, and evidence class. Unknown, stale, unavailable, simulated, or unverified values must never appear as healthy/LIVE.
- **Desired state vs observed state:** Show configured/desired state separately from runtime-observed state and integration connection state.
- **One place to operate:** Provide a clear overview, prioritized exceptions, and direct navigation to grids, workers, integrations, approvals, audit, security, and reliability.
- **Connection-first:** Show Preview integrations and their connection/contract/execution verification states as first-class dashboard data.
- **Grid-only AI operation:** All operational work is performed by authorized AI workers through CEDARS grids. Human functions are governance, authorization, exception handling and safety oversight, not physical execution.
- **Safe by default:** Fail closed when identity, API, database, policy, runtime, or evidence is unavailable. Preserve dual approval for activation and immediate safe-state controls.
- **Least privilege:** All protected dashboard data/actions use authenticated server-side role authorization. Never rely on UI-only role checks.
- **No financial execution:** No deposits, withdrawals, fiat transactions, wallet signing, token transfer, or payment execution. Financial execution and public launch remain OFF.
- **Operator efficiency:** Present the most important exceptions first, retain useful context, avoid repeated navigation, and show a clear next action and responsible system for each issue.

## 3. Dashboard information architecture

### A. Command Overview (default landing page)

Show only values backed by real API/runtime evidence:
- API health and readiness, with health separated from database readiness.
- Database connectivity and migration/readiness status.
- Identity provider configuration/availability and authenticated session state.
- Preview deployment identity: environment, branch/commit/deployment reference where safely available.
- Grid catalogue totals, desired states, observed runtime states, and connected integration counts.
- AI worker catalogue totals, desired configuration, runtime connectivity, and verified execution counts (zero/unknown when not evidenced).
- Pending approvals, failed integrations, stale evidence, recent incidents, and latest audit activity.
- Governance indicators: Production FROZEN, financial execution OFF, public launch OFF.

Never show synthetic metrics as live. If a source endpoint is unavailable, show UNKNOWN/UNAVAILABLE with the failed check and timestamp.

### B. Grid Registry

For every canonical grid and economic layer show:
- identity, layer, purpose, dependencies and owner;
- desired state (OFF/STANDBY/WORKING/MAINTENANCE);
- observed runtime state;
- integration state and dependency health;
- last successful authenticated connection/contract check;
- latest verified execution evidence, if any;
- blockers and a safe next action.

A grid configured as WORKING is not necessarily connected or executing. Keep these states separate.

### C. AI Worker Operations

For every AI worker show:
- registered worker identity and version/configuration;
- enabled/desired instance count;
- authorization and tool scopes;
- runtime connection and heartbeat;
- assigned grid and allowed integration adapters;
- last execution, outcome, output provenance and validation state;
- error/retry/disabled status.

Worker catalogue entries or desired configuration alone do not prove autonomous execution. No worker may run arbitrary tools or hold unrestricted provider credentials.

### D. Integrations & Connections

Maintain a searchable registry linked to grids and workers. Each record includes provider/system, capability, environment, endpoint identifier (never secret), owner, scopes, data classification, region, dependency links, last check, failure details, and evidence references.

Show distinct lifecycle states:
1. DEFINED
2. CONFIGURED
3. CONNECTED
4. CONTRACT_VERIFIED
5. EXECUTION_VERIFIED
6. SUSPENDED / FAILED

A ping or provider console status cannot promote an integration to EXECUTION_VERIFIED. Simulated connections are labelled SIMULATED and never count as real connections.

### E. Approvals & Governance

Show pending requests, requester, requested state, scope, reason, required independent approver quorum, expiry/staleness and decision audit. Prevent self-approval. Preserve financial module activation blocks and existing safe-state behavior.

### F. Audit & Activity

Show immutable/append-only audit events with actor, action, entity, timestamp, reason, correlation reference and related evidence. Provide filters and safe export where authorization allows. Do not leak secrets or sensitive payloads.

### G. Reliability & Security

Show API/DB/identity/integration health, latency and last-success time, deployment and migration evidence, stale checks, error rates, credential expiry/rotation reminders where available, backup/restore evidence, incidents, and kill-switch state. Never claim backup or recovery capability without a verified restore test.

### H. Work Queue / Next Actions

Provide an operator-focused prioritized list:
- what is blocked;
- why it is blocked;
- evidence/source;
- what action is permitted;
- which system owns the action;
- whether approval is required;
- last checked and next review.

This is the time-saving heart of the dashboard. Do not generate fake work or auto-run high-impact actions. AI may summarize and prioritize verified signals, but changes require authorized controls and approvals.

## 4. Existing source integration inventory

The repository currently contains an authenticated UI in `index.html`, built into `public/index.html`. It uses Auth0 Authorization Code + PKCE and calls protected API endpoints. The current `hybrid-preview.html` is a separate local browser demonstration and must not be mistaken for the real dashboard.

Existing API capabilities documented in the repository include:
- `GET /api/health` — public process health.
- `GET /api/ready` — database and identity configuration readiness.
- `GET /api/modules` — authenticated module flags.
- `GET /api/operations/summary` — authenticated aggregate module/worker/grid counts and latest audit/module change.
- `GET /api/workers` and `GET /api/grids` — authenticated catalogue plus desired state and explicit disconnected runtime/integration states.
- `GET /api/admin/approvals` and approval decision routes — role-protected approval workflow.
- Admin write routes for modules, workers and grids — authenticated, audited, with approval gates for activation/scale-up/WORKING state.
- Audit and read-only treasury observation routes — restricted by role; treasury observation is not a payment or settlement system.

Known implementation limitations to keep visible:
- Worker runtime mode is DISCONNECTED by default; catalogue/configuration is not execution.
- Grid runtime and provider adapters are not connected; desired state is not actual operation.
- Existing Grid Tasks are manually administered and are not evidence of AI-worker execution; they must not feed AI Grid Contribution or Balance.
- The repository documents that some nested Preview routes have returned Vercel NOT_FOUND/500 errors despite source handlers. Validate the actual deployed Preview endpoints and generated routing before depending on them; do not speculate with route rewrites.
- Database readiness and migration status must be checked against the dedicated Preview database only.
- The operations summary endpoint is useful but cannot be the only source; the dashboard should degrade gracefully and surface endpoint failure.

## 5. Data/API contract requirements

Prefer typed, versioned server responses with:
- `observedAt` timestamp;
- `environment` identifier (Preview);
- `source` and evidence reference;
- `status` with explicit UNKNOWN/STALE/UNAVAILABLE states;
- separate `desiredState`, `connectionState`, `runtimeState`, and `verificationState`;
- correlation/request IDs for diagnostics.

Do not calculate live totals from static arrays or UI-only state when server records are required. Use server-side authorization and per-resource access checks. Apply private/no-store caching to sensitive operational data. Redact secrets, tokens, private endpoint credentials and personal data from logs and UI.

## 6. Delivery sequence

1. **Dashboard source-of-truth audit:** inspect the current `index.html`, API handlers, route registration, auth/session flow, role model, database schema and Preview deployment. Map each visible dashboard tile to a real endpoint and identify missing/failed endpoints.
2. **Preview connectivity baseline:** verify health, readiness, Auth0 token/audience/role claims, database isolation, modules, workers, grids, approvals and audit endpoints on the actual Preview deployment. Record evidence and failures; do not change Production.
3. **Dashboard data contract:** define one authenticated read-only command overview response or a reliable set of typed endpoint responses, with observed timestamps and fail-closed states.
4. **Real overview UI:** replace synthetic dashboard values with API-backed values; add clear UNKNOWN/NOT_CONNECTED/SIMULATED/STALE states and prioritized blockers.
5. **Integration registry:** implement real Preview connection records and checks, secrets isolation, provider adapters and contract tests.
6. **Operational panels:** complete grid, worker, approvals, audit, reliability and next-action views, reusing existing audited backend controls.
7. **End-to-end verification:** test role access, API failures, DB outage, stale data, provider outage, expired/revoked credentials, safe-state controls, dual approval and audit integrity.
8. **Preview acceptance:** confirm all visible metrics map to evidence and no UI control bypasses backend authorization. Production remains frozen.

## 7. Explicit non-goals for this dashboard milestone

- No public launch or production deployment.
- No activation of live AI workers or grids merely by displaying a dashboard.
- No fiat transactions, deposits, withdrawals, wallet signing, token transfers, payment processing or cash-equivalent Balance.
- No human physical work or manual Grid Task contribution records.
- No false LIVE/healthy/connected labels.
- No new database migration until the actual dashboard data contract and integration registry have been reviewed.
