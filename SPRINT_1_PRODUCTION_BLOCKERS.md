# Sprint 1 — Production Runtime Blockers

Assessment: 2026-11-04  
Production deployment: `dpl_7iw8fPPwrYH9F1rxMacZMKNUJyRx`  
Production source: `main` at `4e3987d0c90b46c2612fa9c600da19c6f868dd3e`

## Live read-only production probes

| GET path | HTTP status | Result |
|---|---:|---|
| `/api/health` | 500 | `FUNCTION_INVOCATION_FAILED` |
| `/api/ready` | 500 | `FUNCTION_INVOCATION_FAILED` |
| `/api/auth/config` | 404 | `NOT_FOUND` |
| `/api/modules` | 500 | `FUNCTION_INVOCATION_FAILED` |
| `/api/grids` | 500 | `FUNCTION_INVOCATION_FAILED` |
| `/api/admin/audit` | 500 | `FUNCTION_INVOCATION_FAILED` |
| `/api/operations/summary` | 404 | `NOT_FOUND` |

Vercel runtime logs for the 500 responses show the fatal initialization error:

```
Error: DATABASE_URL must be configured in production.
    at createPrismaClient (/vercel/path0/src/db.ts:701:11)
    at <anonymous> (/vercel/path0/src/db.ts:715:59)
Node.js process exited with exit status: 1.
```

A non-decrypting project environment inventory returned `envs: []` and `hiddenProductionEnvCount: 0`. The runtime log independently confirms that `DATABASE_URL` is missing. Auth0 environment configuration is not evidenced as installed.

The consolidated `api/[...path].ts` imports database-backed handlers at module scope. This causes the database initialization error to break even `/api/health`, although its handler does not itself need a database. Refactor handler loading so public health and auth-config endpoints do not eagerly import unrelated database-backed handlers. Separately investigate nested route dispatch: `/api/auth/config` and `/api/operations/summary` return 404, while one-segment consolidated paths return 500. The 404 cause is not yet confirmed.

## Identity journey

**NOT PASS.** No real registration, verification, Auth0 sign-in, token issuance, protected dashboard access, or sign-out/session invalidation was completed. Production auth-config is 404; database configuration is missing; no provider secrets or controlled test account were supplied. Do not invent credentials or claim an end-to-end pass.

## Authorization logic evidence

The branch now corrects the four stale imports after API consolidation:

- `../api/modules/index.ts` → `../src/server/handlers/modules.ts`
- `../api/operations/summary.ts` → `../src/server/handlers/operations-summary.ts`
- `../api/ready.ts` → `../src/server/handlers/ready.ts`
- `../api/grids/index.ts` → `../src/server/handlers/grids.ts`

The branch also adds an expired-token denial assertion. On branch commit `4f9999aa6a23764fd6c74b3eaf86b9d16fd5b663`, `npm run runtime:check` passed in an isolated Node 22 sandbox using an in-memory database and ephemeral RS256/JWKS keys. It reported 24 PASS assertions covering anonymous denial, expired-token denial, invalid-role denial, Partner restrictions, Founder/Super Admin access, dual approval, financial activation blocking, disconnected grid runtime, audit visibility, and control-plane readiness. No configured database was modified. This is local authorization/control-plane logic evidence, not live identity-provider evidence.

The branch's CI workflow now includes `npm run runtime:check` and captures full and omit-dev npm audit JSON as 30-day GitHub Actions artifacts. However, the latest observed GitHub Actions run and PR API head still point to commit `aef85fee7db39a295366695f8706f540ae79ed34`, while the branch ref is at `4f9999aa6a23764fd6c74b3eaf86b9d16fd5b663`. The updated workflow has therefore not yet been proven by a GitHub Actions run.

## Release decision

**Release gate OPEN.** Tests (51/51), typecheck and build pass in the isolated sandbox; 24 local runtime-check assertions pass on branch commit 4f9999a. Production API runtime is blocked by missing `DATABASE_URL`; nested auth/operations routes return 404; the real identity journey is unverified. The latest GitHub Actions run has not yet validated the updated runtime-check/audit-artifact workflow. Production alias remains on the baseline deployment above. No production environment, deployment, alias, or database changes were made during these probes.
