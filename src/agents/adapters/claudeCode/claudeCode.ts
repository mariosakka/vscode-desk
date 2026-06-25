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
    try {
      childProcess.execSync(
        `${CliBinary.ClaudeCode} mcp add vscode-desk -t ${McpTransport.Http} http://127.0.0.1:${port}/mcp --scope user`,
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
    return fs.existsSync(path.join(this.skillInstallPath, `${skillName}.md`));
  }

  async installSkill(skillName: string, content: string): Promise<void> {
    fs.mkdirSync(this.skillInstallPath, { recursive: true });
    fs.writeFileSync(path.join(this.skillInstallPath, `${skillName}.md`), content, 'utf-8');
  }

  async uninstallSkill(skillName: string): Promise<void> {
    const p = path.join(this.skillInstallPath, `${skillName}.md`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
