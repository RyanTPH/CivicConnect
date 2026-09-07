# CivicConnect — GitHub Engineering Control Setup

This folder contains the GitHub governance scaffolding for the CivicConnect
project (SEN381), built from the **Milestone 1 brief** and the
**Master Project Brief**. It gives you a ready-to-use, gh-cli-friendly set of
issue tickets, labels, PR template, and workflow documentation so that your
repository evidence starts accumulating from day one of Milestone 1.

## What's in here

```
civicconnect-github-setup/
├── README.md                          <- this file
├── labels.md                          <- label taxonomy + gh cli setup commands
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md       <- required PR template (two-reviewer model)
│   └── issue-tasks/                   <- one .md checklist per ticket (M1-01 ... M1-14)
└── docs/
    ├── git-workflow.md                <- branching model, commands, PR flow
    └── merge-conflict-resolution.md   <- step-by-step conflict resolution guide
```

## How to use this with your repo

1. Copy `.github/` and `docs/` into the root of your team repository (the
   structure matches Appendix C of the Master Project Brief).
2. Create the labels (see `labels.md`) and the four milestones in GitHub
   (`Milestone 1` … `Milestone 4`).
3. Create one GitHub Issue per ticket file using the `gh` CLI:

   ```bash
   gh issue create \
     --title "M1-04 — Functional Requirements & Acceptance Criteria" \
     --body-file .github/issue-tasks/M1-04-functional-requirements.md \
     --label "docs" --label "milestone-1" --label "priority-critical" \
     --milestone "Milestone 1"
   ```

4. Keep updating the checklist in the issue itself as work progresses — the
   `- [ ]` items render as tickable checkboxes on GitHub and give you the
   "authentic, progressive history" evidence the brief requires.

## Why every ticket is labelled the way it is

Per the brief's GitHub governance standard, every substantive piece of
engineering work — not just application code — must be visible in the
repository as issues, branches, commits and Pull Requests. So M1 tickets
cover **documentation and governance artefacts** (PED sections, RTM, Risk
Register, Decision Log, AI Usage Register, GitHub setup itself), because
these are the M1 deliverables, not application code.

Each ticket carries three label categories:

| Category | Example labels | Purpose |
|---|---|---|
| **Type** | `feature`, `docs`, `bug`, `chore`, `infra`, `test`, `research` | What kind of work this is |
| **Milestone** | `milestone-1`, `milestone-2`, `milestone-3`, `milestone-4` | Which project phase it belongs to / contributes to |
| **Priority** | `priority-critical`, `priority-high`, `priority-medium`, `priority-low` | Urgency/importance within the milestone |

This mirrors the uploaded task-checklist template's format (`# ID — Title`,
`## Tasks`, `## Acceptance Criteria`), with labels and priority added on top
as you requested.
