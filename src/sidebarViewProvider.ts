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
import { LibraryService } from './services/libraryService/libraryService';
import { BookService } from './services/bookService/bookService';
import { BookPageMeta, BookChapterMeta, BookSummary, ScopedData, SidebarData } from './models';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'desk.sidebar';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _globalDataService: DataService,
    private readonly _globalPageStore: PageReader,
    private readonly _globalWorkflowService: WorkflowConfigService,
    private readonly _globalSkillRegistry: SkillRegistry,
    private readonly _workspaceDataService: DataService | null,
    private readonly _workspacePageReader: PageReader | null,
    private readonly _workspaceWorkflowService: WorkflowConfigService | null,
    private readonly _workspaceSkillRegistry: SkillRegistry | null,
    private _workspaceName: string | null,
    private readonly _faviconService: FaviconService | null = null,
    private readonly _adapters: AgentAdapter[] = [],
    private readonly _libraryService: LibraryService | null = null,
    private readonly _bookService: BookService | null = null,
  ) {}

  private _resolveScope(scope: 'workspace' | 'global' = 'workspace'): {
    dataService: DataService;
    pageStore: PageReader | null;
    workflowService: WorkflowConfigService | null;
    skillRegistry: SkillRegistry | null;
  } {
    if (scope === 'global' || !this._workspaceDataService) {
      return {
        dataService: this._globalDataService,
        pageStore: this._globalPageStore,
        workflowService: this._globalWorkflowService,
        skillRegistry: this._globalSkillRegistry,
      };
    }
    return {
      dataService: this._workspaceDataService,
      pageStore: this._workspacePageReader,
      workflowService: this._workspaceWorkflowService,
      skillRegistry: this._workspaceSkillRegistry,
    };
  }

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
          const resolved = this._resolveScope(message.scope as 'workspace' | 'global' | undefined);
          if (url.startsWith('desk-page:') && resolved.pageStore) {
            const filename = url.slice('desk-page:'.length);
            if (resolved.pageStore instanceof PageReader) {
              PageViewPanel.open(this._extensionUri, resolved.pageStore, filename);
            }
          } else {
            const openUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
            vscode.commands.executeCommand('simpleBrowser.show', openUrl);
          }
          break;
        }
        case 'removeBookmark': {
          const resolved = this._resolveScope(message.scope as 'workspace' | 'global' | undefined);
          resolved.dataService.removeBookmark(message.bookmarkId);
          this.refresh();
          break;
        }
        case 'updateBookmark': {
          const resolved = this._resolveScope(message.scope as 'workspace' | 'global' | undefined);
          resolved.dataService.updateBookmark(message.bookmarkId, message.fields);
          this.refresh();
          break;
        }
        case 'addBookmark': {
          const title: string = message.title;
          const url: string = message.url;
          if (!title?.trim() || !url?.trim()) break;
          const resolved = this._resolveScope(message.scope as 'workspace' | 'global' | undefined);
          const icon = this._faviconService ? await this._faviconService.getIcon(url.trim()) : '🌐';
          resolved.dataService.addBookmark({ title: title.trim(), url: url.trim(), icon, description: '' });
          this.refresh();
          break;
        }
        case 'openBook': {
          const slug: string = message.slug;
          if (!this._bookService) break;
          const resolved = this._resolveScope(message.scope as 'workspace' | 'global' | undefined);
          if (!(resolved.pageStore instanceof PageReader)) break;
          try {
            const manifest = this._bookService.get(slug);
            const firstChapter = manifest.chapters.find(ch => ch.pages.length > 0);
            if (!firstChapter) {
              vscode.window.showInformationMessage(`"${manifest.title}" has no pages yet. Use Desk: New Book Page to add one.`);
              break;
            }
            PageViewPanel.open(this._extensionUri, resolved.pageStore, `${slug}/${firstChapter.pages[0]}`);
          } catch {
            vscode.window.showErrorMessage('Could not open book.');
          }
          break;
        }
        case 'removeSkill': {
          const name: string = message.name;
          const resolved = this._resolveScope(message.scope as 'workspace' | 'global' | undefined);
          if (resolved.skillRegistry) {
            await resolved.skillRegistry.remove(name, this._adapters);
            this.refresh();
          }
          break;
        }
        case 'saveWorkflow': {
          const resolved = this._resolveScope(message.scope as 'workspace' | 'global' | undefined);
          if (resolved.workflowService) {
            resolved.workflowService.save(message.config);
            this.refresh();
          }
          break;
        }
        case 'newSkill':
          vscode.commands.executeCommand('desk.newSkill');
          break;
        case 'editSkill': {
          const skillName: string = message.name;
          const resolved = this._resolveScope(message.scope as 'workspace' | 'global' | undefined);
          const skill = resolved.skillRegistry?.getAll().find(s => s.name === skillName);
          if (skill) {
            const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: skill.content });
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('Desk: edit the skill, then run "Desk: Submit Skill" to update it.');
          }
          break;
        }
        case 'submitSkill':
          vscode.commands.executeCommand('desk.submitSkill');
          break;
        case 'editPageTemplate': {
          if (!this._globalDataService.getPageTemplate()) {
            this._globalDataService.setPageTemplate(
              '<style>\n  /* Shared styles applied to all new pages */\n  /* Use: --bg --surface --surface2 --border --text --muted --accent --accent2 --radius */\n</style>',
            );
          }
          vscode.window.showTextDocument(vscode.Uri.file(this._globalDataService.getPageTemplateFilePath()));
          break;
        }
        case 'clearPageTemplate': {
          this._globalDataService.clearPageTemplate();
          this.refresh();
          break;
        }
        case 'syncLibraries': {
          if (this._libraryService) {
            this._libraryService.installAll().then(() => this.refresh()).catch(() => this.refresh());
          }
          break;
        }
        case 'removeLibrary': {
          const name: string = message.name;
          if (this._libraryService) {
            try { this._libraryService.remove(name); } catch {}
            this.refresh();
          }
          break;
        }
        case 'newBook':
          vscode.commands.executeCommand('desk.newBook');
          break;
        case 'deleteBook':
          vscode.commands.executeCommand('desk.deleteBook', message.slug);
          break;
      }
    });
  }

  refresh(): void {
    if (!this._view) return;

    const buildBooks = (ps: PageReader | null): BookSummary[] => {
      if (!this._bookService || !ps) return [];
      return this._bookService.list().flatMap(b => {
        try {
          const manifest = this._bookService!.get(b.slug);
          return [{
            slug: b.slug,
            title: manifest.title,
            chapters: manifest.chapters.map(ch => ({
              title: ch.title,
              pages: ch.pages.map(p => {
                try {
                  const content = ps.read(`${b.slug}/${p}`);
                  return { filename: p, title: content.title };
                } catch {
                  return { filename: p, title: p.replace(/\.desk$/, '') };
                }
              }),
            })),
          }];
        } catch { return []; }
      });
    };

    const buildScoped = (
      ds: DataService,
      ps: PageReader | null,
      wf: WorkflowConfigService | null,
      sr: SkillRegistry | null,
      includeBooks = false,
    ): ScopedData => ({
      data: ds.get(),
      workflow: wf?.get() ?? null,
      skills: sr ? sr.list() : [],
      books: includeBooks ? buildBooks(ps) : [],
    });

    const sidebarData: SidebarData = {
      workspaceName: this._workspaceName,
      workspace: this._workspaceDataService
        ? buildScoped(
            this._workspaceDataService,
            this._workspacePageReader,
            this._workspaceWorkflowService,
            this._workspaceSkillRegistry,
            true,
          )
        : null,
      global: buildScoped(
        this._globalDataService,
        this._globalPageStore,
        this._globalWorkflowService,
        this._globalSkillRegistry,
      ),
      pageTemplate: this._globalDataService.getPageTemplate(),
      libraries: this._libraryService
        ? this._libraryService.list().map(l => ({
            name: l.name,
            description: l.description,
            installed: this._libraryService!.isInstalled(l.name),
          }))
        : [],
    };

    this._view.webview.postMessage({ type: 'update', data: sidebarData });
  }

  public updateWorkspaceName(name: string | null): void {
    this._workspaceName = name;
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
