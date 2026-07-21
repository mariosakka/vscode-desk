import { DataService } from './services/dataService/dataService';
import { PageReader } from './pages/pageReader';
import { WorkflowConfigService } from './services/workflowConfigService/workflowConfigService';
import { SkillRegistry } from './services/skillRegistry/skillRegistry';

export interface ServiceBundle {
  dataService: DataService;
  pageReader: PageReader | null;
  workflowService: WorkflowConfigService | null;
  skillRegistry: SkillRegistry | null;
}

export function resolveScope(
  scope: string | undefined,
  workspace: ServiceBundle | null,
  global: ServiceBundle,
): ServiceBundle {
  if (scope !== 'global' && workspace) return workspace;
  return global;
}

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

export interface SkillTool {
  name: string;
  description: string;
  command: string;
  args: Array<{ name: string; type: string; required?: boolean; description?: string }>;
}

export interface Skill {
  name: string;
  description: string;
  content: string;
  agents: string[];
  version: number;
  installedAt: number;
  tools?: SkillTool[];
}

export type SkillSummary = Omit<Skill, 'content'>;

export interface BookPageMeta {
  filename: string;
  title: string;
}

export interface BookChapterMeta {
  title: string;
  pages: BookPageMeta[];
}

export interface BookSummary {
  slug: string;
  title: string;
  chapters: BookChapterMeta[];
}

export interface ScopedData {
  data: DeskData;
  workflow: WorkflowConfig | null;
  skills: SkillSummary[];
  books: BookSummary[];
}

export interface SidebarData {
  workspaceName: string | null;
  workspace: ScopedData | null;
  global: ScopedData;
  pageTemplate: string | null;
  libraries: { name: string; description?: string; installed: boolean }[];
}
