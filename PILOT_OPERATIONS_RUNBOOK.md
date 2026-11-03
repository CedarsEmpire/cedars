# Pilot Operations Runbook

## Purpose
This runbook is the operational execution document for the 30-day internal pilot. It provides the day-to-day process, ownership model, review cadence, escalation path, and evidence required to decide whether the platform is ready for a public launch.

## Safety rule
The public launch switch remains OFF during the pilot.
The internal pilot switch may remain ON only for approved users and approved workflows.

---

## 1. Pilot start conditions
Before the pilot starts, all of the following must be confirmed:

- [ ] Public launch switch is OFF
- [ ] Internal pilot switch is ON
- [ ] Approved pilot users are identified
- [ ] Access roles are assigned and reviewed
- [ ] Daily monitoring is active
- [ ] Error and incident channels are active
- [ ] Audit logging is enabled
- [ ] Treasury observation is configured as read-only
- [ ] Finance and compliance are informed of the pilot scope
- [ ] Support and operations team are assigned

---

## 2. Pilot participants and owners

### Product owner
- owns the pilot goals
- reviews user journeys and release readiness
- signs off on milestone completion

### Engineering lead
- owns technical readiness and defects
- triages incidents and confirms corrective work
- verifies test evidence

### Operations lead
- owns monitoring, incident response, and shutdown decisions
- can pause or freeze the pilot at any time

### Finance owner
- oversees financial guardrails and treasury review
- validates safe handling of packages and settlement controls

### Compliance reviewer
- reviews policy controls and risk posture
- validates audit completeness and policy alignment

### Founder / Super Admin
- final operational authority
- can stop the pilot at any time
- approves launch gate decisions

---

## 3. Daily operation checklist

### Morning check-in
- [ ] Review overnight incidents
- [ ] Confirm health and status dashboards are green
- [ ] Check for new errors, failed tasks, or blocked flows
- [ ] Confirm all pilot users remain in allowed roles
- [ ] Confirm no unauthorized financial activity occurred

### Operational testing tasks
- [ ] Validate registration and login flows
- [ ] Review dashboard data for anomalies
- [ ] Check package creation and status flow
- [ ] Review treasury observation data
- [ ] Review audit trail for key actions
- [ ] Validate worker and task flow activity
- [ ] Confirm there are no blocked or missing approvals

### End-of-day closeout
- [ ] Record all incident findings
- [ ] Log the status of remediation work
- [ ] Record whether any restrictions were triggered
- [ ] Note any failed or incomplete test cases
- [ ] Prepare the next-day risk review

---

## 4. Weekly review cadence

### Weekly review 1: Days 1-7
Focus:
- registration and onboarding
- dashboard stability
- access control correctness
- launch readiness baseline

Required review:
- Product owner
- Engineering lead
- Operations lead
- Compliance reviewer

### Weekly review 2: Days 8-14
Focus:
- package validation across tiers
- treasury observation review
- occasional financial control tests
- support readiness

Required review:
- Product owner
- Finance owner
- Operations lead
- Compliance reviewer

### Weekly review 3: Days 15-21
Focus:
- AI workers and task lifecycle
- grid actions and state consistency
- incident handling and rollback proof

Required review:
- Engineering lead
- Operations lead
- Product owner
- Founder / Super Admin

### Weekly review 4: Days 22-30
Focus:
- risk reduction and remediation evidence
- final readiness check
- public launch decision and sign-off preparation

Required review:
- Product owner
- Engineering lead
- Operations lead
- Finance owner
- Compliance reviewer
- Founder / Super Admin

---

## 5. Testing matrix

### Core user flow testing
- [ ] registration
- [ ] login
- [ ] logout
- [ ] dashboard access
- [ ] user profile and state display
- [ ] role-based data visibility

### Package testing
Test the following values:
- $1
- $5
- $10
- $25
- $50
- $100
- $500
- $1,000
- $5,000
- $10,000
- $25,000
- $50,000

For each tier confirm:
- [ ] package appears correctly
- [ ] package metadata is valid
- [ ] status flow works
- [ ] restrictions are enforced
- [ ] audit record is created
- [ ] all users see the correct state

### Financial safety testing
- [ ] treasury observation remains read-only
- [ ] no member balance is credited automatically
- [ ] no disguised payout path is possible
- [ ] no withdrawal is processed without review
- [ ] approval controls are enforced
- [ ] all events are recorded in audit logs

### AI worker and task testing
- [ ] worker assignment success path
- [ ] task status transitions
- [ ] failure path and reversal behavior
- [ ] no unauthorized financial action from task execution
- [ ] proper audit record for each material action

---

## 6. Risk escalation rules

### Immediate freeze conditions
Pause the pilot immediately if any of the following occur:
- unauthorized financial action
- member balance inconsistencies
- audit log gaps or missing records
- critical service failure or platform outage
- role or access control bypass
- security incident affecting users or data

### Escalation path
- Operations lead -> Founder / Super Admin
- Engineering lead -> Founder / Super Admin
- Finance owner -> Founder / Super Admin + Compliance
- Compliance reviewer -> Founder / Super Admin

---

## 7. Evidence required for the launch gate
Before any public launch decision, the team must have:

- [ ] daily pilot log completed for all 30 days
- [ ] weekly review notes recorded and signed off
- [ ] package testing evidence for each tier
- [ ] treasury read-only validation evidence
- [ ] finance approval evidence
- [ ] audit log review evidence
- [ ] incident tracker reviewed and closed or documented
- [ ] launch gate sign-off from all required reviewers

---

## 8. Public launch gate
The public launch switch may be turned ON only if:
- the 30-day pilot has been completed
- all major processes are stable and validated
- no unresolved critical defects remain
- financial safeguards remain in place
- all required stakeholders approve the launch
- the Founder / Super Admin signs off

If any critical criterion fails, the platform remains in internal pilot mode and the public switch stays OFF.

---

## 9. Final operation note
This pilot is a live assurance process, not a public launch. The objective of the 30-day operational trial is to make the system healthier, safer, and more predictable before any broader release.
