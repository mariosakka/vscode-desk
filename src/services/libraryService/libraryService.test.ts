import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { LibraryService, Library } from './libraryService';

let tmpDir: string;
let libCacheDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-lib-test-'));
  libCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-lib-cache-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(libCacheDir, { recursive: true, force: true });
});

function makeService(downloader = jest.fn().mockResolvedValue(undefined)) {
  const svc = new LibraryService(tmpDir, downloader);
  // Override libCacheDir with our temp dir
  (svc as any).libCacheDir = libCacheDir;
  return { svc, downloader };
}

describe('list()', () => {
  it('returns default libraries when no config exists', () => {
    const { svc } = makeService();
    const libs = svc.list();
    expect(libs.length).toBeGreaterThan(0);
    expect(libs.some(l => l.name === 'highlight')).toBe(true);
  });

  it('returns stored libraries when config exists', () => {
    const entry: Library = { name: 'mylib', description: 'test', files: [{ url: 'https://example.com/lib.js', type: 'script' }] };
    fs.writeFileSync(path.join(tmpDir, 'libraries.json'), JSON.stringify([entry]), 'utf-8');
    const { svc } = makeService();
    const libs = svc.list();
    expect(libs).toHaveLength(1);
    expect(libs[0].name).toBe('mylib');
  });
});

describe('add()', () => {
  it('adds a new library to the list', () => {
    const { svc } = makeService();
    const entry: Library = { name: 'newlib', files: [{ url: 'https://example.com/a.js', type: 'script' }] };
    svc.add(entry);
    expect(svc.list().some(l => l.name === 'newlib')).toBe(true);
  });

  it('replaces an existing library with the same name', () => {
    const { svc } = makeService();
    const v1: Library = { name: 'mylib', files: [{ url: 'https://example.com/v1.js', type: 'script' }] };
    const v2: Library = { name: 'mylib', files: [{ url: 'https://example.com/v2.js', type: 'script' }] };
    svc.add(v1);
    svc.add(v2);
    const libs = svc.list().filter(l => l.name === 'mylib');
    expect(libs).toHaveLength(1);
    expect(libs[0].files[0].url).toContain('v2');
  });
});

describe('remove()', () => {
  it('removes the library from config', () => {
    const { svc } = makeService();
    const entry: Library = { name: 'toremove', files: [{ url: 'https://example.com/a.js', type: 'script' }] };
    svc.add(entry);
    svc.remove('toremove');
    expect(svc.list().some(l => l.name === 'toremove')).toBe(false);
  });

  it('throws Library not found for unknown name', () => {
    const { svc } = makeService();
    expect(() => svc.remove('nonexistent')).toThrow('Library not found: nonexistent');
  });

  it('deletes cached files when removing', () => {
    const { svc } = makeService();
    const entry: Library = { name: 'cached', files: [{ url: 'https://example.com/a.js', type: 'script' }] };
    svc.add(entry);
    const cacheDir = path.join(libCacheDir, 'cached');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, 'a.js'), 'content');
    svc.remove('cached');
    expect(fs.existsSync(cacheDir)).toBe(false);
  });
});

describe('isInstalled()', () => {
  it('returns false when cached files are absent', () => {
    const { svc } = makeService();
    svc.add({ name: 'mylib', files: [{ url: 'https://example.com/a.js', type: 'script' }] });
    expect(svc.isInstalled('mylib')).toBe(false);
  });

  it('returns true when all cached files exist', () => {
    const { svc } = makeService();
    svc.add({ name: 'mylib', files: [{ url: 'https://example.com/a.js', type: 'script' }] });
    const dir = path.join(libCacheDir, 'mylib');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'a.js'), 'content');
    expect(svc.isInstalled('mylib')).toBe(true);
  });

  it('returns false for unknown library name', () => {
    const { svc } = makeService();
    expect(svc.isInstalled('unknown')).toBe(false);
  });
});

describe('getInstalledFiles()', () => {
  it('returns empty array when nothing is cached', () => {
    const { svc } = makeService();
    expect(svc.getInstalledFiles()).toHaveLength(0);
  });

  it('returns only files that exist on disk', () => {
    const { svc } = makeService();
    svc.add({ name: 'mylib', files: [
      { url: 'https://example.com/a.js', type: 'script' },
      { url: 'https://example.com/b.css', type: 'style' },
    ]});
    const dir = path.join(libCacheDir, 'mylib');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'a.js'), 'js');
    // b.css deliberately missing
    const files = svc.getInstalledFiles();
    expect(files).toHaveLength(1);
    expect(files[0].type).toBe('script');
  });
});

describe('install()', () => {
  it('calls the downloader for each file', async () => {
    const { svc, downloader } = makeService();
    svc.add({ name: 'mylib', files: [
      { url: 'https://example.com/a.js', type: 'script' },
      { url: 'https://example.com/b.css', type: 'style' },
    ]});
    await svc.install('mylib');
    expect(downloader).toHaveBeenCalledTimes(2);
  });

  it('throws for unknown library', async () => {
    const { svc } = makeService();
    await expect(svc.install('unknown')).rejects.toThrow('Library not found: unknown');
  });
});

describe('installAll()', () => {
  it('installs all configured libraries', async () => {
    const { svc, downloader } = makeService();
    // Write an explicit config so defaults don't inflate the count
    fs.writeFileSync(path.join(tmpDir, 'libraries.json'), JSON.stringify([
      { name: 'lib1', files: [{ url: 'https://example.com/a.js', type: 'script' }] },
      { name: 'lib2', files: [{ url: 'https://example.com/b.js', type: 'script' }] },
    ]), 'utf-8');
    await svc.installAll();
    expect(downloader).toHaveBeenCalledTimes(2);
  });

  it('skips failed downloads silently', async () => {
    const downloader = jest.fn().mockRejectedValue(new Error('network error'));
    const svc = new LibraryService(tmpDir, downloader);
    (svc as any).libCacheDir = libCacheDir;
    svc.add({ name: 'failing', files: [{ url: 'https://example.com/a.js', type: 'script' }] });
    await expect(svc.installAll()).resolves.toBeUndefined();
  });
});
