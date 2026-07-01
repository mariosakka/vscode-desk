# EOD / Weekly Log Skill — Design

**Date:** 2026-07-01
**Status:** Approved

---

## Problem

EOD and weekly Slack messages require recalling everything done during the day or week from memory. This is error-prone and inconsistent. The goal is a deterministic, script-enforced log that accumulates entries throughout the day/week and produces the exact Slack format on demand.

---

## Scope

- Two shell scripts: `~/.desk/daily-log` and `~/.desk/weekly-log`
- A Claude Code skill (`eod-weekly-log`) that instructs the agent to use them
- Integration with the existing `slack-work-communication` skill for sending

Out of scope: auto-fetching GitHub activity, git log scraping, any UI.

---

## Storage

Two JSON files, one per log:

| File | Cleared by |
|---|---|
| `~/.desk/daily-log.json` | after confirmed EOD send |
| `~/.desk/weekly-log.json` | after confirmed Friday weekly send |

Both share the same shape:
```json
{ "focus": [], "blockers": [], "help": [] }
```

Files are created automatically on first use if absent.

---

## Script Interface

Both scripts expose an identical subcommand interface:

```
<script> add <section> "<text>"    # section: focus | blockers | help
<script> remove <section> <index>  # 1-based index
<script> show                      # print formatted Slack message
<script> clear                     # wipe all three sections
```

### `show` output format

```
:dart: Focus
• <item 1>
• <item 2>

:construction: Blocaje
nimic

:raising_hand: Ajutor necesar
nimic
```

Sections with zero items print `nimic` instead of a blank.

---

## Skill: eod-weekly-log

### When to activate

- User asks to log something they did → `add`
- User asks what's in the log → `show`
- User asks to remove or correct an entry → `remove`
- EOD or weekly send is about to happen → `show` then hand off

### Section routing

| User says | Section |
|---|---|
| Work done, PRs reviewed, tasks completed | `focus` |
| Something blocking progress | `blockers` |
| Help needed from someone | `help` |

### Target routing

| Situation | Script |
|---|---|
| EOD | `daily-log` |
| Friday weekly | `weekly-log` |
| Mid-week notable item for weekly | `weekly-log add focus "..."` |

### Rules

- **Never edit the JSON files directly.** Always go through the scripts.
- **Always run `show` before sending** and present the output to the user for confirmation.
- **Clear after confirmed send**: `daily-log clear` after EOD, `weekly-log clear` after weekly.

---

## Integration with slack-work-communication

`eod-weekly-log` is upstream — it owns content, `slack-work-communication` owns sending:

1. Run `<log> show`
2. Present output to user
3. Invoke `slack-work-communication` with the log output as the message body
4. On confirmed send, run `<log> clear`

`slack-work-communication` handles channel routing (`#zdev-status` for EOD, `#zdev-weekly` for weekly), the confirmation gate, and the Slack MCP call.
