# Role and Approval Matrix for the 30-Day Pilot and Launch Gate

## Purpose
This document defines who can approve, restrict, review, or trigger changes during the 30-day internal pilot and the public launch decision process.

The guiding principle is simple:
- public launch stays OFF until the evidence is complete
- no financial action moves without approval
- every material action is reviewed and auditable

The API currently enforces independent approvals for module activation, worker enable/scale-up, and grid transitions to WORKING. These are control-plane approvals only: payments, settlement, and payouts are not implemented. The approval workflow does not provide identity verification, sanctions screening, transaction monitoring, or other AML controls.

---

## Core decision model

### Public launch switch
- Default state: OFF
- Can be toggled ON only after the end-of-pilot go/no-go review passes
- Requires approval from product, operations, finance, compliance, and leadership

### Internal pilot switch
- Default state: ON during the pilot window for approved users only
- Can be turned OFF at any time by operations or leadership
- Used to restrict access while the system is still being validated

---

## Roles and authority

### 1. User / Participant
Authority:
- can register and use the platform in pilot mode
- can complete approved workflows within their assigned scope
- cannot change operational state, package policy, treasury controls, or access roles

Restrictions:
- no admin functions
- no financial approval authority
- no direct treasury or settlement controls
- no control over the public launch switch

### 2. Support / Operations
Authority:
- monitor service health and incident status
- pause or restrict users or features in response to operational risk
- coordinate rollback or freezing when necessary
- manage everyday pilot support

Restrictions:
- cannot unilaterally approve public launch
- cannot override finance/compliance controls for financial actions

### 3. Product Owner
Authority:
- owns pilot scope and release objectives
- approves user journey validation and workflow prioritization
- confirms milestone completion and readiness evidence
- recommends whether the pilot is ready for broader rollout

Restrictions:
- cannot bypass security, compliance, or financial controls
- cannot trigger public launch alone

### 4. Engineering Lead
Authority:
- owns technical health and platform reliability
- approves fixes and production readiness evidence
- can declare technical blockers that maintain the pilot or stop rollout
- can advise whether the system is stable enough for expansion

Restrictions:
- cannot approve public launch without review from finance, operations, and compliance

### 5. Finance Owner
Authority:
- reviews package policy and financial controls
- validates treasury observation and settlement logic
- approves or rejects financial actions requiring payment or payout paths
- confirms that settlement logic is safe and auditable

Restrictions:
- cannot approve public launch without operational and compliance sign-off
- cannot permit automatic payout logic without approval and controls in place

### 6. Compliance Reviewer
Authority:
- reviews policy compliance, risk, and audit posture
- verifies user protections and financial safeguards
- confirms that the platform meets internal and external regulatory obligations as applicable
- can require remediation before launch approval

Restrictions:
- cannot bypass required operational or finance controls
- has veto authority in material compliance risk cases

### 7. Founder / Super Admin
Authority:
- highest operational authority during pilot and launch phases
- can pause or withdraw the pilot at any time
- can approve or reject launch progression
- can trigger emergency freeze of platform activities if risk is material

Restrictions:
- should not override documented guardrails or audit controls without formal review
- must ensure public launch is based on documented evidence

---

## Decision rights matrix

### Registration and access
- User onboarding: Product + Engineering
- Role assignment: Founder / Super Admin + Security/Compliance review as required
- User suspension: Support + Founder / Super Admin

### Pilot controls
- Enable / disable pilot mode: Founder / Super Admin + Operations
- User access restrictions: Operations + Founder / Super Admin
- Issue freeze: Founder / Super Admin + Operations
- Module activation, worker enable/scale-up, or grid WORKING: requesting Founder / Super Admin plus the other platform-admin role; the requester cannot approve
- Safe reductions and emergency OFF / STANDBY / MAINTENANCE: immediate and audited

### Packages and testing
- Package creation rules: Product + Finance
- Package tiers and validation: Product + Finance
- Financial approval workflow: Finance + Compliance + Founder / Super Admin

### Treasury and settlement
- Treasury observation: Operations + Finance
- Settlement approval: Finance + Compliance + Founder / Super Admin
- Treasury freeze: Founder / Super Admin + Operations + Compliance

Settlement approval describes a required future workflow; no settlement or payout endpoint currently exists. Financial module activation remains disabled. Do not treat platform-control approvals as AML screening or transaction authorization.

### AI workers and tasks
- Worker assignment policy: Product + Operations
- Task approval or rejection: Product + Operations
- Operational freeze for AI actions: Founder / Super Admin + Operations

### Launch decision
- Pilot go/no-go decision: Product + Engineering + Operations + Finance + Compliance + Founder / Super Admin
- Public launch activation: Founder / Super Admin + Product + Operations + Finance + Compliance

---

## Approval workflow for the pilot

### Step 1: Internal pilot start
Required approval:
- Product owner
- Engineering lead
- Operations lead
- Founder / Super Admin

### Step 2: Weekly pilot review
Required input:
- Engineering: technical health
- Operations: incidents and service stability
- Finance: treasury and financial control review
- Compliance: policy / risk review
- Product: user flow and business impact review

### Step 3: Day 30 go / no-go decision
Required reviewers:
- Product owner
- Engineering lead
- Operations lead
- Finance owner
- Compliance reviewer
- Founder / Super Admin

### Step 4: Public launch gate
Required authorization:
- Product sign-off
- Engineering sign-off
- Operations sign-off
- Finance sign-off
- Compliance sign-off
- Founder / Super Admin final approval

Only after all required sign-offs are complete may the public launch switch be turned ON.

---

## Mandatory control rules
1. Public launch remains OFF until the launch gate is passed.
2. No financial action proceeds without finance and compliance review where required.
3. No automatic payout or balance credit is allowed without documented approval.
4. No user can change system or launch state without clear permissions.
5. Every material action must be logged for audit and review.
6. Operations or founder authority may pause the platform at any time when risk is identified.

---

## Final rule
The pilot is built to generate evidence. The public launch is not a default next step; it is a gated decision secured by role-based approvals and operational proof.
