# Configure your ecosystem

*[← Set up your repository](03-initialize-your-repository.md) · [Back to the guide](README.md) · Next: [Tips & troubleshooting →](05-tips-and-troubleshooting.md)*

Rosetta tells the agent how to work. CLIs and MCP servers give it the eyes and hands to do that work — reading tickets, driving a browser, fetching current library docs. What you need depends on which scenarios you run.

## Prefer CLIs

Prefer a CLI over the equivalent MCP where one exists — CLIs cost no context and are always available. Keep at most three MCPs enabled at a time.

- `gh` — pull requests, issues, releases, CI checks
- `acli` — Jira and Confluence from the terminal
- `rg` — ripgrep; most current models prefer it over grep

## Recommended MCP servers

Bold entries are strongly recommended. The rest depend on your project.

- **[Context7](https://github.com/upstash/context7)** — up-to-date library documentation
- **[Playwright MCP](https://github.com/microsoft/playwright-mcp)** — interact with web pages through structured accessibility snapshots
- **[Chrome DevTools](https://github.com/ChromeDevTools/chrome-devtools-mcp)** — full browser control with console, network tab, snapshots
- **[Graphify](https://github.com/safishamsi/graphify)** — MIT-licensed knowledge graph of your project. Third-party tool with access to your IP; review with your manager
- [Jira & Confluence MCP](https://www.atlassian.com/platform/remote-mcp-server) — tickets, comments, and documentation
- [GitNexus](https://github.com/abhigyanpatwari/GitNexus) — indexes a codebase into a knowledge graph. Third-party tool with access to your IP. Free for non-commercial or personal use, **paid for commercial use** — review the licence and your company policy with your manager
- [Figma MCP](https://github.com/GLips/Figma-Context-MCP) — so the agent can see designs directly
- [Repomix MCP](https://repomix.com/guide/mcp-server) — packages a library into reference material the agent can search
- [DeepWiki](https://docs.devin.ai/work-with-devin/deepwiki-mcp) — up-to-date documentation
- [Fetch](https://github.com/modelcontextprotocol/servers/tree/main/src/fetch) — retrieve and process content from APIs and web pages
- [Database MCPs](https://glama.ai/mcp/servers?attributes=category%3Adatabases) — read schema, read data

Use **either Playwright or Chrome DevTools, not both.**

## What each scenario needs

| Scenario | Needs |
| --- | --- |
| [Generate test cases](scenarios/generate-test-cases.md) | Issue tracker (Jira); test management system to export to |
| [Automate API tests](scenarios/automate-api-tests.md) | A Swagger/OpenAPI spec or a backend source path |
| [Automate UI tests](scenarios/automate-ui-tests.md) | Playwright or Chrome DevTools to drive the browser |
| [Research a question](scenarios/research.md) | Context7 and DeepWiki for grounded external references |
| [Onboard a library](scenarios/onboard-a-library.md) | Repomix (MCP or CLI) |
| [Analyze a codebase](scenarios/analyze-a-codebase.md) | Optional: Graphify or GitNexus for a code graph |

Everything else runs on the plugin alone.

## Reference code the agent can't otherwise see

Clone read-only code into `refsrc/` as its own subfolder — backend code when this is a frontend repo, corporate or private libraries, or a public framework that had a breaking change in the last year.

Add these exceptions to your root `.gitignore`:

```text
agents/TEMP/
refsrc/
!refsrc/INDEX.md
```

Then describe each folder in `refsrc/INDEX.md`, one header per entry:

```text
## "refsrc/fastmcp-3.3.1" - main framework for MCP handling
## "refsrc/private-ui-lib" - must use corporate styles for TailwindCSS
```

## Reusable patterns

List the patterns the agent should reuse so generated code stays consistent — components, state management, databases, API protocols, messaging, controllers, CRUD verticals.

## Project-specific rules

Add your own rules alongside Rosetta — you never edit Rosetta's files.

| IDE / Agent | Core rules file | Additional rules |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` | `.claude/rules/*.md` |
| Cursor | `.cursor/rules/agents.mdc` | `.cursor/rules/*.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` | |
| Windsurf | `.windsurf/rules/*.md` | all `.md` files auto-load |
| JetBrains (Junie + AI Assistant) | `.aiassistant/rules/agents.md` | `.junie/guidelines.md` |
| Antigravity | `.agents/rules/agents.md` | `.agents/rules/*.md` |
| OpenCode | `AGENTS.md` | `.opencode/agent/*.md` |

## Next step

The full workspace checklist, including modernization setup, is in [CONFIGURATION](../CONFIGURATION.md). Otherwise pick a task from [Scenarios at a glance](README.md#scenarios-at-a-glance), or read [Tips & troubleshooting →](05-tips-and-troubleshooting.md).
