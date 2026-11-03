# Production Deployment Checklist

This checklist captures the operating boundary of the current CEDARS OS prototype: it is a governance-safe control plane, not a connected runtime or live financial system.

## 1. Safety gate

- Confirm this release is still a prototype control plane.
- Verify that no live grid runtime, worker execution, wallet signing, payout provider, or crediting service is being enabled.
- Keep all financial modules disabled unless there is a separate approval process and a reviewed implementation.
- Treat all treasury, wallet, and revenue data as unverified until the relevant provider and custody checks are complete.

## 2. Environment configuration

The API requires these six settings in Preview and Production:

| Variable | Preview value/source | Validation |
| --- | --- | --- |
| `DATABASE_URL` | Connection string for the isolated Preview PostgreSQL database | PostgreSQL URL with a database, password, and `sslmode=require`, `verify-ca`, or `verify-full` |
| `AUTH_JWKS_URL` | Signing-key URL for the Preview identity tenant | HTTPS URL |
| `AUTH_ISSUER` | Exact issuer URL for the Preview identity tenant, including its trailing slash | HTTPS URL |
| `AUTH_AUDIENCE` | Identifier of the API configured in the Preview identity tenant | Non-empty; must match the API access token audience |
| `AUTH_CLIENT_ID` | Preview browser application's client ID | Non-empty; must match the Preview application |
| `AUTH_ROLE_CLAIM` | Namespaced claim URL written by the Preview Post-Login Action | HTTPS URL with a path, no query or fragment |

Read-only treasury observation is optional and is not required by `preview:check`: `CEDARS_TRON_RPC_URL`, `CEDARS_TRON_TREASURY_ADDRESS`, `CEDARS_TRON_START_BLOCK`, `CEDARS_BNB_RPC_URL`, `CEDARS_BNB_TREASURY_ADDRESS`, and `CEDARS_BNB_START_BLOCK`. Confirmation-depth overrides `CEDARS_TRON_CONFIRMATIONS` and `CEDARS_BNB_CONFIRMATIONS` are optional. Leave these unset for ordinary Preview testing; configuring them can query mainnet endpoints, even though the feature does not sign or send transactions.

Use HTTPS endpoints, never commit secrets, and keep Preview identity, database, and credentials separate from Production. The role claim must come from trusted identity-provider configuration, not user-editable metadata.

## 3. Auth0 / identity setup

1. Create an API with identifier `cedars-os-api`.
2. Create the browser client used by the app and set `AUTH_AUDIENCE` to the API identifier.
3. Set `AUTH_CLIENT_ID` to the application client ID.
4. Set `AUTH_ISSUER` to the tenant issuer URL with trailing slash.
5. Set `AUTH_JWKS_URL` to the tenant signing-key endpoint.
6. Configure the Auth0 Post-Login Action secret `CEDARS_ROLE_CLAIM` to exactly match `AUTH_ROLE_CLAIM`, and populate it from trusted `app_metadata`.
7. Ensure the app's callback and logout URLs are allowed in the Auth0 client configuration.
8. Keep the app configured for Authorization Code + PKCE S256.

## 4. Database and migration preflight

Before exposing protected routes:

- Provision an isolated PostgreSQL database for the target environment.
- Run Prisma migrations in the reviewed environment:
  - `npx prisma migrate deploy`
- Seed the default configuration state:
  - `npm run db:seed`
- Confirm the database contains the expected role, module, grid, and treasury schema.
- Verify the migration state before deployment. Do not run migrations against a shared or production database during preview validation.

## 5. Vercel Preview readiness

Use Preview as the next safe integration stage; it is not permission to connect live financial or physical systems.

1. In Vercel, add the six required settings from section 2 to the **Preview** environment only. Do not select Production or Development for these Preview values.
  For simulated worker/grid state transitions, optionally set `CEDARS_RUNTIME_MODE=simulator` in Preview only. The simulator derives status from desired configuration; it does not dispatch jobs or control external systems. Production always ignores simulator mode.
2. Provision a dedicated Preview PostgreSQL database with TLS required. Confirm its host, database name, and credentials are not shared with Production.
3. Create a separate Preview Auth0 API and browser application. Configure the Preview callback, logout, and web-origin URLs for the exact deployed Preview origin. Configure the Auth0 Post-Login Action and `AUTH_ROLE_CLAIM` consistently; newly registered users must remain `USER` unless a trusted administrator explicitly assigns a role.
4. Confirm the Vercel Preview deployment receives the intended settings. Do not paste environment values, access tokens, or database URLs into logs, source control, or chat.
5. Before deployment, run `npm test`, `npm run build`, and `npm run runtime:check` locally. For the environment-shape check, run `VERCEL_ENV=preview npm run preview:check` in a process where the six Preview settings are already available. This check validates variable shape and TLS/HTTPS requirements only; it makes no network connections and does not verify tenant/database isolation or reachability.
6. Deploy a Vercel Preview and exercise the manual checks in section 7 using only Preview accounts and data. Keep treasury observation settings unset unless its read-only mainnet behavior is intentionally being tested and approved.
7. Review Preview function logs and database state. Do not run migrations against Production as part of this Preview exercise.

For Production, use a separately reviewed change: confirm the correct tenant, database, role-claim mapping, least-privilege configuration, and operator/security/governance sign-off. Preview success alone is not production approval.

For production:

- Confirm environment values were reviewed by the responsible operators.
- Confirm the deployment is using the correct tenant, database, and claim mapping.
- Keep the app in a least-privilege configuration.
- Verify the deployment is not exposing financial or signing flows.

## 6. Runtime validation commands

Run these before a Preview release and again before any Production release:

- `npm test`
- `npm run build`
- `npm run runtime:check`
- `npm run smoke` for local route validation
- `VERCEL_ENV=preview npm run preview:check` with the six Preview settings available in the process environment

These checks validate code health, route behavior, role enforcement, audit logic, and financial activation blocking. They do not prove the app is production-safe by themselves.

## 7. Manual verification after deployment

After deploying to Preview, verify:

- `/api/health` returns healthy status
- `/api/ready` reports expected environment readiness
- authenticated requests require a valid bearer token
- unauthorized roles are denied
- module updates require a valid reason and authorized role
- financial activation remains blocked
- audit records are visible only to authorized governance roles
- treasury observation remains read-only and bounded

Use a Preview access token and Preview database only. Verify both an authorized role and a least-privileged `USER`; never use a real user's production token for this test. The readiness endpoint reports control-plane configuration/connectivity, not security approval or actual runtime integration for grids, workers, payments, or AI. A 200 response does not mean live operations are ready: `liveOperationsReady` remains `false`, worker/grid runtimes are disconnected, and financial execution is disabled until those integrations are implemented and independently validated.

## 8. Thirty-day restricted real-money pilot gate

The required pilot objective is to verify real customer-paid Worker/Grid work by the end of Day 3. This repository is not currently capable of that: it records manual Grid Task work orders but does not execute Workers, collect customer payments, reconcile receipts, credit balances, or settle or pay out funds. Treasury is read-only. Accepted tasks are not verified revenue. The pilot is therefore BLOCKED; do not start the 30-day clock, enable productive treasury, or represent the current system as earning money until the following capabilities and approvals are complete.

1. Use Preview first for dashboard, identity, authorization, and non-financial workflow validation. Preview, simulator, and testnet results do not count as real customer revenue.
2. Implement and independently review one bounded end-to-end paid-work flow: real buyer and written scope, verified Worker/Grid delivery, actual customer payment, provider/bank reconciliation, and documented handling of fees, refunds, disputes, and worker costs. Do not treat deposits, investments, or internal transfers as revenue. Add explicit transaction and aggregate exposure limits, idempotency, dual approval, complete audit trails, failure recovery, and a tested emergency stop. Define any custody/signing design separately; never expose private keys in browser code or ordinary application configuration.
3. Enforce internal-only access at the identity or deployment boundary with a named tester allowlist. Verify that unauthenticated and non-allowlisted people cannot reach the application or its APIs. Role-based authorization alone is not proof that the Production deployment is private.
4. Enable Grid Task APIs only in the restricted pilot environment by setting `CEDARS_GRID_TASKS_ENABLED=true`, setting `CEDARS_GRID_TASK_TESTER_SUBJECTS` to the exact comma-separated identity subjects approved for the pilot, and turning the audited `grid_tasks` module flag ON. All three gates are required. Leave the environment switch disabled and module flag OFF elsewhere; keep the deployment/identity allowlist as an independent access boundary.
5. Isolate Production identity, database, treasury addresses, and credentials from Preview and other environments. Obtain written finance, security, and custody-owner approval for the chains, assets, transaction limits, test accounts, and operational stop conditions. Verify wallet ownership and recipient addresses independently.
6. Before starting the clock, test the approved real-money flow end to end using the bounded scope, including duplicate/replayed requests, independent reconciliation, audit access, backup/restore, pause procedure, and recovery evidence. Record the pilot's exact start timestamp only after all entry criteria and owner approvals pass; require the first reconciled customer-paid delivery by the end of Day 3.
7. Record pilot start/end timestamps, named testers, approved limits, expected availability and sync lag, transaction references, daily reconciliation, incidents, outages, and remediation evidence. Run for 30 complete calendar days. Pause the pilot for any unexplained balance discrepancy, unauthorized action, missed control, or unresolved transaction; restart the 30-day window after resolution and reapproval.
8. At the end, require finance/custody, security, and governance sign-off against pass/fail thresholds agreed before day one. Keep public access disabled until the evidence is reviewed and a separate public-launch approval is recorded.

The existing `prod:check` validates environment configuration, identity-provider metadata, database connectivity, and migration status; it does not validate financial execution, internal-only access, or pilot safety. It is necessary but not sufficient for this pilot.

## 9. Launch conditions

Do not treat this as production-ready if any of the following are true:

- a real wallet or payout provider is connected
- financial modules are enabled without dual approval
- real user balances or transfers can be credited or withdrawn
- worker execution or external job dispatch is active
- treasury ownership or custody is not independently verified
- the app is running with a shared database or reused preview credentials

## 10. Final sign-off

Production release should require explicit sign-off from the responsible operators, security reviewers, and finance/governance owners. The current prototype is a control-plane and governance starter, not a live operating system for money movement or autonomous execution.
