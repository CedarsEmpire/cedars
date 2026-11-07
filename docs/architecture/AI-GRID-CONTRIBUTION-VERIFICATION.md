# CEDARS OS™ — AI Grid Contribution Verification

**Status:** Preview architecture decision  
**Scope:** Grid Contribution Verification Engine and the future Balance read model  
**Governance:** Preview-only; production remains frozen pending separate transition approval; public launch OFF. Real-money Deposit and Withdrawal capabilities are authorized in principle for controlled development and testing, but live Production transactions remain gated by legal, compliance, security, provider, reconciliation and production-acceptance evidence.

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

Do not invent balances, assign a cash equivalent, treat a task's agreed price as earned value, or imply a contribution is paid or withdrawable. Balance, Deposit and Withdrawal remain distinct modules with independent ON/OFF controls. The user has authorized real-money Deposit and Withdrawal capability in principle as part of the architecture and effectiveness testing. This authorization does not itself activate a payment provider or permit live Production transactions. Sandbox and controlled Preview tests must be clearly distinguished from actual settlement. Live Production transactions require separately documented approval plus legal/compliance, provider, security, fraud, customer-consent, dual-control, reconciliation, monitoring and production-acceptance evidence.

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

- Worker and grid execution may be progressively authorized for bounded, controlled Preview operation after the relevant runtime, connector, safety and evidence gates pass; no blanket activation is implied.
- No status may be marked LIVE by assertion; operational status requires evidence from all relevant release gates.
- Public launch remains OFF. Production remains frozen until a separately approved transition. Financial modules may be developed and tested under their own controls; actual Production transactions remain OFF until separately authorized and all financial acceptance gates pass.
- No production database, production secrets, production deployment, or live financial system may be modified without explicit authorization for that specific action.
- Do not introduce a migration or Balance API before the runtime/evidence contract and its threat model are reviewed.

## 8. Relationship to source vision

This decision preserves the four-layer grid economy and the principle that AI coordinates useful work but does not create money by itself. It applies the user's explicit zero-human-physical-work requirement as a stricter operating constraint than older vision material that describes people or providers as possible execution participants. Human governance and oversight remain permitted; human physical execution does not.


## 9. Connection-first integration architecture

Connectivity is a first-class part of the architecture from the beginning. The Preview implementation must not be designed as an isolated simulator with integrations postponed until after the core is built.

Before implementing grid execution, create an integration inventory for every relevant grid and worker. For each integration, record:

- owning grid, purpose, and the AI workers allowed to use it;
- provider/system name and whether it is an internal service, external API, cloud resource, data source, or automated device/robotic interface;
- exact capability and data exchanged, including direction and classification;
- authentication method, secret owner, least-privilege scopes, rotation and revocation procedure;
- network, region, endpoint, rate-limit, quota, timeout, retry and outage behavior;
- data provenance, retention, privacy, licensing, and applicable legal/safety constraints;
- sandbox/Preview endpoint and credentials, separate from all Production resources;
- health check, connection test, contract test, failure-mode test, and evidence required before the integration can be called operational.

Use provider-neutral, grid-owned connector adapters behind a common integration contract. Workers must receive only explicitly authorized tools through the grid control plane; they must not hold unrestricted provider credentials or call arbitrary external systems. Store secrets only in the approved secret manager/environment, never in source code, logs, task payloads, or contribution evidence.

### Connection state is not execution state

Track these states separately and never collapse them into a single ON/LIVE flag:

1. **DEFINED** — integration contract and owner are documented.
2. **CONFIGURED** — Preview endpoint and required settings are present.
3. **CONNECTED** — authenticated handshake/health check succeeds against the intended Preview service.
4. **CONTRACT_VERIFIED** — request/response, permissions, error handling and data contracts pass tests.
5. **EXECUTION_VERIFIED** — a controlled authorized AI-worker run uses the connection and produces retained, validated evidence.
6. **SUSPENDED / FAILED** — connection or verification has failed; dependent execution fails closed.

A successful ping or provider dashboard status does not prove that an AI worker can safely use the integration. A simulated connector does not count as a real connection. A real connection does not, by itself, prove useful execution or contribution value.

### Integration rollout

Build the shared connector framework and integration registry first, then connect the minimum real Preview dependencies required for one end-to-end grid use case. Expand grid by grid using the same contract and evidence gates. Do not attempt to activate every provider or every grid simultaneously; prioritize dependencies, isolate credentials and data, and prove each connection before enabling dependent workers.

The initial dependency assessment must explicitly consider:
- AI model/inference providers and worker orchestration;
- cloud compute, storage, queues, and artifact storage;
- identity, authorization, secrets, and audit logging;
- grid-specific data sources and service APIs across Cloud, Earth & Surface, Underground, and Human Business;
- automated device/robotic interfaces where a grid genuinely requires physical-world execution;
- independent validation, provenance, monitoring, and evidence retention.

Do not assume every grid needs every provider. Identify actual dependencies from the canonical grid catalogue and approved use cases. No physical-world action may be enabled without its own safety interlocks, bounded permissions, emergency stop, and separately approved Preview test plan.

### Revised delivery order

1. Inventory canonical grids, AI workers, runtime mode, existing routes, policies, audit events, tests, and all current external dependencies.
2. Produce a grid-to-worker-to-integration dependency matrix and classify each connection as defined/configured/connected/contract-verified/execution-verified.
3. Define the common connector contract, secret handling, authorization boundaries, observability, retries, idempotency, and fail-closed behavior.
4. Connect the minimum real Preview services needed for a selected end-to-end grid use case; prove each connection with authenticated health and contract tests.
5. Define the trusted AI-worker runtime and execution/evidence contract; execute a controlled Preview run through the real connections and retain verifiable output provenance.
6. Only after that proof, implement contribution persistence and the authenticated read-only Balance API.
7. Test access isolation, revoked/expired credentials, provider outages, replay/duplicate calls, invalid/tampered outputs, unsafe tool requests, and audit integrity.
8. Verify Preview deployment and database/secret isolation. Do not touch Production.
