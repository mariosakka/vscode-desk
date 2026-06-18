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

import { ClaudeCodeAdapter } from './adapters/claudeCode';
import { CursorAdapter } from './adapters/cursor';
import { CodexAdapter } from './adapters/codex';
import { GeminiAdapter } from './adapters/gemini';

beforeEach(() => { jest.clearAllMocks(); });

describe('ClaudeCodeAdapter', () => {
  it('has correct configDir and configPath', () => {
    const a = new ClaudeCodeAdapter();
    expect(a.configDir).toBe(path.join(os.homedir(), '.claude'));
    expect(a.configPath).toBe(path.join(os.homedir(), '.claude', 'settings.json'));
  });

  it('calls claude CLI with correct args and skips file write when CLI is available', async () => {
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    await new ClaudeCodeAdapter().configure(3333);
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'claude mcp add vscode-relay -t http http://127.0.0.1:3333/mcp',
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

  it('writes entry with type: http', async () => {
    (childProcess.execSync as jest.Mock).mockImplementation(() => { throw new Error('not found'); });
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    const written = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1] as string);
    expect(written.mcpServers['vscode-relay']).toEqual({ type: 'http', url: 'http://127.0.0.1:3333/mcp' });
  });
});

describe('CursorAdapter', () => {
  it('has correct configDir and configPath', () => {
    const a = new CursorAdapter();
    expect(a.configDir).toBe(path.join(os.homedir(), '.cursor'));
    expect(a.configPath).toBe(path.join(os.homedir(), '.cursor', 'mcp.json'));
  });

  it('writes entry without type field (Cursor format)', async () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new CursorAdapter().configure(3333);
    const written = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1] as string);
    expect(written.mcpServers['vscode-relay']).toEqual({ url: 'http://127.0.0.1:3333/mcp' });
    expect(written.mcpServers['vscode-relay'].type).toBeUndefined();
  });
});

describe('CodexAdapter', () => {
  it('has correct configDir and configPath', () => {
    const a = new CodexAdapter();
    expect(a.configDir).toBe(path.join(os.homedir(), '.codex'));
    expect(a.configPath).toBe(path.join(os.homedir(), '.codex', 'config.json'));
  });

  it('writes entry with type: http', async () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new CodexAdapter().configure(3333);
    const written = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1] as string);
    expect(written.mcpServers['vscode-relay']).toEqual({ type: 'http', url: 'http://127.0.0.1:3333/mcp' });
  });
});

describe('GeminiAdapter', () => {
  it('has correct configDir and configPath', () => {
    const a = new GeminiAdapter();
    expect(a.configDir).toBe(path.join(os.homedir(), '.gemini'));
    expect(a.configPath).toBe(path.join(os.homedir(), '.gemini', 'settings.json'));
  });

  it('writes entry with type: http', async () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new GeminiAdapter().configure(3333);
    const written = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1] as string);
    expect(written.mcpServers['vscode-relay']).toEqual({ type: 'http', url: 'http://127.0.0.1:3333/mcp' });
  });
});
