import * as vscode from 'vscode';
import { AgentAdapter } from '../../agents/agentAdapter';

export interface Skill {
  name: string;
  description: string;
  content: string;
  agents: string[];
  version: number;
  installedAt: number;
}

export class SkillRegistry {
  private pending: { name: string; content: string; descriptionOverride?: string } | null = null;

  constructor(private readonly store: vscode.Memento, private readonly storageKey: string = 'astrolabe.skills') {}

  getAll(): Skill[] {
    return this.store.get<Skill[]>(this.storageKey) ?? [];
  }

  list(): Omit<Skill, 'content'>[] {
    return this.getAll().map(({ name, description, agents, version, installedAt }) => ({
      name, description, agents, version, installedAt,
    }));
  }

  get(name: string): Skill | null {
    return this.getAll().find(s => s.name === name) ?? null;
  }

  validateFrontmatter(content: string): { valid: boolean; error?: string } {
    const fm = parseFrontmatter(content);
    if (!fm.name) return { valid: false, error: 'Missing required field: name' };
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name)) {
      return { valid: false, error: 'name must be kebab-case (lowercase letters, digits, hyphens only)' };
    }
    if (!fm.description) return { valid: false, error: 'Missing required field: description' };
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

    const skill: Skill = { name: skillName, description, content, agents, version, installedAt: Date.now() };

    if (existingIdx >= 0) {
      skills[existingIdx] = skill;
    } else {
      skills.push(skill);
    }
    await this.store.update(this.storageKey, skills);

    const body = stripFrontmatter(content);
    await this.installOnAdapters(skillName, body, agents, adapters);
    this.pending = null;
  }

  async remove(name: string, adapters: AgentAdapter[]): Promise<void> {
    const skills = this.getAll();
    const idx = skills.findIndex(s => s.name === name);
    if (idx === -1) throw new Error(`Skill not found: ${name}`);
    skills.splice(idx, 1);
    await this.store.update(this.storageKey, skills);
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

function parseFrontmatter(content: string): {
  name?: string;
  description?: string;
  agents?: string[];
  version?: number;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const lines = match[1].split('\n');
  const result: { name?: string; description?: string; agents?: string[]; version?: number } = {};
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
    }
  }

  return result;
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
}
