# Relay for VS Code

[![CI](https://github.com/mariosakka/vscode-relay/actions/workflows/publish.yml/badge.svg)](https://github.com/mariosakka/vscode-relay/actions/workflows/publish.yml)
[![VS Marketplace](https://vsmarketplacebadges.dev/version/mmswflow.vscode-relay.svg)](https://marketplace.visualstudio.com/items?itemName=mmswflow.vscode-relay)
[![Installs](https://vsmarketplacebadges.dev/installs/mmswflow.vscode-relay.svg)](https://marketplace.visualstudio.com/items?itemName=mmswflow.vscode-relay)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A VS Code extension with three integrated features:

- **Tabbed bookmark sidebar** — named tab groups with bookmark cards and auto-fetched favicons
- **`.relay` page viewer** — a lightweight XML doc format that renders inside a VS Code editor tab, with VS Code theme variables and optional per-page CSS
- **Embedded MCP server** — a local JSON-RPC 2.0 HTTP server so AI agents can read and write bookmarks and pages programmatically

---

## Features

| Status | Feature |
|--------|---------|
| ✅ | Sidebar panel (Activity Bar) with tabbed bookmark groups |
| ✅ | Click any bookmark card to open the URL in your browser |
| ✅ | Favicons auto-fetched and cached for 30 days |
| ✅ | VS Code native theming — inherits your active color theme automatically |
| ✅ | `.relay` page viewer — render lightweight docs in an editor tab |
| ✅ | Embedded MCP HTTP server (11 tools, 2 resources) |

---

## Usage

### Command Palette

| Command | Description |
|---------|-------------|
| `Relay: Add Tab` | Create a new bookmark tab |
| `Relay: Add Bookmark` | Add a bookmark to a tab (favicon auto-fetched) |
| `Relay: Remove Bookmark` | Remove a bookmark |
| `Relay: Remove Tab` | Remove a tab and all its bookmarks |
| `Relay: New Page` | Create a new `.relay` page file |
| `Relay: Open Page` | Open an existing `.relay` page in the viewer |

### MCP Server (for AI agents)

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "vscode-relay": {
      "type": "http",
      "url": "http://localhost:3333/mcp"
    }
  }
}
```

**Available tools (11):**

| Tool | Operation | Required args |
|------|-----------|---------------|
| `list_tabs` | Read | — |
| `list_bookmarks` | Read | — (`tab_id` optional) |
| `add_bookmark` | Write | `tab_id`, `title`, `url` |
| `remove_bookmark` | Write | `tab_id`, `bookmark_id` |
| `create_tab` | Write | `name` |
| `remove_tab` | Write | `tab_id` |
| `update_bookmark` | Write | `tab_id`, `bookmark_id`, `fields` |
| `list_pages` | Read | — |
| `create_page` | Write | `filename`, `title`, `content` |
| `update_page` | Write | `filename` |
| `delete_page` | Write | `filename` |

**Resources:** `relay://guide/quick-start`, `relay://guide/relay-page-format`

### `.relay` page format

```xml
<relay-page title="Page Title">
  <style>/* optional per-page CSS */</style>
  <!-- HTML body content — no <script> tags -->
</relay-page>
```

Place `.relay` files in the `relay-pages/` folder at the root of your workspace.

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `relay.mcpPort` | `3333` | Port for the embedded MCP HTTP server |

---

## Development

```bash
npm install
npm run compile    # production build
npm run watch      # incremental dev build
npm test           # Jest unit tests (30 tests)
npm run test:e2e   # Playwright e2e tests (24 tests)
# Press F5 in VS Code to launch the Extension Development Host
```

Tests run automatically in CI when a pull request is approved.
