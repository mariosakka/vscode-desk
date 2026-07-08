import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BookService } from './bookService';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'desk-book-test-'));
}

describe('BookService', () => {
  let dir: string;
  let svc: BookService;

  beforeEach(() => {
    dir = tmpDir();
    svc = new BookService(dir);
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('slugify converts title to kebab-case', () => {
    expect(svc.slugify('Backend Onboarding')).toBe('backend-onboarding');
    expect(svc.slugify('  Hello  World!! ')).toBe('hello-world');
    expect(svc.slugify('123')).toBe('123');
  });

  it('create + list round-trip', () => {
    const slug = svc.create('My Book');
    expect(slug).toBe('my-book');
    const books = svc.list();
    expect(books).toHaveLength(1);
    expect(books[0]).toEqual({ slug: 'my-book', title: 'My Book', pageCount: 0 });
  });

  it('create with explicit slug', () => {
    const slug = svc.create('My Book', 'custom-slug');
    expect(slug).toBe('custom-slug');
    expect(svc.get('custom-slug').title).toBe('My Book');
  });

  it('get throws on unknown slug', () => {
    expect(() => svc.get('nonexistent')).toThrow('book "nonexistent" not found');
  });

  it('isBook returns true for existing book, false otherwise', () => {
    svc.create('Test', 'test');
    expect(svc.isBook('test')).toBe(true);
    expect(svc.isBook('nope')).toBe(false);
  });

  it('delete removes folder and manifest', () => {
    svc.create('Del', 'del');
    svc.delete('del');
    expect(svc.isBook('del')).toBe(false);
  });

  it('delete throws on unknown slug', () => {
    expect(() => svc.delete('ghost')).toThrow('book "ghost" not found');
  });

  it('addChapter appends chapter', () => {
    svc.create('B', 'b');
    svc.addChapter('b', 'Chapter One');
    expect(svc.get('b').chapters).toHaveLength(1);
    expect(svc.get('b').chapters[0].title).toBe('Chapter One');
  });

  it('addChapter at position inserts at correct index', () => {
    svc.create('B', 'b');
    svc.addChapter('b', 'A');
    svc.addChapter('b', 'B');
    svc.addChapter('b', 'Middle', 1);
    const titles = svc.get('b').chapters.map(c => c.title);
    expect(titles).toEqual(['A', 'Middle', 'B']);
  });

  it('renameChapter updates title', () => {
    svc.create('B', 'b');
    svc.addChapter('b', 'Old');
    svc.renameChapter('b', 0, 'New');
    expect(svc.get('b').chapters[0].title).toBe('New');
  });

  it('renameChapter throws on bad index', () => {
    svc.create('B', 'b');
    expect(() => svc.renameChapter('b', 5, 'X')).toThrow('chapter index 5 out of range');
  });

  it('removeChapter removes chapter and deletes page files', () => {
    svc.create('B', 'b');
    svc.addChapter('b', 'Ch1');
    const pageFile = path.join(dir, 'b', 'intro.desk');
    fs.writeFileSync(pageFile, '<desk-page title="t"></desk-page>');
    svc.addPageToChapter('b', 'intro.desk', 0);
    svc.removeChapter('b', 0);
    expect(svc.get('b').chapters).toHaveLength(0);
    expect(fs.existsSync(pageFile)).toBe(false);
  });

  it('addPageToChapter + removePageFromManifest', () => {
    svc.create('B', 'b');
    svc.addChapter('b', 'Ch');
    svc.addPageToChapter('b', 'p1.desk', 0);
    expect(svc.get('b').chapters[0].pages).toContain('p1.desk');
    svc.removePageFromManifest('b', 'p1.desk');
    expect(svc.get('b').chapters[0].pages).toHaveLength(0);
  });

  it('addPageToChapter is idempotent', () => {
    svc.create('B', 'b');
    svc.addChapter('b', 'Ch');
    svc.addPageToChapter('b', 'p.desk', 0);
    svc.addPageToChapter('b', 'p.desk', 0);
    expect(svc.get('b').chapters[0].pages).toHaveLength(1);
  });

  it('movePage moves between chapters', () => {
    svc.create('B', 'b');
    svc.addChapter('b', 'Ch1');
    svc.addChapter('b', 'Ch2');
    svc.addPageToChapter('b', 'p.desk', 0);
    svc.movePage('b', 'p.desk', 1);
    const m = svc.get('b');
    expect(m.chapters[0].pages).toHaveLength(0);
    expect(m.chapters[1].pages).toContain('p.desk');
  });

  it('getFlatPageList returns pages in manifest order', () => {
    svc.create('B', 'b');
    svc.addChapter('b', 'Ch1');
    svc.addChapter('b', 'Ch2');
    svc.addPageToChapter('b', 'intro.desk', 0);
    svc.addPageToChapter('b', 'setup.desk', 0);
    svc.addPageToChapter('b', 'arch.desk', 1);
    expect(svc.getFlatPageList('b')).toEqual(['b/intro.desk', 'b/setup.desk', 'b/arch.desk']);
  });

  it('list returns empty array when pagesDir does not exist', () => {
    const empty = new BookService('/nonexistent/path');
    expect(empty.list()).toEqual([]);
  });
});
