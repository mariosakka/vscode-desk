export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const RESOURCES: McpResource[] = [
  {
    uri: 'desk://guide/quick-start',
    name: 'Desk Agent Quick-Start',
    description: 'How to connect, the data model, the typical tool call loop, and key rules. Read this first.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'desk://guide/desk-page-format',
    name: 'Desk Page Format (.desk)',
    description: 'The .desk XML file format, available CSS variables, and built-in callout classes for customStyles.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'desk://guide/skill-format',
    name: 'Desk Skill Format',
    description: 'YAML frontmatter spec, content rules, and install paths for workflow skills submitted via add_skill.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'desk://workspace/current',
    name: 'Current Workspace',
    description: 'The VS Code workspace name and folder path this MCP server instance is attached to. Read at session start to verify you are connected to the correct window before any write operations.',
    mimeType: 'application/json',
  },
];

export const RESOURCE_CONTENT: Record<string, string> = {
  'desk://guide/quick-start': `# Desk Agent Quick-Start

Desk is a VS Code extension with tabbed bookmarks and \`.desk\` doc pages.
It runs a local JSON-RPC 2.0 MCP server at **http://localhost:3333/mcp**.

## Data model

\`\`\`
DeskData
└── bookmarks[]
    ├── id          string   ("bm_xyz789")
    ├── title       string
    ├── url         string   (https://… or desk-page:<filename>)
    ├── icon        string   (emoji or "data:image/…" base64)
    └── description string
\`\`\`

Pages are \`.desk\` files in \`<workspace>/desk-pages/\` — separate from bookmarks.

## Typical loop — bookmarks

\`\`\`
list_bookmarks      → see what's already there
add_bookmark        → add (favicon auto-fetched if icon omitted)
update_bookmark     → patch any fields
remove_bookmark     → clean up
\`\`\`

## Typical loop — pages

\`\`\`
list_pages          → see what exists
create_page         → write a new .desk file
update_page         → revise title, body, or per-page CSS (only provided fields change)
delete_page         → remove a page
\`\`\`

## WorkflowConfig shape

\`\`\`
communication: [{ label: "General", channel: "#general" }, { label: "Deploys", channel: "#deploys" }]
general:       [{ label: "Language", value: "en" }, { label: "Repo", value: "my-repo" }]
\`\`\`

## Session start — verify workspace

Multiple VS Code windows run separate Desk instances, but only one can own port 3333. Before doing any write operations, confirm you are connected to the intended window:

\`\`\`
resources/read desk://workspace/current
\`\`\`

This returns \`{ "workspaceName": "my-project", "workspacePath": "/home/user/work/my-project" }\`.

Compare \`workspacePath\` against the directory you are actually working in. If they do not match, **stop and tell the user** — they may have the wrong VS Code window in focus. Do not create, update, or delete anything until the mismatch is resolved.

## Key rules

- **Verify workspace first** — always read \`desk://workspace/current\` before write operations in a new session.
- **IDs are opaque** — always call list_bookmarks to get current IDs; never cache across sessions.
- **Favicon is free** — omit \`icon\` in add_bookmark and Desk fetches it automatically (30-day cache).
- **desk-page: links** — set a bookmark's \`url\` to \`desk-page:filename.desk\` and clicking it opens the page viewer directly from the sidebar.
- **update_page is partial** — only fields you include are overwritten; omit \`content\` to change just the title, etc.
- **No workspace, no pages** — page tools return an error if VS Code has no folder open.
- **HTTP 200 always** — errors arrive as a JSON-RPC \`error\` object, not as HTTP 4xx/5xx.

## Page template

A single global template stores shared styles/structure that all agents apply when creating new pages. On session start, call \`get_page_template\` to check if one is set. If it returns an error, either use defaults or create a template with \`set_page_template\` for consistency across projects.

\`\`\`
get_page_template   → returns the shared <style> block / HTML skeleton, or error if not set
set_page_template   → saves a new template (always global, no scope arg)
\`\`\`

## Page libraries

Installed libraries (highlight.js, tocbot, etc.) are auto-injected into every page. Call \`list_libraries\` to see which are available and whether they are installed on disk.

\`\`\`
list_libraries      → library name, description, installed flag
add_library         → add/replace a library entry (name, description, files[])
remove_library      → remove a library and delete its cached files
\`\`\`

Libraries are global only (no scope). After \`add_library\`, sync from the sidebar or wait for the next install cycle to download the files.

## All 19 tools

| Tool | R | W | Required args |
|------|---|---|---------------|
| list_bookmarks | ✓ | | — |
| add_bookmark | | ✓ | title, url |
| remove_bookmark | | ✓ | bookmark_id |
| update_bookmark | | ✓ | bookmark_id, fields |
| list_pages | ✓ | | — |
| create_page | | ✓ | filename, title, content |
| update_page | | ✓ | filename (+ any fields) |
| delete_page | | ✓ | filename |
| get_workflow_config | ✓ | | — |
| submit_workflow_config | | ✓ | config |
| list_skills | ✓ | | — |
| get_skill | ✓ | | name |
| add_skill | | ✓ | name, content |
| remove_skill | | ✓ | name |
| get_page_template | ✓ | | — |
| set_page_template | | ✓ | content |
| list_libraries | ✓ | | — |
| add_library | | ✓ | name, files |
| remove_library | | ✓ | name |
`,

  'desk://guide/desk-page-format': `# Desk Page Format (.desk)

Pages are XML files stored in \`<workspace>/desk-pages/\`.

## Before creating a page

Call \`get_page_template\` first. If it returns content, use that \`<style>\` block and/or HTML structure as the basis for the new page so all pages stay visually consistent. If it returns an error (not set), create the page using defaults — and consider calling \`set_page_template\` afterward to establish a shared style for future pages.

## Layout

Content is automatically wrapped in a centred \`.page-content\` container (max-width 860px, padding 32px 40px). **Do not add a wrapper div or body layout CSS** — the template already handles it. Just write HTML content directly inside \`<desk-page>\`.

## File structure

\`\`\`xml
<desk-page title="Page Title">
  <style>
    /* per-page CSS only — do NOT set body layout, width, padding, or margin */
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; }
  </style>

  <h1>Page Title</h1>
  <p>Introductory paragraph using default typography.</p>

  <h2>Section Heading</h2>
  <p>Body text. Link to <a href="#anchor">in-page section</a>, <a href="other.desk">another page</a>, or <a href="https://example.com">external URL</a>.</p>

  <h3 id="anchor">Subsection</h3>
  <p>Inline code: <code>const x = 1</code>. Code block:</p>
  <pre><code>function greet(name) {
  return \`Hello, \${name}\`;
}</code></pre>

  <table>
    <tr><th>Column A</th><th>Column B</th></tr>
    <tr><td>Value</td><td>Value</td></tr>
  </table>

  <div class="callout tip">Tip callout using a built-in class.</div>

  <button id="my-btn">Click me</button>

  <script>
    document.getElementById('my-btn').addEventListener('click', function () {
      alert('Works!');
    });
  </script>
</desk-page>
\`\`\`

## Rules

- **No body/wrapper CSS** — writing \`body { display: flex }\` or \`body { padding }\` will conflict with the template.
- **\`#hash\` links** scroll to the named anchor natively.
- **\`<script>\`** blocks run after DOM is ready (re-injected at bottom of body).
- **Inline handlers** (\`onclick="..."\`) also work.
- **\`.desk\` links** navigate inside the viewer; **\`https://\` links** open in the browser.
- **CDN scripts are blocked by CSP** — use installed page libraries instead. Call \`list_libraries\` to see what is available; installed libraries are auto-injected into every page.

## Theme CSS variables

| Variable | Usage |
|----------|-------|
| \`--bg\` | Page background |
| \`--surface\` | Cards, code blocks |
| \`--surface2\` | Hover states, table headers |
| \`--border\` | Borders, dividers |
| \`--text\` | Body text |
| \`--muted\` | Secondary / hint text |
| \`--accent\` | Primary highlight |
| \`--accent2\` | Links, inline code, tips |
| \`--radius\` | Border radius (10px) |

## Built-in element styles (no CSS needed)

These render correctly out of the box: \`h1\`–\`h3\` (sized + coloured), \`p\` \`ul\` \`ol\`, \`a\` (teal underline-on-hover), \`code\` (teal inline), \`pre code\` (block), \`table\` th/td (hover rows), \`blockquote\`, \`hr\`, \`strong\`, \`em\`.

## Built-in callout classes

\`\`\`html
<div class="callout">neutral aside</div>
<div class="callout tip">tip — accent2 left border</div>
<div class="callout warn">warning — yellow left border</div>
<div class="callout danger">danger — red left border</div>
\`\`\`

## Card grid pattern

\`\`\`html
<style>
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin: 24px 0; }
  .card  { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .card h3 { margin-top: 0; }
</style>
<div class="cards">
  <div class="card"><h3>Title</h3><p>Description.</p></div>
  <div class="card"><h3>Title</h3><p>Description.</p></div>
</div>
\`\`\`
`,

  'desk://guide/skill-format': `# Desk Skill Format

Skills submitted via \`add_skill\` use YAML frontmatter + a markdown body.

## Frontmatter

\`\`\`yaml
---
name: dev-flow
description: >-
  One-line description used by agents to decide when to invoke this skill.
triggers:
  - starting a new task
  - reviewing a PR
agents: all
version: 1
---
\`\`\`

**Required:** \`name\` (kebab-case, e.g. \`dev-flow\`), \`description\`
**Optional:** \`triggers\`, \`agents\` (\`all\` or \`[claude-code, cursor, gemini, codex]\`), \`version\` (auto-incremented on resubmit)

## Content rules

- No hardcoded values — channel names, usernames, org names, and URLs always come from \`get_workflow_config\` at runtime
- Reference MCP tools by name only — each agent calls them via its own client
- No agent-specific syntax in the shared body — put agent-specific content in a separate skill with \`agents: [agent-id]\`

## Install paths (managed automatically)

| Agent | Path | Format |
|---|---|---|
| Claude Code | \`~/.claude/skills/<name>.md\` | markdown as-is |
| Cursor | \`.cursor/rules/<name>.mdc\` (workspace) | wrapped in Cursor rule format |
| Gemini | \`~/.gemini/skills/<name>.md\` | markdown as-is |
| Codex | workspace \`AGENTS.md\` | named section appended |
`,
};
