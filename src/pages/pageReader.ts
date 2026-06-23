import * as fs from 'fs';
import * as path from 'path';

export interface PageMeta {
  filename: string;
  title: string;
}

export interface PageContent extends PageMeta {
  customStyles: string;
  bodyHtml: string;
}

export class PageReader {
  constructor(private readonly workspaceRoot: string) {}

  dir(): string {
    return path.join(this.workspaceRoot, 'fezzan-pages');
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
      .filter(f => f.endsWith('.fezzan'))
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

// ── Parsing ────────────────────────────────────────────────────────────────

function extractTitle(raw: string): string | null {
  const m = raw.match(/<fezzan-page[^>]*\stitle="([^"]*)"/i);
  return m ? m[1] : null;
}

function parse(filename: string, raw: string): PageContent {
  const title = extractTitle(raw) ?? stem(filename);

  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const customStyles = styleMatch ? styleMatch[1] : '';

  const bodyMatch = raw.match(/<fezzan-page[^>]*>([\s\S]*)<\/fezzan-page>/i);
  let body = bodyMatch ? bodyMatch[1] : raw;

  // Remove <style> and any stray <script> blocks from body
  body = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim();

  return { filename, title, customStyles, bodyHtml: body };
}

// ── Serialisation ──────────────────────────────────────────────────────────

function serialize(title: string, bodyHtml: string, customStyles: string): string {
  const styleBlock = customStyles.trim()
    ? `  <style>\n${customStyles.trim().split('\n').map(l => `    ${l}`).join('\n')}\n  </style>\n\n`
    : '';
  return `<fezzan-page title="${escAttr(title)}">\n${styleBlock}${bodyHtml}\n</fezzan-page>\n`;
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function stem(filename: string): string {
  return filename.replace(/\.fezzan$/, '');
}
