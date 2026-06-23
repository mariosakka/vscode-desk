# Contributing to Relay

## Prerequisites

- Node.js 20+
- VS Code 1.85+
- Git

## Setup

```bash
git clone https://github.com/mariosakka/vscode-relay.git
cd vscode-relay
npm install
npm run compile
```

Press **F5** in VS Code to open the Extension Development Host with Relay active.

## Development loop

```bash
npm run watch           # incremental build (extension host) — leave this running
npm run watch:webview   # incremental build (React webview) — leave this running
npm test                # Jest unit tests (127 tests)
npm run test:e2e        # Playwright e2e tests (32 tests) — requires a prior compile
```

Playwright tests require a compiled build. Run `npm run compile` once before `npm run test:e2e` if you haven't already. The compile script builds both the extension host and the React webview.

## Commit messages

Relay uses [Conventional Commits](https://www.conventionalcommits.org/). The type determines how release-please bumps the version:

| Prefix | Version bump |
|--------|-------------|
| `feat:` | minor |
| `fix:` | patch |
| `feat!:` or `BREAKING CHANGE:` footer | major |
| `chore:`, `refactor:`, `docs:`, `ci:`, `test:` | none |

Example: `feat: add bookmark drag-and-drop reordering`

## Pull request process

1. Branch off `master`.
2. Make your changes with passing tests.
3. Open a PR — the template will guide you.
4. A reviewer approves → CI runs automatically.
5. Tests pass → merge.

## Code rules

- **No hardcoded URLs** — not in source, not in webviews.
- **Webview CSS** — use VS Code theme token variables only. No hex values.
- **DataService** is the only class that reads/writes `globalState`.
- **FaviconService** is the only class that fetches favicons.
- **PageReader** is the only class that reads/writes `.relay` files.
- **WorkflowConfigService** is the only class that reads/writes workflow config.
- **SkillRegistry** is the only class that installs skill files on agents.
- **New MCP tool** → add schema in `toolSchemas.ts`, handler in `server.ts`, test in `server.test.ts`.

See [CLAUDE.md](CLAUDE.md) for the full architecture reference.
