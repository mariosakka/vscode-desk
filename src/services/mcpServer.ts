import * as http from 'http';
import { DataService } from './dataService';
import { FaviconService } from './faviconService';
import { PortalViewProvider } from '../portalViewProvider';

export class McpServer {
  private server: http.Server | null = null;

  constructor(
    private readonly dataService: DataService,
    private readonly provider: PortalViewProvider,
    private readonly faviconService: FaviconService,
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
        capabilities: { tools: {} },
        serverInfo: { name: 'vscode-portal', version: '0.0.1' },
      };
    }
    if (method === 'tools/list') {
      return { tools: TOOLS };
    }
    if (method === 'tools/call') {
      return this.callTool(params.name, params.arguments ?? {});
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

const TOOLS = [
  {
    name: 'list_tabs',
    description: 'Returns all tabs with their bookmark counts',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_bookmarks',
    description: 'Returns bookmarks; pass tab_id to filter to one tab',
    inputSchema: {
      type: 'object',
      properties: { tab_id: { type: 'string', description: 'Optional tab ID' } },
      additionalProperties: false,
    },
  },
  {
    name: 'add_bookmark',
    description: 'Adds a bookmark to a tab. Icon is auto-fetched from the URL if not provided.',
    inputSchema: {
      type: 'object',
      required: ['tab_id', 'title', 'url'],
      properties: {
        tab_id: { type: 'string' },
        title: { type: 'string' },
        url: { type: 'string' },
        icon: { type: 'string', description: 'Emoji or leave blank to auto-fetch favicon' },
        description: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_bookmark',
    description: 'Removes a bookmark from a tab',
    inputSchema: {
      type: 'object',
      required: ['tab_id', 'bookmark_id'],
      properties: { tab_id: { type: 'string' }, bookmark_id: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'create_tab',
    description: 'Creates a new empty tab',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'remove_tab',
    description: 'Removes a tab and all its bookmarks',
    inputSchema: {
      type: 'object',
      required: ['tab_id'],
      properties: { tab_id: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'update_bookmark',
    description: 'Updates one or more fields on a bookmark',
    inputSchema: {
      type: 'object',
      required: ['tab_id', 'bookmark_id', 'fields'],
      properties: {
        tab_id: { type: 'string' },
        bookmark_id: { type: 'string' },
        fields: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
            icon: { type: 'string' },
            description: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
];
