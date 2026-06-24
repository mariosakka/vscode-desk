import { DataService } from './dataService';

const mockState: Record<string, any> = {};
const mockStore = {
  get: jest.fn((key: string) => mockState[key]),
  update: jest.fn((key: string, value: any) => {
    mockState[key] = value;
    return Promise.resolve();
  }),
} as any;

describe('DataService', () => {
  beforeEach(() => {
    Object.keys(mockState).forEach(k => delete mockState[k]);
    jest.clearAllMocks();
  });

  describe('get()', () => {
    it('returns empty tabs when storage is empty', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      const data = svc.get();
      expect(data.tabs).toHaveLength(0);
    });

    it('returns stored data when present', () => {
      mockState['astrolabe.data'] = { tabs: [{ id: 'tab_1', name: 'Custom', bookmarks: [] }] };
      const svc = new DataService(mockStore, 'astrolabe.data');
      expect(svc.get().tabs[0].name).toBe('Custom');
    });

    it('does not mutate default data across calls', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      const a = svc.get();
      a.tabs.push({ id: 'tab_injected', name: 'Injected', bookmarks: [] });
      const b = svc.get();
      expect(b.tabs).toHaveLength(0);
    });
  });

  describe('addBookmark()', () => {
    it('adds a bookmark to the specified tab', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      const tab = svc.createTab('Work');
      const bm = svc.addBookmark(tab.id, { title: 'Test', url: 'https://example.com', icon: '🔗', description: 'A test bookmark' });
      expect(bm.id).toMatch(/^bm_/);
      expect(bm.title).toBe('Test');
      expect(svc.get().tabs[0].bookmarks).toHaveLength(1);
    });

    it('throws when tab not found', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      expect(() => svc.addBookmark('tab_nope', { title: 'T', url: 'https://example.com', icon: '🔗', description: '' }))
        .toThrow('Tab not found: tab_nope');
    });
  });

  describe('removeBookmark()', () => {
    it('removes the bookmark from the tab', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      const tab = svc.createTab('Work');
      const bm = svc.addBookmark(tab.id, { title: 'ToRemove', url: 'https://example.com', icon: '🔗', description: '' });
      svc.removeBookmark(tab.id, bm.id);
      expect(svc.get().tabs[0].bookmarks).toHaveLength(0);
    });

    it('throws when tab not found', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      expect(() => svc.removeBookmark('tab_nope', 'bm_1')).toThrow('Tab not found: tab_nope');
    });
  });

  describe('createTab()', () => {
    it('creates a new empty tab', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      const tab = svc.createTab('Tools');
      expect(tab.id).toMatch(/^tab_/);
      expect(tab.name).toBe('Tools');
      expect(tab.bookmarks).toHaveLength(0);
      expect(svc.get().tabs).toHaveLength(1);
    });

    it('creates multiple independent tabs', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      svc.createTab('Work');
      svc.createTab('Personal');
      expect(svc.get().tabs).toHaveLength(2);
    });
  });

  describe('removeTab()', () => {
    it('removes the tab', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      const tab = svc.createTab('Temp');
      svc.removeTab(tab.id);
      expect(svc.get().tabs).toHaveLength(0);
    });
  });

  describe('updateBookmark()', () => {
    it('updates only the specified fields', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      const tab = svc.createTab('Work');
      const bm = svc.addBookmark(tab.id, { title: 'Original', url: 'https://original.com', icon: '🔗', description: 'desc' });
      const updated = svc.updateBookmark(tab.id, bm.id, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
      expect(updated.url).toBe('https://original.com');
    });

    it('throws when tab not found', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      expect(() => svc.updateBookmark('tab_nope', 'bm_1', {})).toThrow('Tab not found: tab_nope');
    });

    it('throws when bookmark not found', () => {
      const svc = new DataService(mockStore, 'astrolabe.data');
      const tab = svc.createTab('Work');
      expect(() => svc.updateBookmark(tab.id, 'bm_nope', {})).toThrow('Bookmark not found: bm_nope');
    });
  });
});
