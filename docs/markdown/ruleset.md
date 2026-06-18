# Branch Ruleset — Protect master

Relay's `master` branch is protected by a GitHub **ruleset** (id `17823807`).  
View or edit it at: **Settings → Rules → Rulesets → Protect master**.

---

## What rulesets are

Rulesets are GitHub's modern replacement for the older branch protection rules system.  
Key improvements over the legacy system:

| Feature | Legacy protection | Rulesets |
|---------|------------------|----------|
| Bypass granularity | Admins: on/off | Per actor, per role, per app |
| Multi-branch targeting | One rule per branch name | fnmatch patterns + tag support |
| Dry-run mode | No | `enforcement: evaluate` |
| Org-level push-down | No | Yes — org rulesets stack with repo rulesets |
| Audit log | Limited | Full event log per rule |

---

## Rules in effect

### `pull_request`

Every merge to `master` must go through a pull request with **at least 1 approving review** before it can be merged.

- `dismiss_stale_reviews_on_push: true` — if a contributor pushes new commits after a reviewer has approved, the approval is invalidated and a fresh review is required.
- `require_code_owner_review: false` — no CODEOWNERS file is required.
- `required_review_thread_resolution: false` — unresolved review comments do not block merge.

### `non_fast_forward`

Force pushes to `master` are blocked for everyone without bypass. This prevents rewriting published history.

### `deletion`

The `master` branch cannot be deleted.

---

## Bypass policy

| Actor | Bypass mode |
|-------|-------------|
| Repository admin | Always — can push directly and merge without review |

The repo owner is a repository admin and is therefore not subject to any of the rules above. This allows:

- Merging release-please PRs without a second reviewer
- Emergency direct pushes to master
- Hotfixes without going through the full PR flow

---

## How the CI fits in

The CI workflow (`.github/workflows/publish.yml`) only runs **after a PR is approved**:

```
Contributor opens PR
  → Owner reviews and approves        (satisfies the pull_request rule)
  → CI runs (Jest + Playwright)
  → Tests pass
  → Owner merges
```

Release-please PRs are opened by the GitHub Actions bot. The owner approves and merges them using their admin bypass, so the CI gate does not apply.

---

## Modifying the ruleset

**Via GitHub UI:** Settings → Rules → Rulesets → Protect master → Edit

**Via `gh` CLI:**

```bash
# View current state
gh api repos/mariosakka/vscode-relay/rulesets/17823807

# Update (e.g. require 2 reviewers)
gh api --method PUT repos/mariosakka/vscode-relay/rulesets/17823807 \
  --input ruleset.json
```

**Enforcement modes:**

| Mode | Behaviour |
|------|-----------|
| `active` | Rules are enforced — violations are blocked |
| `evaluate` | Rules are checked but not enforced — useful for testing a new rule before committing to it |
| `disabled` | Ruleset exists but does nothing |
