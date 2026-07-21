import * as path from 'path';
import { readJson, writeJson } from '../../storage/jsonStore';
import { PendingStore } from '../../storage/pendingStore';

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
  private readonly _pending = new PendingStore<WorkflowConfig>();

  constructor(private readonly dir: string) {}

  get(): WorkflowConfig | undefined {
    return readJson<WorkflowConfig | undefined>(path.join(this.dir, 'workflow.json'), undefined);
  }

  save(config: WorkflowConfig): void {
    writeJson(path.join(this.dir, 'workflow.json'), config);
  }

  setPending(incoming: Partial<WorkflowConfig>): void {
    const existing = this.get() ?? { communication: [], general: [] };
    this._pending.set({ ...existing, ...incoming });
  }

  getPending(): WorkflowConfig | null {
    return this._pending.get();
  }

  confirmPending(): void {
    const pending = this._pending.take();
    if (pending) {
      this.save(pending);
    }
  }

  clearPending(): void {
    this._pending.take();
  }
}
