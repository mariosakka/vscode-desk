import * as vscode from 'vscode';
import { Bookmark, Tab, PortalData } from '../models';

const STORAGE_KEY = 'relay.data';

const DEFAULT_DATA: PortalData = { tabs: [] };

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export class DataService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  get(): PortalData {
    return this.context.globalState.get<PortalData>(STORAGE_KEY)
      ?? JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  save(data: PortalData): void {
    this.context.globalState.update(STORAGE_KEY, data);
  }

  addBookmark(tabId: string, fields: Omit<Bookmark, 'id'>): Bookmark {
    const data = this.get();
    const tab = data.tabs.find(t => t.id === tabId);
    if (!tab) throw new Error(`Tab not found: ${tabId}`);
    const bookmark: Bookmark = { id: generateId('bm'), ...fields };
    tab.bookmarks.push(bookmark);
    this.save(data);
    return bookmark;
  }

  removeBookmark(tabId: string, bookmarkId: string): void {
    const data = this.get();
    const tab = data.tabs.find(t => t.id === tabId);
    if (!tab) throw new Error(`Tab not found: ${tabId}`);
    tab.bookmarks = tab.bookmarks.filter(b => b.id !== bookmarkId);
    this.save(data);
  }

  createTab(name: string): Tab {
    const data = this.get();
    const tab: Tab = { id: generateId('tab'), name, bookmarks: [] };
    data.tabs.push(tab);
    this.save(data);
    return tab;
  }

  removeTab(tabId: string): void {
    const data = this.get();
    data.tabs = data.tabs.filter(t => t.id !== tabId);
    this.save(data);
  }

  updateBookmark(tabId: string, bookmarkId: string, fields: Partial<Omit<Bookmark, 'id'>>): Bookmark {
    const data = this.get();
    const tab = data.tabs.find(t => t.id === tabId);
    if (!tab) throw new Error(`Tab not found: ${tabId}`);
    const bm = tab.bookmarks.find(b => b.id === bookmarkId);
    if (!bm) throw new Error(`Bookmark not found: ${bookmarkId}`);
    Object.assign(bm, fields);
    this.save(data);
    return bm;
  }
}
