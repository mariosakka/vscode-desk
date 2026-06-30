import * as http from 'http';
import { DataService } from '../../services/dataService/dataService';
import { FaviconService } from '../../services/faviconService/faviconService';
import { SidebarViewProvider } from '../../sidebarViewProvider';
import { PageReader } from '../../pages/pageReader';
import { extractStyleFromTemplate, extractScriptFromTemplate, assembleSections, PageSection } from '../../pages/pageFormat';
import { WorkflowConfigService } from '../../services/workflowConfigService/workflowConfigService';
import { SkillRegistry } from '../../services/skillRegistry/skillRegistry';
import { AgentAdapter } from '../../agents/agentAdapter';
import { LibraryService } from '../../services/libraryService/libraryService';
import { TOOLS } from '../toolSchemas';
import { RESOURCES, RESOURCE_CONTENT } from '../resources';

export class McpServer {
  private server: http.Server | null = null;

  constructor(
    private readonly globalDataService: DataService,
    private readonly globalPageStore: PageReader | null,
    private readonly globalWorkflowService: WorkflowConfigService | null,
    private readonly globalSkillRegistry: SkillRegistry | null,
    private readonly workspaceDataService: DataService | null,
    private readonly workspacePageReader: PageReader | null,
    private readonly workspaceWorkflowService: WorkflowConfigService | null,
    private readonly workspaceSkillRegistry: SkillRegistry | null,
    private readonly provider: SidebarViewProvider,
    private readonly faviconService: FaviconService,
    private readonly adapters: AgentAdapter[] = [],
    private readonly onConfigSubmitted: ((scope: string) => void) | null = null,
    private readonly onSkillSubmitted: ((scope: string) => void) | null = null,
    private readonly workspaceName: string | null = null,
    private readonly workspacePath: string | null = null,
    private readonly libraryService: LibraryService | null = null,
  ) {}

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

  private _resolveScope(args: Record<string, unknown>): {
    dataService: DataService;
    pageReader: PageReader | null;
    workflowService: WorkflowConfigService | null;
    skillRegistry: SkillRegistry | null;
  } {
    const scope = args.scope as string ?? 'workspace';
    if (scope === 'global' || !this.workspaceDataService) {
      return {
        dataService: this.globalDataService,
        pageReader: this.globalPageStore,
        workflowService: this.globalWorkflowService,
        skillRegistry: this.globalSkillRegistry,
      };
    }
    return {
      dataService: this.workspaceDataService,
      pageReader: this.workspacePageReader,
      workflowService: this.workspaceWorkflowService,
      skillRegistry: this.workspaceSkillRegistry,
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
      return { tools: TOOLS };
    }
    if (method === 'tools/call') {
      return this.callTool(params.name, params.arguments ?? {});
    }
    if (method === 'resources/list') {
      return { resources: RESOURCES };
    }
    if (method === 'resources/read') {
      if (params.uri === 'desk://workspace/current') {
        const info = { workspaceName: this.workspaceName, workspacePath: this.workspacePath };
        return { contents: [{ uri: params.uri, mimeType: 'application/json', text: JSON.stringify(info, null, 2) }] };
      }
      const content = RESOURCE_CONTENT[params.uri];
      if (!content) throw new Error(`Unknown resource: ${params.uri}`);
      return { contents: [{ uri: params.uri, mimeType: 'text/markdown', text: content }] };
    }
    throw new Error(`Unknown method: ${method}`);
  }

  private async callTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'list_bookmarks': {
        const { dataService } = this._resolveScope(args);
        const data = dataService.get();
        return { content: [{ type: 'text', text: JSON.stringify(data.bookmarks) }] };
      }
      case 'add_bookmark': {
        const { dataService } = this._resolveScope(args);
        const icon = args.icon ?? await this.faviconService.getIcon(args.url);
        const bm = dataService.addBookmark({
          title: args.title,
          url: args.url,
          icon,
          description: args.description ?? '',
        });
        this.provider.refresh();
        return { content: [{ type: 'text', text: JSON.stringify(bm) }] };
      }
      case 'remove_bookmark': {
        const { dataService } = this._resolveScope(args);
        dataService.removeBookmark(args.bookmark_id);
        this.provider.refresh();
        return { content: [{ type: 'text', text: 'removed' }] };
      }
      case 'update_bookmark': {
        const { dataService } = this._resolveScope(args);
        const bm = dataService.updateBookmark(args.bookmark_id, args.fields ?? {});
        this.provider.refresh();
        return { content: [{ type: 'text', text: JSON.stringify(bm) }] };
      }

      // ── Page tools ────────────────────────────────────────────────────────
      case 'list_pages': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const pages = pageReader.list();
        return { content: [{ type: 'text', text: JSON.stringify(pages) }] };
      }
      case 'create_page': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const templateRaw = this.globalDataService.getPageTemplate() ?? '';
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
        this.provider.refresh();
        return { content: [{ type: 'text', text: `created ${args.filename} in workspace "${this.workspaceName ?? '(none)'}"` }] };
      }
      case 'update_page': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const existing = pageReader.read(args.filename);
        const newTitle = args.title ?? existing.title;
        let newBodyHtml: string;
        let newCustomStyles: string;
        if (args.sections !== undefined) {
          const templateRaw = this.globalDataService.getPageTemplate() ?? '';
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
        this.provider.refresh();
        return { content: [{ type: 'text', text: `updated ${args.filename} in workspace "${this.workspaceName ?? '(none)'}"` }] };
      }
      case 'delete_page': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        pageReader.delete(args.filename);
        this.provider.refresh();
        return { content: [{ type: 'text', text: `deleted ${args.filename} from workspace "${this.workspaceName ?? '(none)'}"` }] };
      }

      // ── Workflow tools ────────────────────────────────────────────────────
      case 'get_workflow_config': {
        const { workflowService } = this._resolveScope(args);
        const config = workflowService?.get();
        if (!config) throw new Error('Workflow config not configured');
        return { content: [{ type: 'text', text: JSON.stringify(config) }] };
      }

      case 'submit_workflow_config': {
        const { workflowService } = this._resolveScope(args);
        if (!workflowService) throw new Error('WorkflowConfigService not available');
        const scope = args.scope as string ?? 'workspace';
        workflowService.setPending(args.config);
        this.onConfigSubmitted?.(scope);
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'submitted' }) }] };
      }

      case 'list_skills': {
        const { skillRegistry } = this._resolveScope(args);
        if (!skillRegistry) throw new Error('SkillRegistry not available');
        return { content: [{ type: 'text', text: JSON.stringify(skillRegistry.list()) }] };
      }

      case 'get_skill': {
        const { skillRegistry } = this._resolveScope(args);
        if (!skillRegistry) throw new Error('SkillRegistry not available');
        const skill = skillRegistry.get(args.name);
        if (!skill) return { isError: true, content: [{ type: 'text', text: `Skill '${args.name}' not found` }] };
        return { content: [{ type: 'text', text: JSON.stringify(skill) }] };
      }

      case 'add_skill': {
        const { skillRegistry } = this._resolveScope(args);
        if (!skillRegistry) throw new Error('SkillRegistry not available');
        const validation = skillRegistry.validateFrontmatter(args.content);
        if (!validation.valid) throw new Error(validation.error);
        const scope = args.scope as string ?? 'workspace';
        skillRegistry.setPending(args.name, args.content, args.description);
        this.onSkillSubmitted?.(scope);
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'submitted' }) }] };
      }

      case 'remove_skill': {
        const { skillRegistry } = this._resolveScope(args);
        if (!skillRegistry) throw new Error('SkillRegistry not available');
        await skillRegistry.remove(args.name, this.adapters);
        return { content: [{ type: 'text', text: JSON.stringify({ removed: args.name }) }] };
      }

      case 'get_page_template': {
        const template = this.globalDataService.getPageTemplate();
        if (!template) throw new Error('No page template set');
        return { content: [{ type: 'text', text: template }] };
      }

      case 'set_page_template': {
        this.globalDataService.setPageTemplate(args.content);
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'saved' }) }] };
      }

      // ── Library tools ─────────────────────────────────────────────────────
      case 'list_libraries': {
        if (!this.libraryService) throw new Error('LibraryService not available');
        const libs = this.libraryService.list().map(l => ({
          ...l,
          installed: this.libraryService!.isInstalled(l.name),
        }));
        return { content: [{ type: 'text', text: JSON.stringify(libs) }] };
      }

      case 'add_library': {
        if (!this.libraryService) throw new Error('LibraryService not available');
        this.libraryService.add({ name: args.name, description: args.description, files: args.files });
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'added', name: args.name }) }] };
      }

      case 'remove_library': {
        if (!this.libraryService) throw new Error('LibraryService not available');
        this.libraryService.remove(args.name);
        return { content: [{ type: 'text', text: JSON.stringify({ removed: args.name }) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
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
