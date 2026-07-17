---
name: init-workspace-flow-codegraph
description: "Phase 6 Code-graph of init-workspace-flow"
tags: ["init", "workspace", "codegraph", "phase"]
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_codegraph>

<description_and_purpose>
Suggests user to install LSPs xor Code graphs only.
</description_and_purpose>

<workflow_context>
- Phase 6 of 9 in init-workspace-flow
- Input: state.mode, state.plugin_active, IDEs
- Output: LSP/codegraph configs, CONTEXT.md additions
- Prerequisite: Phase 1-5 complete, state.mode set
</workflow_context>

<phase_steps>
1. Check state
2. Learn
3. Suggest LSPs, codegraphs 
4. Update state with phase status
</phase_steps>

<check_state step="6.1">

1. Read `agents/init-workspace-flow-state.md`
2. Check if LSPs or GitNexus or Graphify is already installed 
3. If upgrade mode: check whether user wants to change anything => basically confirm and allow to switch

</check_mode>

<learn_codegraph step="6.2">

- **Default — `CODEMAP.md`**: built-in, no install, no third party, no cost, works on <300 source code files projects very easily.
- **Graphify** (`https://github.com/safishamsi/graphify`): MIT-licensed, free.
- **GitNexus** (`https://github.com/abhigyanpatwari/GitNexus`): free for non-commercial or personal use, PAID for commercial or business use. Likely this will be a blocker.
- **LSP**: locally running lightweight Language Server Protocol servers for different programming languages
- Exclusive selection: Graphify XOR GitNexus XOR LSPs. Multiple LSPs allowed. Default is perfect with LSPs.
- Each IDE/coding agent requires different setup, there are SPECIFIC commands/params.
- CRITICAL: our integration requires tools/LSPs to be on the PATH or available by just using tool name without paths.
- IMPORTANT: user must do initialization for any extra, like "graphify .", etc.

</learn_codegraph>

<codegraph_known_links notice="DO NOT READ IN ADVANCE">

- GitNexus: https://raw.githubusercontent.com/abhigyanpatwari/GitNexus/refs/heads/main/README.md
- GitNexus Licensing: https://github.com/abhigyanpatwari/GitNexus?tab=readme-ov-file#enterprise
- Graphify: https://raw.githubusercontent.com/safishamsi/graphify/HEAD/README.md
- Claude Code: 
  - User must install the language server binary separately.
  - User installs them from the official marketplace: search for lsp keyword using the `/plugin` command Discover tab.
  - List of available: typescript-lsp, pyright-lsp, csharp-lsp, gopls-lsp, rust-analyzer-lsp, jdtls-lsp (Java Eclipse JDT.LS), php-lsp, clangd-lsp, kotlin-lsp, swift-lsp, lua-lsp, ruby-lsp, liquid-lsp (Shopify Liquid), clojure-lsp
  - Claude code intentionally support only those LSPs as those are stable, others may not
  - More available (with actual instructions for binaries): https://raw.githubusercontent.com/Piebald-AI/claude-code-lsps/refs/heads/main/README.md
- Codex does NOT support LSPs
- Copilot CLI LSPs: https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/add-lsp-servers (only CLI and CLI mode, not regular VS Code and Jetbrains IDE copilots)

</codegraph_known_links>

<suggest_codegraph step="6.3">

1. Read docs/TECHSTACK.md if not in context, to be grounded
2. Always show selector with recommend Default first, then optional LSPs, then Graphify, then GitNexus (show ALL even if something is installed)
3. Warn the user about licenses and IP: "third-party tool will have access to IP", "review license and policy with your manager"
4. Explain you will NOT install yourself, but if installed IT IS supported by Rosetta
5. Explain that they need to add "MUST USE SKILL CODEMAP AND <X> FOR CODE NAVIGATION" to docs/CONTEXT.md at the end so that AI knows to use it (note skill already handles)
6. Upon selection - do NOT install, read, search, understand paying attention to IDE/coding agent and languages
7. Only then provide very brief, concise, specific, and short instructions for user to install plus exact deep links, make this guidance to visually standout from overall log of all activities
8. You can guide user too AFTER entire workflow is completed, but do NOT install yourself, you can modify CONTEXT.md too

</suggest_codegraph>

<update_state step="6.4">

1. Write to `agents/init-workspace-flow-state.md`:
   - lsp/codegraph configs status (created | updated | skipped)
   - Phase 6 completion timestamp
   - Any guiding follow up required/etc
2. Log gaps for Phase 8

</update_state>

</init_workspace_flow_codegraph>
