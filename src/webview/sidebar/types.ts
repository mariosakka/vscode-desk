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

export interface PageMeta {
  filename: string;
  title: string;
}

export interface WorkflowChannel {
  label: string;
  channel: string;
}

export interface WorkflowSetting {
  label: string;
  value: string;
}

export interface WorkflowConfig {
  communication: WorkflowChannel[];
  general: WorkflowSetting[];
}

export interface SkillSummary {
  name: string;
  description: string;
  agents: string[];
  version: number;
  installedAt: number;
}

export type Scope = 'workspace' | 'global';

export interface ScopedData {
  data: DeskData;
  pages: PageMeta[];
  workflow: WorkflowConfig | null;
  skills: SkillSummary[];
}

export interface LibraryEntry {
  name: string;
  description?: string;
  installed: boolean;
}

export interface SidebarData {
  workspaceName: string | null;
  workspace: ScopedData | null;
  global: ScopedData;
  pageTemplate: string | null;
  libraries: LibraryEntry[];
}
