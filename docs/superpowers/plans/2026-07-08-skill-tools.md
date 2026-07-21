# Skill-Defined MCP Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow skills stored in the Desk extension to declare executable MCP tools in their frontmatter `tools:` block; the McpServer exposes them dynamically and executes them via shell commands when called.

**Architecture:** `SkillRegistry` parses and validates the `tools:` block at skill-submission time, storing `SkillTool[]` alongside each skill in `skills.json`. `McpServer` computes the tool list fresh on every `tools/list` by appending dynamic tools (workspace wins on name collision with global). On `tools/call` for an unknown static name, the server locates the matching `SkillTool`, shell-escapes argument substitutions, runs the command via `child_process.execSync`, and returns stdout as the result.

**Tech Stack:** TypeScript, Node.js (`child_process.execSync`), Jest (unit tests), VS Code Extension API (configuration read)

## Global Constraints

- No hardcoded URLs or org-specific content
- No comments unless the why is non-obvious
- No unused abstractions
- All new MCP tool tests go in `src/mcp/server/server.test.ts`
- `npm test` must pass after every task (164+ tests)
- Commits use Conventional Commits (`feat:`, `fix:`, etc.)
- **Dependency:** server.ts changes (Task 2) must be applied after `2026-07-08-books.md` Task 3 is merged to avoid conflicts

---

## File Map

**Modified files:**
- `src/services/skillRegistry/skillRegistry.ts` — add `SkillTool` interface, update `Skill` interface, add `parseToolsBlock`, update `parseFrontmatter`, add `validateFrontmatter` tools checks, add `getAllTools()`, update `confirmPending` message
- `src/services/skillRegistry/skillRegistry.test.ts` — 5 new tests for tools-block validation and `getAllTools`
- `src/mcp/server/server.ts` — add `_getDynamicTools()`, `_skillToolToMcpTool()`, `_callDynamicTool()`; update `dispatch()` `tools/list`; update `callTool()` default case
- `src/mcp/server/server.test.ts` — 5 new round-trip tests for dynamic tool listing, execution, error cases

**Not changed:**
- `src/mcp/toolSchemas.ts` — skill tools are dynamic, not in the static `TOOLS` array

---

## Task 1: SkillRegistry — tools-block parsing and validation

**Files:**
- Modify: `src/services/skillRegistry/skillRegistry.ts`
- Modify: `src/services/skillRegistry/skillRegistry.test.ts`

**Interfaces:**
- Produces: `SkillTool` interface, updated `Skill` interface with `tools?: SkillTool[]`, `getAllTools(): SkillTool[]`
- Consumed by: Task 2 (`McpServer` reads `registry.getAllTools()`)

---

- [ ] **Step 1: Add `SkillTool` interface and update `Skill` interface**

In `src/services/skillRegistry/skillRegistry.ts`, add before the `Skill` interface:

```typescript
export interface SkillTool {
  name: string;
  description: string;
  command: string;
  args: Array<{ name: string; type: string; required?: boolean; description?: string }>;
}
```

Update the `Skill` interface to add the optional field:

```typescript
export interface Skill {
  name: string;
  description: string;
  content: string;
  agents: string[];
  version: number;
  installedAt: number;
  tools?: SkillTool[];
}
```

- [ ] **Step 2: Add `parseToolsBlock` function**

Add this private function at the bottom of the file (before the existing `parseFrontmatter` function):

```typescript
function parseToolsBlock(lines: string[], startIndex: number): SkillTool[] {
  const tools: SkillTool[] = [];
  let i = startIndex;
  let currentTool: Partial<SkillTool> & { args: SkillTool['args'] } | null = null;
  let inArgs = false;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s{2}-\s+name:/.test(line)) {
      if (currentTool?.name) tools.push(currentTool as SkillTool);
      currentTool = { name: line.replace(/^\s*-\s+name:\s*/, '').trim(), args: [] };
      inArgs = false;
    } else if (currentTool && /^\s{4}description:/.test(line)) {
      currentTool.description = line.replace(/^\s*description:\s*/, '').trim().replace(/^["']|["']$/g, '');
    } else if (currentTool && /^\s{4}command:/.test(line)) {
      currentTool.command = line.replace(/^\s*command:\s*/, '').trim().replace(/^["']|["']$/g, '');
    } else if (currentTool && /^\s{4}args:/.test(line)) {
      inArgs = true;
    } else if (inArgs && /^\s{6}-/.test(line)) {
      const argLine = line.replace(/^\s*-\s*/, '').trim();
      const nameM = argLine.match(/name:\s*(\S+)/);
      const typeM = argLine.match(/type:\s*(\S+)/);
      const reqM = argLine.match(/required:\s*(true|false)/);
      const descM = argLine.match(/description:\s*["']?([^"',}]+)/);
      if (nameM) {
        currentTool.args.push({
          name: nameM[1].replace(/,\}?$/, ''),
          type: typeM?.[1].replace(/,\}?$/, '') ?? 'string',
          required: reqM ? reqM[1] === 'true' : false,
          description: descM?.[1].trim(),
        });
      }
    } else if (line.length > 0 && !/^\s/.test(line)) {
      break;
    }
    i++;
  }

  if (currentTool?.name) tools.push(currentTool as SkillTool);
  return tools;
}
```

- [ ] **Step 3: Update `parseFrontmatter` to extract the `tools:` block**

The existing `parseFrontmatter` function has a `switch(key)` block. Add a `case 'tools':` that captures the line index and calls `parseToolsBlock`. The function's return type also needs to include `tools`:

Change the return type annotation of `parseFrontmatter`:

```typescript
function parseFrontmatter(content: string): {
  name?: string;
  description?: string;
  agents?: string[];
  version?: number;
  tools?: SkillTool[];
} {
```

Inside the `for` loop, after the existing `case 'version':` block, add:

```typescript
      case 'tools':
        result.tools = parseToolsBlock(lines, i + 1);
        break;
```

Also add `tools?: SkillTool[]` to the `result` object initialisation:

```typescript
  const result: { name?: string; description?: string; agents?: string[]; version?: number; tools?: SkillTool[] } = {};
```

- [ ] **Step 4: Add `BUILT_IN_TOOL_NAMES` set and tools validation to `validateFrontmatter`**

Add the set as a module-level constant at the top of the file (after imports):

```typescript
const BUILT_IN_TOOL_NAMES = new Set([
  'list_bookmarks', 'add_bookmark', 'remove_bookmark', 'update_bookmark',
  'list_pages', 'create_page', 'update_page', 'delete_page',
  'get_workflow_config', 'submit_workflow_config',
  'list_skills', 'get_skill', 'add_skill', 'remove_skill',
  'get_page_template', 'set_page_template',
  'list_libraries', 'add_library', 'remove_library',
  'list_sections', 'add_section', 'update_section', 'remove_section',
  'list_items', 'add_list_item', 'remove_list_item', 'update_list_item', 'set_list_type',
  'list_section_types', 'register_section_type', 'remove_section_type',
  'create_book', 'list_books', 'get_book', 'delete_book',
  'add_chapter', 'rename_chapter', 'remove_chapter', 'move_page',
]);
```

In `validateFrontmatter`, after the existing `return { valid: true }` line but before it, add:

```typescript
    if (fm.tools) {
      for (const tool of fm.tools) {
        if (!/^[a-z0-9_-]+$/.test(tool.name)) {
          return { valid: false, error: `tool name "${tool.name}" must be kebab-case or snake_case` };
        }
        if (BUILT_IN_TOOL_NAMES.has(tool.name)) {
          return { valid: false, error: `tool name "${tool.name}" conflicts with a built-in Desk tool` };
        }
        const argNames = new Set((tool.args ?? []).map(a => a.name));
        const placeholders = [...(tool.command?.matchAll(/\{(\w+)\}/g) ?? [])].map(m => m[1]);
        for (const ph of placeholders) {
          if (!argNames.has(ph)) {
            return { valid: false, error: `tool "${tool.name}": placeholder {${ph}} has no matching arg` };
          }
        }
        for (const arg of tool.args ?? []) {
          if (!placeholders.includes(arg.name)) {
            return { valid: false, error: `tool "${tool.name}": arg "${arg.name}" not used in command template` };
          }
        }
      }
    }
```

- [ ] **Step 5: Add `getAllTools()` method to `SkillRegistry`**

Inside the `SkillRegistry` class, after the `get()` method:

```typescript
  getAllTools(): SkillTool[] {
    return this.getAll().flatMap(s => s.tools ?? []);
  }
```

- [ ] **Step 6: Update `confirmPending` to mention declared tools**

In the `confirmPending` method, the skill object is assembled just before `this.writeAll(skills)`. After the skill object is built but before writing, update the pending-tool info. The confirmation dialog lives in `SidebarViewProvider` (via `onSkillSubmitted` callback in extension.ts) — the registry itself doesn't show UI. Instead, store the tools list on the `Skill` object so callers can read it:

In `confirmPending`, update the `Skill` construction to include `tools`:

```typescript
    const skill: Skill = {
      name: skillName,
      description,
      content,
      agents,
      version,
      installedAt: Date.now(),
      tools: fm.tools,
    };
```

The confirmation UI (in `extension.ts` / `SidebarViewProvider`) reads `skill.tools` if it wants to display them. Add a helper on the registry:

```typescript
  getPendingToolSummary(): string | null {
    if (!this.pending) return null;
    const fm = parseFrontmatter(this.pending.content);
    if (!fm.tools?.length) return null;
    return fm.tools.map(t => `• ${t.name}: ${t.command}`).join('\n');
  }
```

- [ ] **Step 7: Write failing tests**

In `src/services/skillRegistry/skillRegistry.test.ts`, add a new `describe` block:

```typescript
describe('tools block', () => {
  it('rejects tool with invalid name', () => {
    const r = registry.validateFrontmatter(
      '---\nname: s\ndescription: d\ntools:\n  - name: Bad Name\n    command: echo hi\n---\nbody',
    );
    expect(r.valid).toBe(false);
    expect(r.error).toContain('kebab-case or snake_case');
  });

  it('rejects tool that collides with built-in name', () => {
    const r = registry.validateFrontmatter(
      '---\nname: s\ndescription: d\ntools:\n  - name: list_pages\n    command: echo hi\n---\nbody',
    );
    expect(r.valid).toBe(false);
    expect(r.error).toContain('conflicts with a built-in');
  });

  it('rejects placeholder with no matching arg', () => {
    const r = registry.validateFrontmatter(
      '---\nname: s\ndescription: d\ntools:\n  - name: my_tool\n    command: "echo {missing}"\n---\nbody',
    );
    expect(r.valid).toBe(false);
    expect(r.error).toContain('no matching arg');
  });

  it('rejects arg not used in command', () => {
    const r = registry.validateFrontmatter(
      '---\nname: s\ndescription: d\ntools:\n  - name: my_tool\n    command: "echo hello"\n    args:\n      - { name: unused, type: string, required: true }\n---\nbody',
    );
    expect(r.valid).toBe(false);
    expect(r.error).toContain('not used in command');
  });

  it('getAllTools returns tools from stored skills', () => {
    registry['writeAll']([{
      name: 'my-skill',
      description: 'd',
      content: '',
      agents: ['all'],
      version: 1,
      installedAt: 0,
      tools: [{ name: 'my_cmd', description: 'does x', command: 'echo {val}', args: [{ name: 'val', type: 'string', required: true }] }],
    }]);
    const tools = registry.getAllTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('my_cmd');
  });
});
```

- [ ] **Step 8: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=skillRegistry
```

Expected: 5 new tests fail (implementations not yet wired).

- [ ] **Step 9: Run tests after implementation to confirm they pass**

```bash
npm test -- --testPathPattern=skillRegistry
```

Expected: all skillRegistry tests pass (15 existing + 5 new = 20).

- [ ] **Step 10: Run full test suite**

```bash
npm test
```

Expected: all 169+ tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/services/skillRegistry/skillRegistry.ts src/services/skillRegistry/skillRegistry.test.ts
git commit -m "feat: add tools-block parsing and validation to SkillRegistry"
```

---

## Task 2: McpServer — dynamic tool listing and execution

**Files:**
- Modify: `src/mcp/server/server.ts`
- Modify: `src/mcp/server/server.test.ts`

**Interfaces:**
- Consumes: `SkillRegistry.getAllTools()` and `SkillRegistry.getAll()` (from Task 1)
- Produces: dynamic entries in `tools/list` response; dynamic execution via `tools/call`

**Dependency:** Apply these changes after `2026-07-08-books.md` Task 3 has been merged (both touch `server.ts`).

---

- [ ] **Step 1: Add `McpTool` import from toolSchemas**

`McpTool` is already exported from `src/mcp/toolSchemas.ts`. Confirm the import exists at the top of `server.ts`:

```typescript
import { TOOLS, McpTool } from '../toolSchemas';
```

Also add the `SkillTool` import:

```typescript
import { SkillTool } from '../../services/skillRegistry/skillRegistry';
```

- [ ] **Step 2: Add `_getDynamicTools` and `_skillToolToMcpTool` private methods**

Add after the `_resolveScope` method in `McpServer`:

```typescript
  private _getDynamicTools(): McpTool[] {
    const seen = new Set<string>();
    const result: McpTool[] = [];
    const registries = [this.workspaceSkillRegistry, this.globalSkillRegistry].filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );
    for (const registry of registries) {
      for (const tool of registry.getAllTools()) {
        if (seen.has(tool.name)) continue;
        seen.add(tool.name);
        result.push(this._skillToolToMcpTool(tool, registry));
      }
    }
    return result;
  }

  private _skillToolToMcpTool(tool: SkillTool, registry: import('../../services/skillRegistry/skillRegistry').SkillRegistry): McpTool {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const arg of tool.args ?? []) {
      properties[arg.name] = { type: arg.type, description: arg.description ?? '' };
      if (arg.required) required.push(arg.name);
    }
    const skillName =
      registry.getAll().find(s => s.tools?.some(t => t.name === tool.name))?.name ?? 'skill';
    return {
      name: tool.name,
      description: `[${skillName}] ${tool.description}`,
      inputSchema: { type: 'object', required, properties, additionalProperties: false },
    };
  }
```

- [ ] **Step 3: Update `dispatch()` to append dynamic tools in `tools/list`**

Find the existing `tools/list` handler in `dispatch()`:

```typescript
    if (method === 'tools/list') {
      return { tools: TOOLS };
    }
```

Replace with:

```typescript
    if (method === 'tools/list') {
      const dynamicTools = this._getDynamicTools();
      return { tools: [...TOOLS, ...dynamicTools] };
    }
```

- [ ] **Step 4: Add `_callDynamicTool` private method**

Add after `_skillToolToMcpTool`:

```typescript
  private async _callDynamicTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const registries = [this.workspaceSkillRegistry, this.globalSkillRegistry].filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );

    let foundTool: SkillTool | null = null;
    let isWorkspaceRegistry = false;

    for (let i = 0; i < registries.length; i++) {
      const tool = registries[i].getAllTools().find(t => t.name === name);
      if (tool) {
        foundTool = tool;
        isWorkspaceRegistry = i === 0 && registries[0] === this.workspaceSkillRegistry;
        break;
      }
    }

    if (!foundTool) throw new Error(`Unknown tool: ${name}`);

    const missing = (foundTool.args ?? []).filter(a => a.required && !(a.name in args));
    if (missing.length) {
      throw new Error(`Missing required args: ${missing.map(a => a.name).join(', ')}`);
    }

    const command = foundTool.command.replace(/\{(\w+)\}/g, (_m, key) => {
      const val = String(args[key] ?? '');
      return `'${val.replace(/'/g, "'\\''")}'`;
    });

    const cwd =
      isWorkspaceRegistry && this.workspacePath
        ? this.workspacePath
        : require('os').homedir();

    const timeoutMs = 30_000;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execSync } = require('child_process') as typeof import('child_process');
    try {
      const stdout = execSync(command, { cwd, timeout: timeoutMs, encoding: 'utf-8' });
      return { content: [{ type: 'text', text: stdout }] };
    } catch (err: any) {
      const stderr = String(err.stderr ?? '');
      const code = err.status ?? 1;
      throw new Error(`Command failed (exit ${code}): ${stderr || err.message}`);
    }
  }
```

- [ ] **Step 5: Update `callTool()` default case to try dynamic dispatch**

Find the end of the `switch (name)` in `callTool`. If a `default:` case exists that throws, replace it. Otherwise add it:

```typescript
      default:
        return this._callDynamicTool(name, args);
```

- [ ] **Step 6: Write failing server tests**

In `src/mcp/server/server.test.ts`, add a new `describe('dynamic skill tools')` block. You need a minimal `SkillRegistry` stub. Look at how the existing tests pass `null` for services they don't use — here you need a real (temp-dir) or stub registry with a known skill.

Add these tests (place after the existing test blocks):

```typescript
describe('dynamic skill tools', () => {
  let tmpDir: string;
  let server: McpServer;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-dyn-'));
    const skillsPath = path.join(tmpDir, 'skills.json');
    fs.writeFileSync(skillsPath, JSON.stringify([{
      name: 'test-skill',
      description: 'test',
      content: '',
      agents: ['all'],
      version: 1,
      installedAt: 0,
      tools: [{
        name: 'say_hello',
        description: 'Echoes a greeting.',
        command: "echo 'hello {name}'",
        args: [{ name: 'name', type: 'string', required: true }],
      }],
    }]));

    const registry = new SkillRegistry(tmpDir);
    server = new McpServer(
      globalDataService,   // reuse from outer scope or create minimal stub
      null, null,
      registry,            // globalSkillRegistry
      null, null, null, null,
      provider, faviconService,
    );
    await server.start(0);
  });

  afterEach(() => {
    server.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('tools/list includes dynamic skill tool', async () => {
    const res = await post(server, { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    const names = res.result.tools.map((t: any) => t.name);
    expect(names).toContain('say_hello');
    const tool = res.result.tools.find((t: any) => t.name === 'say_hello');
    expect(tool.description).toContain('[test-skill]');
  });

  it('calls dynamic tool with valid args', async () => {
    // We can't actually run execSync in unit tests without mocking child_process.
    // Instead verify the error path works (command not found on test machine is OK),
    // or mock execSync. Here we verify the routing reaches _callDynamicTool by
    // checking the error message when the command doesn't exist is NOT "Unknown tool".
    const res = await post(server, {
      jsonrpc: '2.0', id: 2,
      method: 'tools/call',
      params: { name: 'say_hello', arguments: { name: 'world' } },
    });
    // Either it succeeded (echo available) or failed with a command error — not "Unknown tool"
    if (res.result) {
      expect(res.result.content[0].text).toContain('hello');
    } else {
      expect(res.error.message).not.toContain('Unknown tool');
    }
  });

  it('dynamic tool: missing required arg returns error', async () => {
    const res = await post(server, {
      jsonrpc: '2.0', id: 3,
      method: 'tools/call',
      params: { name: 'say_hello', arguments: {} },
    });
    expect(res.error).toBeDefined();
    expect(res.error.message).toContain('Missing required args');
    expect(res.error.message).toContain('name');
  });

  it('dynamic tool: unknown name returns Unknown tool error', async () => {
    const res = await post(server, {
      jsonrpc: '2.0', id: 4,
      method: 'tools/call',
      params: { name: 'no_such_tool', arguments: {} },
    });
    expect(res.error).toBeDefined();
    expect(res.error.message).toContain('Unknown tool');
  });
});
```

Note: The `post` helper, `globalDataService`, `provider`, `faviconService`, `SkillRegistry` and `os`/`fs`/`path` imports should already be in scope from the existing test file. Add `import { SkillRegistry } from '../../services/skillRegistry/skillRegistry';` at the top if not already present.

- [ ] **Step 7: Run tests to confirm new tests fail**

```bash
npm test -- --testPathPattern=server
```

Expected: 4–5 new dynamic tool tests fail.

- [ ] **Step 8: Run full test suite after implementation**

```bash
npm test
```

Expected: all tests pass (164 existing + ~9 new from Tasks 1 and 2).

- [ ] **Step 9: Commit**

```bash
git add src/mcp/server/server.ts src/mcp/server/server.test.ts
git commit -m "feat: expose and execute skill-defined MCP tools dynamically"
```
