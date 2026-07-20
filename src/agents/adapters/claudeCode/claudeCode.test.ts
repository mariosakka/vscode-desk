import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  lstatSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  symlinkSync: jest.fn(),
}));
jest.mock('child_process', () => ({ execSync: jest.fn() }));

import { ClaudeCodeAdapter } from './claudeCode';
import { TOOLS, McpTool } from '../../../mcp/toolSchemas';

const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
const mcpConfigPath = path.join(os.homedir(), '.claude.json');

beforeEach(() => { jest.clearAllMocks(); });

describe('ClaudeCodeAdapter', () => {
  it('has correct configDir and configPath', () => {
    const a = new ClaudeCodeAdapter();
    expect(a.configDir).toBe(path.join(os.homedir(), '.claude'));
    expect(a.configPath).toBe(mcpConfigPath);
  });

  it('calls claude CLI with --scope user when CLI is available', async () => {
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'claude mcp add vscode-desk -t http http://127.0.0.1:3333/mcp --scope user',
      { stdio: 'pipe' },
    );
  });

  it('removes stale MCP entries pointing to the same URL before registering', async () => {
    const staleConfig = {
      mcpServers: {
        'vscode-fezzan': { url: 'http://127.0.0.1:3333/mcp' },
        'other-server': { url: 'http://127.0.0.1:9999/mcp' },
      },
    };
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    (fs.readFileSync as jest.Mock).mockImplementation((p: string) => {
      if (p === mcpConfigPath) { return JSON.stringify(staleConfig); }
      throw new Error('ENOENT');
    });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    const calls = (childProcess.execSync as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('claude mcp remove vscode-fezzan -s user');
    expect(calls.some((c: unknown) => (c as string).includes('mcp remove other-server'))).toBe(false);
  });

  it('falls back to file patch when CLI throws', async () => {
    (childProcess.execSync as jest.Mock).mockImplementation(() => { throw new Error('not found'); });
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    const calls = (fs.writeFileSync as jest.Mock).mock.calls;
    const mcpCall = calls.find((c: unknown[]) => c[0] === mcpConfigPath);
    expect(mcpCall).toBeDefined();
  });

  it('writes to ~/.claude.json with type: http entry on file fallback', async () => {
    (childProcess.execSync as jest.Mock).mockImplementation(() => { throw new Error('not found'); });
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    const calls = (fs.writeFileSync as jest.Mock).mock.calls;
    const mcpCall = calls.find((c: unknown[]) => c[0] === mcpConfigPath);
    const written = JSON.parse(mcpCall![1] as string);
    expect(written.mcpServers['vscode-desk']).toEqual({ type: 'http', url: 'http://127.0.0.1:3333/mcp' });
  });
});

describe('patchPermissions', () => {
  it('writes all desk tool permissions to ~/.claude/settings.json', async () => {
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    const calls = (fs.writeFileSync as jest.Mock).mock.calls;
    const settingsCall = calls.find((c: unknown[]) => c[0] === settingsPath);
    expect(settingsCall).toBeDefined();
    const written = JSON.parse(settingsCall![1] as string);
    const expected = TOOLS.map((t: McpTool) => `mcp__vscode-desk__${t.name}`);
    expect(written.permissions.allow).toEqual(expect.arrayContaining(expected));
  });

  it('merges with existing permissions without duplicating', async () => {
    const existing = { permissions: { allow: ['mcp__vscode-desk__list_projects', 'Bash(git *)'] } };
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    (fs.readFileSync as jest.Mock).mockImplementation((p: string) => {
      if (p === settingsPath) { return JSON.stringify(existing); }
      throw new Error('ENOENT');
    });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    const calls = (fs.writeFileSync as jest.Mock).mock.calls;
    const settingsCall = calls.find((c: unknown[]) => c[0] === settingsPath);
    const written = JSON.parse(settingsCall![1] as string);
    const allow: string[] = written.permissions.allow;
    expect(allow.filter(p => p === 'mcp__vscode-desk__list_projects')).toHaveLength(1);
    expect(allow).toContain('Bash(git *)');
  });

  it('skips write when all permissions already present', async () => {
    const allPerms = TOOLS.map((t: McpTool) => `mcp__vscode-desk__${t.name}`);
    const existing = { permissions: { allow: allPerms } };
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    (fs.readFileSync as jest.Mock).mockImplementation((p: string) => {
      if (p === settingsPath) { return JSON.stringify(existing); }
      throw new Error('ENOENT');
    });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().configure(3333);
    const calls = (fs.writeFileSync as jest.Mock).mock.calls;
    const settingsCall = calls.find((c: unknown[]) => c[0] === settingsPath);
    expect(settingsCall).toBeUndefined();
  });
});

describe('skill methods', () => {
  it('skillInstallPath points to ~/.claude/skills/', () => {
    const adapter = new ClaudeCodeAdapter();
    expect(adapter.skillInstallPath).toContain('.claude');
    expect(adapter.skillInstallPath).toContain('skills');
  });

  it('isSkillInstalled returns true when symlink/dir exists', async () => {
    (fs.lstatSync as jest.Mock).mockReturnValue({});
    expect(await new ClaudeCodeAdapter().isSkillInstalled('dev-flow')).toBe(true);
  });

  it('isSkillInstalled returns false when missing', async () => {
    (fs.lstatSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    expect(await new ClaudeCodeAdapter().isSkillInstalled('dev-flow')).toBe(false);
  });

  it('installSkill writes SKILL.md to my-agent-skills dir and creates symlink', async () => {
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.symlinkSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().installSkill('dev-flow', 'body content');
    const skillDir = path.join(os.homedir(), '.my-agent-skills', 'dev-flow');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(skillDir, 'SKILL.md'),
      'body content',
      'utf-8',
    );
    expect(fs.symlinkSync).toHaveBeenCalledWith(
      skillDir,
      path.join(os.homedir(), '.claude', 'skills', 'dev-flow'),
    );
  });

  it('uninstallSkill removes symlink and old flat .md', async () => {
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    await new ClaudeCodeAdapter().uninstallSkill('dev-flow');
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      path.join(os.homedir(), '.claude', 'skills', 'dev-flow'),
    );
  });

  it('uninstallSkill does not throw when paths are missing', async () => {
    (fs.unlinkSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    await expect(new ClaudeCodeAdapter().uninstallSkill('dev-flow')).resolves.toBeUndefined();
  });
});

describe('migrate', () => {
  it('replaces old stdio proxy entry with direct HTTP via CLI', async () => {
    const oldConfig = {
      mcpServers: {
        'vscode-desk': { type: 'stdio', command: 'node', args: ['/home/user/.desk/desk-proxy.js'], env: {} },
      },
    };
    (fs.readFileSync as jest.Mock).mockImplementation((p: string) => {
      if (p === mcpConfigPath) return JSON.stringify(oldConfig);
      throw new Error('ENOENT');
    });
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    await new ClaudeCodeAdapter().migrate(3334);
    const calls = (childProcess.execSync as jest.Mock).mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls).toContain('claude mcp remove vscode-desk --scope user');
    expect(calls).toContain('claude mcp add vscode-desk -t http http://127.0.0.1:3334/mcp --scope user');
  });

  it('does nothing when entry is already HTTP', async () => {
    const httpConfig = {
      mcpServers: { 'vscode-desk': { type: 'http', url: 'http://127.0.0.1:3334/mcp' } },
    };
    (fs.readFileSync as jest.Mock).mockImplementation((p: string) => {
      if (p === mcpConfigPath) return JSON.stringify(httpConfig);
      throw new Error('ENOENT');
    });
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    await new ClaudeCodeAdapter().migrate(3334);
    expect(childProcess.execSync).not.toHaveBeenCalled();
  });

  it('does nothing when entry is absent', async () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (childProcess.execSync as jest.Mock).mockReturnValue('');
    await new ClaudeCodeAdapter().migrate(3334);
    expect(childProcess.execSync).not.toHaveBeenCalled();
  });
});
