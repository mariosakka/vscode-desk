# Page Components & Structured Editing Design

## Overview

Six coordinated additions to Desk:

1. **Collapsible TOC sidebar** — tocbot-powered navigation baked into the default page template, collapsed by default, auto-built from h2/h3 headings.
2. **Section & list CRUD MCP tools** — 9 new tools for surgical edits on existing pages (add/remove/update individual sections and list items) without replacing the whole page body.
3. **Section type registry** — a named-template system where agents pick a type (`steps`, `cards`, `callout`, etc.) and pass structured data; the server renders the HTML. Includes built-in types plus user-registerable custom types.
4. **Books** — multi-page documents stored as a folder of pages plus a manifest, with chapter structure, a book navigation sidebar, prev/next navigation, and full CRUD via MCP tools, VS Code commands, and sidebar UI.
5. **Skill-defined MCP tools** — skills stored in the extension (workspace or global) can declare executable tools in their frontmatter; the Desk MCP server exposes them dynamically and runs their shell commands when called.
6. **Worktree–workspace linking** — a VS Code window opened on a linked git worktree resolves to the same Desk workspace as the main checkout, sharing bookmarks, skills, workflow config, and pages.

---

## Section 1 — Collapsible TOC sidebar in the default template

### What changes

`src/resources/default-page-template.desk` gains three additions in its **visible HTML** (below the comment block):

**A toggle button and nav element:**
```html
<button id="toc-toggle" class="toc-toggle" aria-label="Toggle table of contents">≡</button>
<nav id="toc" class="toc-panel collapsed"></nav>
```

The panel starts `collapsed`. Tocbot populates `#toc` automatically from h2/h3 headings. If tocbot is not installed, the toggle button is hidden via the init script.

**CSS in the template `<style>` block (VS Code vars only, no hex):**
```css
.toc-panel {
  position: fixed; left: 0; top: 44px;
  width: 220px; height: calc(100vh - 44px);
  overflow-y: auto;
  background: var(--surface); border-right: 1px solid var(--border);
  padding: 1rem 0.75rem;
  transition: transform .25s ease;
  z-index: 99;
}
.toc-panel.collapsed { transform: translateX(-100%); }
.toc-toggle {
  position: fixed; left: 8px; top: 50px; z-index: 100;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; padding: 4px 10px;
  cursor: pointer; color: var(--muted);
  transition: left .25s ease;
}
body.toc-open .toc-toggle { left: 228px; }
body.toc-open .page-content { margin-left: 230px; max-width: calc(860px + 230px); }

/* tocbot list resets */
.toc-panel ol, .toc-panel ul { padding-left: 0.75rem; list-style: none; }
.toc-panel a { color: var(--muted); text-decoration: none; font-size: 0.82rem; line-height: 1.8; display: block; }
.toc-panel a:hover, .toc-panel .is-active-link { color: var(--accent2); }
```

**Inline script (in the visible HTML, not the comment block):**
```html
<script>
  (function () {
    var toc = document.getElementById('toc');
    var toggle = document.getElementById('toc-toggle');
    if (!toc || !toggle) return;
    if (typeof tocbot === 'undefined') { toggle.style.display = 'none'; return; }
    tocbot.init({ tocSelector: '#toc', contentSelector: '.page-content', headingSelector: 'h2, h3', orderedList: false });
    toggle.addEventListener('click', function () {
      var collapsed = toc.classList.toggle('collapsed');
      toggle.textContent = collapsed ? '≡' : '←';
      document.body.classList.toggle('toc-open', !collapsed);
    });
  })();
</script>
```

### Behaviour
- If tocbot library is not installed/synced: toggle is hidden, sidebar is invisible. Page functions normally.
- If installed: sidebar populates automatically on page load. No MCP call or page content change needed.
- Collapse state is not persisted — sidebar always starts collapsed on load (clean default).
- The `body.toc-open` CSS rule shifts `.page-content` left so content is not obscured.

### List usage examples in the comment block
The existing usage guide comment gains `ul` and `ol` HTML patterns alongside the existing table/card/steps examples:
```html
=== Unordered list ===
<ul>
  <li>First item</li>
  <li>Second item with <code>inline code</code></li>
</ul>

=== Ordered list ===
<ol>
  <li>Step one</li>
  <li>Step two</li>
</ol>
```

---

## Section 2 — Section & list CRUD MCP tools

### Why

`create_page` / `update_page` handle full-page creation and full-body replacement. They are not suitable for adding a single item to an existing list or swapping out one section. These 9 new tools handle surgical edits.

All tools require a workspace open. All read `bodyHtml` via `pageReader.read()`, apply the change, and write back via `pageReader.write()`. Parsing relies on the known format produced by `assembleSections` — simple regex, no DOM library.

### Section CRUD (4 tools)

| Tool | Required args | Optional args | Effect |
|------|--------------|---------------|--------|
| `list_sections` | `filename` | — | Returns `{ id, heading, icon? }[]` |
| `add_section` | `filename, heading, content` | `id, icon, type, data` | Appends a new section div at the end |
| `update_section` | `filename, section_id` | `heading, icon, content, type, data` | Updates heading/icon/content without touching sibling sections |
| `remove_section` | `filename, section_id` | — | Deletes the section div |

`add_section` and `update_section` accept either raw `content` HTML or a `type` + `data` pair (see Section 3). When both are provided, `type`+`data` wins.

### List CRUD (5 tools)

All take `filename` + `section_id` to locate the section. All operate on the first `<ul>` or `<ol>` found inside that section.

| Tool | Extra required args | Optional args | Effect |
|------|-------------------|---------------|--------|
| `list_items` | — | — | Returns `{ type: 'ul'|'ol', items: string[] }` |
| `add_list_item` | `text` | `list_type: 'ul'|'ol'` | Appends `<li>`. Creates list if none exists (`list_type` required on first item, defaults to `'ul'`). |
| `remove_list_item` | `index` | — | Removes item at 1-based index |
| `update_list_item` | `index, text` | — | Replaces item text at 1-based index |
| `set_list_type` | `type: 'ul'|'ol'` | — | Swaps the list tag without changing items |

### Error cases
- Section ID not found → JSON-RPC error with clear message: `section "sec-0" not found in filename.desk`
- Index out of range → error: `index 5 out of range (list has 3 items)`
- `add_list_item` with no existing list and no `list_type` → defaults to `ul`
- `list_items` on a section with no list → returns `{ type: null, items: [] }`

### Implementation location
New helper functions in `src/pages/pageFormat.ts`:
- `parseSections(bodyHtml): SectionMeta[]` — extracts section ids/headings from HTML
- `getSectionHtml(bodyHtml, sectionId): string` — returns inner HTML of a section
- `replaceSectionHtml(bodyHtml, sectionId, newInnerHtml): string` — replaces inner HTML
- `removeSection(bodyHtml, sectionId): string` — removes entire section div
- `insertSection(bodyHtml, sectionHtml): string` — appends a section div
- `parseListItems(sectionHtml): { type, items }` — extracts `<li>` texts + list tag
- `rebuildList(sectionHtml, type, items): string` — replaces list in section HTML

All 9 tools added to `src/mcp/toolSchemas.ts`, `src/mcp/server/server.ts`, and tested in `src/mcp/server/server.test.ts`.

---

## Section 3 — Section type registry

### What it is

A named-template system. Instead of writing raw HTML in `content`, an agent picks a `type` and passes `data`. The server renders the HTML from the type definition.

### Built-in types

All use CSS classes already defined in the default template:

| Type | Required data | Optional data | Renders as |
|------|--------------|---------------|------------|
| `steps` | `items[]: { label, body }` | — | `.steps` numbered flow |
| `cards` | `items[]: { title, description }` | — | `.card-grid` responsive grid |
| `compare` | `left: { label, content }, right: { label, content }` | — | `.compare-grid` side-by-side |
| `callout` | `body` | `variant: info\|warning\|tip\|danger`, `title` | `.callout` box |
| `lead` | `body` | — | `.lead` section lead |
| `flow` | `items[]: { label, body }` | — | `.flow-block` sequence |
| `table` | `headers: string[], rows: string[][]` | — | Formatted `<table>` |
| `code` | `code` | `language` | `<pre><code>` block |
| `list` | `items: string[]` | `type: 'ul'\|'ol'` (default `'ul'`) | `<ul>` or `<ol>` |

Built-in renderers are pure TypeScript functions in a new file `src/pages/sectionTypes.ts`. They accept a `data` object and return an HTML string. No third-party templating library.

### User-defined types

Stored in `~/.desk/global/section-types.json` as:
```json
[
  {
    "name": "my-type",
    "description": "Short description agents see when choosing a type.",
    "template": "<div class=\"my-block\">{{title}}</div>"
  }
]
```

Template syntax: `{{variable}}` for scalar substitution, `{{#items}}...{{/items}}` for array iteration with `{{item}}` inside. No sub-properties within array items (keep it simple).

Built-in types cannot be removed. Custom types can overwrite a built-in name — user wins.

### New MCP tools for the type registry (3 tools)

| Tool | Args | Effect |
|------|------|--------|
| `list_section_types` | — | Returns all types (built-in + custom) with name, description, and parameter schema |
| `register_section_type` | `name, description, template` | Creates or replaces a custom type |
| `remove_section_type` | `name` | Removes a custom type; error if name is a built-in |

### Storage
A new `SectionTypeService` (at `src/services/sectionTypeService/sectionTypeService.ts`) owns `~/.desk/global/section-types.json`. No other class reads or writes this file. `McpServer` delegates to it for the three registry tools.

---

## Section 4 — Books

### Storage model

A book is a subfolder of `desk-pages/`: `desk-pages/<book-slug>/` containing ordinary `.desk` pages plus a `book.json` manifest:

```json
{
  "title": "Backend Onboarding",
  "chapters": [
    { "title": "Getting Started", "pages": ["intro.desk", "setup.desk"] },
    { "title": "Architecture", "pages": ["services.desk"] }
  ]
}
```

- Chapter order and page order come from the manifest, not the filesystem.
- `<book-slug>` is derived from the title the same way workspace slugs are (lowercase, non-alphanumeric runs → `-`).
- A new **`BookService`** (at `src/services/bookService/bookService.ts`) owns all `book.json` reads and writes. No other class touches manifests.
- `PageReader` is extended to accept exactly one level of subdirectory in filenames (`my-book/intro.desk`). Every existing and new page tool (`update_page`, section/list CRUD, `open`, `edit`) works on book pages unchanged via the prefixed path. Path traversal outside `desk-pages/` remains rejected.

### Viewer behaviour

When `PageViewPanel` opens a page whose path is inside a book folder, it loads the manifest via `BookService` and renders:

- **Book sidebar** — same collapsible fixed panel pattern as Section 1: chapter titles with their pages nested beneath. The current page is highlighted and expands to show its own h2/h3 headings (tocbot when installed, plain anchor links otherwise). Clicking a page sends the existing `navigate` message with the book-relative path.
- **Prev/next footer** — at the bottom of the content, following the flattened manifest order: `← Setup` / `Services →`. Hidden at the respective ends of the book.

Standalone pages keep the plain tocbot sidebar from Section 1. Book pages get the book sidebar instead — one sidebar, never two.

### MCP tools (8 new)

| Tool | Required args | Optional args | Effect |
|------|--------------|---------------|--------|
| `create_book` | `title` | `slug` | Creates folder + empty manifest |
| `list_books` | — | — | Returns `{ slug, title, pageCount }[]` |
| `get_book` | `slug` | — | Full chapter/page tree |
| `delete_book` | `slug` | — | Removes folder, manifest, and all pages |
| `add_chapter` | `slug, title` | `position` | Adds a chapter |
| `rename_chapter` | `slug, chapter_index, title` | — | Renames a chapter |
| `remove_chapter` | `slug, chapter_index` | — | Removes chapter and deletes its page files |
| `move_page` | `slug, filename, to_chapter` | `position` | Reorders or re-chapters a page |

Adding a page to a book = `create_page` with `filename: "book-slug/page.desk"` plus a required `chapter` arg when the path is inside a book (the server appends it to the manifest). `delete_page` on a book path also removes the manifest entry.

Errors: unknown slug → `book "x" not found`; chapter index out of range → clear message; `create_page` into a book without `chapter` → error listing available chapters.

### VS Code commands

Registered in `package.json` + `src/extension.ts`, following the existing QuickPick/input-box pattern:

| Command ID | Title | Flow |
|---|---|---|
| `desk.newBook` | Desk: New Book | Input box for title → creates folder + manifest |
| `desk.openBook` | Desk: Open Book | QuickPick of books → opens first page in the viewer |
| `desk.deleteBook` | Desk: Delete Book | QuickPick of books → confirmation → deletes |
| `desk.addChapter` | Desk: Add Chapter | QuickPick book → input box for chapter title |
| `desk.renameChapter` | Desk: Rename Chapter | QuickPick book → QuickPick chapter → input box |
| `desk.removeChapter` | Desk: Remove Chapter | QuickPick book → QuickPick chapter → confirmation |
| `desk.newBookPage` | Desk: New Book Page | QuickPick book → QuickPick chapter → input title → creates page + opens editor |
| `desk.moveBookPage` | Desk: Move Book Page | QuickPick book → QuickPick page → QuickPick target chapter/position |

### Sidebar UI (PagesPanel)

- **"New Book"** action next to the existing "New Page" button (shared `SectionBtn` style).
- Book rows are **expandable** (reusing the `CollapsibleSection` chevron pattern): book → chapters → pages.
- Hover actions via `HoverIconButton`:
  - **book row**: add chapter (+), rename (pencil), delete (trash with `ConfirmButtons`)
  - **chapter row**: add page (+), rename (pencil), delete (trash)
  - **page row**: open, edit source, delete — same as standalone pages today
- New webview→host messages, all carrying `scope`: `newBook`, `deleteBook`, `addChapter`, `renameChapter`, `removeChapter`, `newBookPage`, `moveBookPage`.

Every book operation is reachable three ways — MCP tool (agents), command palette, sidebar UI — matching how bookmarks, pages, and skills already work. The section/list CRUD tools from Section 2 stay MCP-only: for humans, editing the `.desk` file directly via the existing pencil action is the natural equivalent.

### Total MCP tool count after this feature: 39 (19 existing + 12 sections/types + 8 books)

---

## Section 5 — Skill-defined MCP tools

### Declaration

Skill frontmatter gains an optional `tools:` block:

```yaml
---
name: eod-weekly-log
description: Manages EOD and weekly work logs.
tools:
  - name: log_add
    description: Add an item to the daily log.
    command: "~/.desk/daily-log add {section} {text}"
    args:
      - { name: section, type: string, required: true, description: "focus | blockers | help" }
      - { name: text, type: string, required: true }
  - name: log_show
    description: Print the formatted daily log.
    command: "~/.desk/daily-log show"
---
```

### Validation & storage

`SkillRegistry` (which already validates frontmatter) additionally validates the `tools` block:

- Tool names: kebab-case or snake_case, must not collide with any built-in tool name.
- Every `{placeholder}` in `command` must match a declared arg name; every declared arg must appear in the command (except boolean-style flags are out of scope — args are strings only).
- `args[].type` is always `string` in v1.

Skills stay where they already live — `skills.json` per scope. Workspace skills contribute workspace tools; global skills contribute global tools. On name collision between scopes, workspace wins.

### Exposure

`McpServer` computes the tool list fresh on every `tools/list` request: built-ins + dynamic tools from both skill registries. No caching, so newly approved skills appear immediately and removed skills disappear immediately. Each dynamic tool's JSON schema is generated from its declared args; the description is prefixed with the owning skill's name (e.g. `[eod-weekly-log] Add an item to the daily log.`).

### Execution

On `tools/call` for a dynamic tool the server:

1. Validates required args are present (JSON-RPC error listing missing args otherwise).
2. Substitutes `{placeholders}` with shell-escaped values (single-quote escaping — arg values cannot inject shell syntax).
3. Runs the command with `child_process`, cwd = workspace root for workspace skills / home dir for global skills, 30-second timeout.
4. Returns stdout as the tool result text. Non-zero exit or timeout → JSON-RPC error containing stderr and the exit code.

### Approval model

Approve once at skill install. The existing `add_skill` confirmation flow is extended: the confirmation dialog lists any declared tools with their full command templates, so the user sees exactly what they authorize. After approval the tools are callable without further prompts. Removing the skill removes its tools.

No new MCP tools are needed for this feature — it rides on `add_skill` / `remove_skill`.

---

## Section 6 — Worktree–workspace linking

### Problem

The workspace slug is currently derived from the VS Code workspace folder name. A linked git worktree (`~/work/platform-feature-x` for main checkout `~/work/platform`) gets its own slug and therefore its own empty `~/.desk/workspaces/<slug>/` bucket, even though it is the same project.

### Resolution via git common dir

On activation, before deriving the slug, the extension runs `git rev-parse --git-common-dir` in the workspace folder:

- If it resolves to a `.git` directory **outside** the current folder → this is a linked worktree. The slug is derived from the **main worktree's** folder name (the parent of the resolved common dir), and the main worktree's path is recorded as the workspace root for data purposes.
- If it resolves inside the current folder, or the folder is not a git repo, or git is not installed → today's behavior, slug from the current folder name.

Result: opening a worktree window loads the same `~/.desk/workspaces/<slug>/` data — bookmarks, skills, workflow config — as the main checkout. Zero configuration.

### mcp-ports.json changes

The main window and a worktree window can be open simultaneously — two ports sharing one slug. The registry becomes keyed by **workspace path** instead of slug:

```json
{
  "/home/user/work/platform":            { "port": 3334, "slug": "platform" },
  "/home/user/work/platform-feature-x":  { "port": 3335, "slug": "platform" }
}
```

`desk-proxy.js` continues matching `$PWD` by longest path prefix and lands on the correct window's port. Both windows read and write the same workspace data directory. Entries are still cleaned up on deactivate.

### desk-pages/ redirection

`PageReader` (and by extension books) always resolves `desk-pages/` relative to the **main worktree's** root. All worktrees see one live set of pages and books regardless of checked-out branch — consistent with how bookmarks and skills expand across worktrees. Pages committed to git in the main worktree behave exactly as before.

### Testing

- Slug resolution: unit tests with mocked `git rev-parse` output — linked worktree, main checkout, non-git folder, git missing.
- Registry: two entries with the same slug, different paths; cleanup removes only its own path.
- `PageReader` root redirection: worktree root in, main-worktree `desk-pages/` path out.

---

## Architecture summary

```
New files:
  src/pages/sectionTypes.ts           Built-in type renderers + mini template engine
  src/services/sectionTypeService/
    sectionTypeService.ts             Custom type CRUD (~/.desk/global/section-types.json)
    sectionTypeService.test.ts
  src/services/bookService/
    bookService.ts                    Book manifest CRUD (desk-pages/<slug>/book.json)
    bookService.test.ts

Modified files:
  src/resources/default-page-template.desk  TOC sidebar + toggle + list examples
  src/pages/pageFormat.ts                   Section/list parse+mutate helpers
  src/pages/pageReader.ts                   One-level subdirectory support for book pages;
                                            root redirected to main worktree
  src/pages/pageViewPanel.ts                Book sidebar + prev/next footer rendering
  src/mcp/toolSchemas.ts                    20 new tool schemas
  src/mcp/server/server.ts                  20 new tool cases + dynamic skill-tool
                                            listing/execution
  src/mcp/server/server.test.ts             Round-trip tests for all new tools
  src/mcp/resources.ts                      Updated guides + quick-start table
  src/services/skillRegistry/skillRegistry.ts  tools block validation; confirmation
                                            dialog lists declared tools + commands
  src/extension.ts                          Wire new services + 8 book commands;
                                            worktree-aware slug + path-keyed mcp-ports.json
  ~/.desk/desk-proxy.js                     Path-keyed registry format
  package.json                              8 new command contributions
  src/webview/sidebar/SidebarApp.tsx        Book message handling
  src/webview/sidebar/components/PagesPanel/PagesPanel.tsx  Expandable book rows + actions
```

---

## Testing

- `src/pages/pageFormat.ts` helpers: unit tests alongside existing pageFormat tests
- `src/pages/sectionTypes.ts` renderers: unit tests in `src/pages/sectionTypes.test.ts`
- `src/services/sectionTypeService/sectionTypeService.test.ts`: CRUD + persistence
- `src/services/bookService/bookService.test.ts`: manifest CRUD, slug derivation, chapter/page ordering
- `src/pages/pageReader` tests: subdirectory paths accepted, traversal outside desk-pages/ rejected
- `src/mcp/server/server.test.ts`: round-trip for all 20 new tools (minimum 1 test each; section/list tools need a "section not found" error case, book tools need an "unknown slug" error case)
- Skill-defined tools: `skillRegistry` tests for tools-block validation (bad names, placeholder/arg mismatch, built-in collision); server tests for dynamic listing, arg substitution/escaping, exec success, non-zero exit, missing required arg
- Worktree linking: slug resolution tests (mocked git output), path-keyed registry read/write/cleanup, `PageReader` root redirection
- Default template change: no automated test (visual only)

---

## Implementation order (suggested phases)

1. Default template changes (standalone, no code dependencies)
2. `pageFormat.ts` helpers + `sectionTypes.ts` renderers (pure functions, testable in isolation)
3. `SectionTypeService` + tests
4. Section/list/type MCP tool schemas + server cases + tests
5. Wire `SectionTypeService` into `McpServer` constructor + `extension.ts`
6. `BookService` + `PageReader` subdirectory support + tests
7. Book MCP tools + tests
8. `PageViewPanel` book sidebar + prev/next footer
9. Book VS Code commands (`package.json` + `extension.ts`)
10. PagesPanel expandable book rows + webview messages
11. Skill tools-block validation in `SkillRegistry` + dynamic tool listing/execution in `McpServer`
12. Worktree-aware slug resolution + path-keyed `mcp-ports.json` + proxy update + `PageReader` redirection
13. Update MCP resource guides
