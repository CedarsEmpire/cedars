# CEDARS OS™ — AI Grid Contribution Verification

**Status:** Preview architecture decision  
**Scope:** Grid Contribution Verification Engine and the future Balance read model  
**Governance:** Preview-only; production frozen; financial execution OFF; public launch OFF

## 1. Non-negotiable operating model

CEDARS OS is a grid-operated automated economy. Operational work must be performed by authorized AI workers and automated systems operating through CEDARS grids. **Zero human physical work is permitted as the operating model.**

People may perform governance functions such as setting policy, granting approvals, reviewing evidence, handling exceptions, and exercising emergency stop authority. Those functions do not make people the operational workforce. Human-performed physical work, manually administered work orders, and manual delivery/acceptance workflows are not eligible evidence of an AI-grid contribution.

Where a grid capability touches the physical world, execution must be through an authorized automated interface, device, or robotic system. A human physically carrying out the task cannot be represented as an AI-worker execution.

## 2. Grid-only architecture

The verification system must operate through the CEDARS grid architecture and preserve the four economic layers:

- Cloud
- Earth & Surface
- Underground
- Human Business

A common grid interface and control plane should identify the grid, authorize the AI worker, scope its tools and permissions, dispatch work, observe execution, validate outputs, and record evidence. A grid name or enabled feature flag alone is not proof that a runtime is connected or that work occurred.

## 3. What qualifies as a verified contribution

A contribution is eligible for verification only when the system can establish, at minimum:

1. **Grid identity:** the registered grid and applicable grid node or service scope.
2. **AI-worker identity:** the authorized worker identity, version/configuration, and execution context.
3. **Authorization:** the policy, permissions, tool scope, and task authorization in force before execution.
4. **Unique execution:** a globally unique execution reference and idempotency key, with duplicate/replay detection.
5. **Execution trace:** trusted runtime events with timestamps, state transitions, and relevant resource/cost telemetry.
6. **Output provenance:** output artifact references, content hashes, and lineage to the execution that produced them.
7. **Validation:** deterministic checks where possible, quality/safety policy checks, and independent or external corroboration where the task requires it.
8. **Outcome:** a clearly recorded result such as verified, rejected, disputed, or awaiting validation.
9. **Auditability:** append-only or tamper-evident evidence and an attributable record of every verification decision.

A worker's self-report, a manually entered completion note, a configured worker switch, a simulated run, or a customer task marked accepted is not sufficient on its own.

## 4. Balance boundaries

The future Balance read model may summarize verified grid contributions and their non-monetary measures (for example completed verified executions, accepted output units, service entitlements, or approved impact metrics) only when supported by the evidence above.

Keep these concepts separate:

- **Verified grid contribution:** evidence-backed output from an authorized AI-worker execution.
- **Non-monetary measure or entitlement:** a separately governed unit or service access right; never imply it is cash.
- **Economic/revenue evidence:** a distinct record requiring a real buyer, defined deliverable, evidence of completion, and independently reconciled payment where relevant.
- **Financial settlement:** a separate capability subject to its own legal, security, governance, and production approvals.

Do not invent balances, assign a cash equivalent, treat a task's agreed price as earned value, or imply a contribution is paid or withdrawable. No deposits, withdrawals, fiat transactions, wallet credits, token transfers, or financial execution are part of this Preview implementation.

## 5. Explicit exclusions and legacy workflow boundary

The current repository documents worker configuration as desired state only; no AI model provider, worker execution runtime, or automated customer-work dispatch is connected. The existing Grid Task flow is manually administered and must not be used as proof of AI-worker execution or as the source of Balance contributions.

Legacy human-operated Grid Tasks may remain only as a separately gated legacy workflow while governance decides their disposition. They must not feed the AI Grid Contribution Verification Engine or the Balance contribution totals.

## 6. Required implementation sequence

1. Inventory the registered grid catalogue, worker catalogue, runtime mode, authorization policies, task dispatch interfaces, audit events, and current tests.
2. Define the trusted AI-worker runtime contract and grid execution/evidence event model before creating contribution tables.
3. Establish idempotency, replay protection, provenance, output validation, and fail-closed behavior.
4. Prove one controlled Preview execution end-to-end with a real connected AI-worker runtime and retained evidence. A simulator is useful for tests but cannot establish live operational capability.
5. Add contribution persistence and a read-only, authenticated, per-account Balance API only after the runtime evidence contract is proven.
6. Add tests for unauthorized execution, human/manual-task exclusion, cross-account isolation, duplicate/replayed execution, missing or invalid evidence, tampered artifacts, failed validation, and audit integrity.
7. Verify Preview deployment and database isolation. Do not touch Production.

## 7. Release and safety gates

- Worker and grid execution remain OFF/standby until separately authorized and proven in Preview.
- No status may be marked LIVE by assertion; operational status requires evidence from all relevant release gates.
- Financial execution remains OFF and public launch remains OFF.
- No production database, production secrets, production deployment, or live financial system may be modified by this work.
- Do not introduce a migration or Balance API before the runtime/evidence contract and its threat model are reviewed.

## 8. Relationship to source vision

This decision preserves the four-layer grid economy and the principle that AI coordinates useful work but does not create money by itself. It applies the user's explicit zero-human-physical-work requirement as a stricter operating constraint than older vision material that describes people or providers as possible execution participants. Human governance and oversight remain permitted; human physical execution does not.
