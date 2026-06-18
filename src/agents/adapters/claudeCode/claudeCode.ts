import * as os from 'os';
import * as path from 'path';
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
}
