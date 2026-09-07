# CivicConnect Git & GitHub Workflow

This is the team's controlled workflow for all substantive changes to
project artefacts — documentation and code alike — as required by the
Master Project Brief's GitHub Governance Standard (§9).

## Branching model

- `main` — protected. Always in a working / baseline-consistent state.
  No direct pushes for substantive changes.
- `feature/<ticket-id>-<short-description>` — one branch per ticket, e.g.
  `feature/M1-04-functional-requirements`, `feature/FR-012-request-status-api`.
- `fix/<ticket-id>-<short-description>` — for bug fixes.
- `docs/<ticket-id>-<short-description>` — for documentation-only changes
  where you want that distinction visible in branch history.

Keep branches short-lived. Merge or close them once the PR is merged.

## 1. One-time setup (each team member, once)

```bash
git clone https://github.com/<org>/<repo>.git
cd <repo>
git config user.name  "Your Name"
git config user.email "your.email@example.com"
```

## 2. Starting work on a ticket

```bash
# Always branch off an up-to-date main
git checkout main
git pull origin main

# Create your feature branch
git checkout -b feature/M1-04-functional-requirements
```

## 3. Working and committing

Commit small, meaningful units of work. Reference the ticket ID in every
commit message so repository history is traceable back to a ticket.

```bash
git add docs/requirements/functional-requirements.md
git commit -m "M1-04: draft FR-001 to FR-006 with acceptance criteria"
```

Push your branch regularly (this is how progressive, authentic history
gets built — don't wait until the branch is "finished"):

```bash
git push -u origin feature/M1-04-functional-requirements
```

## 4. Keeping your branch up to date

Before opening a PR, and periodically during longer-lived work, bring your
branch up to date with `main` to reduce the size of any eventual conflict:

```bash
git checkout main
git pull origin main
git checkout feature/M1-04-functional-requirements
git merge main
# resolve any conflicts now (see merge-conflict-resolution.md), then:
git add .
git commit -m "Merge main into feature/M1-04-functional-requirements"
git push
```

(If your team prefers rebasing instead of merging for a cleaner history,
see the note at the bottom of `merge-conflict-resolution.md`.)

## 5. Opening a Pull Request

```bash
gh pr create \
  --base main \
  --head feature/M1-04-functional-requirements \
  --title "M1-04: Functional Requirements & Acceptance Criteria" \
  --body-file .github/PULL_REQUEST_TEMPLATE.md \
  --label "docs" --label "milestone-1" --label "priority-critical"
```

Or open it via the GitHub web UI — the PR template will be pre-filled
automatically. Link the issue in the PR description (`Closes #<issue-number>`).

## 6. Review and approval

- Minimum **two approvals**, from team members other than the author.
- Self-approval is disabled at the repository level.
- Reviewers should genuinely evaluate the change against the PR checklist —
  rubber-stamping ("LGTM" with no comments on a substantial change) may
  receive no credit per the brief.

```bash
# As a reviewer
gh pr view <PR_NUMBER>
gh pr diff <PR_NUMBER>
gh pr review <PR_NUMBER> --approve --body "Checked FR-001–006 against stakeholder register, acceptance criteria are testable. Approved."
```

If changes are requested:

```bash
gh pr review <PR_NUMBER> --request-changes --body "FR-003 acceptance criteria isn't measurable yet — see comment."
```

The author addresses feedback with new commits on the same branch (they
push automatically to the same PR), then requests re-review:

```bash
git add .
git commit -m "M1-04: rework FR-003 acceptance criteria to be measurable"
git push
```

## 7. Merging

Once two approvals are in and checks pass:

```bash
gh pr merge <PR_NUMBER> --merge   # or --squash / --rebase per team convention
```

Delete the branch after merge to keep things tidy:

```bash
git branch -d feature/M1-04-functional-requirements
git push origin --delete feature/M1-04-functional-requirements
```

## 8. Syncing after merge

Everyone updates their local `main` after any merge:

```bash
git checkout main
git pull origin main
```

## 9. Tagging a baseline (e.g. PED v1.0)

```bash
git checkout main
git pull origin main
git tag -a ped-v1.0 -m "PED v1.0 baseline sign-off — Milestone 1"
git push origin ped-v1.0
```

## Quick command reference

| Action | Command |
|---|---|
| Update local main | `git checkout main && git pull origin main` |
| New branch | `git checkout -b feature/<ticket-id>-<desc>` |
| Stage changes | `git add <file>` or `git add .` |
| Commit | `git commit -m "<ticket-id>: <what changed>"` |
| Push new branch | `git push -u origin <branch-name>` |
| Push existing branch | `git push` |
| Bring main into your branch | `git merge main` |
| Open PR | `gh pr create --base main --head <branch> --title "..." --body-file .github/PULL_REQUEST_TEMPLATE.md` |
| Approve PR | `gh pr review <PR_NUMBER> --approve` |
| Merge PR | `gh pr merge <PR_NUMBER> --merge` |
| Tag baseline | `git tag -a <tag> -m "<message>" && git push origin <tag>` |

If you hit a conflict at any of the `pull`, `merge`, `rebase` or `push`
steps above, stop and follow `docs/merge-conflict-resolution.md`.
