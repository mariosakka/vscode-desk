import * as vscode from 'vscode';
import * as path from 'path';
import { DataService } from './services/dataService/dataService';
import { FaviconService } from './services/faviconService/faviconService';
import { WorkflowConfigService } from './services/workflowConfigService/workflowConfigService';
import { SkillRegistry } from './services/skillRegistry/skillRegistry';
import { McpServer } from './mcp/server/server';
import { SidebarViewProvider } from './sidebarViewProvider';
import { PageReader } from './pages/pageReader';
import { PageViewPanel } from './pages/pageViewPanel';
import { AgentAdapter } from './agents/agentAdapter';
import { AgentRegistry } from './agents/registry/registry';
import { ClaudeCodeAdapter } from './agents/adapters/claudeCode/claudeCode';
import { CursorAdapter } from './agents/adapters/cursor/cursor';
import { CodexAdapter } from './agents/adapters/codex/codex';
import { GeminiAdapter } from './agents/adapters/gemini/gemini';
import { globalDir, workspaceDir } from './storage/deskDir';

export function activate(context: vscode.ExtensionContext): void {
  const faviconService = new FaviconService(context);

  // Resolve ~/.desk/ directories
  const gDir = globalDir();
  const workspaceName = vscode.workspace.name ?? null;
  const wDir = workspaceName ? workspaceDir(workspaceName) : null;

  // Global services — always available
  const globalDataService = new DataService(gDir);
  const globalPageReader = new PageReader(path.join(gDir, 'pages'));
  const globalWorkflowService = new WorkflowConfigService(gDir);
  const globalSkillRegistry = new SkillRegistry(gDir);

  // Workspace services — only when a folder/workspace is open
  const workspaceDataService = wDir ? new DataService(wDir) : null;
  const workspacePageReader = wDir ? new PageReader(path.join(wDir, 'pages')) : null;
  const workspaceWorkflowService = wDir ? new WorkflowConfigService(wDir) : null;
  const workspaceSkillRegistry = wDir ? new SkillRegistry(wDir) : null;

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;

  const adapters: AgentAdapter[] = [
    new ClaudeCodeAdapter(),
    new CursorAdapter(workspaceRoot),
    new CodexAdapter(workspaceRoot),
    new GeminiAdapter(),
  ];

  const provider = new SidebarViewProvider(
    context.extensionUri,
    globalDataService,
    globalPageReader,
    globalWorkflowService,
    globalSkillRegistry,
    workspaceDataService,
    workspacePageReader,
    workspaceWorkflowService,
    workspaceSkillRegistry,
    workspaceName,
    faviconService,
    adapters,
  );

  const agentRegistry = new AgentRegistry(adapters, context, workspaceSkillRegistry ?? globalSkillRegistry);

  const mcpServer = new McpServer(
    globalDataService,
    globalPageReader,
    globalWorkflowService,
    globalSkillRegistry,
    workspaceDataService,
    workspacePageReader,
    workspaceWorkflowService,
    workspaceSkillRegistry,
    provider,
    faviconService,
    adapters,
    async (scope: string) => {
      const svc = scope === 'workspace' ? (workspaceWorkflowService ?? globalWorkflowService) : globalWorkflowService;
      const reader = scope === 'workspace' ? workspacePageReader : null;
      await showConfigConfirmPrompt(context.extensionUri, svc, reader);
      provider.refresh();
    },
    async (scope: string) => {
      const registry = scope === 'workspace' ? (workspaceSkillRegistry ?? globalSkillRegistry) : globalSkillRegistry;
      await showSkillConfirmPrompt(registry, adapters);
      provider.refresh();
    },
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarViewProvider.viewType, provider),
  );

  const preferredPort = vscode.workspace.getConfiguration('desk').get<number>('mcpPort', 3333);
  let resolvedPort = preferredPort;
  mcpServer.start(preferredPort).then(actualPort => {
    resolvedPort = actualPort;
    context.subscriptions.push({ dispose: () => mcpServer.stop() });
    agentRegistry.showSetupPrompt(actualPort).then(() => agentRegistry.showSkillInstallPrompt()).catch(() => {});
  }).catch(() => {});

  async function pickScope(): Promise<'workspace' | 'global' | undefined> {
    if (!workspaceDataService) return 'global';
    const pick = await vscode.window.showQuickPick(
      [
        { label: 'Workspace', description: workspaceName ?? '', value: 'workspace' as const },
        { label: 'Global', description: 'Available in all workspaces', value: 'global' as const },
      ],
      { placeHolder: 'Choose scope' },
    );
    return pick?.value;
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('desk.addBookmark', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const ds = scope === 'workspace' ? (workspaceDataService ?? globalDataService) : globalDataService;
      await cmdAddBookmark(ds, faviconService, provider);
    }),
    vscode.commands.registerCommand('desk.removeBookmark', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const ds = scope === 'workspace' ? (workspaceDataService ?? globalDataService) : globalDataService;
      await cmdRemoveBookmark(ds, provider);
    }),
    vscode.commands.registerCommand('desk.openPage',              () => cmdOpenPage(context.extensionUri, workspacePageReader ?? globalPageReader)),
    vscode.commands.registerCommand('desk.newPage',               () => cmdNewPage(workspacePageReader ?? globalPageReader)),
    vscode.commands.registerCommand('desk.setupAgents',           () => agentRegistry.showSetupPromptForced(resolvedPort)),
    vscode.commands.registerCommand('desk.configureWorkflow', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const svc = scope === 'workspace' ? (workspaceWorkflowService ?? globalWorkflowService) : globalWorkflowService;
      await cmdConfigureWorkflow(svc);
    }),
    vscode.commands.registerCommand('desk.installWorkflowSkills', () => agentRegistry.showSkillInstallPromptForced()),
    vscode.commands.registerCommand('desk.openUrl',        () => cmdOpenUrl()),
    vscode.commands.registerCommand('desk.updateBookmark', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const ds = scope === 'workspace' ? (workspaceDataService ?? globalDataService) : globalDataService;
      await cmdUpdateBookmark(ds, faviconService, provider);
    }),
    vscode.commands.registerCommand('desk.deletePage', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const store = scope === 'workspace' ? (workspacePageReader ?? globalPageReader) : globalPageReader;
      await cmdDeletePage(store, provider);
    }),
    vscode.commands.registerCommand('desk.removeSkill', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const registry = scope === 'workspace' ? (workspaceSkillRegistry ?? globalSkillRegistry) : globalSkillRegistry;
      await cmdRemoveSkill(registry, adapters, provider);
    }),
    vscode.commands.registerCommand('desk.newSkill',    () => cmdNewSkill()),
    vscode.commands.registerCommand('desk.editSkill', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const registry = scope === 'workspace' ? (workspaceSkillRegistry ?? globalSkillRegistry) : globalSkillRegistry;
      await cmdEditSkill(registry);
    }),
    vscode.commands.registerCommand('desk.submitSkill', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const registry = scope === 'workspace' ? (workspaceSkillRegistry ?? globalSkillRegistry) : globalSkillRegistry;
      await cmdSubmitSkill(registry, adapters, provider);
    }),
    vscode.commands.registerCommand('desk.listBookmarks', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const ds = scope === 'workspace' ? (workspaceDataService ?? globalDataService) : globalDataService;
      await cmdListBookmarks(ds);
    }),
    vscode.commands.registerCommand('desk.listSkills', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const registry = scope === 'workspace' ? (workspaceSkillRegistry ?? globalSkillRegistry) : globalSkillRegistry;
      await cmdListSkills(registry);
    }),
    vscode.commands.registerCommand('desk.viewWorkflow', async () => {
      const scope = await pickScope();
      if (scope === undefined) return;
      const svc = scope === 'workspace' ? (workspaceWorkflowService ?? globalWorkflowService) : globalWorkflowService;
      await cmdViewWorkflow(svc);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      provider.updateWorkspaceName(vscode.workspace.name ?? null);
      provider.refresh();
    }),
  );
}

export function deactivate(): void {}

// ── Command helpers ────────────────────────────

async function cmdAddBookmark(
  dataService: DataService,
  faviconService: FaviconService,
  provider: SidebarViewProvider,
): Promise<void> {
  const title = await vscode.window.showInputBox({ prompt: 'Bookmark title', ignoreFocusOut: true });
  if (!title) return;

  if (dataService.get().bookmarks.some(b => b.title.toLowerCase() === title.toLowerCase())) {
    vscode.window.showWarningMessage(`A bookmark named "${title}" already exists.`);
    return;
  }

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

  dataService.addBookmark({ title, url, icon, description });
  provider.refresh();
}

async function cmdRemoveBookmark(dataService: DataService, provider: SidebarViewProvider): Promise<void> {
  const data = dataService.get();
  if (data.bookmarks.length === 0) {
    vscode.window.showErrorMessage('No bookmarks yet.');
    return;
  }
  const bmPick = await vscode.window.showQuickPick(
    data.bookmarks.map(b => ({ label: b.title, description: b.url, id: b.id })),
    { placeHolder: 'Select bookmark to remove' },
  );
  if (!bmPick) return;
  dataService.removeBookmark(bmPick.id);
  provider.refresh();
}

async function cmdOpenPage(extensionUri: vscode.Uri, pageStore: PageReader | null): Promise<void> {
  if (!pageStore) {
    vscode.window.showErrorMessage('Desk: No page store available.');
    return;
  }
  const pages = pageStore.list();
  if (pages.length === 0) {
    vscode.window.showErrorMessage('No pages yet. Run "Desk: New Page" to create one.');
    return;
  }
  const pick = await vscode.window.showQuickPick(
    pages.map(p => ({ label: p.title, description: p.filename, filename: p.filename })),
    { placeHolder: 'Select a page to open' },
  );
  if (!pick) return;
  PageViewPanel.open(extensionUri, pageStore, pick.filename);
}

async function cmdNewPage(pageStore: PageReader | null): Promise<void> {
  if (!pageStore) {
    vscode.window.showErrorMessage('Desk: No page store available.');
    return;
  }
  const title = await vscode.window.showInputBox({ prompt: 'Page title', ignoreFocusOut: true });
  if (!title) return;

  const rawFilename = await vscode.window.showInputBox({
    prompt: 'File name (leave blank to derive from title)',
    ignoreFocusOut: true,
  });
  const filename = normalizeFilename(rawFilename?.trim() || title) + '.desk';

  if (pageStore.list().some(p => p.filename === filename)) {
    vscode.window.showWarningMessage(`A page named "${filename}" already exists.`);
    return;
  }

  pageStore.write(filename, title, `<p>Start writing your <strong>${escHtml(title)}</strong> page here.</p>`);
  vscode.window.showInformationMessage(`Desk: created ${filename} in pages/`);
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
    const lines = [
      '## Communication',
      ...(pending.communication ?? []).map(c => `- **${c.label}**: ${c.channel}`),
      '',
      '## General',
      ...(pending.general ?? []).map(s => `- **${s.label}**: ${s.value}`),
    ].join('\n');
    pageReader.write(
      '_pending-workflow-config.desk',
      'Pending Workflow Config',
      `<pre>${escHtml(lines)}</pre>`,
    );
    PageViewPanel.open(extensionUri, pageReader, '_pending-workflow-config.desk');
    const confirm = await vscode.window.showInformationMessage('Save workflow config?', 'Save');
    if (confirm !== 'Save') { svc.clearPending(); return; }
  } else if (action === 'Review first') {
    // No workspace open — skip the page review, proceed directly to save
  } else if (action !== 'Save') {
    svc.clearPending();
    return;
  }

  svc.confirmPending();
  vscode.window.showInformationMessage('Desk: workflow config saved.');
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
  vscode.window.showInformationMessage(`Desk: skill '${pending.name}' installed.`);
}

async function cmdConfigureWorkflow(svc: WorkflowConfigService): Promise<void> {
  const existing = svc.get() ?? { communication: [], general: [] };

  const section = await vscode.window.showQuickPick(
    ['Communication channels', 'General settings'],
    { placeHolder: 'Which section to edit?' },
  );
  if (!section) return;

  if (section === 'Communication channels') {
    const label = await vscode.window.showInputBox({ prompt: 'Channel label (e.g. General, Deploys)', ignoreFocusOut: true });
    if (!label) return;
    const channel = await vscode.window.showInputBox({ prompt: 'Channel (e.g. #general)', ignoreFocusOut: true });
    if (!channel) return;
    const updated = existing.communication.filter(c => c.label.toLowerCase() !== label.toLowerCase());
    svc.save({ ...existing, communication: [...updated, { label, channel }] });
  } else {
    const label = await vscode.window.showInputBox({ prompt: 'Setting label (e.g. Language, GitHub org)', ignoreFocusOut: true });
    if (!label) return;
    const value = await vscode.window.showInputBox({ prompt: 'Value', ignoreFocusOut: true });
    if (!value) return;
    const updated = existing.general.filter(s => s.label.toLowerCase() !== label.toLowerCase());
    svc.save({ ...existing, general: [...updated, { label, value }] });
  }

  vscode.window.showInformationMessage('Desk: workflow config saved.');
}

async function cmdOpenUrl(): Promise<void> {
  const url = await vscode.window.showInputBox({ prompt: 'URL to open', ignoreFocusOut: true });
  if (!url?.trim()) return;
  const openUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
  vscode.commands.executeCommand('simpleBrowser.show', openUrl);
}

async function cmdUpdateBookmark(
  dataService: DataService,
  faviconService: FaviconService,
  provider: SidebarViewProvider,
): Promise<void> {
  const data = dataService.get();
  if (data.bookmarks.length === 0) { vscode.window.showErrorMessage('No bookmarks yet.'); return; }
  const pick = await vscode.window.showQuickPick(
    data.bookmarks.map(b => ({ label: b.title, description: b.url, id: b.id, b })),
    { placeHolder: 'Select bookmark to edit' },
  );
  if (!pick) return;
  const title = await vscode.window.showInputBox({ prompt: 'New title', value: pick.b.title, ignoreFocusOut: true });
  if (title === undefined) return;
  const url = await vscode.window.showInputBox({ prompt: 'New URL', value: pick.b.url, ignoreFocusOut: true });
  if (url === undefined) return;
  const icon = await faviconService.getIcon(url || pick.b.url);
  dataService.updateBookmark(pick.id, { title: title || pick.b.title, url: url || pick.b.url, icon });
  provider.refresh();
}

async function cmdDeletePage(pageStore: PageReader | null, provider: SidebarViewProvider): Promise<void> {
  if (!pageStore) { vscode.window.showErrorMessage('Desk: No page store available.'); return; }
  const pages = pageStore.list();
  if (pages.length === 0) { vscode.window.showErrorMessage('No pages yet.'); return; }
  const pick = await vscode.window.showQuickPick(
    pages.map(p => ({ label: p.title, description: p.filename, filename: p.filename })),
    { placeHolder: 'Select page to delete' },
  );
  if (!pick) return;
  const confirm = await vscode.window.showWarningMessage(`Delete "${pick.label}"?`, { modal: true }, 'Delete');
  if (confirm !== 'Delete') return;
  pageStore.delete(pick.filename);
  provider.refresh();
}

async function cmdRemoveSkill(
  skillRegistry: SkillRegistry,
  adapters: AgentAdapter[],
  provider: SidebarViewProvider,
): Promise<void> {
  const skills = skillRegistry.list();
  if (skills.length === 0) { vscode.window.showErrorMessage('No skills installed.'); return; }
  const pick = await vscode.window.showQuickPick(
    skills.map(s => ({ label: s.name, description: s.description })),
    { placeHolder: 'Select skill to remove' },
  );
  if (!pick) return;
  const confirm = await vscode.window.showWarningMessage(`Remove skill "${pick.label}"?`, { modal: true }, 'Remove');
  if (confirm !== 'Remove') return;
  await skillRegistry.remove(pick.label, adapters);
  provider.refresh();
}

async function cmdNewSkill(): Promise<void> {
  const template = [
    '---',
    'name: my-skill',
    'description: >-',
    '  One-line description used by agents to decide when to invoke.',
    'triggers:',
    '  - starting a new task',
    'agents: all',
    'version: 1',
    '---',
    '',
    'Write your skill instructions here. Plain markdown.',
    'Call `get_workflow_config` to read team-specific values.',
    '',
  ].join('\n');
  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: template });
  await vscode.window.showTextDocument(doc);
  vscode.window.showInformationMessage('Desk: edit the skill, then run "Desk: Submit Skill" to install it.');
}

async function cmdEditSkill(skillRegistry: SkillRegistry): Promise<void> {
  const skills = skillRegistry.getAll();
  if (skills.length === 0) { vscode.window.showErrorMessage('No skills installed.'); return; }
  const pick = await vscode.window.showQuickPick(
    skills.map(s => ({ label: s.name, description: s.description, content: s.content })),
    { placeHolder: 'Select skill to edit' },
  );
  if (!pick) return;
  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: (pick as { content: string }).content });
  await vscode.window.showTextDocument(doc);
  vscode.window.showInformationMessage('Desk: edit the skill, then run "Desk: Submit Skill" to update it.');
}

async function cmdSubmitSkill(
  skillRegistry: SkillRegistry,
  adapters: AgentAdapter[],
  provider: SidebarViewProvider,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showErrorMessage('Desk: no active editor — open a skill file first.'); return; }
  const content = editor.document.getText();
  const validation = skillRegistry.validateFrontmatter(content);
  if (!validation.valid) { vscode.window.showErrorMessage(`Desk: invalid skill — ${validation.error}`); return; }
  const nameMatch = content.match(/^name:\s*(.+)/m);
  const name = nameMatch?.[1]?.trim() ?? 'unnamed';
  const exists = skillRegistry.getAll().some(s => s.name === name);
  if (exists) {
    const choice = await vscode.window.showWarningMessage(
      `Skill "${name}" already exists. This will overwrite it.`, 'Update', 'Cancel',
    );
    if (choice !== 'Update') return;
  }
  skillRegistry.setPending(name, content);
  await showSkillConfirmPrompt(skillRegistry, adapters);
  provider.refresh();
}

async function cmdListBookmarks(dataService: DataService): Promise<void> {
  const data = dataService.get();
  const items = data.bookmarks.map(b => ({ label: b.title, description: b.url, url: b.url }));
  if (!items.length) { vscode.window.showInformationMessage('No bookmarks yet.'); return; }
  const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Select a bookmark to open' });
  if (pick) vscode.commands.executeCommand('simpleBrowser.show', pick.url);
}

async function cmdListSkills(skillRegistry: SkillRegistry): Promise<void> {
  const skills = skillRegistry.list();
  if (!skills.length) { vscode.window.showInformationMessage('No skills installed.'); return; }
  const items = skills.map(s => ({ label: s.name, description: s.description }));
  const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Select a skill to view' });
  if (pick) {
    const skill = skillRegistry.get(pick.label);
    if (skill) {
      const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: skill.content });
      vscode.window.showTextDocument(doc);
    }
  }
}

async function cmdViewWorkflow(workflowConfigService: WorkflowConfigService): Promise<void> {
  const config = workflowConfigService.get();
  if (!config) { vscode.window.showInformationMessage('No workflow config saved yet.'); return; }
  const lines: string[] = ['# Workflow Config', ''];
  if (config.communication.length) {
    lines.push('## Communication', '');
    config.communication.forEach(e => lines.push(`- **${e.label}**: ${e.channel}`));
    lines.push('');
  }
  if (config.general.length) {
    lines.push('## General', '');
    config.general.forEach(e => lines.push(`- **${e.label}**: ${e.value}`));
  }
  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: lines.join('\n') });
  vscode.window.showTextDocument(doc);
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
