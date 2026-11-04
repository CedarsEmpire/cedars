# CEDARS OS Sprint 1 — Dependency Risk Register

**Assessment date:** 2026-11-04  
**Repository baseline:** `main` at `4e3987d0c90b46c2612fa9c600da19c6f868dd3e`  
**Audit commit:** `fix/ci-auth-tests` at `a753d208f9006790f04dc4983eef3d36d685e9c7`  
**Environment:** Node.js 22.23.4, npm 10.9.9; clean `npm ci`  
**Evidence:** `npm audit --json` and `npm audit --omit=dev --json` run in an isolated validation sandbox. Raw JSON was generated as `npm-audit-report.json` and `npm-audit-production.json` in that sandbox.

## Executive result

| Scope | Critical | High | Moderate | Low | Total |
|---|---:|---:|---:|---:|---:|
| Full lockfile | 1 | 29 | 12 | 0 | 42 |
| `npm audit --omit=dev` | 0 | 3 | 0 | 0 | 3 |

The full audit contains 42 affected-package vulnerability records (44 advisory objects). Three package records are direct dependencies; the remaining 39 are transitive. The three direct findings are `@vercel/node`, `prisma`, and `vercel`; all three are declared in `devDependencies`, not `dependencies`.

The critical `tar` finding is transitive at `node_modules/@vercel/container/node_modules/tar`, version 7.5.11. `npm explain tar` traces it through `@mapbox/node-pre-gyp` → `@vercel/nft` → Vercel build/CLI packages. The lockfile marks this nested package as dev-only, and it does not appear in the omit-dev audit. The critical advisory is [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw); the audit also reports related tar advisories, including [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m). This is a confirmed build-toolchain dependency risk, not evidence of an exploitable production endpoint.

The three omit-dev findings are `prisma`, `@prisma/config`, and `deepmerge-ts`. `npm explain prisma` shows the Prisma CLI is a root dev dependency and an optional peer of the production `@prisma/client`; the lockfile marks the Prisma CLI/config entries `devOptional`. They are therefore present in npm's omit-dev audit result through the optional-peer relationship, but their inclusion in deployed runtime bundles is **not established**. Treat them as a production-adjacent build/runtime boundary requiring bundle inspection, not as proven runtime exposure.

The direct production dependencies are `@prisma/client`, `jose`, and `zod`. No direct production dependency is itself listed as a direct vulnerable package in this audit. This does not establish that the deployed bundle is free of vulnerable transitive code.

## Package-level risk register

“Not in omit-dev” means the package did not appear in the `npm audit --omit=dev` report for this lockfile. It is not a blanket assertion that the package is harmless. “Fix available” is npm's advisory-resolution metadata; it is not authorization to apply the proposed update.

| Package | Severity | Directness | Omit-dev result / production assessment | Fix metadata | Planned action |
|---|---|---|---|---|---|
| `@fastify/busboy` | High | Transitive | Not in omit-dev; Vercel adapter toolchain path | Major `@vercel/node@4.0.0` | Validate compatible patched adapter/Busboy path |
| `@prisma/config` | High | Transitive | Present in omit-dev; devOptional Prisma peer path | Major `prisma@7.10.1` | Assess Prisma 7 migration and client/CLI alignment |
| `@ts-morph/common` | Moderate | Transitive | Not in omit-dev; build toolchain | Major `@vercel/node@4.0.0` | Update through controlled Vercel toolchain remediation |
| `@vercel/backends` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/blob` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/cervel` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/cli-auth` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/cli-config` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/cli-support` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/container` | Moderate | Transitive | Not in omit-dev; build toolchain | Available | Update Vercel build dependency closure |
| `@vercel/elysia` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/express` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/fastify` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/h3` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/hono` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/hydrogen` | Moderate | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/koa` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/nestjs` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/next` | Moderate | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/nft` | Moderate | Transitive | Not in omit-dev; Vercel build toolchain | Major `@vercel/node@4.0.0` | Validate compatible patched adapter/toolchain |
| `@vercel/node` | High | Direct devDependency | Not in omit-dev; build/runtime adapter boundary | Major `@vercel/node@4.0.0` | Review major-version migration and Vercel compatibility |
| `@vercel/oidc` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/python` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/python-analysis` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/redwood` | Moderate | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/remix-builder` | High | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/rust` | Moderate | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/static-build` | Moderate | Transitive | Not in omit-dev; Vercel CLI dependency tree | Available | Resolve through compatible Vercel CLI update |
| `@vercel/static-config` | Moderate | Transitive | Not in omit-dev; Vercel CLI dependency tree | Major `@vercel/node@4.0.0` | Validate compatible patched adapter/toolchain |
| `ajv` | Moderate | Transitive | Not in omit-dev; build/tooling dependency | Major `@vercel/node@4.0.0` | Resolve via compatible parent dependency update |
| `deepmerge-ts` | High | Transitive | Present in omit-dev; Prisma devOptional peer path | Major `prisma@7.10.1` | Upgrade only with Prisma 7 compatibility testing |
| `glob` | Moderate | Transitive | Not in omit-dev; build toolchain | Major `@vercel/node@4.0.0` | Resolve via compatible parent dependency update |
| `js-yaml` | High | Transitive | Not in omit-dev; build/tooling dependency | Available | Resolve via compatible parent dependency update |
| `minimatch` | High | Transitive | Not in omit-dev; build/tooling dependency | Major `@vercel/node@4.0.0` | Resolve via compatible parent dependency update |
| `path-to-regexp` | High | Transitive | Not in omit-dev; Vercel adapter toolchain | Major `@vercel/node@4.0.0` | Validate patched parent adapter and route compatibility |
| `prisma` | High | Direct devDependency / optional peer | Present in omit-dev via optional peer of `@prisma/client`; runtime bundle inclusion unproven | Major `prisma@7.10.1` | Plan Prisma 7 migration; verify generated client and deployed bundle |
| `smol-toml` | High | Transitive | Not in omit-dev; Vercel tooling | Available | Resolve via compatible parent dependency update |
| `tar` | Critical | Transitive | Not in omit-dev; dev-only nested Vercel build-toolchain package | Available | Priority remediation; move nested version beyond all affected ranges, verify lockfile and CI |
| `ts-morph` | Moderate | Transitive | Not in omit-dev; build tooling | Major `@vercel/node@4.0.0` | Resolve via compatible parent dependency update |
| `undici` | High | Transitive | Not in omit-dev; Vercel tooling | Major `@vercel/node@4.0.0` | Review patched version and Node/Vercel compatibility |
| `vercel` | High | Direct devDependency | Not in omit-dev; deployment/build CLI | Available | Upgrade CLI in isolated branch and verify deploy config/build |
| `zod` | High | Transitive vulnerable instance | Not in omit-dev; root production range is `^4.6.7`, audit finding is from transitive vulnerable instance(s) | Available | Identify affected nested paths and deduplicate/patch without downgrading root |

## Immediate remediation order

1. **Critical — `tar`:** update the Vercel build-toolchain dependency closure so every installed `tar` instance is outside all affected ranges. The nested instance found is 7.5.11; one advisory affects through 7.5.18 and another through 7.5.20. Verify the resulting lockfile, `npm audit`, tests, typecheck, and build.
2. **High — Prisma peer/build chain:** assess Prisma 7.10.1 as npm's suggested major fix for `prisma`, `@prisma/config`, and `deepmerge-ts`. Do not upgrade Prisma CLI and client independently; keep versions compatible and validate schema generation, migrations, and build.
3. **High — Vercel toolchain:** assess the `@vercel/node` major remediation and update the Vercel CLI/toolchain in a separate security PR. Confirm Hobby function limits and deployed bundle behavior before any production promotion.
4. **Remaining transitive findings:** apply compatible parent updates in small batches; inspect lockfile diffs and `npm explain <package>` output. Do not use `npm audit fix --force` as a blanket remediation.

## Evidence limits and release decision

- The audit classifies dependency-tree presence and known advisory ranges. It does **not** prove exploitability, attacker reachability, or production code-path exposure.
- The `npm audit --omit=dev` result is a dependency-tree filter, not a Vercel bundle inspection. The Prisma optional-peer results require further bundle analysis.
- The current npm audit report is not a security clearance. All 42 package records remain open pending patching or documented risk acceptance.
- No dependency changes were made during this assessment.
- **Release gate remains OPEN.** Do not merge security upgrades or promote a deployment until the changes are reviewed and all required validation passes.
