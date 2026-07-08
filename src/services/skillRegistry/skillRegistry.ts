import * as fs from 'fs';
import * as path from 'path';
import { AgentAdapter } from '../../agents/agentAdapter';

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

const BUILT_IN_TOOL_NAMES = new Set([
  'list_bookmarks', 'add_bookmark', 'remove_bookmark', 'update_bookmark',
  'list_pages', 'create_page', 'update_page', 'delete_page',
  'get_workflow_config', 'submit_workflow_config',
  'list_skills', 'get_skill', 'add_skill', 'remove_skill',
  'get_page_template', 'set_page_template',
  'list_libraries', 'add_library', 'remove_library',
  'list_sections', 'add_section', 'update_section', 'remove_section',
  'list_items', 'add_list_item', 'remove_list_item', 'update_list_item', 'set_list_type',
  'list_section_types', 'register_section_type', 'remove_section_type',
  'create_book', 'list_books', 'get_book', 'delete_book',
  'add_chapter', 'rename_chapter', 'remove_chapter', 'move_page',
]);

export class SkillRegistry {
  private pending: { name: string; content: string; descriptionOverride?: string } | null = null;

  constructor(private readonly dir: string) {}

  private readAll(): Skill[] {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.dir, 'skills.json'), 'utf-8'));
    } catch {
      return [];
    }
  }

  private writeAll(skills: Skill[]): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(path.join(this.dir, 'skills.json'), JSON.stringify(skills, null, 2), 'utf-8');
  }

  getAll(): Skill[] {
    return this.readAll();
  }

  list(): Omit<Skill, 'content'>[] {
    return this.getAll().map(({ name, description, agents, version, installedAt, tools }) => ({
      name, description, agents, version, installedAt, tools,
    }));
  }

  get(name: string): Skill | null {
    return this.getAll().find(s => s.name === name) ?? null;
  }

  getAllTools(): SkillTool[] {
    return this.getAll().flatMap(s => s.tools ?? []);
  }

  validateFrontmatter(content: string): { valid: boolean; error?: string } {
    const fm = parseFrontmatter(content);
    if (!fm.name) return { valid: false, error: 'Missing required field: name' };
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name)) {
      return { valid: false, error: 'name must be kebab-case (lowercase letters, digits, hyphens only)' };
    }
    if (!fm.description) return { valid: false, error: 'Missing required field: description' };
    if (fm.tools) {
      for (const tool of fm.tools) {
        if (!/^[a-z0-9_-]+$/.test(tool.name)) {
          return { valid: false, error: `tool name "${tool.name}" must be kebab-case or snake_case` };
        }
        if (BUILT_IN_TOOL_NAMES.has(tool.name)) {
          return { valid: false, error: `tool name "${tool.name}" conflicts with a built-in Desk tool` };
        }
        const argNames = new Set((tool.args ?? []).map(a => a.name));
        const placeholders = [...(tool.command?.matchAll(/\{(\w+)\}/g) ?? [])].map(m => m[1]);
        for (const ph of placeholders) {
          if (!argNames.has(ph)) {
            return { valid: false, error: `tool "${tool.name}": placeholder {${ph}} has no matching arg` };
          }
        }
        for (const arg of tool.args ?? []) {
          if (!placeholders.includes(arg.name)) {
            return { valid: false, error: `tool "${tool.name}": arg "${arg.name}" not used in command template` };
          }
        }
      }
    }
    return { valid: true };
  }

  setPending(name: string, content: string, descriptionOverride?: string): void {
    this.pending = { name, content, descriptionOverride };
  }

  getPending(): { name: string; content: string; descriptionOverride?: string } | null {
    return this.pending;
  }

  clearPending(): void {
    this.pending = null;
  }

  getPendingToolSummary(): string | null {
    if (!this.pending) return null;
    const fm = parseFrontmatter(this.pending.content);
    if (!fm.tools?.length) return null;
    return fm.tools.map(t => `• ${t.name}: ${t.command}`).join('\n');
  }

  async confirmPending(adapters: AgentAdapter[]): Promise<void> {
    if (!this.pending) return;
    const { name, content, descriptionOverride } = this.pending;
    const fm = parseFrontmatter(content);
    const skillName = fm.name ?? name;
    const description = descriptionOverride ?? fm.description ?? '';
    const agents = fm.agents ?? ['all'];

    const skills = this.getAll();
    const existingIdx = skills.findIndex(s => s.name === skillName);
    const version = existingIdx >= 0 ? skills[existingIdx].version + 1 : (fm.version ?? 1);

    const skill: Skill = {
      name: skillName,
      description,
      content,
      agents,
      version,
      installedAt: Date.now(),
      tools: fm.tools ?? [],
    };

    if (existingIdx >= 0) {
      skills[existingIdx] = skill;
    } else {
      skills.push(skill);
    }
    this.writeAll(skills);

    const body = stripFrontmatter(content);
    await this.installOnAdapters(skillName, body, agents, adapters);
    this.pending = null;
  }

  async remove(name: string, adapters: AgentAdapter[]): Promise<void> {
    const skills = this.getAll();
    const idx = skills.findIndex(s => s.name === name);
    if (idx === -1) throw new Error(`Skill not found: ${name}`);
    skills.splice(idx, 1);
    this.writeAll(skills);
    await Promise.all(adapters.map(a => a.uninstallSkill(name).catch(() => {})));
  }

  async installAll(adapters: AgentAdapter[]): Promise<void> {
    for (const skill of this.getAll()) {
      const body = stripFrontmatter(skill.content);
      await this.installOnAdapters(skill.name, body, skill.agents, adapters);
    }
  }

  private async installOnAdapters(
    name: string,
    body: string,
    agents: string[],
    adapters: AgentAdapter[],
  ): Promise<void> {
    const targets = agents.includes('all') ? adapters : adapters.filter(a => agents.includes(a.id));
    await Promise.all(targets.map(a => a.installSkill(name, body).catch(() => {})));
  }
}

function parseToolsBlock(lines: string[], startIndex: number): SkillTool[] {
  const tools: SkillTool[] = [];
  let i = startIndex;
  let currentTool: (Partial<SkillTool> & { args: SkillTool['args'] }) | null = null;
  let inArgs = false;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s{2}-\s+name:/.test(line)) {
      if (currentTool?.name) tools.push(currentTool as SkillTool);
      currentTool = { name: line.replace(/^\s*-\s+name:\s*/, '').trim(), args: [] };
      inArgs = false;
    } else if (currentTool && /^\s{4}description:/.test(line)) {
      currentTool.description = line.replace(/^\s*description:\s*/, '').trim().replace(/^["']|["']$/g, '');
    } else if (currentTool && /^\s{4}command:/.test(line)) {
      currentTool.command = line.replace(/^\s*command:\s*/, '').trim().replace(/^["']|["']$/g, '');
    } else if (currentTool && /^\s{4}args:/.test(line)) {
      inArgs = true;
    } else if (inArgs && /^\s{6}-/.test(line)) {
      const argLine = line.replace(/^\s*-\s*/, '').trim();
      const nameM = argLine.match(/name:\s*(\S+)/);
      const typeM = argLine.match(/type:\s*(\S+)/);
      const reqM = argLine.match(/required:\s*(true|false)/);
      const descM = argLine.match(/description:\s*["']?([^"',}]+)/);
      if (nameM) {
        currentTool!.args.push({
          name: nameM[1].replace(/,\}?$/, ''),
          type: typeM?.[1].replace(/,\}?$/, '') ?? 'string',
          required: reqM ? reqM[1] === 'true' : false,
          description: descM?.[1].trim(),
        });
      }
    } else if (line.length > 0 && !/^\s/.test(line)) {
      break;
    }
    i++;
  }

  if (currentTool?.name) tools.push(currentTool as SkillTool);
  return tools;
}

function parseFrontmatter(content: string): {
  name?: string;
  description?: string;
  agents?: string[];
  version?: number;
  tools?: SkillTool[];
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const lines = match[1].split('\n');
  const result: { name?: string; description?: string; agents?: string[]; version?: number; tools?: SkillTool[] } = {};
  let collectingAgents = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (collectingAgents && /^\s+-\s+/.test(line)) {
      result.agents = [...(result.agents ?? []), line.replace(/^\s+-\s+/, '').trim()];
      continue;
    }
    collectingAgents = false;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    switch (key) {
      case 'name':
        result.name = rawValue;
        break;
      case 'description':
        if (rawValue === '>-') {
          const parts: string[] = [];
          while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
            parts.push(lines[++i].trim());
          }
          result.description = parts.join(' ');
        } else {
          result.description = rawValue;
        }
        break;
      case 'agents':
        if (rawValue === 'all') {
          result.agents = ['all'];
        } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
          result.agents = rawValue.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
        } else if (rawValue === '') {
          result.agents = [];
          collectingAgents = true;
        }
        break;
      case 'version':
        result.version = parseInt(rawValue, 10);
        break;
      case 'tools':
        result.tools = parseToolsBlock(lines, i + 1);
        break;
    }
  }

  return result;
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
}
