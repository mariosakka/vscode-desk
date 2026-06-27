import * as http from 'http';
import { McpServer } from './server';

const mockDataService = {
  get: jest.fn(),
  addBookmark: jest.fn(),
  removeBookmark: jest.fn(),
  updateBookmark: jest.fn(),
  getPageTemplate: jest.fn().mockReturnValue(null),
  setPageTemplate: jest.fn(),
  clearPageTemplate: jest.fn(),
  getPageTemplateFilePath: jest.fn().mockReturnValue('/tmp/page-template.desk'),
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
  get: jest.fn().mockReturnValue(null),
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
    // globalDataService=mockDataService, all others null; workspaceDataService=null so resolver falls back to global
    server = new McpServer(mockDataService as any, null, null, null, null, null, null, null, mockProvider as any, mockFaviconService as any);
    server.start(PORT);
    setTimeout(done, 30);
  });

  afterEach(done => {
    server.stop();
    setTimeout(done, 30);
  });

  it('responds to initialize', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'initialize', params: {}, id: 1 });
    expect(res.result.serverInfo.name).toBe('vscode-desk');
    expect(res.result.protocolVersion).toBeDefined();
  });

  it('lists 16 tools', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 2 });
    expect(res.result.tools).toHaveLength(16);
    const names = res.result.tools.map((t: any) => t.name);
    expect(names).toContain('list_bookmarks');
    expect(names).toContain('add_bookmark');
    expect(names).toContain('remove_bookmark');
    expect(names).toContain('update_bookmark');
    expect(names).toContain('list_pages');
    expect(names).toContain('create_page');
    expect(names).toContain('update_page');
    expect(names).toContain('delete_page');
    expect(names).toContain('get_page_template');
    expect(names).toContain('set_page_template');
  });

  it('get_page_template returns error when not set', async () => {
    mockDataService.getPageTemplate.mockReturnValue(null);
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'get_page_template', arguments: {} }, id: 99,
    });
    expect(res.error).toBeDefined();
    expect(res.error.message).toContain('No page template');
  });

  it('set_page_template saves content and get_page_template returns it', async () => {
    const content = '<style>.card { background: var(--surface); }</style>';
    mockDataService.setPageTemplate.mockImplementation((c: string) => {
      mockDataService.getPageTemplate.mockReturnValue(c);
    });
    await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'set_page_template', arguments: { content } }, id: 100,
    });
    expect(mockDataService.setPageTemplate).toHaveBeenCalledWith(content);
    const res2 = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'get_page_template', arguments: {} }, id: 101,
    });
    expect(res2.result.content[0].text).toBe(content);
  });

  it('lists 4 resources', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'resources/list', params: {}, id: 3 });
    expect(res.result.resources).toHaveLength(4);
    const uris = res.result.resources.map((r: any) => r.uri);
    expect(uris).toContain('desk://guide/quick-start');
    expect(uris).toContain('desk://guide/desk-page-format');
    expect(uris).toContain('desk://workspace/current');
  });

  it('reads the quick-start resource', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'resources/read', params: { uri: 'desk://guide/quick-start' }, id: 4 });
    expect(res.result.contents[0].text).toContain('list_bookmarks');
    expect(res.result.contents[0].mimeType).toBe('text/markdown');
  });

  it('workspace/current resource returns workspaceName and workspacePath', async () => {
    const srv = new McpServer(
      mockDataService as any, null, null, null, null, null, null, null,
      mockProvider as any, mockFaviconService as any, [], null, null,
      'my-project', '/home/user/work/my-project',
    );
    const port2 = PORT + 1;
    await srv.start(port2);
    try {
      const res = await postMcp(port2, {
        jsonrpc: '2.0', method: 'resources/read',
        params: { uri: 'desk://workspace/current' }, id: 50,
      });
      const info = JSON.parse(res.result.contents[0].text);
      expect(info.workspaceName).toBe('my-project');
      expect(info.workspacePath).toBe('/home/user/work/my-project');
      expect(res.result.contents[0].mimeType).toBe('application/json');
    } finally {
      srv.stop();
    }
  });

  it('workspace/current returns nulls when no workspace is open', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'resources/read',
      params: { uri: 'desk://workspace/current' }, id: 51,
    });
    const info = JSON.parse(res.result.contents[0].text);
    expect(info.workspaceName).toBeNull();
    expect(info.workspacePath).toBeNull();
  });

  it('calls list_bookmarks and returns flat array of bookmarks', async () => {
    mockDataService.get.mockReturnValue({
      bookmarks: [{ id: 'bm_1', title: 'A', url: 'https://a.com', icon: '🔗', description: '' }],
    });
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'list_bookmarks', arguments: {} }, id: 3,
    });
    const bms = JSON.parse(res.result.content[0].text);
    expect(bms).toHaveLength(1);
    expect(bms[0].title).toBe('A');
  });

  it('add_bookmark auto-fetches favicon when icon not provided', async () => {
    mockDataService.addBookmark.mockReturnValue({ id: 'bm_new', title: 'New', url: 'https://x.com', icon: 'data:image/png;base64,TEST', description: '' });
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'add_bookmark', arguments: { title: 'New', url: 'https://x.com' } },
      id: 5,
    });
    expect(mockFaviconService.getIcon).toHaveBeenCalledWith('https://x.com');
    expect(mockDataService.addBookmark).toHaveBeenCalledWith(expect.objectContaining({ icon: 'data:image/png;base64,TEST' }));
    expect(mockProvider.refresh).toHaveBeenCalledTimes(1);
    expect(JSON.parse(res.result.content[0].text).id).toBe('bm_new');
  });

  it('add_bookmark uses provided icon and skips favicon fetch', async () => {
    mockDataService.addBookmark.mockReturnValue({ id: 'bm_2', title: 'T', url: 'https://x.com', icon: '🚀', description: '' });
    await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'add_bookmark', arguments: { title: 'T', url: 'https://x.com', icon: '🚀' } },
      id: 6,
    });
    expect(mockFaviconService.getIcon).not.toHaveBeenCalled();
    expect(mockDataService.addBookmark).toHaveBeenCalledWith(expect.objectContaining({ icon: '🚀' }));
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
      null,
      mockWorkflowConfigService as any,
      mockSkillRegistry as any,
      null,
      null,
      null,
      null,
      mockProvider as any,
      mockFaviconService as any,
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


  it('lists 4 resources', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'resources/list', params: {}, id: 2 });
    expect(res.result.resources).toHaveLength(4);
    const uris = res.result.resources.map((r: any) => r.uri);
    expect(uris).toContain('desk://guide/skill-format');
    expect(uris).toContain('desk://workspace/current');
  });

  it('get_workflow_config returns config when set', async () => {
    mockWorkflowConfigService.get.mockReturnValue({
      communication: [{ label: 'General', channel: '#general' }],
      general: [{ label: 'Language', value: 'en' }],
    });
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'get_workflow_config', arguments: {} }, id: 3,
    });
    const config = JSON.parse(res.result.content[0].text);
    expect(config.communication[0].channel).toBe('#general');
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
    const config = {
      communication: [{ label: 'General', channel: '#general' }],
      general: [{ label: 'Language', value: 'en' }],
    };
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'submit_workflow_config', arguments: { config } }, id: 5,
    });
    expect(mockWorkflowConfigService.setPending).toHaveBeenCalledWith(config);
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

  it('get_skill returns full skill when found', async () => {
    const skill = { name: 'dev-flow', description: 'Dev workflow', content: '---\nname: dev-flow\n---\nbody', agents: ['all'], version: 1, installedAt: 0 };
    mockSkillRegistry.get.mockReturnValueOnce(skill);
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'get_skill', arguments: { name: 'dev-flow' } }, id: 10,
    });
    const result = JSON.parse(res.result.content[0].text);
    expect(result.name).toBe('dev-flow');
    expect(result.content).toContain('body');
    expect(mockSkillRegistry.get).toHaveBeenCalledWith('dev-flow');
  });

  it('get_skill returns isError when skill not found', async () => {
    mockSkillRegistry.get.mockReturnValueOnce(null);
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'get_skill', arguments: { name: 'missing' } }, id: 11,
    });
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toContain("'missing' not found");
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
