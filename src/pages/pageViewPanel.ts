import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PageReader, PageContent } from './pageReader';

export class PageViewPanel {
  private static _current: PageViewPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private _history: string[] = [];

  static open(extensionUri: vscode.Uri, pageReader: PageReader, filename: string): void {
    if (PageViewPanel._current) {
      PageViewPanel._current._navigate(extensionUri, pageReader, filename, true);
      PageViewPanel._current._panel.reveal(vscode.ViewColumn.One);
    } else {
      PageViewPanel._current = new PageViewPanel(extensionUri, pageReader, filename);
    }
  }

  private constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _pageReader: PageReader,
    filename: string,
  ) {
    this._panel = vscode.window.createWebviewPanel(
      'astrolabe.pageView',
      'Astrolabe Page',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [_extensionUri],
        retainContextWhenHidden: true,
      },
    );

    this._panel.onDidDispose(() => { PageViewPanel._current = undefined; });
    this._panel.webview.onDidReceiveMessage(msg => this._onMessage(msg));

    this._navigate(_extensionUri, _pageReader, filename, true);
  }

  private _navigate(
    extensionUri: vscode.Uri,
    pageReader: PageReader,
    filename: string,
    pushHistory: boolean,
  ): void {
    let page: PageContent;
    try {
      page = pageReader.read(filename);
    } catch {
      vscode.window.showErrorMessage(`Astrolabe: page not found — ${filename}`);
      return;
    }

    if (pushHistory) this._history.push(filename);

    this._panel.title = page.title;
    this._panel.webview.html = this._render(page);
  }

  private _onMessage(msg: any): void {
    switch (msg.type) {
      case 'navigate':
        this._navigate(this._extensionUri, this._pageReader, msg.filename, true);
        break;
      case 'back':
        if (this._history.length > 1) {
          this._history.pop();
          const prev = this._history[this._history.length - 1];
          this._navigate(this._extensionUri, this._pageReader, prev, false);
        }
        break;
      case 'openUrl':
        vscode.env.openExternal(vscode.Uri.parse(msg.url));
        break;
    }
  }

  private _render(page: PageContent): string {
    const webview = this._panel.webview;
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'page', 'index.css'),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'page', 'index.js'),
    );
    const nonce = getNonce();

    const templatePath = path.join(this._extensionUri.fsPath, 'out', 'webview', 'page', 'index.html');
    const template = fs.readFileSync(templatePath, 'utf-8');

    const hasBack = this._history.length > 1;

    return template
      .replace(/\$\{cspSource\}/g, webview.cspSource)
      .replace(/\$\{nonce\}/g, nonce)
      .replace(/\$\{cssUri\}/g, cssUri.toString())
      .replace(/\$\{scriptUri\}/g, scriptUri.toString())
      .replace(/\$\{title\}/g, escHtml(page.title))
      .replace(/\$\{customStyles\}/g, page.customStyles)
      .replace(/\$\{content\}/g, page.bodyHtml)
      .replace(/\$\{hasBack\}/g, hasBack ? 'true' : 'false');
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
