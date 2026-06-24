import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

import { CodexAdapter } from './codex';

beforeEach(() => { jest.clearAllMocks(); });

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
    expect(written.mcpServers['vscode-astrolabe']).toEqual({ type: 'http', url: 'http://127.0.0.1:3333/mcp' });
  });
});

describe('skill methods', () => {
  it('skillInstallPath is null when no workspace', () => {
    expect(new CodexAdapter(null).skillInstallPath).toBeNull();
  });

  it('skillInstallPath is workspace root when provided', () => {
    expect(new CodexAdapter('/ws').skillInstallPath).toBe('/ws');
  });

  it('isSkillInstalled returns false when no workspace', async () => {
    expect(await new CodexAdapter(null).isSkillInstalled('dev-flow')).toBe(false);
  });

  it('isSkillInstalled returns true when section found in AGENTS.md', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('# Agent Skills\n\n## Skill: dev-flow\n\nbody\n');
    expect(await new CodexAdapter('/ws').isSkillInstalled('dev-flow')).toBe(true);
  });

  it('installSkill creates AGENTS.md when it does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new CodexAdapter('/ws').installSkill('dev-flow', 'body');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/ws/AGENTS.md',
      expect.stringContaining('## Skill: dev-flow'),
      'utf-8',
    );
  });

  it('installSkill appends section to existing AGENTS.md', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('# Agent Skills\n\nsome content\n');
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new CodexAdapter('/ws').installSkill('dev-flow', 'body');
    const written = (fs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
    expect(written).toContain('## Skill: dev-flow');
    expect(written).toContain('some content');
  });

  it('installSkill does nothing when no workspace', async () => {
    await new CodexAdapter(null).installSkill('dev-flow', 'body');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('uninstallSkill removes the section from AGENTS.md', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      '# Agent Skills\n\n## Skill: dev-flow\n\nbody\n\n## Skill: other\n\nother body\n',
    );
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    await new CodexAdapter('/ws').uninstallSkill('dev-flow');
    const written = (fs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
    expect(written).not.toContain('## Skill: dev-flow');
    expect(written).toContain('## Skill: other');
  });

  it('uninstallSkill does nothing when no workspace', async () => {
    await new CodexAdapter(null).uninstallSkill('dev-flow');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});
