import * as http from 'http';
import * as path from 'path';
import { execSync } from 'child_process';
import { FaviconService } from '../../services/faviconService/faviconService';
import { SidebarViewProvider } from '../../sidebarViewProvider';
import { extractStyleFromTemplate, extractScriptFromTemplate, assembleSections, PageSection, parseSections, getSectionHtml, replaceSectionHtml, removeSection as removeSectionHtml, insertSection, parseListItems, rebuildList } from '../../pages/pageFormat';
import { SkillTool, SkillRegistry } from '../../services/skillRegistry/skillRegistry';
import { AgentAdapter } from '../../agents/agentAdapter';
import { LibraryService } from '../../services/libraryService/libraryService';
import { renderSectionType, BUILT_IN_TYPES } from '../../pages/sectionTypes';
import { SectionTypeService } from '../../services/sectionTypeService/sectionTypeService';
import { BookService } from '../../services/bookService/bookService';
import { PageReader } from '../../pages/pageReader';
import { TOOLS } from '../toolSchemas';
import { RESOURCES, RESOURCE_CONTENT } from '../resources';
import { ServiceBundle, resolveScope } from '../../models';

function textResult(x: unknown): { content: { type: string; text: string }[] } {
  return { content: [{ type: 'text', text: typeof x === 'string' ? x : JSON.stringify(x) }] };
}

export class McpServer {
  private server: http.Server | null = null;

  constructor(
    private readonly global: ServiceBundle,
    private readonly workspace: ServiceBundle | null,
    private readonly provider: SidebarViewProvider,
    private readonly faviconService: FaviconService,
    private readonly adapters: AgentAdapter[] = [],
    private readonly onConfigSubmitted: ((scope: string) => void) | null = null,
    private readonly onSkillSubmitted: ((scope: string) => void) | null = null,
    private readonly workspaceName: string | null = null,
    private readonly workspacePath: string | null = null,
    private readonly libraryService: LibraryService | null = null,
    private readonly sectionTypeService: SectionTypeService | null = null,
    private readonly bookService: BookService | null = null,
  ) {}

  private _requireBook(): BookService {
    if (!this.bookService) throw new Error('No workspace open — books unavailable');
    return this.bookService;
  }

  private _requirePageReader(args: Record<string, unknown>): PageReader {
    const { pageReader } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
    if (!pageReader) throw new Error('No workspace open — pages unavailable');
    return pageReader;
  }

  private _requireSkillRegistry(args: Record<string, unknown>): SkillRegistry {
    const { skillRegistry } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
    if (!skillRegistry) throw new Error('SkillRegistry not available');
    return skillRegistry;
  }

  private _requireLibraryService(): LibraryService {
    if (!this.libraryService) throw new Error('LibraryService not available');
    return this.libraryService;
  }

  private async _withList(
    args: Record<string, unknown>,
    mutate: (type: 'ul' | 'ol' | null, items: string[]) => { type: 'ul' | 'ol'; items: string[] },
    successText: string,
  ): Promise<{ content: { type: string; text: string }[] }> {
    const pageReader = this._requirePageReader(args);
    const page = pageReader.read(args.filename as string);
    const sectionHtml = getSectionHtml(page.bodyHtml, args.section_id as string);
    const { type, items } = parseListItems(sectionHtml);
    const result = mutate(type, items);
    const newSectionHtml = rebuildList(sectionHtml, result.type, result.items);
    const newBody = replaceSectionHtml(page.bodyHtml, args.section_id as string, newSectionHtml);
    pageReader.write(args.filename as string, page.title, newBody, page.customStyles);
    return textResult(successText);
  }

  private _buildSectionHtml(heading: string, content: string, id?: string, icon?: string): string {
    const sectionId = id ?? `sec-${Date.now()}`;
    const iconHtml = icon ? `<span class="icon">${icon}</span> ` : '';
    return `<div class="section" id="${sectionId}">\n  <h2 class="section-title">${iconHtml}${heading}</h2>\n${content}\n</div>`;
  }

  start(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const srv = http.createServer((req, res) => {
        this.handleRequest(req, res).catch(err => {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        });
      });
      srv.once('error', (err: NodeJS.ErrnoException) => {
        srv.close();
        if (err.code === 'EADDRINUSE') {
          this.start(port + 1).then(resolve, reject);
        } else {
          reject(err);
        }
      });
      srv.once('listening', () => resolve(port));
      srv.listen(port, '127.0.0.1');
      this.server = srv;
    });
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }

  private _workspaceContext(): {
    workspaceName: string | null;
    workspacePath: string | null;
    pagesDir: string | null;
    hasWorkspace: boolean;
  } {
    return {
      workspaceName: this.workspaceName,
      workspacePath: this.workspacePath,
      pagesDir: this.workspacePath ? path.join(this.workspacePath, 'desk-pages') : null,
      hasWorkspace: this.workspacePath !== null,
    };
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const body = await readBody(req);
    let rpcRequest: any;
    try {
      rpcRequest = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }));
      return;
    }

    // JSON-RPC notifications (no id field) — acknowledge without body
    if (!('id' in rpcRequest)) {
      res.writeHead(202);
      res.end();
      return;
    }

    const { method, params, id } = rpcRequest;
    res.setHeader('Content-Type', 'application/json');

    try {
      const result = await this.dispatch(method, params ?? {});
      res.writeHead(200);
      res.end(JSON.stringify({ jsonrpc: '2.0', result, id }));
    } catch (err: any) {
      res.writeHead(200);
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: err.message }, id }));
    }
  }

  private async dispatch(method: string, params: any): Promise<any> {
    if (method === 'initialize') {
      return {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: 'vscode-desk', version: '0.0.1' },
      };
    }
    if (method === 'tools/list') {
      const skillTools = this._getSkillTools().map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: {
          type: 'object',
          required: t.args.filter(a => a.required !== false).map(a => a.name),
          properties: Object.fromEntries(
            t.args.map(a => [a.name, { type: a.type, ...(a.description ? { description: a.description } : {}) }])
          ),
          additionalProperties: false,
        },
      }));
      return { tools: [...TOOLS, ...skillTools] };
    }
    if (method === 'tools/call') {
      return this.callTool(params.name, params.arguments ?? {});
    }
    if (method === 'resources/list') {
      return { resources: RESOURCES };
    }
    if (method === 'resources/read') {
      if (params.uri === 'desk://workspace/current') {
        const info = this._workspaceContext();
        return { contents: [{ uri: params.uri, mimeType: 'application/json', text: JSON.stringify(info, null, 2) }] };
      }
      const content = RESOURCE_CONTENT[params.uri];
      if (!content) throw new Error(`Unknown resource: ${params.uri}`);
      return { contents: [{ uri: params.uri, mimeType: 'text/markdown', text: content }] };
    }
    throw new Error(`Unknown method: ${method}`);
  }

  private async callTool(name: string, args: any): Promise<any> {
    const result = await this._dispatchTool(name, args);
    this.provider.refresh();
    return result;
  }

  private async _dispatchTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'list_bookmarks': {
        const { dataService } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
        const data = dataService.get();
        return textResult(data.bookmarks);
      }
      case 'add_bookmark': {
        const { dataService } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
        const icon = args.icon ?? await this.faviconService.getIcon(args.url);
        const bm = dataService.addBookmark({
          title: args.title,
          url: args.url,
          icon,
          description: args.description ?? '',
        });
        return textResult(bm);
      }
      case 'remove_bookmark': {
        const { dataService } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
        dataService.removeBookmark(args.bookmark_id);
        return textResult('removed');
      }
      case 'update_bookmark': {
        const { dataService } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
        const bm = dataService.updateBookmark(args.bookmark_id, args.fields ?? {});
        return textResult(bm);
      }

      // ── Page tools ────────────────────────────────────────────────────────
      case 'list_pages': {
        const pageReader = this._requirePageReader(args);
        const pages = pageReader.list();
        return textResult(pages);
      }
      case 'create_page': {
        if (!String(args.filename ?? '').includes('/')) {
          throw new Error('create_page: filename must be in "bookSlug/page.desk" format — standalone pages are not supported');
        }
        const pageReader = this._requirePageReader(args);
        const templateRaw = this.global.dataService.getPageTemplate() ?? '';
        const customStyles = extractStyleFromTemplate(templateRaw);
        const templateScript = extractScriptFromTemplate(templateRaw);
        let bodyHtml = assembleSections({
          title: args.title,
          eyebrow: args.eyebrow,
          subtitle: args.subtitle,
          sections: (args.sections as PageSection[]) ?? [],
        });
        if (templateScript) bodyHtml += `\n<script>\n${templateScript}\n</script>`;
        pageReader.write(args.filename, args.title, bodyHtml, customStyles);
        if (args.filename.includes('/') && args.chapter !== undefined && this.bookService) {
          const parts = args.filename.split('/');
          this.bookService.addPageToChapter(parts[0], parts[1], args.chapter);
        }
        return textResult(`created ${args.filename} in workspace "${this.workspaceName ?? '(none)'}"`);
      }
      case 'update_page': {
        const pageReader = this._requirePageReader(args);
        const existing = pageReader.read(args.filename);
        const newTitle = args.title ?? existing.title;
        let newBodyHtml: string;
        let newCustomStyles: string;
        if (args.sections !== undefined) {
          const templateRaw = this.global.dataService.getPageTemplate() ?? '';
          const templateScript = extractScriptFromTemplate(templateRaw);
          newCustomStyles = extractStyleFromTemplate(templateRaw);
          newBodyHtml = assembleSections({
            title: newTitle,
            eyebrow: args.eyebrow,
            subtitle: args.subtitle,
            sections: args.sections as PageSection[],
          });
          if (templateScript) newBodyHtml += `\n<script>\n${templateScript}\n</script>`;
        } else {
          newBodyHtml = existing.bodyHtml;
          newCustomStyles = existing.customStyles;
        }
        pageReader.write(args.filename, newTitle, newBodyHtml, newCustomStyles);
        return textResult(`updated ${args.filename} in workspace "${this.workspaceName ?? '(none)'}"`);
      }
      case 'delete_page': {
        const pageReader = this._requirePageReader(args);
        pageReader.delete(args.filename);
        if (args.filename.includes('/') && this.bookService) {
          const parts = args.filename.split('/');
          this.bookService.removePageFromManifest(parts[0], parts[1]);
        }
        return textResult(`deleted ${args.filename} from workspace "${this.workspaceName ?? '(none)'}"`);
      }

      // ── Workflow tools ────────────────────────────────────────────────────
      case 'get_workflow_config': {
        const { workflowService } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
        const config = workflowService?.get();
        if (!config) throw new Error('Workflow config not configured');
        return textResult(config);
      }

      case 'submit_workflow_config': {
        const { workflowService } = resolveScope(args.scope as string | undefined, this.workspace, this.global);
        if (!workflowService) throw new Error('WorkflowConfigService not available');
        const scope = args.scope as string ?? 'workspace';
        workflowService.setPending(args.config);
        this.onConfigSubmitted?.(scope);
        return textResult({ status: 'submitted' });
      }

      case 'list_skills': {
        const skillRegistry = this._requireSkillRegistry(args);
        return textResult(skillRegistry.list());
      }

      case 'get_skill': {
        const skillRegistry = this._requireSkillRegistry(args);
        const skill = skillRegistry.get(args.name);
        if (!skill) return { isError: true, content: [{ type: 'text', text: `Skill '${args.name}' not found` }] };
        return textResult(skill);
      }

      case 'add_skill': {
        const skillRegistry = this._requireSkillRegistry(args);
        const validation = skillRegistry.validateFrontmatter(args.content);
        if (!validation.valid) throw new Error(validation.error);
        const scope = args.scope as string ?? 'workspace';
        skillRegistry.setPending(args.name, args.content, args.description);
        this.onSkillSubmitted?.(scope);
        return textResult({ status: 'submitted' });
      }

      case 'remove_skill': {
        const skillRegistry = this._requireSkillRegistry(args);
        await skillRegistry.remove(args.name, this.adapters);
        return textResult({ removed: args.name });
      }

      case 'get_page_template': {
        const template = this.global.dataService.getPageTemplate();
        if (!template) throw new Error('No page template set');
        return textResult(template);
      }

      case 'set_page_template': {
        this.global.dataService.setPageTemplate(args.content);
        return textResult({ status: 'saved' });
      }

      // ── Library tools ─────────────────────────────────────────────────────
      case 'list_libraries': {
        const libSvc = this._requireLibraryService();
        const libs = libSvc.list().map(l => ({
          ...l,
          installed: libSvc.isInstalled(l.name),
        }));
        return textResult(libs);
      }

      case 'add_library': {
        const libSvc = this._requireLibraryService();
        libSvc.add({ name: args.name, description: args.description, files: args.files });
        return textResult({ status: 'added', name: args.name });
      }

      case 'remove_library': {
        const libSvc = this._requireLibraryService();
        libSvc.remove(args.name);
        return textResult({ removed: args.name });
      }

      // ── Section CRUD ────────────────────────────────────────────────────────
      case 'list_sections': {
        const pageReader = this._requirePageReader(args);
        const page = pageReader.read(args.filename);
        return textResult(parseSections(page.bodyHtml));
      }
      case 'add_section': {
        const pageReader = this._requirePageReader(args);
        const page = pageReader.read(args.filename);
        let content = args.content ?? '';
        if (args.type) {
          const customTypes = this.sectionTypeService?.getCustomTypes() ?? [];
          content = renderSectionType(args.type, args.data ?? {}, customTypes);
        }
        const sectionHtml = this._buildSectionHtml(args.heading, content, args.id, args.icon);
        const newBody = insertSection(page.bodyHtml, sectionHtml);
        pageReader.write(args.filename, page.title, newBody, page.customStyles);
        return textResult('section added');
      }
      case 'update_section': {
        const pageReader = this._requirePageReader(args);
        const page = pageReader.read(args.filename);
        let sectionHtml = getSectionHtml(page.bodyHtml, args.section_id);
        if (args.type) {
          const customTypes = this.sectionTypeService?.getCustomTypes() ?? [];
          const rendered = renderSectionType(args.type, args.data ?? {}, customTypes);
          sectionHtml = sectionHtml.replace(/([\s\S]*?<\/h2>\n?)[\s\S]*(<\/div>)$/, `$1${rendered}\n$2`);
        } else if (args.content !== undefined) {
          sectionHtml = sectionHtml.replace(/([\s\S]*?<\/h2>\n?)[\s\S]*(<\/div>)$/, `$1${args.content}\n$2`);
        }
        if (args.heading !== undefined) {
          sectionHtml = sectionHtml.replace(/(<h2[^>]*>)([\s\S]*?)(<\/h2>)/, `$1${args.heading}$3`);
        }
        const newBody = replaceSectionHtml(page.bodyHtml, args.section_id, sectionHtml);
        pageReader.write(args.filename, page.title, newBody, page.customStyles);
        return textResult('section updated');
      }
      case 'remove_section': {
        const pageReader = this._requirePageReader(args);
        const page = pageReader.read(args.filename);
        const newBody = removeSectionHtml(page.bodyHtml, args.section_id);
        pageReader.write(args.filename, page.title, newBody, page.customStyles);
        return textResult('section removed');
      }

      // ── List CRUD ────────────────────────────────────────────────────────────
      case 'list_items': {
        const pageReader = this._requirePageReader(args);
        const page = pageReader.read(args.filename);
        const sectionHtml = getSectionHtml(page.bodyHtml, args.section_id);
        return textResult(parseListItems(sectionHtml));
      }
      case 'add_list_item':
        return this._withList(args, (type, items) => ({
          type: (type ?? args.list_type ?? 'ul') as 'ul' | 'ol',
          items: [...items, args.text as string],
        }), 'item added');
      case 'remove_list_item':
        return this._withList(args, (type, items) => {
          const idx = (args.index as number) - 1;
          if (idx < 0 || idx >= items.length) throw new Error(`index ${args.index} out of range (list has ${items.length} items)`);
          const newItems = [...items];
          newItems.splice(idx, 1);
          return { type: (type ?? 'ul') as 'ul' | 'ol', items: newItems };
        }, 'item removed');
      case 'update_list_item':
        return this._withList(args, (type, items) => {
          const idx = (args.index as number) - 1;
          if (idx < 0 || idx >= items.length) throw new Error(`index ${args.index} out of range (list has ${items.length} items)`);
          const newItems = [...items];
          newItems[idx] = args.text as string;
          return { type: (type ?? 'ul') as 'ul' | 'ol', items: newItems };
        }, 'item updated');
      case 'set_list_type':
        return this._withList(args, (_type, items) => ({
          type: args.type as 'ul' | 'ol',
          items,
        }), 'list type updated');

      // ── Section type registry ─────────────────────────────────────────────
      case 'list_section_types': {
        if (this.sectionTypeService) {
          return textResult(this.sectionTypeService.listAll());
        }
        return textResult(BUILT_IN_TYPES.map(t => ({ name: t.name, description: t.description, builtin: true })));
      }
      case 'register_section_type': {
        if (!this.sectionTypeService) throw new Error('SectionTypeService not available');
        this.sectionTypeService.register(args.name, args.description, args.template);
        return textResult('type registered');
      }
      case 'remove_section_type': {
        if (!this.sectionTypeService) throw new Error('SectionTypeService not available');
        this.sectionTypeService.remove(args.name);
        return textResult('type removed');
      }

      // ── Book tools ────────────────────────────────────────────────────────
      case 'create_book': {
        const bookSvc = this._requireBook();
        const slug = bookSvc.create(args.title, args.slug);
        return textResult({ slug });
      }
      case 'list_books': {
        const bookSvc = this._requireBook();
        return textResult(bookSvc.list());
      }
      case 'get_book': {
        const bookSvc = this._requireBook();
        return textResult(bookSvc.get(args.slug));
      }
      case 'delete_book': {
        const bookSvc = this._requireBook();
        bookSvc.delete(args.slug);
        return textResult('deleted');
      }
      case 'add_chapter': {
        const bookSvc = this._requireBook();
        bookSvc.addChapter(args.slug, args.title, args.position);
        return textResult('chapter added');
      }
      case 'rename_chapter': {
        const bookSvc = this._requireBook();
        bookSvc.renameChapter(args.slug, args.chapter_index, args.title);
        return textResult('renamed');
      }
      case 'remove_chapter': {
        const bookSvc = this._requireBook();
        bookSvc.removeChapter(args.slug, args.chapter_index);
        return textResult('removed');
      }
      case 'move_page': {
        const bookSvc = this._requireBook();
        bookSvc.movePage(args.slug, args.filename, args.to_chapter, args.position);
        return textResult('moved');
      }

      case 'get_workspace_context': {
        return textResult(JSON.stringify(this._workspaceContext(), null, 2));
      }

      default: {
        const skillTool = this._getSkillTools().find(t => t.name === name);
        if (!skillTool) throw new Error(`Unknown tool: ${name}`);
        return this._callSkillTool(skillTool, args);
      }
    }
  }

  private _getSkillTools(): SkillTool[] {
    const globalTools = this.global.skillRegistry?.getAllTools() ?? [];
    const workspaceTools = this.workspace?.skillRegistry?.getAllTools() ?? [];
    const seen = new Set<string>();
    const merged: SkillTool[] = [];
    for (const t of [...workspaceTools, ...globalTools]) {
      if (!seen.has(t.name)) { seen.add(t.name); merged.push(t); }
    }
    return merged;
  }

  private _callSkillTool(tool: SkillTool, args: Record<string, any>): { content: Array<{ type: string; text: string }> } {
    const timeout = 30000;
    let cmd = tool.command;
    for (const arg of tool.args) {
      const val = args[arg.name];
      if (val !== undefined) {
        const safe = "'" + String(val).replace(/'/g, "'\\''") + "'";
        cmd = cmd.replace(new RegExp(`\\{${arg.name}\\}`, 'g'), safe);
      }
    }
    try {
      const output = execSync(cmd, { timeout, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      return { content: [{ type: 'text', text: output.trim() }] };
    } catch (err: any) {
      const msg = err.stderr ? err.stderr.toString().trim() : String(err.message ?? err);
      throw new Error(`Skill tool "${tool.name}" failed: ${msg}`);
    }
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}
