# CEDARS OS™ — Production Acceptance Protocol Amendment

**Amendment:** Artifact Recoverability & Controlled Reproduction  
**Acceptance command:** `CEDARS_PRODUCTION_ACCEPTANCE_VERIFY`  
**Scope:** Sprint 1  
**Mode:** Read-only verification until separately authorized  
**Default decision:** Fail-closed

## 1. Purpose

Prevent Sprint 1 from waiting indefinitely for historical deployment artifacts while preserving evidence integrity. The process distinguishes (1) what Vercel actually deployed, (2) what can be reproduced from the original source commit, and (3) whether a release meets production acceptance requirements.

A newly generated artifact is never the original historical deployment artifact.

## 2. Independent evidence records

### Record A — Historical deployment evidence

Target:
- Vercel project: `cedars-vkz3`
- Deployment: `dpl_5nAG79uXog242izu5KPVPFLxzcZ6`
- Build: `bld_k8gyxh8n9`
- Source commit: `127ce7e5a04b0687e0551a8ae0058f9431a2c92c`

Seek the original `.vercel/output/config.json`, generated function inventory, relevant `.vc-config.json` files, generated routing configuration, and build metadata correlated to the deployment and commit.

Allowed status values:
- `RECOVERED`
- `PARTIALLY_RECOVERED`
- `UNRECOVERABLE`
- `UNKNOWN`

`UNRECOVERABLE` requires documented recovery attempts and an authoritative retention/access limitation where obtainable. This closes the recovery task only; it does not establish the original artifact contents or historical root cause. Partial recovery must list what is and is not available. `UNKNOWN` remains blocking for progression to reproduction under this protocol.

### Record B — Controlled reproduction evidence

Fixed source:
- Repository: `CedarsEmpire/cedars`
- Commit: `127ce7e5a04b0687e0551a8ae0058f9431a2c92c`

After Record A has a formally established disposition other than `UNKNOWN`, a separately controlled, non-production reproduction may proceed. Preserve:
- Exact repository, commit, lockfile, build environment and tool versions.
- Vercel project/build configuration used for reproduction.
- Generated `.vercel/output/config.json`, full function inventory, relevant `.vc-config.json` files and generated route table.
- Build logs, deployment metadata, runtime endpoint tests, timestamps and evidence archive.

Allowed status values: `NOT_STARTED`, `IN_PROGRESS`, `BUILD_FAILED`, `REPRODUCED`, `REPRODUCTION_VALIDATED`.

These artifacts describe the reproduction only. They cannot prove what the historical deployment contained. Any difference from historical evidence must be recorded, not normalized away.

### Record C — Production release acceptance

Allowed status values: `PASS`, `FAIL`, `BLOCKED`, `UNKNOWN`, `NOT_APPLICABLE`.

Release acceptance is independent and must include:
- Historical evidence disposition and its supporting evidence.
- Reproduction findings when reproduction was required.
- API routing and runtime validation.
- Database readiness and migration verification.
- Auth0 registration, authentication, authorization, session and logout journey.
- Security acceptance.
- Observability, incident response and rollback readiness.
- Recorded executive release authorization.

A Record A or Record B success never automatically passes Record C. Every mandatory release gate must independently pass. `NOT_APPLICABLE` requires documented approval and rationale. `BLOCKED`, `UNKNOWN`, missing evidence, or an unapproved exception prevents release acceptance.

## 3. Sprint 1 progression rule

Sprint 1 may move from historical recovery to controlled reproduction only after:
1. Recovery attempts and results are documented.
2. Target deployment and source commit identities are verified.
3. Record A has a formally recorded disposition other than `UNKNOWN`.
4. Reproduction is isolated from production.
5. No production configuration, deployment or service is changed without separate authorization.

This removes indefinite waiting without weakening the historical evidence standard.

## 4. Evidence classification

Every evidence item must be classified as exactly one of:
- `HISTORICAL_DEPLOYMENT_EVIDENCE`
- `CONTROLLED_REPRODUCTION_EVIDENCE`
- `CURRENT_RUNTIME_EVIDENCE`
- `PRODUCTION_ACCEPTANCE_EVIDENCE`

Do not substitute one class for another. Preserve source, timestamp, deployment/commit correlation, integrity information where available, and known limitations.

## 5. Safety restrictions

This amendment authorizes documentation and read-only verification only. It does not authorize production configuration changes, database provisioning or migrations, secret/environment changes, deployments/promotions, DNS/alias changes, financial execution, public launch, or blanket module activation.

Production remains frozen. Financial execution and public launch remain OFF. Provisioning, deployment, financial execution and public activation each require separate recorded authorization.

## 6. Governing principle

**RECOVER WHAT WAS DEPLOYED. IF RECOVERY IS IMPOSSIBLE, PROVE WHAT CAN BE REPRODUCED. NEVER CONFUSE THE TWO.**

Historical evidence establishes historical facts. Reproduction establishes reproducibility. Release acceptance establishes eligibility for separately authorized activation.

**No status may be changed to LIVE by assertion.**
