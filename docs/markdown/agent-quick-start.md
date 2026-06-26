# Desk MCP — Agent Quick Start

Desk is a VS Code extension that manages bookmarks and `.desk` pages.
It exposes a local JSON-RPC 2.0 server so you can read and write its data programmatically.

## Connect

The server runs on `http://127.0.0.1:3333/mcp` by default while VS Code is open with Desk installed. If port 3333 is already in use (e.g. a second VS Code window), Desk auto-selects the next free port — check the MCP setup notification in VS Code to see the actual URL.

Add it to your MCP client config (Claude Code example):

```json
{
  "mcpServers": {
    "vscode-desk": {
      "type": "http",
      "url": "http://127.0.0.1:3333/mcp"
    }
  }
}
```

## The shape of data

```
PortalData
└── projects[]
    ├── id        string   (e.g. "proj_abc123")
    ├── name      string
    └── bookmarks[]
        ├── id          string   (e.g. "bm_xyz789")
        ├── title       string
        ├── url         string
        ├── icon        string   (emoji or "data:image/..." base64)
        └── description string
```

Data is stored as plain JSON files in `~/.desk/global/` (global scope) or `~/.desk/workspaces/<slug>/` (workspace scope). All tools accept an optional `scope: "global" | "workspace"` parameter; it defaults to `"global"`.

Pages are separate — they live as `.desk` files in `desk-pages/` inside the open workspace.

## The typical loop

```
list_projects       → find or create the right project
list_bookmarks      → see what's already there
add_bookmark        → add new ones  (favicon auto-fetched if icon omitted)
update_bookmark     → fix title/url/description
remove_bookmark     → clean up
```

For pages:

```
list_pages          → see what exists
create_page         → write a new .desk file
update_page         → revise title, body, or per-page styles
delete_page         → remove a page
```

For workflow config and skills:

```
get_workflow_config    → read team config (Slack channels, GitHub org, language, PR account)
submit_workflow_config → propose a config update (user confirms in VS Code before it saves)
list_skills            → see installed workflow skills
get_skill              → read the full content of a stored skill
add_skill              → submit a new skill for user review (user confirms before install)
remove_skill           → remove a skill and uninstall from all agent paths
```

## Minimal example — add one bookmark

```json
// 1. Find a project
{ "jsonrpc": "2.0", "method": "tools/call",
  "params": { "name": "list_projects", "arguments": {} }, "id": 1 }

// → [{ "id": "proj_abc123", "name": "Work", "bookmarkCount": 3 }]

// 2. Add a bookmark (icon auto-fetched)
{ "jsonrpc": "2.0", "method": "tools/call",
  "params": {
    "name": "add_bookmark",
    "arguments": {
      "project_id": "proj_abc123",
      "title": "GitHub",
      "url": "https://github.com",
      "description": "Code hosting"
    }
  }, "id": 2 }

// → { "id": "bm_new999", "title": "GitHub", "url": "https://github.com", ... }
```

## Minimal example — create a page

```json
{ "jsonrpc": "2.0", "method": "tools/call",
  "params": {
    "name": "create_page",
    "arguments": {
      "filename": "auth-flow.desk",
      "title": "Auth Flow",
      "content": "<h2>Login sequence</h2><p>Details here.</p>",
      "customStyles": ".step { border-left: 3px solid var(--accent2); padding-left: 12px; }"
    }
  }, "id": 3 }
```

The user can then open `auth-flow.desk` from **Desk: Open Page** in the VS Code Command Palette,
or by adding a bookmark with `url: "desk-page:auth-flow.desk"`.

## Key rules

- **IDs are opaque** — always call `list_projects` / `list_bookmarks` to get current IDs; never guess or cache them across sessions.
- **Favicon is free** — omit `icon` in `add_bookmark` and Desk fetches and caches it automatically (30-day TTL).
- **Custom styles are scoped** — CSS in `customStyles` only applies inside that page; use `var(--accent)`, `var(--accent2)`, `var(--text)`, `var(--muted)` to stay on-theme.
- **No workspace, no pages** — page tools return an error if VS Code has no folder open.
- **Config and skill writes are non-blocking** — `submit_workflow_config` and `add_skill` return `{ "status": "submitted" }` immediately; the user confirms in VS Code before anything is persisted or installed.
- **HTTP 200 always** — errors come back as a JSON-RPC `error` object, not as HTTP 4xx/5xx.
- **Scope defaults to global** — omit `scope` to read/write global data; pass `scope: "workspace"` for workspace-specific data.

## All 17 tools at a glance

| Tool | Reads | Writes | Required args |
|------|-------|--------|---------------|
| `list_projects` | ✓ | | — |
| `list_bookmarks` | ✓ | | — (`project_id` optional) |
| `add_bookmark` | | ✓ | `project_id`, `title`, `url` |
| `remove_bookmark` | | ✓ | `project_id`, `bookmark_id` |
| `create_project` | | ✓ | `name` |
| `remove_project` | | ✓ | `project_id` |
| `update_bookmark` | | ✓ | `project_id`, `bookmark_id`, `fields` |
| `list_pages` | ✓ | | — |
| `create_page` | | ✓ | `filename`, `title`, `content` |
| `update_page` | | ✓ | `filename` (+ any fields to change) |
| `delete_page` | | ✓ | `filename` |
| `get_workflow_config` | ✓ | | — |
| `submit_workflow_config` | | ✓ | `config` (partial WorkflowConfig) |
| `list_skills` | ✓ | | — |
| `get_skill` | ✓ | | `name` |
| `add_skill` | | ✓ | `name`, `content` |
| `remove_skill` | | ✓ | `name` |

All tools also accept an optional `scope: "global" | "workspace"` parameter (default: `"global"`).

For full parameter details see `agent-mcp-reference.md`.
