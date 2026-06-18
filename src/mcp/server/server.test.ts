import * as http from 'http';
import { McpServer } from './server';

const mockDataService = {
  get: jest.fn(),
  addBookmark: jest.fn(),
  removeBookmark: jest.fn(),
  createTab: jest.fn(),
  removeTab: jest.fn(),
  updateBookmark: jest.fn(),
};

const mockProvider = { refresh: jest.fn() };

const mockFaviconService = { getIcon: jest.fn().mockResolvedValue('data:image/png;base64,TEST') };

const mockWorkflowConfigService = {
  get: jest.fn(),
  setPending: jest.fn(),
  getPending: jest.fn(),
  confirmPending: jest.fn(),
  clearPending: jest.fn(),
};

const mockSkillRegistry = {
  list: jest.fn().mockReturnValue([]),
  getAll: jest.fn().mockReturnValue([]),
  validateFrontmatter: jest.fn().mockReturnValue({ valid: true }),
  setPending: jest.fn(),
  getPending: jest.fn(),
  clearPending: jest.fn(),
  confirmPending: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
  installAll: jest.fn(),
};

const onConfigSubmitted = jest.fn();
const onSkillSubmitted = jest.fn();

function postMcp(port: number, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1', port, path: '/mcp', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      res => {
        let buf = '';
        res.on('data', c => (buf += c));
        res.on('end', () => resolve(JSON.parse(buf)));
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

describe('McpServer', () => {
  let server: McpServer;
  const PORT = 13335;

  beforeEach(done => {
    jest.clearAllMocks();
    server = new McpServer(mockDataService as any, mockProvider as any, mockFaviconService as any, null);
    server.start(PORT);
    setTimeout(done, 30);
  });

  afterEach(done => {
    server.stop();
    setTimeout(done, 30);
  });

  it('responds to initialize', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'initialize', params: {}, id: 1 });
    expect(res.result.serverInfo.name).toBe('vscode-relay');
    expect(res.result.protocolVersion).toBeDefined();
  });

  it('lists 16 tools', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 2 });
    expect(res.result.tools).toHaveLength(16);
    const names = res.result.tools.map((t: any) => t.name);
    expect(names).toContain('list_tabs');
    expect(names).toContain('list_bookmarks');
    expect(names).toContain('add_bookmark');
    expect(names).toContain('remove_bookmark');
    expect(names).toContain('create_tab');
    expect(names).toContain('remove_tab');
    expect(names).toContain('update_bookmark');
    expect(names).toContain('list_pages');
    expect(names).toContain('create_page');
    expect(names).toContain('update_page');
    expect(names).toContain('delete_page');
  });

  it('lists 3 resources', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'resources/list', params: {}, id: 3 });
    expect(res.result.resources).toHaveLength(3);
    const uris = res.result.resources.map((r: any) => r.uri);
    expect(uris).toContain('relay://guide/quick-start');
    expect(uris).toContain('relay://guide/relay-page-format');
  });

  it('reads the quick-start resource', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'resources/read', params: { uri: 'relay://guide/quick-start' }, id: 4 });
    expect(res.result.contents[0].text).toContain('list_tabs');
    expect(res.result.contents[0].mimeType).toBe('text/markdown');
  });

  it('calls list_tabs and returns tab summaries', async () => {
    mockDataService.get.mockReturnValue({
      tabs: [{ id: 'tab_1', name: 'Work', bookmarks: [{ id: 'bm_1' }, { id: 'bm_2' }] }],
    });
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'list_tabs', arguments: {} }, id: 3,
    });
    const tabs = JSON.parse(res.result.content[0].text);
    expect(tabs[0].name).toBe('Work');
    expect(tabs[0].bookmarkCount).toBe(2);
  });

  it('calls list_bookmarks (all tabs) and returns flat list with tab_id', async () => {
    mockDataService.get.mockReturnValue({
      tabs: [
        { id: 'tab_1', name: 'Work', bookmarks: [{ id: 'bm_1', title: 'A' }] },
        { id: 'tab_2', name: 'Misc', bookmarks: [{ id: 'bm_2', title: 'B' }] },
      ],
    });
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'list_bookmarks', arguments: {} }, id: 4,
    });
    const bms = JSON.parse(res.result.content[0].text);
    expect(bms).toHaveLength(2);
    expect(bms[0].tab_id).toBe('tab_1');
  });

  it('add_bookmark auto-fetches favicon when icon not provided', async () => {
    mockDataService.addBookmark.mockReturnValue({ id: 'bm_new', title: 'New', url: 'https://x.com', icon: 'data:image/png;base64,TEST', description: '' });
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'add_bookmark', arguments: { tab_id: 'tab_1', title: 'New', url: 'https://x.com' } },
      id: 5,
    });
    expect(mockFaviconService.getIcon).toHaveBeenCalledWith('https://x.com');
    expect(mockDataService.addBookmark).toHaveBeenCalledWith('tab_1', expect.objectContaining({ icon: 'data:image/png;base64,TEST' }));
    expect(mockProvider.refresh).toHaveBeenCalledTimes(1);
    expect(JSON.parse(res.result.content[0].text).id).toBe('bm_new');
  });

  it('add_bookmark uses provided icon and skips favicon fetch', async () => {
    mockDataService.addBookmark.mockReturnValue({ id: 'bm_2', title: 'T', url: 'https://x.com', icon: '🚀', description: '' });
    await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'add_bookmark', arguments: { tab_id: 'tab_1', title: 'T', url: 'https://x.com', icon: '🚀' } },
      id: 6,
    });
    expect(mockFaviconService.getIcon).not.toHaveBeenCalled();
    expect(mockDataService.addBookmark).toHaveBeenCalledWith('tab_1', expect.objectContaining({ icon: '🚀' }));
  });

  it('returns error for unknown tool', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'does_not_exist', arguments: {} }, id: 7,
    });
    expect(res.error).toBeDefined();
    expect(res.error.message).toContain('Unknown tool');
  });

  it('returns 404 for wrong path', done => {
    const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/other', method: 'GET' }, res => {
      expect(res.statusCode).toBe(404);
      done();
    });
    req.end();
  });
});

describe('McpServer — workflow tools', () => {
  let server: McpServer;
  const PORT = 13336;

  beforeEach(done => {
    jest.clearAllMocks();
    // Reset mock return values to defaults
    mockSkillRegistry.list.mockReturnValue([]);
    mockSkillRegistry.validateFrontmatter.mockReturnValue({ valid: true });
    server = new McpServer(
      mockDataService as any,
      mockProvider as any,
      mockFaviconService as any,
      null,
      mockWorkflowConfigService as any,
      mockSkillRegistry as any,
      [],
      onConfigSubmitted,
      onSkillSubmitted,
    );
    server.start(PORT);
    setTimeout(done, 30);
  });

  afterEach(done => {
    server.stop();
    setTimeout(done, 30);
  });

  it('lists 16 tools', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 });
    expect(res.result.tools).toHaveLength(16);
  });

  it('lists 3 resources', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'resources/list', params: {}, id: 2 });
    expect(res.result.resources).toHaveLength(3);
    const uris = res.result.resources.map((r: any) => r.uri);
    expect(uris).toContain('relay://guide/skill-format');
  });

  it('get_workflow_config returns config when set', async () => {
    mockWorkflowConfigService.get.mockReturnValue({ language: 'en', githubOrg: 'acme' });
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'get_workflow_config', arguments: {} }, id: 3,
    });
    const config = JSON.parse(res.result.content[0].text);
    expect(config.language).toBe('en');
  });

  it('get_workflow_config returns error when not configured', async () => {
    mockWorkflowConfigService.get.mockReturnValue(undefined);
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'get_workflow_config', arguments: {} }, id: 4,
    });
    expect(res.error).toBeDefined();
    expect(res.error.message).toContain('not configured');
  });

  it('submit_workflow_config calls setPending and fires callback', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'submit_workflow_config', arguments: { config: { language: 'ro' } } }, id: 5,
    });
    expect(mockWorkflowConfigService.setPending).toHaveBeenCalledWith({ language: 'ro' });
    expect(onConfigSubmitted).toHaveBeenCalled();
    expect(JSON.parse(res.result.content[0].text).status).toBe('submitted');
  });

  it('list_skills returns empty array initially', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'list_skills', arguments: {} }, id: 6,
    });
    expect(JSON.parse(res.result.content[0].text)).toEqual([]);
  });

  it('add_skill validates frontmatter before queuing', async () => {
    mockSkillRegistry.validateFrontmatter.mockReturnValue({ valid: false, error: 'Missing name' });
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'add_skill', arguments: { name: 'x', content: 'no frontmatter' } }, id: 7,
    });
    expect(res.error).toBeDefined();
    expect(onSkillSubmitted).not.toHaveBeenCalled();
  });

  it('add_skill calls setPending and fires callback when valid', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'add_skill', arguments: { name: 'dev-flow', content: '---\nname: dev-flow\ndescription: d\n---\nbody' } },
      id: 8,
    });
    expect(mockSkillRegistry.setPending).toHaveBeenCalled();
    expect(onSkillSubmitted).toHaveBeenCalled();
    expect(JSON.parse(res.result.content[0].text).status).toBe('submitted');
  });

  it('remove_skill delegates to skillRegistry.remove', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'remove_skill', arguments: { name: 'dev-flow' } }, id: 9,
    });
    expect(mockSkillRegistry.remove).toHaveBeenCalledWith('dev-flow', []);
    expect(JSON.parse(res.result.content[0].text).removed).toBe('dev-flow');
  });
});
