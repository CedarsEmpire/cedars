# Prisma Chain Reachability Assessment

**Branch:** `feature/prisma-v7-assessment`  
**Source baseline:** security-fix branch at `131ed9729799f2f79d09d645db8a1d2563149159`  
**Status:** Preliminary source and lockfile review; not a formal Security disposition.

## Question

Does the vulnerable `deepmerge-ts` path appear reachable from an internet-facing Cedars request, or is the production-only npm audit result caused by the Prisma CLI's optional peer relationship?

## Evidence reviewed

- Root manifest: `@prisma/client` is a production dependency; `prisma` is declared in `devDependencies`.
- Lockfile at the source baseline:
  - `node_modules/@prisma/client@6.19.3` declares optional peer `prisma: *`.
  - `node_modules/prisma@6.19.3` is marked `devOptional` and depends on `@prisma/config@6.19.3`.
  - `node_modules/@prisma/config@6.19.3` is marked `devOptional` and depends on `deepmerge-ts@7.1.5`, also marked `devOptional`.
- The latest CI `npm audit --omit=dev` still lists `prisma`, `@prisma/config`, and `deepmerge-ts`. The repo's existing [dependency risk register](https://github.com/CedarsEmpire/cedars/blob/security/m0-critical-dependency-gate/SPRINT_1_DEPENDENCY_RISK_REGISTER.md) explains these records arise through the optional-peer relationship and are not proof that these packages ship in a deployed bundle.
- Application source imports `PrismaClient` from `@prisma/client` in `src/db.ts`; it calls `new PrismaClient()` for the configured database. The seed script also imports `PrismaClient`.
- Repository source search found no direct application import of `deepmerge-ts`, `@prisma/config`, or Prisma CLI APIs. No evidence reviewed shows a request handler passing attacker-controlled data to the vulnerable deep-merge function.

## Assessment

- **Dependency presence:** Confirmed in the omit-dev audit via `devOptional` Prisma CLI/config entries.
- **Application database path:** Confirmed. Prisma Client is used by `src/db.ts`.
- **Reachability of vulnerable `deepmerge-ts` code from an internet request:** Not demonstrated by source review.
- **Build/config reachability:** Plausible through Prisma CLI/config operations such as schema generation; must be verified with package execution tracing. A repository-controlled Prisma config is not equivalent to arbitrary request input.
- **Deployed bundle inclusion:** Unknown. The omit-dev audit is not a deployment bundle inspection.
- **Exploitability in Cedars:** Unknown. The advisory concerns stack exhaustion when merging recursive object graphs; a trigger path and attacker control are not established here.
- **Data exposure / integrity impact:** No evidence of either was established; Security must assess based on reachable code and data flow.
- **Availability impact:** Potential stack exhaustion if the vulnerable function is reachable with attacker-controlled recursive data; Cedars request-path reachability remains unproven.

## Required follow-up

1. Inspect Vercel build output or deployment trace for the proposed Preview build without promoting or deploying to production. If the only available path would create a Preview deployment, confirm it is an approved Preview target first.
2. Trace Prisma CLI/config execution and determine whether user-controlled request data can reach `deepmerge-ts`.
3. Record the source paths, bundle evidence, and exploitability decision in the per-finding register.
4. Security must choose and approve a formal disposition for SEC-002 through SEC-004. Do not infer acceptance from absence of a direct source import.

## Scope limits

This was a read-only source and lockfile assessment. No production secrets, database, deployment bundle, or production configuration was accessed. No migration or Prisma 7 package change was performed. This report does not authorize a production change or close the M0 gate.
