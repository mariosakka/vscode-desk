import * as fs from 'fs';
import * as path from 'path';

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
    try {
      return JSON.parse(fs.readFileSync(path.join(this.dir, 'workflow.json'), 'utf-8'));
    } catch {
      return undefined;
    }
  }

  save(config: WorkflowConfig): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(path.join(this.dir, 'workflow.json'), JSON.stringify(config, null, 2), 'utf-8');
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
