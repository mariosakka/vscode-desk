import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { PageReader } from './pageReader';

let pagesDir: string;
let reader: PageReader;

beforeEach(() => {
  pagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-pages-test-'));
  reader = new PageReader(pagesDir);
});

afterEach(() => {
  fs.rmSync(pagesDir, { recursive: true, force: true });
});

describe('filePath()', () => {
  it('returns pagesDir/filename for a flat filename', () => {
    expect(reader.filePath('page.desk')).toBe(path.join(pagesDir, 'page.desk'));
  });

  it('returns pagesDir/subdir/filename for one subdirectory', () => {
    expect(reader.filePath('book/page.desk')).toBe(path.join(pagesDir, 'book', 'page.desk'));
  });

  it('throws for path traversal with ..', () => {
    expect(() => reader.filePath('../escape.desk')).toThrow('Invalid page filename: ../escape.desk');
  });

  it('throws for three-part path', () => {
    expect(() => reader.filePath('a/b/c.desk')).toThrow('Invalid page filename: a/b/c.desk');
  });

  it('throws for current-dir segment', () => {
    expect(() => reader.filePath('./current.desk')).toThrow('Invalid page filename: ./current.desk');
  });
});

describe('write()', () => {
  it('creates the file in pagesDir for a flat filename', () => {
    reader.write('page.desk', 'My Page', '<p>hello</p>');
    expect(fs.existsSync(path.join(pagesDir, 'page.desk'))).toBe(true);
  });

  it('creates subdirectory and file for a nested filename', () => {
    reader.write('mybook/chapter.desk', 'Chapter', '<p>content</p>');
    expect(fs.existsSync(path.join(pagesDir, 'mybook', 'chapter.desk'))).toBe(true);
  });
});
