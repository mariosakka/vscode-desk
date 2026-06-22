# Relay — CLAUDE.md

Guidelines for AI agents and contributors working on this codebase.

---

## What Relay is

A VS Code extension with four features:
1. **Tabbed bookmark sidebar** — named tab groups each holding bookmark cards with auto-fetched favicons.
2. **`.relay` page viewer** — an XML-based lightweight doc format that renders in a VS Code editor tab, with shared theme variables and per-page custom CSS.
3. **Embedded MCP server** — a local JSON-RPC 2.0 HTTP server so AI agents can read and write bookmarks, pages, workflow config, and skills programmatically.
4. **Workflow companion** — stores team workflow config and a skill registry; agents submit config and skills via MCP, the extension installs skills on all detected AI agents after user confirmation.

**Non-negotiable constraint:** Relay must be fully general-purpose. No hardcoded URLs, no org-specific content, no assumptions about what the user has installed. Everything must work for any developer on any machine.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Webview (sandboxed HTML/CSS/JS)                             │
│  src/webview/sidebar/  src/webview/page/                     │
│         ↕ postMessage                                        │
├──────────────────────────────────────────────────────────────┤
│  Extension Host (Node.js)                                    │
│  PortalViewProvider  PageViewPanel                           │
│         ↕ method calls                                       │
├──────────────────────────────────────────────────────────────┤
│  Services                                                    │
│  DataService   FaviconService   PageReader                   │
│  WorkflowConfigService          SkillRegistry                │
│         ↕                                                    │
│  VS Code globalState   workspace fs                          │
└──────────────────────────────────────────────────────────────┘
         ↑ HTTP JSON-RPC 2.0
  McpServer (127.0.0.1:3333 by default)
```

**DataService** owns all reads and writes to `relay.data` in `globalState`. No other class touches it directly.  
**FaviconService** fetches and caches favicons. No other class fetches favicons.  
**PageReader** reads and writes `.relay` files. No other class touches the `relay-pages/` directory.  
**WorkflowConfigService** owns `relay.workflowConfig` and pending review state. No other class reads or writes workflow config directly.  
**SkillRegistry** owns `relay.skills`, validates skill frontmatter, and drives installation via `AgentAdapter`. No other class installs skill files directly.  
**McpServer** has no business logic — it parses JSON-RPC and delegates to the services above.

---

## File map

```
src/
  extension.ts                  activate() + command registration
  models.ts                     Bookmark, Tab, PortalData interfaces
  portalViewProvider.ts         WebviewViewProvider for the sidebar
  pages/
    pageReader.ts               Read/write .relay files in relay-pages/
    pageViewPanel.ts            Full-width WebviewPanel for the page viewer
  services/
    dataService/
      dataService.ts            globalState CRUD (key: relay.data)
      dataService.test.ts
    faviconService/
      faviconService.ts         Favicon fetch + cache (key: relay.favicon-cache)
      faviconService.test.ts
    workflowConfigService/
      workflowConfigService.ts  WorkflowConfig read/write + pending review state
      workflowConfigService.test.ts
    skillRegistry/
      skillRegistry.ts          Skill storage + agent-format installation
      skillRegistry.test.ts
  mcp/
    server/
      server.ts                 JSON-RPC 2.0 HTTP server
      server.test.ts
    toolSchemas.ts              JSON schemas for all 16 tools
    resources.ts                3 MCP resources (self-documentation for agents)
  agents/
    constants.ts                AgentId, ConfigDir, ConfigFile, CliBinary enums
    agentAdapter.ts             AgentAdapter interface
    jsonFileAdapter/
      jsonFileAdapter.ts        Abstract base — Template Method for JSON-file agents
      jsonFileAdapter.test.ts
    adapters/
      claudeCode/
        claudeCode.ts
        claudeCode.test.ts
      cursor/
        cursor.ts
        cursor.test.ts
      codex/
        codex.ts
        codex.test.ts
      gemini/
        gemini.ts
        gemini.test.ts
    registry/
      registry.ts               AgentRegistry — MCP setup + skill install prompts
      registry.test.ts
  __mocks__/
    vscode.ts                   Jest mock for the VS Code API
  webview/
    sidebar/
      index.html                Sidebar webview template
      index.css                 VS Code theme token mapping + sidebar layout
      index.js                  Render tabs/bookmarks, postMessage bridge
    page/
      index.html                Page viewer template
      index.css                 VS Code theme token mapping + doc layout
      index.js                  .relay link navigation, external link handling
```

---

## Development workflow

1. **Branch** off `master` for every change — never commit directly to `master`.
2. **Open a PR** when the change is ready.
3. **Get approval** — tests run only after a reviewer approves. The CI trigger is `pull_request_review` with `types: [submitted]`, not `pull_request`.
4. **Merge** once tests pass.
5. **release-please** watches `master` and opens a "chore(release): vX.Y.Z" PR automatically when conventional commits accumulate.
6. **Merge the release PR** — release-please creates a git tag and GitHub Release; the `publish` job then runs and pushes the extension to the VS Code Marketplace.

---

## Commit messages (Conventional Commits — required)

release-please reads commit types to determine the version bump. Follow this exactly:

| Prefix | Effect |
|--------|--------|
| `feat:` | New feature → minor bump |
| `fix:` | Bug fix → patch bump |
| `feat!:` or `BREAKING CHANGE:` in footer | Major bump |
| `chore:`, `ci:`, `docs:`, `refactor:`, `test:` | No version bump |

Example: `feat: add bookmark drag-and-drop reordering`

---

## Code rules

### General
- **No hardcoded URLs** anywhere — not in source, not in webviews.
- **No org-specific content** — no company names, internal hostnames, or private API endpoints.
- **No comments** unless the *why* is genuinely non-obvious (hidden constraint, workaround, subtle invariant). Never explain what the code does.
- **No unused abstractions** — three similar lines beats a premature helper. Don't design for hypothetical future requirements.

### Webview colors
Only use VS Code theme token CSS variables. Never write hex color values in webview CSS:

```css
/* correct */
color: var(--text);
background: var(--surface);
border-color: var(--accent);

/* wrong */
color: #e2e4f0;
background: #1a1d27;
```

The variables are defined at the top of both `index.css` files and map to `--vscode-*` tokens.

### Adding a new MCP tool
Three files always change together:
1. `src/mcp/toolSchemas.ts` — add the JSON schema to the `TOOLS` array.
2. `src/mcp/server/server.ts` — add a `case` for it in `McpServer.callTool()`.
3. `src/mcp/server/server.test.ts` — add at minimum one round-trip test.

### Adding a new VS Code command
Three steps:
1. Register the command ID in `package.json` under `contributes.commands`.
2. Add a handler in `src/extension.ts`.
3. Wire it with `vscode.commands.registerCommand()` inside `activate()`.

### Favicons
Always go through `FaviconService.getIcon(url)`. Never fetch favicon URLs directly. The service handles cache lookup, TTL (30 days), redirect following, fallback to `🌐`, and base64 encoding.

### Page files
Always go through `PageReader`. It enforces the `relay-pages/` directory, parses the XML format, and strips `<script>` tags. Never read or write `.relay` files with raw `fs` calls.

### .relay format
```xml
<relay-page title="Page Title">
  <style>/* optional per-page CSS */</style>
  <!-- HTML body — no <script> tags -->
</relay-page>
```
- `.relay` links in content → `navigate` message → page viewer stays open
- `https://` links in content → `openUrl` message → opens in browser
- `relay-page:<filename>` as a bookmark URL → opens page viewer from sidebar click

---

## Storage

| `globalState` key | Type | Contents |
|---|---|---|
| `relay.data` | `PortalData` | All tabs and bookmarks |
| `relay.favicon-cache` | `Record<hostname, { data: string, fetchedAt: number }>` | Base64 favicon data URLs, 30-day TTL |
| `relay.workflowConfig` | `WorkflowConfig` | Team workflow config submitted by agent and confirmed by user |
| `relay.skills` | `Skill[]` | Workflow skills submitted by agent and confirmed by user |
| `relay.workflowSkillDismissed` | `boolean` | Dismissed flag for the skill install activation prompt |

---

## VS Code commands

Registered in `package.json` under `contributes.commands` and wired in `src/extension.ts`.

| Command ID | Title | Description |
|---|---|---|
| `relay.addBookmark` | Relay: Add Bookmark | Interactive prompt to add a bookmark |
| `relay.addTab` | Relay: Add Tab | Interactive prompt to create a tab |
| `relay.removeBookmark` | Relay: Remove Bookmark | QuickPick to remove a bookmark |
| `relay.removeTab` | Relay: Remove Tab | QuickPick to remove a tab |
| `relay.openPage` | Relay: Open Page | QuickPick to open a `.relay` page |
| `relay.newPage` | Relay: New Page | Interactive prompt to create a new page |
| `relay.setupAgents` | Relay: Setup Agents | Force-shows MCP setup prompt for all agents |
| `relay.configureWorkflow` | Relay: Configure Workflow | Series of input boxes to set `WorkflowConfig` fields manually |
| `relay.installWorkflowSkills` | Relay: Install Workflow Skills | Shows skill install picker for all stored skills × detected agents |

---

## Webview message protocol

**Sidebar (PortalViewProvider ↔ `src/webview/sidebar/index.js`)**

| Direction | `type` | Extra fields |
|-----------|--------|--------------|
| Host → Webview | `update` | `data: PortalData` |
| Webview → Host | `ready` | — |
| Webview → Host | `openUrl` | `url: string` |
| Webview → Host | `addBookmark` | `tabId, title, url, icon?, description?` |
| Webview → Host | `removeBookmark` | `tabId, bookmarkId` |
| Webview → Host | `addTab` | `name: string` |
| Webview → Host | `removeTab` | `tabId: string` |

**Page viewer (PageViewPanel ↔ `src/webview/page/index.js`)**

| Direction | `type` | Extra fields |
|-----------|--------|--------------|
| Host → Webview | `load` | `title, html, hasBack: boolean` |
| Webview → Host | `navigate` | `filename: string` |
| Webview → Host | `back` | — |
| Webview → Host | `openUrl` | `url: string` |

---

## MCP server

- **Endpoint:** `POST http://127.0.0.1:<port>/mcp` (port from `relay.mcpPort` setting, default `3333`)
- **Protocol:** JSON-RPC 2.0, MCP Streamable HTTP transport `2024-11-05`
- **Capabilities:** `{ tools: {}, resources: {} }`
- **HTTP status:** always `200` for valid JSON-RPC. Errors arrive as `{ error: { code, message } }` in the response body.

**16 tools:**

| Tool | R/W | Required args |
|------|-----|---------------|
| `list_tabs` | R | — |
| `list_bookmarks` | R | — (`tab_id` optional) |
| `add_bookmark` | W | `tab_id`, `title`, `url` |
| `remove_bookmark` | W | `tab_id`, `bookmark_id` |
| `create_tab` | W | `name` |
| `remove_tab` | W | `tab_id` |
| `update_bookmark` | W | `tab_id`, `bookmark_id`, `fields` |
| `list_pages` | R | — |
| `create_page` | W | `filename`, `title`, `content` |
| `update_page` | W | `filename` (+ any fields) |
| `delete_page` | W | `filename` |
| `get_workflow_config` | R | — |
| `submit_workflow_config` | W | `config` (partial WorkflowConfig) |
| `add_skill` | W | `name`, `content` (`description` optional) |
| `list_skills` | R | — |
| `remove_skill` | W | `name` |

**3 resources** (self-documentation for agents — read via `resources/list` + `resources/read`):
- `relay://guide/quick-start`
- `relay://guide/relay-page-format`
- `relay://guide/skill-format`

Page tools return an error when VS Code has no workspace folder open.  
`submit_workflow_config` and `add_skill` queue for user confirmation and return `{ status: "submitted" }` immediately — they do not block.

---

## Testing

```sh
npm test                   # run all unit tests (Jest + ts-jest)
npm run compile            # production build — extension host + webview (required before e2e)
npm run compile:ext        # extension host only
npm run compile:webview    # sidebar React bundle only
npm run watch              # incremental dev build — extension host
npm run watch:webview      # incremental dev build — sidebar webview
npm run test:e2e           # run Playwright e2e suite (requires compile first)
npm run test:e2e:install   # install Playwright browsers (once per machine)
npm run package            # create .vsix
```

**F5** in VS Code opens the Extension Development Host with Relay active.

Tests run in Node via Jest. The `vscode` module is mocked at `src/__mocks__/vscode.ts` — no real VS Code instance is needed.

### Unit tests

Current test count: **127 total**

| File | Count |
|------|-------|
| `services/dataService/dataService.test.ts` | 13 |
| `services/faviconService/faviconService.test.ts` | 7 |
| `services/workflowConfigService/workflowConfigService.test.ts` | 6 |
| `services/skillRegistry/skillRegistry.test.ts` | 15 |
| `mcp/server/server.test.ts` | 19 |
| `agents/jsonFileAdapter/jsonFileAdapter.test.ts` | 14 |
| `agents/adapters/claudeCode/claudeCode.test.ts` | 10 |
| `agents/adapters/cursor/cursor.test.ts` | 9 |
| `agents/adapters/codex/codex.test.ts` | 11 |
| `agents/adapters/gemini/gemini.test.ts` | 8 |
| `agents/registry/registry.test.ts` | 15 |

Unit test rules:
- All tests must pass before any PR can merge.
- Every new MCP tool needs at minimum a round-trip test in `server/server.test.ts`.
- Every new service needs its own test file in its subfolder.
- Pass `null` as the `pageReader` argument to `new McpServer(...)` in tests that don't exercise page tools.
- Pass `null` as `workflowConfigService` and `skillRegistry` arguments in tests that don't exercise those tools.

### E2e tests (Playwright)

**32 tests** across 3 spec files in `e2e/`:

| File | What it tests |
|------|---------------|
| `e2e/mcp.spec.ts` | JSON-RPC protocol, all 16 tools, 3 resources — uses a self-contained in-process HTTP stub (no VS Code dep) |
| `e2e/sidebar.spec.ts` | Sidebar webview HTML — tabs, bookmarks, icon rendering, postMessage bridge |
| `e2e/page-viewer.spec.ts` | Page viewer webview HTML — navigation, link handling, custom styles |

`npm run compile` must run before `npm run test:e2e` — the sidebar and page-viewer specs load files from `out/webview/`.

E2e rules:
- `e2e/helpers/webview.ts` builds testable HTML from compiled output; `e2e/helpers/vscode-mock.ts` injects `acquireVsCodeApi()`.
- The MCP spec's in-process stub must stay in sync with `src/mcp/toolSchemas.ts` tool count and `src/mcp/resources.ts` resource count.
- CI runs both `npm test` and `npm run test:e2e` on every approved PR.

---

## Skill format

Skills submitted via `add_skill` must use YAML frontmatter + markdown body:

```markdown
---
name: dev-flow
description: >-
  One-line description used by agents to decide when to invoke.
triggers:
  - starting a new task
  - reviewing a PR
agents: all
version: 1
---

Skill body — plain markdown, works across all agents.
Call `get_workflow_config` at startup to read team-specific values.
```

**Required:** `name` (kebab-case), `description`  
**Optional:** `triggers`, `agents` (`all` or `[claude-code, cursor, gemini, codex]`), `version` (integer, default 1, auto-incremented on resubmit)

Content rules:
- No hardcoded values — channel names, usernames, org names always come from `get_workflow_config`
- Reference MCP tools by name only — each agent knows how to call them
- No agent-specific syntax in the shared body — put agent-specific content in a separate skill with `agents: [agent-id]`

Install paths per agent (managed by `SkillRegistry` via `AgentAdapter.installSkill`):

| Agent | Path | Format |
|---|---|---|
| Claude Code | `~/.claude/skills/<name>.md` | markdown as-is |
| Cursor | `.cursor/rules/<name>.mdc` (workspace) | wrapped in Cursor rule format |
| Gemini | `~/.gemini/skills/<name>.md` | markdown as-is |
| Codex | workspace `AGENTS.md` | named section appended |

---

## CSS variables (webview)

Both webview `index.css` files define these — use them in any custom styles or content:

| Variable | VS Code token | Usage |
|----------|---------------|-------|
| `--bg` | `--vscode-sideBar-background` | Page/panel background |
| `--surface` | `--vscode-input-background` | Cards, code blocks |
| `--surface2` | `--vscode-list-hoverBackground` | Hover states, table rows |
| `--border` | `--vscode-widget-border` | Borders, dividers |
| `--text` | `--vscode-sideBar-foreground` | Body text |
| `--muted` | `--vscode-descriptionForeground` | Secondary/hint text |
| `--accent` | `--vscode-button-background` | Primary highlights |
| `--accent2` | `--vscode-textLink-foreground` | Links, code, tips |
| `--radius` | *(fixed)* `10px` | Border radius |
