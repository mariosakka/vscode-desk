import * as http from 'http';
import { DataService } from '../../services/dataService/dataService';
import { FaviconService } from '../../services/faviconService/faviconService';
import { PortalViewProvider } from '../../portalViewProvider';
import { PageReader } from '../../pages/pageReader';
import { WorkflowConfigService } from '../../services/workflowConfigService/workflowConfigService';
import { SkillRegistry } from '../../services/skillRegistry/skillRegistry';
import { AgentAdapter } from '../../agents/agentAdapter';
import { TOOLS } from '../toolSchemas';
import { RESOURCES, RESOURCE_CONTENT } from '../resources';

export class McpServer {
  private server: http.Server | null = null;

  constructor(
    private readonly dataService: DataService,
    private readonly provider: PortalViewProvider,
    private readonly faviconService: FaviconService,
    private readonly pageReader: PageReader | null,
    private readonly workflowConfigService: WorkflowConfigService | null = null,
    private readonly skillRegistry: SkillRegistry | null = null,
    private readonly adapters: AgentAdapter[] = [],
    private readonly onConfigSubmitted: (() => void) | null = null,
    private readonly onSkillSubmitted: (() => void) | null = null,
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
        serverInfo: { name: 'vscode-relay', version: '0.0.1' },
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
      case 'list_tabs': {
        const data = this.dataService.get();
        const tabs = data.tabs.map(t => ({ id: t.id, name: t.name, bookmarkCount: t.bookmarks.length }));
        return { content: [{ type: 'text', text: JSON.stringify(tabs) }] };
      }
      case 'list_bookmarks': {
        const data = this.dataService.get();
        if (args.tab_id) {
          const tab = data.tabs.find(t => t.id === args.tab_id);
          if (!tab) throw new Error(`Tab not found: ${args.tab_id}`);
          return { content: [{ type: 'text', text: JSON.stringify(tab.bookmarks) }] };
        }
        const all = data.tabs.flatMap(t => t.bookmarks.map(b => ({ ...b, tab_id: t.id })));
        return { content: [{ type: 'text', text: JSON.stringify(all) }] };
      }
      case 'add_bookmark': {
        const icon = args.icon ?? await this.faviconService.getIcon(args.url);
        const bm = this.dataService.addBookmark(args.tab_id, {
          title: args.title,
          url: args.url,
          icon,
          description: args.description ?? '',
        });
        this.provider.refresh();
        return { content: [{ type: 'text', text: JSON.stringify(bm) }] };
      }
      case 'remove_bookmark': {
        this.dataService.removeBookmark(args.tab_id, args.bookmark_id);
        this.provider.refresh();
        return { content: [{ type: 'text', text: 'removed' }] };
      }
      case 'create_tab': {
        const tab = this.dataService.createTab(args.name);
        this.provider.refresh();
        return { content: [{ type: 'text', text: JSON.stringify(tab) }] };
      }
      case 'remove_tab': {
        this.dataService.removeTab(args.tab_id);
        this.provider.refresh();
        return { content: [{ type: 'text', text: 'removed' }] };
      }
      case 'update_bookmark': {
        const bm = this.dataService.updateBookmark(args.tab_id, args.bookmark_id, args.fields ?? {});
        this.provider.refresh();
        return { content: [{ type: 'text', text: JSON.stringify(bm) }] };
      }

      // ── Page tools ────────────────────────────────────────────────────────
      case 'list_pages': {
        if (!this.pageReader) throw new Error('No workspace open — pages unavailable');
        const pages = this.pageReader.list();
        return { content: [{ type: 'text', text: JSON.stringify(pages) }] };
      }
      case 'create_page': {
        if (!this.pageReader) throw new Error('No workspace open — pages unavailable');
        this.pageReader.write(args.filename, args.title, args.content, args.customStyles ?? '');
        return { content: [{ type: 'text', text: `created ${args.filename}` }] };
      }
      case 'update_page': {
        if (!this.pageReader) throw new Error('No workspace open — pages unavailable');
        const existing = this.pageReader.read(args.filename);
        this.pageReader.write(
          args.filename,
          args.title ?? existing.title,
          args.content ?? existing.bodyHtml,
          args.customStyles ?? existing.customStyles,
        );
        return { content: [{ type: 'text', text: `updated ${args.filename}` }] };
      }
      case 'delete_page': {
        if (!this.pageReader) throw new Error('No workspace open — pages unavailable');
        this.pageReader.delete(args.filename);
        return { content: [{ type: 'text', text: `deleted ${args.filename}` }] };
      }

      // ── Workflow tools ────────────────────────────────────────────────────
      case 'get_workflow_config': {
        const config = this.workflowConfigService?.get();
        if (!config) throw new Error('Workflow config not configured');
        return { content: [{ type: 'text', text: JSON.stringify(config) }] };
      }

      case 'submit_workflow_config': {
        if (!this.workflowConfigService) throw new Error('WorkflowConfigService not available');
        this.workflowConfigService.setPending(args.config);
        this.onConfigSubmitted?.();
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'submitted' }) }] };
      }

      case 'list_skills': {
        if (!this.skillRegistry) throw new Error('SkillRegistry not available');
        return { content: [{ type: 'text', text: JSON.stringify(this.skillRegistry.list()) }] };
      }

      case 'add_skill': {
        if (!this.skillRegistry) throw new Error('SkillRegistry not available');
        const validation = this.skillRegistry.validateFrontmatter(args.content);
        if (!validation.valid) throw new Error(validation.error);
        this.skillRegistry.setPending(args.name, args.content, args.description);
        this.onSkillSubmitted?.();
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'submitted' }) }] };
      }

      case 'remove_skill': {
        if (!this.skillRegistry) throw new Error('SkillRegistry not available');
        await this.skillRegistry.remove(args.name, this.adapters);
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
