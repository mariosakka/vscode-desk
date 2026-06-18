import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { JsonFileAdapter } from '../../jsonFileAdapter/jsonFileAdapter';
import { AgentId, ConfigDir, ConfigFile } from '../../constants';

export class GeminiAdapter extends JsonFileAdapter {
  readonly id = AgentId.Gemini;
  readonly label = 'Gemini CLI';
  readonly configDir = path.join(os.homedir(), ConfigDir.Gemini);
  readonly configPath = path.join(os.homedir(), ConfigDir.Gemini, ConfigFile.Gemini);

  protected buildEntry(port: number): Record<string, unknown> {
    return { httpUrl: `http://127.0.0.1:${port}/mcp` };
  }

  get skillInstallPath(): string {
    return path.join(os.homedir(), '.gemini', 'skills');
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
