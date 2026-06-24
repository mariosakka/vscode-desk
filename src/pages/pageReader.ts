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
    return path.join(this.pagesDir, filename);
  }

  private ensureDir(): void {
    const d = this.dir();
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  list(): PageMeta[] {
    const d = this.dir();
    if (!fs.existsSync(d)) return [];
    return fs.readdirSync(d)
      .filter(f => f.endsWith('.astrolabe'))
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
    this.ensureDir();
    fs.writeFileSync(path.join(this.dir(), filename), serialize(title, bodyHtml, customStyles), 'utf-8');
  }

  delete(filename: string): void {
    const p = path.join(this.dir(), filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
