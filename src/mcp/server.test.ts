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

  it('lists 11 tools', async () => {
    const res = await postMcp(PORT, { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 2 });
    expect(res.result.tools).toHaveLength(11);
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
