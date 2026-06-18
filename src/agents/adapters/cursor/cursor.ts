import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { JsonFileAdapter } from '../../jsonFileAdapter/jsonFileAdapter';
import { AgentId, ConfigDir, ConfigFile } from '../../constants';

export class CursorAdapter extends JsonFileAdapter {
  readonly id = AgentId.Cursor;
  readonly label = 'Cursor';
  readonly configDir = path.join(os.homedir(), ConfigDir.Cursor);
  readonly configPath = path.join(os.homedir(), ConfigDir.Cursor, ConfigFile.Cursor);

  constructor(private readonly workspaceRoot: string | null = null) {
    super();
  }

  get skillInstallPath(): string | null {
    return this.workspaceRoot ? path.join(this.workspaceRoot, '.cursor', 'rules') : null;
  }

  async isSkillInstalled(skillName: string): Promise<boolean> {
    if (!this.skillInstallPath) return false;
    return fs.existsSync(path.join(this.skillInstallPath, `${skillName}.mdc`));
  }

  async installSkill(skillName: string, content: string): Promise<void> {
    if (!this.skillInstallPath) return;
    fs.mkdirSync(this.skillInstallPath, { recursive: true });
    const wrapped = `---\ndescription: ${skillName}\n---\n\n${content}`;
    fs.writeFileSync(path.join(this.skillInstallPath, `${skillName}.mdc`), wrapped, 'utf-8');
  }

  async uninstallSkill(skillName: string): Promise<void> {
    if (!this.skillInstallPath) return;
    const p = path.join(this.skillInstallPath, `${skillName}.mdc`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  protected buildEntry(port: number): Record<string, unknown> {
    return { url: `http://127.0.0.1:${port}/mcp` };
  }
}
