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

export class WorkflowConfigService {
  private pending: WorkflowConfig | null = null;

  constructor(private readonly store: vscode.Memento, private readonly storageKey: string = 'astrolabe.workflowConfig') {}

  get(): WorkflowConfig | undefined {
    return this.store.get<WorkflowConfig>(this.storageKey);
  }

  save(config: WorkflowConfig): void {
    this.store.update(this.storageKey, config);
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
