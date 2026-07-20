# Changelog

## [0.13.3](https://github.com/mariosakka/vscode-desk/compare/v0.13.2...v0.13.3) (2026-07-20)


### Bug Fixes

* write per-workspace .claude/settings.json so each session connects to the right VS Code window ([#72](https://github.com/mariosakka/vscode-desk/issues/72)) ([5432b7d](https://github.com/mariosakka/vscode-desk/commit/5432b7d75863db4a14c53664d53929067e3796c0))

## [0.13.2](https://github.com/mariosakka/vscode-desk/compare/v0.13.1...v0.13.2) (2026-07-20)


### Bug Fixes

* wire TOC toggle click handler after DOM is ready ([#70](https://github.com/mariosakka/vscode-desk/issues/70)) ([603d05f](https://github.com/mariosakka/vscode-desk/commit/603d05fedc1088c3de518b826aa7dec3275cb96a))

## [0.13.1](https://github.com/mariosakka/vscode-desk/compare/v0.13.0...v0.13.1) (2026-07-20)


### Bug Fixes

* auto-migrate old stdio proxy MCP config to direct HTTP on startup ([#68](https://github.com/mariosakka/vscode-desk/issues/68)) ([6e43481](https://github.com/mariosakka/vscode-desk/commit/6e4348145e87addc789260eef8f76b65c23c286d))

## [0.13.0](https://github.com/mariosakka/vscode-desk/compare/v0.12.1...v0.13.0) (2026-07-09)


### Features

* replace pages panel with books panel in sidebar ([67d96d4](https://github.com/mariosakka/vscode-desk/commit/67d96d4a983b3869d66268f884912185974ccc3a))
* replace pages panel with books panel in sidebar ([5f72dd0](https://github.com/mariosakka/vscode-desk/commit/5f72dd07793380e89a578667293df880c77cee6e))

## [0.12.1](https://github.com/mariosakka/vscode-desk/compare/v0.12.0...v0.12.1) (2026-07-09)


### Bug Fixes

* remove stale back-button e2e tests and update page viewer helper ([7ca0504](https://github.com/mariosakka/vscode-desk/commit/7ca050434abf1203123607f8239addfdd9270e2f))
* remove stale back-button e2e tests; update page-viewer helper for new HTML template ([0c3efcf](https://github.com/mariosakka/vscode-desk/commit/0c3efcfeb5d28566aa216c4546925b04b1a0fa45))

## [0.12.0](https://github.com/mariosakka/vscode-desk/compare/v0.11.0...v0.12.0) (2026-07-08)


### Features

* add book MCP tools ([00b2bdc](https://github.com/mariosakka/vscode-desk/commit/00b2bdcfb004455622487d1b342c7c19b254c729))
* add book MCP tools ([f5b3afe](https://github.com/mariosakka/vscode-desk/commit/f5b3afe839e0db4088f96833d27c434a980999b8))
* add book VS Code commands and worktree-aware workspace linking ([6605c44](https://github.com/mariosakka/vscode-desk/commit/6605c443c3fb9a6d0c653a364705e9ec30639b78))
* add BookService ([9b8c272](https://github.com/mariosakka/vscode-desk/commit/9b8c272e4b6a7b3c460155e91bb32e04e5997688))
* add built-in section type renderers ([43c2ed6](https://github.com/mariosakka/vscode-desk/commit/43c2ed6e856539e64f73124b6c7ff819e30a899b))
* add dynamic skill-defined MCP tools ([3dc42fa](https://github.com/mariosakka/vscode-desk/commit/3dc42faa64f46548850a6348511676fc6ccdf748))
* add expandable book rows to sidebar PagesPanel ([5369ee6](https://github.com/mariosakka/vscode-desk/commit/5369ee618821c5ef358eaec8ba13f3a6ccc3b046))
* add section, list, and section-type MCP tools ([6f9444b](https://github.com/mariosakka/vscode-desk/commit/6f9444bce3a41cd59e2dd54be47937ca7f2c8402))
* add section/list parse+mutate helpers to pageFormat ([5ff9558](https://github.com/mariosakka/vscode-desk/commit/5ff95587ae5477179a241abf7eed1abd974da2c0))
* add SectionTypeService ([6418f83](https://github.com/mariosakka/vscode-desk/commit/6418f83851db396845bdd45265a5a90c10dc0211))
* add tools-block parsing and validation to SkillRegistry ([00ed854](https://github.com/mariosakka/vscode-desk/commit/00ed85423c9ac4f025e89136f50fcc583dfc50ed))
* add worktree resolver utility ([bdf29fb](https://github.com/mariosakka/vscode-desk/commit/bdf29fb19322e08a9f34896c6eb5d5c3b48b6c3f))
* add zoom controls to page viewer nav bar and remove back button ([0d1eb43](https://github.com/mariosakka/vscode-desk/commit/0d1eb430a59afc53e432ebf1b4fc84a68db1055d))
* add zoom/toc commands and user settings for page viewer ([5c5d5f1](https://github.com/mariosakka/vscode-desk/commit/5c5d5f1d6b2817f07e2f74e8c06e902c94ead3de))
* expose skill-defined tools via McpServer dynamic tool dispatch ([c655e53](https://github.com/mariosakka/vscode-desk/commit/c655e53a57f6170e5ba3dfe14c7b8b8d5178e4ff))
* extend PageReader to accept one subdirectory level for book pages ([4ad70b0](https://github.com/mariosakka/vscode-desk/commit/4ad70b0187dca8d0c27aa455dbd79ac690d5e8ea))
* multi-tab page viewer with book nav and zoom persistence ([b287b6b](https://github.com/mariosakka/vscode-desk/commit/b287b6b7a3bfd9fd4f4d438f8a8468d174621013))
* page components — sections, books, multi-tab viewer, zoom, skill tools, worktree linking ([6727581](https://github.com/mariosakka/vscode-desk/commit/67275814246fc6b3f88dc517210632acad5f3560))


### Bug Fixes

* shell-quote skill tool arg values to prevent injection ([f724423](https://github.com/mariosakka/vscode-desk/commit/f724423f8b7353fbcbac0a757ed01c6105d8acb8))
* single-fire link handling and add zoom controls to page viewer webview ([5956268](https://github.com/mariosakka/vscode-desk/commit/59562687c03fb928741889fe92a7a87d851024ea))
* use typed PageViewPanel static methods for zoom commands ([c7fffd8](https://github.com/mariosakka/vscode-desk/commit/c7fffd87357795d119ee909b750af9ce751cfcd3))
* wire bookService to SidebarViewProvider, McpServer, and PageViewPanel; fix workspacePageReader path ([2cbc7ff](https://github.com/mariosakka/vscode-desk/commit/2cbc7ff225873b1f5c7532c4f29408f7f88ed0c9))

## [0.11.0](https://github.com/mariosakka/vscode-desk/compare/v0.10.0...v0.11.0) (2026-07-01)


### Features

* install skills as symlinks to ~/.my-agent-skills instead of flat copies ([edad869](https://github.com/mariosakka/vscode-desk/commit/edad869484c17d5a8326ac8e329282b293bd063f))
* install skills as symlinks to ~/.my-agent-skills instead of flat copies ([6b526cf](https://github.com/mariosakka/vscode-desk/commit/6b526cf29358eaaa816c75367541fdaba894d4da))

## [0.10.0](https://github.com/mariosakka/vscode-desk/compare/v0.9.0...v0.10.0) (2026-07-01)


### Features

* workspace-aware MCP port registry and stdio proxy ([b0f5cb2](https://github.com/mariosakka/vscode-desk/commit/b0f5cb2500aac2735b983c6a2ed05a073875d0a6))
* workspace-aware MCP port registry and stdio proxy ([8af508b](https://github.com/mariosakka/vscode-desk/commit/8af508bca3dc5bfd1daef380ae766f4fd33c4e02))

## [0.9.0](https://github.com/mariosakka/vscode-desk/compare/v0.8.0...v0.9.0) (2026-06-30)


### Features

* sidebar TOC layout, template script injection, and page refresh ([d2561d3](https://github.com/mariosakka/vscode-desk/commit/d2561d34c7f20703d85dafade8a19c5cb933f55d))
* sidebar TOC layout, template script injection, and page refresh ([3087998](https://github.com/mariosakka/vscode-desk/commit/3087998bf3f9ab537faa1c373780350ae268f4a7))

## [0.8.0](https://github.com/mariosakka/vscode-desk/compare/v0.7.1...v0.8.0) (2026-06-28)


### Features

* add extractStyleFromTemplate and assembleSections to pageFormat ([64b23c2](https://github.com/mariosakka/vscode-desk/commit/64b23c2c009afd633bf6b794e162e4c30cef2ccb))
* assemble create_page and update_page from template + sections ([96d0e93](https://github.com/mariosakka/vscode-desk/commit/96d0e93f7987e07ad7ae133f3c922f0127409840))
* change create_page and update_page to sections-based schema ([329f581](https://github.com/mariosakka/vscode-desk/commit/329f5814b97d22f62efb2e6c6d36e247d430527c))
* sections-based create_page and update_page MCP tools ([4e92ae4](https://github.com/mariosakka/vscode-desk/commit/4e92ae4333444a242865f3e93e81613aaadb8adf))

## [0.7.1](https://github.com/mariosakka/vscode-desk/compare/v0.7.0...v0.7.1) (2026-06-28)


### Bug Fixes

* correct LibrariesPanel EmptyState prop and update e2e + library docs ([63412f3](https://github.com/mariosakka/vscode-desk/commit/63412f37c45fd73866a74058bf890d7bb28ab628))
* correct LibrariesPanel EmptyState prop and update e2e + library docs ([0678352](https://github.com/mariosakka/vscode-desk/commit/0678352f758f26b5c7424a5d103d7710f7b96fad))

## [0.7.0](https://github.com/mariosakka/vscode-desk/compare/v0.6.0...v0.7.0) (2026-06-28)


### Features

* add page libraries feature with auto-injection into page viewer ([aed267d](https://github.com/mariosakka/vscode-desk/commit/aed267de8934ef5eb4a97df1ccbe96659d6bac40))
* add page libraries with auto-injection into page viewer ([6e2fd26](https://github.com/mariosakka/vscode-desk/commit/6e2fd26a7483f6d35fbcde3e40b0bcea1396340f))

## [0.6.0](https://github.com/mariosakka/vscode-desk/compare/v0.5.0...v0.6.0) (2026-06-27)


### Features

* add desk://workspace/current MCP resource for routing verification ([cc6e99d](https://github.com/mariosakka/vscode-desk/commit/cc6e99dca4be709e840f2922f7d76c73b6ba94dd))
* add desk://workspace/current MCP resource for routing verification ([4a31db5](https://github.com/mariosakka/vscode-desk/commit/4a31db56988a755999d1e20869728bca1ccd97cd))

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
