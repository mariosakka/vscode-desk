export interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
  description: string;
}

export interface Tab {
  id: string;
  name: string;
  bookmarks: Bookmark[];
}

export interface PortalData {
  tabs: Tab[];
}

export type Scope = 'workspace' | 'global';
