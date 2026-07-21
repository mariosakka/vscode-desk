# Page Viewer Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix zoom, book navigation links, add auto-generated page TOC, centralize sidebar live-refresh, and remove standalone page creation.

**Architecture:** All changes are in the page viewer webview (`src/webview/page/`), the panel host (`src/pages/pageViewPanel.ts`), the MCP server (`src/mcp/server/server.ts`), and `src/extension.ts`. No new services or components — only targeted edits to existing files.

**Tech Stack:** TypeScript (extension host), vanilla JS (webview), CSS modules, Jest (unit tests), Playwright (e2e).

## Global Constraints

- No hardcoded hex colors in CSS — use `var(--bg)`, `var(--surface)`, etc.
- No comments unless the WHY is non-obvious.
- All `npm test` unit tests must pass after every task.
- Run `npm run compile` before any e2e tests.
- Commit after each task with a `fix:` or `feat:` prefix.

---

### Task 1: Fix broken book navigation links

**Files:**
- Modify: `src/webview/page/index.js:5-24`

**Interfaces:**
- Consumes: existing click handler, `data-desk-page` attribute on book nav and prev/next links
- Produces: `data-desk-page` links post `navigate` messages correctly

- [ ] **Step 1: Edit the click handler** — add `data-desk-page` check before `href` inspection

```js
// Replace lines 10-23 (from `const href = ...` to end of the anchor block):
    const deskPage = a.getAttribute('data-desk-page');
    if (deskPage) {
      vscode.postMessage({ type: 'navigate', filename: deskPage });
      return;
    }
    const href = a.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (href.startsWith('http://') || href.startsWith('https://')) {
      vscode.postMessage({ type: 'openUrl', url: href });
      return;
    }
    const filename = href.startsWith('desk-page:') ? href.slice('desk-page:'.length) : href;
    vscode.postMessage({ type: 'navigate', filename });
```

- [ ] **Step 2: Run unit tests**

```bash
npm test
```
Expected: all pass (no unit tests cover this file directly).

- [ ] **Step 3: Commit**

```bash
git add src/webview/page/index.js
git commit -m "fix: check data-desk-page attribute before href in page viewer click handler"
```

---

### Task 2: Zoom fix + move TOC CSS to index.css

The zoom doesn't work because `html { font-size: calc(15px * var(--zoom)) }` only scales `rem`-based elements — body text in `px` never changes. Fix: apply `zoom: var(--zoom)` directly to `.page-content`.

Move all TOC/sidebar CSS out of the inline `bookNavCss` string in `pageViewPanel.ts` into `index.css` permanently — it only has visual effect when the relevant elements exist.

**Files:**
- Modify: `src/webview/page/index.html`
- Modify: `src/webview/page/index.css`
- Modify: `src/pages/pageViewPanel.ts`

**Interfaces:**
- Produces: `.page-content { zoom: var(--zoom) }` drives all zoom; `.toc-panel`, `.book-nav-*`, `.page-toc-*`, `.page-prevnext` are permanent CSS classes in `index.css`

- [ ] **Step 1: Update `index.html`** — remove `html { font-size }` from inline style, remove `${bookNavCss}` placeholder

Replace:
```html
  <style>:root { --zoom: ${zoom}; } html { font-size: calc(15px * var(--zoom)); }</style>
  <style>${customStyles}</style>
  ${libraryStyles}
  ${bookNavCss}
```
With:
```html
  <style>:root { --zoom: ${zoom}; }</style>
  <style>${customStyles}</style>
  ${libraryStyles}
```

- [ ] **Step 2: Add TOC CSS and zoom to `index.css`** — append after the `.zoom-label` rule at the end of the file

```css
/* ── Content zoom ── */
.page-content { zoom: var(--zoom); }

/* ── Book / page TOC sidebar ── */
.toc-panel { position: fixed; left: 0; top: 44px; width: 220px; height: calc(100vh - 44px); overflow-y: auto; background: var(--surface); border-right: 1px solid var(--border); padding: 12px; transition: transform .25s ease; z-index: 99; font-size: 13px; }
.toc-panel.collapsed { transform: translateX(-100%); }
body.toc-open .page-content { margin-left: 230px; max-width: calc(860px + 230px); }
.toc-nav-btn { background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; cursor: pointer; color: var(--muted); font-size: 15px; line-height: 1; display: flex; align-items: center; flex-shrink: 0; }
.toc-nav-btn:hover { background: var(--surface2); color: var(--text); }
.book-nav-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 10px; }
.book-chapters-list, .book-chapters-list ul { list-style: none; padding-left: 6px; margin: 0; }
.book-chapter-item { margin-bottom: 6px; }
.book-chapter-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 2px; }
.book-chapters-list ul a { color: var(--muted); text-decoration: none; font-size: 12px; line-height: 1.7; display: block; }
.book-chapters-list ul a:hover, .book-page-active { color: var(--accent2) !important; }
.page-toc-divider { border: none; border-top: 1px solid var(--border); margin: 10px 0; }
.page-toc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 6px; display: block; }
.page-toc-list { list-style: none; padding: 0; margin: 0; }
.page-toc-list li { padding-left: 8px; }
.page-toc-list a { color: var(--muted); text-decoration: none; font-size: 12px; line-height: 1.7; display: block; }
.page-toc-list a:hover { color: var(--accent2); }
.page-toc-h3 { padding-left: 14px; }
.page-prevnext { display: flex; justify-content: space-between; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
.prevnext-link { color: var(--accent2); text-decoration: none; font-size: 0.9rem; }
.prevnext-link:hover { text-decoration: underline; }
```

- [ ] **Step 3: Clean up `pageViewPanel.ts`** — remove `bookNavCss` variable and its `.replace()` call; make `tocToggleHtml` always render the button (remove the `bookNavHtml ?` conditional)

Find and delete the `bookNavCss` variable (lines 146–162 — the entire `const bookNavCss = bookNavHtml ? \`...\` : '';` block).

Replace:
```typescript
    const tocToggleHtml = bookNavHtml
      ? `<button id="toc-toggle" class="toc-nav-btn" aria-label="Toggle book navigation">${tocCollapsed ? '≡' : '←'}</button>`
      : '';
```
With:
```typescript
    const tocToggleHtml = `<button id="toc-toggle" class="toc-nav-btn" aria-label="Toggle navigation">≡</button>`;
```

Remove the `tocCollapsed` read from `_render()` (the initial icon is now always `≡`; JS sets the right state on load).

In the template replacement chain, remove:
```typescript
      .replace(/\$\{bookNavCss\}/g, bookNavCss)
```

- [ ] **Step 4: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/webview/page/index.html src/webview/page/index.css src/pages/pageViewPanel.ts
git commit -m "fix: apply zoom to page-content element and move TOC CSS to index.css"
```

---

### Task 3: Move book nav outside page-content (DOM restructure)

Currently `_renderBookNav()` HTML is concatenated into `${content}` which goes inside `<div class="page-content">`. The book nav must be a sibling of `.page-content` so that `zoom` on `.page-content` does not affect the sidebar.

**Files:**
- Modify: `src/webview/page/index.html`
- Modify: `src/pages/pageViewPanel.ts`

**Interfaces:**
- Produces: `${bookNav}` placeholder in template between the nav bar and `.page-content`; `_render()` populates it separately from `${content}`

- [ ] **Step 1: Add `${bookNav}` placeholder to `index.html`**

Replace:
```html
  <div class="page-content">${content}</div>
```
With:
```html
  ${bookNav}
  <div class="page-content">${content}</div>
```

- [ ] **Step 2: Update `_render()` in `pageViewPanel.ts`**

Change the `${content}` replacement to exclude `bookNavHtml`:
```typescript
      .replace(/\$\{content\}/g, page.bodyHtml + prevNextHtml)
```

Add a new `${bookNav}` replacement (add it after the `${content}` line):
```typescript
      .replace(/\$\{bookNav\}/g, bookNavHtml)
```

- [ ] **Step 3: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/webview/page/index.html src/pages/pageViewPanel.ts
git commit -m "fix: move book nav HTML outside page-content so zoom does not scale the sidebar"
```

---

### Task 4: Auto-generated page TOC

Scan `.page-content` for `h2[id]` and `h3[id]` headings after the page loads. For book pages, append an "On this page" section inside `#book-nav`. For standalone pages, create a `#page-toc` panel and insert it before `.page-content`.

Also unify the toggle wiring so it works for both book nav and standalone page TOC.

**Files:**
- Modify: `src/webview/page/index.js`

**Interfaces:**
- Consumes: `#book-nav` (book pages), `.page-content h2[id], h3[id]` (all pages)
- Produces: heading anchor links in the sidebar; `#page-toc` element for standalone pages; unified toggle wiring

- [ ] **Step 1: Replace the TOC + toggle block at the bottom of the IIFE**

The current bottom of the IIFE (from `const tocToggle = ...` to the end) should be replaced with:

```js
  // Build page heading TOC
  (function buildPageToc() {
    const headings = Array.from(
      document.querySelectorAll('.page-content h2[id], .page-content h3[id]')
    );
    if (headings.length === 0) return;

    const bookNav = document.getElementById('book-nav');
    const listHtml = headings.map(function(h) {
      const cls = h.tagName === 'H3' ? ' class="page-toc-h3"' : '';
      return '<li' + cls + '><a href="#' + h.id + '">' + h.textContent.trim() + '</a></li>';
    }).join('');

    if (bookNav) {
      bookNav.insertAdjacentHTML('beforeend',
        '<hr class="page-toc-divider">' +
        '<span class="page-toc-label">On this page</span>' +
        '<ul class="page-toc-list">' + listHtml + '</ul>'
      );
    } else {
      var nav = document.createElement('nav');
      nav.id = 'page-toc';
      nav.className = 'toc-panel collapsed';
      nav.innerHTML =
        '<span class="page-toc-label">On this page</span>' +
        '<ul class="page-toc-list">' + listHtml + '</ul>';
      var content = document.querySelector('.page-content');
      document.body.insertBefore(nav, content);
    }
  }());

  // Wire the TOC toggle button (works for both #book-nav and #page-toc)
  var tocToggle = document.getElementById('toc-toggle');
  var tocPanel = document.getElementById('book-nav') || document.getElementById('page-toc');
  if (tocToggle && tocPanel) {
    var collapsed = tocPanel.classList.contains('collapsed');
    tocToggle.textContent = collapsed ? '≡' : '←';
    if (!collapsed) { document.body.classList.add('toc-open'); }
    tocToggle.addEventListener('click', function() {
      var isNowCollapsed = tocPanel.classList.toggle('collapsed');
      tocToggle.textContent = isNowCollapsed ? '≡' : '←';
      document.body.classList.toggle('toc-open', !isNowCollapsed);
    });
  } else if (tocToggle) {
    tocToggle.style.display = 'none';
  }
```

Also update the `toggleToc` message handler to use the same selector:
```js
    if (msg.type === 'toggleToc') {
      var panel = document.getElementById('book-nav') || document.getElementById('page-toc');
      var toggle = document.getElementById('toc-toggle');
      if (panel && toggle) {
        var nowCollapsed = panel.classList.toggle('collapsed');
        toggle.textContent = nowCollapsed ? '≡' : '←';
        document.body.classList.toggle('toc-open', !nowCollapsed);
      }
    }
```

- [ ] **Step 2: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/webview/page/index.js
git commit -m "feat: auto-generate page heading TOC and unify sidebar toggle wiring"
```

---

### Task 5: Live sidebar refresh

Centralize `provider.refresh()` so every MCP tool call triggers it automatically. Add `FileSystemWatcher` instances to also catch external file edits.

**Files:**
- Modify: `src/mcp/server/server.ts`
- Modify: `src/extension.ts`

**Interfaces:**
- Consumes: `this.provider` (already on `McpServer`); `vscode.workspace.createFileSystemWatcher`
- Produces: sidebar always reflects current data within ~200 ms of any mutation

- [ ] **Step 1: Wrap the switch in `_dispatchTool` in `server.ts`**

Rename the existing `private async callTool(name: string, args: any): Promise<any>` to `private async _dispatchTool(name: string, args: any): Promise<any>`.

Add a new `private async callTool(...)` that calls it and refreshes:

```typescript
  private async callTool(name: string, args: any): Promise<any> {
    const result = await this._dispatchTool(name, args);
    this.provider.refresh();
    return result;
  }
```

Remove any individual `this.provider.refresh()` calls that are already scattered inside `_dispatchTool` cases (at least the one in `create_page` at line 260).

- [ ] **Step 2: Run unit tests** — confirm no regressions before adding the watcher

```bash
npm test
```
Expected: all pass.

- [ ] **Step 3: Add FileSystemWatcher in `extension.ts`**

Add this import at the top if not already present:
```typescript
import * as os from 'os';
```

After the line where `provider` is created (find the `new SidebarViewProvider(...)` call), add:

```typescript
  // Debounced refresh on any file change in desk-pages/ or ~/.desk/
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => provider.refresh(), 150);
  };

  const deskGlobalDir = path.join(os.homedir(), '.desk');

  const watcherPages = workspaceRoot
    ? vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, 'desk-pages/**')
      )
    : null;
  const watcherGlobal = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(deskGlobalDir, '**')
  );

  [watcherPages, watcherGlobal].forEach(w => {
    if (!w) return;
    w.onDidCreate(scheduleRefresh);
    w.onDidChange(scheduleRefresh);
    w.onDidDelete(scheduleRefresh);
    context.subscriptions.push(w);
  });
```

- [ ] **Step 4: Run unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/mcp/server/server.ts src/extension.ts
git commit -m "feat: centralize sidebar refresh after every MCP tool call and add file-system watchers"
```

---

### Task 6: Remove standalone page creation

`desk.newPage` VS Code command must be removed. The MCP `create_page` tool must validate that `filename` contains `/` (i.e. `slug/page.desk` format). `PagesPanel` no longer exists in the sidebar so no webview changes are needed.

**Files:**
- Modify: `src/extension.ts`
- Modify: `package.json`
- Modify: `src/mcp/server/server.ts`
- Modify: `src/mcp/server/server.test.ts`
- Modify: `src/mcp/toolSchemas.ts`
- Modify: `src/mcp/resources.ts`

**Interfaces:**
- Produces: `create_page` returns JSON-RPC error `{ code: -32602, message: "..." }` when filename has no `/`

- [ ] **Step 1: Remove `desk.newPage` from `extension.ts`**

Delete the `registerCommand('desk.newPage', ...)` line (line 210) and the `cmdNewPage` function (line 499 onward — find the full function body and delete it).

- [ ] **Step 2: Remove `desk.newPage` from `package.json`**

Find and delete the entry with `"command": "desk.newPage"` in `contributes.commands`.

- [ ] **Step 3: Add filename validation to `create_page` in `server.ts`**

At the very top of the `case 'create_page':` block, before any existing logic, add:

```typescript
        if (!String(args.filename ?? '').includes('/')) {
          throw new Error('create_page: filename must be in "bookSlug/page.desk" format — standalone pages are not supported');
        }
```

- [ ] **Step 4: Write the failing test in `server.test.ts`**

Find the existing `create_page` tests and add:

```typescript
it('create_page rejects a flat filename', async () => {
  const res = await server.callTool('create_page', {
    filename: 'standalone.desk',
    title: 'Bad',
    content: '',
  });
  // callTool throws, which the JSON-RPC layer converts to an error response
  // In tests the throw propagates directly
  await expect(
    server.callTool('create_page', { filename: 'standalone.desk', title: 'Bad', content: '' })
  ).rejects.toThrow('bookSlug/page.desk');
});
```

Note: check how other tests call `server.callTool` — the method is private so tests may use a helper. Mirror the pattern used in the existing `create_page` test.

- [ ] **Step 5: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=server.test
```
Expected: the new test fails (validation not yet added, or the error message doesn't match).

After adding the validation in Step 3, run again:
```bash
npm test -- --testPathPattern=server.test
```
Expected: all pass.

- [ ] **Step 6: Update `toolSchemas.ts`** — update the `create_page` description

Find the `create_page` entry and update its description field to:
```typescript
description: 'Create a new page inside a book. filename must be in "bookSlug/page.desk" format (e.g. "my-book/intro.desk"). Standalone pages are not supported.',
```

- [ ] **Step 7: Update `resources.ts`** — update the quick-start guide

Find the `create_page` row in the tool table and update the description column to note the slug-prefix requirement. Find the prose section about `create_page` usage and add: `filename must use the format \`slug/page.desk\` — standalone pages are not supported.`

- [ ] **Step 8: Run all unit tests**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/extension.ts package.json src/mcp/server/server.ts src/mcp/server/server.test.ts src/mcp/toolSchemas.ts src/mcp/resources.ts
git commit -m "feat: remove standalone page creation and enforce book-slug prefix in create_page"
```
