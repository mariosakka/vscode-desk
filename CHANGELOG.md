# Changelog

## [0.5.0](https://github.com/mariosakka/vscode-desk/compare/v0.4.1...v0.5.0) (2026-06-27)


### Features

* bundle default page template; fall back when none is set ([7cf3f61](https://github.com/mariosakka/vscode-desk/commit/7cf3f61fc21b0c182a20ab3839870fc1f18ee2c7))
* bundle default page template; fall back when none is set ([8c7ed99](https://github.com/mariosakka/vscode-desk/commit/8c7ed99f5015431efea6a4b993ebefa3e15cffb7))


### Bug Fixes

* update e2e sidebar selectors after BookmarksPanel refactor ([93f8b85](https://github.com/mariosakka/vscode-desk/commit/93f8b85af680d9c899ea5a8ca02f4a86323d2eb4))
* update e2e sidebar selectors after BookmarksPanel refactor ([b0831fa](https://github.com/mariosakka/vscode-desk/commit/b0831faee86356c5b069ab3d25b54f098b2e3b77))

## [0.4.1](https://github.com/mariosakka/vscode-desk/compare/v0.4.0...v0.4.1) (2026-06-26)


### Bug Fixes

* bookmarks section — remove duplicate empty state, match pages panel style ([95deb4f](https://github.com/mariosakka/vscode-desk/commit/95deb4fdc5a82202f13f383cfffac39da349c882))
* bookmarks section visual bugs + style match pages panel ([b9869fe](https://github.com/mariosakka/vscode-desk/commit/b9869fee78d74d1a3c843d98049ccba848752d20))

## [0.4.0](https://github.com/mariosakka/vscode-desk/compare/v0.3.6...v0.4.0) (2026-06-26)


### Features

* global page template — MCP tools + sidebar panel ([9106025](https://github.com/mariosakka/vscode-desk/commit/910602569f1e565fe231f272595d68dbb3e21a89))
* page consistency — global template, content wrapper, richer docs ([d495fdc](https://github.com/mariosakka/vscode-desk/commit/d495fdcfacca618f5ba9d38678fbceafab561934))


### Bug Fixes

* scroll to top when navigating to a new .desk page ([eadd97f](https://github.com/mariosakka/vscode-desk/commit/eadd97f87e23ca5614081410da6929ceb4ff35de))

## [0.3.6](https://github.com/mariosakka/vscode-desk/compare/v0.3.5...v0.3.6) (2026-06-26)


### Bug Fixes

* auto-select free MCP port; harden nav bar against page CSS ([#32](https://github.com/mariosakka/vscode-desk/issues/32)) ([e1323a3](https://github.com/mariosakka/vscode-desk/commit/e1323a3b90b4a332b58df156abdbd228a8a23f08))

## [0.3.5](https://github.com/mariosakka/vscode-desk/compare/v0.3.4...v0.3.5) (2026-06-25)


### Bug Fixes

* allow inline event handlers in page viewer by using unsafe-inline CSP ([#30](https://github.com/mariosakka/vscode-desk/issues/30)) ([a34e576](https://github.com/mariosakka/vscode-desk/commit/a34e5769d89da539e46b20618d6fe755ae0977e9))

## [0.3.4](https://github.com/mariosakka/vscode-desk/compare/v0.3.3...v0.3.4) (2026-06-25)


### Bug Fixes

* anchor links scroll in-page; page scripts run via nonce re-injection ([#28](https://github.com/mariosakka/vscode-desk/issues/28)) ([d434a07](https://github.com/mariosakka/vscode-desk/commit/d434a07ecdbb26b2f83104b8d7984a5125bb1106))

## [0.3.3](https://github.com/mariosakka/vscode-desk/compare/v0.3.2...v0.3.3) (2026-06-25)


### Bug Fixes

* correct CLAUDE.md — CI trigger, test counts, page viewer behaviour ([#26](https://github.com/mariosakka/vscode-desk/issues/26)) ([58103a1](https://github.com/mariosakka/vscode-desk/commit/58103a1e051ab7b1f476f0615a87562e7bc8ddac))

## [0.3.2](https://github.com/mariosakka/vscode-desk/compare/v0.3.1...v0.3.2) (2026-06-25)


### Bug Fixes

* page viewer renders full-page layouts without wrapper constraints ([#23](https://github.com/mariosakka/vscode-desk/issues/23)) ([d3293c9](https://github.com/mariosakka/vscode-desk/commit/d3293c9a20a3d2ef1959ca293e274088fe31cdf6))

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
