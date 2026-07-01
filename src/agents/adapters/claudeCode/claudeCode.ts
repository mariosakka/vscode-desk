import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import { JsonFileAdapter } from '../../jsonFileAdapter/jsonFileAdapter';
import { AgentId, ConfigDir, ConfigFile, CliBinary, McpTransport } from '../../constants';
import { TOOLS } from '../../../mcp/toolSchemas';

export class ClaudeCodeAdapter extends JsonFileAdapter {
  readonly id = AgentId.ClaudeCode;
  readonly label = 'Claude Code';
  readonly configDir = path.join(os.homedir(), ConfigDir.ClaudeCode);
  readonly configPath = path.join(os.homedir(), '.claude.json');

  private get settingsPath(): string {
    return path.join(os.homedir(), ConfigDir.ClaudeCode, ConfigFile.ClaudeCode);
  }

  protected async configureViaCli(port: number): Promise<void | false> {
    const url = `http://127.0.0.1:${port}/mcp`;

    try {
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      const servers = (config?.mcpServers ?? {}) as Record<string, Record<string, unknown>>;
      for (const [name, entry] of Object.entries(servers)) {
        if (entry.url === url && name !== this.serverKey) {
          childProcess.execSync(`${CliBinary.ClaudeCode} mcp remove ${name} -s user`, { stdio: 'pipe' });
        }
      }
    } catch { /* config unreadable or remove failed — proceed anyway */ }

    try {
      childProcess.execSync(
        `${CliBinary.ClaudeCode} mcp add ${this.serverKey} -t ${McpTransport.Http} ${url} --scope user`,
        { stdio: 'pipe' },
      );
    } catch {
      return false;
    }
  }

  protected buildEntry(port: number): Record<string, unknown> {
    return { type: McpTransport.Http, url: `http://127.0.0.1:${port}/mcp` };
  }

  async configure(port: number): Promise<void> {
    await super.configure(port);
    this.patchPermissions();
  }

  private patchPermissions(): void {
    const toolPermissions = TOOLS.map(t => `mcp__vscode-desk__${t.name}`);
    let settings: Record<string, unknown> = {};
    try {
      settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'));
    } catch {
      // file doesn't exist or invalid — start fresh
    }
    const permissions = (settings.permissions ?? {}) as Record<string, unknown>;
    const existing = Array.isArray(permissions.allow) ? (permissions.allow as string[]) : [];
    const toAdd = toolPermissions.filter(p => !existing.includes(p));
    if (toAdd.length === 0) { return; }
    permissions.allow = [...existing, ...toAdd];
    settings.permissions = permissions;
    fs.mkdirSync(path.dirname(this.settingsPath), { recursive: true });
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
  }

  get skillInstallPath(): string {
    return path.join(this.configDir, 'skills');
  }

  async isSkillInstalled(skillName: string): Promise<boolean> {
    try { fs.lstatSync(path.join(this.skillInstallPath, skillName)); return true; } catch { return false; }
  }

  async installSkill(skillName: string, content: string): Promise<void> {
    const skillDir = path.join(os.homedir(), '.my-agent-skills', skillName);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8');
    fs.mkdirSync(this.skillInstallPath, { recursive: true });
    const linkPath = path.join(this.skillInstallPath, skillName);
    try { fs.unlinkSync(linkPath); } catch {}
    try { fs.unlinkSync(path.join(this.skillInstallPath, `${skillName}.md`)); } catch {}
    fs.symlinkSync(skillDir, linkPath);
  }

  async uninstallSkill(skillName: string): Promise<void> {
    try { fs.unlinkSync(path.join(this.skillInstallPath, skillName)); } catch {}
    try { fs.unlinkSync(path.join(this.skillInstallPath, `${skillName}.md`)); } catch {}
  }
}
