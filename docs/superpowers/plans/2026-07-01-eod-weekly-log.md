# EOD / Weekly Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two executable Python scripts (`~/.desk/daily-log` and `~/.desk/weekly-log`) that manage persistent EOD/weekly work logs, plus a Claude Code skill that instructs agents to use them.

**Architecture:** Each script is a self-contained Python3 program backed by a JSON file in `~/.desk/`. They share an identical subcommand interface (`add`, `remove`, `show`, `clear`). The skill file at `~/.claude/skills/eod-weekly-log.md` tells agents which script to use and when, and how to hand off to `slack-work-communication`. The skill is also registered in `~/.desk/workspaces/platform/skills.json` so it appears in the Desk sidebar.

**Tech Stack:** Python 3 (stdlib only), JSON, bash (chmod/PATH)

## Global Constraints

- Scripts use `#!/usr/bin/env python3` — no external dependencies
- JSON stored with `ensure_ascii=False` to preserve Romanian characters and emoji
- Section names in scripts: `focus`, `blockers`, `help` (not `ajutor`, not `blocaje`)
- Slack output uses Romanian labels: `:dart: Focus`, `:construction: Blocaje`, `:raising_hand: Ajutor necesar`
- Empty sections print `nimic` (not blank)
- Never edit the JSON files directly — always through the scripts
- Skill registered in both `~/.claude/skills/eod-weekly-log.md` and `~/.desk/workspaces/platform/skills.json`

---

### Task 1: daily-log script

**Files:**
- Create: `~/.desk/daily-log`

**Interfaces:**
- Produces: `daily-log add <section> "<text>"`, `daily-log remove <section> <N>`, `daily-log show`, `daily-log clear`
- Storage: `~/.desk/daily-log.json` with shape `{ "focus": [], "blockers": [], "help": [] }`

- [ ] **Step 1: Write the script**

Write `~/.desk/daily-log` with this exact content:

```python
#!/usr/bin/env python3
import json, sys, os

LOG_FILE = os.path.expanduser('~/.desk/daily-log.json')
SECTIONS = {'focus', 'blockers', 'help'}

def load():
    if not os.path.exists(LOG_FILE):
        return {'focus': [], 'blockers': [], 'help': []}
    with open(LOG_FILE) as f:
        return json.load(f)

def save(data):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def cmd_add(section, text):
    if section not in SECTIONS:
        sys.exit(f'Unknown section: {section}. Use: focus | blockers | help')
    data = load()
    data[section].append(text)
    save(data)

def cmd_remove(section, index):
    if section not in SECTIONS:
        sys.exit(f'Unknown section: {section}. Use: focus | blockers | help')
    data = load()
    idx = int(index) - 1
    if idx < 0 or idx >= len(data[section]):
        sys.exit(f'Index {index} out of range (1–{len(data[section])})')
    data[section].pop(idx)
    save(data)

def cmd_show():
    data = load()
    lines = []
    lines.append(':dart: Focus')
    lines += [f'• {i}' for i in data['focus']] or ['nimic']
    lines.append('')
    lines.append(':construction: Blocaje')
    lines += [f'• {i}' for i in data['blockers']] or ['nimic']
    lines.append('')
    lines.append(':raising_hand: Ajutor necesar')
    lines += [f'• {i}' for i in data['help']] or ['nimic']
    print('\n'.join(lines))

def cmd_clear():
    save({'focus': [], 'blockers': [], 'help': []})

args = sys.argv[1:]
if not args:
    sys.exit('Usage: daily-log <add|remove|show|clear> ...')
cmd = args[0]
if cmd == 'add':
    if len(args) < 3:
        sys.exit('Usage: daily-log add <section> "<text>"')
    cmd_add(args[1], ' '.join(args[2:]))
elif cmd == 'remove':
    if len(args) < 3:
        sys.exit('Usage: daily-log remove <section> <index>')
    cmd_remove(args[1], args[2])
elif cmd == 'show':
    cmd_show()
elif cmd == 'clear':
    cmd_clear()
else:
    sys.exit(f'Unknown command: {cmd}')
```

- [ ] **Step 2: Make executable**

```bash
chmod +x ~/.desk/daily-log
```

- [ ] **Step 3: Test add and show**

```bash
~/.desk/daily-log add focus "reviewed PR #817"
~/.desk/daily-log add focus "fixed seed bug"
~/.desk/daily-log add blockers "waiting for ANAF creds"
~/.desk/daily-log show
```

Expected output:
```
:dart: Focus
• reviewed PR #817
• fixed seed bug

:construction: Blocaje
• waiting for ANAF creds

:raising_hand: Ajutor necesar
nimic
```

- [ ] **Step 4: Test remove**

```bash
~/.desk/daily-log remove focus 1
~/.desk/daily-log show
```

Expected — first focus item gone:
```
:dart: Focus
• fixed seed bug

:construction: Blocaje
• waiting for ANAF creds

:raising_hand: Ajutor necesar
nimic
```

- [ ] **Step 5: Test clear**

```bash
~/.desk/daily-log clear
~/.desk/daily-log show
```

Expected — all sections show `nimic`:
```
:dart: Focus
nimic

:construction: Blocaje
nimic

:raising_hand: Ajutor necesar
nimic
```

---

### Task 2: weekly-log script

**Files:**
- Create: `~/.desk/weekly-log`

**Interfaces:**
- Identical to `daily-log` but reads/writes `~/.desk/weekly-log.json`

- [ ] **Step 1: Write the script**

Write `~/.desk/weekly-log` — identical to `daily-log` except line 4:

```python
#!/usr/bin/env python3
import json, sys, os

LOG_FILE = os.path.expanduser('~/.desk/weekly-log.json')
SECTIONS = {'focus', 'blockers', 'help'}

def load():
    if not os.path.exists(LOG_FILE):
        return {'focus': [], 'blockers': [], 'help': []}
    with open(LOG_FILE) as f:
        return json.load(f)

def save(data):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def cmd_add(section, text):
    if section not in SECTIONS:
        sys.exit(f'Unknown section: {section}. Use: focus | blockers | help')
    data = load()
    data[section].append(text)
    save(data)

def cmd_remove(section, index):
    if section not in SECTIONS:
        sys.exit(f'Unknown section: {section}. Use: focus | blockers | help')
    data = load()
    idx = int(index) - 1
    if idx < 0 or idx >= len(data[section]):
        sys.exit(f'Index {index} out of range (1–{len(data[section])})')
    data[section].pop(idx)
    save(data)

def cmd_show():
    data = load()
    lines = []
    lines.append(':dart: Focus')
    lines += [f'• {i}' for i in data['focus']] or ['nimic']
    lines.append('')
    lines.append(':construction: Blocaje')
    lines += [f'• {i}' for i in data['blockers']] or ['nimic']
    lines.append('')
    lines.append(':raising_hand: Ajutor necesar')
    lines += [f'• {i}' for i in data['help']] or ['nimic']
    print('\n'.join(lines))

def cmd_clear():
    save({'focus': [], 'blockers': [], 'help': []})

args = sys.argv[1:]
if not args:
    sys.exit('Usage: weekly-log <add|remove|show|clear> ...')
cmd = args[0]
if cmd == 'add':
    if len(args) < 3:
        sys.exit('Usage: weekly-log add <section> "<text>"')
    cmd_add(args[1], ' '.join(args[2:]))
elif cmd == 'remove':
    if len(args) < 3:
        sys.exit('Usage: weekly-log remove <section> <index>')
    cmd_remove(args[1], args[2])
elif cmd == 'show':
    cmd_show()
elif cmd == 'clear':
    cmd_clear()
else:
    sys.exit(f'Unknown command: {cmd}')
```

- [ ] **Step 2: Make executable**

```bash
chmod +x ~/.desk/weekly-log
```

- [ ] **Step 3: Test independently from daily-log**

```bash
~/.desk/weekly-log add focus "finalizat setup local"
~/.desk/weekly-log add focus "creat issues #835 #836 #837"
~/.desk/weekly-log show
```

Expected:
```
:dart: Focus
• finalizat setup local
• creat issues #835 #836 #837

:construction: Blocaje
nimic

:raising_hand: Ajutor necesar
nimic
```

- [ ] **Step 4: Verify daily-log is unaffected**

```bash
~/.desk/daily-log show
```

Expected — still empty (cleared in Task 1):
```
:dart: Focus
nimic

:construction: Blocaje
nimic

:raising_hand: Ajutor necesar
nimic
```

- [ ] **Step 5: Clear weekly-log**

```bash
~/.desk/weekly-log clear
```

---

### Task 3: eod-weekly-log skill

**Files:**
- Create: `~/.claude/skills/eod-weekly-log.md`
- Modify: `~/.desk/workspaces/platform/skills.json`

**Interfaces:**
- Consumes: `daily-log` and `weekly-log` scripts from Tasks 1–2
- Produces: skill invocable as `eod-weekly-log` in Claude Code

- [ ] **Step 1: Write the skill file**

Write `~/.claude/skills/eod-weekly-log.md`:

```markdown
# eod-weekly-log

Manages two persistent work logs via shell scripts. Use `~/.desk/daily-log` for EOD, `~/.desk/weekly-log` for the Friday weekly message.

## Script interface

Both scripts have an identical interface:

    ~/.desk/daily-log add <section> "<text>"    # section: focus | blockers | help
    ~/.desk/daily-log remove <section> <N>      # N is 1-based
    ~/.desk/daily-log show                      # print formatted Slack message
    ~/.desk/daily-log clear                     # wipe all entries

(Replace `daily-log` with `weekly-log` for the weekly log.)

## Section mapping

| User describes | Section arg |
|---|---|
| Work done, PRs reviewed, tasks completed | `focus` |
| Something blocking progress | `blockers` |
| Help needed from someone | `help` |

## Which script to use

| Situation | Script |
|---|---|
| EOD | `~/.desk/daily-log` |
| Friday weekly report | `~/.desk/weekly-log` |
| Mid-week item worth noting for weekly | `~/.desk/weekly-log` |

## Rules

- NEVER edit `~/.desk/daily-log.json` or `~/.desk/weekly-log.json` directly
- Always run `show` before sending and present the output to the user for confirmation
- Run `~/.desk/daily-log clear` after the EOD message is confirmed sent
- Run `~/.desk/weekly-log clear` after the weekly message is confirmed sent

## EOD flow

1. Run `~/.desk/daily-log show`
2. Present output to user for review
3. Invoke `slack-work-communication` skill with the log output as the EOD message body
4. After user confirms send: run `~/.desk/daily-log clear`

## Weekly flow

1. Run `~/.desk/weekly-log show`
2. Present output to user for review
3. Invoke `slack-work-communication` skill with the log output as the weekly message body
4. After user confirms send: run `~/.desk/weekly-log clear`
```

- [ ] **Step 2: Register in platform skills JSON**

Read `~/.desk/workspaces/platform/skills.json`, append the new entry, write back:

```python
import json, time

path = '/home/mmswflow/.desk/workspaces/platform/skills.json'
with open(path) as f:
    skills = json.load(f)

content = open('/home/mmswflow/.claude/skills/eod-weekly-log.md').read()

skills.append({
    'name': 'eod-weekly-log',
    'description': 'Manages EOD and weekly work logs via scripts. Add items to daily or weekly log, show formatted Slack output, clear after send. Never edits JSON directly.',
    'content': content,
    'agents': ['all'],
    'version': 1,
    'installedAt': int(time.time() * 1000)
})

with open(path, 'w') as f:
    json.dump(skills, f, indent=2, ensure_ascii=False)

print(f'Registered. Total skills: {len(skills)}')
```

Run: `python3 <the above script>`
Expected: `Registered. Total skills: 4`

- [ ] **Step 3: Verify skill appears in Desk**

```bash
python3 -c "
import json
skills = json.load(open('/home/mmswflow/.desk/workspaces/platform/skills.json'))
for s in skills:
    print(s['name'], '-', s['description'][:60])
"
```

Expected — four skills listed, last one `eod-weekly-log`.

- [ ] **Step 4: Commit the plan + spec to vscode-portal**

```bash
cd /home/mmswflow/Documents/work/vscode-portal
git add docs/superpowers/plans/2026-07-01-eod-weekly-log.md
git commit -m "docs: eod-weekly-log implementation plan"
```
