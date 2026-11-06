# Command Centre Foundation — Preview

**Status:** Preview implementation foundation; not production accepted.

## Scope delivered

- Replaces the root route's legacy Robot Grid OS-branded prototype interface with the CEDARS OS Command Centre foundation.
- Preserves the previous root prototype at `/legacy-prototype.html` for reference.
- Presents the canonical four economic layers and all 53 Grid catalogue entries from `CEDARS_HYBRID_ENTERPRISE_PLATFORM_ARCHITECTURE.md`.
- Separates catalogue presence from effective state, runtime health and LIVE acceptance.
- Adds read-only GET checks for `/api/health` and `/api/ready`, showing observed HTTP status and response detail without manufacturing readiness.
- Presents worker runtime as NOT CONNECTED and the current governance posture as Production FROZEN, Financial execution OFF and Public launch OFF.

## Explicit non-goals

This change does not implement or claim persistent Grid/module controls, backend approval workflows, audit persistence, connected AI worker execution, provider integrations, authentication, database migrations, financial execution, fiat transaction processing, production deployment or public launch.

No POST, PUT, PATCH or DELETE requests are issued by the Command Centre UI. No production aliases, environment variables, database settings or traffic routing are changed.

## Architecture rules retained

- Four canonical layers contain 19 Cloud, 4 Underground, 11 Earth and 19 Human Activities Grid entries.
- Every Grid belongs to one parent layer; effective enablement requires both parent and Grid desired state ON.
- No Grid or capability may be marked LIVE by assertion.
- NO FIAT TRANSACTIONS is a non-negotiable platform boundary.
- Token issuance/transfers, wallet custody, signing/broadcasting and all financial execution remain OFF.

## Verification required

- Vercel Preview deployment must build successfully from this branch/PR.
- Verify root route serves the new Command Centre rather than the legacy prototype.
- Verify `/legacy-prototype.html` remains accessible as a preserved reference.
- Verify browser rendering and responsive navigation.
- Verify read-only health checks against the deployed Preview.
- Database readiness and authenticated APIs remain separately gated; a healthy process response is not production acceptance.
