import * as os from 'os';
import * as path from 'path';
import { JsonFileAdapter } from '../jsonFileAdapter';
import { AgentId, ConfigDir, ConfigFile, McpTransport } from '../constants';

export class GeminiAdapter extends JsonFileAdapter {
  readonly id = AgentId.Gemini;
  readonly label = 'Gemini CLI';
  readonly configDir = path.join(os.homedir(), ConfigDir.Gemini);
  readonly configPath = path.join(os.homedir(), ConfigDir.Gemini, ConfigFile.Gemini);

  protected buildEntry(port: number): Record<string, unknown> {
    return { type: McpTransport.Http, url: `http://127.0.0.1:${port}/mcp` };
  }
}
