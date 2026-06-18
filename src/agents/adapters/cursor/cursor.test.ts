import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
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
