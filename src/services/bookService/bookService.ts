import * as fs from 'fs';
import * as path from 'path';

export interface BookChapter {
  title: string;
  pages: string[];
}

export interface BookManifest {
  title: string;
  chapters: BookChapter[];
}

export class BookService {
  constructor(private readonly pagesDir: string) {}

  private manifestPath(slug: string): string {
    return path.join(this.pagesDir, slug, 'book.json');
  }

  slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'book';
  }

  list(): Array<{ slug: string; title: string; pageCount: number }> {
    if (!fs.existsSync(this.pagesDir)) return [];
    return fs.readdirSync(this.pagesDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .flatMap(e => {
        try {
          const m = this.get(e.name);
          return [{ slug: e.name, title: m.title, pageCount: m.chapters.reduce((s, c) => s + c.pages.length, 0) }];
        } catch { return []; }
      });
  }

  get(slug: string): BookManifest {
    const p = this.manifestPath(slug);
    if (!fs.existsSync(p)) throw new Error(`book "${slug}" not found`);
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }

  isBook(slug: string): boolean {
    return fs.existsSync(this.manifestPath(slug));
  }

  create(title: string, slug?: string): string {
    const s = slug ?? this.slugify(title);
    fs.mkdirSync(path.join(this.pagesDir, s), { recursive: true });
    this.saveManifest(s, { title, chapters: [] });
    return s;
  }

  delete(slug: string): void {
    this.get(slug);
    fs.rmSync(path.join(this.pagesDir, slug), { recursive: true, force: true });
  }

  addChapter(slug: string, title: string, position?: number): void {
    const m = this.get(slug);
    const ch: BookChapter = { title, pages: [] };
    if (position !== undefined) m.chapters.splice(position, 0, ch);
    else m.chapters.push(ch);
    this.saveManifest(slug, m);
  }

  renameChapter(slug: string, chapterIndex: number, title: string): void {
    const m = this.get(slug);
    this.assertChapterIndex(m, chapterIndex);
    m.chapters[chapterIndex].title = title;
    this.saveManifest(slug, m);
  }

  removeChapter(slug: string, chapterIndex: number): void {
    const m = this.get(slug);
    this.assertChapterIndex(m, chapterIndex);
    for (const page of m.chapters[chapterIndex].pages) {
      const p = path.join(this.pagesDir, slug, page);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    m.chapters.splice(chapterIndex, 1);
    this.saveManifest(slug, m);
  }

  addPageToChapter(slug: string, filename: string, chapterIndex: number): void {
    const m = this.get(slug);
    this.assertChapterIndex(m, chapterIndex);
    if (!m.chapters[chapterIndex].pages.includes(filename)) {
      m.chapters[chapterIndex].pages.push(filename);
    }
    this.saveManifest(slug, m);
  }

  removePageFromManifest(slug: string, filename: string): void {
    const m = this.get(slug);
    for (const ch of m.chapters) {
      const idx = ch.pages.indexOf(filename);
      if (idx >= 0) { ch.pages.splice(idx, 1); break; }
    }
    this.saveManifest(slug, m);
  }

  movePage(slug: string, filename: string, toChapter: number, position?: number): void {
    const m = this.get(slug);
    this.assertChapterIndex(m, toChapter);
    for (const ch of m.chapters) {
      const idx = ch.pages.indexOf(filename);
      if (idx >= 0) { ch.pages.splice(idx, 1); break; }
    }
    if (position !== undefined) m.chapters[toChapter].pages.splice(position, 0, filename);
    else m.chapters[toChapter].pages.push(filename);
    this.saveManifest(slug, m);
  }

  getFlatPageList(slug: string): string[] {
    const m = this.get(slug);
    return m.chapters.flatMap(c => c.pages.map(p => `${slug}/${p}`));
  }

  private assertChapterIndex(m: BookManifest, idx: number): void {
    if (idx < 0 || idx >= m.chapters.length) {
      throw new Error(`chapter index ${idx} out of range (book has ${m.chapters.length} chapters)`);
    }
  }

  private saveManifest(slug: string, m: BookManifest): void {
    fs.writeFileSync(this.manifestPath(slug), JSON.stringify(m, null, 2), 'utf-8');
  }
}
