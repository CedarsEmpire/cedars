# CEDARS OS™ Preview Preservation and Connection Baseline

**Recorded:** 2026-11-07  
**Working branch:** `preview/customer-balance-records`  
**Protected checkpoint branch:** `checkpoint/preview-known-good-2026-11-07`  
**Checkpoint commit:** `9eb5db5bd104532b51aa9d931ad10768382d4fc4`  
**Scope:** Read-only discovery and preservation. No production resources, secrets, database schema, financial rails or worker settings were changed.

## 1. Preservation record

A separate Git branch was created at the previously observed READY Preview build commit `9eb5db5bd104532b51aa9d931ad10768382d4fc4`. This preserves the Grid–Worker–Integration Dependency Matrix and the preceding architecture state independently of subsequent work.

Previously observed READY Preview deployments for the same project/branch include:

| Commit | Deployment | Observed state |
|---|---|---|
| `9eb5db5bd104532b51aa9d931ad10768382d4fc4` | `dpl_5Spu42q5DaeapG98fXagEc3tsksy` | READY |
| `055fb112a7788e74cdcc6bef136db908255b0612` | `dpl_3hCtK4q8ZfgRavWWrwAcifGdrMa9` | READY |
| `b6cd9fb76594add76a57aa58ae15a28c80a87147` | `dpl_HacTEcZKwXKeeYQpPA24xCde619P` | READY |

The latest inspected deployment for commit `6d920797c1aeb9df9772b08c59260cb67bc209e1` was QUEUED at the time of inspection. Its final result must be checked before treating that commit as a verified deployment.

Checkpoint branch URL: https://github.com/CedarsEmpire/cedars/tree/checkpoint/preview-known-good-2026-11-07

## 2. Source/runtime facts observed

- Worker catalogue contains five configured worker definitions: Sales AI, Research AI, Healthcare AI, Opportunity AI and Support AI.
- Runtime implementation supports only `DISCONNECTED` and `SIMULATOR`; there is no connected live worker execution runtime in the inspected source.
- Canonical grid catalogue contains 53 grids across the four source-defined layers. This baseline does not change catalog entries or enable grids.
- Package manifest contains Prisma, JOSE and Zod as runtime dependencies; no AI provider SDK, durable queue/orchestrator, artifact-store adapter, or payment provider is established by that manifest.
- Existing Grid Task workflow is manually administered and is not evidence of AI-worker execution. It must not feed AI contribution verification or Balance.

## 3. Preview infrastructure observations

### Vercel

- Project: `cedars-vkz3`, ID `prj_AjJwDzQR6Qwn8kupRRAQDxHEIZTI`.
- Project reports `live: false`; SSO protection is enabled for non-custom domains; password protection is disabled.
- Project environment-variable listing returned an empty array for both the Preview branch filter and the unfiltered query at inspection time. This means no Preview runtime settings were visible through that listing. It does not prove whether another configuration surface or external secret store exists.
- The current/latest deployment observed was QUEUED; the earlier matrix commit deployment was READY. Recheck deployment state and health before using it as a runtime baseline.

### Supabase

- Dedicated Preview project: `cedars-preview`, project ref `ncpftcmkiqkgfqeguyuc`, region `us-east-1`, status `ACTIVE_HEALTHY`.
- Read-only table listing for the `public` schema returned no tables.
- Read-only migration listing returned no migration records.
- Development branch listing returned no branches.
- The database is therefore reachable as an active Supabase project, but the inspected database does not yet show the application's Prisma schema/migration history. Do not apply migrations until the dedicated Preview connection secret is confirmed and the target is independently checked.

### Existing database workflows

- The repository has Preview database connection-check and migration workflows.
- Both are manually dispatched, gated to `refs/heads/main`, require confirmation `PREVIEW_ONLY`, and use GitHub environment `cedars-preview-db` with secret `CEDARS_PREVIEW_DATABASE_URL`.
- The migration workflow explicitly validates the Supabase Preview pooler host, project-specific database role, port, database path and TLS requirement before running Prisma migrations.
- Because these workflows are main-branch dispatch workflows, dispatching them from the feature branch will not run the intended job. Do not change this workflow scope without a separate reviewed change.
- A missing or misconfigured GitHub environment secret will stop the workflow before database access. Never paste the connection string into chat or source code.

### Identity and AI inference

- Auth0 Preview tenant and browser/API applications were configured in the prior setup process, but a successful end-to-end API token validation against the currently deployed Preview API has not been established by this inspection.
- No Vercel Preview environment variables were visible in the project listing, so Auth0 API settings and `DATABASE_URL` are not proven available to the deployed API.
- No AI inference provider or server-side provider credential/runtime is selected or proven connected. Do not enable an AI worker until the provider, key handling, scopes, limits, data terms and runtime execution contract are reviewed.

## 4. Connection state — fail closed

| Service | Observed state | What remains before execution |
|---|---|---|
| Git checkpoint | PRESERVED | Keep checkpoint immutable; use new branches/commits for changes |
| Vercel Preview | Project exists; recent deployment state needs recheck | Verify latest READY deployment and environment configuration |
| Supabase Preview | Project ACTIVE_HEALTHY; schema/migrations absent in inspected project | Confirm GitHub environment secret privately; run read-only connection test; then reviewed migrations |
| Auth0 Preview | Tenant/apps configured in prior setup | Verify Preview environment settings and real API token validation |
| AI inference | NOT CONNECTED / provider not selected | Select provider; configure secret privately; test bounded Preview inference |
| Worker orchestration / queue | NOT CONNECTED | Implement/choose durable dispatch, isolation, idempotency, cancellation and traces |
| Artifact/evidence storage | NOT CONNECTED | Choose restricted storage and hash/provenance retention |
| Independent validator | NOT ESTABLISHED | Define deterministic output checks and validation identity |

## 5. Preserve-first change protocol

1. Never amend, force-push, delete or overwrite the checkpoint branch or known-good commits.
2. Make all implementation changes on a separate Preview feature branch.
3. Before each change, record the base commit, affected files, intended behaviour and rollback path.
4. Keep changes small; run tests, typecheck and build; inspect diffs before commit.
5. Verify each Preview deployment by exact commit SHA and deployment ID.
6. Keep successful evidence artifacts and logs with timestamps and correlation IDs; never store secrets in evidence.
7. If a check fails, stop and diagnose from evidence. Do not layer speculative fixes over an unknown failure.
8. Production, public launch and live financial execution remain outside this work's activation scope.

## 6. Immediate blockers to first real AI-worker execution

The first controlled pilot cannot honestly be called connected until these are resolved:

1. Confirm the GitHub `cedars-preview-db` environment contains the dedicated Preview connection secret, without disclosing its value.
2. Run the read-only Preview database connection workflow against the exact Preview project; resolve the observed empty schema/migration state through the reviewed migration workflow only after target validation.
3. Configure and verify the six API runtime settings in Vercel Preview: `DATABASE_URL`, `AUTH_JWKS_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_CLIENT_ID`, and `AUTH_ROLE_CLAIM`. Values must be added privately in Vercel; never commit or paste secrets.
4. Verify Auth0 access-token validation and protected API authorization on the exact Preview deployment.
5. Select and privately configure one AI inference provider; define the approved model, data restrictions, cost/rate ceilings and key rotation.
6. Add an isolated, bounded worker execution path with unique run IDs, idempotency, cancellation, traces, artifact hashes, independent validation and an emergency stop.
7. Run one low-risk, digital-only Research AI Preview job with approved data. No human physical work, payment, wallet, production data or customer-sensitive data is involved.
8. Only after the full evidence package passes may that specific worker/grid be labelled EXECUTION_VERIFIED.

**Acceptance rule:** An active cloud project, configured Auth0 tenant, successful deployment, health endpoint, simulator, model API ping or worker ON switch is not proof of a completed AI-grid execution. Preserve and label each evidence class accurately.
