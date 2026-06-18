import * as vscode from 'vscode';

export interface WorkflowConfig {
  slack: {
    status: string;
    general: string;
    weekly: string;
    pulse: string;
    deploy: string;
  };
  language: string;
  githubOrg: string;
  prAccount: string;
  identity?: {
    githubUsername: string;
    currentRepo: string;
  };
}

const STORAGE_KEY = 'relay.workflowConfig';

export class WorkflowConfigService {
  private pending: WorkflowConfig | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  get(): WorkflowConfig | undefined {
    return this.context.globalState.get<WorkflowConfig>(STORAGE_KEY);
  }

  save(config: WorkflowConfig): void {
    this.context.globalState.update(STORAGE_KEY, config);
  }

  setPending(incoming: Record<string, unknown>): void {
    const existing = (this.get() ?? {}) as Record<string, unknown>;
    this.pending = deepMerge(existing, incoming) as unknown as WorkflowConfig;
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

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null && sv !== undefined && typeof sv === 'object' && !Array.isArray(sv) &&
      tv !== null && tv !== undefined && typeof tv === 'object' && !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else if (sv !== undefined) {
      result[key] = sv;
    }
  }
  return result;
}
