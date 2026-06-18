import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
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
    expect(written.mcpServers['vscode-relay']).toEqual({ type: 'http', url: 'http://127.0.0.1:3333/mcp' });
  });
});
