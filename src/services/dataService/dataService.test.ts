import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { DataService } from './dataService';

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astrolabe-test-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('DataService', () => {
  describe('get()', () => {
    it('returns empty projects when storage is empty', () => {
      const svc = new DataService(tmpDir);
      const data = svc.get();
      expect(data.projects).toHaveLength(0);
    });

    it('returns stored data when present', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'data.json'),
        JSON.stringify({ projects: [{ id: 'project_1', name: 'Custom', bookmarks: [] }] }),
        'utf-8'
      );
      const svc = new DataService(tmpDir);
      expect(svc.get().projects[0].name).toBe('Custom');
    });

    it('does not mutate default data across calls', () => {
      const svc = new DataService(tmpDir);
      const a = svc.get();
      a.projects.push({ id: 'project_injected', name: 'Injected', bookmarks: [] });
      const b = svc.get();
      expect(b.projects).toHaveLength(0);
    });
  });

  describe('addBookmark()', () => {
    it('adds a bookmark to the specified project', () => {
      const svc = new DataService(tmpDir);
      const project = svc.createProject('Work');
      const bm = svc.addBookmark(project.id, { title: 'Test', url: 'https://example.com', icon: '🔗', description: 'A test bookmark' });
      expect(bm.id).toMatch(/^bm_/);
      expect(bm.title).toBe('Test');
      expect(svc.get().projects[0].bookmarks).toHaveLength(1);
    });

    it('throws when project not found', () => {
      const svc = new DataService(tmpDir);
      expect(() => svc.addBookmark('project_nope', { title: 'T', url: 'https://example.com', icon: '🔗', description: '' }))
        .toThrow('Project not found: project_nope');
    });
  });

  describe('removeBookmark()', () => {
    it('removes the bookmark from the project', () => {
      const svc = new DataService(tmpDir);
      const project = svc.createProject('Work');
      const bm = svc.addBookmark(project.id, { title: 'ToRemove', url: 'https://example.com', icon: '🔗', description: '' });
      svc.removeBookmark(project.id, bm.id);
      expect(svc.get().projects[0].bookmarks).toHaveLength(0);
    });

    it('throws when project not found', () => {
      const svc = new DataService(tmpDir);
      expect(() => svc.removeBookmark('project_nope', 'bm_1')).toThrow('Project not found: project_nope');
    });
  });

  describe('createProject()', () => {
    it('creates a new empty project', () => {
      const svc = new DataService(tmpDir);
      const project = svc.createProject('Tools');
      expect(project.id).toMatch(/^project_/);
      expect(project.name).toBe('Tools');
      expect(project.bookmarks).toHaveLength(0);
      expect(svc.get().projects).toHaveLength(1);
    });

    it('creates multiple independent projects', () => {
      const svc = new DataService(tmpDir);
      svc.createProject('Work');
      svc.createProject('Personal');
      expect(svc.get().projects).toHaveLength(2);
    });
  });

  describe('removeProject()', () => {
    it('removes the project', () => {
      const svc = new DataService(tmpDir);
      const project = svc.createProject('Temp');
      svc.removeProject(project.id);
      expect(svc.get().projects).toHaveLength(0);
    });
  });

  describe('updateBookmark()', () => {
    it('updates only the specified fields', () => {
      const svc = new DataService(tmpDir);
      const project = svc.createProject('Work');
      const bm = svc.addBookmark(project.id, { title: 'Original', url: 'https://original.com', icon: '🔗', description: 'desc' });
      const updated = svc.updateBookmark(project.id, bm.id, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
      expect(updated.url).toBe('https://original.com');
    });

    it('throws when project not found', () => {
      const svc = new DataService(tmpDir);
      expect(() => svc.updateBookmark('project_nope', 'bm_1', {})).toThrow('Project not found: project_nope');
    });

    it('throws when bookmark not found', () => {
      const svc = new DataService(tmpDir);
      const project = svc.createProject('Work');
      expect(() => svc.updateBookmark(project.id, 'bm_nope', {})).toThrow('Bookmark not found: bm_nope');
    });
  });
});
