# Pilot Issue Log

## Purpose
This log records all issues found during the 30-day internal pilot. Every issue must be assigned to an owner, given a severity, and tracked until closure or executive acceptance.

- Public launch switch: OFF
- Internal pilot switch: ON for approved users only

---

## Issue tracking summary
- Total issues logged: 3
- Critical issues: 1
- High issues: 2
- Medium issues: 0
- Low issues: 0
- Resolved issues: 0
- Open issues: 3

---

## Issue entry template

### Issue 1
- Date found: 2026-11-03
- Title: Production preflight blocked by example database URL
- Severity: High
- Workstream: Operations
- Description: `npm run prod:check` stopped before network checks because `DATABASE_URL` still appears to contain an example value. The production database, identity provider, and migration state remain unverified.
- Impact: Production configuration and connectivity readiness cannot be established.
- Owner: Engineering lead
- Required fix: Configure reviewed production settings in the secure production environment, then rerun the preflight without exposing credentials.
- Status: Open
- Resolution date: Not resolved
- Final notes: No database or identity-provider requests were made by the failed preflight.

### Issue 2
- Date found: 2026-11-03
- Title: Worker and grid runtimes are not connected
- Severity: Critical
- Workstream: AI Worker / Grid
- Description: Production runtime mode reports workers as `NOT_CONNECTED` and grids as `NOT_CONNECTED` with integrations `NOT_CONFIGURED`. ON/OFF updates change audited desired configuration only; they do not start or stop real workers or grid integrations.
- Impact: Full operational readiness and safe ON/OFF behavior cannot be validated; setting desired state to ON would not make these systems operational.
- Owner: Engineering lead
- Required fix: Implement and independently review the worker/grid runtime integrations, then test activation, shutdown, failure handling, and audit evidence in an isolated environment before any production pilot.
- Status: Open
- Resolution date: Not resolved
- Final notes: Keep public launch OFF. Live worker/grid switch state could not be inspected because production configuration is unavailable. The seed initializes missing worker rows as disabled and grid rows as STANDBY, but `skipDuplicates` leaves existing rows unchanged.

### Issue 3
- Date found: 2026-11-03
- Title: Public access boundary is not verified
- Severity: High
- Workstream: Access / Operations
- Description: The application repository has no public-launch switch in its API or console, and the production deployment's access-protection settings are unavailable for inspection.
- Impact: The documented requirement that public access remain OFF cannot be verified from this workspace.
- Owner: Operations lead
- Required fix: Verify deployment-level access protection and the approved tester allowlist, then test that unauthenticated and non-allowlisted users cannot reach the application or APIs.
- Status: Open
- Resolution date: Not resolved
- Final notes: Do not announce or widen access; keep deployment protection enabled until verified and signed off.

### Issue 4
- Date found: ____________________
- Title: ____________________
- Severity: Critical / High / Medium / Low
- Workstream: Access / Dashboard / Package / Treasury / AI Worker / Grid / Compliance / Operations
- Description: ______________________________________________________
- Impact: ____________________________________________________________
- Owner: ____________________
- Required fix: ______________________________________________________
- Status: Open / In progress / Resolved / Accepted risk
- Resolution date: ____________________
- Final notes: ______________________________________________________

### Issue 5
- Date found: ____________________
- Title: ____________________
- Severity: Critical / High / Medium / Low
- Workstream: Access / Dashboard / Package / Treasury / AI Worker / Grid / Compliance / Operations
- Description: ______________________________________________________
- Impact: ____________________________________________________________
- Owner: ____________________
- Required fix: ______________________________________________________
- Status: Open / In progress / Resolved / Accepted risk
- Resolution date: ____________________
- Final notes: ______________________________________________________

---

## Critical issue closure rule
Any critical issue must be:
- fixed or mitigated,
- re-tested,
- documented,
- reviewed by the relevant owners,
- approved before the pilot continues.

---

## Final status
- [ ] No critical issues remain open
- [ ] Remaining issues are accepted risk or scheduled for resolution
- [ ] Pilot can continue safely
- [ ] Launch remains OFF until final sign-off
