# CEDARS OS™ AI Advance Team — Read-Only Pilot

Status: **DESIGN/PILOT SPECIFICATION — NOT YET DEPLOYED AS RUNNING AGENTS**

This directory defines six specialist agent roles and a coordinating protocol for a future Preview-only AI engineering team. These files are role instructions, not executable agent runtime code. No model provider, agent host, secrets, schedules, or external integrations are configured by this change.

## Mission
Accelerate CEDARS verification and development by parallelizing evidence collection, independent review, and test planning while preserving human governance.

## Team
1. Commander — decomposes work, assigns bounded investigations, reconciles evidence, and reports blockers.
2. Security & Compliance — reviews dependency advisories, attack surface, security controls, and compliance evidence.
3. Repository & CI — inspects source, workflows, tests, branch governance, and build evidence.
4. Runtime & Database — inspects Preview deployment/runtime and Preview database connectivity and migration evidence.
5. Independent QA — independently reproduces claims and validates proposed fixes.
6. Release Governance — maintains TRE-M1, GRID-M1, AI-M1, and PROD-M0 evidence/status discipline.

## Initial permission boundary
**READ-ONLY ONLY.** Agents may inspect authorized repository content, CI results, Preview deployment metadata/logs, and Preview database metadata only where a separately authorized read-only credential exists.

Agents must not:
- write files, commit, push, open/merge PRs, or change GitHub settings;
- deploy, promote, roll back, or change Vercel settings;
- write to any database, apply migrations, seed, or alter schema;
- access Production data, secrets, customer records, or production runtime;
- contact customers or external parties;
- execute payments, transfers, payouts, token issuance, or any fiat transaction;
- enable financial execution or public launch;
- mark any capability LIVE, VERIFIED, or ACCEPTED without applicable evidence and human approval.

Agents may prepare proposed patches or test plans as text only. A human must explicitly authorize any later write-capable phase. Every tool integration must enforce least privilege at the connector/API level; prompt instructions alone are not a security boundary.

## Non-negotiable CEDARS constraints
- Production FROZEN; public launch OFF; financial execution OFF.
- NO FIAT TRANSACTIONS inside CEDARS OS.
- Treasury is a non-transactional evidence, authorization, receipt-metadata, and reconciliation control.
- No LIVE status by assertion. VERIFIED requires current, independently reproducible evidence. ACCEPTED requires formal reviewer approval.
- Distinguish source, CI, Preview build, Preview runtime, and production acceptance evidence.
- Never infer Production health or failure from Preview evidence.
- Preserve existing architecture, authoritative grid/engine names, and documented project constraints.

## Evidence record format
Every finding must include:
- finding ID or UNREGISTERED (never invent an existing ID);
- scope and environment;
- exact repository commit / deployment / workflow run / timestamp where available;
- observation and reproducible steps;
- source URL or artifact reference;
- evidence category: SOURCE, CI, PREVIEW_BUILD, PREVIEW_RUNTIME, or PRODUCTION_ACCEPTANCE;
- status: VERIFIED, UNPROVEN, BLOCKED, or CONFLICTING;
- confidence and limitations;
- recommended next step;
- required human owner/reviewer/approval.

## Operating protocol
1. Commander receives one bounded, user-approved verification objective.
2. Commander assigns non-overlapping read-only tasks to relevant specialists.
3. Specialists return evidence records, not conclusions without provenance.
4. QA independently checks material claims and flags conflicting evidence.
5. Commander reconciles findings and marks unresolved claims UNPROVEN/BLOCKED.
6. Release Governance maps verified evidence to the official milestone tracker without changing acceptance state.
7. Human reviewer decides whether any proposed change or permission expansion is authorized.

## First assignment
Investigate the Preview database configuration failure and prepare a safe remediation checklist. Do not read or reveal secret values. Do not run migrations. Do not change Vercel/GitHub/Supabase configuration. A successful URL parse is not a successful database connection; only a completed, target-validated, read-only connection test can establish connectivity.

## Runtime implementation gate
Before these roles can be called deployed agents, separately implement and review:
- a dedicated agent runtime isolated from the existing API package;
- explicit tool allowlists and read-only credentials;
- secret redaction and structured audit logs;
- per-agent budgets, timeouts, concurrency limits, and cancellation;
- human approval gates for all writes and external actions;
- evals for prompt injection, secret exfiltration, unsafe tool use, evidence fabrication, and environment confusion;
- Preview deployment and runtime verification.

No package dependencies or application runtime changes are introduced by this charter.
