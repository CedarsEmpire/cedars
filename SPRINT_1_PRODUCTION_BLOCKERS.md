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

The repository's `scripts/runtime-check.ts` has four stale imports after API consolidation:

- `../api/modules/index.ts` → `../src/server/handlers/modules.ts`
- `../api/operations/summary.ts` → `../src/server/handlers/operations-summary.ts`
- `../api/ready.ts` → `../src/server/handlers/ready.ts`
- `../api/grids/index.ts` → `../src/server/handlers/grids.ts`

As committed, `npm run runtime:check` fails at a missing import. In an isolated sandbox only, those four imports were temporarily redirected; the script then passed 23 local assertions using an in-memory database and ephemeral RS256/JWKS keys. Assertions covered anonymous denial, invalid-role denial, Partner restrictions, Founder/Super Admin access, dual approval, financial activation blocking, disconnected grid runtime, audit visibility, and control-plane readiness. This is local logic evidence, not live identity-provider evidence. The expired-token case is not currently tested.

## Release decision

**Release gate OPEN.** CI, typecheck and build pass on draft PR #5, but production API runtime is blocked by missing `DATABASE_URL`; nested auth/operations routes return 404; the real identity journey is unverified; expired-token denial remains untested. Production alias remains on the baseline deployment above. No production environment, deployment, alias, or database changes were made during these probes.
