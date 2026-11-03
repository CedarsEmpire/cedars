# 30-Day Internal Pilot Checklist

## Objective
Run the CEDARS platform in a controlled internal pilot for 30 days, with the primary objective of verifying that Workers and Grids can complete real customer-paid work. The first independently reconciled paid delivery must occur by the end of Day 3. Operational health, user flows, financial safeguards, treasury observation, and launch readiness remain required.

The public launch switch remains OFF. The internal pilot switch may be ON for approved users only.

---

## Pilot gating model

### Launch switch state
- Public launch switch: OFF
- Internal pilot switch: ON
- Grid Tasks module switch: OFF by default; enable only for the approved pilot after the environment kill switch and exact tester allowlist are configured
- Pilot users: vetted internal staff and approved test users only
- Pilot scope: non-public, monitored, reversible

### Hard rules
- No public rollout during this pilot
- No open public announcements
- No unapproved financial settlement activity
- No automatic member-balance crediting without explicit approved workflow
- No public access to production-ready money logic before go-live sign-off
- Internal transfers, tester deposits, investment, or treasury movements do not count as customer revenue

## Blocking entry gate: real-money capability

### Pilot decisions to implement
- Customer payment rail: native TRX on TRON
- Worker payout: manual, human-approved payout; no automated payout execution
- Per-transaction and total pilot exposure limits: pending finance-owner decision; mainnet activation remains disabled until both finite limits are recorded

Proceed with implementation and isolated testing while the limits are being decided. Testnet activity does not satisfy the real customer-paid Day 3 target.

Do not start the 30-day clock or enable real-value transactions until all of these are implemented, tested, and approved for the exact pilot scope:
- [ ] A real buyer, written scope, price, acceptance criteria, and refund/dispute terms are documented
- [ ] Worker execution is connected and its output can be independently verified against the agreed criteria
- [ ] A payment provider records actual customer payment for accepted work; no simulated payment, manual balance credit, or tester-funded transaction counts
- [ ] Finance can reconcile customer receipts, provider fees, worker/grid costs, refunds, and net contribution against independent provider and bank records
- [ ] Per-transaction and aggregate exposure limits, dual approval, idempotency, audit evidence, exception handling, and an emergency stop are tested
- [ ] Finance, security, compliance, operations, and the accountable business owner approve the specific flow, limits, and Day 1-3 success criteria

The current API does not provide worker execution, payment intake, settlement, or payout. Until those capabilities and approvals exist, this gate is BLOCKED and the pilot cannot meet its stated objective.

---

## Pilot participation

### Roles involved
- Product owner
- Engineering lead
- Operations lead
- Finance owner
- Compliance reviewer
- Security reviewer
- Support lead
- Audit reviewer

### Pilot user population
- internal staff users
- operators
- support and admin users
- limited trusted testers
- no public users

---

## Daily validation checklist

### Day 1-3: Baseline and setup
- [ ] By the end of Day 3, complete at least one independently reconciled, real customer-paid delivery using the approved Worker/Grid flow
- [ ] Record gross customer receipts, payment fees, verified worker/grid costs, refunds or disputes, and net contribution; exclude deposits, investment, and internal transfers
- [ ] Confirm pilot users have role-based access only
- [ ] Confirm internal pilot switch is enabled
- [ ] Confirm Grid Tasks access is enabled only through the audited module switch, environment kill switch, and exact tester allowlist
- [ ] Confirm public launch switch is OFF
- [ ] Validate registration flow for pilot users
- [ ] Validate login and logout behavior
- [ ] Validate dashboard loads without errors
- [ ] Confirm audit logging is enabled
- [ ] Confirm treasury observation is read-only and non-settling
- [ ] Confirm no automatic balance crediting occurs
- [ ] Confirm all users have clear pilot status and restrictions
- [ ] If the real-money entry gate or Day 3 paid-delivery target is not met, pause the pilot clock and escalate; do not substitute a simulation or treasury transfer

### Day 4-7: Core user flows
- [ ] Test registration for each pilot role
- [ ] Validate dashboard readings for all panels
- [ ] Validate package browsing and selection
- [ ] Validate package data fields and pricing display
- [ ] Check status transitions across key workflow states
- [ ] Confirm failed states are handled cleanly
- [ ] Review incident logs daily
- [ ] Validate role restrictions and unauthorized access denial

### Day 8-14: Financial and treasury validation
- [ ] Test real customer-paid work within the transaction and aggregate limits approved before Day 1
- [ ] Reconcile processor receipts, fees, refunds, and disputes against independent financial records
- [ ] Verify recorded worker/grid costs and calculate net contribution for each completed paid task
- [ ] Confirm treasury observation remains read-only
- [ ] Confirm treasury observations do not create revenue records, settlement, or member balance credits
- [ ] Verify task and payment evidence is auditable and finance/compliance reviewers can access it
- [ ] Exercise approval, exception, refund, and pause procedures supported by the approved pilot flow

### Day 15-21: AI worker and grid operational checks
- [ ] Validate AI worker assignment flow
- [ ] Validate grid task lifecycle from open to assigned to in progress
- [ ] Validate audit entries for task assignment and status changes
- [ ] Confirm no real settlement occurs during task execution
- [ ] Verify all worker and grid states are visible and consistent
- [ ] Validate failure handling for rejected or incomplete tasks
- [ ] Check staff ability to stop or freeze operations if needed

### Day 22-27: Stability and resilience
- [ ] Test high-volume or repeated user actions
- [ ] Confirm dashboard remains stable under repeated reads
- [ ] Confirm no stale values or data drift across modules
- [ ] Validate support and admin workflows
- [ ] Check recovery from failed actions or partial updates
- [ ] Validate rollback path for blocked or rejected tasks
- [ ] Validate operational alerting and escalation process

### Day 28-30: Pilot closeout and review
- [ ] Confirm all critical flows have been tested
- [ ] Confirm no unresolved critical defects remain
- [ ] Confirm all exceptions are documented and remediated or accepted
- [ ] Confirm finance and treasury controls are safe
- [ ] Confirm compliance posture is acceptable
- [ ] Confirm all pilot users understand the pilot boundaries
- [ ] Prepare final pilot report and launch recommendation

## Checklist completion alert

Completing the checklist is a review trigger, not a command to stop the service, end the pilot automatically, or enable public access. Notify the operations, finance, compliance, and governance owners through the team's configured operational channel, record the completion evidence and decision in the pilot tracker and sign-off record, and keep the current access switches unchanged until authorized owners approve the next step. This repository does not currently deliver automated checklist-completion notifications.

---

## Weekly review checklist

### Weekly review 1 (Days 1-7)
- [ ] Registration and onboarding reliability
- [ ] Dashboard readings are correct
- [ ] No major permission issues
- [ ] No critical incidents
- [ ] Initial package testing status

### Weekly review 2 (Days 8-14)
- [ ] Treasury observation remains read-only
- [ ] Deposit/withdrawal controls remain safe
- [ ] Package tiers tested and reviewed
- [ ] Audit trail completeness reviewed

### Weekly review 3 (Days 15-21)
- [ ] AI worker and grid flow stability
- [ ] Task lifecycle integrity
- [ ] Role enforcement integrity
- [ ] Operational support readiness

### Weekly review 4 (Days 22-30)
- [ ] System reliability and resilience
- [ ] Business logic health
- [ ] Risk reduction progress
- [ ] Final evidence for launch decision

---

## Required evidence before public launch
The following evidence must exist before switching to public launch:

- [ ] pilot users completed assigned test scenarios
- [ ] registration results documented
- [ ] dashboard readings verified against expected states
- [ ] package tiers from $1 to $50,000 tested
- [ ] treasury observation reviewed and confirmed read-only
- [ ] no member balance crediting without approved settlement mechanism
- [ ] no unauthorized financial actions occurred
- [ ] audit logs reviewed and complete
- [ ] incidents and fixes documented
- [ ] finance and compliance sign-off recorded
- [ ] operations sign-off recorded
- [ ] launch readiness recommendation approved

---

## Go / No-Go decision gate

### Go decision requirements
The public launch switch may be turned ON only if:
- all critical user flows pass
- all pilot findings are addressed or accepted with documented mitigation
- no unresolved critical defects remain
- financial controls are proven safe
- treasury monitoring remains read-only and non-productive
- audit and approval workflows are reliable
- leadership signs off on launch

### No-Go requirements
Keep public launch OFF if:
- critical defects remain unresolved
- unauthorized financial action is possible
- balances or payouts are inconsistent
- audit logs are incomplete or suspect
- role-based security fails
- the platform is unstable or not operationally healthy

---

## Launch trigger
After the 30-day pilot is complete and the go criteria are satisfied, the launch team may separately authorize and audit a decision to switch:
- Public launch switch: ON
- Internal pilot switch: OFF or restricted to maintenance-only usage

Until then, all public access remains OFF.

---

## Final note
This checklist is designed to generate evidence before public rollout. It protects the platform, the community, and the business by ensuring the platform is proven healthy before the public launch switch is enabled.
