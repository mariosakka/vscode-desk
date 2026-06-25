# Desk — CLAUDE.md

Guidelines for AI agents and contributors working on this codebase.

---

## What Desk is

A VS Code extension with four features:
1. **Tabbed bookmark sidebar** — named tab groups each holding bookmark cards with auto-fetched favicons.
2. **`.desk` page viewer** — an XML-based lightweight doc format that renders in a VS Code editor tab, with shared theme variables and per-page custom CSS.
3. **Embedded MCP server** — a local JSON-RPC 2.0 HTTP server so AI agents can read and write bookmarks, pages, workflow config, and skills programmatically.
4. **Workflow companion** — stores team workflow config and a skill registry; agents submit config and skills via MCP, the extension installs skills on all detected AI agents after user confirmation.

**Non-negotiable constraint:** Desk must be fully general-purpose. No hardcoded URLs, no org-specific content, no assumptions about what the user has installed. Everything must work for any developer on any machine.

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

**DataService** owns all reads and writes to `desk.data` in `globalState`. No other class touches it directly.  
**FaviconService** fetches and caches favicons. No other class fetches favicons.  
**PageReader** reads and writes `.desk` files. No other class touches the `desk-pages/` directory.  
**WorkflowConfigService** owns `desk.workflowConfig` and pending review state. No other class reads or writes workflow config directly.  
**SkillRegistry** owns `desk.skills`, validates skill frontmatter, and drives installation via `AgentAdapter`. No other class installs skill files directly.  
**McpServer** has no business logic — it parses JSON-RPC and delegates to the services above.

---

## File map

```
src/
  extension.ts                  activate() + command registration
  models.ts                     Bookmark, Tab, PortalData interfaces
  portalViewProvider.ts         WebviewViewProvider for the sidebar
  pages/
    pageFormat.ts               Parse/serialize .desk XML; extract scripts for nonce re-injection
    pageReader.ts               Read/write .desk files in desk-pages/
    pageViewPanel.ts            Full-width WebviewPanel for the page viewer
  services/
    dataService/
      dataService.ts            globalState CRUD (key: desk.data)
      dataService.test.ts
    faviconService/
      faviconService.ts         Favicon fetch + cache (key: desk.favicon-cache)
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
    global.css                  CSS variables shared across all webview components
    declarations.d.ts           TypeScript declaration for *.module.css imports
    sidebar/
      index.html                Sidebar webview template (mounts #app)
      index.tsx                 React entry point — createRoot('#app')
      SidebarApp.tsx            Root component — workspace/global scope switch, postMessage bridge
      types.ts                  Bookmark, Tab, PortalData, WorkflowConfig interfaces (webview-side)
      hooks/
        useClickOutside.ts      Click-outside detection hook
      components/
        shared/
          Icons.tsx             All SVG icons (TrashIcon, CheckIcon, CloseIcon, BookmarkIcon,
                                ProjectIcon, GlobeIcon, PageIcon, ChevronIcon, PlusIcon,
                                SkillIcon, WorkflowIcon, PencilIcon)
          ConfirmButtons.tsx    Inline delete-confirmation pattern (Delete? ✓ ✗)
          ConfirmButtons.module.css
          CollapsibleSection.tsx  Animated expand/collapse panel with header button and action slot
          CollapsibleSection.module.css
          EmptyState.tsx        Centered placeholder text
          EmptyState.module.css
          HoverIconButton.tsx   Icon button that appears on row hover; calls e.stopPropagation()
          HoverIconButton.module.css
          InlineBarForm.tsx     Single-input inline form (shared by forms that need a bar layout)
          InlineBarForm.module.css
          EditActions.tsx       Save/cancel button pair used inside edit forms
          EditActions.module.css
          DismissButton.tsx     Small × button for dismissing banners/notices
          DismissButton.module.css
          SectionBtn.module.css Shared CSS for section-level action buttons (+ Project, + Bookmark, etc.)
          Inputs.module.css     Shared CSS for text inputs inside bookmark/page edit forms
          FormButtons.module.css  Shared CSS for form submit/cancel button pairs
        Header/
          Header.tsx            Legacy header component (unused in current layout)
          Header.module.css
        TabBar/
          TabBar.tsx            Tab strip with active state, remove, and confirm
          TabBar.module.css
        BookmarkGrid/
          BookmarkGrid.tsx      Grid wrapper — maps bookmarks to BookmarkCard
          BookmarkGrid.module.css
        BookmarkCard/
          BookmarkCard.tsx      Individual bookmark card with inline edit and hover delete
          BookmarkCard.module.css
        InlineTabForm/
          InlineTabForm.tsx     Inline tab name input with duplicate check
          InlineTabForm.module.css
        InlineBookmarkForm/
          InlineBookmarkForm.tsx  Inline title + URL form with duplicate check
          InlineBookmarkForm.module.css
        QuickOpenForm/
          QuickOpenForm.tsx     Single-field URL input for opening arbitrary URLs
          QuickOpenForm.module.css
        PagesPanel/
          PagesPanel.tsx        CollapsibleSection listing .desk pages with open/edit/delete/new actions
          PagesPanel.module.css
        SkillsPanel/
          SkillsPanel.tsx       CollapsibleSection listing skills with edit/remove/submit actions
          SkillsPanel.module.css
        WorkflowPanel/
          WorkflowPanel.tsx     CollapsibleSection for viewing and editing WorkflowConfig inline
          WorkflowPanel.module.css
    page/
      index.html                Page viewer template
      index.css                 VS Code theme token mapping + doc layout
      index.js                  Anchor/desk/https link routing; #hash links pass through natively
```

---

## Development workflow

1. **Branch** off `master` for every change — never commit directly to `master`.
2. **Open a PR** when the change is ready — CI (`pull_request` trigger) runs tests automatically on every push.
3. **Merge** once tests pass — no external reviewer required (0 approvals required by the branch ruleset).
4. **release-please** watches `master` and opens a `chore(release): vX.Y.Z` PR automatically when `feat:` or `fix:` commits accumulate.
5. **Merge the release PR** — release-please creates a git tag and GitHub Release, then immediately runs tests and publishes to the VS Code Marketplace in the same workflow job (`release-please.yml` → `test-and-publish`).

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
Always go through `PageReader`. It enforces the `desk-pages/` directory, parses the XML format, and extracts `<script>` tags for nonce re-injection. Never read or write `.desk` files with raw `fs` calls.

### .desk format
```xml
<desk-page title="Page Title">
  <style>/* optional per-page CSS */</style>
  <!-- HTML body -->
  <script>
    /* JS runs — re-injected with CSP nonce. Use addEventListener, not inline onclick. */
    document.getElementById('my-btn').addEventListener('click', () => { ... });
  </script>
</desk-page>
```
- Content is injected directly into `<body>` — full viewport available, custom `body` layout (flex, grid) works as intended.
- The back button is a `position: fixed` overlay and is never displaced by page CSS.
- `#hash` links scroll to the named anchor (native browser behaviour — no postMessage).
- `<script>` blocks are extracted by `pageFormat.parse()` and re-injected with the CSP nonce by `PageViewPanel`. Inline event handlers (`onclick`) are blocked by CSP — use `addEventListener` inside a `<script>` block.
- `.desk` links in content → `navigate` message → page viewer stays open
- `https://` links in content → `openUrl` message → opens in browser
- `desk-page:<filename>` as a bookmark URL → opens page viewer from sidebar click

---

## Storage

| `globalState` key | Type | Contents |
|---|---|---|
| `desk.data` | `PortalData` | All projects and bookmarks |
| `desk.favicon-cache` | `Record<hostname, { data: string, fetchedAt: number }>` | Base64 favicon data URLs, 30-day TTL |
| `desk.workflowConfig` | `WorkflowConfig` | Team workflow config submitted by agent and confirmed by user |
| `desk.skills` | `Skill[]` | Workflow skills submitted by agent and confirmed by user |
| `desk.workflowSkillDismissed` | `boolean` | Dismissed flag for the skill install activation prompt |

---

## VS Code commands

Registered in `package.json` under `contributes.commands` and wired in `src/extension.ts`.

| Command ID | Title | Description |
|---|---|---|
| `desk.addBookmark` | Desk: Add Bookmark | Interactive prompt to add a bookmark |
| `desk.addProject` | Desk: Add Project | Interactive prompt to create a project |
| `desk.removeBookmark` | Desk: Remove Bookmark | QuickPick to remove a bookmark |
| `desk.removeProject` | Desk: Remove Project | QuickPick to remove a project |
| `desk.updateBookmark` | Desk: Edit Bookmark | QuickPick to edit a bookmark's title, URL, or icon |
| `desk.openPage` | Desk: Open Page | QuickPick to open a `.desk` page |
| `desk.newPage` | Desk: New Page | Interactive prompt to create a new page |
| `desk.deletePage` | Desk: Delete Page | QuickPick to delete a `.desk` page |
| `desk.setupAgents` | Desk: Set Up Agent MCP Integration | Re-runs MCP setup on all installed agents, including already-configured ones |
| `desk.configureWorkflow` | Desk: Configure Workflow | Series of input boxes to set `WorkflowConfig` fields manually |
| `desk.installWorkflowSkills` | Desk: Install Workflow Skills | Shows skill install picker for all stored skills × detected agents |
| `desk.openUrl` | Desk: Open URL | Prompt for a URL and open it in VS Code Simple Browser |
| `desk.newSkill` | Desk: New Skill | Opens an untitled markdown document pre-filled with the skill frontmatter template |
| `desk.editSkill` | Desk: Edit Skill | QuickPick to open an existing skill for editing |
| `desk.submitSkill` | Desk: Submit Skill | Reads the active editor and stores/updates the skill in the registry |
| `desk.removeSkill` | Desk: Remove Skill | QuickPick to remove a skill |
| `desk.listProjects` | Desk: List Projects | QuickPick showing all projects |
| `desk.listBookmarks` | Desk: List Bookmarks | QuickPick showing all bookmarks |
| `desk.listSkills` | Desk: List Skills | QuickPick showing all installed skills |
| `desk.viewWorkflow` | Desk: View Workflow Config | Shows current `WorkflowConfig` in a QuickPick |

---

## Webview message protocol

**Sidebar (PortalViewProvider ↔ `src/webview/sidebar/SidebarApp.tsx`)**

All Webview → Host messages include a `scope: 'workspace' | 'global'` field.

| Direction | `type` | Extra fields |
|-----------|--------|--------------|
| Host → Webview | `update` | `data: SidebarData` |
| Host → Webview | `switchTab` | `projectId: string` |
| Webview → Host | `ready` | — |
| Webview → Host | `openUrl` | `url: string` — opens in VS Code Simple Browser (or PageViewPanel for `desk-page:` URLs) |
| Webview → Host | `addBookmark` | `projectId, title, url` — favicon fetched by host |
| Webview → Host | `removeBookmark` | `projectId, bookmarkId` |
| Webview → Host | `updateBookmark` | `projectId, bookmarkId, fields: { title?, url? }` |
| Webview → Host | `addProject` | `name: string` |
| Webview → Host | `removeProject` | `projectId: string` |
| Webview → Host | `openPage` | `filename: string` |
| Webview → Host | `newPage` | `title: string` |
| Webview → Host | `deletePage` | `filename: string` |
| Webview → Host | `editPage` | `filename: string` — opens the `.desk` file in VS Code text editor |
| Webview → Host | `newSkill` | — — runs `desk.newSkill` command |
| Webview → Host | `editSkill` | `name: string` — opens skill content in an untitled editor |
| Webview → Host | `submitSkill` | — — runs `desk.submitSkill` command |
| Webview → Host | `removeSkill` | `name: string` |
| Webview → Host | `saveWorkflow` | `config: WorkflowConfig` |

**Page viewer (PageViewPanel ↔ `src/webview/page/index.js`)**

The page viewer has no host→webview messages — navigation replaces the entire webview HTML.

| Direction | `type` | Extra fields |
|-----------|--------|--------------|
| Webview → Host | `navigate` | `filename: string` — load another `.desk` page |
| Webview → Host | `back` | — — go to previous page in history |
| Webview → Host | `openUrl` | `url: string` — open external URL |

---

## MCP server

- **Endpoint:** `POST http://127.0.0.1:<port>/mcp` (port from `desk.mcpPort` setting, default `3333`)
- **Protocol:** JSON-RPC 2.0, MCP Streamable HTTP transport `2024-11-05`
- **Capabilities:** `{ tools: {}, resources: {} }`
- **HTTP status:** always `200` for valid JSON-RPC. Errors arrive as `{ error: { code, message } }` in the response body.

**16 tools:**

| Tool | R/W | Required args |
|------|-----|---------------|
| `list_projects` | R | — |
| `list_bookmarks` | R | — (`project_id` optional) |
| `add_bookmark` | W | `project_id`, `title`, `url` |
| `remove_bookmark` | W | `project_id`, `bookmark_id` |
| `create_project` | W | `name` |
| `remove_project` | W | `project_id` |
| `update_bookmark` | W | `project_id`, `bookmark_id`, `fields` |
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
- `desk://guide/quick-start`
- `desk://guide/desk-page-format`
- `desk://guide/skill-format`

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

**F5** in VS Code opens the Extension Development Host with Desk active.

Tests run in Node via Jest. The `vscode` module is mocked at `src/__mocks__/vscode.ts` — no real VS Code instance is needed.

### Unit tests

Current test count: **135 total**

| File | Count |
|------|-------|
| `services/dataService/dataService.test.ts` | 13 |
| `services/faviconService/faviconService.test.ts` | 7 |
| `services/workflowConfigService/workflowConfigService.test.ts` | 6 |
| `services/skillRegistry/skillRegistry.test.ts` | 15 |
| `mcp/server/server.test.ts` | 21 |
| `agents/jsonFileAdapter/jsonFileAdapter.test.ts` | 15 |
| `agents/adapters/claudeCode/claudeCode.test.ts` | 14 |
| `agents/adapters/cursor/cursor.test.ts` | 10 |
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

**38 tests** across 3 spec files in `e2e/`:

| File | What it tests |
|------|---------------|
| `e2e/mcp.spec.ts` | JSON-RPC protocol, all 16 tools, 3 resources — uses a self-contained in-process HTTP stub (no VS Code dep) |
| `e2e/sidebar.spec.ts` | Sidebar webview HTML — tabs, bookmarks, icon rendering, postMessage bridge |
| `e2e/page-viewer.spec.ts` | Page viewer webview HTML — navigation, link handling, custom styles |

`npm run compile` must run before `npm run test:e2e` — the sidebar and page-viewer specs load files from `out/webview/`.

E2e rules:
- `e2e/helpers/webview.ts` builds testable HTML from compiled output; `e2e/helpers/vscode-mock.ts` injects `acquireVsCodeApi()`.
- The MCP spec's in-process stub must stay in sync with `src/mcp/toolSchemas.ts` tool count and `src/mcp/resources.ts` resource count.
- CI runs both `npm test` and `npm run test:e2e` on every PR push (`pull_request` trigger).

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

The sidebar defines these in `src/webview/global.css`; the page viewer defines them in `src/webview/page/index.css`. Use them in any component styles or page content:

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
