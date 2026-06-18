import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { JsonFileAdapter } from '../../jsonFileAdapter/jsonFileAdapter';
import { AgentId, ConfigDir, ConfigFile, McpTransport } from '../../constants';

export class CodexAdapter extends JsonFileAdapter {
  readonly id = AgentId.Codex;
  readonly label = 'Codex';
  readonly configDir = path.join(os.homedir(), ConfigDir.Codex);
  readonly configPath = path.join(os.homedir(), ConfigDir.Codex, ConfigFile.Codex);

  constructor(private readonly workspaceRoot: string | null = null) {
    super();
  }

  get skillInstallPath(): string | null {
    return this.workspaceRoot;
  }

  async isSkillInstalled(skillName: string): Promise<boolean> {
    if (!this.workspaceRoot) return false;
    const file = path.join(this.workspaceRoot, 'AGENTS.md');
    if (!fs.existsSync(file)) return false;
    return fs.readFileSync(file, 'utf-8').includes(`## Skill: ${skillName}`);
  }

  async installSkill(skillName: string, content: string): Promise<void> {
    if (!this.workspaceRoot) return;
    const file = path.join(this.workspaceRoot, 'AGENTS.md');
    const section = `## Skill: ${skillName}\n\n${content}`;

    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, 'utf-8');
      if (existing.includes(`## Skill: ${skillName}`)) {
        const updated = existing.replace(
          new RegExp(`## Skill: ${skillName}[\\s\\S]*?(?=\n## |$)`),
          section,
        );
        fs.writeFileSync(file, updated, 'utf-8');
      } else {
        const sep = existing.endsWith('\n') ? '\n' : '\n\n';
        fs.writeFileSync(file, existing + sep + section + '\n', 'utf-8');
      }
    } else {
      fs.writeFileSync(file, `# Agent Skills\n\n${section}\n`, 'utf-8');
    }
  }

  async uninstallSkill(skillName: string): Promise<void> {
    if (!this.workspaceRoot) return;
    const file = path.join(this.workspaceRoot, 'AGENTS.md');
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf-8');
    const updated = content.replace(
      new RegExp(`\n## Skill: ${skillName}[\\s\\S]*?(?=\n## |$)`),
      '',
    );
    if (updated !== content) fs.writeFileSync(file, updated, 'utf-8');
  }

  protected buildEntry(port: number): Record<string, unknown> {
    return { type: McpTransport.Http, url: `http://127.0.0.1:${port}/mcp` };
  }
}
