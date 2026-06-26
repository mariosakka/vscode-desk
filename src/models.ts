export interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
  description: string;
}

export interface DeskData {
  bookmarks: Bookmark[];
}

export type Scope = 'workspace' | 'global';
