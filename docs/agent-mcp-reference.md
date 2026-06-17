# Relay MCP — Full Agent Reference

**Endpoint:** `POST http://localhost:3333/mcp`  
**Protocol:** JSON-RPC 2.0 (MCP Streamable HTTP transport, version `2024-11-05`)  
**Server identity:** `{ "name": "vscode-relay", "version": "0.0.1" }`

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
{ "jsonrpc": "2.0", "error": { "code": -32603, "message": "Tab not found: tab_abc" }, "id": 1 }
```

Parse errors return HTTP 400; unknown routes return HTTP 404.

---

## Initialization

MCP clients send `initialize` before any tool call. Relay responds with its capabilities.

```json
// request
{ "jsonrpc": "2.0", "method": "initialize", "params": {}, "id": 0 }

// response
{
  "protocolVersion": "2024-11-05",
  "capabilities": { "tools": {} },
  "serverInfo": { "name": "vscode-relay", "version": "0.0.1" }
}
```

---

## Bookmark tools

### `list_tabs`

Returns all tabs with their IDs, names, and bookmark counts.

**Arguments:** none

**Returns:**
```json
[
  { "id": "tab_abc123", "name": "Work", "bookmarkCount": 4 },
  { "id": "tab_def456", "name": "Research", "bookmarkCount": 2 }
]
```

---

### `list_bookmarks`

Returns bookmarks. Without `tab_id` returns all bookmarks across all tabs, each with a `tab_id` field added.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tab_id` | string | no | Filter to one tab |

**Returns (single tab):**
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

**Returns (all tabs — no `tab_id`):**
```json
[
  { "id": "bm_xyz789", "tab_id": "tab_abc123", "title": "MDN Web Docs", ... }
]
```

---

### `add_bookmark`

Adds a bookmark to a tab. If `icon` is omitted, Relay fetches the site's favicon automatically and caches it for 30 days. Falls back to `🌐` if the fetch fails.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tab_id` | string | **yes** | Target tab ID |
| `title` | string | **yes** | Display name on the card |
| `url` | string | **yes** | Full URL including scheme |
| `icon` | string | no | Emoji or base64 `data:` URL. Omit to auto-fetch favicon |
| `description` | string | no | Short description shown below title |

**Returns:** the created bookmark object including its new `id`.

```json
{ "id": "bm_new001", "title": "GitHub", "url": "https://github.com", "icon": "data:image/png;base64,...", "description": "" }
```

**Note:** To link a bookmark to a `.relay` page instead of a URL, set `url` to `relay-page:<filename>` (e.g. `relay-page:auth-flow.relay`). Clicking the card in the sidebar opens the page viewer.

---

### `remove_bookmark`

Permanently removes a bookmark. Cannot be undone.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `tab_id` | string | **yes** |
| `bookmark_id` | string | **yes** |

**Returns:** `"removed"`

---

### `create_tab`

Creates a new empty tab group.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | **yes** |

**Returns:** the new tab object.

```json
{ "id": "tab_new111", "name": "AI Tools", "bookmarks": [] }
```

---

### `remove_tab`

Removes a tab and **all its bookmarks**. Cannot be undone.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `tab_id` | string | **yes** |

**Returns:** `"removed"`

---

### `update_bookmark`

Partially updates a bookmark. Only the fields present in `fields` are changed; everything else is preserved.

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tab_id` | string | **yes** | |
| `bookmark_id` | string | **yes** | |
| `fields` | object | **yes** | Any subset of `title`, `url`, `icon`, `description` |

**Returns:** the updated bookmark object.

```json
// rename and re-point a bookmark
{
  "tab_id": "tab_abc123",
  "bookmark_id": "bm_xyz789",
  "fields": { "title": "MDN — HTML", "url": "https://developer.mozilla.org/en-US/docs/Web/HTML" }
}
```

---

## Page tools

Pages are `.relay` files stored in `<workspace>/relay-pages/`. All page tools return an error if VS Code has no workspace folder open.

### The `.relay` file format

```xml
<relay-page title="Page Title">
  <style>
    /* optional — CSS scoped to this page only */
    /* use var(--accent), var(--accent2), var(--text), var(--muted) to stay on-theme */
    .my-class { color: var(--accent2); }
  </style>

  <!-- HTML body goes here — any standard HTML except <script> tags -->
  <h2>Section heading</h2>
  <p>Paragraph with a <a href="other-page.relay">page link</a> or an
     <a href="https://example.com">external link</a>.</p>
</relay-page>
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

Returns all `.relay` files in `relay-pages/`.

**Arguments:** none

**Returns:**
```json
[
  { "filename": "auth-flow.relay", "title": "Auth Flow" },
  { "filename": "api-spec.relay", "title": "API Specification" }
]
```

---

### `create_page`

Creates a new `.relay` file. Fails silently if the file already exists (use `update_page` to change it).

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **yes** | Must end in `.relay`, e.g. `"auth-flow.relay"` |
| `title` | string | **yes** | Shown in the page header and panel tab |
| `content` | string | **yes** | HTML body content (no `<script>` tags) |
| `customStyles` | string | no | CSS injected only for this page |

**Returns:** `"created auth-flow.relay"`

**Example — create a structured doc:**
```json
{
  "filename": "onboarding.relay",
  "title": "Team Onboarding",
  "content": "<h2>Setup</h2><ol><li>Clone the repo</li><li>Run <code>npm install</code></li></ol><h2>Next steps</h2><p>See <a href=\"api-spec.relay\">API spec</a>.</p>",
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

**Returns:** `"updated onboarding.relay"`

**Example — append a note by reading first, then updating:**
```
1. list_pages → confirm "onboarding.relay" exists
2. (read current content from list context or prior knowledge)
3. update_page with new content that includes the original + the addition
```

---

### `delete_page`

Deletes the `.relay` file. Cannot be undone.

**Arguments:**

| Field | Type | Required |
|-------|------|----------|
| `filename` | string | **yes** |

**Returns:** `"deleted onboarding.relay"`

---

## CSS variables available in page styles

Relay maps its own variables onto VS Code's theme tokens, so they automatically adapt to whatever theme the user has installed. Use these in `customStyles` to stay on-theme across any VS Code color scheme:

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
| Tab not found | `-32603` | `"Tab not found: <id>"` |
| Bookmark not found | `-32603` | `"Bookmark not found: <id>"` |
| Page file not found | `-32603` | `"ENOENT: no such file..."` |
| No workspace open | `-32603` | `"No workspace open — pages unavailable"` |
| Unknown tool name | `-32603` | `"Unknown tool: <name>"` |
| Unknown RPC method | `-32603` | `"Unknown method: <method>"` |
| Malformed JSON body | `-32700` | `"Parse error"` |
