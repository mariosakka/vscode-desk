import * as vscode from 'vscode';
import { DataService } from './services/dataService';
import { FaviconService } from './services/faviconService';
import { McpServer } from './mcp/server';
import { PortalViewProvider } from './portalViewProvider';
import { PageReader } from './pages/pageReader';
import { PageViewPanel } from './pages/pageViewPanel';
import { AgentRegistry } from './agents/registry';
import { ClaudeCodeAdapter } from './agents/adapters/claudeCode';
import { CursorAdapter } from './agents/adapters/cursor';
import { CodexAdapter } from './agents/adapters/codex';
import { GeminiAdapter } from './agents/adapters/gemini';

export function activate(context: vscode.ExtensionContext): void {
  const dataService = new DataService(context);
  const faviconService = new FaviconService(context);

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
  const pageReader = workspaceRoot ? new PageReader(workspaceRoot) : null;

  const provider = new PortalViewProvider(context.extensionUri, dataService, pageReader);

  const mcpServer = new McpServer(dataService, provider, faviconService, pageReader);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PortalViewProvider.viewType, provider),
  );

  const port = vscode.workspace.getConfiguration('relay').get<number>('mcpPort', 3333);
  mcpServer.start(port);
  context.subscriptions.push({ dispose: () => mcpServer.stop() });

  const agentRegistry = new AgentRegistry(
    [new ClaudeCodeAdapter(), new CursorAdapter(), new CodexAdapter(), new GeminiAdapter()],
    context,
  );
  agentRegistry.showSetupPrompt(port);

  context.subscriptions.push(
    vscode.commands.registerCommand('relay.addBookmark',    () => cmdAddBookmark(dataService, faviconService, provider)),
    vscode.commands.registerCommand('relay.addTab',         () => cmdAddTab(dataService, provider)),
    vscode.commands.registerCommand('relay.removeBookmark', () => cmdRemoveBookmark(dataService, provider)),
    vscode.commands.registerCommand('relay.removeTab',      () => cmdRemoveTab(dataService, provider)),
    vscode.commands.registerCommand('relay.openPage',       () => cmdOpenPage(context.extensionUri, pageReader)),
    vscode.commands.registerCommand('relay.newPage',        () => cmdNewPage(pageReader)),
    vscode.commands.registerCommand('relay.setupAgents',    () => agentRegistry.showSetupPromptForced(port)),
  );
}

export function deactivate(): void {}

// ── Command helpers ────────────────────────────

async function cmdAddBookmark(
  dataService: DataService,
  faviconService: FaviconService,
  provider: PortalViewProvider,
): Promise<void> {
  const tabId = await pickTab(dataService);
  if (!tabId) return;

  const title = await vscode.window.showInputBox({ prompt: 'Bookmark title', ignoreFocusOut: true });
  if (!title) return;

  const url = await vscode.window.showInputBox({ prompt: 'URL (e.g. https://example.com)', ignoreFocusOut: true });
  if (!url) return;

  const iconInput = await vscode.window.showInputBox({
    prompt: 'Icon emoji (leave blank to auto-fetch favicon)',
    ignoreFocusOut: true,
  });

  const description = await vscode.window.showInputBox({ prompt: 'Description (optional)', ignoreFocusOut: true }) ?? '';

  const icon = iconInput?.trim()
    ? iconInput.trim()
    : await faviconService.getIcon(url);

  dataService.addBookmark(tabId, { title, url, icon, description });
  provider.refresh();
}

async function cmdAddTab(dataService: DataService, provider: PortalViewProvider): Promise<void> {
  const name = await vscode.window.showInputBox({ prompt: 'Tab name', ignoreFocusOut: true });
  if (!name) return;
  dataService.createTab(name);
  provider.refresh();
}

async function cmdRemoveBookmark(dataService: DataService, provider: PortalViewProvider): Promise<void> {
  const data = dataService.get();
  if (data.tabs.length === 0) {
    vscode.window.showErrorMessage('No tabs yet.');
    return;
  }
  const tabPick = await vscode.window.showQuickPick(
    data.tabs.map(t => ({ label: t.name, id: t.id })),
    { placeHolder: 'Select tab' },
  );
  if (!tabPick) return;
  const tab = data.tabs.find(t => t.id === tabPick.id);
  if (!tab || tab.bookmarks.length === 0) {
    vscode.window.showErrorMessage('No bookmarks in this tab.');
    return;
  }
  const bmPick = await vscode.window.showQuickPick(
    tab.bookmarks.map(b => ({ label: b.title, description: b.url, id: b.id })),
    { placeHolder: 'Select bookmark to remove' },
  );
  if (!bmPick) return;
  dataService.removeBookmark(tabPick.id, bmPick.id);
  provider.refresh();
}

async function cmdRemoveTab(dataService: DataService, provider: PortalViewProvider): Promise<void> {
  const data = dataService.get();
  if (data.tabs.length === 0) {
    vscode.window.showErrorMessage('No tabs yet.');
    return;
  }
  const pick = await vscode.window.showQuickPick(
    data.tabs.map(t => ({ label: t.name, description: `${t.bookmarks.length} bookmark(s)`, id: t.id })),
    { placeHolder: 'Select tab to remove' },
  );
  if (!pick) return;
  dataService.removeTab(pick.id);
  provider.refresh();
}

async function pickTab(dataService: DataService): Promise<string | undefined> {
  const data = dataService.get();
  if (data.tabs.length === 0) {
    vscode.window.showErrorMessage('No tabs yet. Run "Relay: Add Tab" first.');
    return undefined;
  }
  const pick = await vscode.window.showQuickPick(
    data.tabs.map(t => ({ label: t.name, id: t.id })),
    { placeHolder: 'Select tab' },
  );
  return pick?.id;
}

async function cmdOpenPage(extensionUri: vscode.Uri, pageReader: PageReader | null): Promise<void> {
  if (!pageReader) {
    vscode.window.showErrorMessage('Relay: Open a workspace folder first to use pages.');
    return;
  }
  const pages = pageReader.list();
  if (pages.length === 0) {
    vscode.window.showErrorMessage('No pages yet. Run "Relay: New Page" to create one.');
    return;
  }
  const pick = await vscode.window.showQuickPick(
    pages.map(p => ({ label: p.title, description: p.filename, filename: p.filename })),
    { placeHolder: 'Select a page to open' },
  );
  if (!pick) return;
  PageViewPanel.open(extensionUri, pageReader, pick.filename);
}

async function cmdNewPage(pageReader: PageReader | null): Promise<void> {
  if (!pageReader) {
    vscode.window.showErrorMessage('Relay: Open a workspace folder first to use pages.');
    return;
  }
  const title = await vscode.window.showInputBox({ prompt: 'Page title', ignoreFocusOut: true });
  if (!title) return;

  const rawFilename = await vscode.window.showInputBox({
    prompt: 'File name (leave blank to derive from title)',
    ignoreFocusOut: true,
  });
  const filename = normalizeFilename(rawFilename?.trim() || title) + '.relay';

  pageReader.write(filename, title, `<p>Start writing your <strong>${escHtml(title)}</strong> page here.</p>`);
  vscode.window.showInformationMessage(`Relay: created ${filename} in relay-pages/`);
}

function normalizeFilename(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
