export interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  bookmarks: Bookmark[];
}

export interface PortalData {
  projects: Project[];
}

export type Scope = 'workspace' | 'global';
