# Desk MCP — Full Agent Reference

**Endpoint:** `POST http://127.0.0.1:<port>/mcp` (default port `3333`; auto-increments if in use — check the setup notification in VS Code for the actual port)  
**Protocol:** JSON-RPC 2.0 (MCP Streamable HTTP transport, version `2024-11-05`)  
**Server identity:** `{ "name": "vscode-desk", "version": "0.0.1" }`  
**Tools:** 39 static tools + dynamic skill-defined tools  
**Resources:** 4

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
{ "jsonrpc": "2.0", "error": { "code": -32603, "message": "Bookmark not found: bm_abc" }, "id": 1 }
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

Most tools accept an optional `scope` parameter:

| Value | Storage location |
|-------|-----------------|
| `"workspace"` | `~/.desk/workspaces/<slug>/` |
| `"global"` | `~/.desk/global/` |

Omit `scope` to use workspace scope when a workspace is open; otherwise it falls back to `"global"`. Page tools, book tools, and section/list tools are always workspace-scoped and do not accept a scope argument. Library tools and page-template tools are always global and do not accept a scope argument.

---

## Bookmark tools

### `list_bookmarks`

Returns all bookmarks as a flat array.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | string | no | `"global"` or `"workspace"` |

**Returns:**
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

---

### `add_bookmark`

Adds a bookmark. If `icon` is omitted, Desk fetches the site's favicon automatically and caches it for 30 days. Falls back to `🌐` if the fetch fails.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **yes** | Display name on the card |
| `url` | string | **yes** | Full URL including scheme |
| `icon` | string | no | Emoji or base64 `data:` URL. Omit to auto-fetch favicon |
| `description` | string | no | Short description shown below title |
| `scope` | string | no | `"global"` or `"workspace"` |

**Returns:** the created bookmark object including its new `id`.

```json
{ "id": "bm_new001", "title": "GitHub", "url": "https://github.com", "icon": "data:image/png;base64,...", "description": "" }
```

**Note:** To link a bookmark to a `.desk` page, set `url` to `desk-page:<filename>` (e.g. `desk-page:auth-flow.desk`). Clicking the card in the sidebar opens the page viewer.

---

### `remove_bookmark`

Permanently removes a bookmark. Cannot be undone.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bookmark_id` | string | **yes** | |
| `scope` | string | no | `"global"` or `"workspace"` |

**Returns:** `"removed"`

---

### `update_bookmark`

Partially updates a bookmark. Only the fields present in `fields` are changed; everything else is preserved.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bookmark_id` | string | **yes** | |
| `fields` | object | **yes** | Any subset of `title`, `url`, `icon`, `description` |
| `scope` | string | no | `"global"` or `"workspace"` |

**Returns:** the updated bookmark object.

```json
{
  "bookmark_id": "bm_xyz789",
  "fields": { "title": "MDN — HTML", "url": "https://developer.mozilla.org/en-US/docs/Web/HTML" }
}
```

---

## Page tools

Pages are `.desk` files stored in `<workspace>/desk-pages/`. All page tools return an error if VS Code has no workspace folder open. Page tools are workspace-only and do not accept a `scope` argument.

### The `.desk` file format

Pages are structured XML. Use `create_page` with a `sections[]` array for new pages; use section/list tools for surgical edits.

```xml
<desk-page title="Page Title" eyebrow="Reference · Backend" subtitle="Short subtitle.">
  <style>
    /* optional — CSS scoped to this page only */
    .my-class { color: var(--accent2); }
  </style>

  <div class="section" id="sec-0">
    <h2 class="section-title">Section heading</h2>
    <p>Paragraph with a <a href="other-page.desk">page link</a> or an
       <a href="https://example.com">external link</a>.</p>
  </div>

  <script>
    /* JS runs — extracted and re-injected at bottom of <body> after DOM is ready */
    document.getElementById('my-btn').addEventListener('click', function () { ... });
  </script>
</desk-page>
```

`<script>` blocks and inline event handlers (`onclick`, etc.) both work — the page viewer uses `'unsafe-inline'` CSP. `.desk` pages are local user-controlled content so this is acceptable. Everything else — tables, code blocks, images (`data:` URLs only), divs — is allowed.

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

Creates a new `.desk` file. Use `sections[]` to build structured content.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | Must end in `.desk`, e.g. `"auth-flow.desk"`. Book pages use `"<slug>/<page>.desk"` |
| `title` | string | **yes** | Shown in the page header and panel tab |
| `sections` | array | no | Structured section objects (see below) |
| `eyebrow` | string | no | Small text shown above the title (e.g. `"Reference · Backend"`) |
| `subtitle` | string | no | Short description shown below the title |
| `chapter` | integer | no | Chapter index (0-based) — used when adding the page to a book |

**Section object fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Section element id. Auto-generated if omitted |
| `heading` | string | no | Section `<h2>` text |
| `icon` | string | no | Emoji shown before the heading |
| `content` | string | no | Inner HTML for the section body |
| `type` | string | no | Built-in type (`steps`, `cards`, `kv-table`) or a registered custom type |
| `data` | object | no | Structured data passed to typed section renderers |

**Returns:** `"created auth-flow.desk"`

**Example — create a structured doc:**
```json
{
  "filename": "auth-flow.desk",
  "title": "Auth Flow",
  "eyebrow": "Reference · Backend",
  "subtitle": "How JWT tokens are issued.",
  "sections": [
    { "id": "sec-0", "heading": "Overview", "icon": "🔐", "content": "<p>Body HTML.</p>" },
    { "id": "sec-1", "heading": "Token Format", "content": "<table>...</table>" }
  ]
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
| `sections` | array | no | New sections array (replaces all sections) |
| `eyebrow` | string | no | New eyebrow text |
| `subtitle` | string | no | New subtitle |

**Returns:** `"updated auth-flow.desk"`

---

### `delete_page`

Deletes the `.desk` file. Cannot be undone.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `filename` | string | **yes** |

**Returns:** `"deleted auth-flow.desk"`

---

## Page template tools

The page template is a global shared `<style>` block / HTML skeleton that agents use when creating new pages. Always global — no scope argument.

### `get_page_template`

Returns the current global page template content.

**Arguments:** none

**Returns:** the template string, or an empty string if none is set.

---

### `set_page_template`

Replaces the global page template.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | **yes** | Full template content |

**Returns:** `"template saved"`

---

## Library tools

Libraries are JS/CSS bundles downloaded to `~/.desk/lib/<name>/` and auto-injected into every page viewer. Always global — no scope argument.

### `list_libraries`

Returns all configured libraries with install status.

**Arguments:** none

**Returns:**
```json
[
  {
    "name": "highlight-js",
    "description": "Syntax highlighting",
    "files": ["highlight.min.js", "default.min.css"],
    "installed": true
  }
]
```

---

### `add_library`

Adds a library to the global config and downloads its files.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | Short identifier, e.g. `"highlight-js"` |
| `files` | array | **yes** | Array of file URLs to download |
| `description` | string | no | Human-readable description |

**Returns:** `"library added"`

---

### `remove_library`

Removes a library from config and deletes its cached files.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | **yes** |

**Returns:** `"library removed"`

---

## Section CRUD tools

Surgical read/write tools for individual sections within a `.desk` page. Workspace-only — no scope argument.

### `list_sections`

Returns the section index for a page.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `filename` | string | **yes** |

**Returns:**
```json
[
  { "id": "sec-0", "heading": "Overview" },
  { "id": "sec-1", "heading": "Token Format" }
]
```

---

### `add_section`

Appends a new section to a page.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | |
| `heading` | string | **yes** | Section `<h2>` text |
| `content` | string | no | Inner HTML for the section body |
| `id` | string | no | Section element id. Auto-generated if omitted |
| `icon` | string | no | Emoji shown before the heading |
| `type` | string | no | Built-in or registered section type |
| `data` | object | no | Structured data for typed sections |

**Returns:** `"section added"`

---

### `update_section`

Updates a specific section within a page. Only provided fields are changed.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | |
| `section_id` | string | **yes** | Section element id |
| `heading` | string | no | New heading text |
| `content` | string | no | New inner HTML (replaces section body) |
| `type` | string | no | New section type |
| `data` | object | no | New structured data |

**Returns:** `"section updated"`

**Error:** Returns `-32603` with `"Section <id> not found"` if the id does not exist.

---

### `remove_section`

Removes a section from a page.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `filename` | string | **yes** |
| `section_id` | string | **yes** |

**Returns:** `"section removed"`

**Error:** Returns `-32603` with `"Section <id> not found"` if the id does not exist.

---

## List CRUD tools

Surgical tools for ordered and unordered lists within a section. Workspace-only — no scope argument. Indices are 1-based.

### `list_items`

Returns the list in a section.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `filename` | string | **yes** |
| `section_id` | string | **yes** |

**Returns:**
```json
{ "type": "ol", "items": ["Clone the repo", "Run npm install", "Run npm test"] }
```

---

### `add_list_item`

Appends an item to the list in a section.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | |
| `section_id` | string | **yes** | |
| `text` | string | **yes** | Item text (HTML allowed) |
| `list_type` | string | no | `"ul"` or `"ol"` — sets list type if the section has no list yet |

**Returns:** `"item added"`

---

### `remove_list_item`

Removes an item by 1-based index.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | |
| `section_id` | string | **yes** | |
| `index` | integer | **yes** | 1-based position |

**Returns:** `"item removed"`

**Error:** Returns `-32603` with `"index N out of range (list has M items)"` if the index is invalid.

---

### `update_list_item`

Replaces the text of an item at a 1-based index.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | |
| `section_id` | string | **yes** | |
| `index` | integer | **yes** | 1-based position |
| `text` | string | **yes** | New item text |

**Returns:** `"item updated"`

**Error:** Returns `-32603` with `"index N out of range (list has M items)"` if the index is invalid.

---

### `set_list_type`

Switches a section's list between ordered (`ol`) and unordered (`ul`).

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | |
| `section_id` | string | **yes** | |
| `type` | string | **yes** | `"ul"` or `"ol"` |

**Returns:** `"list type updated"`

---

## Section type tools

Section types control how typed sections are rendered. Built-in types: `steps`, `cards`, `kv-table`. Custom types use Handlebars-like templates.

### `list_section_types`

Returns all available section types (built-in and custom).

**Arguments:** none

**Returns:**
```json
[
  { "name": "steps", "description": "Numbered step list", "builtin": true },
  { "name": "cards", "description": "Card grid layout", "builtin": true },
  { "name": "kv-table", "description": "Key-value table", "builtin": true }
]
```

---

### `register_section_type`

Registers a custom section type with a Handlebars-like template.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | Type identifier (must not conflict with built-in names) |
| `description` | string | **yes** | Human-readable description |
| `template` | string | **yes** | Handlebars-like template string used to render `data` into HTML |

**Returns:** `"type registered"`

---

### `remove_section_type`

Removes a custom section type. Cannot remove built-in types.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | **yes** |

**Returns:** `"type removed"`

---

## Book tools

Books are ordered collections of pages organized into chapters, stored as `desk-pages/<slug>/book.json`. Book pages use filenames like `"<slug>/<page>.desk"`. Book tools are workspace-only — no scope argument.

### `create_book`

Creates a new book manifest.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **yes** | Book title |
| `slug` | string | no | URL-safe identifier. Auto-derived from title if omitted |

**Returns:** `"book created"`

---

### `list_books`

Returns all books in the workspace.

**Arguments:** none

**Returns:**
```json
[
  { "slug": "my-book", "title": "My Book", "pageCount": 5 }
]
```

---

### `get_book`

Returns the full chapter and page tree for a book.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `slug` | string | **yes** |

**Returns:**
```json
{
  "slug": "my-book",
  "title": "My Book",
  "chapters": [
    {
      "title": "Getting Started",
      "pages": [
        { "filename": "my-book/intro.desk", "title": "Introduction" }
      ]
    }
  ]
}
```

**Error:** Returns `-32603` with `"Book not found: <slug>"` if the slug does not exist.

---

### `delete_book`

Removes the book manifest. Pages on disk are not deleted.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `slug` | string | **yes** |

**Returns:** `"book deleted"`

---

### `add_chapter`

Adds a chapter to a book.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | **yes** | Book slug |
| `title` | string | **yes** | Chapter title |
| `position` | integer | no | 0-based insertion index. Appends if omitted |

**Returns:** `"chapter added"`

---

### `rename_chapter`

Renames an existing chapter.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | **yes** | Book slug |
| `chapter_index` | integer | **yes** | 0-based chapter index |
| `title` | string | **yes** | New chapter title |

**Returns:** `"chapter renamed"`

**Error:** Returns `-32603` with `"chapter_index N out of range"` if the index is invalid.

---

### `remove_chapter`

Removes a chapter from a book. Pages assigned to the chapter are not deleted from disk.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | **yes** | Book slug |
| `chapter_index` | integer | **yes** | 0-based chapter index |

**Returns:** `"chapter removed"`

**Error:** Returns `-32603` with `"chapter_index N out of range"` if the index is invalid.

---

### `move_page`

Moves a page to a different chapter within a book.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | **yes** | Book slug |
| `filename` | string | **yes** | Page filename (e.g. `"my-book/intro.desk"`) |
| `to_chapter` | integer | **yes** | 0-based target chapter index |
| `position` | integer | no | 0-based position within the target chapter. Appends if omitted |

**Returns:** `"page moved"`

---

## Workflow tools

Config and skill submissions are **non-blocking** — they queue for user confirmation in VS Code and return immediately. The user must confirm before anything is persisted or installed.

### `get_workflow_config`

Returns the current team workflow configuration.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | string | no | `"global"` or `"workspace"` |

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

Submits a partial config for user review. Fields are deep-merged with any existing config. The user sees a VS Code prompt to review and confirm before anything is written.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `config` | object | **yes** | Partial `WorkflowConfig` — any subset of top-level or nested fields |
| `scope` | string | no | `"global"` or `"workspace"` |

**Returns:** `{ "status": "submitted" }`

**Example — set Slack channels:**
```json
{
  "config": {
    "slack": { "status": "#eng-status", "deploy": "#deploys" },
    "language": "en",
    "githubOrg": "acme"
  }
}
```

---

## Skill tools

### `list_skills`

Returns all stored workflow skills (metadata only — no content bodies).

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | string | no | `"global"` or `"workspace"` |

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

### `get_skill`

Returns the full content of a stored skill, including YAML frontmatter and markdown body.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | Kebab-case skill name |
| `scope` | string | no | `"global"` or `"workspace"` |

**Returns:** the full skill markdown string.

**Error:** Returns `-32603` with `"Skill not found: <name>"` if no skill with that name exists.

---

### `add_skill`

Submits a workflow skill for user review. If a skill with the same `name` already exists, `version` is auto-incremented. The user sees a VS Code prompt showing the skill name and description; on confirm, Desk installs it on all detected agents in the appropriate format.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | Kebab-case skill name, e.g. `"dev-flow"` |
| `content` | string | **yes** | Full skill markdown with YAML frontmatter |
| `description` | string | no | Overrides the frontmatter description in the confirmation prompt |
| `scope` | string | no | `"global"` or `"workspace"` |

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
**Optional:** `triggers`, `agents` (`all` or `[claude-code, cursor, gemini, codex]`), `version` (auto-incremented on resubmit)

Read `desk://guide/skill-format` for the full spec.

---

### `remove_skill`

Removes a skill from storage and uninstalls it from all agent paths.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | |
| `scope` | string | no | `"global"` or `"workspace"` |

**Returns:** `{ "removed": "dev-flow" }`

**Error:** Returns `-32603` with `"Skill not found: <name>"` if no skill with that name exists.

---

## Dynamic skill-defined tools

Skills with a `tools:` frontmatter block expose additional tools. These appear in `tools/list` at runtime alongside the 39 static tools. Workspace-scoped dynamic tools override global tools with the same name. Argument values are shell-quoted before execution.

---

## CSS variables available in page styles

Desk maps its own variables onto VS Code's theme tokens so they automatically adapt to whatever theme the user has installed. Use these in page styles to stay on-theme across any VS Code color scheme:

| Variable | VS Code token | Usage |
|----------|---------------|-------|
| `--bg` | `--vscode-sideBar-background` | Page background |
| `--surface` | `--vscode-input-background` | Cards, code blocks |
| `--surface2` | `--vscode-list-hoverBackground` | Hover states, table rows |
| `--border` | `--vscode-widget-border` | Borders, dividers |
| `--text` | `--vscode-sideBar-foreground` | Body text |
| `--muted` | `--vscode-descriptionForeground` | Secondary/hint text |
| `--accent` | `--vscode-button-background` | Primary highlights |
| `--accent2` | `--vscode-textLink-foreground` | Links, code, tip callouts |
| `--radius` | *(fixed)* `10px` | Border radius |

---

## Error reference

| Situation | Code | Message pattern |
|-----------|------|-----------------|
| Bookmark not found | `-32603` | `"Bookmark not found: <id>"` |
| No workspace open | `-32603` | `"No workspace open — pages unavailable"` |
| Workflow config not set | `-32603` | `"Workflow config not configured"` |
| Skill not found | `-32603` | `"Skill not found: <name>"` |
| Book not found | `-32603` | `"Book not found: <slug>"` |
| Section not found | `-32603` | `"Section <id> not found"` |
| Chapter index out of range | `-32603` | `"chapter_index N out of range"` |
| List index out of range | `-32603` | `"index N out of range (list has M items)"` |
| Invalid skill frontmatter | `-32603` | `"Missing name"` / `"Missing description"` |
| Unknown tool name | `-32603` | `"Unknown tool: <name>"` |
| Malformed JSON body | `-32700` | `"Parse error"` |
