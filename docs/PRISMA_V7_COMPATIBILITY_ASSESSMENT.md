# Prisma ORM 7 Compatibility Assessment

**Branch:** `feature/prisma-v7-assessment`  
**Base:** `security/m0-critical-dependency-gate` (PR #47 remains unmerged)  
**Status:** Assessment in progress. No Prisma upgrade has been applied or approved.

## Objective

Evaluate the suggested Prisma 7.10.1 remediation for the high `deepmerge-ts` advisory while keeping all work isolated from `main`, production deployments, and production databases.

## Current repository evidence

- `package.json` requests `prisma` and `@prisma/client` at `^6.19.0`; the current lockfile resolves both to `6.19.3`.
- `prisma/schema.prisma` uses `provider = "prisma-client-js"` and `url = env("DATABASE_URL")`.
- `src/db.ts` imports `PrismaClient` from `@prisma/client` and constructs `new PrismaClient()`.
- There is no root `prisma.config.ts`.
- The repository contains six committed migration directories.
- CI uses Node 22 and TypeScript 5.9.3. The TypeScript configuration currently uses `NodeNext` module and resolution modes.
- CI's existing build runs `prisma generate`. Existing tests and runtime checks have passed on Prisma 6.19.3; they do not validate Prisma 7.

## Compatibility findings

The official [Prisma ORM v7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) documents breaking changes and says both `prisma` and `@prisma/client` must be upgraded together.

| Area | Repository state | Prisma 7 change / assessment | Required validation |
|---|---|---|---|
| Runtime baseline | Node 22; TypeScript 5.9.3 | Meets the guide's recommended Node 22 and TypeScript 5.9 versions. | Confirm the Vercel Preview build uses Node 22; no Preview deployment initiated. |
| ESM and TypeScript | Package is ESM; TypeScript uses NodeNext. | ESM compatibility is likely, but generated-client output/import behavior changes. | Run schema generation, type-check, tests, and build on the assessment branch. |
| Generator | `prisma-client-js`, no output path. | Guide calls for `prisma-client` with explicit output and changed import paths. | Update schema and all `@prisma/client` imports; confirm generation and bundling. |
| Client construction | `new PrismaClient()`. | Prisma 7 requires a database driver adapter; PostgreSQL example uses `@prisma/adapter-pg` and `pg`. The repository currently has no direct adapter or `pg` dependency. | Add compatible driver packages, instantiate adapter from `DATABASE_URL`, validate pooling, TLS, startup, and shutdown using a local synthetic database. |
| Database configuration | URL is in the schema; no `prisma.config.ts`. | Prisma CLI configuration moves to `prisma.config.ts`; environment loading behavior changes. | Add config with explicit environment loading; confirm schema generation and CLI commands without reading production configuration. |
| Migrations | Six migrations are committed. | Migration tooling/configuration compatibility has not been validated. | Use a disposable local synthetic PostgreSQL database to validate migration status, apply, rollback/recovery, and schema consistency. No production or shared database. |
| Security | Audit says Prisma 7.10.1 resolves the Prisma-chain finding. | The change is major and changes runtime client configuration. | Re-run full and production-only audit; verify the targeted advisory is absent and no critical findings are introduced. |

## Decision

**Upgrade decision: Deferred pending isolated implementation and owner review.** This is not an approved risk acceptance or a final rejection.

The dependency audit's proposed Prisma 7.10.1 fix is a major upgrade. Generator output/imports, adapter installation, database configuration, environment loading, connection-pool behavior, and the six migrations all need validation. The omit-dev audit result is explained by the Prisma CLI's `devOptional` optional-peer path; it does not establish that the vulnerable merge function ships in the deployed bundle or is reachable from an internet request.

## Validation status

| Check | Status |
|---|---|
| Branch created from isolated security work | Complete |
| Prisma 7 package changes | Not applied |
| Dependency install / lockfile regeneration | Not run |
| Prisma 7 schema generation | Not run |
| Build / type-check / tests on Prisma 7 | Not run |
| Client initialization and health check | Not run |
| Migration validation / rollback | Not run |
| Prisma 7 audit | Not run |
| Security review | Pending |

## Safety boundary

No production database, credential, migration, or deployment was accessed or changed. No Prisma migration was run. Remaining validation must use a disposable local synthetic database and remain on this branch. Do not merge to `main` or promote a production deployment under the current restrictions.
