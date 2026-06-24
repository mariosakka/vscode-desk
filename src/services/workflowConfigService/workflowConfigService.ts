import * as vscode from 'vscode';

export interface WorkflowChannel {
  label: string;
  channel: string;
}

export interface WorkflowSetting {
  label: string;
  value: string;
}

export interface WorkflowConfig {
  communication: WorkflowChannel[];
  general: WorkflowSetting[];
}

const STORAGE_KEY = 'astrolabe.workflowConfig';

export class WorkflowConfigService {
  private pending: WorkflowConfig | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  get(): WorkflowConfig | undefined {
    return this.context.globalState.get<WorkflowConfig>(STORAGE_KEY);
  }

  save(config: WorkflowConfig): void {
    this.context.globalState.update(STORAGE_KEY, config);
  }

  setPending(incoming: Partial<WorkflowConfig>): void {
    const existing = this.get() ?? { communication: [], general: [] };
    this.pending = { ...existing, ...incoming };
  }

  getPending(): WorkflowConfig | null {
    return this.pending;
  }

  confirmPending(): void {
    if (this.pending) {
      this.save(this.pending);
      this.pending = null;
    }
  }

  clearPending(): void {
    this.pending = null;
  }
}
