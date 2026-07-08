import * as fs from 'fs';
import * as path from 'path';
import { PageMeta, PageContent, extractTitle, parse, serialize, stem } from './pageFormat';

export type { PageMeta, PageContent };

export class PageReader {
  constructor(private readonly pagesDir: string) {}

  dir(): string {
    return this.pagesDir;
  }

  filePath(filename: string): string {
    const parts = filename.split('/');
    if (parts.length > 2 || parts.some(p => p === '..' || p === '.')) {
      throw new Error(`Invalid page filename: ${filename}`);
    }
    return path.join(this.pagesDir, ...parts);
  }

  list(): PageMeta[] {
    const d = this.dir();
    if (!fs.existsSync(d)) return [];
    return fs.readdirSync(d)
      .filter(f => f.endsWith('.desk'))
      .map(filename => {
        try {
          const raw = fs.readFileSync(path.join(d, filename), 'utf-8');
          return { filename, title: extractTitle(raw) ?? stem(filename) };
        } catch {
          return { filename, title: stem(filename) };
        }
      });
  }

  read(filename: string): PageContent {
    const raw = fs.readFileSync(path.join(this.dir(), filename), 'utf-8');
    return parse(filename, raw);
  }

  write(filename: string, title: string, bodyHtml: string, customStyles = ''): void {
    const p = this.filePath(filename);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, serialize(title, bodyHtml, customStyles), 'utf-8');
  }

  delete(filename: string): void {
    const p = path.join(this.dir(), filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
