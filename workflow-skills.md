
Skill-ul pe care-l folosesc zi de zi e zdev-flow — un skill global (non-repo-specific) care orchestrează tot fluxul de muncă de sub ~/work, după Standards Doc-ul echipei. Pe scurt ce face:


• Issues + board — sursa de adevăr e issue-ul de GitHub + Projects board (To Do → In Progress → In Review → Done, mutate automat), fără Jira. Crearea issue-urilor, alinierea la task-urile >8h și pick-up-ul din top 3 din To Do trec prin skill-urile co-ops..
• Commit/push — agentul face push doar prin contul vitp15 și doar când îi cer; PR-ul nu-l deschide el niciodată — îl deschid eu din contul meu, ca draft..
• Bucla de AI review — pe draft-ul de PR rulează CodeRabbit + /review + /simplify + co-ops:pr-merge-check, îmi clasifică comentariile valid/invalid, așteaptă confirmarea mea, apoi fix → push → resolve până e curat. Cu gate-uri human-in-the-loop reale..
• Status pe Slack — SOD/EOD pe #zdev-status, weekly pe #zdev-weekly, mereu draft → mi-l arată → trimite doar după OK-ul meu..
• Reguli hard — nu citește env-uri de prod/shared, nimic pe date de producție; tot ce-i tehnic în engleză, Slack în română..

Partea reutilizabilă (independentă de setup-ul meu) e de fapt plugin-ul co-ops din marketplace-ul comun făcut de Alex, Colete-Online/ai-tooling. Îl instalezi direct:
/plugin marketplace add Colete-Online/ai-tooling
/plugin install co-ops@ai-tooling
Are: issue-creation, issue-alignment, issue-alignment-check, pr-merge-check.

zdev-flow în sine e personal (are numele contului meu, worklog path etc.), deci pentru ce vrei tu ar trebui generalizat un pic — dar fix structura asta (un skill care orchestrează + se sprijină pe skill-uri comune + gate-uri de confirmare) cred că-i o idee de bază bună pentru extensia + MCP-ul tău. Îți pun conținutul complet al SKILL.md în thread :point_down:.

Sună super ce faci, ține-mă la curent — mă bag bucuros să testez când ai ceva.


---
name: zdev-flow
description: >-
  Standing work flow for any real task under ~/work (repos: integrations,
  platform, point-picker-widget, tikets_ai). Invoke whenever Vadim asks for
  actual work — a change, fix, feature, or an investigation that will lead to a
  code change — anywhere under ~/work. Covers the Colete Online Standards Doc as
  it applies to me: creating GitHub issues (via the co-ops skills) into the repo
  backlog; the >8h alignment gate; picking work off the GitHub Projects board;
  the commit/push policy (I push via the `vitp15` gh account; I NEVER open PRs —
  Vadim opens the draft PR when I say it's ready); the AI/CodeRabbit review loop
  on the draft with its human-in-the-loop gates; SOD/EOD + weekly status on
  Slack. There is NO Jira — GitHub issues + the Projects board are the source of
  truth. NOT for pure questions or read-only exploration.
---

# zdev-flow — how I work under ~/work

The source of truth is the **GitHub issue** and the **GitHub Projects board**
(To Do → In Progress → In Review → Done, moved automatically). There is **no
Jira**. This skill is the Colete Online Standards Doc as it applies to me.

## When this applies

- Trigger on any **actual work** under `~/work` (`integrations`, `platform`,
  `point-picker-widget`, `tikets_ai`): a change, fix, feature, or an
  investigation that will turn into a code change.
- **Don't** trigger for pure questions, explanations, or read-only exploration
  that won't produce a change.

## Language

- **Slack → Romanian.**
- **Everything technical → English:** issues, commit messages, branch names, PR
  titles & descriptions, code, code comments.

## Hard rules (never violate)

- **I NEVER open a PR.** When the work is tested locally and the AI review is
  clean, I tell Vadim "gata de PR"; **Vadim opens the draft PR himself** (it
  starts as a draft, from the shared PR account, auto-linked to the issue) and
  confirms to me it's open. I then run the AI/CodeRabbit loop on that draft.
- **I do NOT mark a PR "Ready for review."** That is Vadim's author gate (it
  triggers human-reviewer assignment). I only get the draft to the point where
  it *can* be marked ready and tell him so.
- **Commits/push: only `vitp15`, only when asked or inside a confirmed AI-review
  fix cycle.** The `gh` CLI is logged in as `vitp15`. I never push on my own
  initiative.
- **Issue assignment is mine to set, to Vadim.** Because PRs come from a shared
  account, the issue assignee identifies the real author — I assign Vadim
  (`vitp15`) on the issue for work he's doing. (The `issue-creation` skill
  itself never assigns; I assign separately when work starts / a PR exists.)
- **`approved` (which boards the issue) only on a stated Alex ok — never on my
  own judgment.** Per the doc, anyone with Alex's ok may apply it *with an
  attribution comment* ("ok de la Alex, discutat in standup"). So I apply
  `approved` + leave that attribution comment **only when Vadim tells me the ok
  exists**; otherwise the issue stays in the backlog. The `issue-creation`
  skill itself never approves/boards/assigns.
- **Human-in-the-loop gates are real waits.** Where this doc says "wait for
  confirmation", I stop and wait — I do not assume.
- **Outward-facing sends need an OK.** Slack messages are drafted, shown, and
  sent only after Vadim says go.
- **Never read production / shared env files; never touch production data.**
  Do NOT read the contents of non-`.local` env files (in `platform`, never read
  `.env.development`/its `dist` copy or any shared/prod env; at most `.env.local`
  — listing file *names* is fine). Any DB/data change runs **only** against the
  local environment. If a task seems to need production, **stop and ask**.

  ## Slack channels

- **#zdev-status** — availability: SOD/EOD short messages, long breaks, early
  leave / late start, post-approval leave, unforeseen situations.
- **#zdev-general** — daily coordination (questions, discussion, "ready for
  review" chatter).
- **#zdev-pulse** — task threads (>1 day) + automated review signals (reviewer
  assigned, ready-to-merge, review queue). Most arrive automatically via the
  GitHub↔Slack integration — I don't double-post.
- **#zdev-weekly** — weekly status (Focus / Blocaje / Ajutor necesar), by Fri
  15:00, as a new message (not a thread reply).
- **#zdev-deploy** — production deploy announcements + post-deploy verification.

## Tooling — the co-ops skills

Issue/alignment/PR-readiness work goes through the shared **co-ops** plugin
(installed once: `/plugin marketplace add Colete-Online/ai-tooling` then
`/plugin install co-ops@ai-tooling`):

- **co-ops:issue-creation** — file a structured issue into the repo backlog
  (team template + the machine-read `Estimation:` line). Never boards/approves/
  assigns.
- **co-ops:issue-alignment** — write the §5 alignment comment for a >8h issue.
- **co-ops:issue-alignment-check** — self-check that alignment comment before
  labeling `alignment-ready`.
- **co-ops:pr-merge-check** — on a draft PR: "is it ready to mark Ready for
  review?"; on a ready PR: "is it safe to merge?".

## The flow

### 1. A new idea / bug / regression → an issue
Create it with **co-ops:issue-creation** (it lives in the repo backlog; it does
NOT go on the board until Alex applies `approved`). I never apply `approved`.
For brand-new ideas Vadim drops, I file them as issues rather than only
remembering them.

### 2. Picking up a task
- From the **top 3 unassigned** issues in To Do (or one Alex assigns directly).
- **≤8h:** I can start directly; the issue moves to In Progress when I actually
  start. If it grows past a day once I'm in the code, I post the alignment
  comment retroactively (just the new estimate).
- **>8h:** exploration (2-4h) → post the alignment comment via
  **co-ops:issue-alignment** → **co-ops:issue-alignment-check** → apply
  `alignment-ready` → **wait for Vadim's/Alex's confirmation** (that's the start
  ok) → only then move to In Progress and write real code. No implementation on
  an unconfirmed approach (probe code to validate is fine).
- Overruns: if the estimate is exceeded by >50% (or >1 day), I post the new
  estimate on the issue the same day I realize it — no excuses on the spot.
  External blocker → post immediately; bigger scope → post immediately.

> Board **Status** (To Do / In Progress / In Review / Done) is a GitHub Projects
> field, NOT a label — it moves by automation (e.g. on PR link/ready/merge) or
> on the board, not via a tag I apply. And nothing has a board status until
> `approved` puts it on the board. So "≤8h without an ok" means skipping the
> >8h **alignment** confirmation — `approved` (boarding) still comes first.
> My `gh` token has **no `project` scope**: I can do issues / PRs / labels, but
> I **cannot read or set the board Status at all** — that's automation or Vadim
> on the board UI. (`approved` works — it's a label; the board move it triggers
> runs server-side.)

### 3. Worktree
Work in an isolated git worktree when useful. In `platform`, follow the
**worktree-setup** skill (node_modules, env files, generated config are
per-worktree). New branches from `origin/development`.

### 4. Doing the work + the worklog
- I push commits via `vitp15` when Vadim asks (or inside a confirmed AI-review
  fix cycle).
- **Worklog is minimal:** I do NOT keep a detailed daily log. GitHub (assigned
  issues + PRs + board) is the source of truth, and SOD/EOD + the weekly status
  derive from it. The only thing I note locally is work Vadim explicitly flags
  as off-issue ("azi am mai facut asta"): I jot just that line in
  `~/work/.worklog/YYYY-MM-DD.md` so it isn't lost for the weekly status.

### 5. PR + AI review loop (I drive this; I don't open or "ready" the PR)
1. When the change is **tested locally** and builds/lints clean, I tell Vadim
   it's ready and he opens the **draft PR**; he confirms it's open. I assign the
   issue to him (`vitp15`).
2. **On the draft**, I run the AI review: CodeRabbit + `/review`, `/simplify`,
   and **co-ops:pr-merge-check**. The issue stays In Progress; no human yet.
3. I **wait** for CodeRabbit to finish posting, read **every** comment, and
   classify each **valid** (real, worth doing — one-line why) / **invalid**
   (wrong/out-of-scope — one-line why). I present the list to Vadim.
4. I **wait** for Vadim's valid/invalid confirmation.
5. Then per thread: **invalid** → reply briefly why not + resolve; **valid** →
   reply "facem" → make the change → push (`vitp15`) → resolve. Re-wait for the
   next CodeRabbit round; repeat until clean.
6. When it's clean, CI is green, and I've added self-review notes on anything
   non-obvious, I tell Vadim **"gata de Ready for review"** — he marks it ready
   (his gate). I never mark it ready myself.

### 6. After ready: human review → merge → deploy → verify
Automation assigns the human reviewer and posts to #zdev-pulse — I don't pick a
reviewer or announce manually. On requested changes I apply fixes + reply per
thread + ask for re-review. Approve → `ready-to-merge` → **Alex merges +
deploys** (announced in #zdev-deploy). **Verification in production stays on the
author:** after the deploy announcement I help Vadim run the PR's "How to test"
steps against prod (logs/skills) and tick the deploy message; if something
breaks, the issue is reopened and we write the 3-line regression note.

## Slack status (SOD / EOD / weekly)

- **SOD / EOD** in #zdev-status are short ("salut, sunt pe #N azi" / "Inchid. Am
  terminat #N / maine continui pe #M"). If Vadim works a second interval the same
  day, repeat SOD/EOD for it.
- **Weekly status** in #zdev-weekly by **Fri 15:00**, Focus / Blocaje / Ajutor,
  every task as `#N titlu`. I can draft it from GitHub (assigned issues + my
  PRs/commits that week) — read recent #zdev-weekly messages first to match
  tone, then **show Vadim the draft and send only after his OK**.

## Proactive guardrails (I flag when Vadim is about to break the doc)

When we're working, I speak up if: a >8h task is starting without a confirmed
alignment; an issue would go on the board without `approved`; a PR is heading to
"Ready for review" without green CI / AI review / self-review; a task is being
pulled from outside the top 3 of To Do; an estimate is >50% over without a
posted update; a PR mixes unrelated changes; SOD/EOD or the Friday weekly is
missing while we're active.

**Limit:** purely time-based items (SOD at start of day, EOD, weekly by Fri
15:00, the >10-day-stale In-Progress report) I can only flag when we interact —
I can't fire them on a timer. If Vadim wants automatic reminders, I can set them
up with `/schedule` (cron agent).

## Quick reference

- GitHub: `gh` CLI (logged in as `vitp15`, ssh). Issues + Projects board are the
  source of truth.
- Issues / alignment / PR-readiness: the **co-ops** skills.
- Worktrees in `platform`: the **worktree-setup** skill.
- Slack: channels above; **never** auto-send — draft, show, send on OK.
- Assignee for Vadim's work: `vitp15`.
- No Jira anywhere.