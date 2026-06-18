import * as vscode from 'vscode';
import { AgentAdapter } from './agentAdapter';

export class AgentRegistry {
  constructor(
    private readonly adapters: AgentAdapter[],
    private readonly context: vscode.ExtensionContext,
  ) {}

  async showSetupPrompt(port: number): Promise<void> {
    if (this.context.globalState.get('relay.agentSetupDismissed')) return;
    await this.runPrompt(port, false);
  }

  async showSetupPromptForced(port: number): Promise<void> {
    await this.runPrompt(port, true);
  }

  private async runPrompt(port: number, fromCommand: boolean): Promise<void> {
    const candidates = await this.findUnconfigured(port);
    if (candidates.length === 0) {
      if (fromCommand) {
        vscode.window.showInformationMessage('Relay: all detected agents are already configured.');
      }
      return;
    }

    const action = await vscode.window.showInformationMessage(
      `Relay detected ${candidates.length} AI agent(s). Set up MCP integration?`,
      'Set up',
      'Not now',
      "Don't ask again",
    );

    if (action === "Don't ask again") {
      await this.context.globalState.update('relay.agentSetupDismissed', true);
    }
    if (action !== 'Set up') return;

    const picks = await vscode.window.showQuickPick(
      candidates.map(a => ({ label: a.label, picked: true, adapter: a })),
      { canPickMany: true, placeHolder: 'Select agents to configure' },
    );
    if (!picks?.length) return;

    const results = await Promise.allSettled(
      (picks as Array<{ label: string; picked: boolean; adapter: AgentAdapter }>)
        .map(p => p.adapter.configure(port)),
    );
    const failed = results.filter(r => r.status === 'rejected');
    const ok = results.length - failed.length;

    if (ok > 0) vscode.window.showInformationMessage(`Relay: configured ${ok} agent(s).`);
    if (failed.length > 0) vscode.window.showErrorMessage(`Relay: failed to configure ${failed.length} agent(s).`);
  }

  private async findUnconfigured(port: number): Promise<AgentAdapter[]> {
    const checks = await Promise.all(
      this.adapters.map(async a => ({
        adapter: a,
        show: (await a.isInstalled()) && !(await a.isConfigured(port)),
      })),
    );
    return checks.filter(c => c.show).map(c => c.adapter);
  }
}
