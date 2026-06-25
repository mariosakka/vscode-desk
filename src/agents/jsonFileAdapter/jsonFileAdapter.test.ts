import * as fs from 'fs';
import { JsonFileAdapter } from './jsonFileAdapter';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

class TestAdapter extends JsonFileAdapter {
  readonly id = 'test';
  readonly label = 'Test Agent';
  readonly configDir = '/home/user/.testagent';
  readonly configPath = '/home/user/.testagent/config.json';
  protected buildEntry(port: number): Record<string, unknown> {
    return { type: 'http', url: `http://127.0.0.1:${port}/mcp` };
  }
}

class TestAdapterWithCli extends TestAdapter {
  cliCalled = false;
  private succeed: boolean;
  constructor(succeed: boolean) { super(); this.succeed = succeed; }
  protected async configureViaCli(_port: number): Promise<void | false> {
    this.cliCalled = true;
    if (this.succeed) return;
    return false;
  }
}

beforeEach(() => { jest.clearAllMocks(); });

describe('JsonFileAdapter', () => {
  describe('isInstalled()', () => {
    it('returns true when config directory exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      expect(await new TestAdapter().isInstalled()).toBe(true);
    });

    it('returns false when config directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(await new TestAdapter().isInstalled()).toBe(false);
    });
  });

  describe('isConfigured()', () => {
    it('returns true when serverKey exists in mcpServers', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ mcpServers: { 'vscode-desk': { url: 'http://127.0.0.1:3333/mcp' } } }),
      );
      expect(await new TestAdapter().isConfigured(3333)).toBe(true);
    });

    it('returns false when serverKey is absent from mcpServers', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ mcpServers: { 'other-server': {} } }),
      );
      expect(await new TestAdapter().isConfigured(3333)).toBe(false);
    });

    it('returns false when config file does not exist', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
      expect(await new TestAdapter().isConfigured(3333)).toBe(false);
    });
  });

  describe('configure()', () => {
    it('skips file patch when CLI succeeds', async () => {
      const adapter = new TestAdapterWithCli(true);
      await adapter.configure(3333);
      expect(adapter.cliCalled).toBe(true);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('falls back to file patch when CLI returns false', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      const adapter = new TestAdapterWithCli(false);
      await adapter.configure(3333);
      expect(adapter.cliCalled).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('creates new config with correct structure when file does not exist', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      await new TestAdapter().configure(3333);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/home/user/.testagent/config.json',
        JSON.stringify({ mcpServers: { 'vscode-desk': { type: 'http', url: 'http://127.0.0.1:3333/mcp' } } }, null, 2),
      );
    });

    it('merges into existing mcpServers without overwriting other entries', async () => {
      const existing = { mcpServers: { 'other-server': { url: 'http://127.0.0.1:9999/mcp' } } };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(existing));
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      await new TestAdapter().configure(3333);
      const written = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1] as string);
      expect(written.mcpServers['other-server']).toBeDefined();
      expect(written.mcpServers['vscode-desk']).toEqual({ type: 'http', url: 'http://127.0.0.1:3333/mcp' });
    });

    it('removes stale entries pointing to the same URL before writing', async () => {
      const existing = {
        mcpServers: {
          'vscode-fezzan': { url: 'http://127.0.0.1:3333/mcp' },
          'other-server': { url: 'http://127.0.0.1:9999/mcp' },
        },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(existing));
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      await new TestAdapter().configure(3333);
      const written = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1] as string);
      expect(written.mcpServers['vscode-fezzan']).toBeUndefined();
      expect(written.mcpServers['other-server']).toBeDefined();
      expect(written.mcpServers['vscode-desk']).toBeDefined();
    });

    it('creates parent directory before writing', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('ENOENT'); });
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      await new TestAdapter().configure(3333);
      expect(fs.mkdirSync).toHaveBeenCalledWith('/home/user/.testagent', { recursive: true });
    });
  });

  describe('skill defaults (no-ops)', () => {
    it('skillInstallPath is null by default', () => {
      expect(new TestAdapter().skillInstallPath).toBeNull();
    });

    it('isSkillInstalled returns false by default', async () => {
      expect(await new TestAdapter().isSkillInstalled('any-skill')).toBe(false);
    });

    it('installSkill resolves without error by default', async () => {
      await expect(new TestAdapter().installSkill('any-skill', 'content')).resolves.toBeUndefined();
    });

    it('uninstallSkill resolves without error by default', async () => {
      await expect(new TestAdapter().uninstallSkill('any-skill')).resolves.toBeUndefined();
    });
  });
});
