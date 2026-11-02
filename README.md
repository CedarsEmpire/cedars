# CEDARS OS Prototype + API Starter

A responsive command-center prototype and a Vercel-compatible TypeScript API starter based on the CEDARS Humanity Grid platform vision.

## Run

Open `index.html` in a browser. No build step or dependencies are required.

For the production and preview release checklist, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Console prototype

- Overview, grid management, AI-worker controls, wallet, ledger, analytics, reserve stress test, Robot Support, governance, and audit-trail views.
- Grid Management includes a five-layer atlas for connectivity, essential resources, materials and production, people and digital services, and planetary research. Its local terminal switches show Standby, Working, or Maintenance without controlling infrastructure; authenticated API feature flags remain separate. The smallest accountable unit is a **Grid Node**: a location, asset, sensor, or scoped task with an owner, inputs/outputs, status, and safety boundary.
- The atlas maps Bluetooth, satellite/backhaul, CEDARS internet-access concept, power, manufacturing, sound, water, air, rain, soil/biological cycles, gold, mercury hazard control, diamonds, oil and gas transition, cryptocurrency, computers, periodic-table materials, Moon Green, and Jupiter science, plus shared safety, identity, governance, logistics, food, health, education, and research grids. It is a concept map, not a deployed service or external benchmark.
- Live Studio concept for Founder broadcasts, investor training, and investor-led cohort sessions, with local agenda-template and moderated Q&A demos plus a transparent $3/month development contribution proposal.
- Communication Grid concept with synthetic funded-account enrollment, shared-room messages, privacy-minimal member tiles, member reporting, and Founder-only local moderation controls.
- Correction Grid AI concept with illustrative international country labels and a restricted, human-reviewed account-name correction queue using fictional records only.
- Opportunity Grid guided pilot planner mapping household affordability, food access, climate resilience, animal welfare, repair/reuse, or livelihoods needs to potential buyers, paid deliverables, validation steps, costs, outcomes, and safeguards. It is a fixed browser-side template, not connected AI; it does not save or transmit entries, set prices, forecast returns, or guarantee income or impact.
- Beyond AI horizon view summarizing the attached Civilization OS vision: five domains, the operating core, three economic layers, grid categories, value-flow graph, agent-governance ladder, and sustainable learning loop, plus proposed human-centered innovations.
- The demo role selector illustrates Founder, Super Admin, Investor, Partner, and AI Worker access differences; it is not authentication or server-side authorization.
- Grid, module, and worker controls use binary ON/OFF terminal switches. Authenticated grid/module/worker settings represent audited desired state only; no physical grid or worker runtime is connected.
- The reserve tool performs simplified scenario arithmetic; it is not a forecast or investment recommendation.
- Support file selection displays metadata only. Files are not opened or uploaded, and sensitive files should not be selected.
- All metrics and records are illustrative; no production AI model, worker runtime, job queue, wallets, or payment rails are connected.
- Financial-module reactivation is blocked because no second approver exists in the prototype. Draft financial terms are labeled unvalidated and inactive. Unverified planning addresses are omitted.
- The browser console remains a simulation; it is not connected to the API.
- Live Studio sessions, attendance, agenda drafts, and Q&A are local-only mock state. Agenda drafts use a fixed template, not an AI model. No video/audio, recording, invitations, or payments are connected; the proposed $3 contribution is not charged.
- Communication Grid funding states, automatic enrollment, roster, group messages, reports, post moderation, pause/remove/manual-restore controls, and Live Studio eligibility are synthetic browser-only state. There are no direct messages or contact/profile views. No funds are checked or moved, and no KYC photos or documents are collected, stored, or displayed. UI-only role checks do not provide authorization for a real community service.
- Correction Grid AI uses fixed fictional name suggestions and synthetic country codes/flags. It does not inspect KYC, documents, or photos, and never automatically changes a real account name or determines identity eligibility. Country labels are illustrative, not verified nationality or residence. Human approval/rejection actions only modify local sample records.
- Beyond AI is a strategy visualization, not an operating service or forecast. Its economic tiers, value-flow graph, and agent hierarchy summarize the attached vision. Personal Knowledge Vault, Proof of Contribution, Skill-to-Opportunity Exchange, Community Resilience, Work Provenance, Interoperable AI, Regenerative Resource Ledger, and Offline-first Nodes are additional proposals only. No revenue, investment, crypto settlement, asset custody, or autonomous agent execution is implemented.
- Opportunity Grid maps are starting hypotheses only. Validate community need, consent, a real buyer and budget, fair written terms, delivery costs, and measurable outcomes before treating an idea as a business opportunity. Grants and donations are not earned customer revenue; no payment collection, investment offering, household-income promise, animal-care decision, or climate-benefit claim is implemented.

## API starter

The API uses Vercel serverless functions, PostgreSQL, Prisma, and JWT verification against an external identity provider's JWKS endpoint. For hosted authentication, Auth0 is the recommended option. The API reads roles from the claim named by `AUTH_ROLE_CLAIM`; configure an Auth0 Post-Login Action to set that namespaced claim from trusted `app_metadata`, not user-editable metadata.

- `GET /api/health` is a public process health check.
- `GET /api/ready` reports database and identity-provider configuration readiness.
- `GET /api/auth/config` returns validated OIDC authorization/token endpoints and an optional logout endpoint. Browser registration uses the provider's signup hint; newly registered Auth0 accounts receive the least-privileged `USER` role unless trusted `app_metadata` assigns another allowed role.
- `GET /api/modules` requires a verified bearer token and lists feature flags.
- `GET /api/operations/summary` requires a verified bearer token and returns aggregate module status.
- `GET /api/workers` requires a verified bearer token and returns persisted desired worker configuration plus an explicit `NOT_CONNECTED` runtime status.
- `GET /api/grids` requires a verified bearer token and returns all grid layers, dependency edges, persisted desired state, and explicit `NOT_CONNECTED` / `NOT_CONFIGURED` runtime status.
- `GET /api/admin/treasury` requires Founder, Super Admin, Finance Admin, or Compliance Officer and returns configured chain monitor status, sync cursors, and the latest 100 observed transfers. `POST /api/admin/treasury` requires Founder or Super Admin and manually scans at most five confirmed blocks per chain.
- `PUT /api/admin/workers/:worker` requires a verified Founder or Super Admin token and an audited reason; it changes desired enabled state and capacity only, not runtime processes.
- `PUT /api/admin/grids/:grid` requires a verified Founder or Super Admin token and an audited reason; it changes persisted desired state only and does not send commands to infrastructure.
- `PUT /api/admin/modules/:module` requires a verified Founder or Super Admin token and a reason in the request body.
- Supported module identifiers are allowlisted in `src/features/modules.ts`.
- Each successful flag update and its audit event are committed in one database transaction.
- Enabling Money, Wallet, or Ledger is rejected until a dual-approval workflow is implemented.
- Worker configuration is stored and audit logged, but no model provider, task queue, execution runtime, or customer-work dispatch is connected yet.
- Grid desired states and their updates are persisted and audited, but no utility, satellite, internet, industrial, environmental, or finance provider adapter is configured. Apply the new checked-in migration and seed the registry before using the authenticated grid control plane.
- The API does not include user wallet balances, deposits, payment intake, returns, earnings, withdrawals, AML decisions, or sensitive document processing.
- The intended treasury model is one destination, not two. Membership payments (a membership eligibility condition, not grid operating revenue) and settled grid revenue can share that destination while remaining separate accounting categories. Optional chain observation is read-only and records native TRX/BNB transfers touching the configured treasury addresses; address ownership remains unverified. It uses no wallet keys, does not sign or send transactions, and never credits a member balance. Configure `CEDARS_TRON_RPC_URL`, `CEDARS_TRON_TREASURY_ADDRESS`, `CEDARS_TRON_START_BLOCK`, and the corresponding `CEDARS_BNB_*` values to enable it. Use a TRON mainnet full-node endpoint; the BNB RPC is checked for mainnet chain ID 56. TRON confirmation depth defaults to 20 blocks and BNB to 12; optional `CEDARS_TRON_CONFIRMATIONS` / `CEDARS_BNB_CONFIRMATIONS` values can override these. `POST /api/admin/treasury` (Founder/Super Admin only) manually scans at most five blocks per configured chain; `GET /api/admin/treasury` exposes observation status and the latest 100 records to Founder, Super Admin, Finance Admin, and Compliance Officer roles. Apply the treasury migration before use. The tracker covers successful TRON native `TransferContract`s and successful top-level BNB native transfers only: tokens and contract-internal transfers are excluded. Confirmation depth is not a guarantee of irreversibility, and fork/reorganization reconciliation is not implemented, so this is not an authoritative accounting ledger. Deposits and withdrawal terminals remain locked OFF. The referral terminal is a proposed, non-payable 10% calculator on an entered $1–$50,000 ownership amount; it does not track referrals or trigger payouts. Boosting is not operating revenue. Browser-only 1%-daily and 50%-per-30-day projections plus the one-time 5% treasury-allocation estimate do not read chain data or create payable balances. Hosted logout uses the OIDC end-session endpoint when advertised; otherwise the app only clears its local session.

### Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_JWKS_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_CLIENT_ID`, and `AUTH_ROLE_CLAIM` for your own PostgreSQL database and identity provider. `AUTH_ROLE_CLAIM` must exactly match the claim your identity provider places in the access token.
2. Run `npx prisma migrate deploy` to apply the checked-in migrations, including the read-only treasury observation ledger.
3. Run `npm run db:seed` to insert disabled feature flags, worker configurations, and grid configurations. Seeding does not enable financial modules or start workers.
4. Run `npm run dev:local` for the local prototype runtime. The loopback-only server provides a local Founder sign-in, JWT/JWKS verification, and the same API routes without requiring Vercel login.
5. To enable treasury observation, configure the chain RPC URLs, the previously supplied treasury addresses, and a start block in local/deployment environment variables. Use HTTPS RPC endpoints; do not put provider credentials in source control. The sync endpoint is manual and bounded; no scheduler is configured. Run `npm run smoke` to validate local sign-in and the module, worker, grid, operations, audit, read-only treasury, and financial-activation API routes. Run `npm run runtime:check` to exercise JWT/JWKS verification, unauthenticated and invalid-role denials, role-scoped writes, invalid input rejection, financial activation blocking, audit recording, and restricted treasury observation access against an isolated in-memory database; this check does not connect to or modify the database configured in `.env`. Also run `npm run build` and `npm test` to validate the codebase.

Do not use the example environment values as credentials. The API has not been security-reviewed or connected to an identity provider/database in this workspace; configure and review those services before exposing protected endpoints.

### Preview deployment checklist

Use a Vercel Preview deployment for review before considering any production release. Preview must use a separate Auth0 application/API configuration and an isolated PostgreSQL database; never reuse production secrets or databases. Keep financial feature flags disabled.

1. Configure the six API settings in Vercel's **Preview** environment only. Use HTTPS endpoints, a PostgreSQL URL with TLS required, and a namespaced `AUTH_ROLE_CLAIM`. Use short-lived, least-privilege preview credentials.
2. Verify the Preview environment contains only the intended settings and that its database and identity-provider tenant are isolated from production. Vercel environment values are not visible in this repository.
3. Run `npm run preview:check` with `VERCEL_ENV=preview` and the Preview settings available in the process environment. This validates required values and URL/TLS shape only; it does not contact the identity provider or database.
4. Run `npm test`, `npm run build`, and the local `npm run runtime:check` before deploying. After deployment, manually verify health, readiness, sign-in, authorization denials, audit visibility, and that financial-module activation remains blocked.
5. Review the resulting deployment, function logs, security headers, and database isolation with the responsible operators. Do not run migrations against a shared or production database as part of preview validation.

Preview validation is not a security review, production readiness approval, or a guarantee of long-term availability. Production deployment, live financial activity, and autonomous recovery remain outside this prototype's scope.

### Auth0 production setup

1. In Auth0, create an API with the identifier `cedars-os-api`, then create a Regular Web Application or SPA client appropriate to the browser application. Set `AUTH_AUDIENCE` to the API identifier and `AUTH_CLIENT_ID` to the application's client ID.
2. Set `AUTH_ISSUER` to the tenant issuer URL (including its trailing slash), and `AUTH_JWKS_URL` to the tenant's signing-key endpoint, usually `https://YOUR_TENANT/.well-known/jwks.json`.
3. Set `AUTH_ROLE_CLAIM` to a unique HTTPS namespaced claim URL for the tenant. In the corresponding Auth0 tenant, configure the Post-Login Action secret `CEDARS_ROLE_CLAIM` to exactly the same URL; do not reuse the development tenant's claim URL in Production.
4. In Auth0, allow the exact app URL plus `/` as an Allowed Callback URL and Allowed Logout URL, and the app origin as an Allowed Web Origin. Create a **Post-Login Action** in **Actions → Library**, paste the contents of `auth0/post-login-action.js`, configure its `CEDARS_ROLE_CLAIM` secret, then add it to the Login flow. Assign a user's role as `cedars_role` in that user's trusted `app_metadata`; new registrations default to `USER`. Never use user-editable metadata or assign privileged roles outside trusted administrative processes.

The visible Register control requests Auth0's `screen_hint=signup`; login uses Authorization Code + PKCE S256. Logout clears the browser session and redirects through the discovered OIDC end-session endpoint when available. It does not revoke already-issued bearer tokens, which remain usable until expiry. Use an API access token (with the configured audience) for protected API requests; do not use an ID token as an API bearer token.

Set production values as Vercel environment variables (Production, and Preview only if needed), then run `npm run prod:check` in an environment configured with those values. This checks required settings, TLS endpoints, OIDC discovery and signing keys, PostgreSQL connectivity, and migration state without printing credentials. It does not modify the production database or exercise authenticated API actions. Run migrations separately with `npx prisma migrate deploy` during a reviewed deployment, and verify protected routes using a short-lived access token without sharing it in chat or source control.
