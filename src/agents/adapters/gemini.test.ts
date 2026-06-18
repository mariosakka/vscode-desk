import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
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
