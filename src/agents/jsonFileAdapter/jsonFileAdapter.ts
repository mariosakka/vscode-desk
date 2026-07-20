import * as fs from 'fs';
import * as path from 'path';
import { AgentAdapter } from '../agentAdapter';

export abstract class JsonFileAdapter implements AgentAdapter {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly configDir: string;
  abstract readonly configPath: string;

  protected readonly serverKey = 'vscode-desk';

  protected configureViaCli(_port: number): Promise<void | false> {
    return Promise.resolve(false);
  }

  protected abstract buildEntry(port: number): Record<string, unknown>;

  async isInstalled(): Promise<boolean> {
    return fs.existsSync(this.configDir);
  }

  async isConfigured(_port: number): Promise<boolean> {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      return !!(JSON.parse(raw)?.mcpServers?.[this.serverKey]);
    } catch {
      return false;
    }
  }

  async migrate(_port: number): Promise<void> {}

  async configure(port: number): Promise<void> {
    const result = await this.configureViaCli(port);
    if (result === false) {
      this.patchFile(port);
    }
  }

  private patchFile(port: number): void {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    } catch {
    }
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    const servers = config.mcpServers as Record<string, Record<string, unknown>>;
    const entry = this.buildEntry(port);
    const url = entry.url as string | undefined;
    if (url) {
      for (const name of Object.keys(servers)) {
        if (servers[name].url === url && name !== this.serverKey) {
          delete servers[name];
        }
      }
    }
    servers[this.serverKey] = entry;
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  get skillInstallPath(): string | null {
    return null;
  }

  async isSkillInstalled(_skillName: string): Promise<boolean> {
    return false;
  }

  async installSkill(_skillName: string, _content: string): Promise<void> {}

  async uninstallSkill(_skillName: string): Promise<void> {}
}
