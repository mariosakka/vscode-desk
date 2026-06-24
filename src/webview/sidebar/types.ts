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
  portal: PortalData;
  pages: PageMeta[];
  workflow: WorkflowConfig | null;
  skills: SkillSummary[];
}

export interface SidebarData {
  workspaceName: string | null;
  workspace: ScopedData | null;
  global: ScopedData;
}
