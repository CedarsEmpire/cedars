# CEDARS OS™ AI Advance Team — Isolated Runtime

**Runtime stage:** model-backed Eve agent runtime implemented; connector integration and Preview deployment remain gated.  
**Environment intent:** Preview only.  
**Agent roles:** one Commander plus five delegated specialist agents.  
**Model route:** Vercel AI Gateway (openai/gpt-6-luna-fast); provider access must be configured in the isolated runtime project.

This package is isolated from the CEDARS API and dashboard. It has its own dependencies, agent instructions, channel authentication, role limits, and CI workflow. It does not add dependencies to the root application.

## Implemented runtime

- Eve durable agent runtime with a coordinating Commander.
- Five independently prompted specialist subagents: Security & Compliance, Repository & CI, Runtime & Database, Independent QA, and Release Governance.
- Model-backed reasoning through the Vercel AI Gateway.
- Per-session input/output/cost budgets and session timeouts for the Commander and every specialist.
- Built-in agent-copy/tool capability disabled for every role; no custom tools, external connections, schedules, or sandbox extensions are mounted.
- Authenticated HTTP channel using Vercel OIDC and local development authentication.
- Explicit Production boot guard: the runtime refuses to start when VERCEL_ENV=production.
- Isolated Node.js package and dedicated GitHub Actions workflow for tests and Eve compilation.
- Existing deterministic orchestration harness retained for fail-closed adapter and governance-boundary tests.

## What the agents can and cannot do today

The agents can reason over evidence explicitly supplied in their task/session and delegate analysis to the five specialists. They cannot independently fetch GitHub, Vercel, Supabase, or other external evidence because no connector tools or credentials are installed.

No evidence source is treated as inspected merely because the model is asked to inspect it. Missing external connectors must remain BLOCKED/UNPROVEN; the model must not invent source paths, deployment IDs, workflow runs, timestamps, or test outcomes.

## Run and verify locally

Requires Node.js 24 or newer:

    npm install
    npm test
    npm run self-check
    npm run build
    npm run dev

The self-check exercises the deterministic read-only orchestration harness with no external adapters. It does not prove model connectivity. A successful Eve build proves that the agent definitions compile; a real model turn additionally requires valid AI Gateway access.

## Connector contract and next gates

Any future data connector must be implemented as an individually reviewed Eve tool or connection, backed by a separately scoped read-only credential and explicit Preview-only target validation. The first planned connectors are repository/CI read, Vercel Preview read, and Preview database metadata read. No write-capable tool is permitted in this runtime.

Before calling the team operationally connected:
1. Configure AI Gateway credentials directly in the isolated Preview project; never paste secrets into chat or source control.
2. Add read-only GitHub and Vercel connectors with least-privilege scopes and Preview-only resource checks.
3. Add a Supabase Preview metadata connector only after confirming it cannot reach Production and cannot execute writes.
4. Add independent prompt-injection, secret-exfiltration, environment-confusion, unsafe-tool-use, and evidence-fabrication evaluations.
5. Add a durable audit/retention design and confirm access controls for sessions and traces.
6. Deploy only to a separate Preview runtime project and verify health, authenticated session creation, a model turn, subagent delegation, cancellation, budget enforcement, and Production refusal.

## Non-negotiable CEDARS boundaries

- Production FROZEN; public launch OFF; financial execution OFF.
- NO FIAT TRANSACTIONS inside CEDARS OS.
- Treasury remains a non-transactional evidence, authorization, receipt-metadata, and reconciliation control.
- No repository writes, database writes, migrations, deployments, promotions, settings changes, or external communications.
- No Production data or Production runtime access.
- No payments, payouts, transfers, token issuance, or other financial execution.
- The runtime cannot mark findings VERIFIED or ACCEPTED or promote capability status. VERIFIED requires current independent evidence; ACCEPTED requires a separate authorized human approval record.

**Status:** executable AI-agent definitions are present in source. Live model connectivity, external evidence retrieval, durable audit acceptance, and Preview runtime deployment are NOT YET VERIFIED.
