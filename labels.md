# Label Taxonomy & Setup Commands

CivicConnect uses three label dimensions on every issue: **type**, **milestone**,
and **priority**. All three must be applied to every ticket.

## 1. Type labels

| Label | Colour (hex) | Use for |
|---|---|---|
| `feature` | `#1D76DB` | New functionality (mostly M2–M4) |
| `docs` | `#0E8A16` | PED sections, registers, RTM, ADRs, working agreement |
| `bug` | `#D73A4A` | Defects found in implemented behaviour (M3–M4) |
| `chore` | `#C5DEF5` | Repo setup, tooling, housekeeping |
| `infra` | `#5319E7` | CI/CD, environments, deployment configuration |
| `test` | `#FBCA04` | Test design, test execution, quality evidence |
| `research` | `#BFD4F2` | Technology/architecture investigation, ADR groundwork |

## 2. Milestone labels

| Label | Meaning |
|---|---|
| `milestone-1` | Belongs to / contributes to M1 — Engineering Foundation & Requirements Baseline |
| `milestone-2` | Architecture, Design & Engineering Decisions |
| `milestone-3` | Controlled Construction, Integration, Quality & Release Readiness |
| `milestone-4` | Final Product, Project Success & Engineering Defence |

> Use the label **in addition to** GitHub's native "Milestone" field (Settings →
> Issues → Milestones), not instead of it. The label makes the phase visible
> in filters/boards; the native Milestone field gives you GitHub's built-in
> progress tracking. Create both.

## 3. Priority labels

| Label | Colour (hex) | Meaning |
|---|---|---|
| `priority-critical` | `#B60205` | Blocks baseline sign-off / gate decision if not done |
| `priority-high` | `#D93F0B` | Required for a complete, defensible M1 baseline |
| `priority-medium` | `#FBCA04` | Important but can slip a few days without blocking the gate |
| `priority-low` | `#C2E0C6` | Nice-to-have / polish |

## gh CLI setup commands

Run these once, from the repository root, after `gh auth login`:

```bash
# Type labels
gh label create feature   --color 1D76DB --description "New functionality"
gh label create docs      --color 0E8A16 --description "Documentation / engineering registers"
gh label create bug       --color D73A4A --description "Defect in implemented behaviour"
gh label create chore     --color C5DEF5 --description "Repo setup / housekeeping"
gh label create infra     --color 5319E7 --description "CI/CD, environments, deployment"
gh label create test      --color FBCA04 --description "Test design / execution / quality evidence"
gh label create research  --color BFD4F2 --description "Technology or architecture investigation"

# Milestone labels
gh label create milestone-1 --color 5319E7 --description "M1 - Engineering Foundation & Requirements Baseline"
gh label create milestone-2 --color 1D76DB --description "M2 - Architecture, Design & Engineering Decisions"
gh label create milestone-3 --color 0E8A16 --description "M3 - Controlled Construction, Integration, Quality & Release Readiness"
gh label create milestone-4 --color B60205 --description "M4 - Final Product, Project Success & Engineering Defence"

# Priority labels
gh label create priority-critical --color B60205 --description "Blocks baseline sign-off / gate decision"
gh label create priority-high     --color D93F0B --description "Required for a complete M1 baseline"
gh label create priority-medium   --color FBCA04 --description "Important, not gate-blocking"
gh label create priority-low      --color C2E0C6 --description "Nice-to-have / polish"

# Milestones (native GitHub milestone objects, not labels)
gh api repos/:owner/:repo/milestones -f title="Milestone 1" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Milestone 2" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Milestone 3" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Milestone 4" -f state="open"
```

Replace `:owner/:repo` with your actual `org/repo-name`, or run the commands
from inside the cloned repo where `gh` can infer it automatically.
