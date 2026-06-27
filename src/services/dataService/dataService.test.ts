import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { DataService } from './dataService';

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-test-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('DataService', () => {
  describe('get()', () => {
    it('returns empty bookmarks when storage is empty', () => {
      const svc = new DataService(tmpDir);
      const data = svc.get();
      expect(data.bookmarks).toHaveLength(0);
    });

    it('returns stored data when present', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'data.json'),
        JSON.stringify({ bookmarks: [{ id: 'bm_1', title: 'Custom', url: 'https://example.com', icon: '🔗', description: '' }] }),
        'utf-8'
      );
      const svc = new DataService(tmpDir);
      expect(svc.get().bookmarks[0].title).toBe('Custom');
    });

    it('does not mutate default data across calls', () => {
      const svc = new DataService(tmpDir);
      const a = svc.get();
      a.bookmarks.push({ id: 'bm_injected', title: 'Injected', url: 'https://example.com', icon: '🔗', description: '' });
      const b = svc.get();
      expect(b.bookmarks).toHaveLength(0);
    });
  });

  describe('addBookmark()', () => {
    it('adds a bookmark with a generated bm_ id', () => {
      const svc = new DataService(tmpDir);
      const bm = svc.addBookmark({ title: 'Test', url: 'https://example.com', icon: '🔗', description: 'A test bookmark' });
      expect(bm.id).toMatch(/^bm_/);
      expect(bm.title).toBe('Test');
      expect(svc.get().bookmarks).toHaveLength(1);
    });

    it('adds multiple bookmarks independently', () => {
      const svc = new DataService(tmpDir);
      svc.addBookmark({ title: 'First', url: 'https://first.com', icon: '🔗', description: '' });
      svc.addBookmark({ title: 'Second', url: 'https://second.com', icon: '🔗', description: '' });
      expect(svc.get().bookmarks).toHaveLength(2);
    });
  });

  describe('removeBookmark()', () => {
    it('removes the bookmark', () => {
      const svc = new DataService(tmpDir);
      const bm = svc.addBookmark({ title: 'ToRemove', url: 'https://example.com', icon: '🔗', description: '' });
      svc.removeBookmark(bm.id);
      expect(svc.get().bookmarks).toHaveLength(0);
    });

    it('throws Bookmark not found when id missing', () => {
      const svc = new DataService(tmpDir);
      expect(() => svc.removeBookmark('bm_nope')).toThrow('Bookmark not found: bm_nope');
    });
  });

  describe('updateBookmark()', () => {
    it('updates only the specified fields', () => {
      const svc = new DataService(tmpDir);
      const bm = svc.addBookmark({ title: 'Original', url: 'https://original.com', icon: '🔗', description: 'desc' });
      const updated = svc.updateBookmark(bm.id, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
      expect(updated.url).toBe('https://original.com');
    });

    it('preserves unmodified fields', () => {
      const svc = new DataService(tmpDir);
      const bm = svc.addBookmark({ title: 'T', url: 'https://x.com', icon: '🔗', description: 'original desc' });
      const updated = svc.updateBookmark(bm.id, { url: 'https://y.com' });
      expect(updated.description).toBe('original desc');
      expect(updated.icon).toBe('🔗');
    });

    it('throws Bookmark not found when id missing', () => {
      const svc = new DataService(tmpDir);
      expect(() => svc.updateBookmark('bm_nope', {})).toThrow('Bookmark not found: bm_nope');
    });
  });

  describe('scope isolation', () => {
    it('global and workspace dirs are independent', () => {
      const globalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-global-'));
      try {
        const globalSvc = new DataService(globalDir);
        const workspaceSvc = new DataService(tmpDir);
        globalSvc.addBookmark({ title: 'Global BM', url: 'https://global.com', icon: '🌐', description: '' });
        expect(globalSvc.get().bookmarks).toHaveLength(1);
        expect(workspaceSvc.get().bookmarks).toHaveLength(0);
      } finally {
        fs.rmSync(globalDir, { recursive: true, force: true });
      }
    });
  });

  describe('data persistence', () => {
    it('saved data survives a new DataService instance pointed at same dir', () => {
      const svc1 = new DataService(tmpDir);
      svc1.addBookmark({ title: 'Persistent', url: 'https://persistent.com', icon: '🔗', description: '' });
      const svc2 = new DataService(tmpDir);
      expect(svc2.get().bookmarks[0].title).toBe('Persistent');
    });
  });

  describe('page template', () => {
    it('returns null when no template is set and no default provided', () => {
      const svc = new DataService(tmpDir);
      expect(svc.getPageTemplate()).toBeNull();
    });

    it('saves and retrieves a template', () => {
      const svc = new DataService(tmpDir);
      svc.setPageTemplate('<style>.card { background: var(--surface); }</style>');
      expect(svc.getPageTemplate()).toBe('<style>.card { background: var(--surface); }</style>');
    });

    it('clearPageTemplate removes the file', () => {
      const svc = new DataService(tmpDir);
      svc.setPageTemplate('something');
      svc.clearPageTemplate();
      expect(svc.getPageTemplate()).toBeNull();
    });

    it('falls back to bundled default when no user template is set', () => {
      const defaultPath = path.join(tmpDir, 'bundled.desk');
      fs.writeFileSync(defaultPath, '<desk-page>bundled default</desk-page>', 'utf-8');
      const svc = new DataService(tmpDir, defaultPath);
      expect(svc.getPageTemplate()).toBe('<desk-page>bundled default</desk-page>');
    });

    it('user template takes precedence over bundled default', () => {
      const defaultPath = path.join(tmpDir, 'bundled.desk');
      fs.writeFileSync(defaultPath, '<desk-page>bundled default</desk-page>', 'utf-8');
      const svc = new DataService(tmpDir, defaultPath);
      svc.setPageTemplate('<desk-page>user template</desk-page>');
      expect(svc.getPageTemplate()).toBe('<desk-page>user template</desk-page>');
    });

    it('returns null when default path is missing and no user template', () => {
      const svc = new DataService(tmpDir, '/nonexistent/path.desk');
      expect(svc.getPageTemplate()).toBeNull();
    });
  });
});
