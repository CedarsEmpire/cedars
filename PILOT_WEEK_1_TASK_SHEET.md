# Pilot Week 1 Task Sheet

## Scope
The first week of the 30-day internal pilot focuses on baseline system health, user access integrity, dashboard reliability, and initial operational readiness evidence.

Public launch remains OFF.
Internal pilot remains ON only for approved users.

---

## Owners
- Product owner: ____________________
- Engineering lead: ____________________
- Operations lead: ____________________
- Finance owner: ____________________
- Compliance reviewer: ____________________
- Founder / Super Admin: ____________________

---

## Day 1: Pilot start and environment verification

### Required actions
- [ ] Confirm public launch switch is OFF
- [ ] Confirm internal pilot switch is ON for approved users only
- [ ] Confirm approved pilot users and roles are assigned
- [ ] Confirm support and escalation channels are active
- [ ] Confirm audit logging is enabled
- [ ] Confirm treasury observation remains read-only
- [ ] Confirm no automatic member balance credits are active
- [ ] Confirm all teams understand the pilot restrictions

### Sign-off
- Product owner: ________________
- Engineering lead: ________________
- Operations lead: ________________
- Founder / Super Admin: ________________

---

## Day 2: Registration and login validation

### Required actions
- [ ] Validate registration flow for each approved role
- [ ] Validate login flow for each approved role
- [ ] Validate logout and session expiry behavior
- [ ] Validate denied access for unauthorized users
- [ ] Check whether any role can access admin-only functions
- [ ] Confirm audit log records registration and authentication events

### Findings
- Issues found: ______________________________________________________
- Fixed: Yes / No
- Responsible owner: _________________________________________________

---

## Day 3: Dashboard integrity review

### Required actions
- [ ] Validate dashboard loads for each approved role
- [ ] Check package, worker, grid, and treasury panels for expected values
- [ ] Confirm no missing or stale values are visible
- [ ] Confirm access controls match role assignments
- [ ] Validate any error states behave safely and do not expose protected data

### Findings
- Issues found: ______________________________________________________
- Fixed: Yes / No
- Responsible owner: _________________________________________________

---

## Day 4: Package validation

### Required actions
- [ ] Test package display for $1, $5, $10, $25, $50, $100, $500
- [ ] Verify package metadata and state rules are correct
- [ ] Validate package restrictions and approval logic
- [ ] Confirm package lifecycle is auditable
- [ ] Confirm no package creation path bypasses controls

### Findings
- Issues found: ______________________________________________________
- Fixed: Yes / No
- Responsible owner: _________________________________________________

---

## Day 5: Treasury observation and financial guardrail review

### Required actions
- [ ] Confirm treasury observation remains read-only
- [ ] Confirm only observation and review activity occurs
- [ ] Confirm no member balance is credited automatically
- [ ] Confirm no settlement or payout path is active without approval
- [ ] Confirm treasury events are recorded in the audit log
- [ ] Validate finance review and compliance visibility

### Findings
- Issues found: ______________________________________________________
- Fixed: Yes / No
- Responsible owner: _________________________________________________

---

## Day 6: AI worker and grid workflow validation

### Required actions
- [ ] Validate AI worker assignment flow
- [ ] Validate task lifecycle from open to assigned/in-progress
- [ ] Validate worker and grid status transitions
- [ ] Confirm no unauthorized financial activity occurs as part of worker or grid actions
- [ ] Confirm all actions are auditable

### Findings
- Issues found: ______________________________________________________
- Fixed: Yes / No
- Responsible owner: _________________________________________________

---

## Day 7: Weekly review and next actions

### Required review
- [ ] Review all issues recorded during the week
- [ ] Confirm which issues are resolved and which remain open
- [ ] Confirm there are no critical unresolved blockers
- [ ] Confirm pilot safety conditions remain valid
- [ ] Approve next week’s scope and testing priorities

### Weekly sign-off
- Product owner: ____________________
- Engineering lead: ____________________
- Operations lead: ____________________
- Finance owner: ____________________
- Compliance reviewer: ____________________
- Founder / Super Admin: ____________________

### Final Week 1 status
- [ ] Safe to continue pilot
- [ ] Pause and fix issues before continuing
- [ ] Escalate to leadership due to material risk

---

## Week 1 summary log
- Major findings: ______________________________________________________
- Corrective actions completed: _________________________________________
- Outstanding issues: __________________________________________________
- Decision for next week: ________________________________________________
