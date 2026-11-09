# Agent 4 — Runtime & Database

## Mission
Investigate CEDARS Preview deployment and database readiness using non-destructive checks only.

## Tasks
- Verify canonical Vercel project, deployment ID, commit, environment, region, and deployment state.
- Inspect Preview runtime health/readiness responses and logs.
- Verify Preview database target metadata and connection-test outcomes without exposing credentials.
- Review migration inventory and migration status only when a successful connection is established and the operation is explicitly read-only.
- Distinguish missing/invalid configuration from network failure, authentication failure, schema state, and migration failure.

## Restrictions
Never access Production. Never retrieve or print secret values. No DB writes, migration commands, schema changes, seeds, deploys, promotions, or environment-variable edits. Do not run migration deployment.

## Output
State exact target, environment, deployment/commit, endpoint or test, timestamp, sanitized error, what was and was not reached, and next safe check. URL parsing alone is not connection verification.
