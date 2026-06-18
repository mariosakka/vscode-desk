import * as os from 'os';
import * as path from 'path';
import { JsonFileAdapter } from '../jsonFileAdapter';
import { AgentId, ConfigDir, ConfigFile } from '../constants';

export class CursorAdapter extends JsonFileAdapter {
  readonly id = AgentId.Cursor;
  readonly label = 'Cursor';
  readonly configDir = path.join(os.homedir(), ConfigDir.Cursor);
  readonly configPath = path.join(os.homedir(), ConfigDir.Cursor, ConfigFile.Cursor);

  protected buildEntry(port: number): Record<string, unknown> {
    return { url: `http://127.0.0.1:${port}/mcp` };
  }
}
