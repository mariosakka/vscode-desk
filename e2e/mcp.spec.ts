/**
 * MCP e2e tests: exercise the JSON-RPC protocol via real HTTP requests.
 * Uses Playwright's request fixture (Node.js HTTP) to call the test server,
 * verifying CORS headers, protocol compliance, and multi-step workflows.
 *
 * The test server mirrors McpServer's HTTP behaviour without any VS Code deps.
 */
import { test, expect } from '@playwright/test';
import * as http from 'node:http';

// ── In-process test MCP server ────────────────────────────────────────────────

interface Tab { id: string; name: string; bookmarks: Bookmark[] }
interface Bookmark { id: string; title: string; url: string; icon: string; description: string }
interface Skill { name: string; description: string; agents: string[]; version: number; installedAt: number }

function createTestMcpServer(): http.Server {
  let nextId = 1;
  const tabs: Tab[] = [];
  let workflowConfig: Record<string, unknown> | null = null;
  const skills: Skill[] = [];

  return http.createServer((req, res) => {
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
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }

    let body = '';
    req.on('data', (c: Buffer) => (body += c));
    req.on('end', () => {
      let rpc: any;
      try { rpc = JSON.parse(body); } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }));
        return;
      }

      const { method, params = {}, id } = rpc;
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);

      try {
        const result = dispatch(method, params, tabs, skills, () => `id_${nextId++}`,
          () => workflowConfig, (c) => { workflowConfig = c; });
        res.end(JSON.stringify({ jsonrpc: '2.0', result, id }));
      } catch (err: any) {
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: err.message }, id }));
      }
    });
  });
}

function dispatch(
  method: string, params: any, tabs: Tab[], skills: Skill[], nextId: () => string,
  getConfig: () => Record<string, unknown> | null,
  setConfig: (c: Record<string, unknown>) => void,
): any {
  const text = (v: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(v) }] });

  if (method === 'initialize') {
    return {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: 'vscode-relay', version: '0.0.1' },
    };
  }
  if (method === 'tools/list') {
    return { tools: [
      'list_tabs','list_bookmarks','add_bookmark','remove_bookmark',
      'create_tab','remove_tab','update_bookmark',
      'list_pages','create_page','update_page','delete_page',
      'get_workflow_config','submit_workflow_config',
      'list_skills','add_skill','remove_skill',
    ].map(name => ({ name }))};
  }
  if (method === 'resources/list') {
    return { resources: [
      { uri: 'relay://guide/quick-start',       name: 'Relay Agent Quick-Start',     mimeType: 'text/markdown' },
      { uri: 'relay://guide/relay-page-format',  name: 'Relay Page Format (.relay)',  mimeType: 'text/markdown' },
      { uri: 'relay://guide/skill-format',       name: 'Relay Skill Format',          mimeType: 'text/markdown' },
    ]};
  }
  if (method === 'resources/read') {
    const content: Record<string, string> = {
      'relay://guide/quick-start': '# Relay Agent Quick-Start\nlist_tabs to get started.',
      'relay://guide/relay-page-format': '# Relay Page Format (.relay)\n<relay-page title="...">...',
      'relay://guide/skill-format': '# Relay Skill Format\nname and description required.',
    };
    if (!content[params.uri]) throw new Error(`Unknown resource: ${params.uri}`);
    return { contents: [{ uri: params.uri, mimeType: 'text/markdown', text: content[params.uri] }] };
  }
  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params;
    switch (name) {
      case 'list_tabs':
        return text(tabs.map(t => ({ id: t.id, name: t.name, bookmarkCount: t.bookmarks.length })));
      case 'create_tab': {
        const tab: Tab = { id: nextId(), name: args.name, bookmarks: [] };
        tabs.push(tab);
        return text(tab);
      }
      case 'remove_tab': {
        const i = tabs.findIndex(t => t.id === args.tab_id);
        if (i === -1) throw new Error(`Tab not found: ${args.tab_id}`);
        tabs.splice(i, 1);
        return text('removed');
      }
      case 'list_bookmarks': {
        if (args.tab_id) {
          const tab = tabs.find(t => t.id === args.tab_id);
          if (!tab) throw new Error(`Tab not found: ${args.tab_id}`);
          return text(tab.bookmarks);
        }
        return text(tabs.flatMap(t => t.bookmarks.map(b => ({ ...b, tab_id: t.id }))));
      }
      case 'add_bookmark': {
        const tab = tabs.find(t => t.id === args.tab_id);
        if (!tab) throw new Error(`Tab not found: ${args.tab_id}`);
        const bm: Bookmark = {
          id: nextId(), title: args.title, url: args.url,
          icon: args.icon ?? '🌐', description: args.description ?? '',
        };
        tab.bookmarks.push(bm);
        return text(bm);
      }
      case 'update_bookmark': {
        const tab = tabs.find(t => t.id === args.tab_id);
        if (!tab) throw new Error(`Tab not found: ${args.tab_id}`);
        const bm = tab.bookmarks.find(b => b.id === args.bookmark_id);
        if (!bm) throw new Error(`Bookmark not found: ${args.bookmark_id}`);
        Object.assign(bm, args.fields ?? {});
        return text(bm);
      }

      // ── Workflow tools ──────────────────────────────────────────────────────
      case 'get_workflow_config': {
        const cfg = getConfig();
        if (!cfg) throw new Error('Workflow config not configured');
        return text(cfg);
      }
      case 'submit_workflow_config': {
        const existing = getConfig() ?? {};
        setConfig({ ...existing, ...args.config });
        return text({ status: 'submitted' });
      }
      case 'list_skills':
        return text(skills.map(({ name: n, description, agents, version, installedAt }) =>
          ({ name: n, description, agents, version, installedAt })));
      case 'add_skill': {
        if (!args.content?.includes('name:') || !args.content?.includes('description:')) {
          throw new Error('Missing required frontmatter: name and description');
        }
        const existing = skills.find(s => s.name === args.name);
        if (existing) {
          existing.version += 1;
          existing.content = args.content;
        } else {
          skills.push({ name: args.name, description: args.description ?? '', agents: ['all'], version: 1, installedAt: Date.now() });
        }
        return text({ status: 'submitted' });
      }
      case 'remove_skill': {
        const i = skills.findIndex(s => s.name === args.name);
        if (i === -1) throw new Error(`Skill not found: ${args.name}`);
        skills.splice(i, 1);
        return text({ removed: args.name });
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
  throw new Error(`Unknown method: ${method}`);
}

// ── Fixture ──────────────────────────────────────────────────────────────────

const PORT = 13341;

async function rpc(request: any, method: string, params: object = {}): Promise<any> {
  const response = await request.post(`http://127.0.0.1:${PORT}/mcp`, {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  return response.json();
}

let server: http.Server;

test.beforeAll(async () => {
  server = createTestMcpServer();
  await new Promise<void>(resolve => server.listen(PORT, '127.0.0.1', resolve));
});

test.afterAll(() => server.close());

// ── Tests ─────────────────────────────────────────────────────────────────────

test('OPTIONS returns 204 with CORS headers', async ({ request }) => {
  const response = await request.fetch(`http://127.0.0.1:${PORT}/mcp`, {
    method: 'OPTIONS',
    headers: { 'Content-Type': 'application/json' },
  });
  expect(response.status()).toBe(204);
  expect(response.headers()['access-control-allow-origin']).toBe('*');
  expect(response.headers()['access-control-allow-methods']).toContain('POST');
});

test('initialize returns capabilities with tools and resources', async ({ request }) => {
  const res = await rpc(request, 'initialize');
  expect(res.result.protocolVersion).toBe('2024-11-05');
  expect(res.result.capabilities).toEqual({ tools: {}, resources: {} });
  expect(res.result.serverInfo.name).toBe('vscode-relay');
});

test('tools/list returns 16 tools', async ({ request }) => {
  const res = await rpc(request, 'tools/list');
  expect(res.result.tools).toHaveLength(16);
  const names = res.result.tools.map((t: any) => t.name);
  expect(names).toContain('list_tabs');
  expect(names).toContain('add_bookmark');
  expect(names).toContain('create_page');
  expect(names).toContain('get_workflow_config');
  expect(names).toContain('add_skill');
});

test('resources/list returns 3 resources including skill-format', async ({ request }) => {
  const res = await rpc(request, 'resources/list');
  expect(res.result.resources).toHaveLength(3);
  const uris = res.result.resources.map((r: any) => r.uri);
  expect(uris).toContain('relay://guide/quick-start');
  expect(uris).toContain('relay://guide/relay-page-format');
  expect(uris).toContain('relay://guide/skill-format');
});

test('resources/read returns markdown', async ({ request }) => {
  const res = await rpc(request, 'resources/read', { uri: 'relay://guide/quick-start' });
  expect(res.result.contents[0].mimeType).toBe('text/markdown');
  expect(res.result.contents[0].text).toContain('list_tabs');
});

test('create_tab → add_bookmark → list_bookmarks round-trip', async ({ request }) => {
  const tabRes = await rpc(request, 'tools/call', { name: 'create_tab', arguments: { name: 'E2E Tab' } });
  const tab = JSON.parse(tabRes.result.content[0].text);
  expect(tab.name).toBe('E2E Tab');

  const bmRes = await rpc(request, 'tools/call', {
    name: 'add_bookmark',
    arguments: { tab_id: tab.id, title: 'GitHub', url: 'https://github.com' },
  });
  const bm = JSON.parse(bmRes.result.content[0].text);
  expect(bm.title).toBe('GitHub');
  expect(bm.icon).toBe('🌐');

  const listRes = await rpc(request, 'tools/call', { name: 'list_bookmarks', arguments: { tab_id: tab.id } });
  const bookmarks = JSON.parse(listRes.result.content[0].text);
  expect(bookmarks).toHaveLength(1);
  expect(bookmarks[0].url).toBe('https://github.com');
});

test('resources/read returns skill-format markdown', async ({ request }) => {
  const res = await rpc(request, 'resources/read', { uri: 'relay://guide/skill-format' });
  expect(res.result.contents[0].mimeType).toBe('text/markdown');
  expect(res.result.contents[0].text).toContain('name');
});

test('get_workflow_config returns error when not configured', async ({ request }) => {
  const res = await rpc(request, 'tools/call', { name: 'get_workflow_config', arguments: {} });
  expect(res.error).toBeDefined();
  expect(res.error.message).toContain('not configured');
});

test('submit_workflow_config → get_workflow_config round-trip', async ({ request }) => {
  const submitRes = await rpc(request, 'tools/call', {
    name: 'submit_workflow_config',
    arguments: { config: { language: 'en', githubOrg: 'acme' } },
  });
  expect(JSON.parse(submitRes.result.content[0].text).status).toBe('submitted');

  const getRes = await rpc(request, 'tools/call', { name: 'get_workflow_config', arguments: {} });
  const cfg = JSON.parse(getRes.result.content[0].text);
  expect(cfg.language).toBe('en');
  expect(cfg.githubOrg).toBe('acme');
});

test('submit_workflow_config merges into existing config', async ({ request }) => {
  await rpc(request, 'tools/call', {
    name: 'submit_workflow_config',
    arguments: { config: { language: 'ro' } },
  });
  await rpc(request, 'tools/call', {
    name: 'submit_workflow_config',
    arguments: { config: { githubOrg: 'neworg' } },
  });
  const res = await rpc(request, 'tools/call', { name: 'get_workflow_config', arguments: {} });
  const cfg = JSON.parse(res.result.content[0].text);
  expect(cfg.githubOrg).toBe('neworg');
});

test('list_skills returns empty initially', async ({ request }) => {
  const res = await rpc(request, 'tools/call', { name: 'list_skills', arguments: {} });
  expect(JSON.parse(res.result.content[0].text)).toEqual([]);
});

test('add_skill → list_skills → remove_skill round-trip', async ({ request }) => {
  const content = '---\nname: dev-flow\ndescription: Dev workflow skill\nagents: all\n---\nBody.';
  const addRes = await rpc(request, 'tools/call', {
    name: 'add_skill',
    arguments: { name: 'dev-flow', content, description: 'Dev workflow skill' },
  });
  expect(JSON.parse(addRes.result.content[0].text).status).toBe('submitted');

  const listRes = await rpc(request, 'tools/call', { name: 'list_skills', arguments: {} });
  const skills = JSON.parse(listRes.result.content[0].text);
  expect(skills).toHaveLength(1);
  expect(skills[0].name).toBe('dev-flow');

  const removeRes = await rpc(request, 'tools/call', {
    name: 'remove_skill', arguments: { name: 'dev-flow' },
  });
  expect(JSON.parse(removeRes.result.content[0].text).removed).toBe('dev-flow');

  const afterRemove = await rpc(request, 'tools/call', { name: 'list_skills', arguments: {} });
  expect(JSON.parse(afterRemove.result.content[0].text)).toHaveLength(0);
});

test('add_skill rejects content missing frontmatter fields', async ({ request }) => {
  const res = await rpc(request, 'tools/call', {
    name: 'add_skill',
    arguments: { name: 'bad', content: 'no frontmatter here' },
  });
  expect(res.error).toBeDefined();
  expect(res.error.message).toContain('frontmatter');
});

test('remove_skill returns error for unknown skill', async ({ request }) => {
  const res = await rpc(request, 'tools/call', {
    name: 'remove_skill', arguments: { name: 'nonexistent' },
  });
  expect(res.error).toBeDefined();
  expect(res.error.message).toContain('not found');
});

test('error for unknown tool arrives as JSON-RPC error (HTTP 200)', async ({ request }) => {
  const res = await rpc(request, 'tools/call', { name: 'does_not_exist', arguments: {} });
  expect(res.error).toBeDefined();
  expect(res.error.message).toContain('Unknown tool');
  // HTTP status must be 200 even for errors
  const raw = await request.post(`http://127.0.0.1:${PORT}/mcp`, {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'nope', arguments: {} }, id: 2 }),
  });
  expect(raw.status()).toBe(200);
});
