import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SkillRegistry } from './skillRegistry';
import type { AgentAdapter } from '../../agents/agentAdapter';

let tmpDir: string;
beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astrolabe-sr-')); });
afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

const makeAdapter = (id: string): jest.Mocked<AgentAdapter> => ({
  id,
  label: id,
  isInstalled: jest.fn().mockResolvedValue(true),
  isConfigured: jest.fn().mockResolvedValue(true),
  configure: jest.fn().mockResolvedValue(undefined),
  skillInstallPath: `/tmp/${id}/skills`,
  isSkillInstalled: jest.fn().mockResolvedValue(false),
  installSkill: jest.fn().mockResolvedValue(undefined),
  uninstallSkill: jest.fn().mockResolvedValue(undefined),
});

const VALID_SKILL = `---
name: dev-flow
description: Team dev workflow skill
agents: all
version: 1
---

Call \`get_workflow_config\` at startup.
`;

describe('SkillRegistry', () => {
  it('returns empty list when no skills stored', () => {
    const reg = new SkillRegistry(tmpDir);
    expect(reg.getAll()).toEqual([]);
    expect(reg.list()).toEqual([]);
  });

  describe('validateFrontmatter()', () => {
    it('accepts valid frontmatter', () => {
      expect(new SkillRegistry(tmpDir).validateFrontmatter(VALID_SKILL).valid).toBe(true);
    });

    it('rejects missing name field', () => {
      const content = '---\ndescription: Some desc\n---\nbody';
      const result = new SkillRegistry(tmpDir).validateFrontmatter(content);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/name/);
    });

    it('rejects non-kebab-case name', () => {
      const content = '---\nname: My Skill\ndescription: desc\n---\nbody';
      const result = new SkillRegistry(tmpDir).validateFrontmatter(content);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/kebab/);
    });

    it('rejects missing description field', () => {
      const content = '---\nname: dev-flow\n---\nbody';
      const result = new SkillRegistry(tmpDir).validateFrontmatter(content);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/description/);
    });

    it('parses multi-line description block scalar correctly', () => {
      const content = `---\nname: dev-flow\ndescription: >-\n  First line.\n  Second line.\nagents: all\n---\nbody`;
      const result = new SkillRegistry(tmpDir).validateFrontmatter(content);
      expect(result.valid).toBe(true);
    });
  });

  describe('confirmPending()', () => {
    it('stores skill and calls installSkill on matching adapters', async () => {
      const reg = new SkillRegistry(tmpDir);
      const adapter = makeAdapter('claude-code');
      reg.setPending('dev-flow', VALID_SKILL);
      await reg.confirmPending([adapter]);
      expect(reg.getAll()).toHaveLength(1);
      expect(reg.getAll()[0].name).toBe('dev-flow');
      expect(adapter.installSkill).toHaveBeenCalledWith('dev-flow', expect.any(String));
    });

    it('increments version when same name resubmitted', async () => {
      const reg = new SkillRegistry(tmpDir);
      const adapter = makeAdapter('claude-code');
      reg.setPending('dev-flow', VALID_SKILL);
      await reg.confirmPending([adapter]);
      reg.setPending('dev-flow', VALID_SKILL);
      await reg.confirmPending([adapter]);
      expect(reg.getAll()[0].version).toBe(2);
    });

    it('only installs on adapter matching agents filter', async () => {
      const reg = new SkillRegistry(tmpDir);
      const specific = VALID_SKILL.replace('agents: all', 'agents: [claude-code]');
      const claude = makeAdapter('claude-code');
      const cursor = makeAdapter('cursor');
      reg.setPending('dev-flow', specific);
      await reg.confirmPending([claude, cursor]);
      expect(claude.installSkill).toHaveBeenCalled();
      expect(cursor.installSkill).not.toHaveBeenCalled();
    });

    it('strips frontmatter before passing to installSkill', async () => {
      const reg = new SkillRegistry(tmpDir);
      const adapter = makeAdapter('claude-code');
      reg.setPending('dev-flow', VALID_SKILL);
      await reg.confirmPending([adapter]);
      const body = (adapter.installSkill.mock.calls[0] as [string, string])[1];
      expect(body).not.toContain('---');
      expect(body).toContain('get_workflow_config');
    });

    it('clears pending after confirmation', async () => {
      const reg = new SkillRegistry(tmpDir);
      reg.setPending('dev-flow', VALID_SKILL);
      await reg.confirmPending([]);
      expect(reg.getPending()).toBeNull();
    });

    it('uses descriptionOverride when provided', async () => {
      const reg = new SkillRegistry(tmpDir);
      reg.setPending('dev-flow', VALID_SKILL, 'Custom override description');
      await reg.confirmPending([]);
      expect(reg.getAll()[0].description).toBe('Custom override description');
    });

    it('captures multi-line description block scalar', async () => {
      const content = `---\nname: dev-flow\ndescription: >-\n  First line.\n  Second line.\nagents: all\n---\nbody`;
      const reg = new SkillRegistry(tmpDir);
      reg.setPending('dev-flow', content);
      await reg.confirmPending([]);
      expect(reg.getAll()[0].description).toBe('First line. Second line.');
    });
  });

  describe('remove()', () => {
    it('removes skill and calls uninstallSkill on adapters', async () => {
      const reg = new SkillRegistry(tmpDir);
      const adapter = makeAdapter('claude-code');
      reg.setPending('dev-flow', VALID_SKILL);
      await reg.confirmPending([adapter]);
      await reg.remove('dev-flow', [adapter]);
      expect(reg.getAll()).toHaveLength(0);
      expect(adapter.uninstallSkill).toHaveBeenCalledWith('dev-flow');
    });

    it('throws when skill name not found', async () => {
      const reg = new SkillRegistry(tmpDir);
      await expect(reg.remove('no-such', [])).rejects.toThrow('not found');
    });
  });
});
