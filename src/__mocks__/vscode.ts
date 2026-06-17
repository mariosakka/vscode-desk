const vscode = {
  ExtensionContext: class {
    globalState = {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
  },
  window: {
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    showErrorMessage: jest.fn(),
    registerWebviewViewProvider: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({ get: jest.fn() })),
  },
  env: {
    openExternal: jest.fn(),
  },
  Uri: {
    parse: jest.fn((s: string) => s),
    joinPath: jest.fn((...parts: string[]) => parts.join('/')),
  },
  commands: {
    registerCommand: jest.fn(),
  },
  WebviewViewProvider: class {},
};

module.exports = vscode;
