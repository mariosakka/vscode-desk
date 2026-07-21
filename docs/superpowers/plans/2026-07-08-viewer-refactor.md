# Viewer Refactor: Multi-Tab, Link Fix, Zoom & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the singleton page viewer with a per-page tab map, fix the double-open link bug, add persistent zoom controls, and expose all behavioral choices as VS Code settings and commands.

**Architecture:** `PageViewPanel` drops `_current: PageViewPanel | undefined` for `_panels: Map<string, PageViewPanel>`. Each page file gets its own `WebviewPanel`; opening a page that is already open reveals it rather than replacing it. External links route through VS Code's Simple Browser via `simpleBrowser.show`. Zoom is a `--zoom` CSS variable driven by `font-size: calc(15px * var(--zoom))` on `html`, persisted in `globalState` under `desk.page-zoom`. The webview handles zoom inputs (wheel, keys, buttons) and posts `setZoom` messages back to the host for persistence.

**Tech Stack:** TypeScript, VS Code Extension API (`WebviewPanel`, `globalState`, `commands.executeCommand`), plain JS/CSS (no bundler for webview page scripts)

## Global Constraints

- All webview CSS must use only `var(--bg)`, `var(--surface)`, `var(--surface2)`, `var(--border)`, `var(--text)`, `var(--muted)`, `var(--accent)`, `var(--accent2)`, `var(--radius)` — never hex values
- No hardcoded URLs or org-specific content anywhere
- No comments unless the why is genuinely non-obvious
- Commits use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- Run `npm test` after Tasks 3 and 4; all tests must pass before committing
- **Apply Tasks 1–2 (webview files) independently; apply Task 3 (PageViewPanel) AFTER `2026-07-08-books.md` Task 5 is merged**, since both modify `pageViewPanel.ts`
- Task 4 (package.json + extension.ts) depends on Task 3 being merged first

---

## File Map

**Modified:**
- `src/webview/page/index.html` — remove back button + `data-has-back`; add zoom nav controls; add `${zoom}` style injection
- `src/webview/page/index.css` — remove back button CSS; add zoom button + label styles
- `src/webview/page/index.js` — replace click handler with single-fire capture-phase version; remove back wiring; add zoom wheel/key/button handlers; add host message listener
- `src/pages/pageViewPanel.ts` — drop singleton; add `_panels` Map; multi-tab open/reveal; context + bookService in setup(); zoom injection in render; static zoom/toggleToc methods; Simple Browser for openUrl; history/back removed
- `src/extension.ts` — register 4 new commands; pass `context` to `PageViewPanel.setup()`
- `package.json` — 4 new command contributions + 7 new settings under `contributes.configuration`

---

### Task 1: index.html + index.css — remove back button, add zoom UI

**Files:**
- Modify: `src/webview/page/index.html`
- Modify: `src/webview/page/index.css`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `${zoom}` placeholder in HTML (Task 3's `_render()` fills it); `#zoom-in`, `#zoom-out`, `#zoom-label` elements (Task 2's JS wires them)

- [ ] **Step 1: Edit index.html**

Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'unsafe-inline' ${cspSource}; img-src data: ${cspSource};">
  <link rel="stylesheet" href="${cssUri}">
  <style>:root { --zoom: ${zoom}; } html { font-size: calc(15px * var(--zoom)); }</style>
  <style>${customStyles}</style>
  ${libraryStyles}
</head>
<body>
  <nav class="page-nav" id="page-nav">
    <span class="page-nav-label">Desk</span>
    <div class="page-nav-zoom">
      <button id="zoom-out" class="zoom-btn" title="Zoom out (Ctrl+-)">−</button>
      <span id="zoom-label" class="zoom-label">100%</span>
      <button id="zoom-in" class="zoom-btn" title="Zoom in (Ctrl+=)">+</button>
    </div>
  </nav>
  <div class="page-content">${content}</div>
  ${libraryScripts}
  ${pageScripts}
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>
```

- [ ] **Step 2: Edit index.css — remove back button rules, add zoom styles**

Remove these three rule blocks from `src/webview/page/index.css`:
```css
.page-back-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  color: var(--muted);
  cursor: pointer;
  transition: color .15s, border-color .15s;
}
.page-back-btn:hover { color: var(--text); border-color: var(--accent); }

/* hide back button when there's no history */
.page-nav[data-has-back="false"] .page-back-btn { visibility: hidden; }
```

Then append to `src/webview/page/index.css`:
```css
/* ── Zoom controls ── */
.page-nav-zoom {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.zoom-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 14px;
  color: var(--muted);
  cursor: pointer;
  line-height: 1;
  transition: color .15s, border-color .15s;
}
.zoom-btn:hover { color: var(--text); border-color: var(--accent); }
.zoom-label {
  font-size: 11px;
  color: var(--muted);
  min-width: 36px;
  text-align: center;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/webview/page/index.html src/webview/page/index.css
git commit -m "feat: add zoom controls to page viewer nav bar and remove back button"
```

---

### Task 2: index.js — single-fire link handler + zoom controls

**Files:**
- Modify: `src/webview/page/index.js`

**Interfaces:**
- Consumes: `#zoom-in`, `#zoom-out`, `#zoom-label` DOM elements from Task 1
- Produces: `setZoom { level }` postMessage (Task 3 handles); `navigate { filename }` postMessage; `openUrl { url }` postMessage; responds to host `setZoom` and `toggleToc` messages

- [ ] **Step 1: Replace index.js entirely**

```javascript
(function () {
  window.scrollTo(0, 0);
  const vscode = acquireVsCodeApi();

  // Single-fire link handler in capture phase — prevents default before any
  // inline onclick or bubbling handler can fire a second time.
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
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
  }, true);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomLabel = document.getElementById('zoom-label');

  function getCurrentZoom() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--zoom').trim();
    return parseFloat(v) || 1.0;
  }

  function applyZoom(level) {
    const clamped = Math.round(Math.max(0.5, Math.min(3.0, level)) * 10) / 10;
    document.documentElement.style.setProperty('--zoom', String(clamped));
    if (zoomLabel) zoomLabel.textContent = Math.round(clamped * 100) + '%';
    vscode.postMessage({ type: 'setZoom', level: clamped });
  }

  if (zoomInBtn) zoomInBtn.addEventListener('click', function () { applyZoom(getCurrentZoom() + 0.1); });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () { applyZoom(getCurrentZoom() - 0.1); });

  document.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    applyZoom(getCurrentZoom() + (e.deltaY < 0 ? 0.1 : -0.1));
  }, { passive: false });

  document.addEventListener('keydown', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    if (e.key === '=' || e.key === '+') { e.preventDefault(); applyZoom(getCurrentZoom() + 0.1); }
    else if (e.key === '-') { e.preventDefault(); applyZoom(getCurrentZoom() - 0.1); }
    else if (e.key === '0') { e.preventDefault(); applyZoom(1.0); vscode.postMessage({ type: 'setZoom', level: 1.0 }); }
  });

  // ── Host → webview messages ───────────────────────────────────────────────
  window.addEventListener('message', function (e) {
    const msg = e.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'setZoom') {
      const level = typeof msg.level === 'number' ? msg.level : 1.0;
      document.documentElement.style.setProperty('--zoom', String(level));
      if (zoomLabel) zoomLabel.textContent = Math.round(level * 100) + '%';
    }

    if (msg.type === 'toggleToc') {
      const panel = document.getElementById('toc') || document.getElementById('book-nav');
      const toggle = document.getElementById('toc-toggle');
      if (panel && toggle) {
        const collapsed = panel.classList.toggle('collapsed');
        toggle.textContent = collapsed ? '≡' : '←';
        document.body.classList.toggle('toc-open', !collapsed);
      }
    }
  });

  // Sync zoom label on load from injected CSS variable
  if (zoomLabel) {
    const initial = getCurrentZoom();
    zoomLabel.textContent = Math.round(initial * 100) + '%';
  }
}());
```

- [ ] **Step 2: Run e2e tests**

```bash
npm run compile && npm run test:e2e -- --grep "page-viewer"
```

Expected: existing page-viewer tests pass. The external link test should now show exactly one `openUrl` message (capture-phase handler fires once, default prevented before bubble).

If `e2e/page-viewer.spec.ts` has a test for `back` message, delete it — the back button no longer exists.

- [ ] **Step 3: Commit**

```bash
git add src/webview/page/index.js
git commit -m "fix: single-fire link handling and add zoom controls to page viewer webview"
```

---

### Task 3: PageViewPanel — multi-tab map + zoom host logic

> **Wait:** Apply this task only after `2026-07-08-books.md` Task 5 is merged (that task adds `_bookService`, `_renderBookNav`, and `_renderPrevNext` to pageViewPanel.ts).

**Files:**
- Modify: `src/pages/pageViewPanel.ts`

**Interfaces:**
- Consumes: `BookService` (imported from books plan), `vscode.ExtensionContext` passed via `setup()`
- Produces: `PageViewPanel.zoomIn/zoomOut/zoomReset/toggleToc()` static methods (Task 4 calls these); `${zoom}` template variable filled in `_render()`

- [ ] **Step 1: Replace pageViewPanel.ts**

Write the complete replacement (incorporating books-plan additions for `_bookService`, `_renderBookNav`, `_renderPrevNext` which will already be present after books Task 5):

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PageReader, PageContent } from './pageReader';
import { LibraryService } from '../services/libraryService/libraryService';
import { BookService } from '../services/bookService/bookService';

export class PageViewPanel {
  private static _panels = new Map<string, PageViewPanel>();
  private static _libraryService: LibraryService | null = null;
  private static _bookService: BookService | null = null;
  private static _context: vscode.ExtensionContext | null = null;

  private readonly _panel: vscode.WebviewPanel;

  static setup(
    libraryService: LibraryService,
    context?: vscode.ExtensionContext,
    bookService?: BookService,
  ): void {
    PageViewPanel._libraryService = libraryService;
    PageViewPanel._context = context ?? null;
    PageViewPanel._bookService = bookService ?? null;
  }

  static open(extensionUri: vscode.Uri, pageReader: PageReader, filename: string): void {
    const existing = PageViewPanel._panels.get(filename);
    if (existing) {
      existing._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }
    new PageViewPanel(extensionUri, pageReader, filename);
  }

  static zoomIn(): void { PageViewPanel._adjustZoom(0.1); }
  static zoomOut(): void { PageViewPanel._adjustZoom(-0.1); }
  static zoomReset(): void {
    PageViewPanel._context?.globalState.update('desk.page-zoom', 1.0);
    PageViewPanel._panels.forEach(p => p._panel.webview.postMessage({ type: 'setZoom', level: 1.0 }));
  }
  static toggleToc(): void {
    PageViewPanel._panels.forEach(p => p._panel.webview.postMessage({ type: 'toggleToc' }));
  }

  private static _adjustZoom(delta: number): void {
    const current = PageViewPanel._context?.globalState.get<number>('desk.page-zoom', 1.0) ?? 1.0;
    const next = Math.round(Math.max(0.5, Math.min(3.0, current + delta)) * 10) / 10;
    PageViewPanel._context?.globalState.update('desk.page-zoom', next);
    PageViewPanel._panels.forEach(p => p._panel.webview.postMessage({ type: 'setZoom', level: next }));
  }

  private constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _pageReader: PageReader,
    private readonly _filename: string,
  ) {
    const localRoots: vscode.Uri[] = [_extensionUri];
    const libCacheDir = PageViewPanel._libraryService?.libCacheDir;
    if (libCacheDir) localRoots.push(vscode.Uri.file(libCacheDir));

    this._panel = vscode.window.createWebviewPanel(
      'desk.pageView',
      'Desk Page',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: localRoots,
        retainContextWhenHidden: true,
      },
    );

    PageViewPanel._panels.set(_filename, this);
    this._panel.onDidDispose(() => { PageViewPanel._panels.delete(_filename); });
    this._panel.webview.onDidReceiveMessage(msg => this._onMessage(msg));
    this._render(_filename);
  }

  private _onMessage(msg: any): void {
    switch (msg.type) {
      case 'navigate':
        PageViewPanel.open(this._extensionUri, this._pageReader, msg.filename);
        break;
      case 'openUrl': {
        const target = vscode.workspace.getConfiguration('desk')
          .get<string>('pageViewer.openLinksIn', 'simpleBrowser');
        if (target === 'externalBrowser') {
          vscode.env.openExternal(vscode.Uri.parse(msg.url));
        } else {
          vscode.commands.executeCommand('simpleBrowser.show', msg.url);
        }
        break;
      }
      case 'setZoom': {
        const level = typeof msg.level === 'number'
          ? Math.max(0.5, Math.min(3.0, msg.level))
          : 1.0;
        PageViewPanel._context?.globalState.update('desk.page-zoom', level);
        break;
      }
    }
  }

  private _render(filename: string): void {
    let page: PageContent;
    try {
      page = this._pageReader.read(filename);
    } catch {
      vscode.window.showErrorMessage(`Desk: page not found — ${filename}`);
      return;
    }

    this._panel.title = page.title;

    const storedZoom = PageViewPanel._context?.globalState.get<number>('desk.page-zoom', 1.0) ?? 1.0;
    const zoom = Math.max(0.5, Math.min(3.0, storedZoom));

    const webview = this._panel.webview;
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'page', 'index.css'),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'page', 'index.js'),
    );
    const nonce = getNonce();
    const pageScripts = page.pageScripts
      .map(s => `<script nonce="${nonce}">${s}</script>`)
      .join('\n');

    const libFiles = PageViewPanel._libraryService?.getInstalledFiles() ?? [];
    const libraryStyles = libFiles
      .filter(f => f.type === 'style')
      .map(f => `<link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.file(f.filePath)).toString()}">`)
      .join('\n');
    const libraryScripts = libFiles
      .filter(f => f.type === 'script')
      .map(f => `<script src="${webview.asWebviewUri(vscode.Uri.file(f.filePath)).toString()}"></script>`)
      .join('\n');

    const isBookPage = filename.includes('/');
    const bookNavHtml = (isBookPage && PageViewPanel._bookService)
      ? this._renderBookNav(filename)
      : '';
    const prevNextHtml = (isBookPage && PageViewPanel._bookService)
      ? this._renderPrevNext(filename)
      : '';

    const templatePath = path.join(this._extensionUri.fsPath, 'out', 'webview', 'page', 'index.html');
    const template = fs.readFileSync(templatePath, 'utf-8');

    this._panel.webview.html = template
      .replace(/\$\{cspSource\}/g, webview.cspSource)
      .replace(/\$\{nonce\}/g, nonce)
      .replace(/\$\{cssUri\}/g, cssUri.toString())
      .replace(/\$\{scriptUri\}/g, scriptUri.toString())
      .replace(/\$\{title\}/g, escHtml(page.title))
      .replace(/\$\{customStyles\}/g, page.customStyles)
      .replace(/\$\{libraryStyles\}/g, libraryStyles)
      .replace(/\$\{libraryScripts\}/g, libraryScripts)
      .replace(/\$\{pageScripts\}/g, pageScripts)
      .replace(/\$\{content\}/g, bookNavHtml + page.bodyHtml + prevNextHtml)
      .replace(/\$\{zoom\}/g, String(zoom));
  }

  // _renderBookNav and _renderPrevNext added by 2026-07-08-books.md Task 5
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all existing tests pass. The mock's `createWebviewPanel` returns a mock panel; `_panels` map is reset between tests.

- [ ] **Step 3: Commit**

```bash
git add src/pages/pageViewPanel.ts
git commit -m "feat: multi-tab page viewer with per-panel map and zoom persistence"
```

---

### Task 4: package.json + extension.ts — commands and settings

> **Wait:** Apply after Task 3 is merged.

**Files:**
- Modify: `package.json`
- Modify: `src/extension.ts`

**Interfaces:**
- Consumes: `PageViewPanel.zoomIn/zoomOut/zoomReset/toggleToc()` from Task 3
- Produces: 4 command palette entries; 7 user-configurable settings

- [ ] **Step 1: Add 4 commands to package.json `contributes.commands`**

In `package.json`, find the `"contributes": { "commands": [` array and append:

```json
    { "command": "desk.zoomIn",    "title": "Desk: Zoom In" },
    { "command": "desk.zoomOut",   "title": "Desk: Zoom Out" },
    { "command": "desk.zoomReset", "title": "Desk: Reset Zoom" },
    { "command": "desk.toggleToc", "title": "Desk: Toggle Page Sidebar" }
```

- [ ] **Step 2: Add (or extend) `contributes.configuration` in package.json**

If a `contributes.configuration` block does not already exist, add it inside `"contributes"`. If it exists, add these entries to `properties`:

```json
"contributes": {
  "configuration": {
    "title": "Desk",
    "properties": {
      "desk.mcpPort": {
        "type": "number",
        "default": 3333,
        "description": "Port for the embedded Desk MCP server."
      },
      "desk.pageViewer.defaultZoom": {
        "type": "number",
        "default": 100,
        "description": "Initial zoom percentage when no persisted zoom exists (50–300)."
      },
      "desk.pageViewer.tocCollapsed": {
        "type": "boolean",
        "default": true,
        "description": "Whether the TOC/book sidebar starts collapsed when opening a page."
      },
      "desk.pageViewer.openLinksIn": {
        "type": "string",
        "enum": ["simpleBrowser", "externalBrowser"],
        "default": "simpleBrowser",
        "description": "Where external links in pages open: VS Code Simple Browser or the system browser."
      },
      "desk.pageViewer.singleTab": {
        "type": "boolean",
        "default": false,
        "description": "Navigate .desk links in the same tab instead of opening new tabs."
      },
      "desk.skillTools.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Expose skill-defined MCP tools via the Desk MCP server."
      },
      "desk.skillTools.timeoutSeconds": {
        "type": "number",
        "default": 30,
        "description": "Execution timeout in seconds for skill-defined MCP tool commands."
      },
      "desk.worktreeLinking.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Resolve git linked worktrees to the main checkout's Desk workspace."
      }
    }
  }
}
```

Note: if `desk.mcpPort` is already present in the existing configuration block, do not duplicate it — add only the 7 new properties.

- [ ] **Step 3: Update PageViewPanel.setup() call in extension.ts**

Find the existing call:
```typescript
PageViewPanel.setup(libraryService);
```

Replace with (bookService will be defined by the books plan — if not yet merged, pass `undefined`):
```typescript
PageViewPanel.setup(libraryService, context, bookService ?? undefined);
```

- [ ] **Step 4: Register 4 commands in extension.ts**

Inside the `context.subscriptions.push(...)` block where other commands are registered, add:

```typescript
vscode.commands.registerCommand('desk.zoomIn',    () => PageViewPanel.zoomIn()),
vscode.commands.registerCommand('desk.zoomOut',   () => PageViewPanel.zoomOut()),
vscode.commands.registerCommand('desk.zoomReset', () => PageViewPanel.zoomReset()),
vscode.commands.registerCommand('desk.toggleToc', () => PageViewPanel.toggleToc()),
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all tests pass. The vscode mock already handles `workspace.getConfiguration`; verify the mock returns defaults for the new setting keys.

- [ ] **Step 6: Commit**

```bash
git add package.json src/extension.ts
git commit -m "feat: add zoom/toc commands and user settings for page viewer"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Drop singleton `_current` → `_panels` Map | Task 3 |
| `.desk` link opens new tab / reveals existing | Task 3 (`open()` + `navigate` message handler) |
| History and back button removed | Task 1 (HTML/CSS), Task 2 (JS), Task 3 (TS) |
| External links via Simple Browser, single fire | Task 2 (capture-phase handler), Task 3 (`_onMessage openUrl`) |
| `back` message wiring removed | Task 2 |
| Zoom: wheel, keys, buttons | Task 2 |
| Zoom: CSS `--zoom` variable, `font-size` scaling | Task 1 (`${zoom}` injection), Task 3 (fills value) |
| Zoom: 50–300%, 10% steps | Task 2 (`applyZoom`), Task 3 (`_adjustZoom`) |
| Zoom: persist in `globalState` | Task 3 (`setZoom` handler + `_adjustZoom`) |
| Zoom: `desk.zoomIn/Out/Reset` commands | Task 3 (static methods), Task 4 (registration) |
| `desk.toggleToc` command | Task 3 (static method), Task 4 (registration) |
| 7 settings in `contributes.configuration` | Task 4 |

**Placeholder scan:** None found.

**Type consistency:** `PageViewPanel.zoomIn/Out/Reset/toggleToc` are all `static (): void` — matching usage in Task 4's `registerCommand` callbacks. `setup()` signature in Task 3 matches the call in Task 4.
