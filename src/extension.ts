import * as vscode from 'vscode';
import { DataService } from './services/dataService/dataService';
import { FaviconService } from './services/faviconService/faviconService';
import { WorkflowConfigService } from './services/workflowConfigService/workflowConfigService';
import { SkillRegistry } from './services/skillRegistry/skillRegistry';
import { McpServer } from './mcp/server/server';
import { PortalViewProvider } from './portalViewProvider';
import { PageReader } from './pages/pageReader';
import { PageViewPanel } from './pages/pageViewPanel';
import { AgentAdapter } from './agents/agentAdapter';
import { AgentRegistry } from './agents/registry/registry';
import { ClaudeCodeAdapter } from './agents/adapters/claudeCode/claudeCode';
import { CursorAdapter } from './agents/adapters/cursor/cursor';
import { CodexAdapter } from './agents/adapters/codex/codex';
import { GeminiAdapter } from './agents/adapters/gemini/gemini';

export function activate(context: vscode.ExtensionContext): void {
  const dataService = new DataService(context);
  const faviconService = new FaviconService(context);

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
  const pageReader = workspaceRoot ? new PageReader(workspaceRoot) : null;

  const workflowConfigService = new WorkflowConfigService(context);
  const skillRegistry = new SkillRegistry(context);

  const provider = new PortalViewProvider(context.extensionUri, dataService, pageReader);

  const adapters = [
    new ClaudeCodeAdapter(),
    new CursorAdapter(workspaceRoot),
    new CodexAdapter(workspaceRoot),
    new GeminiAdapter(),
  ];

  const agentRegistry = new AgentRegistry(adapters, context, skillRegistry);

  const mcpServer = new McpServer(
    dataService,
    provider,
    faviconService,
    pageReader,
    workflowConfigService,
    skillRegistry,
    adapters,
    () => showConfigConfirmPrompt(context.extensionUri, workflowConfigService, pageReader),
    () => showSkillConfirmPrompt(skillRegistry, adapters),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PortalViewProvider.viewType, provider),
  );

  const port = vscode.workspace.getConfiguration('relay').get<number>('mcpPort', 3333);
  mcpServer.start(port);
  context.subscriptions.push({ dispose: () => mcpServer.stop() });

  agentRegistry.showSetupPrompt(port).then(() => agentRegistry.showSkillInstallPrompt()).catch(() => {});

  context.subscriptions.push(
    vscode.commands.registerCommand('relay.addBookmark',           () => cmdAddBookmark(dataService, faviconService, provider)),
    vscode.commands.registerCommand('relay.addTab',                () => cmdAddTab(dataService, provider)),
    vscode.commands.registerCommand('relay.removeBookmark',        () => cmdRemoveBookmark(dataService, provider)),
    vscode.commands.registerCommand('relay.removeTab',             () => cmdRemoveTab(dataService, provider)),
    vscode.commands.registerCommand('relay.openPage',              () => cmdOpenPage(context.extensionUri, pageReader)),
    vscode.commands.registerCommand('relay.newPage',               () => cmdNewPage(pageReader)),
    vscode.commands.registerCommand('relay.setupAgents',           () => agentRegistry.showSetupPromptForced(port)),
    vscode.commands.registerCommand('relay.configureWorkflow',     () => cmdConfigureWorkflow(workflowConfigService)),
    vscode.commands.registerCommand('relay.installWorkflowSkills', () => agentRegistry.showSkillInstallPromptForced()),
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

async function showConfigConfirmPrompt(
  extensionUri: vscode.Uri,
  svc: WorkflowConfigService,
  pageReader: PageReader | null,
): Promise<void> {
  const pending = svc.getPending();
  if (!pending) return;

  const action = await vscode.window.showInformationMessage(
    'An agent submitted workflow config. Review before saving?',
    'Save',
    'Review first',
  );

  if (action === 'Review first' && pageReader) {
    const json = JSON.stringify(pending, null, 2);
    pageReader.write(
      '_pending-workflow-config.relay',
      'Pending Workflow Config',
      `<pre><code>${escHtml(json)}</code></pre>`,
    );
    PageViewPanel.open(extensionUri, pageReader, '_pending-workflow-config.relay');
    const confirm = await vscode.window.showInformationMessage('Save workflow config?', 'Save');
    if (confirm !== 'Save') { svc.clearPending(); return; }
  } else if (action === 'Review first') {
    // No workspace open — skip the page review, proceed directly to save
  } else if (action !== 'Save') {
    svc.clearPending();
    return;
  }

  svc.confirmPending();
  vscode.window.showInformationMessage('Relay: workflow config saved.');
}

async function showSkillConfirmPrompt(
  skillRegistry: SkillRegistry,
  adapters: AgentAdapter[],
): Promise<void> {
  const pending = skillRegistry.getPending();
  if (!pending) return;

  const description = pending.descriptionOverride ?? extractFrontmatterDescription(pending.content) ?? '';

  const action = await vscode.window.showInformationMessage(
    `Agent submitted skill '${pending.name}': ${description}. Install on all agents?`,
    'Install',
    'Review first',
    'Dismiss',
  );

  if (action === 'Review first') {
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: pending.content });
    await vscode.window.showTextDocument(doc);
    const confirm = await vscode.window.showInformationMessage(`Install '${pending.name}' skill?`, 'Install');
    if (confirm !== 'Install') { skillRegistry.clearPending(); return; }
  } else if (action !== 'Install') {
    skillRegistry.clearPending();
    return;
  }

  await skillRegistry.confirmPending(adapters);
  vscode.window.showInformationMessage(`Relay: skill '${pending.name}' installed.`);
}

async function cmdConfigureWorkflow(svc: WorkflowConfigService): Promise<void> {
  const existing = svc.get();
  const s = existing?.slack;

  const prompts: Array<{ prompt: string; value: string }> = [
    { prompt: 'Slack status channel (e.g. #status)', value: s?.status ?? '' },
    { prompt: 'Slack general channel (e.g. #general)', value: s?.general ?? '' },
    { prompt: 'Slack weekly channel (e.g. #weekly)', value: s?.weekly ?? '' },
    { prompt: 'Slack pulse channel (e.g. #pulse)', value: s?.pulse ?? '' },
    { prompt: 'Slack deploy channel (e.g. #deploy)', value: s?.deploy ?? '' },
    { prompt: 'Language code (e.g. en, ro)', value: existing?.language ?? '' },
    { prompt: 'GitHub org', value: existing?.githubOrg ?? '' },
    { prompt: 'PR account', value: existing?.prAccount ?? '' },
  ];

  const results: string[] = [];
  for (const { prompt, value } of prompts) {
    const input = await vscode.window.showInputBox({ prompt, value, ignoreFocusOut: true });
    if (input === undefined) return;
    results.push(input);
  }

  const [status, general, weekly, pulse, deploy, language, githubOrg, prAccount] = results;
  svc.save({ slack: { status, general, weekly, pulse, deploy }, language, githubOrg, prAccount });
  vscode.window.showInformationMessage('Relay: workflow config saved.');
}

function extractFrontmatterDescription(content: string): string | undefined {
  const lines = content.split('\n');
  let inFrontmatter = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '---') {
      if (!inFrontmatter) { inFrontmatter = true; continue; }
      break;
    }
    if (!inFrontmatter) continue;
    const match = lines[i].match(/^description:\s*(.*)$/);
    if (!match) continue;
    const rawValue = match[1].trim();
    if (rawValue === '>-') {
      const parts: string[] = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
        parts.push(lines[++i].trim());
      }
      return parts.join(' ') || undefined;
    }
    return rawValue || undefined;
  }
  return undefined;
}
