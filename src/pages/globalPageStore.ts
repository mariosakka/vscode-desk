import * as vscode from 'vscode';
import { PageMeta, PageContent, extractTitle, parse, serialize, stem } from './pageFormat';

const STORAGE_KEY = 'astrolabe.global.pages';
type PageMap = Record<string, string>; // filename → serialized content

export class GlobalPageStore {
  constructor(private readonly store: vscode.Memento) {}

  list(): PageMeta[] {
    const map = this.store.get<PageMap>(STORAGE_KEY) ?? {};
    return Object.entries(map).map(([filename, raw]) => ({
      filename,
      title: extractTitle(raw) ?? stem(filename),
    }));
  }

  read(filename: string): PageContent {
    const map = this.store.get<PageMap>(STORAGE_KEY) ?? {};
    const raw = map[filename];
    if (!raw) throw new Error(`Global page not found: ${filename}`);
    return parse(filename, raw);
  }

  write(filename: string, title: string, bodyHtml: string, customStyles = ''): void {
    const map = this.store.get<PageMap>(STORAGE_KEY) ?? {};
    map[filename] = serialize(title, bodyHtml, customStyles);
    this.store.update(STORAGE_KEY, map);
  }

  delete(filename: string): void {
    const map = this.store.get<PageMap>(STORAGE_KEY) ?? {};
    delete map[filename];
    this.store.update(STORAGE_KEY, map);
  }

  filePath(_filename: string): null {
    return null;
  }
}
