import * as os from 'os';
import * as path from 'path';
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
}
