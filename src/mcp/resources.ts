export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const RESOURCES: McpResource[] = [
  {
    uri: 'relay://guide/quick-start',
    name: 'Relay Agent Quick-Start',
    description: 'How to connect, the data model, the typical tool call loop, and key rules. Read this first.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'relay://guide/relay-page-format',
    name: 'Relay Page Format (.relay)',
    description: 'The .relay XML file format, available CSS variables, and built-in callout classes for customStyles.',
    mimeType: 'text/markdown',
  },
];

export const RESOURCE_CONTENT: Record<string, string> = {
  'relay://guide/quick-start': `# Relay Agent Quick-Start

Relay is a VS Code extension with tabbed bookmarks and \`.relay\` doc pages.
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
        ├── url         string   (https://… or relay-page:<filename>)
        ├── icon        string   (emoji or "data:image/…" base64)
        └── description string
\`\`\`

Pages are \`.relay\` files in \`<workspace>/relay-pages/\` — separate from bookmarks.

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
create_page         → write a new .relay file
update_page         → revise title, body, or per-page CSS (only provided fields change)
delete_page         → remove a page
\`\`\`

## Key rules

- **IDs are opaque** — always call list_tabs / list_bookmarks to get current IDs; never cache across sessions.
- **Favicon is free** — omit \`icon\` in add_bookmark and Relay fetches it automatically (30-day cache).
- **relay-page: links** — set a bookmark's \`url\` to \`relay-page:filename.relay\` and clicking it opens the page viewer directly from the sidebar.
- **update_page is partial** — only fields you include are overwritten; omit \`content\` to change just the title, etc.
- **No workspace, no pages** — page tools return an error if VS Code has no folder open.
- **HTTP 200 always** — errors arrive as a JSON-RPC \`error\` object, not as HTTP 4xx/5xx.

## All 11 tools

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
`,

  'relay://guide/relay-page-format': `# Relay Page Format (.relay)

Pages are XML files stored in \`<workspace>/relay-pages/\`.

## File structure

\`\`\`xml
<relay-page title="Page Title">
  <style>
    /* optional CSS — only active for this page */
    /* use theme variables (see below) to stay on-theme */
    .my-class { color: var(--accent2); }
  </style>

  <!-- HTML body — any standard HTML except <script> tags -->
  <h2>Heading</h2>
  <p>Link to another page: <a href="other.relay">other page</a></p>
  <p>External link: <a href="https://example.com">opens in browser</a></p>
</relay-page>
\`\`\`

- \`<script>\` tags are stripped before rendering.
- \`.relay\` links navigate inside the viewer (back button maintained).
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
};
