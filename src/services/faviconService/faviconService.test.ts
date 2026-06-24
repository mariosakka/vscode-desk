import { FaviconService, FALLBACK_ICON } from './faviconService';

const mockState: Record<string, any> = {};
const mockContext = {
  globalState: {
    get: jest.fn((key: string) => mockState[key]),
    update: jest.fn((key: string, value: any) => {
      mockState[key] = value;
      return Promise.resolve();
    }),
  },
} as any;

const makeBuffer = (content: string) => Buffer.from(content);
const pngFetcher = jest.fn().mockResolvedValue({ buffer: makeBuffer('PNG'), contentType: 'image/png' });
const failingFetcher = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

describe('FaviconService', () => {
  beforeEach(() => {
    Object.keys(mockState).forEach(k => delete mockState[k]);
    jest.clearAllMocks();
  });

  describe('getIcon()', () => {
    it('returns FALLBACK_ICON for invalid URL', async () => {
      const svc = new FaviconService(mockContext);
      expect(await svc.getIcon('not-a-url')).toBe(FALLBACK_ICON);
    });

    it('returns FALLBACK_ICON when all fetches fail', async () => {
      const svc = new FaviconService(mockContext, failingFetcher);
      expect(await svc.getIcon('https://example.com/page')).toBe(FALLBACK_ICON);
    });

    it('fetches favicon and returns data URL on cache miss', async () => {
      const svc = new FaviconService(mockContext, pngFetcher);
      const icon = await svc.getIcon('https://example.com/page');
      expect(icon).toMatch(/^data:image\/png;base64,/);
      expect(pngFetcher).toHaveBeenCalledWith('https://example.com/favicon.ico');
    });

    it('caches the result in globalState', async () => {
      const svc = new FaviconService(mockContext, pngFetcher);
      await svc.getIcon('https://example.com/page');
      const cache = mockState['desk.favicon-cache'];
      expect(cache['example.com']).toBeDefined();
      expect(cache['example.com'].dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('returns cached value without fetching on cache hit', async () => {
      const freshEntry = { dataUrl: 'data:image/png;base64,CACHED', fetchedAt: Date.now() };
      mockState['desk.favicon-cache'] = { 'example.com': freshEntry };
      const svc = new FaviconService(mockContext, pngFetcher);
      const icon = await svc.getIcon('https://example.com/page');
      expect(icon).toBe('data:image/png;base64,CACHED');
      expect(pngFetcher).not.toHaveBeenCalled();
    });

    it('re-fetches when cache entry is older than 30 days', async () => {
      const staleEntry = {
        dataUrl: 'data:image/png;base64,OLD',
        fetchedAt: Date.now() - (31 * 24 * 60 * 60 * 1000),
      };
      mockState['desk.favicon-cache'] = { 'example.com': staleEntry };
      const svc = new FaviconService(mockContext, pngFetcher);
      const icon = await svc.getIcon('https://example.com/page');
      expect(icon).toMatch(/^data:image\/png;base64,/);
      expect(pngFetcher).toHaveBeenCalled();
    });

    it('deduplicates by hostname — same icon for different paths', async () => {
      const svc = new FaviconService(mockContext, pngFetcher);
      await svc.getIcon('https://example.com/foo');
      pngFetcher.mockClear();
      await svc.getIcon('https://example.com/bar');
      expect(pngFetcher).not.toHaveBeenCalled();
    });
  });
});
