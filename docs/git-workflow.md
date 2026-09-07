# CivicConnect Git & GitHub Workflow

This is the team's controlled workflow for all substantive changes to
project artefacts — documentation and code alike — as required by the
Master Project Brief's GitHub Governance Standard (§9).

CivicConnect uses **two-tier trunk-based development**:

- **Tier 1 — `main`**: the deployment trunk. Always reflects what has been
  validated and is ready to be released/demonstrated. This is what an
  assessor or a real user would see running.
- **Tier 2 — `staging`**: the integration/testing trunk. This is where all
  short-lived branches land first, get integrated together, and get
  verified before anything is promoted to `main`.

Short-lived feature/fix/docs branches are still used exactly as before —
they just target `staging`, not `main`. `main` only ever receives changes
via a controlled **promotion** from `staging`, never directly from a
feature branch.

```
feature/M1-04-... ─┐
fix/BUG-012-...    ─┼──▶  staging  ──▶ (validate)  ──▶  main
docs/RISK-003-...  ─┘        ▲
                              │
                    short-lived branches
                    branch off staging,
                    PR back into staging
```

## Branching model

**Tier 1 — `main` (deployment trunk)**
- Protected. No direct pushes, ever.
- Only updated via a **promotion PR** from `staging` (see Step 8).
- Every promotion requires the same two-approval rule, plus confirmation
  that `staging` has been tested/validated (build passes, walkthrough done,
  no known-broken state).
- Tags mark controlled baselines and releases (`ped-v1.0`, `release-m3`, etc.)
  and are always applied on `main`.

**Tier 2 — `staging` (integration/testing trunk)**
- Also protected. No direct pushes for substantive changes.
- Receives short-lived branches via PR, same two-approval rule.
- Expected to be *mostly* stable but is allowed to be a work-in-progress —
  this is where integration issues and test failures get caught before
  they ever reach `main`.

**Short-lived working branches**
- Branch off `staging` (not `main`): `feature/<ticket-id>-<desc>`,
  `fix/<ticket-id>-<desc>`, `docs/<ticket-id>-<desc>`.
- One branch per ticket. Lifetime target 1–2 days, hard cap ~3 days — split
  large tickets into smaller ones rather than letting a branch drift.
- Rebase onto `staging` frequently (daily) so they never drift far.
- Deleted immediately after merge.

## 1. One-time setup (each team member, once)

```bash
git clone https://github.com/<org>/<repo>.git
cd <repo>
git config user.name  "Your Name"
git config user.email "your.email@example.com"

# make sure you have a local tracking branch for staging too
git checkout -b staging origin/staging
git checkout main
```

## 2. Starting work on a ticket

```bash
# Always branch off an up-to-date staging — NOT main
git checkout staging
git pull origin staging

# Create your working branch
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

## 4. Keeping your branch up to date (do this daily)

Rebase onto `staging` — not `main` — since that's what your branch will
merge back into:

```bash
git checkout staging
git pull origin staging
git checkout feature/M1-04-functional-requirements
git rebase staging
# resolve any conflicts now if they appear (see merge-conflict-resolution.md):
#   fix the file, then:
git add <resolved-file>
git rebase --continue
# once the rebase finishes cleanly:
git push --force-with-lease
```

> `--force-with-lease` (never plain `--force`) is required after a rebase
> because it rewrites your branch's history. Safe on your own short-lived
> branch — never on `staging` or `main`.

## 5. Opening a Pull Request into `staging`

```bash
gh pr create \
  --base staging \
  --head feature/M1-04-functional-requirements \
  --title "M1-04: Functional Requirements & Acceptance Criteria" \
  --body-file .github/PULL_REQUEST_TEMPLATE.md \
  --label "docs" --label "milestone-1" --label "priority-critical"
```

Or open it via the GitHub web UI — just make sure the base branch is set to
`staging`, not `main`. Link the issue in the PR description
(`Closes #<issue-number>`).

## 6. Review and approval

- Minimum **two approvals**, from team members other than the author.
- Self-approval is disabled at the repository level.
- Reviewers should genuinely evaluate the change against the PR checklist —
  rubber-stamping ("LGTM" with no comments) may receive no credit per the
  brief.

```bash
gh pr view <PR_NUMBER>
gh pr diff <PR_NUMBER>
gh pr review <PR_NUMBER> --approve --body "Checked FR-001–006 against stakeholder register, acceptance criteria are testable. Approved."
```

If changes are requested:

```bash
gh pr review <PR_NUMBER> --request-changes --body "FR-003 acceptance criteria isn't measurable yet — see comment."
```

The author addresses feedback with new commits on the same branch, then
requests re-review:

```bash
git add .
git commit -m "M1-04: rework FR-003 acceptance criteria to be measurable"
git push
```

## 7. Merging into `staging`

Once two approvals are in and checks pass, squash-merge into `staging`:

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

`--delete-branch` removes the remote working branch automatically.

## 8. Promoting `staging` to `main`

This is the controlled release/deployment step, done deliberately — not on
every merge into staging, but once staging has been tested and is in a
state you're willing to stand behind (e.g. before a milestone
demonstration, or after a batch of tickets is verified together).

```bash
# make sure staging is up to date and has been tested/validated first
git checkout staging
git pull origin staging

# open a promotion PR
gh pr create \
  --base main \
  --head staging \
  --title "Promote staging to main — [reason, e.g. M1 baseline ready]" \
  --body "Validated: build passes, walkthrough complete, no known-broken state. Promoting for [milestone/demo/release]."
```

This promotion PR still needs **two approvals** before merging. Once
approved:

```bash
gh pr merge <PR_NUMBER> --merge
```

> Use a regular merge commit (not squash) for the promotion PR — you want
> `main`'s history to clearly show "staging, as validated on this date, was
> promoted", preserving the individual squashed ticket commits underneath it.

## 9. Syncing after any merge

Everyone updates their local branches after any merge:

```bash
git checkout staging
git pull origin staging
git checkout main
git pull origin main
```

## 10. Tagging a baseline (e.g. PED v1.0)

Tags always go on `main`, after a promotion:

```bash
git checkout main
git pull origin main
git tag -a ped-v1.0 -m "PED v1.0 baseline sign-off — Milestone 1"
git push origin ped-v1.0
```

## Quick command reference

| Action | Command |
|---|---|
| Update local staging | `git checkout staging && git pull origin staging` |
| Update local main | `git checkout main && git pull origin main` |
| New working branch (off staging) | `git checkout staging && git pull && git checkout -b feature/<ticket-id>-<desc>` |
| Stage changes | `git add <file>` or `git add .` |
| Commit | `git commit -m "<ticket-id>: <what changed>"` |
| Push new branch | `git push -u origin <branch-name>` |
| Rebase branch onto staging (daily) | `git checkout staging && git pull && git checkout <branch> && git rebase staging` |
| Push after rebase | `git push --force-with-lease` |
| Open PR into staging | `gh pr create --base staging --head <branch> --title "..." --body-file .github/PULL_REQUEST_TEMPLATE.md` |
| Approve PR | `gh pr review <PR_NUMBER> --approve` |
| Merge PR into staging | `gh pr merge <PR_NUMBER> --squash --delete-branch` |
| Promote staging → main | `gh pr create --base main --head staging --title "Promote staging to main"` then `gh pr merge <PR_NUMBER> --merge` |
| Tag baseline (on main) | `git tag -a <tag> -m "<message>" && git push origin <tag>` |

If you hit a conflict at any of the `pull`, `rebase`, `merge` or `push`
steps above, stop and follow `docs/merge-conflict-resolution.md`.
