# CEDARS OS™ AI Advance Team — Isolated Runtime

**Runtime stage:** isolated read-only orchestration foundation.  
**Environment intent:** Preview only.  
**Model-connected autonomous reasoning:** not configured.  
**External connectors:** not configured by default.

This package is separate from the CEDARS API and dashboard. It uses Node.js built-ins only and does not add dependencies to the root application.

## What is implemented

- Six role definitions matching the AI Advance Team charter.
- Bounded objective validation.
- Explicit allowlist of four read-only adapter interfaces:
  - `repository.read`
  - `ci.read`
  - `preview.read`
  - `previewDatabase.readMetadata`
- Per-role tool allowlists.
- Bounded parallel execution (maximum three roles at a time).
- Per-tool timeout and cancellation propagation.
- Secret-like value redaction and bounded observation size.
- Structured run report with role outcomes and governance boundaries.
- Tests for role registration, allowlists, boundary invariants, missing connectors, redaction, and fail-closed reporting.

## Run locally

From this directory:

```sh
npm test
npm run self-check
node src/cli.mjs "Inspect the Preview readiness evidence"
```

The self-check intentionally supplies no external adapters. Specialist roles therefore report **BLOCKED** rather than fabricating evidence.

## Adapter contract

A host may inject only explicitly allowlisted read-only functions. Each receives:

```js
{
  objective,
  environment: "PREVIEW_ONLY",
  access: "READ_ONLY",
  signal
}
```

The runtime does not itself provide GitHub, Vercel, or Supabase credentials or network clients. Connector implementation and connector-level least-privilege scopes must be reviewed separately before any adapter is enabled. Prompt text is not a security boundary.

## Security and governance limits

- No repository writes, commits, PR merges, settings changes, or deployments.
- No database writes, schema changes, migrations, or seeds.
- No Production access.
- No customer contact or external communications.
- No payments, payouts, transfers, token issuance, or fiat transactions.
- Public launch and financial execution remain OFF.
- The runtime cannot mark evidence VERIFIED or ACCEPTED and cannot promote capability status.
- Adapter outputs are untrusted observations; they are not independently verified evidence.
- No model provider, API key, persistent session store, durable queue, or user-facing endpoint is configured.

## Next implementation gates

1. Review and approve connector adapters individually, with read-only credentials and Preview-only scopes.
2. Add independently tested model-backed reasoning through the approved AI Gateway path, after version-matched SDK documentation and model selection are verified.
3. Add durable session/audit persistence with retention and access controls.
4. Add prompt-injection, secret-exfiltration, environment-confusion, tool-abuse, and evidence-fabrication evaluations.
5. Deploy only to the isolated Preview runtime after CI and deployment checks pass.

This package is an executable orchestration foundation, **not yet six autonomous AI agents** and not a production service.
