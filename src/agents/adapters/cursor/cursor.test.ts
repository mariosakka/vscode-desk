import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

import { CursorAdapter } from './cursor';

beforeEach(() => { jest.clearAllMocks(); });

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

describe('skill methods', () => {
  it('skillInstallPath is null when no workspace', () => {
    expect(new CursorAdapter(null).skillInstallPath).toBeNull();
  });

  it('skillInstallPath includes .cursor/rules when workspace provided', () => {
    const p = new CursorAdapter('/home/user/project').skillInstallPath;
    expect(p).toContain('.cursor');
    expect(p).toContain('rules');
  });

  it('isSkillInstalled returns false when no workspace', async () => {
    expect(await new CursorAdapter(null).isSkillInstalled('dev-flow')).toBe(false);
  });

  it('installSkill writes <name>.mdc wrapped in Cursor rule format', async () => {
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new CursorAdapter('/ws').installSkill('dev-flow', 'body content');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('dev-flow.mdc'),
      expect.stringContaining('body content'),
      'utf-8',
    );
    const written = (fs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
    expect(written).toMatch(/^---\n/);
  });

  it('installSkill does nothing when no workspace', async () => {
    await new CursorAdapter(null).installSkill('dev-flow', 'body');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('uninstallSkill deletes the .mdc file', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    await new CursorAdapter('/ws').uninstallSkill('dev-flow');
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('dev-flow.mdc'));
  });

  it('uninstallSkill does nothing when no workspace', async () => {
    await new CursorAdapter(null).uninstallSkill('dev-flow');
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});
