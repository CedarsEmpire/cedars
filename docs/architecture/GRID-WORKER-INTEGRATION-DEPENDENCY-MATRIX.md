# CEDARS OS™ — Grid / Worker / Integration Dependency Matrix

**Status:** Preview architecture and discovery baseline  
**Repository ref:** `preview/customer-balance-records`  
**Source baseline inspected:** canonical grid and worker catalogues, runtime-mode implementation, package manifest, contribution-verification and Admin Control Center architecture records  
**Operational truth at inspection:** runtime mode is DISCONNECTED unless Preview simulator is explicitly selected; no live AI-worker execution runtime or provider connector is established by the inspected source. The package manifest contains Prisma, JOSE and Zod as runtime dependencies; it does not establish an AI provider, queue, cloud storage, payment processor, robotics or grid-data connector.

## 1. Purpose and rules

This matrix makes external connections part of the architecture from the start. It inventories all 53 canonical grids and the five catalogued AI workers without inventing provider choices or claiming integrations exist.

- Canonical grid IDs, names and layer labels are preserved exactly from `src/features/grid-catalog.ts`.
- Worker IDs, names, roles and module associations are preserved exactly from `src/features/worker-catalog.ts`.
- The current catalogue does not declare worker-to-grid assignments or per-grid integration dependencies. Candidate mappings below are discovery hypotheses, not assignments or approved access.
- Every connection is currently **NOT VERIFIED** from the source inspected. This is not a claim that no external account exists; it means this repository evidence does not prove a working connector.
- A configured worker or grid switch is desired state, not runtime execution.
- Human physical work and the legacy manual Grid Task workflow are never valid AI contribution evidence.
- No production secrets, databases, deployment settings or payment rails are changed by this document.

## 2. Current worker inventory

| Worker ID | Catalogue name | Declared role | Module association | Grid assignment |
|---|---|---|---|---|
| `sales` | Sales AI | Lead research and qualification | `sales_ai` | Not declared |
| `research` | Research AI | Discovery and synthesis | `ai_iq` | Not declared |
| `health` | Healthcare AI | Administrative support | `healthcare_ai` | Not declared |
| `opportunity` | Opportunity AI | Demand and capacity planning | `opportunity_ai` | Not declared |
| `support` | Support AI | Ticket triage and drafting | `support_ai` | Not declared |

**Finding:** five worker definitions are catalogue/configuration entries. They do not establish a connected inference provider, orchestration service, tool runtime, job queue, execution trace, or automated dispatch. Worker-to-grid permissions must be explicitly designed and approved before a worker receives tools.

## 3. Shared platform dependencies

These are platform-wide dependency classes to assess before the first real Preview execution. Provider selection remains open until requirements, data handling, cost, region, contractual terms and security have been compared.

| Dependency class | Required capability | Evidence required to mark connected / verified | Current source evidence |
|---|---|---|---|
| AI inference | Model API, model/version selection, structured outputs, safety controls, usage/cost limits | Authenticated Preview call, model/version recorded, schema and failure tests, bounded spend | No provider SDK or adapter established |
| Worker orchestration | Durable dispatch, isolated execution, cancellation, retries, concurrency and worker identity | End-to-end authorized run, trace, cancellation and retry tests | No execution runtime established |
| Job queue / event transport | At-least-once delivery with idempotency, dead-letter handling and replay controls | Contract tests for duplicate, delay, poison message and recovery | No queue dependency established |
| Compute / hosting | Isolated Preview execution environment, network egress controls and resource limits | Deployment identity, resource limits, isolation and egress tests | Vercel project exists in prior project context; worker compute capability not proven |
| Artifact storage | Durable outputs, versioning, access control, checksums and retention | Upload/read-back, hash match, authorization and retention tests | No artifact store adapter established |
| Database | Isolated Preview PostgreSQL, migrations, scoped persistence and backup/restore | Verified connection, migration state, isolation and restore test | Prisma client/schema exists; successful current Preview DB readiness must be checked separately |
| Identity / authorization | Auth0 OIDC/JWT validation, machine identities, scoped grants and revocation | Token validation, role/scope denial, expiry and revocation tests | Auth0 Preview tenant configured in project history; app-to-runtime machine identity still unproven |
| Secrets management | Environment-specific secrets, least privilege, rotation and revocation | Secret access policy and rotation drill; no secret leakage in logs/artifacts | Vercel environment configuration must be inspected per environment |
| Audit / evidence | Append-only/tamper-evident event history, correlation IDs and evidence retention | Trace-to-output lineage, tamper/replay tests, export and retention test | Audit features exist in source; end-to-end worker evidence is not established |
| Independent validation | Deterministic checks, policy checks, domain-specific validators and external corroboration | Validator identity/version, repeatable pass/fail evidence, false-acceptance tests | No complete validation service inventory established |
| Observability | Metrics, logs, traces, alerts, cost and service health | Alert delivery, correlation across services, outage and threshold tests | Existing API summary is not a complete runtime observability system |
| Payments / financial services | Regulated payment provider, ledger, reconciliation, fraud controls, refunds/disputes and payout controls | Provider sandbox contract tests, legal/compliance review, reconciliation and controlled acceptance | No payment intake or payout rails established in inspected source; financial execution remains gated pending separate production acceptance |
| Physical-world automation | Approved device/robotics APIs, safety controller, geofence/interlocks and emergency stop | Hardware-in-loop or approved controlled test, safety case, fail-safe and stop verification | No device/robotics integration established |

## 4. Canonical grid-by-grid discovery matrix

The integration classes are **candidate discovery requirements inferred from each grid's name and purpose**. They are not approved provider selections, proven dependencies, worker assignments or claims that the grid is operational. Each grid must have a named owner and a reviewed use case before connector access is granted.

### CEDARS CLOUD — 19 grids

| Canonical grid | Candidate integration classes to assess | Worker mapping | Current connection evidence |
|---|---|---|---|
| Compute & AI Grid (`compute-ai`) | AI inference, compute orchestration, model registry, job queue, artifact store, usage metering | Not declared | NOT VERIFIED |
| Data Processing Grid (`data-processing`) | Object storage, data ingestion, ETL/processing engine, schema and quality validation | Not declared | NOT VERIFIED |
| SaaS & Business Software Grid (`saas-business-software`) | Approved SaaS APIs, OAuth connectors, tenant isolation, webhooks | Not declared | NOT VERIFIED |
| Cybersecurity & Automation Grid (`cybersecurity-automation`) | Security telemetry, vulnerability/scanning APIs, policy engine, incident response hooks | Not declared | NOT VERIFIED |
| Wallet Grid (`wallet`) | Custody/key-management architecture, ledger, identity, sanctions/risk controls; no signing or transfers before approval | Not declared | NOT VERIFIED; financial execution gated |
| Ledger Grid (`ledger`) | Double-entry ledger, immutable event history, reconciliation and audit export | Not declared | NOT VERIFIED; financial activation gated |
| Money Grid (`money`) | Payment processor, banking/payment APIs, compliance screening, fraud/risk, reconciliation | Not declared | NOT VERIFIED; financial activation gated |
| AI IQ Grid (`ai-iq`) | AI inference, evaluation datasets, model registry, retrieval and quality evaluation | Research AI is a candidate only; not assigned | NOT VERIFIED |
| Collective Memory (`collective-memory`) | Governed knowledge store, retrieval/indexing, provenance, consent and retention controls | Research AI is a candidate only; not assigned | NOT VERIFIED |
| AI Discovery Engine (`ai-discovery-engine`) | Search/data APIs, crawling under permission, ranking/evaluation and provenance | Research AI is a candidate only; not assigned | NOT VERIFIED |
| Trust & Verification (`trust-verification`) | Identity/attestation, cryptographic verification, reputation evidence and audit | Not declared | NOT VERIFIED |
| Civilization Ledger (`civilization-ledger`) | Governed event store, data standards, provenance and access policy | Not declared | NOT VERIFIED |
| Bitcoin Trust Grid (`bitcoin-trust`) | Bitcoin node/indexer APIs, chain data, independent verification and monitoring | Not declared | NOT VERIFIED; observation is not custody or settlement |
| Monetary Network Grid (`monetary-network`) | Payment/network interfaces, ledger, compliance and transaction reconciliation | Not declared | NOT VERIFIED; financial activation gated |
| Scarcity Model Grid (`scarcity-model`) | Verified supply/issuance data, transparent rules, simulation and independent audit | Research AI candidate only; not assigned | NOT VERIFIED |
| Security History Grid (`security-history`) | Chain/security event sources, append-only archive, provenance and query/index services | Research AI candidate only; not assigned | NOT VERIFIED |
| Adoption Intelligence Grid (`adoption-intelligence`) | Consent-based analytics, public data sources, privacy controls and metric validation | Research AI candidate only; not assigned | NOT VERIFIED |
| Bitcoin Grid (`bitcoin`) | Bitcoin node/indexer, chain analytics, risk monitoring and independent validation | Not declared | NOT VERIFIED; no wallet signing inferred |
| CEDARS Coin Grid (`cedars-coin`) | Token/asset rules, ledger, custody, compliance, issuance controls and reconciliation | Not declared | NOT VERIFIED; issuance/transfers not authorized by this matrix |

### CEDARS UNDERGROUND — 4 grids

| Canonical grid | Candidate integration classes to assess | Worker mapping | Current connection evidence |
|---|---|---|---|
| Mining & Minerals Grid (`mining-minerals`) | Licensed geospatial/resource datasets, equipment telemetry, industrial systems, environmental and safety monitoring | Not declared | NOT VERIFIED; physical actions require approved automation and safety case |
| Geospatial & Geology Grid (`geospatial-geology`) | GIS/geospatial APIs, satellite/remote sensing, geological datasets and validation | Research AI candidate only; not assigned | NOT VERIFIED |
| Utilities & Infrastructure Grid (`utilities-infrastructure`) | Utility telemetry/SCADA read interfaces, asset registries, outage data and safety controls | Not declared | NOT VERIFIED; no control commands without separate safety approval |
| Equipment & Maintenance Grid (`equipment-maintenance`) | IoT/condition sensors, asset-management APIs, diagnostics and authorized robotics | Not declared | NOT VERIFIED; no human physical work as grid execution |

### CEDARS EARTH — 11 grids

| Canonical grid | Candidate integration classes to assess | Worker mapping | Current connection evidence |
|---|---|---|---|
| Solar Grid (`solar`) | Inverter/plant telemetry, weather/irradiance data, energy meters and safety controller | Not declared | NOT VERIFIED; no device control without approval |
| Climate Grid (`climate`) | Weather/climate datasets, satellite data, scientific models and provenance | Research AI candidate only; not assigned | NOT VERIFIED |
| Environmental Intelligence Grid (`environmental-intelligence`) | Sensor networks, remote sensing, environmental datasets and independent validation | Research AI candidate only; not assigned | NOT VERIFIED |
| Energy Grid (`energy`) | Grid/market data, meter telemetry, forecasting and regulated utility interfaces | Not declared | NOT VERIFIED; read-only first |
| Agriculture Grid (`agriculture`) | Weather/soil/crop datasets, farm telemetry, imagery and authorized automation | Not declared | NOT VERIFIED; human physical work excluded |
| Food Grid (`food`) | Supply-chain/inventory APIs, food safety and traceability data, logistics interfaces | Opportunity AI candidate only; not assigned | NOT VERIFIED |
| Water Grid (`water`) | Water-quality sensors, utility telemetry, hydrology data and safety systems | Not declared | NOT VERIFIED; read-only first |
| Land Grid (`land`) | GIS/cadastre/land-cover data, satellite imagery and lawful registry interfaces | Research AI candidate only; not assigned | NOT VERIFIED |
| Buildings & Services Grid (`buildings-services`) | Building-management telemetry, asset systems, occupancy/safety interfaces and approved automation | Not declared | NOT VERIFIED |
| Cleaning & Maintenance Grid (`cleaning-maintenance`) | Facilities work-order APIs, robotics interfaces, sensors and safety interlocks | Not declared | NOT VERIFIED; robotics only, no human physical work |
| Mobility & Logistics Grid (`mobility-logistics`) | Fleet/telematics, routing, mapping, shipment APIs and autonomous-system safety controls | Opportunity AI candidate only; not assigned | NOT VERIFIED; no vehicle control without approval |

### CEDARS HUMAN ACTIVITIES — 19 canonical grids

The canonical layer label is retained exactly from source. The operating model remains AI-executed: these grids do not authorize humans to become the physical operational workforce.

| Canonical grid | Candidate integration classes to assess | Worker mapping | Current connection evidence |
|---|---|---|---|
| Trade & Procurement Grid (`trade-procurement`) | Supplier/catalogue APIs, procurement/ERP, identity, contract and invoice evidence | Sales / Opportunity candidates only; not assigned | NOT VERIFIED |
| Professional Services Grid (`professional-services`) | Document/workflow APIs, domain tools, customer systems and deliverable validation | Research / Support candidates only; not assigned | NOT VERIFIED |
| Education & Training Grid (`education-training`) | Learning platforms, content repositories, assessment/credential validation and child-safety controls | Research candidate only; not assigned | NOT VERIFIED |
| Care Services Grid (`care-services`) | Scheduling/service directories, consent, safeguarding, referral and human professional oversight interfaces | Healthcare AI candidate only; not assigned | NOT VERIFIED; AI must not replace accountable care professionals |
| Tourism & Hospitality Grid (`tourism-hospitality`) | Booking/property/availability APIs, customer service and payments when approved | Sales / Support candidates only; not assigned | NOT VERIFIED |
| Sales AI (`sales-ai`) | CRM, lead/source data, email/calendar only with consent, sales workflow and buyer/order evidence | Sales AI candidate; assignment not configured | NOT VERIFIED |
| Support AI (`support-ai`) | Ticketing/helpdesk, knowledge base, messaging and escalation/consent controls | Support AI candidate; assignment not configured | NOT VERIFIED |
| Healthcare AI (`healthcare-ai`) | Approved health information systems, clinical knowledge sources, privacy controls and professional review | Healthcare AI candidate; assignment not configured | NOT VERIFIED; no autonomous diagnosis/treatment |
| Education AI (`education-ai`) | LMS/content APIs, assessment, age-appropriate safety and educator oversight | Research AI candidate; assignment not configured | NOT VERIFIED |
| Contribution Grid (`contribution`) | Trusted execution event stream, worker identity, idempotency, artifact provenance, validators and audit store | All workers only after explicit per-grid authorization | NOT VERIFIED; no contribution credit before execution proof |
| Innovation Grid (`innovation`) | Research/search, experiment registry, IP/provenance and evaluation tools | Research AI candidate; not assigned | NOT VERIFIED |
| Innovation Network (`innovation-network`) | Partner/member directory, consented collaboration APIs and access governance | Sales / Research candidates; not assigned | NOT VERIFIED |
| AI Twins™ (`ai-twins`) | Governed source data, model/inference, simulation, versioning and privacy controls | Research candidate; not assigned | NOT VERIFIED |
| Innovation Dome™ (`innovation-dome`) | Simulation/compute, collaboration, artifact store, model evaluation and access control | Research candidate; not assigned | NOT VERIFIED |
| Simulation Grid (`simulation`) | Simulation engines, datasets, scenario registry, reproducibility and model validation | Research candidate; not assigned | NOT VERIFIED; simulation is not live execution proof |
| Synthetic Reality™ (`synthetic-reality`) | 3D/real-time rendering, content storage, identity, safety/moderation and provenance | Research candidate; not assigned | NOT VERIFIED |
| Human Progress Index (`human-progress-index`) | Governed outcome datasets, privacy-preserving analytics, methodology and independent evaluation | Research / Opportunity candidates; not assigned | NOT VERIFIED; no impact claims without evidence |
| Proof of Contribution (`proof-of-contribution`) | Signed execution attestations, event provenance, anti-replay, independent validators and audit archive | All workers only after explicit per-grid authorization | NOT VERIFIED; no self-reported proof |
| Collective Intelligence (`collective-intelligence`) | Multi-agent orchestration, shared knowledge, conflict resolution, provenance and policy engine | Research candidate; not assigned | NOT VERIFIED |

## 5. Worker-to-grid authorization design

Do not infer permission from a worker's name or module association. Implement an explicit, versioned allowlist mapping:

- worker ID and immutable worker version;
- grid ID and permitted operation types;
- connector/tool IDs and exact scopes;
- permitted data classifications and geographic/environment boundaries;
- execution limits, spend/time quotas and concurrency;
- required human approval class, where applicable;
- safety policy and emergency-stop group;
- effective time, expiry, revocation and approver evidence.

Default is **NO ACCESS**. A worker receives a narrowly scoped capability only after its grid owner, security policy and required approvers authorize it. Financial, health, child-related, critical-infrastructure and physical-world actions require additional domain-specific review.

## 6. Connection state machine and proof

Track connection and execution independently:

1. **DEFINED** — owner, use case, contract and data map approved.
2. **CONFIGURED** — Preview endpoint and isolated credentials provisioned.
3. **CONNECTED** — authenticated handshake/health check succeeds.
4. **CONTRACT_VERIFIED** — schemas, scopes, error paths, quotas and isolation tests pass.
5. **EXECUTION_VERIFIED** — a real authorized AI worker uses the connector and creates retained, validated evidence.
6. **SUSPENDED / FAILED** — connector or policy fails; dependent execution is stopped or denied.

Required proof for a contribution: worker identity/version, grid identity, pre-run authorization, unique execution and idempotency reference, trusted trace, output hash/provenance, independent validation, outcome and tamper-evident audit record. A simulator, ping, feature flag, manual completion or worker self-report is insufficient.

## 7. Recommended first end-to-end Preview pilot

Select one low-risk, digital-only use case from the existing Cloud/Human Activities catalogues, such as a Research AI workflow that ingests an approved public or synthetic dataset, produces a structured research artifact, and validates it independently.

Before execution:
- choose and approve the exact grid and worker assignment;
- choose the AI provider only after comparing privacy, region, data-use terms, reliability and cost;
- connect isolated Preview identity, secrets, database, queue/orchestration and artifact storage;
- define an independent validator and evidence retention;
- set strict spend, rate, data and time limits;
- test denial, cancellation, duplicate delivery, provider outage, invalid output, secret leakage and emergency stop.

Then run a controlled real Preview execution and retain the complete evidence package. Only after this proof should contribution persistence and the Balance read model be implemented.

## 8. Financial capability boundary

The architecture must retain Balance, Deposit and Withdrawal as distinct modules with independent controls and clear ON/OFF states. The user's updated direction authorizes developing and testing real-money capability in principle; it does not waive payment-provider, legal/compliance, security, fraud, customer-consent, reconciliation, dual-approval or production-acceptance gates.

Sandbox tests prove integration contracts, not real settlement. Actual Production deposits or withdrawals must remain disabled until a separate documented production authorization and all relevant acceptance evidence are complete. Do not infer that enabling a UI switch activates a payment rail. Do not credit balances from unverified AI output, a referral calculator, a chain observation, or an unreconciled payment.

## 9. Governance and next actions

1. Confirm the 53 canonical grid entries and five worker entries remain unchanged.
2. Assign accountable owners and approved use cases; resolve the current absence of explicit worker-to-grid mappings.
3. Review each candidate integration class and select providers using a documented evaluation, not assumptions.
4. Inspect current Preview environment configuration and external accounts without exposing or copying secrets.
5. Build the connector contract, registry, scoped authorization and evidence model.
6. Connect the minimum real Preview dependencies for one low-risk digital grid.
7. Verify a real AI-worker execution end-to-end.
8. Extend the matrix and integrations grid-by-grid.
9. Update the Admin Control Center to show connection, contract verification, execution verification, cost, freshness and evidence separately.
10. Keep Production frozen and public launch OFF until a separately approved transition. No financial or physical-world execution is enabled by this planning document.

**Acceptance rule:** No connection, worker, grid, contribution, financial service or impact claim may be labelled CONNECTED, EXECUTION_VERIFIED, LIVE, EARNED, SETTLED or IMPACTED without the corresponding retained evidence.
