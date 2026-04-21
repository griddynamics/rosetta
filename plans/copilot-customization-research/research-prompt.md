# Research Prompt: GitHub Copilot Customization Capabilities

## Role
Senior research specialist. Accuracy-first. Every conclusion has a traceable source URL.

## Objective
Produce a comprehensive, accurate, and current research document on GitHub Copilot customization capabilities as of 2025-2026. The output will be used to update Rosetta OSS documentation about GitHub Copilot support.

## Research Areas

### Area 1: Custom Slash Commands
- Are custom slash commands supported in GitHub Copilot?
- How are they defined? What file format?
- How are they invoked in Copilot Chat?
- Any differences between VS Code, JetBrains, and github.com?

### Area 2: Reusable Prompts / Prompt Files
- Are there "prompt files" (.prompt.md or similar)?
- How are they defined and where are they stored?
- How does a user invoke them?
- Relationship to slash commands (if any)

### Area 3: Custom Agents / Extensions
- .github/agents/*.agent.md format — does this exist?
- How are custom Copilot extensions/agents defined?
- How are they invoked (@agent-name syntax)?
- What can they do (tools, skills, MCP)?

### Area 4: Skills Files
- .github/skills/*/SKILL.md format — does this exist?
- Relationship between skills and agents
- How skills are loaded by Copilot

### Area 5: MCP Server Integration
- Can Copilot use MCP servers as custom tools?
- How is MCP configured for Copilot?
- Which Copilot plans support MCP?

### Area 6: Custom Instructions
- .github/copilot-instructions.md — current status and format
- Per-repository vs org-level instructions
- Any new instruction features in 2025-2026

### Area 7: New Features 2025-2026
- Any new customization features announced or released
- Copilot Coding Agent capabilities
- Copilot Workspaces

## Research Rules
1. MUST fetch official GitHub documentation URLs provided
2. MUST use WebSearch to find latest features
3. MUST cite every claim with a source URL
4. MUST distinguish between GA features and preview/beta features
5. MUST call out explicitly when information is inferred vs directly sourced
6. MUST prioritize accuracy over completeness — if uncertain, say so
7. MUST create and update research-state.md in TEMP folder after each section
8. MUST output result file section by section as it becomes available

## Primary Sources to Fetch
- https://docs.github.com/en/copilot/customizing-copilot
- https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
- https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-with-custom-agents
- https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/overview
- https://docs.github.com/en/copilot/customizing-copilot/using-model-context-protocol-with-copilot
- https://docs.github.com/en/copilot/customizing-copilot/creating-a-custom-ai-model-for-github-copilot
- https://docs.github.com/en/copilot/github-models
- https://github.blog/changelog/

## Output File
`docs/copilot-customization-research.md`

## State File
`agents/TEMP/copilot-customization-research/research-state.md`
