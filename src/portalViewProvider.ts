import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DataService } from './services/dataService';
import { PageReader } from './pages/pageReader';
import { PageViewPanel } from './pages/pageViewPanel';

export class PortalViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'relay.sidebar';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _dataService: DataService,
    private readonly _pageReader: PageReader | null = null,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(message => {
      switch (message.type) {
        case 'ready':
          this.refresh();
          break;
        case 'openUrl': {
          const url: string = message.url;
          if (url.startsWith('relay-page:') && this._pageReader) {
            const filename = url.slice('relay-page:'.length);
            PageViewPanel.open(this._extensionUri, this._pageReader, filename);
          } else {
            vscode.env.openExternal(vscode.Uri.parse(url));
          }
          break;
        }
        case 'removeBookmark':
          this._dataService.removeBookmark(message.tabId, message.bookmarkId);
          this.refresh();
          break;
      }
    });
  }

  refresh(): void {
    if (!this._view) return;
    const data = this._dataService.get();
    this._view.webview.postMessage({ type: 'update', data });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'sidebar', 'index.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'sidebar', 'index.css'),
    );
    const nonce = getNonce();

    const templatePath = path.join(
      this._extensionUri.fsPath, 'out', 'webview', 'sidebar', 'index.html',
    );
    const template = fs.readFileSync(templatePath, 'utf-8');

    return template
      .replace(/\$\{cspSource\}/g, webview.cspSource)
      .replace(/\$\{nonce\}/g, nonce)
      .replace(/\$\{cssUri\}/g, styleUri.toString())
      .replace(/\$\{scriptUri\}/g, scriptUri.toString());
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
