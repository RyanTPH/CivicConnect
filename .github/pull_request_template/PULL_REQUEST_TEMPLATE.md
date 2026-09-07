## Summary

<!-- What does this PR change, and why? One or two sentences. -->

## Linked issue / ticket

Closes #<!-- issue number, e.g. Closes #12 -->

Ticket ID (e.g. M1-04 / FR-003 / RISK-002 / ADR-001): 

## PR type

- [ ] Regular ticket PR — working branch → `staging` (the normal case)
- [ ] Promotion PR — `staging` → `main` (validated, ready to deploy/demo)

If this is a promotion PR, confirm before merging:
- [ ] `staging` build/checks pass
- [ ] Manual walkthrough of the change(s) being promoted has been done
- [ ] No known-broken state is being promoted to `main`

## Milestone

- [ ] Milestone 1
- [ ] Milestone 2
- [ ] Milestone 3
- [ ] Milestone 4

## Type of change

- [ ] `feature` — new functionality
- [ ] `docs` — PED / register / RTM / ADR / other documentation
- [ ] `bug` — defect fix
- [ ] `chore` — repo/tooling housekeeping
- [ ] `infra` — CI/CD, environment, deployment configuration
- [ ] `test` — test design or execution evidence

## What changed

<!-- Bullet list of concrete changes. Be specific enough for a reviewer
     to know what to look at without re-reading the whole diff cold. -->

-
-

## Evidence / how this was verified

<!-- e.g. build passed locally, tests added/updated and passing, manual
     walkthrough steps, screenshots, links to test output. If this is a
     documentation change, note who reviewed it and against which standard
     (e.g. Master Project Brief §11 Requirements Standard). -->

## Traceability

- Requirement(s) affected: <!-- FR-xxx / NFR-xxx -->
- Risk(s) affected: <!-- RISK-xxx -->
- Decision(s) affected: <!-- DEC-xxx / ADR-xxx -->
- RTM updated: yes / no / not applicable

## AI usage disclosure

- [ ] No material AI assistance was used for this change
- [ ] Material AI assistance was used and is recorded in the AI Usage Register (entry date/row: ______)

If AI assistance was used, briefly state what was verified, changed or rejected:

## Reviewer checklist (for the two required reviewers)

- [ ] Change aligns with the linked requirement/acceptance criteria
- [ ] No secrets, credentials or sensitive data committed
- [ ] Documentation/traceability impact considered (RTM, Risk Register, Decision Log updated if needed)
- [ ] Tests/build pass where applicable
- [ ] This review is independent — I am not the author and have not rubber-stamped this
- [ ] I am satisfied this is ready to merge into `main`

## Pre-merge requirements

- [ ] At least **two** approvals from reviewers other than the author
- [ ] All review comments resolved or explicitly deferred with rationale
- [ ] Branch is up to date with `main` (rebased or merged) and conflicts resolved
