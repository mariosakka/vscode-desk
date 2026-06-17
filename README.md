# Relay for VS Code

A VS Code sidebar extension with tabbed bookmark groups and link cards. Click a card to open the URL in your browser.

Also exposes a local MCP HTTP server so AI agents (Claude Code, etc.) can manage bookmarks programmatically.

## Features

- Sidebar panel (Activity Bar) with tabbed bookmark groups
- Click any bookmark card to open the URL in your browser
- Favicons auto-fetched and cached for 30 days
- Dark / light theme toggle (persisted in localStorage)
- Embedded MCP HTTP server on `localhost:3333`

## Usage

### Command Palette

| Command | Description |
|---------|-------------|
| `Relay: Add Tab` | Create a new tab |
| `Relay: Add Bookmark` | Add a bookmark to a tab (favicon auto-fetched) |
| `Relay: Remove Bookmark` | Remove a bookmark |
| `Relay: Remove Tab` | Remove a tab and all its bookmarks |

### MCP Server (for AI agents)

Add to `~/.claude/settings.json`:

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

Available tools: `list_tabs`, `list_bookmarks`, `add_bookmark`, `remove_bookmark`, `create_tab`, `remove_tab`, `update_bookmark`.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `relay.mcpPort` | `3333` | Port for the embedded MCP HTTP server |

## Development

```bash
npm install
npm run compile    # production build
npm test           # run tests
# Press F5 in VS Code to launch the Extension Development Host
```
