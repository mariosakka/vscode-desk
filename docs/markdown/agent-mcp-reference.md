# Desk MCP — Full Agent Reference

**Endpoint:** `POST http://127.0.0.1:3333/mcp`  
**Protocol:** JSON-RPC 2.0 (MCP Streamable HTTP transport, version `2024-11-05`)  
**Server identity:** `{ "name": "vscode-desk", "version": "0.0.1" }`

---

## Request envelope

Every call follows the JSON-RPC 2.0 shape:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "<tool-name>",
    "arguments": { ... }
  },
  "id": 1
}
```

Successful response:

```json
{ "jsonrpc": "2.0", "result": { "content": [{ "type": "text", "text": "<json-string>" }] }, "id": 1 }
```

Error response (HTTP status is still 200):

```json
{ "jsonrpc": "2.0", "error": { "code": -32603, "message": "Project not found: proj_abc" }, "id": 1 }
```

Parse errors return HTTP 400; unknown routes return HTTP 404.

---

## Initialization

MCP clients send `initialize` before any tool call. Desk responds with its capabilities.

```json
// request
{ "jsonrpc": "2.0", "method": "initialize", "params": {}, "id": 0 }

// response
{
  "protocolVersion": "2024-11-05",
  "capabilities": { "tools": {}, "resources": {} },
  "serverInfo": { "name": "vscode-desk", "version": "0.0.1" }
}
```

---

## Scope parameter

All tools accept an optional `scope` parameter:

| Value | Storage location |
|-------|-----------------|
| `"global"` (default) | `~/.desk/global/` |
| `"workspace"` | `~/.desk/workspaces/<slug>/` |

Omitting `scope` defaults to `"global"`.

---

## Bookmark tools

### `list_projects`

Returns all projects with their IDs, names, and bookmark counts.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:**
```json
[
  { "id": "proj_abc123", "name": "Work", "bookmarkCount": 4 },
  { "id": "proj_def456", "name": "Research", "bookmarkCount": 2 }
]
```

---

### `list_bookmarks`

Returns bookmarks. Without `project_id` returns all bookmarks across all projects, each with a `project_id` field added.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | string | no | Filter to one project |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns (single project):**
```json
[
  {
    "id": "bm_xyz789",
    "title": "MDN Web Docs",
    "url": "https://developer.mozilla.org",
    "icon": "data:image/png;base64,...",
    "description": "Web platform reference"
  }
]
```

**Returns (all projects — no `project_id`):**
```json
[
  { "id": "bm_xyz789", "project_id": "proj_abc123", "title": "MDN Web Docs", ... }
]
```

---

### `add_bookmark`

Adds a bookmark to a project. If `icon` is omitted, Desk fetches the site's favicon automatically and caches it for 30 days. Falls back to `🌐` if the fetch fails.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | string | **yes** | Target project ID |
| `title` | string | **yes** | Display name on the card |
| `url` | string | **yes** | Full URL including scheme |
| `icon` | string | no | Emoji or base64 `data:` URL. Omit to auto-fetch favicon |
| `description` | string | no | Short description shown below title |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:** the created bookmark object including its new `id`.

```json
{ "id": "bm_new001", "title": "GitHub", "url": "https://github.com", "icon": "data:image/png;base64,...", "description": "" }
```

**Note:** To link a bookmark to a `.desk` page instead of a URL, set `url` to `desk-page:<filename>` (e.g. `desk-page:auth-flow.desk`). Clicking the card in the sidebar opens the page viewer.

---

### `remove_bookmark`

Permanently removes a bookmark. Cannot be undone.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | string | **yes** | |
| `bookmark_id` | string | **yes** | |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:** `"removed"`

---

### `create_project`

Creates a new empty project.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:** the new project object.

```json
{ "id": "proj_new111", "name": "AI Tools", "bookmarks": [] }
```

---

### `remove_project`

Removes a project and **all its bookmarks**. Cannot be undone.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | string | **yes** | |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:** `"removed"`

---

### `update_bookmark`

Partially updates a bookmark. Only the fields present in `fields` are changed; everything else is preserved.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | string | **yes** | |
| `bookmark_id` | string | **yes** | |
| `fields` | object | **yes** | Any subset of `title`, `url`, `icon`, `description` |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:** the updated bookmark object.

```json
// rename and re-point a bookmark
{
  "project_id": "proj_abc123",
  "bookmark_id": "bm_xyz789",
  "fields": { "title": "MDN — HTML", "url": "https://developer.mozilla.org/en-US/docs/Web/HTML" }
}
```

---

## Page tools

Pages are `.desk` files stored in `<workspace>/desk-pages/`. All page tools return an error if VS Code has no workspace folder open.

### The `.desk` file format

```xml
<desk-page title="Page Title">
  <style>
    /* optional — CSS scoped to this page only */
    /* use var(--accent), var(--accent2), var(--text), var(--muted) to stay on-theme */
    .my-class { color: var(--accent2); }
  </style>

  <!-- HTML body goes here — any standard HTML except <script> tags -->
  <h2>Section heading</h2>
  <p>Paragraph with a <a href="other-page.desk">page link</a> or an
     <a href="https://example.com">external link</a>.</p>
</desk-page>
```

`<script>` tags are stripped before rendering. Everything else — tables, code blocks, images (`data:` URLs only), divs — is allowed.

**Built-in CSS classes you can use in content:**

| Class | Effect |
|-------|--------|
| `callout` | Highlighted aside block (accent-coloured left border) |
| `callout tip` | Same with teal border |
| `callout warn` | Yellow border |
| `callout danger` | Red border |

---

### `list_pages`

Returns all `.desk` files in `desk-pages/`.

**Arguments:** none

**Returns:**
```json
[
  { "filename": "auth-flow.desk", "title": "Auth Flow" },
  { "filename": "api-spec.desk", "title": "API Specification" }
]
```

---

### `create_page`

Creates a new `.desk` file. Fails silently if the file already exists (use `update_page` to change it).

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | Must end in `.desk`, e.g. `"auth-flow.desk"` |
| `title` | string | **yes** | Shown in the page header and panel tab |
| `content` | string | **yes** | HTML body content (no `<script>` tags) |
| `customStyles` | string | no | CSS injected only for this page |

**Returns:** `"created auth-flow.desk"`

**Example — create a structured doc:**
```json
{
  "filename": "onboarding.desk",
  "title": "Team Onboarding",
  "content": "<h2>Setup</h2><ol><li>Clone the repo</li><li>Run <code>npm install</code></li></ol><h2>Next steps</h2><p>See <a href=\"api-spec.desk\">API spec</a>.</p>",
  "customStyles": "ol { padding-left: 20px; } li { margin-bottom: 8px; }"
}
```

---

### `update_page`

Reads the existing file and overwrites only the fields you provide. All other fields are preserved.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | Must exist |
| `title` | string | no | New title |
| `content` | string | no | New body HTML (replaces entire body) |
| `customStyles` | string | no | New custom CSS (replaces entire style block) |

**Returns:** `"updated onboarding.desk"`

**Example — append a note by reading first, then updating:**
```
1. list_pages → confirm "onboarding.desk" exists
2. (read current content from list context or prior knowledge)
3. update_page with new content that includes the original + the addition
```

---

### `delete_page`

Deletes the `.desk` file. Cannot be undone.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `filename` | string | **yes** |

**Returns:** `"deleted onboarding.desk"`

---

## Workflow tools

These tools read and write team workflow config and skills. Config and skill submissions are **non-blocking** — they queue for user confirmation in VS Code and return immediately. The user must confirm before anything is persisted or installed.

---

### `get_workflow_config`

Returns the current team workflow configuration.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:**
```json
{
  "slack": {
    "status":  "#zdev-status",
    "general": "#general",
    "weekly":  "#weekly",
    "pulse":   "#pulse",
    "deploy":  "#deploy"
  },
  "language":  "en",
  "githubOrg": "acme",
  "prAccount": "acme-bot",
  "identity": {
    "githubUsername": "alice",
    "currentRepo":    "acme/backend"
  }
}
```

**Error:** Returns `-32603` with `"Workflow config not configured"` if no config has been saved yet. Check for this and call `submit_workflow_config` to populate it on first run.

---

### `submit_workflow_config`

Submits a partial config for user review. Fields are deep-merged with any existing config — you can submit only the fields you want to change. The user sees a VS Code prompt to review and confirm before anything is written.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `config` | object | **yes** | Partial `WorkflowConfig` — any subset of top-level or nested fields |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:** `{ "status": "submitted" }`

**Example — set Slack channels from a standards doc:**
```json
{
  "config": {
    "slack": { "status": "#eng-status", "deploy": "#deploys" },
    "language": "en",
    "githubOrg": "acme"
  }
}
```

**Example — update identity on first run:**
```json
{
  "config": {
    "identity": { "githubUsername": "alice", "currentRepo": "acme/backend" }
  }
}
```

---

### `list_skills`

Returns all stored workflow skills (metadata only — no content bodies).

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:**
```json
[
  {
    "name":        "dev-flow",
    "description": "Full development lifecycle — issue pickup through PR merge",
    "agents":      ["all"],
    "version":     2,
    "installedAt": 1718745600000
  }
]
```

---

### `add_skill`

Submits a workflow skill for user review. If a skill with the same `name` already exists, `version` is auto-incremented. The user sees a VS Code prompt showing the skill name and description; on confirm, Desk installs it on all detected agents in the appropriate format.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | Kebab-case skill name, e.g. `"dev-flow"` |
| `content` | string | **yes** | Full skill markdown with YAML frontmatter (see skill format below) |
| `description` | string | no | Overrides the frontmatter description in the VS Code confirmation prompt |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:** `{ "status": "submitted" }`

**Error:** Returns `-32603` if the frontmatter is missing `name` or `description`.

**Skill format:**

```markdown
---
name: dev-flow
description: >-
  Full development lifecycle — issue pickup, doing the work, PR flow.
triggers:
  - starting a new task
  - reviewing a PR
agents: all
version: 1
---

At startup, call `get_workflow_config` to read team-specific values
(Slack channels, GitHub org, language, PR account, GitHub username).

<!-- skill body — plain markdown, works across all agents -->
```

**Required frontmatter:** `name` (kebab-case), `description`  
**Optional:** `triggers`, `agents` (`all` or `[claude-code, cursor, gemini, codex]`), `version` (auto-incremented on resubmit — you can omit it)

**Content rules:**
- No hardcoded values — always read from `get_workflow_config` at runtime
- No agent-specific syntax in the shared body — use a separate skill with `agents: [agent-id]`

Read `desk://guide/skill-format` for the full spec.

---

### `get_skill`

Returns the full content of a stored skill, including its YAML frontmatter and markdown body.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | Kebab-case skill name |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:** the full skill markdown string.

**Error:** Returns `-32603` with `"Skill not found: <name>"` if no skill with that name exists.

---

### `remove_skill`

Removes a skill from storage and uninstalls it from all agent paths (deletes the installed file, or removes the section for Codex-style AGENTS.md installs).

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | |
| `scope` | string | no | `"global"` or `"workspace"` (default: `"global"`) |

**Returns:** `{ "removed": "dev-flow" }`

**Error:** Returns `-32603` with `"Skill not found: <name>"` if no skill with that name exists.

---

## CSS variables available in page styles

Desk maps its own variables onto VS Code's theme tokens, so they automatically adapt to whatever theme the user has installed. Use these in `customStyles` to stay on-theme across any VS Code color scheme:

| Variable | Maps to (VS Code token) | Usage |
|----------|------------------------|-------|
| `--bg` | `--vscode-editor-background` | Page background |
| `--surface` | `--vscode-editorWidget-background` | Cards, code blocks |
| `--surface2` | `--vscode-list-hoverBackground` | Hover states, table headers |
| `--border` | `--vscode-editorWidget-border` | Borders, dividers |
| `--text` | `--vscode-editor-foreground` | Body text |
| `--muted` | `--vscode-descriptionForeground` | Secondary/hint text |
| `--accent` | `--vscode-button-background` | Primary accent — highlights |
| `--accent2` | `--vscode-textLink-foreground` | Links, code, tip callouts |
| `--radius` | *(fixed)* `10px` | Border radius |

---

## Error reference

| Situation | Code | Message pattern |
|-----------|------|-----------------|
| Project not found | `-32603` | `"Project not found: <id>"` |
| Bookmark not found | `-32603` | `"Bookmark not found: <id>"` |
| Page file not found | `-32603` | `"ENOENT: no such file..."` |
| No workspace open | `-32603` | `"No workspace open — pages unavailable"` |
| Workflow config not set | `-32603` | `"Workflow config not configured"` |
| Skill not found | `-32603` | `"Skill not found: <name>"` |
| Invalid skill frontmatter | `-32603` | `"Missing name"` / `"Missing description"` |
| Unknown tool name | `-32603` | `"Unknown tool: <name>"` |
| Unknown RPC method | `-32603` | `"Unknown method: <method>"` |
| Malformed JSON body | `-32700` | `"Parse error"` |
