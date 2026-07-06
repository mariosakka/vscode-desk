# Page Components & Structured Editing Design

## Overview

Three coordinated additions to Desk's `.desk` page system:

1. **Collapsible TOC sidebar** — tocbot-powered navigation baked into the default page template, collapsed by default, auto-built from h2/h3 headings.
2. **Section & list CRUD MCP tools** — 9 new tools for surgical edits on existing pages (add/remove/update individual sections and list items) without replacing the whole page body.
3. **Section type registry** — a named-template system where agents pick a type (`steps`, `cards`, `callout`, etc.) and pass structured data; the server renders the HTML. Includes built-in types plus user-registerable custom types.

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

### Total MCP tool count after this feature: 31 (19 existing + 12 new)

---

## Architecture summary

```
New files:
  src/pages/sectionTypes.ts           Built-in type renderers + mini template engine
  src/services/sectionTypeService/
    sectionTypeService.ts             Custom type CRUD (~/.desk/global/section-types.json)
    sectionTypeService.test.ts

Modified files:
  src/resources/default-page-template.desk  TOC sidebar + toggle + list examples
  src/pages/pageFormat.ts                   Section/list parse+mutate helpers
  src/mcp/toolSchemas.ts                    12 new tool schemas
  src/mcp/server/server.ts                  12 new tool cases
  src/mcp/server/server.test.ts             Round-trip tests for all new tools
  src/mcp/resources.ts                      Updated desk-page-format guide + quick-start table
  src/extension.ts                          Wire SectionTypeService into McpServer
```

---

## Testing

- `src/pages/pageFormat.ts` helpers: unit tests alongside existing pageFormat tests
- `src/pages/sectionTypes.ts` renderers: unit tests in `src/pages/sectionTypes.test.ts`
- `src/services/sectionTypeService/sectionTypeService.test.ts`: CRUD + persistence
- `src/mcp/server/server.test.ts`: round-trip for all 12 new tools (minimum 1 test each; section/list tools need a "section not found" error case)
- Default template change: no automated test (visual only)

---

## Implementation order (suggested phases)

1. Default template changes (standalone, no code dependencies)
2. `pageFormat.ts` helpers + `sectionTypes.ts` renderers (pure functions, testable in isolation)
3. `SectionTypeService` + tests
4. MCP tool schemas + server cases + tests
5. Wire `SectionTypeService` into `McpServer` constructor + `extension.ts`
6. Update MCP resource guides
