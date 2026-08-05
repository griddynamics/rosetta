---
name: arrangement-workspace-flow-configure-ecosystem
description: "Phase 5 Configure Ecosystem of arrangement-workspace-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["arrangement", "workspace", "ecosystem", "phase"]
baseSchema: docs/schemas/phase.md
---

<arrangement_workspace_configure_ecosystem>

<description_and_purpose>
Show MCP/CLI/plugin recommendations verbatim; guide install only if the user decides to.
</description_and_purpose>

<workflow_context>
Phase 5 of 5 in `arrangement-workspace-flow`. No interview; guidance only, never self-install.
</workflow_context>

<phase_steps>
1. Show ecosystem guidance 
2. Guide user how to install only if user decides to
</phase_steps>

<present_guidance step="5.1">
1. Show the user the content in `ecosystem_guidance` EXACTLY as written.
</present_guidance>

<ecosystem_guidance compact="NEVER" summarize="AS-IS">

### Configure the ecosystem

- Install and configure MCPs and CLIs. Keep at most three MCPs enabled at a time, and prefer CLIs they are always available and do not consume context.
- Install and configure plugins and extensions.
- Install and configure AI coding agent CLIs (Copilot CLI, Claude, Codex, and so on).

Save cost — add the line below to your workspace AGENTS.md/CLAUDE.md to cut model output tokens:

`MUST ALWAYS think, reason, plan, chat, document in compressed/terse/unicode chars/terms/always/no hieroglyphs; Exclude final artifacts, any tool calls, all code, etc.`

#### Recommended CLIs

Prefer a CLI over the matching MCP when one exists — it costs no context.

- `gh` — GitHub CLI: pull requests, issues, releases, and CI checks.
- `acli` — Atlassian CLI: Jira and Confluence from the terminal.
- `rg` - ripgrep - the most of new AI models prefer it over grep
- `rtk` ([github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk)) — CLI proxy that reduces LLM token consumption by 60–90% on common dev commands. **MUST** review with client! This can see the actual client IP!

#### Useful MCPs

MCPs are the eyes and hands of the AI — add them, but keep it balanced. Enable only what the task needs. **MUST** confirm with client!

- Context7 (<https://github.com/upstash/context7>) — Up-to-date library documentation.
- Playwright MCP (<https://github.com/microsoft/playwright-mcp>) — Drive web pages via accessibility snapshots — no screenshots or vision models needed.
- Fetch (<https://github.com/modelcontextprotocol/servers/tree/main/src/fetch>) — Retrieve and process content from web pages and APIs.
- Chrome DevTools (<https://github.com/ChromeDevTools/chrome-devtools-mcp>) — Full browser control: console, network tab, snapshots.
- GitNexus (<https://github.com/abhigyanpatwari/GitNexus>) — Index a large codebase into a knowledge graph. Third-party tool will have access to IP. Review license and policy with your manager. Free for non-commercial or personal use; PAID for commercial or business use — see [GitNexus Enterprise Licensing](https://github.com/abhigyanpatwari/GitNexus?tab=readme-ov-file#enterprise).
- Graphify (<https://github.com/safishamsi/graphify>) — MIT-licensed alternative that turns a project into a queryable knowledge graph. Third-party tool will have access to IP. Review license and policy with your manager.
- Figma MCP (<https://github.com/GLips/Figma-Context-MCP>) — Read designs directly from Figma.
- Jira & Confluence MCP (<https://www.atlassian.com/platform/remote-mcp-server>) — Tickets, comments, and documentation.
- Repomix MCP (<https://repomix.com/guide/mcp-server>) — Docs for using existing client libraries.
- DeepWiki (<https://docs.devin.ai/work-with-devin/deepwiki-mcp>) — Up-to-date documentation.
- Database MCPs (<https://glama.ai/mcp/servers?attributes=category%3Adatabases>) — Read schema and data.

#### Recommended Plugins

- **LSPs** — language server plugins for code intelligence; support is IDE/agent-specific:
  - Claude Code: install the LSP binary separately, then add via `/plugin` → Discover tab, search "lsp"; supported list + install links at <https://raw.githubusercontent.com/Piebald-AI/claude-code-lsps/refs/heads/main/README.md>.
  - Codex: LSPs not supported.
  - Copilot CLI: <https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/add-lsp-servers> (CLI/CLI-mode only, not regular VS Code/JetBrains Copilot).
- **CTO Claude Marketplace** (<https://github.com/griddynamics/cto-claude-marketplace>) — Grid Dynamics' internal Claude skills marketplace for GD workflows; zero-install via Claude Cowork with a GD account. Internal GD tooling — **MUST** confirm with client/manager.
- **Allium** (<https://github.com/juxt/allium>) — MIT-licensed skill for spec-first, behavior-driven development; maintains a `.allium` spec alongside code (`/elicit`, `/distill`, `/propagate`, `/tend`, `/weed`) to catch spec/code drift and generate tests from behavior. 

</ecosystem_guidance>

<install_on_request step="5.2">
1. Do NOT ask which MCPs/CLIs/plugins to install — no interview; installing is the user's own decision.
2. If the user decides to install something — do NOT install, read, search, understand first, paying attention to IDE/coding agent and languages — then guide them step-by-step.
3. You can also guide the user AFTER the entire workflow is completed, but do NOT install yourself.
4. Add a note to `docs/CONTEXT.md` on what got installed, nothing else.
5. Update `arrangement-state.md`.
</install_on_request>

<validation_checklist>
- Guidance shown to user 
- No install-choice interview happened; any install was the user's own initiative.
- `docs/CONTEXT.md` reflects what was installed, if anything.
- `arrangement-state.md` updated.
</validation_checklist>

<pitfalls>
- Installing tools yourself instead of guiding the user.
- Giving install guidance before understanding the user's IDE/coding agent and languages.
</pitfalls>

</arrangement_workspace_configure_ecosystem>
