import { WorkflowConfigService } from './workflowConfigService';
import type { WorkflowConfig } from './workflowConfigService';

const makeCtx = () => {
  const store: Record<string, unknown> = {};
  return {
    globalState: {
      get: <T>(key: string) => store[key] as T | undefined,
      update: (key: string, value: unknown) => { store[key] = value; },
    },
  } as any;
};

const baseConfig: WorkflowConfig = {
  slack: { status: '#status', general: '#general', weekly: '#weekly', pulse: '#pulse', deploy: '#deploy' },
  language: 'en',
  githubOrg: 'acme',
  prAccount: 'acme-bot',
};

describe('WorkflowConfigService', () => {
  it('returns undefined when no config saved', () => {
    expect(new WorkflowConfigService(makeCtx()).get()).toBeUndefined();
  });

  it('saves and retrieves config', () => {
    const svc = new WorkflowConfigService(makeCtx());
    svc.save(baseConfig);
    expect(svc.get()).toEqual(baseConfig);
  });

  it('setPending merges top-level field with existing', () => {
    const svc = new WorkflowConfigService(makeCtx());
    svc.save(baseConfig);
    svc.setPending({ language: 'ro' });
    expect(svc.getPending()?.language).toBe('ro');
    expect(svc.getPending()?.githubOrg).toBe('acme');
  });

  it('setPending deep-merges nested slack fields', () => {
    const svc = new WorkflowConfigService(makeCtx());
    svc.save(baseConfig);
    svc.setPending({ slack: { status: '#new' } });
    expect(svc.getPending()?.slack.status).toBe('#new');
    expect(svc.getPending()?.slack.general).toBe('#general');
  });

  it('confirmPending persists and clears pending state', () => {
    const svc = new WorkflowConfigService(makeCtx());
    svc.setPending(baseConfig as any);
    svc.confirmPending();
    expect(svc.get()).toEqual(baseConfig);
    expect(svc.getPending()).toBeNull();
  });

  it('clearPending discards without saving', () => {
    const svc = new WorkflowConfigService(makeCtx());
    svc.setPending(baseConfig as any);
    svc.clearPending();
    expect(svc.getPending()).toBeNull();
    expect(svc.get()).toBeUndefined();
  });
});
