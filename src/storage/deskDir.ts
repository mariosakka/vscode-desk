import * as os from 'os';
import * as path from 'path';

const ROOT = path.join(os.homedir(), '.desk');

export function globalDir(): string {
  return path.join(ROOT, 'global');
}

export function workspaceDir(workspaceName: string): string {
  const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return path.join(ROOT, 'workspaces', slug || 'default');
}
