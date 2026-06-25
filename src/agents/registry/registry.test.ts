import * as vscode from 'vscode';
import { AgentRegistry } from './registry';
import { AgentAdapter } from '../agentAdapter';

function makeAdapter(installed: boolean, configured: boolean): AgentAdapter & { configure: jest.Mock } {
  return {
    id: 'test',
    label: 'Test Agent',
    isInstalled: jest.fn().mockResolvedValue(installed),
    isConfigured: jest.fn().mockResolvedValue(configured),
    configure: jest.fn().mockResolvedValue(undefined),
    skillInstallPath: null,
    isSkillInstalled: jest.fn().mockResolvedValue(false),
    installSkill: jest.fn().mockResolvedValue(undefined),
    uninstallSkill: jest.fn().mockResolvedValue(undefined),
  };
}

const mockContext = {
  globalState: {
    get: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  },
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockContext.globalState.get.mockReturnValue(false);
});

describe('AgentRegistry', () => {
  describe('showSetupPrompt()', () => {
    it('does nothing when dismissed flag is set', async () => {
      mockContext.globalState.get.mockReturnValue(true);
      const registry = new AgentRegistry([makeAdapter(true, false)], mockContext);
      await registry.showSetupPrompt(3333);
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('does not show prompt when no agents are installed', async () => {
      const registry = new AgentRegistry([makeAdapter(false, false)], mockContext);
      await registry.showSetupPrompt(3333);
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('does not show prompt when all installed agents are already configured', async () => {
      const registry = new AgentRegistry([makeAdapter(true, true)], mockContext);
      await registry.showSetupPrompt(3333);
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('shows prompt when unconfigured agents are found', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
      const registry = new AgentRegistry([makeAdapter(true, false)], mockContext);
      await registry.showSetupPrompt(3333);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Desk detected 1 AI agent(s). Set up MCP integration?',
        'Set up',
        'Not now',
        "Don't ask again",
      );
    });

    it('sets dismissed flag when user chooses "Don\'t ask again"', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue("Don't ask again");
      const registry = new AgentRegistry([makeAdapter(true, false)], mockContext);
      await registry.showSetupPrompt(3333);
      expect(mockContext.globalState.update).toHaveBeenCalledWith('desk.agentSetupDismissed', true);
    });

    it('calls configure on each selected adapter', async () => {
      const adapter = makeAdapter(true, false);
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Set up');
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue([
        { label: 'Test Agent', picked: true, adapter },
      ]);
      const registry = new AgentRegistry([adapter], mockContext);
      await registry.showSetupPrompt(3333);
      expect(adapter.configure).toHaveBeenCalledWith(3333);
    });

    it('shows success message after configuration', async () => {
      const adapter = makeAdapter(true, false);
      (vscode.window.showInformationMessage as jest.Mock)
        .mockResolvedValueOnce('Set up')
        .mockResolvedValue(undefined);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue([
        { label: 'Test Agent', picked: true, adapter },
      ]);
      const registry = new AgentRegistry([adapter], mockContext);
      await registry.showSetupPrompt(3333);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Desk: configured 1 agent(s).',
      );
    });

    it('shows error message when an adapter fails to configure', async () => {
      const adapter = makeAdapter(true, false);
      adapter.configure.mockRejectedValue(new Error('write failed'));
      (vscode.window.showInformationMessage as jest.Mock)
        .mockResolvedValueOnce('Set up')
        .mockResolvedValue(undefined);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue([
        { label: 'Test Agent', picked: true, adapter },
      ]);
      const registry = new AgentRegistry([adapter], mockContext);
      await registry.showSetupPrompt(3333);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Desk: failed to configure 1 agent(s).',
      );
    });
  });

  describe('showSetupPromptForced()', () => {
    it('ignores dismissed flag and shows prompt', async () => {
      mockContext.globalState.get.mockReturnValue(true);
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
      const registry = new AgentRegistry([makeAdapter(true, false)], mockContext);
      await registry.showSetupPromptForced(3333);
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('shows setup prompt even when all agents are already configured', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
      const registry = new AgentRegistry([makeAdapter(true, true)], mockContext);
      await registry.showSetupPromptForced(3333);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Desk detected'),
        'Set up',
        'Not now',
        "Don't ask again",
      );
    });
  });
});

const makeSkillRegistry = (skillCount: number) => ({
  list: jest.fn().mockReturnValue(Array.from({ length: skillCount }, (_, i) => ({
    name: `skill-${i}`, description: 'desc', agents: ['all'], version: 1, installedAt: 0,
  }))),
  getAll: jest.fn().mockReturnValue([]),
  installAll: jest.fn().mockResolvedValue(undefined),
});

describe('AgentRegistry — showSkillInstallPrompt()', () => {
  it('does nothing when dismissed flag is set', async () => {
    mockContext.globalState.get.mockImplementation((key: string) =>
      key === 'desk.workflowSkillDismissed' ? true : false,
    );
    const skillReg = makeSkillRegistry(1);
    const registry = new AgentRegistry([makeAdapter(true, true)], mockContext, skillReg as any);
    await registry.showSkillInstallPrompt();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('does nothing when no skills are stored', async () => {
    const skillReg = makeSkillRegistry(0);
    const registry = new AgentRegistry([makeAdapter(true, true)], mockContext, skillReg as any);
    await registry.showSkillInstallPrompt();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('shows prompt when skills exist and flag is not set', async () => {
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
    const skillReg = makeSkillRegistry(2);
    const registry = new AgentRegistry([makeAdapter(true, true)], mockContext, skillReg as any);
    await registry.showSkillInstallPrompt();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Desk has 2 workflow skill(s) ready. Install on detected agents?',
      'Install',
      'Not now',
      "Don't ask again",
    );
  });

  it('sets dismissed flag when user chooses "Don\'t ask again"', async () => {
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue("Don't ask again");
    const skillReg = makeSkillRegistry(1);
    const registry = new AgentRegistry([makeAdapter(true, true)], mockContext, skillReg as any);
    await registry.showSkillInstallPrompt();
    expect(mockContext.globalState.update).toHaveBeenCalledWith('desk.workflowSkillDismissed', true);
  });

  it('calls installAll on skillRegistry when user clicks Install', async () => {
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Install');
    const skillReg = makeSkillRegistry(1);
    const adapter = makeAdapter(true, true);
    const registry = new AgentRegistry([adapter], mockContext, skillReg as any);
    await registry.showSkillInstallPrompt();
    expect(skillReg.installAll).toHaveBeenCalled();
  });
});
