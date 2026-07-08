import * as path from 'path';

jest.mock('child_process', () => ({ execSync: jest.fn() }));
jest.mock('fs', () => ({ existsSync: jest.fn() }));

import { execSync } from 'child_process';
import * as fs from 'fs';
import { resolveWorktree } from './worktreeResolver';

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

const WORKSPACE = '/home/user/projects/my-repo';

describe('resolveWorktree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isLinkedWorktree: false for a main checkout', () => {
    mockExecSync.mockReturnValue('.git\n' as any);
    mockExistsSync.mockReturnValue(true);

    const result = resolveWorktree(WORKSPACE);

    expect(result).toEqual({ isLinkedWorktree: false, mainWorktreePath: null });
  });

  it('returns isLinkedWorktree: true with mainWorktreePath for a linked worktree', () => {
    const mainWorktreeGitDir = '/home/user/projects/my-repo/.git/worktrees/feature-branch';
    mockExecSync.mockReturnValue(mainWorktreeGitDir + '\n' as any);
    mockExistsSync.mockReturnValue(true);

    const result = resolveWorktree('/home/user/projects/worktrees/feature-branch');

    expect(result.isLinkedWorktree).toBe(true);
    expect(result.mainWorktreePath).toBe(path.dirname(mainWorktreeGitDir));
  });

  it('returns isLinkedWorktree: false when git command fails', () => {
    mockExecSync.mockImplementation(() => { throw new Error('not a git repository'); });

    const result = resolveWorktree(WORKSPACE);

    expect(result).toEqual({ isLinkedWorktree: false, mainWorktreePath: null });
  });

  it('returns isLinkedWorktree: false when main worktree path does not exist', () => {
    const mainWorktreeGitDir = '/home/user/projects/my-repo/.git/worktrees/feature-branch';
    mockExecSync.mockReturnValue(mainWorktreeGitDir + '\n' as any);
    mockExistsSync.mockReturnValue(false);

    const result = resolveWorktree('/home/user/projects/worktrees/feature-branch');

    expect(result).toEqual({ isLinkedWorktree: false, mainWorktreePath: null });
  });

  it('returns isLinkedWorktree: false when git returns an empty string', () => {
    mockExecSync.mockReturnValue('\n' as any);

    const result = resolveWorktree(WORKSPACE);

    expect(result).toEqual({ isLinkedWorktree: false, mainWorktreePath: null });
  });
});
