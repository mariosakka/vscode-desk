export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const RESOURCES: McpResource[] = [
  {
    uri: 'fezzan://guide/quick-start',
    name: 'Fezzan Agent Quick-Start',
    description: 'How to connect, the data model, the typical tool call loop, and key rules. Read this first.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'fezzan://guide/fezzan-page-format',
    name: 'Fezzan Page Format (.fezzan)',
    description: 'The .fezzan XML file format, available CSS variables, and built-in callout classes for customStyles.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'fezzan://guide/skill-format',
    name: 'Fezzan Skill Format',
    description: 'YAML frontmatter spec, content rules, and install paths for workflow skills submitted via add_skill.',
    mimeType: 'text/markdown',
  },
];

export const RESOURCE_CONTENT: Record<string, string> = {
  'fezzan://guide/quick-start': `# Fezzan Agent Quick-Start

Fezzan is a VS Code extension with tabbed bookmarks and \`.fezzan\` doc pages.
It runs a local JSON-RPC 2.0 MCP server at **http://localhost:3333/mcp**.

## Data model

\`\`\`
PortalData
└── tabs[]
    ├── id          string   ("tab_abc123")
    ├── name        string
    └── bookmarks[]
        ├── id          string   ("bm_xyz789")
        ├── title       string
        ├── url         string   (https://… or fezzan-page:<filename>)
        ├── icon        string   (emoji or "data:image/…" base64)
        └── description string
\`\`\`

Pages are \`.fezzan\` files in \`<workspace>/fezzan-pages/\` — separate from bookmarks.

## Typical loop — bookmarks

\`\`\`
list_tabs           → find the right tab (IDs are opaque — always fetch fresh)
list_bookmarks      → check what already exists to avoid duplicates
add_bookmark        → add (omit icon to auto-fetch favicon)
update_bookmark     → patch any fields
remove_bookmark     → clean up
\`\`\`

## Typical loop — pages

\`\`\`
list_pages          → see what exists
create_page         → write a new .fezzan file
update_page         → revise title, body, or per-page CSS (only provided fields change)
delete_page         → remove a page
\`\`\`

## Key rules

- **IDs are opaque** — always call list_tabs / list_bookmarks to get current IDs; never cache across sessions.
- **Favicon is free** — omit \`icon\` in add_bookmark and Fezzan fetches it automatically (30-day cache).
- **fezzan-page: links** — set a bookmark's \`url\` to \`fezzan-page:filename.fezzan\` and clicking it opens the page viewer directly from the sidebar.
- **update_page is partial** — only fields you include are overwritten; omit \`content\` to change just the title, etc.
- **No workspace, no pages** — page tools return an error if VS Code has no folder open.
- **HTTP 200 always** — errors arrive as a JSON-RPC \`error\` object, not as HTTP 4xx/5xx.

## All 16 tools

| Tool | R | W | Required args |
|------|---|---|---------------|
| list_tabs | ✓ | | — |
| list_bookmarks | ✓ | | — (tab_id optional) |
| add_bookmark | | ✓ | tab_id, title, url |
| remove_bookmark | | ✓ | tab_id, bookmark_id |
| create_tab | | ✓ | name |
| remove_tab | | ✓ | tab_id |
| update_bookmark | | ✓ | tab_id, bookmark_id, fields |
| list_pages | ✓ | | — |
| create_page | | ✓ | filename, title, content |
| update_page | | ✓ | filename (+ any fields) |
| delete_page | | ✓ | filename |
| get_workflow_config | ✓ | | — |
| submit_workflow_config | | ✓ | config |
| list_skills | ✓ | | — |
| add_skill | | ✓ | name, content |
| remove_skill | | ✓ | name |
`,

  'fezzan://guide/fezzan-page-format': `# Fezzan Page Format (.fezzan)

Pages are XML files stored in \`<workspace>/fezzan-pages/\`.

## File structure

\`\`\`xml
<fezzan-page title="Page Title">
  <style>
    /* optional CSS — only active for this page */
    /* use theme variables (see below) to stay on-theme */
    .my-class { color: var(--accent2); }
  </style>

  <!-- HTML body — any standard HTML except <script> tags -->
  <h2>Heading</h2>
  <p>Link to another page: <a href="other.fezzan">other page</a></p>
  <p>External link: <a href="https://example.com">opens in browser</a></p>
</fezzan-page>
\`\`\`

- \`<script>\` tags are stripped before rendering.
- \`.fezzan\` links navigate inside the viewer (back button maintained).
- \`https://\` links open in the browser.

## Theme CSS variables

These map onto VS Code's active theme — they work in any customStyles:

| Variable | Usage |
|----------|-------|
| \`--bg\` | Page background |
| \`--surface\` | Cards, code blocks |
| \`--surface2\` | Hover states, table headers |
| \`--border\` | Borders, dividers |
| \`--text\` | Body text |
| \`--muted\` | Secondary / hint text |
| \`--accent\` | Primary highlight (button color from active theme) |
| \`--accent2\` | Links, code, tip callouts (link color from active theme) |
| \`--radius\` | Border radius (10px) |

## Built-in callout classes

Use these in content without adding customStyles:

\`\`\`html
<div class="callout">neutral aside</div>
<div class="callout tip">tip (teal border)</div>
<div class="callout warn">warning (yellow border)</div>
<div class="callout danger">danger (red border)</div>
\`\`\`
`,

  'fezzan://guide/skill-format': `# Fezzan Skill Format

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
