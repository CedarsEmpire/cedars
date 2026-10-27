# CEDARS OS Prototype + API Starter

A responsive command-center prototype and a Vercel-compatible TypeScript API starter based on the CEDARS Humanity Grid platform vision.

## Run

Open `index.html` in a browser. No build step or dependencies are required.

## Console prototype

- Overview, grid management, AI-worker controls, wallet, ledger, analytics, reserve stress test, Robot Support, governance, and audit-trail views.
- The demo role selector illustrates Founder, Super Admin, Investor, Partner, and AI Worker access differences; it is not authentication or server-side authorization.
- Module switches, worker actions, support tickets, and audit events update local page state only.
- The reserve tool performs simplified scenario arithmetic; it is not a forecast or investment recommendation.
- Support file selection displays metadata only. Files are not opened or uploaded, and sensitive files should not be selected.
- All metrics and records are illustrative; no production services, wallets, payment rails, or AI workers are connected.
- Financial-module reactivation is blocked because no second approver exists in the prototype. Draft financial terms are labeled unvalidated and inactive. Unverified planning addresses are omitted.
- The browser console remains a simulation; it is not connected to the API.

## API starter

The API uses Vercel serverless functions, PostgreSQL, Prisma, and JWT verification against an external identity provider's JWKS endpoint.

- `GET /api/health` is a public process health check.
- `GET /api/modules` requires a verified bearer token and lists feature flags.
- `PUT /api/admin/modules/:module` requires a verified Founder or Super Admin token and a reason in the request body.
- Supported module identifiers are allowlisted in `src/features/modules.ts`.
- Each successful flag update and its audit event are committed in one database transaction.
- Enabling Money, Wallet, or Ledger is rejected until a dual-approval workflow is implemented.
- The API does not include wallet balances, deposits, contracts, returns, earnings, withdrawals, AML decisions, or sensitive document processing.

### Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_JWKS_URL`, `AUTH_ISSUER`, and `AUTH_AUDIENCE` for your own PostgreSQL database and identity provider.
2. Run `npx prisma migrate deploy` to apply the checked-in migration.
3. Run `npm run db:seed` to insert disabled feature flags. Seeding does not enable financial modules.
4. Run `npm run dev` for the Vercel local development server.
5. Run `npm run build` and `npm test` to validate the API.

Do not use the example environment values as credentials. The API has not been security-reviewed or connected to an identity provider/database in this workspace; configure and review those services before exposing protected endpoints.
