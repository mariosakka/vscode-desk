# Page Viewer Improvements — Design Spec
_2026-07-21_

## Overview

Five related improvements to the `.desk` page viewer and its data model:

1. **Zoom** — make content zoom actually work end-to-end
2. **Auto-generated page TOC** — build a heading-anchor sidebar client-side and integrate it with the book navigation panel
3. **Fix broken book navigation links** — `data-desk-page` links silently no-op because the click handler hits `href="#"` and exits early
4. **No standalone page creation** — remove all creation entry points; enforce `slug/page.desk` format in the MCP `create_page` tool
5. **Live sidebar refresh** — sidebar must reflect any data change (MCP mutations, external edits) without requiring a manual window reload

---

## 1. Zoom

### Root cause

`index.html` injects `html { font-size: calc(15px * var(--zoom)) }` so that `rem`-based elements scale. But `index.css` sets `body { font-size: 15px }` in hard `px`, which means body text never scales. User-authored page content with any explicit `px` values also never scales.

### Fix

Remove the `html { font-size: ... }` inline style from the template. Instead apply:

```css
/* index.css */
body { zoom: var(--zoom); }
.page-nav { zoom: calc(1 / var(--zoom)); }
```

`zoom` on `body` scales the entire rendered page — text, images, tables, and any user-authored `px`-based content — exactly like browser-level zoom. Counter-zooming `.page-nav` keeps the nav bar at 1:1 regardless of the content zoom level.

`--zoom` is already set on `:root` by the template's inline style block; just remove the `html { font-size }` line. The JS zoom machinery (`applyZoom`, `setZoom` message, Ctrl+scroll) is unchanged.

**Files changed:** `src/webview/page/index.html` (remove one line), `src/webview/page/index.css` (change body font-size line, add two rules).

---

## 2. Auto-generated page TOC + unified sidebar

### Goal

Every page with at least one `h2` or `h3` gets an "On this page" anchor list. For book pages it appears below the chapter/page tree in the same left sidebar. For standalone pages it's the only sidebar content.

### DOM restructure

Currently `_renderBookNav()` HTML is concatenated into `${content}` which sits inside `<div class="page-content">`. That makes the sidebar a child of the content div — problematic for zoom (zoom on a parent affects fixed children in some browsers) and prevents clean separation.

Change: add a `${bookNav}` placeholder in `index.html` between the nav bar and `.page-content`. The `_render()` method populates it with the book nav HTML (or empty string). `${content}` becomes only `page.bodyHtml + prevNextHtml`.

```html
<!-- index.html body -->
<nav class="page-nav">…</nav>
${bookNav}
<div class="page-content">${content}</div>
```

### Client-side TOC generation (`index.js`)

After DOM load, scan `.page-content` for `h2` and `h3` elements that have an `id` attribute. Build a `<ul>` of anchor links. Inject the result into the sidebar:

- **Book page** (`#book-nav` exists): append a `<div class="page-toc-section">` block inside `#book-nav` after the chapter list, separated by a `<hr>` and a "On this page" label. If no headings are found, append nothing.
- **Standalone page** (`#book-nav` absent): create a `<nav id="page-toc" class="toc-panel">` sibling and insert it into the body before `.page-content`. Wire the toggle button and `body.toc-open` class the same way as the book nav.

The `toggleToc` message handler in `index.js` already looks for `getElementById('toc') || getElementById('book-nav')` — this covers both cases once `#page-toc` is used as the standalone ID. Update the local click handler to use the same selector.

### CSS

The `.toc-panel` styles in `bookNavCss` (injected by `pageViewPanel.ts`) already define the sidebar look. Extend with:

```css
.page-toc-divider { border: none; border-top: 1px solid var(--border); margin: 10px 0; }
.page-toc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 6px; display: block; }
.page-toc-list { list-style: none; padding: 0; margin: 0; }
.page-toc-list li { padding-left: 8px; }
.page-toc-list a { color: var(--muted); text-decoration: none; font-size: 12px; line-height: 1.7; display: block; }
.page-toc-list a:hover { color: var(--accent2); }
.page-toc-h3 { padding-left: 14px; }
```

**Files changed:** `src/webview/page/index.html`, `src/pages/pageViewPanel.ts`, `src/webview/page/index.js`.

---

## 3. Fix broken book navigation links

### Root cause

`_renderBookNav` and `_renderPrevNext` emit links like:

```html
<a href="#" data-desk-page="slug/page.desk">…</a>
```

The click handler in `index.js` checks `href.startsWith('#')` first, calls `getElementById('')` (returns `null`), and returns — `data-desk-page` is never read.

### Fix

In the click handler, check for `data-desk-page` before inspecting `href`:

```js
const deskPage = a.getAttribute('data-desk-page');
if (deskPage) {
  vscode.postMessage({ type: 'navigate', filename: deskPage });
  return;
}
```

Insert this block immediately after `const href = a.getAttribute('href')`.

**Files changed:** `src/webview/page/index.js` (4 lines inserted).

---

## 4. No standalone page creation

### Scope

"Creating" is the only prohibited action. Listing, opening, editing, and deleting existing standalone pages all remain intact.

### Changes

| Location | Change |
|----------|--------|
| `src/webview/sidebar/components/PagesPanel/PagesPanel.tsx` | Remove the "New Page" `InlineBarForm` and its open/close state; keep the page list rows |
| `src/sidebarViewProvider.ts` | Remove the `newPage` message case |
| `src/extension.ts` | Remove the `desk.newPage` command handler and its `registerCommand` call |
| `package.json` | Remove `desk.newPage` from `contributes.commands` |
| `src/mcp/server/server.ts` | In the `create_page` case, validate that `filename` contains `/`; return a JSON-RPC error if it does not |
| `src/mcp/server/server.test.ts` | Add a test that `create_page` with a flat filename (no `/`) returns an error |
| `src/mcp/resources.ts` | Update quick-start guide to note that `create_page` requires `slug/page.desk` format |
| `src/mcp/toolSchemas.ts` | Update `create_page` description to state the slug-prefix requirement |

The `create_page` tool is not removed — agents use it to create book pages with `filename: "slug/page.desk"`. The validation simply rejects filenames without a `/`.

---

## 5. Live sidebar refresh

### Root cause

Every VS Code command handler calls `provider.refresh()` manually after mutating data. MCP tool calls go through the services directly with no path back to the sidebar, so any MCP mutation (adding a book page, updating a bookmark, installing a skill) leaves the sidebar stale until the webview is manually reloaded.

### Fix — two-layer approach

**Layer 1 — centralized MCP refresh (`src/mcp/server/server.ts`)**

`McpServer` already holds `this.provider` (a `SidebarViewProvider`). Add a single `this.provider.refresh()` call at the end of `callTool()`, after the dispatch switch returns a result and before the JSON-RPC response is sent. This covers all 40 tools unconditionally — no per-tool wiring, no new constructor parameter.

```ts
// inside callTool(), after the switch block resolves `result`
this.provider.refresh();
return result;
```

Calling refresh after read-only tools (list_bookmarks, get_skill, etc.) is harmless — the sidebar re-renders with identical data, which the webview diffing absorbs silently.

**Layer 2 — FileSystemWatcher for external edits (`src/extension.ts`)**

MCP mutations and VS Code commands are now covered. But a user or script editing files on disk directly (e.g. hand-editing `data.json` or dropping a `.desk` file) still needs to be picked up.

Set up two watchers after the sidebar provider is created:

1. `vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceRoot, 'desk-pages/**'))` — page and book-manifest changes in the workspace
2. `vscode.workspace.createFileSystemWatcher(deskGlobalDir + '/**')` where `deskGlobalDir` is `~/.desk/global` and `~/.desk/workspaces/<slug>` — bookmark, skill, workflow, library, template changes

On `onDidCreate`, `onDidChange`, `onDidDelete` from either watcher, call `provider.refresh()`. Debounce with 150 ms so rapid successive writes (e.g. a script touching several files) coalesce into one refresh.

Both watchers must be added to `context.subscriptions`.

**Files changed:** `src/mcp/server/server.ts` (1 line in `callTool`), `src/extension.ts` (two watchers + debounce helper).

---

## Testing

- **Zoom**: open a book page, zoom in with Ctrl+=, verify body text, headings, images, and user-styled content all scale; verify the nav bar stays fixed size.
- **Page TOC**: open a book page with h2/h3 headings → verify "On this page" section appears in the left sidebar; click a heading link → verify smooth scroll; open a standalone page with headings → verify a standalone `#page-toc` panel appears and the TOC toggle button shows.
- **Navigation links**: click a chapter page link in the book nav → verify the page loads; click prev/next links → verify navigation works.
- **No standalone creation**: verify "New Page" form is gone from the sidebar; verify `desk.newPage` command is absent from Ctrl+Shift+P; verify `create_page` MCP call with `filename: "standalone.desk"` returns an error; verify `create_page` with `filename: "mybook/page.desk"` still succeeds.
- **Live refresh**: add a book page via MCP `create_page` → verify the sidebar updates within ~200 ms without any manual action; edit a bookmark file on disk → verify the sidebar reflects the change.
