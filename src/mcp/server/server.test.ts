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
  getAllTools: jest.fn().mockReturnValue([]),
  get: jest.fn().mockReturnValue(null),
  validateFrontmatter: jest.fn().mockReturnValue({ valid: true }),
  setPending: jest.fn(),
  getPending: jest.fn(),
  clearPending: jest.fn(),
  confirmPending: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
  installAll: jest.fn(),
};

const mockLibraryService = {
  list: jest.fn().mockReturnValue([]),
  get: jest.fn().mockReturnValue(null),
  add: jest.fn(),
  remove: jest.fn(),
  isInstalled: jest.fn().mockReturnValue(false),
  getInstalledFiles: jest.fn().mockReturnValue([]),
  install: jest.fn().mockResolvedValue(undefined),
  installAll: jest.fn().mockResolvedValue(undefined),
  libCacheDir: '/tmp/desk-lib-test',
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

  it('lists 19 tools', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 2 });
    expect(res.result.tools).toHaveLength(19);
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

  it('lists 19 tools', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 });
    expect(res.result.tools).toHaveLength(19);
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

describe('McpServer — library tools', () => {
  let server: McpServer;
  const PORT = 13337;

  beforeEach(done => {
    jest.clearAllMocks();
    mockLibraryService.list.mockReturnValue([]);
    mockLibraryService.isInstalled.mockReturnValue(false);
    server = new McpServer(
      mockDataService as any,
      null, null, null, null, null, null, null,
      mockProvider as any, mockFaviconService as any,
      [], null, null, null, null,
      mockLibraryService as any,
    );
    server.start(PORT);
    setTimeout(done, 30);
  });

  afterEach(done => {
    server.stop();
    setTimeout(done, 30);
  });

  it('list_libraries returns empty array initially', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'list_libraries', arguments: {} }, id: 1,
    });
    expect(JSON.parse(res.result.content[0].text)).toEqual([]);
  });

  it('list_libraries includes installed flag', async () => {
    const lib = { name: 'highlight', description: 'Syntax highlighting', files: [{ url: 'https://example.com/hl.js', type: 'script' }] };
    mockLibraryService.list.mockReturnValue([lib]);
    mockLibraryService.isInstalled.mockReturnValue(true);
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'list_libraries', arguments: {} }, id: 2,
    });
    const result = JSON.parse(res.result.content[0].text);
    expect(result[0].name).toBe('highlight');
    expect(result[0].installed).toBe(true);
  });

  it('add_library calls libraryService.add', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'add_library', arguments: { name: 'mylib', files: [{ url: 'https://example.com/a.js', type: 'script' }] } }, id: 3,
    });
    expect(mockLibraryService.add).toHaveBeenCalledWith(expect.objectContaining({ name: 'mylib' }));
    expect(JSON.parse(res.result.content[0].text).status).toBe('added');
  });

  it('remove_library calls libraryService.remove', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'remove_library', arguments: { name: 'highlight' } }, id: 4,
    });
    expect(mockLibraryService.remove).toHaveBeenCalledWith('highlight');
    expect(JSON.parse(res.result.content[0].text).removed).toBe('highlight');
  });

  it('remove_library returns error when libraryService.remove throws', async () => {
    mockLibraryService.remove.mockImplementation(() => { throw new Error('Library not found: missing'); });
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'remove_library', arguments: { name: 'missing' } }, id: 5,
    });
    expect(res.error).toBeDefined();
    expect(res.error.message).toContain('Library not found');
  });
});

describe('McpServer — page tools (sections-based)', () => {
  let server: McpServer;
  const PORT = 13338;

  const mockPageReader = {
    list: jest.fn().mockReturnValue([]),
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    dir: jest.fn().mockReturnValue('/tmp/desk-pages-test'),
    filePath: jest.fn((f: string) => `/tmp/desk-pages-test/${f}`),
  };

  const localDataService = {
    ...mockDataService,
    getPageTemplate: jest.fn().mockReturnValue(
      '<desk-page title="T"><style>\n  h1 { color: red; }\n</style>\n<h1>hi</h1>\n</desk-page>'
    ),
  };

  beforeEach(done => {
    jest.clearAllMocks();
    localDataService.getPageTemplate.mockReturnValue(
      '<desk-page title="T"><style>\n  h1 { color: red; }\n</style>\n<h1>hi</h1>\n</desk-page>'
    );
    server = new McpServer(
      localDataService as any,
      null, null, null, localDataService as any,
      mockPageReader as any,
      null, null,
      mockProvider as any,
      mockFaviconService as any,
    );
    server.start(PORT);
    setTimeout(done, 30);
  });

  afterEach(done => {
    server.stop();
    setTimeout(done, 30);
  });

  it('create_page assembles body from sections and passes template styles to pageReader.write', async () => {
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: {
        name: 'create_page',
        arguments: {
          filename: 'test.desk',
          title: 'Test Page',
          eyebrow: 'Ref · Test',
          subtitle: 'A test page.',
          sections: [
            { id: 'sec-0', heading: 'Intro', icon: '🔧', content: '<p>hello</p>' },
          ],
        },
      },
      id: 1,
    });

    expect(res.result).toBeDefined();
    expect(mockPageReader.write).toHaveBeenCalledTimes(1);
    const [filename, title, bodyHtml, customStyles] = mockPageReader.write.mock.calls[0];
    expect(filename).toBe('test.desk');
    expect(title).toBe('Test Page');
    expect(bodyHtml).toContain('<div class="eyebrow">Ref · Test</div>');
    expect(bodyHtml).toContain('<h1>Test Page</h1>');
    expect(bodyHtml).toContain('<p>A test page.</p>');
    expect(bodyHtml).toContain('id="sec-0"');
    expect(bodyHtml).toContain('class="section-title"');
    expect(bodyHtml).toContain('<span class="icon">🔧</span>');
    expect(bodyHtml).toContain('<p>hello</p>');
    expect(customStyles).toContain('h1 { color: red; }');
  });

  it('create_page uses empty styles when template returns null', async () => {
    localDataService.getPageTemplate.mockReturnValue(null);
    await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: {
        name: 'create_page',
        arguments: { filename: 'no-tmpl.desk', title: 'X', sections: [{ heading: 'H', content: '<p>c</p>' }] },
      },
      id: 2,
    });
    const [, , , customStyles] = mockPageReader.write.mock.calls[0];
    expect(customStyles).toBe('');
  });

  it('update_page with sections rebuilds body and updates title', async () => {
    mockPageReader.read.mockReturnValue({
      filename: 'existing.desk',
      title: 'Old Title',
      customStyles: 'old { }',
      bodyHtml: '<p>old body</p>',
      pageScripts: [],
    });

    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: {
        name: 'update_page',
        arguments: {
          filename: 'existing.desk',
          title: 'New Title',
          sections: [{ heading: 'New Section', content: '<p>new</p>' }],
        },
      },
      id: 3,
    });

    expect(res.result).toBeDefined();
    const [filename, title, bodyHtml, customStyles] = mockPageReader.write.mock.calls[0];
    expect(filename).toBe('existing.desk');
    expect(title).toBe('New Title');
    expect(bodyHtml).toContain('New Section');
    expect(bodyHtml).toContain('<p>new</p>');
    expect(customStyles).toContain('h1 { color: red; }');
  });

  it('update_page without sections keeps existing body and styles', async () => {
    mockPageReader.read.mockReturnValue({
      filename: 'existing.desk',
      title: 'Old Title',
      customStyles: 'old { }',
      bodyHtml: '<p>old body</p>',
      pageScripts: [],
    });

    await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: {
        name: 'update_page',
        arguments: { filename: 'existing.desk', title: 'Updated Title' },
      },
      id: 4,
    });

    const [, title, bodyHtml, customStyles] = mockPageReader.write.mock.calls[0];
    expect(title).toBe('Updated Title');
    expect(bodyHtml).toBe('<p>old body</p>');
    expect(customStyles).toBe('old { }');
  });
});

describe('McpServer — dynamic skill tools', () => {
  let server: McpServer;
  const mockGlobalSkillRegistry = {
    list: jest.fn().mockReturnValue([]),
    getAll: jest.fn().mockReturnValue([]),
    getAllTools: jest.fn().mockReturnValue([]),
    get: jest.fn().mockReturnValue(null),
    validateFrontmatter: jest.fn().mockReturnValue({ valid: true }),
    setPending: jest.fn(),
    getPending: jest.fn(),
    clearPending: jest.fn(),
    confirmPending: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
    installAll: jest.fn(),
  };
  const mockWorkspaceSkillRegistry = {
    list: jest.fn().mockReturnValue([]),
    getAll: jest.fn().mockReturnValue([]),
    getAllTools: jest.fn().mockReturnValue([]),
    get: jest.fn().mockReturnValue(null),
    validateFrontmatter: jest.fn().mockReturnValue({ valid: true }),
    setPending: jest.fn(),
    getPending: jest.fn(),
    clearPending: jest.fn(),
    confirmPending: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
    installAll: jest.fn(),
  };
  const PORT = 13341;

  beforeEach(done => {
    jest.clearAllMocks();
    mockGlobalSkillRegistry.getAllTools.mockReturnValue([]);
    mockWorkspaceSkillRegistry.getAllTools.mockReturnValue([]);
    server = new McpServer(
      mockDataService as any,
      null,
      null,
      mockGlobalSkillRegistry as any,
      null,
      null,
      null,
      mockWorkspaceSkillRegistry as any,
      mockProvider as any,
      mockFaviconService as any,
    );
    server.start(PORT);
    setTimeout(done, 30);
  });

  afterEach(done => {
    server.stop();
    setTimeout(done, 30);
  });

  it('includes skill-defined tools in tools/list', async () => {
    mockGlobalSkillRegistry.getAllTools.mockReturnValue([{
      name: 'my-skill-tool',
      description: 'Does something',
      command: 'echo hello',
      args: [],
    }]);
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 99 });
    const names = res.result.tools.map((t: any) => t.name);
    expect(names).toContain('my-skill-tool');
    expect(names).toContain('list_bookmarks');
  });

  it('executes a skill tool command and returns output', async () => {
    mockGlobalSkillRegistry.getAllTools.mockReturnValue([{
      name: 'echo-tool',
      description: 'Echoes a message',
      command: 'echo {msg}',
      args: [{ name: 'msg', type: 'string', required: true }],
    }]);
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'echo-tool', arguments: { msg: 'hello world' } },
      id: 100,
    });
    expect(res.result.content[0].text).toContain('hello world');
  });

  it('returns error when skill tool command fails', async () => {
    mockGlobalSkillRegistry.getAllTools.mockReturnValue([{
      name: 'fail-tool',
      description: 'Always fails',
      command: 'false',
      args: [],
    }]);
    const res = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'fail-tool', arguments: {} },
      id: 101,
    });
    expect(res.error).toBeDefined();
    expect(res.error.message).toContain('fail-tool');
  });

  it('workspace skill tool overrides global tool with same name', async () => {
    mockGlobalSkillRegistry.getAllTools.mockReturnValue([{
      name: 'shared-tool',
      description: 'Global version',
      command: 'echo global',
      args: [],
    }]);
    mockWorkspaceSkillRegistry.getAllTools.mockReturnValue([{
      name: 'shared-tool',
      description: 'Workspace version',
      command: 'echo workspace',
      args: [],
    }]);
    const listRes = await postMcp(PORT, { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 102 });
    const tools = listRes.result.tools.filter((t: any) => t.name === 'shared-tool');
    expect(tools).toHaveLength(1);
    expect(tools[0].description).toBe('Workspace version');

    const callRes = await postMcp(PORT, {
      jsonrpc: '2.0', method: 'tools/call',
      params: { name: 'shared-tool', arguments: {} },
      id: 103,
    });
    expect(callRes.result.content[0].text).toContain('workspace');
  });
});
