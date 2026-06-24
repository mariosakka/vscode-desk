import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DataService } from './services/dataService/dataService';
import { FaviconService } from './services/faviconService/faviconService';
import { PageReader } from './pages/pageReader';
import { PageViewPanel } from './pages/pageViewPanel';
import { WorkflowConfigService } from './services/workflowConfigService/workflowConfigService';
import { SkillRegistry } from './services/skillRegistry/skillRegistry';
import { AgentAdapter } from './agents/agentAdapter';

export class PortalViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'astrolabe.sidebar';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _dataService: DataService,
    private readonly _pageReader: PageReader | null = null,
    private readonly _faviconService: FaviconService | null = null,
    private readonly _workflowConfigService: WorkflowConfigService | null = null,
    private readonly _skillRegistry: SkillRegistry | null = null,
    private readonly _adapters: AgentAdapter[] = [],
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

    webviewView.webview.onDidReceiveMessage(async message => {
      switch (message.type) {
        case 'ready':
          this.refresh();
          break;
        case 'openUrl': {
          const url: string = message.url;
          if (url.startsWith('astrolabe-page:') && this._pageReader) {
            const filename = url.slice('astrolabe-page:'.length);
            PageViewPanel.open(this._extensionUri, this._pageReader, filename);
          } else {
            const openUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
            vscode.commands.executeCommand('simpleBrowser.show', openUrl);
          }
          break;
        }
        case 'removeBookmark':
          this._dataService.removeBookmark(message.tabId, message.bookmarkId);
          this.refresh();
          break;
        case 'addTab': {
          const name: string = message.name;
          if (!name?.trim()) break;
          this._dataService.createTab(name.trim());
          this.refresh();
          break;
        }
        case 'addBookmark': {
          const title: string = message.title;
          const url: string = message.url;
          if (!title?.trim() || !url?.trim()) break;
          const icon = this._faviconService ? await this._faviconService.getIcon(url.trim()) : '🌐';
          this._dataService.addBookmark(message.tabId, { title: title.trim(), url: url.trim(), icon, description: '' });
          this.refresh();
          break;
        }
        case 'removeTab':
          this._dataService.removeTab(message.tabId);
          this.refresh();
          break;
        case 'openPage': {
          const filename: string = message.filename;
          if (this._pageReader) {
            PageViewPanel.open(this._extensionUri, this._pageReader, filename);
          }
          break;
        }
        case 'newPage': {
          const title: string = message.title;
          if (!title?.trim() || !this._pageReader) break;
          const filename = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.astrolabe';
          if (this._pageReader.list().some(p => p.filename === filename)) {
            vscode.window.showWarningMessage(`A page named "${filename}" already exists.`);
            break;
          }
          this._pageReader.write(filename, title.trim(), `<p>${title.trim()}</p>`);
          this.refresh();
          break;
        }
        case 'deletePage': {
          const filename: string = message.filename;
          if (this._pageReader) {
            this._pageReader.delete(filename);
            this.refresh();
          }
          break;
        }
        case 'removeSkill': {
          const name: string = message.name;
          if (this._skillRegistry) {
            await this._skillRegistry.remove(name, this._adapters);
            this.refresh();
          }
          break;
        }
        case 'saveWorkflow': {
          if (this._workflowConfigService) {
            this._workflowConfigService.save(message.config);
            this.refresh();
          }
          break;
        }
        case 'newSkill':
          vscode.commands.executeCommand('astrolabe.newSkill');
          break;
        case 'editSkill': {
          const skillName: string = message.name;
          const skill = this._skillRegistry?.getAll().find(s => s.name === skillName);
          if (skill) {
            const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: skill.content });
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('Astrolabe: edit the skill, then run "Astrolabe: Submit Skill" to update it.');
          }
          break;
        }
        case 'submitSkill':
          vscode.commands.executeCommand('astrolabe.submitSkill');
          break;
      }
    });
  }

  refresh(): void {
    if (!this._view) return;
    const portal = this._dataService.get();
    const pages = this._pageReader ? this._pageReader.list() : [];
    const workflow = this._workflowConfigService ? (this._workflowConfigService.get() ?? null) : null;
    const skills = this._skillRegistry ? this._skillRegistry.list() : [];
    this._view.webview.postMessage({ type: 'update', data: { portal, pages, workflow, skills } });
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
