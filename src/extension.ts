import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
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
import { LibraryService } from './services/libraryService/libraryService';
import { globalDir, workspaceDir } from './storage/deskDir';
import { BookService, BookManifest } from './services/bookService/bookService';
import { resolveWorktree } from './storage/worktreeResolver';
import { escHtml } from './utils';
import { ServiceBundle } from './models';

export function activate(context: vscode.ExtensionContext): void {
  const worktreeLinkingEnabled = vscode.workspace.getConfiguration('desk')
    .get<boolean>('worktreeLinking.enabled', true);

  const faviconService = new FaviconService(context);

  // Resolve ~/.desk/ directories
  const gDir = globalDir();
  const workspaceName = vscode.workspace.name ?? null;
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;

  let effectiveWorkspacePath = workspaceRoot;
  let effectiveWorkspaceName = workspaceName;

  if (worktreeLinkingEnabled && workspaceRoot) {
    const { isLinkedWorktree, mainWorktreePath } = resolveWorktree(workspaceRoot);
    if (isLinkedWorktree && mainWorktreePath) {
      effectiveWorkspacePath = mainWorktreePath;
      effectiveWorkspaceName = path.basename(mainWorktreePath);
    }
  }

  const wDir = effectiveWorkspaceName ? workspaceDir(effectiveWorkspaceName) : null;

  const workspacePagesDir = effectiveWorkspacePath
    ? path.join(effectiveWorkspacePath, 'desk-pages')
    : null;
  const bookService = workspacePagesDir ? new BookService(workspacePagesDir) : null;

  // Global services — always available
  const defaultTemplatePath = path.join(context.extensionPath, 'out', 'resources', 'default-page-template.desk');
  const globalDataService = new DataService(gDir, defaultTemplatePath);
  const libraryService = new LibraryService(gDir);
  PageViewPanel.setup(libraryService, context, bookService ?? undefined);
  libraryService.installAll().catch(() => {});
  const globalPageReader = new PageReader(path.join(gDir, 'pages'));
  const globalWorkflowService = new WorkflowConfigService(gDir);
  const globalSkillRegistry = new SkillRegistry(gDir);

  // Workspace services — only when a folder/workspace is open
  const workspaceDataService = wDir ? new DataService(wDir) : null;
  const workspacePageReader = workspacePagesDir ? new PageReader(workspacePagesDir) : null;
  const workspaceWorkflowService = wDir ? new WorkflowConfigService(wDir) : null;
  const workspaceSkillRegistry = wDir ? new SkillRegistry(wDir) : null;

  const adapters: AgentAdapter[] = [
    new ClaudeCodeAdapter(),
    new CursorAdapter(workspaceRoot),
    new CodexAdapter(workspaceRoot),
    new GeminiAdapter(),
  ];

  const globalBundle: ServiceBundle = {
    dataService: globalDataService,
    pageReader: globalPageReader,
    workflowService: globalWorkflowService,
    skillRegistry: globalSkillRegistry,
  };
  const workspaceBundle: ServiceBundle | null = workspaceDataService ? {
    dataService: workspaceDataService,
    pageReader: workspacePageReader,
    workflowService: workspaceWorkflowService,
    skillRegistry: workspaceSkillRegistry,
  } : null;

  const provider = new SidebarViewProvider(
    context.extensionUri,
    globalBundle,
    workspaceBundle,
    workspaceName,
    faviconService,
    adapters,
    libraryService,
    bookService,
  );

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => provider.refresh(), 150);
  };

  const deskGlobalDir = path.join(os.homedir(), '.desk');

  const watcherPages = workspaceRoot
    ? vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, 'desk-pages/**')
      )
    : null;
  const watcherGlobal = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(deskGlobalDir, '**')
  );

  [watcherPages, watcherGlobal].forEach(w => {
    if (!w) return;
    w.onDidCreate(scheduleRefresh);
    w.onDidChange(scheduleRefresh);
    w.onDidDelete(scheduleRefresh);
    context.subscriptions.push(w);
  });

  const agentRegistry = new AgentRegistry(adapters, context, workspaceSkillRegistry ?? globalSkillRegistry);

  const mcpServer = new McpServer(
    globalBundle,
    workspaceBundle,
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
    workspaceName,
    workspaceRoot,
    libraryService,
    null,
    bookService,
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

    if (workspaceRoot) {
      const slug = (effectiveWorkspaceName ?? path.basename(effectiveWorkspacePath ?? workspaceRoot))
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'default';
      const registryPath = path.join(os.homedir(), '.desk', 'mcp-ports.json');
      const writeRegistry = () => {
        let reg: Record<string, { port: number; slug: string; path: string }> = {};
        try { reg = JSON.parse(fs.readFileSync(registryPath, 'utf-8')); } catch {}
        reg[workspaceRoot] = { port: actualPort, slug, path: workspaceRoot };
        fs.writeFileSync(registryPath, JSON.stringify(reg, null, 2));
      };
      writeRegistry();

      const claudeSettingsPath = path.join(workspaceRoot, '.claude', 'settings.json');
      const writeClaudeSettings = () => {
        try {
          fs.mkdirSync(path.join(workspaceRoot, '.claude'), { recursive: true });
          let s: Record<string, unknown> = {};
          try { s = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')); } catch {}
          (s as any).mcpServers = (s as any).mcpServers ?? {};
          (s as any).mcpServers['vscode-desk'] = { type: 'http', url: `http://127.0.0.1:${actualPort}/mcp` };
          fs.writeFileSync(claudeSettingsPath, JSON.stringify(s, null, 2));
        } catch {}
      };
      writeClaudeSettings();

      context.subscriptions.push({
        dispose: () => {
          try {
            let reg: Record<string, { port: number; slug: string }> = {};
            try { reg = JSON.parse(fs.readFileSync(registryPath, 'utf-8')); } catch {}
            delete reg[workspaceRoot];
            fs.writeFileSync(registryPath, JSON.stringify(reg, null, 2));
          } catch {}
          try {
            const s: Record<string, any> = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8'));
            delete s.mcpServers?.['vscode-desk'];
            if (!Object.keys(s.mcpServers ?? {}).length) delete s.mcpServers;
            if (Object.keys(s).length) {
              fs.writeFileSync(claudeSettingsPath, JSON.stringify(s, null, 2));
            } else {
              fs.unlinkSync(claudeSettingsPath);
            }
          } catch {}
        },
      });
    }
  }).catch(() => {});

  async function pickScopedService<T>(
    workspaceVal: T | null,
    globalVal: T,
  ): Promise<{ value: T; scope: 'workspace' | 'global' } | undefined> {
    if (!workspaceVal) return { value: globalVal, scope: 'global' };
    const scope = await vscode.window.showQuickPick(
      [{ label: 'Workspace', value: 'workspace' as const }, { label: 'Global', value: 'global' as const }],
      { placeHolder: 'Scope' },
    );
    if (!scope) return undefined;
    return { value: scope.value === 'workspace' ? workspaceVal : globalVal, scope: scope.value };
  }

  async function pickBook(): Promise<{ slug: string; label: string } | undefined> {
    if (!bookService) { vscode.window.showErrorMessage('Desk: No workspace open'); return undefined; }
    const books = bookService.list();
    if (books.length === 0) { vscode.window.showInformationMessage('Desk: No books yet'); return undefined; }
    return vscode.window.showQuickPick(
      books.map(b => ({ label: b.title, slug: b.slug })),
      { placeHolder: 'Select book' },
    );
  }

  async function pickChapter(manifest: BookManifest): Promise<{ index: number; label: string } | undefined> {
    if (manifest.chapters.length === 0) {
      vscode.window.showInformationMessage('Desk: This book has no chapters');
      return undefined;
    }
    return vscode.window.showQuickPick(
      manifest.chapters.map((ch, i) => ({ label: ch.title, index: i })),
      { placeHolder: 'Select chapter' },
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('desk.addBookmark', async () => {
      const picked = await pickScopedService(workspaceDataService, globalDataService);
      if (!picked) return;
      await cmdAddBookmark(picked.value, faviconService, provider);
    }),
    vscode.commands.registerCommand('desk.removeBookmark', async () => {
      const picked = await pickScopedService(workspaceDataService, globalDataService);
      if (!picked) return;
      await cmdRemoveBookmark(picked.value, provider);
    }),
    vscode.commands.registerCommand('desk.openPage',              () => cmdOpenPage(context.extensionUri, workspacePageReader ?? globalPageReader)),
    vscode.commands.registerCommand('desk.setupAgents',           () => agentRegistry.showSetupPromptForced(resolvedPort)),
    vscode.commands.registerCommand('desk.configureWorkflow', async () => {
      const picked = await pickScopedService(workspaceWorkflowService, globalWorkflowService);
      if (!picked) return;
      await cmdConfigureWorkflow(picked.value);
    }),
    vscode.commands.registerCommand('desk.installWorkflowSkills', () => agentRegistry.showSkillInstallPromptForced()),
    vscode.commands.registerCommand('desk.openUrl',        () => cmdOpenUrl()),
    vscode.commands.registerCommand('desk.updateBookmark', async () => {
      const picked = await pickScopedService(workspaceDataService, globalDataService);
      if (!picked) return;
      await cmdUpdateBookmark(picked.value, faviconService, provider);
    }),
    vscode.commands.registerCommand('desk.deletePage', async () => {
      const picked = await pickScopedService(workspacePageReader, globalPageReader);
      if (!picked) return;
      await cmdDeletePage(picked.value, provider);
    }),
    vscode.commands.registerCommand('desk.removeSkill', async () => {
      const picked = await pickScopedService(workspaceSkillRegistry, globalSkillRegistry);
      if (!picked) return;
      await cmdRemoveSkill(picked.value, adapters, provider);
    }),
    vscode.commands.registerCommand('desk.newSkill',    () => cmdNewSkill()),
    vscode.commands.registerCommand('desk.editSkill', async () => {
      const picked = await pickScopedService(workspaceSkillRegistry, globalSkillRegistry);
      if (!picked) return;
      await cmdEditSkill(picked.value);
    }),
    vscode.commands.registerCommand('desk.submitSkill', async () => {
      const picked = await pickScopedService(workspaceSkillRegistry, globalSkillRegistry);
      if (!picked) return;
      await cmdSubmitSkill(picked.value, adapters, provider);
    }),
    vscode.commands.registerCommand('desk.listBookmarks', async () => {
      const picked = await pickScopedService(workspaceDataService, globalDataService);
      if (!picked) return;
      await cmdListBookmarks(picked.value);
    }),
    vscode.commands.registerCommand('desk.listSkills', async () => {
      const picked = await pickScopedService(workspaceSkillRegistry, globalSkillRegistry);
      if (!picked) return;
      await cmdListSkills(picked.value);
    }),
    vscode.commands.registerCommand('desk.viewWorkflow', async () => {
      const picked = await pickScopedService(workspaceWorkflowService, globalWorkflowService);
      if (!picked) return;
      await cmdViewWorkflow(picked.value);
    }),

    vscode.commands.registerCommand('desk.newBook', async () => {
      if (!bookService) { vscode.window.showWarningMessage('Desk: Open a workspace to create books.'); return; }
      const title = await vscode.window.showInputBox({ prompt: 'Book title', placeHolder: 'My Book' });
      if (!title?.trim()) return;
      bookService.create(title.trim());
      provider.refresh();
    }),

    vscode.commands.registerCommand('desk.openBook', async () => {
      if (!workspacePageReader) return;
      const pick = await pickBook();
      if (!pick) return;
      const manifest = bookService!.get(pick.slug);
      const firstPage = manifest.chapters[0]?.pages[0];
      if (firstPage) PageViewPanel.open(context.extensionUri, workspacePageReader, `${pick.slug}/${firstPage}`);
      else vscode.window.showInformationMessage('Desk: This book has no pages yet.');
    }),

    vscode.commands.registerCommand('desk.deleteBook', async () => {
      const pick = await pickBook();
      if (!pick) return;
      const confirm = await vscode.window.showWarningMessage(
        `Delete book "${pick.label}" and all its pages?`, { modal: true }, 'Delete',
      );
      if (confirm !== 'Delete') return;
      bookService!.delete(pick.slug);
      provider.refresh();
    }),

    vscode.commands.registerCommand('desk.addChapter', async () => {
      const bookPick = await pickBook();
      if (!bookPick) return;
      const title = await vscode.window.showInputBox({ prompt: 'Chapter title' });
      if (!title?.trim()) return;
      bookService!.addChapter(bookPick.slug, title.trim());
      provider.refresh();
    }),

    vscode.commands.registerCommand('desk.renameChapter', async () => {
      const bookPick = await pickBook();
      if (!bookPick) return;
      const manifest = bookService!.get(bookPick.slug);
      const chPick = await pickChapter(manifest);
      if (!chPick) return;
      const newTitle = await vscode.window.showInputBox({ prompt: 'New chapter title', value: chPick.label });
      if (!newTitle?.trim()) return;
      bookService!.renameChapter(bookPick.slug, chPick.index, newTitle.trim());
      provider.refresh();
    }),

    vscode.commands.registerCommand('desk.removeChapter', async () => {
      const bookPick = await pickBook();
      if (!bookPick) return;
      const manifest = bookService!.get(bookPick.slug);
      const chPick = await pickChapter(manifest);
      if (!chPick) return;
      const confirm = await vscode.window.showWarningMessage(
        `Remove chapter "${chPick.label}" and delete its pages?`, { modal: true }, 'Remove',
      );
      if (confirm !== 'Remove') return;
      bookService!.removeChapter(bookPick.slug, chPick.index);
      provider.refresh();
    }),

    vscode.commands.registerCommand('desk.newBookPage', async () => {
      if (!workspacePageReader) return;
      const bookPick = await pickBook();
      if (!bookPick) return;
      const manifest = bookService!.get(bookPick.slug);
      const chPick = await pickChapter(manifest);
      if (!chPick) return;
      const title = await vscode.window.showInputBox({ prompt: 'Page title' });
      if (!title?.trim()) return;
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
      const filename = `${bookPick.slug}/${slug}.desk`;
      workspacePageReader.write(filename, title.trim(), `<section class="page-intro"><h1>${title.trim()}</h1></section>\n`);
      bookService!.addPageToChapter(bookPick.slug, `${slug}.desk`, chPick.index);
      provider.refresh();
      const uri = vscode.Uri.file(workspacePageReader.filePath(filename));
      await vscode.window.showTextDocument(uri);
    }),

    vscode.commands.registerCommand('desk.moveBookPage', async () => {
      const bookPick = await pickBook();
      if (!bookPick) return;
      const manifest = bookService!.get(bookPick.slug);
      const allPages = manifest.chapters.flatMap((c, ci) =>
        c.pages.map(p => ({ label: p, description: `Chapter: ${c.title}`, filename: p, chapterIndex: ci }))
      );
      if (!allPages.length) { vscode.window.showInformationMessage('Desk: This book has no pages.'); return; }
      const pagePick = await vscode.window.showQuickPick(allPages, { placeHolder: 'Select a page to move' });
      if (!pagePick) return;
      const chPick = await pickChapter(manifest);
      if (!chPick) return;
      bookService!.movePage(bookPick.slug, pagePick.filename, chPick.index);
      provider.refresh();
    }),

    vscode.commands.registerCommand('desk.zoomIn',    () => PageViewPanel.zoomIn()),
    vscode.commands.registerCommand('desk.zoomOut',   () => PageViewPanel.zoomOut()),
    vscode.commands.registerCommand('desk.zoomReset', () => PageViewPanel.zoomReset()),
    vscode.commands.registerCommand('desk.toggleToc', () => PageViewPanel.toggleToc()),
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


function normalizeFilename(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
