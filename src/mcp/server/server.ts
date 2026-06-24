import * as http from 'http';
import { DataService } from '../../services/dataService/dataService';
import { FaviconService } from '../../services/faviconService/faviconService';
import { PortalViewProvider } from '../../portalViewProvider';
import { PageReader } from '../../pages/pageReader';
import { GlobalPageStore } from '../../pages/globalPageStore';
import { WorkflowConfigService } from '../../services/workflowConfigService/workflowConfigService';
import { SkillRegistry } from '../../services/skillRegistry/skillRegistry';
import { AgentAdapter } from '../../agents/agentAdapter';
import { TOOLS } from '../toolSchemas';
import { RESOURCES, RESOURCE_CONTENT } from '../resources';

export class McpServer {
  private server: http.Server | null = null;

  constructor(
    private readonly globalDataService: DataService,
    private readonly globalPageStore: GlobalPageStore | null,
    private readonly globalWorkflowService: WorkflowConfigService | null,
    private readonly globalSkillRegistry: SkillRegistry | null,
    private readonly workspaceDataService: DataService | null,
    private readonly workspacePageReader: PageReader | null,
    private readonly workspaceWorkflowService: WorkflowConfigService | null,
    private readonly workspaceSkillRegistry: SkillRegistry | null,
    private readonly provider: PortalViewProvider,
    private readonly faviconService: FaviconService,
    private readonly adapters: AgentAdapter[] = [],
    private readonly onConfigSubmitted: ((scope: string) => void) | null = null,
    private readonly onSkillSubmitted: ((scope: string) => void) | null = null,
  ) {}

  start(port: number): void {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
    });
    this.server.listen(port, '127.0.0.1');
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }

  private _resolveScope(args: Record<string, unknown>): {
    dataService: DataService;
    pageReader: PageReader | GlobalPageStore | null;
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
        serverInfo: { name: 'vscode-astrolabe', version: '0.0.1' },
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
      const content = RESOURCE_CONTENT[params.uri];
      if (!content) throw new Error(`Unknown resource: ${params.uri}`);
      return { contents: [{ uri: params.uri, mimeType: 'text/markdown', text: content }] };
    }
    throw new Error(`Unknown method: ${method}`);
  }

  private async callTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'list_projects': {
        const { dataService } = this._resolveScope(args);
        const data = dataService.get();
        const projects = data.projects.map(p => ({ id: p.id, name: p.name, bookmarkCount: p.bookmarks.length }));
        return { content: [{ type: 'text', text: JSON.stringify(projects) }] };
      }
      case 'list_bookmarks': {
        const { dataService } = this._resolveScope(args);
        const data = dataService.get();
        if (args.project_id) {
          const project = data.projects.find(p => p.id === args.project_id);
          if (!project) throw new Error(`Project not found: ${args.project_id}`);
          return { content: [{ type: 'text', text: JSON.stringify(project.bookmarks) }] };
        }
        const all = data.projects.flatMap(p => p.bookmarks.map(b => ({ ...b, project_id: p.id })));
        return { content: [{ type: 'text', text: JSON.stringify(all) }] };
      }
      case 'add_bookmark': {
        const { dataService } = this._resolveScope(args);
        const icon = args.icon ?? await this.faviconService.getIcon(args.url);
        const bm = dataService.addBookmark(args.project_id, {
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
        dataService.removeBookmark(args.project_id, args.bookmark_id);
        this.provider.refresh();
        return { content: [{ type: 'text', text: 'removed' }] };
      }
      case 'create_project': {
        const { dataService } = this._resolveScope(args);
        const project = dataService.createProject(args.name);
        this.provider.refresh();
        return { content: [{ type: 'text', text: JSON.stringify(project) }] };
      }
      case 'remove_project': {
        const { dataService } = this._resolveScope(args);
        dataService.removeProject(args.project_id);
        this.provider.refresh();
        return { content: [{ type: 'text', text: 'removed' }] };
      }
      case 'update_bookmark': {
        const { dataService } = this._resolveScope(args);
        const bm = dataService.updateBookmark(args.project_id, args.bookmark_id, args.fields ?? {});
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
        pageReader.write(args.filename, args.title, args.content, args.customStyles ?? '');
        return { content: [{ type: 'text', text: `created ${args.filename}` }] };
      }
      case 'update_page': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        const existing = pageReader.read(args.filename);
        pageReader.write(
          args.filename,
          args.title ?? existing.title,
          args.content ?? existing.bodyHtml,
          args.customStyles ?? existing.customStyles,
        );
        return { content: [{ type: 'text', text: `updated ${args.filename}` }] };
      }
      case 'delete_page': {
        const { pageReader } = this._resolveScope(args);
        if (!pageReader) throw new Error('No workspace open — pages unavailable');
        pageReader.delete(args.filename);
        return { content: [{ type: 'text', text: `deleted ${args.filename}` }] };
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
