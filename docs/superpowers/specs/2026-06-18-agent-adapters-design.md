# Agent MCP Auto-Registration — Design Spec

**Date:** 2026-06-18  
**Status:** Approved

---

## Overview

When Relay activates it detects which AI agents are installed, filters to those that don't already have Relay in their MCP config, and offers a single QuickPick prompt to register itself in all of them at once. A dedicated VS Code command lets the user re-run setup at any time.

---

## Design Patterns Used

| Pattern | Where |
|---------|-------|
| **Strategy** | `AgentAdapter` interface — each agent is a swappable strategy |
| **Template Method** | `JsonFileAdapter.configure()` — fixed algorithm (try CLI → fall back to file patch), variable steps supplied by subclasses |
| **Registry** | `AgentRegistry` — holds all adapters, coordinates detection and prompting |
| **Enum constants** | `constants.ts` — all string literals (IDs, dirs, binaries, transport types) live in enums, never inline |

---

## File Structure

```
src/agents/
  constants.ts          ← all enums (AgentId, ConfigDir, ConfigFile, CliBinary, McpTransport)
  agentAdapter.ts       ← AgentAdapter interface (Strategy)
  jsonFileAdapter.ts    ← JsonFileAdapter abstract class (Template Method)
  registry.ts           ← AgentRegistry class (Registry)
  adapters/
    claudeCode.ts
    cursor.ts
    codex.ts
    gemini.ts
```

---

## Constants

```typescript
// src/agents/constants.ts
export const enum AgentId {
  ClaudeCode = 'claude-code',
  Cursor     = 'cursor',
  Codex      = 'codex',
  Gemini     = 'gemini',
}

export const enum ConfigDir {
  ClaudeCode = '.claude',
  Cursor     = '.cursor',
  Codex      = '.codex',
  Gemini     = '.gemini',
}

export const enum ConfigFile {
  ClaudeCode = 'settings.json',
  Cursor     = 'mcp.json',
  Codex      = 'config.json',
  Gemini     = 'settings.json',
}

export const enum CliBinary {
  ClaudeCode = 'claude',
  Gemini     = 'gemini',
  Codex      = 'codex',
}

export const enum McpTransport {
  Http = 'http',
}
```

---

## AgentAdapter Interface (Strategy)

```typescript
// src/agents/agentAdapter.ts
export interface AgentAdapter {
  readonly id: string;      // AgentId enum value
  readonly label: string;   // Display name shown in QuickPick
  isInstalled(): Promise<boolean>;
  isConfigured(port: number): Promise<boolean>;
  configure(port: number): Promise<void>;
}
```

---

## JsonFileAdapter Abstract Base (Template Method)

Defines the configure algorithm. Subclasses supply the variable steps.

```typescript
// src/agents/jsonFileAdapter.ts
export abstract class JsonFileAdapter implements AgentAdapter {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly configPath: string;          // computed from os.homedir() + enums

  // Variable step 1: try CLI. Return false to skip to file fallback.
  protected configureViaCli(_port: number): Promise<void | false> {
    return Promise.resolve(false);
  }

  // Variable step 2: the MCP entry object written under mcpServers[serverKey]
  protected abstract buildEntry(port: number): Record<string, unknown>;

  protected readonly serverKey = 'vscode-relay';

  // Fixed algorithm — subclasses must not override
  async configure(port: number): Promise<void> {
    const result = await this.configureViaCli(port);
    if (result === false) await this.patchFile(port);
  }

  async isConfigured(_port: number): Promise<boolean> {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      return !!(JSON.parse(raw)?.mcpServers?.[this.serverKey]);
    } catch { return false; }
  }

  private async patchFile(port: number): Promise<void> {
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8')); } catch {}
    (config.mcpServers as Record<string, unknown> ??= {})[this.serverKey] = this.buildEntry(port);
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }
}
```

---

## Concrete Adapters

### Claude Code

- **Detection:** `~/.claude/` directory exists  
- **CLI:** `claude mcp add vscode-relay -t http <url>` (falls back to file if `claude` not on PATH)  
- **Config:** `~/.claude/settings.json` → `mcpServers.vscode-relay: { type: 'http', url }`

### Cursor

- **Detection:** `~/.cursor/` directory exists  
- **CLI:** none — always uses file patch  
- **Config:** `~/.cursor/mcp.json` → `mcpServers.vscode-relay: { url }`

### Codex

- **Detection:** `~/.codex/` directory exists  
- **CLI:** none confirmed — uses file patch; will be updated to CLI if Codex adds one  
- **Config:** `~/.codex/config.json` → `mcpServers.vscode-relay: { type: 'http', url }` *(format to be verified against Codex docs during implementation)*

### Gemini CLI

- **Detection:** `~/.gemini/` directory exists  
- **CLI:** `gemini mcp add` *(to be verified during implementation)*  
- **Config:** `~/.gemini/settings.json` → `mcpServers.vscode-relay: { type: 'http', url }` *(format to be verified)*

---

## AgentRegistry (Registry Pattern)

```typescript
// src/agents/registry.ts
export class AgentRegistry {
  constructor(private readonly adapters: AgentAdapter[]) {}

  // Called on activation — respects dismissed flag
  async showSetupPrompt(context: vscode.ExtensionContext, port: number): Promise<void> {
    if (context.globalState.get('relay.agentSetupDismissed')) return;
    await this.runPrompt(port);
  }

  // Called by relay.setupAgents command — ignores dismissed flag
  async showSetupPromptForced(port: number): Promise<void> {
    await this.runPrompt(port);
  }

  private async runPrompt(port: number): Promise<void> {
    const candidates = await this.findUnconfigured(port);
    if (candidates.length === 0) {
      // Only show "all configured" message when triggered by the manual command
      return;
    }

    const action = await vscode.window.showInformationMessage(
      `Relay detected ${candidates.length} AI agent(s). Set up MCP integration?`,
      'Set up', 'Not now', "Don't ask again",
    );
    if (action === "Don't ask again") {
      // context not available here — pass it in or store ref
    }
    if (action !== 'Set up') return;

    const picks = await vscode.window.showQuickPick(
      candidates.map(a => ({ label: a.label, picked: true, adapter: a })),
      { canPickMany: true, placeHolder: 'Select agents to configure' },
    );
    if (!picks?.length) return;

    const results = await Promise.allSettled(picks.map(p => p.adapter.configure(port)));
    const failed = results.filter(r => r.status === 'rejected');
    const ok = results.length - failed.length;

    if (ok > 0) vscode.window.showInformationMessage(`Relay: configured ${ok} agent(s).`);
    if (failed.length > 0) vscode.window.showErrorMessage(`Relay: failed to configure ${failed.length} agent(s).`);
  }

  private async findUnconfigured(port: number): Promise<AgentAdapter[]> {
    const checks = await Promise.all(
      this.adapters.map(async a => ({
        adapter: a,
        show: await a.isInstalled() && !(await a.isConfigured(port)),
      }))
    );
    return checks.filter(c => c.show).map(c => c.adapter);
  }
}
```

**Note:** `showSetupPrompt` needs access to `vscode.ExtensionContext` to set the dismissed flag. The `context` reference should be passed through `runPrompt` or stored on the registry at construction time. This will be resolved during implementation.

---

## Extension.ts Integration

```typescript
// In activate():
const agentRegistry = new AgentRegistry([
  new ClaudeCodeAdapter(),
  new CursorAdapter(),
  new CodexAdapter(),
  new GeminiAdapter(),
]);

agentRegistry.showSetupPrompt(context, port); // async, non-blocking

context.subscriptions.push(
  vscode.commands.registerCommand('relay.setupAgents', () =>
    agentRegistry.showSetupPromptForced(port)
  ),
);
```

Register `relay.setupAgents` in `package.json` under `contributes.commands`.

---

## Testing

- `jsonFileAdapter` patch logic: write a config, patch it, assert correct JSON output
- `jsonFileAdapter` isConfigured: present/absent key cases
- `AgentRegistry.findUnconfigured`: mock adapters, assert filtering logic
- Each adapter's `buildEntry`: assert correct entry shape for the agent's format
- CLI path: mock `commandOnPath` to return true/false, assert correct branch taken

All tests use the existing Jest + `src/__mocks__/vscode.ts` setup. No real filesystem writes in tests — `fs` will be mocked.

---

## Open Items (resolve during implementation)

1. Exact Codex CLI MCP config file path and JSON format
2. Whether `gemini mcp add` exists and its exact flags
3. `AgentRegistry.showSetupPrompt` — pass `context` to `runPrompt` or store on registry
