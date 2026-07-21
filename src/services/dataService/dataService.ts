import * as fs from 'fs';
import * as path from 'path';
import { Bookmark, DeskData } from '../../models';
import { readJson, writeJson } from '../../storage/jsonStore';

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export class DataService {
  constructor(private readonly dir: string, private readonly defaultTemplatePath?: string) {}

  get(): DeskData {
    return readJson(path.join(this.dir, 'data.json'), { bookmarks: [] });
  }

  save(data: DeskData): void {
    writeJson(path.join(this.dir, 'data.json'), data);
  }

  addBookmark(fields: Omit<Bookmark, 'id'>): Bookmark {
    const data = this.get();
    const bookmark: Bookmark = { id: generateId('bm'), ...fields };
    data.bookmarks.push(bookmark);
    this.save(data);
    return bookmark;
  }

  removeBookmark(bookmarkId: string): void {
    const data = this.get();
    const exists = data.bookmarks.some(b => b.id === bookmarkId);
    if (!exists) throw new Error(`Bookmark not found: ${bookmarkId}`);
    data.bookmarks = data.bookmarks.filter(b => b.id !== bookmarkId);
    this.save(data);
  }

  updateBookmark(bookmarkId: string, fields: Partial<Omit<Bookmark, 'id'>>): Bookmark {
    const data = this.get();
    const bm = data.bookmarks.find(b => b.id === bookmarkId);
    if (!bm) throw new Error(`Bookmark not found: ${bookmarkId}`);
    Object.assign(bm, fields);
    this.save(data);
    return bm;
  }

  getPageTemplate(): string | null {
    try {
      return fs.readFileSync(path.join(this.dir, 'page-template.desk'), 'utf-8');
    } catch {
      if (this.defaultTemplatePath) {
        try { return fs.readFileSync(this.defaultTemplatePath, 'utf-8'); } catch {}
      }
      return null;
    }
  }

  setPageTemplate(content: string): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(path.join(this.dir, 'page-template.desk'), content, 'utf-8');
  }

  clearPageTemplate(): void {
    try { fs.unlinkSync(path.join(this.dir, 'page-template.desk')); } catch {}
  }

  getPageTemplateFilePath(): string {
    return path.join(this.dir, 'page-template.desk');
  }
}
