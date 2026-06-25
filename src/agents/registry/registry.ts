import * as vscode from 'vscode';
import { AgentAdapter } from '../agentAdapter';
import { SkillRegistry } from '../../services/skillRegistry/skillRegistry';

export class AgentRegistry {
  constructor(
    private readonly adapters: AgentAdapter[],
    private readonly context: vscode.ExtensionContext,
    private readonly skillRegistry: SkillRegistry | null = null,
  ) {}

  async showSetupPrompt(port: number): Promise<void> {
    if (this.context.globalState.get('desk.agentSetupDismissed')) return;
    await this.runPrompt(port, false);
  }

  async showSetupPromptForced(port: number): Promise<void> {
    await this.runPrompt(port, true);
  }

  async showSkillInstallPrompt(): Promise<void> {
    if (this.context.globalState.get<boolean>('desk.workflowSkillDismissed')) return;
    const skills = this.skillRegistry?.list() ?? [];
    if (skills.length === 0) return;
    await this.runSkillPrompt(skills.length);
  }

  async showSkillInstallPromptForced(): Promise<void> {
    const skills = this.skillRegistry?.list() ?? [];
    if (skills.length === 0) {
      vscode.window.showInformationMessage('Desk: no workflow skills stored yet.');
      return;
    }
    await this.runSkillPrompt(skills.length);
  }

  private async runSkillPrompt(count: number): Promise<void> {
    const action = await vscode.window.showInformationMessage(
      `Desk has ${count} workflow skill(s) ready. Install on detected agents?`,
      'Install',
      'Not now',
      "Don't ask again",
    );
    if (action === "Don't ask again") {
      await this.context.globalState.update('desk.workflowSkillDismissed', true);
    }
    if (action !== 'Install') return;
    const installed = await this.findInstalled();
    if (installed.length === 0) {
      vscode.window.showInformationMessage('Desk: no installed agents found.');
      return;
    }
    await this.skillRegistry?.installAll(installed);
    await this.context.globalState.update('desk.workflowSkillDismissed', true);
    vscode.window.showInformationMessage(`Desk: installed ${count} skill(s) on ${installed.length} agent(s).`);
  }

  private async findInstalled(): Promise<AgentAdapter[]> {
    const results = await Promise.all(
      this.adapters.map(async a => ({ adapter: a, ok: await a.isInstalled() })),
    );
    return results.filter(r => r.ok).map(r => r.adapter);
  }

  private async runPrompt(port: number, fromCommand: boolean): Promise<void> {
    const candidates = fromCommand
      ? await this.findInstalled()
      : await this.findUnconfigured(port);
    if (candidates.length === 0) {
      if (fromCommand) {
        vscode.window.showInformationMessage('Desk: no installed agents found.');
      }
      return;
    }

    const action = await vscode.window.showInformationMessage(
      `Desk detected ${candidates.length} AI agent(s). Set up MCP integration?`,
      'Set up',
      'Not now',
      "Don't ask again",
    );

    if (action === "Don't ask again") {
      await this.context.globalState.update('desk.agentSetupDismissed', true);
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

    if (ok > 0) vscode.window.showInformationMessage(`Desk: configured ${ok} agent(s).`);
    if (failed.length > 0) vscode.window.showErrorMessage(`Desk: failed to configure ${failed.length} agent(s).`);
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
