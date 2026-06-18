import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import { JsonFileAdapter } from '../../jsonFileAdapter/jsonFileAdapter';
import { AgentId, ConfigDir, ConfigFile, CliBinary, McpTransport } from '../../constants';

export class ClaudeCodeAdapter extends JsonFileAdapter {
  readonly id = AgentId.ClaudeCode;
  readonly label = 'Claude Code';
  readonly configDir = path.join(os.homedir(), ConfigDir.ClaudeCode);
  readonly configPath = path.join(os.homedir(), '.claude.json');

  protected async configureViaCli(port: number): Promise<void | false> {
    try {
      childProcess.execSync(
        `${CliBinary.ClaudeCode} mcp add vscode-relay -t ${McpTransport.Http} http://127.0.0.1:${port}/mcp --scope user`,
        { stdio: 'pipe' },
      );
    } catch {
      return false;
    }
  }

  protected buildEntry(port: number): Record<string, unknown> {
    return { type: McpTransport.Http, url: `http://127.0.0.1:${port}/mcp` };
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
