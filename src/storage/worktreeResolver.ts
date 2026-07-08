import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface WorktreeInfo {
  isLinkedWorktree: boolean;
  mainWorktreePath: string | null;
}

export function resolveWorktree(workspacePath: string): WorktreeInfo {
  try {
    const result = execSync('git rev-parse --git-common-dir', {
      cwd: workspacePath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!result) return { isLinkedWorktree: false, mainWorktreePath: null };

    const commonDir = path.isAbsolute(result)
      ? result
      : path.resolve(workspacePath, result);

    const isInsideWorkspace = commonDir.startsWith(workspacePath + path.sep) ||
      commonDir === path.join(workspacePath, '.git');

    if (isInsideWorkspace) {
      return { isLinkedWorktree: false, mainWorktreePath: null };
    }

    const mainWorktreePath = path.dirname(commonDir);
    if (!fs.existsSync(mainWorktreePath)) {
      return { isLinkedWorktree: false, mainWorktreePath: null };
    }

    return { isLinkedWorktree: true, mainWorktreePath };
  } catch {
    return { isLinkedWorktree: false, mainWorktreePath: null };
  }
}
