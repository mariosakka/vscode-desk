# Changelog

## [0.2.0](https://github.com/mariosakka/vscode-desk/compare/v0.1.0...v0.2.0) (2026-06-25)


### Features

* MCP auto-registration and agent permission patching ([#9](https://github.com/mariosakka/vscode-desk/issues/9)) ([2cc1b16](https://github.com/mariosakka/vscode-desk/commit/2cc1b161ee515d29d32938e55f3a89ddb8631558))

## [Unreleased]

### Features

* rename extension to Desk; all commands, settings, and MCP URIs now use the `desk` prefix
* store all user data in `~/.desk/` (plain JSON files) instead of VS Code globalState
* replace tab-based bookmark groups with project-based groups supporting Workspace and Global scopes
* add scope toggle in sidebar to switch between workspace and global bookmark sets
* add `get_skill` MCP tool; all 17 tools now accept optional `scope` argument
* update MCP resources to `desk://guide/*`
* update `.desk` page format (replaces `.relay`)

## 1.0.0 (2026-06-18)


### Features

* add .relay page viewer with MCP authoring tools ([d87aa9c](https://github.com/mariosakka/vscode-relay/commit/d87aa9c0501604553fc6ac67eef105d11b263029))
* add Bookmark, Tab, PortalData interfaces ([6efde6c](https://github.com/mariosakka/vscode-relay/commit/6efde6cffbeceb6b12bf5da153b06d2d03de2fd9))
* add webview static files — HTML template, CSS (ddd design system), JS ([7f6fc03](https://github.com/mariosakka/vscode-relay/commit/7f6fc03f7a3cf0f0fd8dd0c12b254c6f79eaff98))
* auto-fetch favicons with 30-day cache; render as img in webview ([3b02eee](https://github.com/mariosakka/vscode-relay/commit/3b02eeea763f2715ac726504362e9ea9ab15d9cf))
* expose agent guide as MCP resources ([6daf9af](https://github.com/mariosakka/vscode-relay/commit/6daf9aff7dc2cb4f9620fd3b0e96299315d1f491))
* implement DataService — empty default state, no hardcoded URLs ([ac6cb1c](https://github.com/mariosakka/vscode-relay/commit/ac6cb1cf4ec919f1c1667e345bd968b4562d2b5f))
* implement McpServer — 7 MCP tools, auto-favicon on add_bookmark ([bf0c61f](https://github.com/mariosakka/vscode-relay/commit/bf0c61f710ce671a6cef145f599429ce947123a9))
* implement PortalViewProvider — webview HTML generation, message bridge ([0b0554d](https://github.com/mariosakka/vscode-relay/commit/0b0554dedd84b8b62e49e4a9286f4c02ce19dacc))
* wire extension entrypoint — DataService, FaviconService, PortalViewProvider, McpServer, 4 commands ([4f6e1d6](https://github.com/mariosakka/vscode-relay/commit/4f6e1d69f3044fc85f29d5f2ff82afcd8c1af710))


### Bug Fixes

* tighten renderIcon data: guard; bound redirect depth to 2 in favicon fetcher ([f5ff19e](https://github.com/mariosakka/vscode-relay/commit/f5ff19ea7593285cc2596d60a0006c32e8ce3714))

## [0.0.1] — Initial release

- Sidebar panel with tabbed bookmark groups
- Click bookmark cards to open URLs in browser
- Favicon auto-fetch with 30-day hostname cache
- Dark / light theme toggle
- Embedded MCP HTTP server with 7 tools
- Command palette: Add/Remove Tab, Add/Remove Bookmark
