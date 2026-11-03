# Launch Readiness: 30-Day Internal Pilot and Public Launch Gate

## Purpose
This document defines the controlled launch-readiness workflow for the CEDARS platform.

The public launch switch remains OFF until the 30-day internal pilot passes all required health, compliance, operational, and financial controls.

The internal pilot switch may be ON for vetted users only during the testing window.

## Operating principle
The platform must not be treated as public-ready until the internal pilot confirms:
- system reliability
- user onboarding and access controls work as intended
- dashboard data is accurate and stable
- financial controls are safe and auditable
- treasury observation and reporting functions remain read-only and non-productive
- AI worker and grid workflows operate without unsafe or unauthorized actions
- the audit trail is complete and reviewable
- operations, finance, and compliance agree the platform is healthy enough for broader use

## Launch state model

### Public launch switch: OFF
This means:
- no public access
- no broad user access
- no public launch communications
- no public money flows or settlement activity
- internal operations only

### Internal pilot switch: ON
This means:
- restricted to approved internal/test users
- role-scoped access only
- limited package and financial test ranges
- monitored operation
- audit logging enabled
- compliance and operations review active

## 30-Day Internal Pilot

### Duration
30 days, with a review at the end of the period.

### Pilot user groups
- internal staff users
- vetted operators
- approved internal testers
- limited trusted community participants, if approved by leadership

### Pilot scope
The pilot will validate:
- registration and onboarding
- dashboard readings and state consistency
- package selection and use across pricing tiers
- deposit request flow under controlled conditions
- withdrawal request flow under review controls
- treasury observation and reconciliation
- grid and worker lifecycle functions
- audit creation and review
- access controls and role enforcement
- operational incident handling and rollback capability

### Test package tiers
The pilot should test the following package values:
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

Each package tier should be evaluated for:
- validation and acceptance
- dashboard display accuracy
- role-permission correctness
- processing flow integrity
- audit log completeness
- exception handling
- treasury traceability
- withdrawal review behavior

## Financial and treasury guardrails
The pilot must remain within safe financial boundaries.

The following rules apply:
- treasury observation remains read-only
- member balances are not automatically credited by observation
- no transaction signing or sending occurs in the pilot unless explicitly approved in a separate controlled settlement mechanism
- payable balances are not created automatically in the monitoring layer
- treasury data is used for monitoring, review, and control only
- all financial events must be logged and auditable

## Required daily checks
Each day during the pilot, the operations team should confirm:
- registration flow is healthy
- dashboard readings are accurate
- no missing or stale values appear
- role-based access behaves correctly
- package testing is progressing without error
- any withdrawal or deposit request is correctly classified and reviewed
- treasury observation data remains consistent
- AI worker and grid activities are logged and traceable
- no critical defects or unauthorized actions are observed

## Weekly review checkpoints
At the end of each week, the team should review:
- open incidences
- failed or incomplete flows
- user experience issues
- accounting or treasury anomalies
- security and authorization issues
- compliance concerns
- operational bottlenecks

## Go / No-Go review at day 30
At the end of the 30-day pilot, the platform must pass the following gate before the public launch switch can be turned ON:

### Go criteria
- all major user journeys pass under pilot conditions
- no critical defects remain open
- all key financial or treasury flows are safe and auditable
- package testing across the full range is complete and stable
- withdrawal and deposit handling has been tested under approval controls
- AI worker and grid task flows are stable and reviewable
- dashboard and audit data are accurate and complete
- operators and compliance staff agree the platform is safe

### No-Go criteria
If any of the following occur, the public switch remains OFF:
- critical production risk remains unresolved
- unauthorized financial action is possible
- treasury or balance mismatch occurs
- user account or role security is compromised
- a major workflow fails without a safe workaround
- audit or operational visibility is incomplete
- approval controls are not proven reliable

## Launch activation rule
Public launch is allowed only after:
1. the 30-day pilot ends successfully,
2. all required findings are corrected,
3. all go criteria are met,
4. finance, operations, and compliance sign off,
5. the public launch switch is explicitly turned ON.

Until that moment, the platform remains in controlled pilot mode.

## Final policy statement
The public launch switch must stay OFF until there is evidence that the platform is healthy, safe, and operationally ready. The 30-day internal pilot exists to generate that evidence and reduce the risk of exposing the platform before it is truly ready.
