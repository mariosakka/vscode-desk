import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WorkflowConfigService } from './workflowConfigService';
import type { WorkflowConfig } from './workflowConfigService';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-wf-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const baseConfig: WorkflowConfig = {
  communication: [{ label: 'General', channel: '#general' }, { label: 'Deploys', channel: '#deploys' }],
  general: [{ label: 'Language', value: 'en' }, { label: 'Repo', value: 'my-repo' }],
};

describe('WorkflowConfigService', () => {
  it('returns undefined when no config saved', () => {
    expect(new WorkflowConfigService(tmpDir).get()).toBeUndefined();
  });

  it('saves and retrieves config', () => {
    const svc = new WorkflowConfigService(tmpDir);
    svc.save(baseConfig);
    expect(svc.get()).toEqual(baseConfig);
  });

  it('setPending merges top-level keys with existing', () => {
    const svc = new WorkflowConfigService(tmpDir);
    svc.save(baseConfig);
    svc.setPending({ general: [{ label: 'Language', value: 'ro' }] });
    expect(svc.getPending()?.general).toEqual([{ label: 'Language', value: 'ro' }]);
    expect(svc.getPending()?.communication).toEqual(baseConfig.communication);
  });

  it('setPending replaces entire array for provided keys', () => {
    const svc = new WorkflowConfigService(tmpDir);
    svc.save(baseConfig);
    const newComm = [{ label: 'Status', channel: '#status' }];
    svc.setPending({ communication: newComm });
    expect(svc.getPending()?.communication).toEqual(newComm);
    expect(svc.getPending()?.general).toEqual(baseConfig.general);
  });

  it('confirmPending persists and clears pending state', () => {
    const svc = new WorkflowConfigService(tmpDir);
    svc.setPending(baseConfig);
    svc.confirmPending();
    expect(svc.get()).toEqual(baseConfig);
    expect(svc.getPending()).toBeNull();
  });

  it('clearPending discards without saving', () => {
    const svc = new WorkflowConfigService(tmpDir);
    svc.setPending(baseConfig);
    svc.clearPending();
    expect(svc.getPending()).toBeNull();
    expect(svc.get()).toBeUndefined();
  });
});
