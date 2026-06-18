import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));
jest.mock('child_process', () => ({ execSync: jest.fn() }));

import { ClaudeCodeAdapter } from './claudeCode';

beforeEach(() => { jest.clearAllMocks(); });

describe('ClaudeCodeAdapter', () => {
  it('has correct configDir and configPath', () => {
    const a = new ClaudeCodeAdapter();
    expect(a.configDir).toBe(path.join(os.homedir(), '.claude'));
    expect(a.configPath).toBe(path.join(os.homedir(), '.claude.json'));
  });

  it('calls claude CLI with --scope user and skips file write when CLI is available', async () => {
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    await new ClaudeCodeAdapter().configure(3333);
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'claude mcp add vscode-relay -t http http://127.0.0.1:3333/mcp --scope user',
      { stdio: 'pipe' },
    );
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('falls back to file patch when CLI throws', async () => {
    (childProcess.execSync as jest.Mock).mockImplementation(() => { throw new Error('not found'); });
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('writes to ~/.claude.json with type: http entry on file fallback', async () => {
    (childProcess.execSync as jest.Mock).mockImplementation(() => { throw new Error('not found'); });
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(os.homedir(), '.claude.json'),
      expect.any(String),
    );
    const written = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1] as string);
    expect(written.mcpServers['vscode-relay']).toEqual({ type: 'http', url: 'http://127.0.0.1:3333/mcp' });
  });
});
