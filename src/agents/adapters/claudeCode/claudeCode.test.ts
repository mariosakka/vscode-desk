import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
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

describe('skill methods', () => {
  it('skillInstallPath points to ~/.claude/skills/', () => {
    const adapter = new ClaudeCodeAdapter();
    expect(adapter.skillInstallPath).toContain('.claude');
    expect(adapter.skillInstallPath).toContain('skills');
  });

  it('isSkillInstalled returns true when file exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    expect(await new ClaudeCodeAdapter().isSkillInstalled('dev-flow')).toBe(true);
  });

  it('isSkillInstalled returns false when file missing', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(await new ClaudeCodeAdapter().isSkillInstalled('dev-flow')).toBe(false);
  });

  it('installSkill writes <name>.md to skillInstallPath', async () => {
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().installSkill('dev-flow', 'body content');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('dev-flow.md'),
      'body content',
      'utf-8',
    );
  });

  it('uninstallSkill deletes the file when it exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().uninstallSkill('dev-flow');
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('dev-flow.md'));
  });

  it('uninstallSkill does nothing when file missing', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    await new ClaudeCodeAdapter().uninstallSkill('dev-flow');
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});
