# Desk for VS Code

[![CI](https://github.com/mariosakka/vscode-desk/actions/workflows/publish.yml/badge.svg)](https://github.com/mariosakka/vscode-desk/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A VS Code extension that keeps your bookmarks, docs, and team workflow config in one place — and exposes them to AI agents via a local MCP server.

- **Bookmark sidebar** — flat list of bookmark cards per scope (workspace/global) with auto-fetched favicons.
- **`.desk` page viewer** — an XML-based doc format that renders in a VS Code editor tab; each page opens in its own tab with zoom controls and a collapsible TOC sidebar. Pages can be grouped into **books** with chapter navigation.
- **Embedded MCP server** — a local JSON-RPC 2.0 HTTP server (default port 3333) with 39 static tools, dynamic skill-defined tools, and 4 resources.
- **Workflow companion** — stores team workflow config and a skill registry; AI agents submit config and skills via MCP; the extension installs them on all detected AI agents after user confirmation.

All data lives in `~/.desk/` — plain JSON files, human-readable, and easy to back up.

---

## Features

| Status | Feature |
|--------|---------|
| ✅ | Sidebar panel with workspace/global scope toggle |
| ✅ | Bookmark cards with auto-fetched favicons (30-day cache) |
| ✅ | VS Code native theming — inherits your active color theme automatically |
| ✅ | `.desk` page viewer — multi-tab, zoom in/out/reset, collapsible TOC sidebar |
| ✅ | Books — group pages into chapters with in-viewer book navigation |
| ✅ | Embedded MCP server (39 static tools + dynamic skill tools, 4 resources) |
| ✅ | Workflow companion — team config + skill registry, auto-installed on detected AI agents |
| ✅ | Page libraries — auto-injected JS/CSS bundles (e.g. highlight.js) |
| ✅ | Worktree-aware workspace linking — linked git worktrees share data with the main worktree |

---

## Usage

### Command Palette

| Command | Description |
|---------|-------------|
| `Desk: Add Bookmark` | Add a bookmark (favicon auto-fetched) |
| `Desk: Remove Bookmark` | Remove a bookmark |
| `Desk: Edit Bookmark` | Edit a bookmark's title or URL |
| `Desk: List Bookmarks` | Show all bookmarks in a QuickPick |
| `Desk: New Page` | Create a new `.desk` page |
| `Desk: Open Page` | Open an existing `.desk` page in the viewer |
| `Desk: Delete Page` | Delete a `.desk` page |
| `Desk: New Book` | Create a new book |
| `Desk: Open Book` | Open a book in the viewer |
| `Desk: Delete Book` | Delete a book |
| `Desk: Add Chapter` | Add a chapter to a book |
| `Desk: Rename Chapter` | Rename a book chapter |
| `Desk: Remove Chapter` | Remove a chapter from a book |
| `Desk: New Book Page` | Create a new page inside a book chapter |
| `Desk: Move Book Page` | Move a page between book chapters |
| `Desk: Zoom In` | Increase page viewer zoom |
| `Desk: Zoom Out` | Decrease page viewer zoom |
| `Desk: Reset Zoom` | Reset page viewer zoom to default |
| `Desk: Toggle TOC` | Show or hide the TOC sidebar in the page viewer |
| `Desk: Open URL` | Prompt for a URL and open it in VS Code Simple Browser |
| `Desk: Set Up Agent MCP Integration` | Re-run MCP setup on all installed agents |
| `Desk: Configure Workflow` | Manually set team workflow config fields |
| `Desk: Install Workflow Skills` | Install stored skills on all detected agents |
| `Desk: New Skill` | Open an untitled editor pre-filled with the skill frontmatter template |
| `Desk: Edit Skill` | Open an existing skill for editing |
| `Desk: Submit Skill` | Read the active editor and store/update the skill in the registry |
| `Desk: Remove Skill` | Remove a skill from the registry |
| `Desk: List Skills` | Show all installed skills in a QuickPick |
| `Desk: View Workflow Config` | Show the current workflow config in a QuickPick |

### MCP Server (for AI agents)

Add to your Claude Code settings (`~/.claude/settings.json`):

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

**39 static tools** (plus dynamic tools generated from skill definitions):

| Group | Tools |
|-------|-------|
| Bookmarks | `list_bookmarks`, `add_bookmark`, `remove_bookmark`, `update_bookmark` |
| Pages | `list_pages`, `create_page`, `update_page`, `delete_page` |
| Workflow | `get_workflow_config`, `submit_workflow_config` |
| Skills | `list_skills`, `get_skill`, `add_skill`, `remove_skill` |
| Page template | `get_page_template`, `set_page_template` |
| Libraries | `list_libraries`, `add_library`, `remove_library` |
| Sections | `list_sections`, `add_section`, `update_section`, `remove_section` |
| Lists | `list_items`, `add_list_item`, `remove_list_item`, `update_list_item`, `set_list_type` |
| Section types | `list_section_types`, `register_section_type`, `remove_section_type` |
| Books | `create_book`, `list_books`, `get_book`, `delete_book`, `add_chapter`, `rename_chapter`, `remove_chapter`, `move_page` |

**4 resources:** `desk://guide/quick-start`, `desk://guide/desk-page-format`, `desk://guide/skill-format`, `desk://workspace/current`

### `.desk` page format

```xml
<desk-page title="Page Title">
  <style>/* optional per-page CSS */</style>
  <!-- HTML body content -->
  <script>
    /* JS runs after DOM is ready — re-injected at bottom of <body>. */
    document.getElementById('my-btn').addEventListener('click', () => { ... });
  </script>
</desk-page>
```

Page files live in `<workspace>/desk-pages/`. Content is injected into a centred `<div class="page-content">` wrapper (max-width 860px) — no outer layout CSS needed. Links to other `.desk` pages navigate within the viewer; `https://` links open in the browser.

### Skill format

```markdown
---
name: dev-flow
description: >-
  One-line description used by agents to decide when to invoke.
triggers:
  - starting a new task
agents: all
version: 1
---

Skill body — plain markdown, works across all agents.
Call `get_workflow_config` at startup to read team-specific values.
```

Required fields: `name` (kebab-case), `description`. Optional: `triggers`, `agents` (`all` or `[claude-code, cursor, gemini, codex]`), `version`.

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `desk.mcpPort` | `3333` | Port for the embedded MCP HTTP server |
| `desk.pageViewer.defaultZoom` | `1.0` | Default zoom level (0.5–3.0) |
| `desk.pageViewer.tocCollapsed` | `false` | Start with the TOC sidebar collapsed |
| `desk.pageViewer.openLinksIn` | `"simpleBrowser"` | Where to open `https://` links: `simpleBrowser` or `externalBrowser` |
| `desk.pageViewer.singleTab` | `false` | Open all pages in one tab instead of separate tabs |
| `desk.skillTools.enabled` | `true` | Enable skill-defined MCP tools |
| `desk.skillTools.timeoutSeconds` | `30` | Timeout for skill tool commands |
| `desk.worktreeLinking.enabled` | `true` | Map linked git worktrees to the main worktree's data |

---

## Development

```bash
npm install
npm run compile          # production build (extension + webview)
npm run compile:ext      # extension host only
npm run compile:webview  # React webview only
npm run watch            # incremental dev build (extension host)
npm run watch:webview    # incremental dev build (React webview)
npm test                 # Jest unit tests (275 tests)
npm run test:e2e         # Playwright e2e tests (34 tests) — requires compile first
# Press F5 in VS Code to launch the Extension Development Host
```

Tests run automatically in CI on every pull request push.
