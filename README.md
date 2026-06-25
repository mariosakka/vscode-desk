# Desk for VS Code

[![CI](https://github.com/mariosakka/vscode-desk/actions/workflows/publish.yml/badge.svg)](https://github.com/mariosakka/vscode-desk/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A VS Code extension that keeps your bookmarks, docs, and team workflow config in one place — and exposes them to AI agents via a local MCP server.

- **Project-based bookmark sidebar** — named project groups with bookmark cards and auto-fetched favicons. Toggle between Workspace scope (current project) and Global scope (all workspaces).
- **`.desk` page viewer** — a lightweight XML doc format that renders inside a VS Code editor tab, with VS Code theme variables and optional per-page CSS.
- **Embedded MCP server** — a local JSON-RPC 2.0 HTTP server so AI agents can read and write bookmarks, pages, workflow config, and skills programmatically.
- **Workflow companion** — stores team workflow config and a skill registry; AI agents can submit config and skills via MCP, and the extension installs them on all detected AI agents after user confirmation.

All data lives in `~/.desk/` — plain JSON files, human-readable, and easy to back up.

---

## Features

| Status | Feature |
|--------|---------|
| ✅ | Sidebar panel (Activity Bar) with project-based bookmark groups |
| ✅ | Workspace and Global scope toggle |
| ✅ | Click any bookmark card to open the URL in your browser |
| ✅ | Favicons auto-fetched and cached for 30 days |
| ✅ | VS Code native theming — inherits your active color theme automatically |
| ✅ | `.desk` page viewer — render lightweight docs in an editor tab |
| ✅ | Embedded MCP HTTP server (17 tools, 3 resources) |
| ✅ | Workflow companion — team config + skill registry, auto-installed on detected AI agents |

---

## Usage

### Command Palette

| Command | Description |
|---------|-------------|
| `Desk: Add Project` | Create a new project group |
| `Desk: Add Bookmark` | Add a bookmark to a project (favicon auto-fetched) |
| `Desk: Remove Bookmark` | Remove a bookmark |
| `Desk: Remove Project` | Remove a project and all its bookmarks |
| `Desk: New Page` | Create a new `.desk` page file |
| `Desk: Open Page` | Open an existing `.desk` page in the viewer |
| `Desk: Setup Agents` | Re-run MCP setup on all installed agents, including already-configured ones |
| `Desk: Configure Workflow` | Manually set team workflow config fields |
| `Desk: Install Workflow Skills` | Install stored workflow skills on all detected agents |

### MCP Server (for AI agents)

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "vscode-desk": {
      "type": "http",
      "url": "http://localhost:3333/mcp"
    }
  }
}
```

**Available tools (17):** All tools accept an optional `scope: "workspace" | "global"` argument.

| Tool | Operation | Required args |
|------|-----------|---------------|
| `list_projects` | Read | — |
| `create_project` | Write | `name` |
| `remove_project` | Write | `project_id` |
| `list_bookmarks` | Read | — (`project_id` optional) |
| `add_bookmark` | Write | `project_id`, `title`, `url` |
| `remove_bookmark` | Write | `project_id`, `bookmark_id` |
| `update_bookmark` | Write | `project_id`, `bookmark_id`, `fields` |
| `list_pages` | Read | — |
| `create_page` | Write | `filename`, `title`, `content` |
| `update_page` | Write | `filename` |
| `delete_page` | Write | `filename` |
| `get_workflow_config` | Read | — |
| `submit_workflow_config` | Write | `config` |
| `list_skills` | Read | — |
| `add_skill` | Write | `name`, `content` |
| `remove_skill` | Write | `name` |
| `get_skill` | Read | `name` |

**Resources:** `desk://guide/quick-start`, `desk://guide/desk-page-format`, `desk://guide/skill-format`

### `.desk` page format

```xml
<desk-page title="Page Title">
  <style>/* optional per-page CSS */</style>
  <!-- HTML body content — no <script> tags -->
</desk-page>
```

Place `.desk` files in the `pages/` folder under the relevant scope directory (`~/.desk/global/pages/` or `~/.desk/workspaces/<slug>/pages/`).

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `desk.mcpPort` | `3333` | Port for the embedded MCP HTTP server |

---

## Development

```bash
npm install
npm run compile         # production build (extension + webview)
npm run compile:ext     # extension host only
npm run compile:webview # React webview only
npm run watch           # incremental dev build (extension host)
npm run watch:webview   # incremental dev build (React webview)
npm test                # Jest unit tests (129 tests)
npm run test:e2e        # Playwright e2e tests (32 tests) — requires compile first
# Press F5 in VS Code to launch the Extension Development Host
```

Tests run automatically in CI when a pull request is approved.
