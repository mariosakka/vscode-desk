import * as vscode from 'vscode';
import { DataService } from './services/dataService';
import { FaviconService } from './services/faviconService';
import { McpServer } from './mcp/server';
import { PortalViewProvider } from './portalViewProvider';

export function activate(context: vscode.ExtensionContext): void {
  const dataService = new DataService(context);
  const faviconService = new FaviconService(context);
  const provider = new PortalViewProvider(context.extensionUri, dataService);
  const mcpServer = new McpServer(dataService, provider, faviconService);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PortalViewProvider.viewType, provider),
  );

  const port = vscode.workspace.getConfiguration('relay').get<number>('mcpPort', 3333);
  mcpServer.start(port);
  context.subscriptions.push({ dispose: () => mcpServer.stop() });

  context.subscriptions.push(
    vscode.commands.registerCommand('relay.addBookmark',    () => cmdAddBookmark(dataService, faviconService, provider)),
    vscode.commands.registerCommand('relay.addTab',         () => cmdAddTab(dataService, provider)),
    vscode.commands.registerCommand('relay.removeBookmark', () => cmdRemoveBookmark(dataService, provider)),
    vscode.commands.registerCommand('relay.removeTab',      () => cmdRemoveTab(dataService, provider)),
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
