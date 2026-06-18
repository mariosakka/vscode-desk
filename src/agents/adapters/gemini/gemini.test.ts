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

import { GeminiAdapter } from './gemini';

beforeEach(() => { jest.clearAllMocks(); });

describe('GeminiAdapter', () => {
  it('has correct configDir and configPath', () => {
    const a = new GeminiAdapter();
    expect(a.configDir).toBe(path.join(os.homedir(), '.gemini'));
    expect(a.configPath).toBe(path.join(os.homedir(), '.gemini', 'settings.json'));
  });

  it('writes entry with httpUrl (Gemini streamable HTTP format)', async () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new GeminiAdapter().configure(3333);
    const written = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1] as string);
    expect(written.mcpServers['vscode-relay']).toEqual({ httpUrl: 'http://127.0.0.1:3333/mcp' });
  });
});

describe('skill methods', () => {
  it('skillInstallPath points to ~/.gemini/skills/', () => {
    const adapter = new GeminiAdapter();
    expect(adapter.skillInstallPath).toContain('.gemini');
    expect(adapter.skillInstallPath).toContain('skills');
  });

  it('isSkillInstalled returns true when file exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    expect(await new GeminiAdapter().isSkillInstalled('dev-flow')).toBe(true);
  });

  it('isSkillInstalled returns false when file missing', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(await new GeminiAdapter().isSkillInstalled('dev-flow')).toBe(false);
  });

  it('installSkill writes <name>.md to skillInstallPath', async () => {
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new GeminiAdapter().installSkill('dev-flow', 'body content');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('dev-flow.md'),
      'body content',
      'utf-8',
    );
  });

  it('uninstallSkill deletes the file when it exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    await new GeminiAdapter().uninstallSkill('dev-flow');
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('dev-flow.md'));
  });

  it('uninstallSkill does nothing when file missing', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    await new GeminiAdapter().uninstallSkill('dev-flow');
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});
