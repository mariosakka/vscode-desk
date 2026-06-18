import * as os from 'os';
import * as path from 'path';
import { JsonFileAdapter } from '../../jsonFileAdapter/jsonFileAdapter';
import { AgentId, ConfigDir, ConfigFile, McpTransport } from '../../constants';

export class CodexAdapter extends JsonFileAdapter {
  readonly id = AgentId.Codex;
  readonly label = 'Codex';
  readonly configDir = path.join(os.homedir(), ConfigDir.Codex);
  readonly configPath = path.join(os.homedir(), ConfigDir.Codex, ConfigFile.Codex);

  protected buildEntry(port: number): Record<string, unknown> {
    return { type: McpTransport.Http, url: `http://127.0.0.1:${port}/mcp` };
  }
}
