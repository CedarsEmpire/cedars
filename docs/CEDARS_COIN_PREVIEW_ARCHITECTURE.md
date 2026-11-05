# CEDARS Coin™ — Preview-Only Architecture Specification

**Status:** DESIGN ONLY / PREVIEW  
**Architecture placement:** CLOUD → mandatory Bitcoin Grid → CEDARS Coin Grid  
**Financial execution:** OFF  
**Public launch:** OFF  
**Production:** FROZEN  
**Token issuance:** NOT APPROVED  
**Blockchain execution / network connections:** NOT APPROVED

## 1. Purpose and architectural decision

CEDARS Coin™ is the proposed name for a combined CEDARS digital-asset and ecosystem participation model. The combined model has four conceptually distinct functions:

1. **Ecosystem identity** — a recognisable CEDARS ecosystem designation and account-level identity context.
2. **Contribution recognition** — evidence-linked recognition of verified work, knowledge, innovation and positive outcomes.
3. **Service utility** — governed access entitlements for eligible CEDARS services, subject to service-specific permissions and terms.
4. **Bitcoin-compatible digital-asset research** — a future, separately approved technical option. No asset is issued or represented as Bitcoin-backed by this specification.

These functions must not be collapsed into one spendable balance. A contribution record is not money. Recognition is not a financial claim. A service entitlement is not automatically transferable or redeemable. Association with the Bitcoin Grid does not mean Bitcoin backing, custody, settlement or protocol control.

The name CEDARS Coin™ is a **working product name**, not a statement that a coin or token exists, has been issued, is legally classified, has monetary value, is redeemable, or is backed by reserves.

## 2. Placement in the CEDARS architecture

CEDARS Coin is a child capability of the mandatory Bitcoin Grid in the CLOUD economic layer. Bitcoin Grid is a required architectural component and must not be treated as optional or omitted from catalogues, governance views or architecture maps.

The Bitcoin Grid is the parent CEDARS governance and research domain for crypto-related capabilities. It does not control Bitcoin or other external protocols. External blockchain networks remain independent systems with their own consensus, validators, rules, risks and governance.

### Proposed hierarchy

- **CEDARS OS™**
  - **CLOUD**
    - **Bitcoin Grid** — mandatory architectural parent; operational execution disabled.
      - Bitcoin Trust & Evidence Grid
      - Monetary Network Intelligence Grid
      - Crypto Network Intelligence Grid
      - Crypto Interoperability Research Grid
      - Digital Asset Governance Grid
      - Blockchain Security & Risk Grid
      - **CEDARS Coin Grid**
        - Ecosystem Identity capability
        - Contribution Recognition capability
        - Service Utility capability
        - Digital-Asset Research capability (design only)

The names above are proposed capability boundaries. They do not assert that these Grids are implemented, connected or operational. Existing CEDARS Grid registry names must be checked before adding entries; do not create duplicate names or change the established four economic layers.

## 3. Four CEDARS Coin components

### 3.1 Ecosystem identity

Purpose: identify a participant's relationship to CEDARS without creating a wallet or financial account.

Preview data may include:
- Internal participant reference (pseudonymous where appropriate).
- Verified identity status and verification source reference.
- Organisation/provider affiliation and role.
- Consent, terms and policy version references.
- Eligibility and access status.
- Audit history.

Identity verification must be proportionate, privacy-minimised and purpose-limited. No identity document images or sensitive personal data should be added to the prototype without a separately approved data-protection design.

### 3.2 Contribution recognition

Purpose: preserve evidence of contributions and their attribution.

A recognition record should include:
- Contribution ID and contributor reference.
- Contribution category and description.
- Related Grid, task, project or knowledge artefact.
- Evidence references and verification method.
- Reviewer or verification service identity.
- Attribution, ownership and licence terms.
- Dispute, appeal and correction status.
- Timestamp and immutable audit-event reference within CEDARS.

The existing conceptual Contribution Value model (Impact × Reach × Trust × Sustainability) may be displayed as an evaluation framework, not as a monetary conversion formula.

**Hard boundary:** no automatic conversion of contribution scores into money, token units, cash-equivalent balances, investment returns, yield, or redeemable claims. No automatic issuance or transfer.

### 3.3 Service utility

Purpose: manage access to approved CEDARS services.

Preview entitlements may represent:
- Service eligibility.
- Subscription or access-plan status recorded as a non-financial service state.
- Usage limits and service quotas.
- Expiry, suspension and revocation.
- Service terms and acceptance evidence.

An entitlement is an access-control record, not a payment, stored-value balance, deposit, withdrawal, transferable token or promise of future financial value. Any future fee collection must occur outside CEDARS under a separately approved commercial and legal design; CEDARS may record a non-sensitive external invoice or reconciliation reference only if approved.

### 3.4 Digital-asset research

Purpose: document future options without enabling them.

Research may compare:
- A Bitcoin-native or Bitcoin-compatible representation.
- A separately issued asset on another network.
- A non-transferable, off-chain recognition model.
- A service-entitlement model with no token.

No option is selected for issuance by this document. No supply, denomination, reserve, conversion rate, peg, redemption right, yield, distribution schedule or market price is established. Do not describe CEDARS Coin as Bitcoin-backed, stable, collateralised or guaranteed.

## 4. External crypto network relationship

The Bitcoin Grid is mandatory in CEDARS architecture. It may catalogue and research external ecosystems, including Bitcoin, Ethereum, Solana, Cardano and other networks after a controlled review.

The catalogue must clearly distinguish:
- CEDARS-owned internal design records.
- Public external network facts.
- Independently verified external data.
- Unverified third-party claims.
- Future integration proposals.

External networks do not become Bitcoin, do not become controlled by CEDARS, and do not inherit Bitcoin's security or governance. Cross-chain bridges, wrapped assets, custodians, exchanges and interoperability protocols introduce separate counterparty, smart-contract, liquidity, regulatory and operational risks. No bridge or external network integration is authorised by this design.

The Bitcoin Grid's mandatory status means mandatory architectural representation and governance—not mandatory transaction execution or a requirement to hold BTC.

## 5. Preview-only data model

Proposed logical records (not a migration or database instruction):

- coin_program — program identifier, version, design status and governance owner.
- participant_identity_ref — internal participant reference, verification state and consent references; no wallet address or private key.
- contribution_record — contribution description, attribution, evidence references and review state.
- recognition_record — recognition decision and rationale; explicitly non-monetary and non-transferable.
- service_entitlement — service, scope, limits, validity and revocation state; not a balance.
- external_network_catalogue — network name, public documentation reference, risk classification and verification timestamp.
- asset_design_proposal — alternative design, assumptions, unresolved questions and approval state; never an issued asset.
- governance_decision — decision maker, authority, evidence, reason, scope and effective date.
- audit_event — actor, action, target, reason, before/after state and correlation reference.

All records must carry clear design/preview labels. Do not add wallet, private_key, seed_phrase, deposit, withdrawal, transfer, broadcast, mint, burn, swap, payout, payment_intent, fiat ledger or on-chain transaction execution tables or endpoints as part of this work.

## 6. State model and controls

Use separate states for architecture, capability and authorisation:

- **DESIGN** — documented proposal only.
- **PREVIEW** — simulated or locally demonstrated behaviour only.
- **VERIFIED** — a specific non-financial function has passed defined tests.
- **APPROVED** — a named authority has approved a precisely scoped future activity.
- **LIVE** — prohibited unless every release gate and separate approval has been satisfied.

For Bitcoin and CEDARS Coin execution-related capabilities, default state is OFF. A parent Bitcoin Grid being mandatory does not override child capability restrictions. A child capability cannot be operationally enabled by changing a display label or by inheriting a parent state.

Any future approval must be explicit, scoped, independently reviewed and fail-closed. Approval for one activity does not authorise another (for example, research approval does not authorise wallet creation; a wallet design approval does not authorise key generation; key approval does not authorise transfers or broadcasting).

## 7. Prohibited actions under this specification

The following are expressly prohibited:
- Creating or importing Bitcoin or other cryptocurrency wallets.
- Generating, storing, viewing, transmitting or managing private keys, seed phrases or signing credentials.
- BTC or other crypto transfers, swaps, trades, deposits, withdrawals or payouts.
- Transaction construction, signing, broadcasting or relay.
- Token deployment, minting, burning, issuance, distribution or redemption.
- Live blockchain anchoring or production network writes.
- Fiat transactions, payment processing, settlement execution or member monetary balances.
- Exchange, custodian, bridge, payment-processor or wallet-provider connections for execution.
- Enabling financial execution or public launch.
- Claiming that any token, reserve, wallet, network integration or financial capability is operational.

Do not store secrets or request the user to paste secrets. Do not add live network RPC URLs, signing libraries, wallet SDKs, blockchain write clients, payment SDKs or transaction APIs.

## 8. API boundary — proposed contracts only

No endpoints are implemented or authorised by this document. If future Preview-only read APIs are proposed, they must be limited to non-sensitive design data, for example:

- GET /api/coin/program — design status and policy version.
- GET /api/coin/capabilities — capability catalogue and disabled states.
- GET /api/coin/contributions — authorised, privacy-filtered contribution records.
- GET /api/coin/recognition — non-monetary recognition history.
- GET /api/coin/entitlements — access entitlements, never monetary balances.
- GET /api/bitcoin/networks — curated external network research catalogue.
- GET /api/coin/governance — approvals, scope and evidence references.

Any future write API for contribution corrections or entitlement administration must be separately designed with authentication, RBAC, approval separation, reason capture, audit logging, validation, rate limits and tests. There must be no transfer, deposit, withdrawal, mint, burn, swap, payment or broadcast endpoint.

## 9. Automated AI-worker responsibilities

AI workers may eventually support the non-financial workflow:
1. Discover eligible service needs and contribution opportunities.
2. Match a task to authorised providers, AI tools or Grid capabilities.
3. Coordinate permitted work.
4. Collect completion evidence.
5. Verify evidence using defined policies and independent checks where required.
6. Propose contribution attribution or service entitlement changes.
7. Record decisions and audit references.

AI workers must not autonomously issue assets, create monetary claims, change token supply, transfer value, approve their own work, alter governance policy or execute blockchain/financial actions. High-impact recognition disputes and access decisions require a defined appeal and human-governance path. Human oversight is for governance, exceptions, safety and appeals; it does not redefine the ordinary Grid task workflow as manual work.

## 10. Governance and evidence gates before any future change

Before any move beyond Preview design, require all of the following as applicable:
- Written product purpose and participant rights.
- Legal and regulatory classification in every intended jurisdiction, including Uganda and any other target markets.
- Independent legal, tax, accounting, AML/CFT and consumer-protection review as applicable.
- Privacy impact assessment, data retention and deletion rules.
- Threat model and independent security review.
- Custody/key-management architecture review if custody is ever proposed.
- Tokenomics, supply, distribution, redemption and market-integrity review if an asset is ever proposed.
- Independent technical architecture review and test evidence.
- Explicit written approval for the exact capability and environment.
- Separate release acceptance; no LIVE status by assertion.

This specification does not conclude that CEDARS Coin is lawful to issue, that any licence is or is not required, or that a particular token model is suitable. Those questions require qualified jurisdiction-specific advice.

## 11. Acceptance criteria for this Preview architecture

The design is accepted for Preview documentation only when:
- CEDARS Coin is shown as a proposed capability under the mandatory Bitcoin Grid in CLOUD.
- Bitcoin Grid remains present regardless of its operational OFF state.
- The four CEDARS Coin functions are separately described and governed.
- Contribution recognition cannot be mistaken for money or a balance.
- Service entitlements cannot be mistaken for stored value or payment.
- External networks are described as independent systems.
- No Bitcoin backing, reserve, peg, issuance, redemption or financial value is claimed.
- The prohibited-action list is explicit.
- No wallet, key, transaction, token issuance, payment or live anchoring code is introduced.
- Financial execution remains OFF, production remains FROZEN and public launch remains OFF.

## 12. Open decisions — deliberately unresolved

The following are not decided:
- Whether CEDARS Coin will ever be an issued transferable asset.
- Whether any future asset would use Bitcoin-compatible technology or another network.
- Whether recognition remains permanently non-transferable.
- Whether service utility is represented solely by internal access entitlements.
- Whether there will be a supply cap, denomination, reserve, redemption or conversion mechanism.
- Which legal entities, jurisdictions and licences would be involved.

These questions must remain open until research, independent advice and explicit governance approval are complete.

---

**Current disposition:** CEDARS Coin™ combined model documented as a Preview-only design proposal. No token exists by virtue of this document. Bitcoin Grid is architecturally mandatory; Bitcoin and financial execution remain disabled.
