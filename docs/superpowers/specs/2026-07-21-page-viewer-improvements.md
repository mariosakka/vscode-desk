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

## 6. Codebase generalization and deduplication

This section covers refactoring work that is independent of the five feature changes above and should be applied in a separate pass.

---

### 6a. Shared utilities — `src/utils.ts`

`getNonce()` is defined identically in `pageViewPanel.ts:232` and `sidebarViewProvider.ts:317`.
`escHtml()` is defined identically in `pageViewPanel.ts:239` and `extension.ts:526`.

Extract both to a new `src/utils.ts` and import them everywhere they are used. Delete the local copies.

---

### 6b. JSON storage helpers — `src/storage/jsonStore.ts`

Six services (`DataService`, `WorkflowConfigService`, `SkillRegistry`, `LibraryService`, `BookService`, `SectionTypeService`) all repeat the same two patterns:

```ts
// read
try { return JSON.parse(fs.readFileSync(path, 'utf-8')); } catch { return fallback; }

// write
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
```

Extract to `src/storage/jsonStore.ts`:

```ts
export function readJson<T>(filePath: string, fallback: T): T { ... }
export function writeJson(filePath: string, data: unknown): void { ... }  // mkdirSync included
```

`writeJson` absorbs the `mkdirSync` so callers never do it manually. `BookService.saveManifest` (which currently skips `mkdirSync`) gets the guard for free.

Also fix `DataService` line 18: replace `JSON.parse(JSON.stringify(DEFAULT_DATA))` with `return { bookmarks: [] }`.

---

### 6c. `PendingStore<T>` — `src/storage/pendingStore.ts`

`WorkflowConfigService` and `SkillRegistry` both implement an identical in-memory pending-value cycle (set/get/clear/take). Extract a generic class:

```ts
export class PendingStore<T> {
  private value: T | null = null;
  set(v: T): void { this.value = v; }
  get(): T | null { return this.value; }
  take(): T | null { const v = this.value; this.value = null; return v; }
}
```

Each service holds a `PendingStore` instance. Confirm methods differ (one writes JSON, one installs skills) so they stay on the service and call `this.pending.take()`.

---

### 6d. Type consolidation — `src/models.ts`

**Move types out of service files.** `WorkflowChannel`, `WorkflowSetting`, `WorkflowConfig` are domain types currently defined in `workflowConfigService.ts`. Move them to `models.ts` and import them back into the service.

**Move provider-local types into `models.ts`.** `SidebarViewProvider` defines `BookPageMeta`, `BookChapterMeta`, `BookSummary`, `ScopedData`, `SidebarData` inline. Move these to `models.ts` and import.

**`SkillSummary` as a derived type.** Define `type SkillSummary = Omit<Skill, 'content'>` in `models.ts`. Use it as the `SkillRegistry.list()` return type, eliminating the 7-field manual destructuring at line 58–62.

**Webview `types.ts` alignment.** The webview cannot import from the host, so `types.ts` stays. But `SkillsPanel.tsx:16–22` defines a local `Skill` interface that duplicates `SkillSummary` — delete the local one and use `SkillSummary` from `types.ts`. `SidebarApp.tsx:23` re-defines `Scope` — delete it and import from `types.ts`.

---

### 6e. `ServiceBundle` — collapse parallel constructor parameters

`McpServer` and `SidebarViewProvider` each accept 8+ individual service parameters in global/workspace pairs and contain identical `_resolveScope()` methods.

Define in `models.ts`:

```ts
export interface ServiceBundle {
  dataService: DataService;
  pageReader: PageReader | null;
  workflowService: WorkflowConfigService | null;
  skillRegistry: SkillRegistry | null;
}

export function resolveScope(
  scope: Scope | undefined,
  workspace: ServiceBundle | null,
  global: ServiceBundle,
): ServiceBundle { ... }
```

Both classes replace their 8 individual service params with `global: ServiceBundle, workspace: ServiceBundle | null`. Their `_resolveScope()` methods are deleted and replaced with the shared function. `extension.ts` builds the two bundles once and passes them to both.

---

### 6f. `McpServer.callTool()` — extract helpers

**`textResult` helper** — `{ content: [{ type: 'text', text: JSON.stringify(x) }] }` appears ~25 times. Extract as a module-level function, one line each.

**`_require*` guard helpers** — four null-check patterns repeat 3–10 times each (bookService, pageReader, skillRegistry, libraryService). Extract `_requireBook()`, `_requirePageReader()`, etc. — each throws the same error message and returns the non-null service. Every case body shrinks by 2–3 lines.

**`_withList` helper** — `add_list_item`, `remove_list_item`, `update_list_item`, `set_list_type` all do: resolve → read page → get section → parse list → mutate → rebuild → write. Extract `_withList(args, mutate)` that handles the boilerplate and accepts a mutation callback.

---

### 6g. `extension.ts` — extract command helpers

**`pickScopedService<T>`** — the pattern of calling `pickScope()`, guarding `undefined`, then picking workspace vs global appears 10+ times. Extract a single async helper.

**`pickBook()` and `pickChapter(manifest)`** — the pattern of checking `!bookService`, listing books, showing QuickPick appears 5+ times across book commands. Extract these two pickers.

---

### 6h. `pageViewPanel.ts` — minor cleanups

**`parseBookFilename`** — `filename.split('/')[0]` (slug) and `filename.split('/')[1]` (pageFile) are extracted independently in both `_renderBookNav` and `_renderPrevNext`. Extract a `parseBookFilename(filename): { slug, pageFile } | null` function.

**`bookNavCss`** — the inline CSS string in `_render()` should move to `src/pages/bookNav.css`, read once at class init with `fs.readFileSync`. Eliminates string escaping and allows syntax highlighting.

---

### 6i. Sidebar component deduplication

**`LibrariesPanel` → use `PanelRow`** — `LibrariesPanel.tsx:22–43` rolls its own `.row` / `.info` / `.name` / `.desc` layout that replicates `PanelRow` exactly. Switch to `PanelRow` with `label`, `sublabel`, and `actions` props. Replace the bespoke `.removeBtn` CSS with `<HoverIconButton hoverColor="danger">`. `LibrariesPanel.module.css` shrinks to ~10 lines.

**`useConfirmDelete` hook** — `BooksPanel`, `SkillsPanel`, and `TabBar` all implement the same 3-line pending-ID state pattern. Extract a `useConfirmDelete()` hook returning `{ pendingId, setPending, clearPending }`.

**`ScopeToggle` component** — the workspace/global switcher in `SidebarApp.tsx:86–115` is 30 lines of inline-styled JSX (the only use of raw `style={{}}` in the codebase). Extract to `components/ScopeToggle/ScopeToggle.tsx` with a module CSS file.

**Delete `Header.tsx`** — not imported anywhere in the current codebase; dead code.

---

### 6j. CSS deduplication

| Duplication | Files | Fix |
|---|---|---|
| Hover-reveal `[data-hover-btn]` rules | `BookmarkCard.module.css`, `PanelRow.module.css`, `TabBar.module.css` | Move to `global.css` |
| `.error` span (11px, errorForeground) | `InlineBookmarkForm`, `InlineBarForm`, `InlineTabForm` module CSS | Move to `Inputs.module.css` |
| Panel `.body` padding block | `LibrariesPanel`, `PageTemplatePanel`, `WorkflowPanel` module CSS | Single shared class in shared CSS |
| Bottom action button row padding | `BookmarksPanel`, `BooksPanel`, `SkillsPanel` module CSS | Already in `SectionBtn.module.css` — remove the duplicates and use it |
| `InlineTabForm.module.css` | identical to `QuickOpenForm.module.css` | Delete `InlineTabForm.module.css`; `InlineTabForm` imports from `InlineBarForm.module.css` |

---

## Testing

- **Zoom**: open a book page, zoom in with Ctrl+=, verify body text, headings, images, and user-styled content all scale; verify the nav bar stays fixed size.
- **Page TOC**: open a book page with h2/h3 headings → verify "On this page" section appears in the left sidebar; click a heading link → verify smooth scroll; open a standalone page with headings → verify a standalone `#page-toc` panel appears and the TOC toggle button shows.
- **Navigation links**: click a chapter page link in the book nav → verify the page loads; click prev/next links → verify navigation works.
- **No standalone creation**: verify "New Page" form is gone from the sidebar; verify `desk.newPage` command is absent from Ctrl+Shift+P; verify `create_page` MCP call with `filename: "standalone.desk"` returns an error; verify `create_page` with `filename: "mybook/page.desk"` still succeeds.
- **Live refresh**: add a book page via MCP `create_page` → verify the sidebar updates within ~200 ms without any manual action; edit a bookmark file on disk → verify the sidebar reflects the change.
- **Refactoring (section 6)**: `npm test` passes with 0 regressions; no new duplicate code introduced; `Header.tsx` deleted; `InlineTabForm.module.css` deleted; all helper functions imported from their canonical location.
