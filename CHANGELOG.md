# Changelog

## [1.1.0](https://github.com/mariosakka/vscode-desk/compare/v1.0.0...v1.1.0) (2026-06-24)


### Features

* add 5 workflow MCP tools and skill-format resource ([1455a77](https://github.com/mariosakka/vscode-desk/commit/1455a771269dd78df6cb568a2aa0151d304a13c7))
* add AgentAdapter interface and enum constants ([c075833](https://github.com/mariosakka/vscode-desk/commit/c075833535ef1746ace0b4b8243207a1d614c465))
* add AgentRegistry with activation prompt and dismiss flag ([c26b012](https://github.com/mariosakka/vscode-desk/commit/c26b012b48be200455b7da9e568cb3774f188f4f))
* add BookmarkCard and BookmarkGrid components ([43dd811](https://github.com/mariosakka/vscode-desk/commit/43dd8113417fd4521b61e86f379f4abb50883da1))
* add ClaudeCode, Cursor, Codex, and Gemini agent adapters ([3d08f23](https://github.com/mariosakka/vscode-desk/commit/3d08f2349b171a8dc9d321aeb1dd1b73fc095f3b))
* add Header component with action buttons ([a6d981b](https://github.com/mariosakka/vscode-desk/commit/a6d981bca1e29ddcb7e95d7cfa92eac42566619e))
* add JsonFileAdapter base class with Template Method pattern ([772553c](https://github.com/mariosakka/vscode-desk/commit/772553c53919fb57b2059583028215d5c7f013ba))
* add React webview build infrastructure ([668c80a](https://github.com/mariosakka/vscode-desk/commit/668c80af62f074263e31d027d9caf5dfcfdf845b))
* add shared component library, inline sidebar forms, and Simple Browser navigation ([b54447a](https://github.com/mariosakka/vscode-desk/commit/b54447a2391e7d30de27470103a190f8ab758767))
* add showSkillInstallPrompt to AgentRegistry ([efc8aa3](https://github.com/mariosakka/vscode-desk/commit/efc8aa330ba5e978e6f3c7d73278bec6d01b21fc))
* add skill install/uninstall to all four agent adapters ([7c595b0](https://github.com/mariosakka/vscode-desk/commit/7c595b024238bc3e4e6ac7789d56a5857e74f1ec))
* add SkillRegistry with frontmatter validation and agent-format install ([439b134](https://github.com/mariosakka/vscode-desk/commit/439b13403a277f0277fe3ae80b6faf95f732ed90))
* add TabBar component ([4207fd7](https://github.com/mariosakka/vscode-desk/commit/4207fd7f13d6d5ec1463fea87e360f4f952b3b92))
* add WorkflowConfigService with deep-merge pending state ([2f1ff62](https://github.com/mariosakka/vscode-desk/commit/2f1ff624156ac1bca63cc160449cb650ad249d25))
* extend AgentAdapter interface with skill install/uninstall methods ([84f737a](https://github.com/mariosakka/vscode-desk/commit/84f737a39dc10f109fd0bda0fa538bfc2dc9eae9))
* implement SidebarApp message bridge and state ([551fc2b](https://github.com/mariosakka/vscode-desk/commit/551fc2b47740420b357fd17254c22e8e9c8dc281))
* move all data storage from vscode.Memento to ~/.astrolabe/ JSON files ([983377e](https://github.com/mariosakka/vscode-desk/commit/983377ed7179546916300638cdf5d82ca4e1809c))
* overhaul sidebar UI with shared component library, MCP parity, and animated sections ([d32535d](https://github.com/mariosakka/vscode-desk/commit/d32535d8903daf794f11e15ac30ef21ec2b79a96))
* rename to Astrolabe, add full sidebar panels, abstract WorkflowConfig ([2318dcc](https://github.com/mariosakka/vscode-desk/commit/2318dcce0683e535a8b25e842ffaf332a8c29751))
* scaffold React sidebar entry point and global CSS ([a397837](https://github.com/mariosakka/vscode-desk/commit/a397837ef7498073e4bea91c0507a253cbda3c85))
* scope all data to VS Code workspace or global context ([cdecf4f](https://github.com/mariosakka/vscode-desk/commit/cdecf4f09871e839b42eef9a2e976c7513b14433))
* wire AgentRegistry into extension activation and relay.setupAgents command ([197bcda](https://github.com/mariosakka/vscode-desk/commit/197bcda4a3367a4e56ae1916f43cd191b39b02fd))
* wire WorkflowConfigService and SkillRegistry into extension activation ([435c17c](https://github.com/mariosakka/vscode-desk/commit/435c17ccc2fc6534c8bb7eeae78140cb47dd0ba4))


### Bug Fixes

* disable esModule in css-loader for correct default import of CSS modules ([bac3bbf](https://github.com/mariosakka/vscode-desk/commit/bac3bbf997ea774e7ec89eec79ae70945dcca884))
* handle multi-line description block scalar in skill frontmatter parser ([79314ea](https://github.com/mariosakka/vscode-desk/commit/79314ea6792ad48e716fa040fbd4f3651e48e15a))
* remove comment and unused import from jsonFileAdapter ([294d6a2](https://github.com/mariosakka/vscode-desk/commit/294d6a2304bd7177ca1b7b66347fce7f93bae72a))
* remove duplicate tabs-bar id and commit simplified index.html template ([96a1fe4](https://github.com/mariosakka/vscode-desk/commit/96a1fe4f096c486cc53fdfe8d86925920fbdcb4b))
* replace hex color with CSS variable in BookmarkCard styles ([8043258](https://github.com/mariosakka/vscode-desk/commit/8043258c57fb5333729b983ead15663b6ead008c))
* silent config discard, description parser, Codex section regex ([ec24bc8](https://github.com/mariosakka/vscode-desk/commit/ec24bc8efced118a9f7f2c38ba26e9a2f699cef5))
* use configDir in skill paths, escape regex in Codex, add null-workspace uninstall tests ([8fe482a](https://github.com/mariosakka/vscode-desk/commit/8fe482a2d79e51e949a0bad0ea7979e83eb23722))
* use function replacer in buildSidebarHtml to prevent $$ corruption ([eb94b95](https://github.com/mariosakka/vscode-desk/commit/eb94b9507ad3ba27a0285c52b3c7a85b85c9c77c))

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
