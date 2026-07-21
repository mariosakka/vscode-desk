import * as path from 'path';
import { readJson, writeJson } from '../../storage/jsonStore';

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

  constructor(private readonly dir: string) {}

  get(): WorkflowConfig | undefined {
    return readJson<WorkflowConfig | undefined>(path.join(this.dir, 'workflow.json'), undefined);
  }

  save(config: WorkflowConfig): void {
    writeJson(path.join(this.dir, 'workflow.json'), config);
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
