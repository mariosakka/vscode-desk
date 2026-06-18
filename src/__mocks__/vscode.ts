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
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    registerWebviewViewProvider: jest.fn(),
    showTextDocument: jest.fn().mockResolvedValue(undefined),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({ get: jest.fn() })),
    openTextDocument: jest.fn().mockResolvedValue({}),
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
