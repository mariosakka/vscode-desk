# Desk MCP — Agent Quick Start

Desk is a VS Code extension that manages bookmarks, `.desk` pages, workflow config, and skills.
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
DeskData
└── bookmarks[]
    ├── id          string   (e.g. "bm_xyz789")
    ├── title       string
    ├── url         string
    ├── icon        string   (emoji or "data:image/..." base64)
    └── description string

Page
├── filename        string   (e.g. "auth-flow.desk")
├── title           string
├── eyebrow         string   (optional — small text above title)
├── subtitle        string   (optional — shown below title)
└── sections[]
    ├── id          string
    ├── heading     string
    ├── icon        string   (emoji)
    ├── content     string   (inner HTML)
    ├── type        string   ("steps" | "cards" | "kv-table" | custom)
    └── data        object   (for typed sections)

Book
├── slug            string
├── title           string
└── chapters[]
    ├── title       string
    └── pages[]     Page[]
```

Data is stored as plain JSON files in `~/.desk/global/` (global scope) or `~/.desk/workspaces/<slug>/` (workspace scope). Most tools accept an optional `scope: "global" | "workspace"` parameter; omit it to use workspace scope when a workspace is open.

Pages are separate — they live as `.desk` files in `desk-pages/` inside the open workspace. Book pages live at `desk-pages/<slug>/<page>.desk`.

## The typical loops

**Bookmarks:**
```
list_bookmarks      → see what's already there
add_bookmark        → add (favicon auto-fetched if icon omitted)
update_bookmark     → patch any fields
remove_bookmark     → clean up
```

**Pages:**
```
list_pages          → see what exists
create_page         → write a new .desk file with sections[]
update_page         → revise title, eyebrow, subtitle, or sections
delete_page         → remove a page
```

**Section CRUD (surgical edits):**
```
list_sections       → get section ids and headings
add_section         → append a new section
update_section      → change heading or content of one section
remove_section      → delete one section
```

**List CRUD (items within a section):**
```
list_items          → read the list in a section
add_list_item       → append an item
update_list_item    → change one item (1-based index)
remove_list_item    → delete one item (1-based index)
set_list_type       → switch between ul and ol
```

**Section types:**
```
list_section_types  → see built-in (steps, cards, kv-table) + custom types
register_section_type → add a custom Handlebars-like type
remove_section_type → remove a custom type
```

**Books:**
```
create_book         → make a new book manifest
list_books          → see all books
get_book            → read chapter/page tree
add_chapter         → add a chapter
rename_chapter      → rename a chapter
remove_chapter      → remove a chapter
move_page           → move a page to a different chapter
delete_book         → remove the manifest (pages stay on disk)
```

**Workflow config and skills:**
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
{ "jsonrpc": "2.0", "method": "tools/call",
  "params": {
    "name": "add_bookmark",
    "arguments": {
      "title": "GitHub",
      "url": "https://github.com",
      "description": "Code hosting"
    }
  }, "id": 1 }

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
      "eyebrow": "Reference · Backend",
      "subtitle": "How JWT tokens are issued.",
      "sections": [
        { "id": "sec-0", "heading": "Login sequence", "content": "<p>Details here.</p>" }
      ]
    }
  }, "id": 3 }
```

The user can then open `auth-flow.desk` from **Desk: Open Page** in the VS Code Command Palette,
or by adding a bookmark with `url: "desk-page:auth-flow.desk"`.

## Key rules

- **IDs are opaque** — always call `list_bookmarks` to get current IDs; never guess or cache them across sessions.
- **Favicon is free** — omit `icon` in `add_bookmark` and Desk fetches and caches it automatically (30-day TTL).
- **Sections are the unit** — build pages with `sections[]` in `create_page`; use section/list tools for surgical updates instead of replacing the whole page.
- **No workspace, no pages** — page, section, list, and book tools return an error if VS Code has no folder open.
- **Config and skill writes are non-blocking** — `submit_workflow_config` and `add_skill` return `{ "status": "submitted" }` immediately; the user confirms in VS Code before anything is persisted or installed.
- **HTTP 200 always** — errors come back as a JSON-RPC `error` object, not as HTTP 4xx/5xx.
- **Scope defaults to workspace** — omit `scope` when a workspace is open; pass `scope: "global"` to read/write global data.
- **Dynamic tools** — skills with a `tools:` frontmatter block expose additional tools that appear in `tools/list` at runtime alongside the 39 static tools.

## All 39 static tools at a glance

| Tool | R/W | Required args | Scope |
|------|-----|---------------|-------|
| `list_bookmarks` | R | — | optional |
| `add_bookmark` | W | `title`, `url` | optional |
| `remove_bookmark` | W | `bookmark_id` | optional |
| `update_bookmark` | W | `bookmark_id`, `fields` | optional |
| `list_pages` | R | — | workspace only |
| `create_page` | W | `filename`, `title` | workspace only |
| `update_page` | W | `filename` | workspace only |
| `delete_page` | W | `filename` | workspace only |
| `get_page_template` | R | — | global only |
| `set_page_template` | W | `content` | global only |
| `list_libraries` | R | — | global only |
| `add_library` | W | `name`, `files` | global only |
| `remove_library` | W | `name` | global only |
| `list_sections` | R | `filename` | workspace only |
| `add_section` | W | `filename`, `heading` | workspace only |
| `update_section` | W | `filename`, `section_id` | workspace only |
| `remove_section` | W | `filename`, `section_id` | workspace only |
| `list_items` | R | `filename`, `section_id` | workspace only |
| `add_list_item` | W | `filename`, `section_id`, `text` | workspace only |
| `remove_list_item` | W | `filename`, `section_id`, `index` | workspace only |
| `update_list_item` | W | `filename`, `section_id`, `index`, `text` | workspace only |
| `set_list_type` | W | `filename`, `section_id`, `type` | workspace only |
| `list_section_types` | R | — | — |
| `register_section_type` | W | `name`, `description`, `template` | — |
| `remove_section_type` | W | `name` | — |
| `create_book` | W | `title` | workspace only |
| `list_books` | R | — | workspace only |
| `get_book` | R | `slug` | workspace only |
| `delete_book` | W | `slug` | workspace only |
| `add_chapter` | W | `slug`, `title` | workspace only |
| `rename_chapter` | W | `slug`, `chapter_index`, `title` | workspace only |
| `remove_chapter` | W | `slug`, `chapter_index` | workspace only |
| `move_page` | W | `slug`, `filename`, `to_chapter` | workspace only |
| `get_workflow_config` | R | — | optional |
| `submit_workflow_config` | W | `config` | optional |
| `list_skills` | R | — | optional |
| `get_skill` | R | `name` | optional |
| `add_skill` | W | `name`, `content` | optional |
| `remove_skill` | W | `name` | optional |

For full parameter details see `agent-mcp-reference.md`.
