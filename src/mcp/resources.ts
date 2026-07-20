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
    description: 'Structured page sections, automatically injected template styles, theme variables, and supported HTML.',
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
update_page         → update the title or rebuild the page from structured sections
delete_page         → remove a page
\`\`\`

## WorkflowConfig shape

\`\`\`
communication: [{ label: "General", channel: "#general" }, { label: "Deploys", channel: "#deploys" }]
general:       [{ label: "Language", value: "en" }, { label: "Repo", value: "my-repo" }]
\`\`\`

## Session start — verify workspace

Multiple VS Code windows run separate Desk instances, but only one can own a given port. Before doing any write operations, confirm you are connected to the intended window. Use either approach:

\`\`\`
get_workspace_context
\`\`\`

Or read the resource directly:

\`\`\`
resources/read desk://workspace/current
\`\`\`

Both return the same JSON shape:

\`\`\`json
{
  "workspaceName": "my-project",
  "workspacePath": "/home/user/work/my-project",
  "pagesDir": "/home/user/work/my-project/desk-pages",
  "hasWorkspace": true
}
\`\`\`

Compare \`workspacePath\` against the directory you are actually working in. If they do not match, **stop and tell the user** — they may have the wrong VS Code window in focus. If \`hasWorkspace\` is \`false\`, page tools will return errors (no folder open in VS Code). Do not create, update, or delete anything until the mismatch is resolved.

## Key rules

- **Verify workspace first** — always read \`desk://workspace/current\` before write operations in a new session.
- **IDs are opaque** — always call list_bookmarks to get current IDs; never cache across sessions.
- **Favicon is free** — omit \`icon\` in add_bookmark and Desk fetches it automatically (30-day cache).
- **desk-page: links** — set a bookmark's \`url\` to \`desk-page:filename.desk\` and clicking it opens the page viewer directly from the sidebar.
- **update_page has two modes** — without \`sections\`, it changes only the title and preserves body/styles; with \`sections\`, it rebuilds the body from the template.
- **No workspace, no pages** — page tools return an error if VS Code has no folder open.
- **HTTP 200 always** — errors arrive as a JSON-RPC \`error\` object, not as HTTP 4xx/5xx.

## Page template

A single global template stores shared style rules for pages. On session start, call \`get_page_template\` to inspect the available CSS classes and patterns. The server automatically injects only the template's \`<style>\` rules when creating or rebuilding a page; agents do not copy template structure or an HTML skeleton. If it returns an error, either use defaults or create a template with \`set_page_template\` for consistency across projects.

\`\`\`
get_page_template   → returns the shared template for inspecting CSS classes/patterns, or error if not set
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

## All 40 static tools + dynamic skill tools

| Tool | R | W | Required args |
|------|---|---|---------------|
| list_bookmarks | ✓ | | — |
| add_bookmark | | ✓ | title, url |
| remove_bookmark | | ✓ | bookmark_id |
| update_bookmark | | ✓ | bookmark_id, fields |
| list_pages | ✓ | | — |
| create_page | | ✓ | filename, title, sections[] |
| update_page | | ✓ | filename (+ title or sections[]) |
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
| list_sections | ✓ | | filename |
| add_section | | ✓ | filename, heading |
| update_section | | ✓ | filename, section_id |
| remove_section | | ✓ | filename, section_id |
| list_items | ✓ | | filename, section_id |
| add_list_item | | ✓ | filename, section_id, text |
| remove_list_item | | ✓ | filename, section_id, index |
| update_list_item | | ✓ | filename, section_id, index, text |
| set_list_type | | ✓ | filename, section_id, type |
| list_section_types | ✓ | | — |
| register_section_type | | ✓ | name, description, template |
| remove_section_type | | ✓ | name |
| create_book | | ✓ | title |
| list_books | ✓ | | — |
| get_book | ✓ | | slug |
| delete_book | | ✓ | slug |
| add_chapter | | ✓ | slug, title |
| rename_chapter | | ✓ | slug, chapter_index, title |
| remove_chapter | | ✓ | slug, chapter_index |
| move_page | | ✓ | slug, filename, to_chapter |
| get_workspace_context | ✓ | | — |

## Dynamic skill tools

Skills that define a \`tools\` frontmatter key expose additional tools dynamically. Call \`tools/list\` to see the current full list including skill-defined tools. Workspace-scope skill tools override global tools with the same name.
`,

  'desk://guide/desk-page-format': `# Desk Page Format (.desk)

Pages are XML files stored in \`<workspace>/desk-pages/\`. You never write raw XML — use \`create_page\` with structured sections, then use \`update_page\` to change only the title or rebuild from sections.

## Before creating a page

Call \`get_page_template\` first to check what template is active. You do NOT need to copy the template — the server injects it automatically. Just read it to understand which CSS classes and patterns are available.

## Creating a page

\`create_page\` assembles the page from structured sections. The template's \`<style>\` block is injected automatically — **do not include any \`<style>\` tags in your sections**. You cannot override layout or typography this way; if styles are wrong, update the template via \`set_page_template\`.

Required: \`filename\`, \`title\`, \`sections[]\`
Optional: \`eyebrow\`, \`subtitle\`

\`\`\`json
{
  "filename": "auth-flow.desk",
  "title": "Auth Flow",
  "eyebrow": "Reference · Backend",
  "subtitle": "How JWT tokens are issued and validated across all services.",
  "sections": [
    {
      "id": "sec-0",
      "heading": "Overview",
      "icon": "🔐",
      "content": "<p>Body HTML for this section. Use classes defined in the template.</p>"
    },
    {
      "id": "sec-1",
      "heading": "Token Format",
      "content": "<table><thead><tr><th>Claim</th><th>Value</th></tr></thead><tbody><tr><td><code>sub</code></td><td>user ID string</td></tr></tbody></table>"
    }
  ]
}
\`\`\`

Each section becomes a \`<div class="section" id="...">\` with an \`<h2 class="section-title">\` heading. If \`id\` is omitted it is auto-assigned as \`sec-0\`, \`sec-1\`, etc.

## Updating a page

- **With \`sections\`**: body is fully rebuilt from the template + new sections (also updates title/eyebrow/subtitle if provided).
- **Without \`sections\`**: only \`title\` is updated; body and styles are kept as-is.

\`\`\`json
{ "filename": "auth-flow.desk", "title": "New Title" }
\`\`\`

## Section CRUD (surgical edits)

Use these instead of \`update_page\` when you want to change a single section without rebuilding the whole page:

\`\`\`
list_sections       → returns [{ id, heading }] for all sections in a page
add_section         → append a new section (heading + content HTML, optional id/icon/type)
update_section      → change heading or content of one section by id
remove_section      → delete one section by id
\`\`\`

## List CRUD

Sections that contain a \`<ul>\` or \`<ol>\` can be edited item by item:

\`\`\`
list_items          → returns { type: "ul"|"ol", items: string[] }
add_list_item       → append one item (text)
remove_list_item    → remove by 1-based index
update_list_item    → replace text at 1-based index
set_list_type       → switch between ul and ol
\`\`\`

## Section types

Section types are named templates for common content patterns (steps, cards, key-value tables, etc.):

\`\`\`
list_section_types      → built-in + custom types with descriptions
register_section_type   → save a custom Handlebars-like template (name, description, template)
remove_section_type     → remove a custom type by name
\`\`\`

Pass \`type\` + \`data\` to \`add_section\` or \`update_section\` instead of raw \`content\` to render a typed section. Built-in types: \`steps\`, \`cards\`, \`kv-table\`.

## Books

A book groups related pages into chapters. Books live in \`desk-pages/<slug>/\` alongside a \`book.json\` manifest:

\`\`\`
create_book         → creates manifest (title, auto-slug)
list_books          → summary list with page counts
get_book            → chapter/page tree for one book
delete_book         → removes manifest (pages remain on disk)
add_chapter         → append or insert a chapter by title
rename_chapter      → update chapter title by 0-based index
remove_chapter      → delete chapter entry (pages remain on disk)
move_page           → move a page between chapters (optional position)
\`\`\`

Book pages are created with \`create_page\` using \`filename: "<slug>/<page>.desk"\`.

## Theme CSS variables

These are defined by the template. Use them in section \`content\` via inline styles or the template's pre-defined classes.

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

## Built-in element styles (no extra CSS needed)

These render correctly using template styles: \`h1\`–\`h3\`, \`p\` \`ul\` \`ol\`, \`a\`, \`code\`, \`pre code\`, \`table\` th/td, \`blockquote\`, \`hr\`, \`strong\`, \`em\`.

## Rules

- **No \`<style>\` in content** — template styles are injected automatically; extra style blocks are stripped.
- **\`#hash\` links** scroll to the named anchor natively.
- **\`<script>\`** blocks run after DOM is ready (re-injected at bottom of body).
- **Inline handlers** (\`onclick="..."\`) also work.
- **\`.desk\` links** navigate inside the viewer; **\`https://\` links** open in the browser.
- **CDN scripts are blocked by CSP** — use installed page libraries instead.

## Page libraries (highlight.js, tocbot)

Installed libraries are auto-injected. Use \`typeof\` guards in section \`content\`:

\`\`\`html
<pre><code class="language-python">def hello(): return "world"</code></pre>
<script>
  if (typeof hljs !== 'undefined') hljs.highlightAll();
</script>
\`\`\`

Call \`list_libraries\` to see what is installed.
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
