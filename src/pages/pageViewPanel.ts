import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PageReader, PageContent } from './pageReader';
import { LibraryService } from '../services/libraryService/libraryService';
import { BookService, BookManifest } from '../services/bookService/bookService';

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
    const bookNavCss = bookNavHtml ? `
<style>
.toc-panel { position: fixed; left: 0; top: 44px; width: 220px; height: calc(100vh - 44px); overflow-y: auto; background: var(--surface); border-right: 1px solid var(--border); padding: 1rem 0.75rem; transition: transform .25s ease; z-index: 99; }
.toc-panel.collapsed { transform: translateX(-100%); }
.toc-toggle { position: fixed; left: 8px; top: 44px; z-index: 100; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; cursor: pointer; color: var(--muted); transition: left .25s ease; }
body.toc-open .toc-toggle { left: 228px; }
body.toc-open .page-content { margin-left: 230px; max-width: calc(860px + 230px); }
.book-nav-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.75rem; }
.book-chapters-list, .book-chapters-list ul { list-style: none; padding-left: 0.5rem; margin: 0; }
.book-chapter-item { margin-bottom: 0.5rem; }
.book-chapter-label { font-size: 0.78rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 0.2rem; }
.book-chapters-list ul a { color: var(--muted); text-decoration: none; font-size: 0.82rem; line-height: 1.8; display: block; }
.book-chapters-list ul a:hover, .book-page-active { color: var(--accent2) !important; }
.page-prevnext { display: flex; justify-content: space-between; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
.prevnext-link { color: var(--accent2); text-decoration: none; font-size: 0.9rem; }
.prevnext-link:hover { text-decoration: underline; }
</style>` : '';

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
      .replace(/\$\{bookNavCss\}/g, bookNavCss)
      .replace(/\$\{zoom\}/g, String(zoom));
  }

  private _renderBookNav(filename: string): string {
    const svc = PageViewPanel._bookService;
    if (!svc || !filename.includes('/')) return '';
    const slug = filename.split('/')[0];
    const pageFile = filename.split('/')[1];
    let manifest: BookManifest;
    try { manifest = svc.get(slug); } catch { return ''; }

    const items = manifest.chapters.map(ch => {
      const pages = ch.pages.map(p => {
        const activeAttr = p === pageFile ? ' class="book-page-active"' : '';
        return `<li><a${activeAttr} href="#" data-desk-page="${escHtml(slug + '/' + p)}">${escHtml(p.replace(/\.desk$/, ''))}</a></li>`;
      }).join('');
      return `<li class="book-chapter-item"><span class="book-chapter-label">${escHtml(ch.title)}</span><ul>${pages}</ul></li>`;
    }).join('');

    const tocCollapsed = vscode.workspace.getConfiguration('desk').get<boolean>('pageViewer.tocCollapsed', false);
    const panelClass = tocCollapsed ? 'toc-panel collapsed' : 'toc-panel';
    const toggleText = tocCollapsed ? '≡' : '←';
    return `<button id="toc-toggle" class="toc-toggle" aria-label="Toggle book navigation">${toggleText}</button>
<nav id="book-nav" class="${panelClass}">
  <div class="book-nav-title">${escHtml(manifest.title)}</div>
  <ul class="book-chapters-list">${items}</ul>
</nav>`;
  }

  private _renderPrevNext(filename: string): string {
    const svc = PageViewPanel._bookService;
    if (!svc || !filename.includes('/')) return '';
    const slug = filename.split('/')[0];
    let flat: string[];
    try { flat = svc.getFlatPageList(slug); } catch { return ''; }
    const idx = flat.indexOf(filename);
    if (idx === -1) return '';
    const prev = idx > 0 ? flat[idx - 1] : null;
    const next = idx < flat.length - 1 ? flat[idx + 1] : null;
    const prevLink = prev
      ? `<a class="prevnext-link prevnext-prev" href="#" data-desk-page="${escHtml(prev)}">← ${escHtml(prev.split('/')[1].replace(/\.desk$/, ''))}</a>`
      : '<span></span>';
    const nextLink = next
      ? `<a class="prevnext-link prevnext-next" href="#" data-desk-page="${escHtml(next)}">${escHtml(next.split('/')[1].replace(/\.desk$/, ''))} →</a>`
      : '<span></span>';
    return `<div class="page-prevnext">${prevLink}${nextLink}</div>`;
  }
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
