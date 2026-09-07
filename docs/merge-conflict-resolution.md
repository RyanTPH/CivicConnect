# Resolving Merge Conflicts

A merge conflict just means Git found changes on two branches that touch the
same lines (or the same file, in ways it can't automatically combine) and
needs a human to decide the correct result. It is a normal part of team
work, not a mistake — stay calm, work through it methodically, and don't
force-push over a teammate's history to make it disappear.

## When you'll see this

- Running `git pull` and your local branch has diverged from the remote.
- Running `git merge main` into your feature branch.
- Running `git push` and being rejected because the remote has commits you
  don't have locally (this itself is not a conflict yet — see Case A below).

---

## Case A — `git push` is rejected ("fetch first" / "non-fast-forward")

This means someone else pushed to the branch since you last pulled. Git is
protecting you from overwriting their work. This is **not yet** a conflict —
resolve it by pulling first:

```bash
git pull origin <branch-name>
```

If the pull merges cleanly, `git push` again. If the pull itself produces a
conflict, go to Case B.

## Case B — `git pull` or `git merge` reports a conflict

```bash
git pull origin main
# or
git merge main
```

Git will tell you which files are conflicted:

```
Auto-merging docs/requirements/functional-requirements.md
CONFLICT (content): Merge conflict in docs/requirements/functional-requirements.md
Automatic merge failed; fix conflicts and then commit the result.
```

### Step 1 — See what's conflicted

```bash
git status
```

Conflicted files are listed under "Unmerged paths".

### Step 2 — Open each conflicted file and look for conflict markers

```
<<<<<<< HEAD
Your version of the content (what's currently on your branch)
=======
Their version of the content (what's coming in from the other branch)
>>>>>>> main
```

- `<<<<<<< HEAD` down to `=======` is **your** side.
- `=======` down to `>>>>>>> main` (or the other branch name) is **their** side.

### Step 3 — Decide the correct combined content

For most CivicConnect artefacts (PED sections, RTM, Risk Register, FR/NFR
lists), the right answer is usually **keep both sets of information**,
merged sensibly — e.g. if you both added different requirement rows to the
same table, keep both rows, renumber IDs if they collided, and delete the
conflict markers entirely. For code, decide which logic is correct, or
combine both changes if they aren't mutually exclusive.

Edit the file so the final version contains no `<<<<<<<`, `=======`, or
`>>>>>>>` markers anywhere.

> Tip: if a table-based artefact (RTM, Risk Register, FR/NFR list) keeps
> conflicting because two people edit it at once, agree as a team to assign
> one owner per section, or split it into per-owner sub-files, to reduce
> future conflicts.

### Step 4 — Mark the file as resolved

```bash
git add docs/requirements/functional-requirements.md
```

Repeat Steps 2–4 for every conflicted file, then confirm nothing is left:

```bash
git status
```

### Step 5 — Complete the merge

```bash
git commit -m "Resolve merge conflict: combine FR additions from both branches"
```

(If you ran `git pull`, the commit step may already be prompted for you —
Git opens your editor with a default merge message; save and close it.)

### Step 6 — Verify before pushing

Rebuild/re-open the document or run the tests to make sure the resolved
version is actually correct, not just "no more markers":

```bash
# for code
npm test        # or your project's test command

# for docs, just re-read the merged section
```

### Step 7 — Push

```bash
git push
```

---

## Case C — Conflict during a rebase (if your team uses `git rebase` instead of merge)

```bash
git rebase main
```

If a conflict occurs mid-rebase, Git pauses and tells you which commit is
being replayed. Resolve the file the same way as Step 2–4 above, then:

```bash
git add <resolved-file>
git rebase --continue
```

Repeat until the rebase finishes. If it gets too messy, you can always back
out safely:

```bash
git rebase --abort
```

This returns you exactly to where you were before starting the rebase — a
safe way to "start over" on a conflict you don't yet understand.

---

## If you get stuck or aren't sure the resolution is correct

- Do **not** guess-delete large chunks of a teammate's work to make the
  conflict "go away" — that silently destroys their contribution and their
  repository evidence.
- Do **not** force-push (`git push --force`) to `main` — it is protected,
  and force-pushing shared branches can rewrite teammates' history.
- Call the teammate whose change conflicts with yours and resolve it
  together, live, before committing the resolution.
- If a resolution is genuinely uncertain, open a draft PR with the conflict
  resolved as best you can, tag both original authors as reviewers, and let
  the review process double-check it.

## Preventing conflicts in the first place

- Keep branches short-lived — merge/rebase from `main` often instead of
  letting a branch drift for a week.
- Agree ownership boundaries for shared documents (e.g. one person per PED
  section) where practical.
- Communicate in your team channel before making a large structural edit
  to a shared file (e.g. re-ordering the whole RTM).
- Commit and push small, frequent changes rather than one giant change at
  the end — smaller diffs are far easier to reconcile.
