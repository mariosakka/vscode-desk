# Security Policy

## Supported versions

Only the latest published version of Desk receives security fixes.

| Version | Supported |
|---------|-----------|
| Latest  | ✅ |
| Older   | ❌ |

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Use [GitHub's private security advisory]( ../../security/advisories/new) to report confidentially. Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce
- Your VS Code and Desk versions

You can expect an acknowledgement within 72 hours and a fix or mitigation plan within 14 days for confirmed issues.

## Scope

Desk runs entirely locally — there is no backend, no telemetry, and no data leaves your machine except:

- **Favicon fetches** — the extension requests `https://{hostname}/favicon.ico` for each bookmark URL you add. No other outbound requests are made.
- **MCP server** — listens on `127.0.0.1` only. It is not exposed to the network.
