# Diff Report — old-gen vs new-gen (current source)

## Generator run results

### Python r2
- Exit code: 0
- Warnings: none

### Python r3
- Exit code: 1 (additionalContext validation errors reported, but generation completed)
- Errors:
  - core-claude rules/plugin-files-mode.md additionalContext is 11675 chars (max 10000)
  - core-cursor rules/plugin-files-mode.mdc additionalContext is 11671 chars (max 10000)
  - core-copilot rules/plugin-files-mode.md additionalContext is 11671 chars (max 10000)
  - core-codex rules/plugin-files-mode.md additionalContext is 11675 chars (max 10000)

### TypeScript r2
- Exit code: 1 (soft validation warning reported, but generation completed)
- Warnings: [soft] core-cursor-standalone:plugin-files-mode: Bootstrap entry exceeds 10000 chars (10705)

### TypeScript r3
- Exit code: 1 (soft validation warnings reported, but generation completed)
- Warnings:
  - [soft] core-claude:plugin-files-mode: Bootstrap entry exceeds 10000 chars (11753)
  - [soft] core-cursor:plugin-files-mode: Bootstrap entry exceeds 10000 chars (11749)
  - [soft] core-copilot:plugin-files-mode: Bootstrap entry exceeds 10000 chars (11749)
  - [soft] core-codex:plugin-files-mode: Bootstrap entry exceeds 10000 chars (11753)
  - [soft] core-cursor-standalone:plugin-files-mode: Bootstrap entry exceeds 10000 chars (11749)

## R2 differences

### Files only in new-gen-r2 (missing from old-gen-r2)
(none)

### Files only in old-gen-r2 (missing from new-gen-r2)
- core-claude/templates
- core-codex/.agents/templates
- core-copilot/templates
- core-cursor/templates
- core-cursor-standalone/.cursor/hooks

### Files present in both but different (57 files)

#### core-claude/.claude-plugin/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-claude/.claude-plugin/plugin.json	2026-06-05 14:45:57
+++ /tmp/new-gen-r2/core-claude/.claude-plugin/plugin.json	2026-06-11 00:35:21
@@ -1,7 +1,7 @@
 {
   "name": "rosetta",
   "description": "Rosetta for Claude - Software Engineering Accelerator instruction set, workflows, and guardrails.",
-  "version": "2.0.42",
+  "version": "2.0.45",
   "author": {
     "name": "Grid Dynamics",
     "email": "rosetta-support@griddynamics.com"

```

#### core-claude/hooks/hooks.json.tmpl

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-claude/hooks/hooks.json.tmpl	2026-06-05 14:45:57
+++ /tmp/new-gen-r2/core-claude/hooks/hooks.json.tmpl	2026-06-11 00:35:21
@@ -3,7 +3,7 @@
     "SessionStart": [
       {
         "matcher": "startup",
-        "hooks": [{{{bootstrap_hooks_claude}}}]
+        "hooks": [{{{bootstrap_hooks}}}]
       }
     ]{{#if deterministic_hooks}},{{/if}}
 {{#if deterministic_hooks}}

```

#### core-codex/.codex-plugin/hooks.json.tmpl

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-codex/.codex-plugin/hooks.json.tmpl	2026-06-05 14:45:57
+++ /tmp/new-gen-r2/core-codex/.codex-plugin/hooks.json.tmpl	2026-06-11 00:35:21
@@ -3,7 +3,7 @@
     "SessionStart": [
       {
         "matcher": "startup|resume",
-        "hooks": [{{{bootstrap_hooks_codex}}}]
+        "hooks": [{{{bootstrap_hooks}}}]
       }
     ]{{#if deterministic_hooks}},{{/if}}
 {{#if deterministic_hooks}}

```

#### core-codex/.codex-plugin/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-codex/.codex-plugin/plugin.json	2026-06-05 14:45:57
+++ /tmp/new-gen-r2/core-codex/.codex-plugin/plugin.json	2026-06-11 00:35:21
@@ -1,6 +1,6 @@
 {
   "name": "rosetta",
-  "version": "2.0.42",
+  "version": "2.0.45",
   "description": "Rosetta for Codex - Software Engineering Accelerator instruction set, workflows, and guardrails.",
   "author": {
     "name": "Grid Dynamics",

```

#### core-copilot/.github/plugin/hooks.json.tmpl

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/.github/plugin/hooks.json.tmpl	2026-06-05 14:45:57
+++ /tmp/new-gen-r2/core-copilot/.github/plugin/hooks.json.tmpl	2026-06-11 00:35:21
@@ -1,7 +1,7 @@
 {
   "version": 1,
   "hooks": {
-    "sessionStart": [{{{bootstrap_hooks_copilot}}}]{{#if deterministic_hooks}},{{/if}}
+    "sessionStart": [{{{bootstrap_hooks}}}]{{#if deterministic_hooks}},{{/if}}
 {{#if deterministic_hooks}}
     "PreToolUse": [
       {

```

#### core-copilot/.github/plugin/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/.github/plugin/plugin.json	2026-06-05 14:45:57
+++ /tmp/new-gen-r2/core-copilot/.github/plugin/plugin.json	2026-06-11 00:35:21
@@ -1,7 +1,7 @@
 {
   "name": "rosetta",
   "description": "Rosetta for Copilot - Software Engineering Accelerator instruction set, workflows, and guardrails.",
-  "version": "2.0.42",
+  "version": "2.0.45",
   "author": {
     "name": "Grid Dynamics",
     "email": "rosetta-support@griddynamics.com"

```

#### core-copilot/agents/architect.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/agents/architect.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/agents/architect.agent.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: architect
 description: Rosetta Full subagent. Transform requirements into clear, testable tech specifications and architecture.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 baseSchema: docs/schemas/agent.md
 ---

```

#### core-copilot/agents/planner.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/agents/planner.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/agents/planner.agent.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: planner
 description: Rosetta Full subagent. Execution planning from approved intent/specs, producing sequenced plans scaled to request size.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 tags: ["subagent", "agent", "planning"]
 baseSchema: docs/schemas/agent.md

```

#### core-copilot/agents/prompt-engineer.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/agents/prompt-engineer.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/agents/prompt-engineer.agent.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: prompt-engineer
 description: Rosetta Full subagent. Prompt authoring and adaptation — discovery, drafting, and delivery of prompt artifacts under explicit HITL approvals.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 tags: ["subagent", "agent"]
 baseSchema: docs/schemas/agent.md

```

#### core-copilot/commands/self-help-flow.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/commands/self-help-flow.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/commands/self-help-flow.md	2026-06-11 00:35:21
@@ -36,7 +36,7 @@
 <match_and_acquire phase="2" subagent="discoverer" role="Capability matcher">
 
 1. Match user request against `Capability Catalog`.
-2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE commands/coding-flow.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.md FROM KB`).
+2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE commands/coding-flow.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.agent.md FROM KB`).
 3. Extract: purpose, when to use, what to expect, inputs/outputs, HITL gates.
 4. Input: user request + `Capability Catalog`. Output: `Matched Capabilities`.
 5. Recommended skills: any currently useful.

```

#### core-copilot/skills/coding-agents-farm/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/skills/coding-agents-farm/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/skills/coding-agents-farm/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: tasks-or-plan, cli-selection?, model-preferences?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 metadata:
   version: "1.0"

```

#### core-copilot/skills/coding-agents-prompt-authoring/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, existing-prompt?, constraints?, audience?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: prompt-engineer, reviewer, validator
 metadata:

```

#### core-copilot/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md	2026-05-21 10:33:24
+++ /tmp/new-gen-r2/core-copilot/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md	2026-06-11 00:35:21
@@ -440,7 +440,7 @@
 - https://github.com/dair-ai/Prompt-Engineering-Guide/blob/main/guides/prompts-advanced-usage.md
 - https://github.com/brexhq/prompt-engineering/blob/main/README.md
 - https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/05-data-ai/prompt-engineer.md
-- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.md
+- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.agent.md
 - https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/commands/prompt-optimize.md
 - https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/skills/prompt-engineering-patterns/SKILL.md
 - https://github.com/microsoft/amplifier/blob/amplifier-claude/docs/CREATE_YOUR_OWN_TOOLS.md

```

#### core-copilot/skills/coding-agents-prompt-authoring/references/pa-rosetta.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/skills/coding-agents-prompt-authoring/references/pa-rosetta.md	2026-05-29 11:33:03
+++ /tmp/new-gen-r2/core-copilot/skills/coding-agents-prompt-authoring/references/pa-rosetta.md	2026-06-11 00:35:21
@@ -73,7 +73,7 @@
 
 Rosetta define command aliases so that it works with ALL IDEs/CodingAgents, you must follow it as it is critical requirement:
 
-1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
+1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.agent.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
 2. `LIST <folder> IN KB` to list immediate children (folders and files) in folder. GRID/CORE will be cut during upload: `core/agents/<name>.md` => `agents/<name>.md`. Prefer listing over searching if you know folder in advance.
 3. `SEARCH <keywords> IN KB` to search an entire knowledge base by keywords
 4. `USE SKILL <skill-name>` to use the skill, note skill is matching name of SKILL.md frontmatter. skill folder name must match that skill name, no .md extension!

```

#### core-copilot/skills/init-workspace-documentation/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/skills/init-workspace-documentation/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/skills/init-workspace-documentation/SKILL.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: init-workspace-documentation
 description: "Rosetta skill to create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, and AGENT MEMORY.md from workspace analysis."
 license: Apache-2.0
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 tags: ["init", "workspace", "documentation", "context", "architecture"]
 baseSchema: docs/schemas/skill.md
 ---

```

#### core-copilot/skills/planning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/skills/planning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/skills/planning/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, tech-spec?, constraints?, scope?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: planner
 metadata:

```

#### core-copilot/skills/reasoning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/skills/reasoning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/skills/reasoning/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: problem, context?, constraints?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: planner, prompt-engineer
 metadata:

```

#### core-copilot/skills/research/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot/skills/research/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot/skills/research/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: feature, request, scope?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: researcher
 baseSchema: docs/schemas/skill.md

```

#### core-copilot-standalone/.github/agents/architect.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/agents/architect.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/agents/architect.agent.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: architect
 description: Rosetta Full subagent. Transform requirements into clear, testable tech specifications and architecture.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 baseSchema: docs/schemas/agent.md
 ---

```

#### core-copilot-standalone/.github/agents/planner.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/agents/planner.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/agents/planner.agent.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: planner
 description: Rosetta Full subagent. Execution planning from approved intent/specs, producing sequenced plans scaled to request size.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 tags: ["subagent", "agent", "planning"]
 baseSchema: docs/schemas/agent.md

```

#### core-copilot-standalone/.github/agents/prompt-engineer.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/agents/prompt-engineer.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/agents/prompt-engineer.agent.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: prompt-engineer
 description: Rosetta Full subagent. Prompt authoring and adaptation — discovery, drafting, and delivery of prompt artifacts under explicit HITL approvals.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 tags: ["subagent", "agent"]
 baseSchema: docs/schemas/agent.md

```

#### core-copilot-standalone/.github/configure/claude-code.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/configure/claude-code.md	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/configure/claude-code.md	2026-06-11 00:35:21
@@ -15,7 +15,7 @@
 
 - `CLAUDE.md` - **ROOT INSTRUCTIONS** (bootstrap, core rules, always applied)
 - `.claude/claude.md` - alternative location of root core rules file, if exists use it instead
-- `.claude/prompts/` - Custom slash commands
+- `.claude/commands/` - Custom slash commands
 - `.claude/agents/` - Custom agents (specialized assistants)
 - `.claude/skills/` - Agent skills (autonomous capabilities)
 - `.claude/plugins/` - Installable plugins (bundles of commands, agents, skills)
@@ -104,13 +104,13 @@
 
 ## Custom Slash Commands
 
-**Location:** `.claude/prompts/` (legacy, still functional) or `.claude/skills/` (recommended)
+**Location:** `.claude/commands/` (legacy, still functional) or `.claude/skills/` (recommended)
 
 **File Format:** Markdown with optional YAML frontmatter
 
 **Invocation:** `/command-name`
 
-**⚠️ IMPORTANT: Custom slash commands have been merged into skills.** Files at `.claude/prompts/review.md` and `.claude/skills/review/SKILL.md` both create `/review` and work identically. Existing `.claude/prompts/` files keep working, but skills add optional features (supporting files, invocation control). **Be aware of naming conflicts** - if a skill and command share the same name, the skill takes precedence.
+**⚠️ IMPORTANT: Custom slash commands have been merged into skills.** Files at `.claude/commands/review.md` and `.claude/skills/review/SKILL.md` both create `/review` and work identically. Existing `.claude/commands/` files keep working, but skills add optional features (supporting files, invocation control). **Be aware of naming conflicts** - if a skill and command share the same name, the skill takes precedence.
 
 ### Command File Structure
 
@@ -131,7 +131,7 @@
 
 ### Command Example
 
-`.claude/prompts/review.md`:
+`.claude/commands/review.md`:
 
 ```markdown
 ---
@@ -335,7 +335,7 @@
 │   │   ├── react.md
 │   │   └── mysql.md
 │   ├── settings.json              # Project settings, team plugins
-│   ├── prompts/
+│   ├── commands/
 │   │   ├── review.md              # Code review command
 │   │   ├── deploy.md              # Deployment command
 │   │   ├── test.md                # Test generation command
@@ -351,7 +351,7 @@
 │       └── team-standards/        # Custom plugin
 │           ├── .claude-plugin/
 │           │   └── plugin.json
-│           └── prompts/
+│           └── commands/
 ├── src/
 ├── tests/
 └── package.json
@@ -385,7 +385,7 @@
 # DO commit shared configuration
 !.claude/CLAUDE.md
 !.claude/rules/
-!.claude/prompts/
+!.claude/commands/
 !.claude/agents/
 !.claude/skills/
 !.claude/settings.json
@@ -398,7 +398,7 @@
 
 1. **`CLAUDE.md` or `.claude/claude.md`** - Root instructions (always first, highest priority)
 2. **`.claude/settings.json`** - Project settings, team plugins
-3. **`.claude/prompts/`** - Project custom commands
+3. **`.claude/commands/`** - Project custom commands
 4. **`.claude/agents/`** - Project agents
 5. **`.claude/skills/`** - Project skills
 

```

#### core-copilot-standalone/.github/configure/cursor.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/configure/cursor.md	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/configure/cursor.md	2026-06-11 00:35:21
@@ -287,7 +287,7 @@
 
 Custom commands are defined as Markdown files in the `.cursor/commands` directory.
 
-**Location:** `.cursor/prompts/`
+**Location:** `.cursor/commands/`
 
 **File Format:** `.md` (Markdown files)
 
@@ -309,7 +309,7 @@
 
 #### Example Command Files
 
-**`.cursor/prompts/review-code.md`:**
+**`.cursor/commands/review-code.md`:**
 ```markdown
 Please review the following code for:
 - Potential improvements and best practices
@@ -320,7 +320,7 @@
 Provide specific suggestions with code examples.
 ```
 
-**`.cursor/prompts/write-tests.md`:**
+**`.cursor/commands/write-tests.md`:**
 ```markdown
 Generate comprehensive unit tests for the selected code:
 - Test all public methods and functions
@@ -330,7 +330,7 @@
 - Use descriptive test names
 ```
 
-**`.cursor/prompts/add-docs.md`:**
+**`.cursor/commands/add-docs.md`:**
 ```markdown
 Add comprehensive documentation to the selected code:
 - JSDoc/docstring comments for all public APIs
@@ -339,7 +339,7 @@
 - Parameter and return type descriptions
 ```
 
-**`.cursor/prompts/refactor.md`:**
+**`.cursor/commands/refactor.md`:**
 ```markdown
 Refactor the selected code to:
 - Follow SOLID principles
@@ -363,7 +363,7 @@
 - **Add Examples:** Show expected output format when relevant
 - **Reusable:** Design commands for common, repeatable tasks
 - **Team Standards:** Use commands to enforce team conventions
-- **Version Control:** Commit `.cursor/prompts/` to share with team
+- **Version Control:** Commit `.cursor/commands/` to share with team
 
 #### Built-in Commands
 
@@ -391,7 +391,7 @@
 │   │   ├── testing-conventions.mdc
 │   │   ├── api-design.mdc
 │   │   └── security-practices.mdc
-│   ├── prompts/
+│   ├── commands/
 │   │   ├── review-code.md
 │   │   ├── write-tests.md
 │   │   ├── add-docs.md
@@ -438,7 +438,7 @@
 
 1. Commit the entire `.cursor/` directory to version control:
    - `.cursor/rules/` - Project-specific rules (including `agents.mdc`)
-   - `.cursor/prompts/` - Custom slash commands
+   - `.cursor/commands/` - Custom slash commands
    - `.cursor/agents/` - Custom subagents
    - `.cursor/skills/` - Custom skills with scripts and assets
 2. Team members clone the repository with configuration included

```

#### core-copilot-standalone/.github/configure/jetbrains-junie.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/configure/jetbrains-junie.md	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/configure/jetbrains-junie.md	2026-06-11 00:35:21
@@ -96,7 +96,7 @@
 
 ### Location
 
-**Directory:** `.junie/prompts/` (project root)
+**Directory:** `.junie/commands/` (project root)
 
 ### Format Requirements
 
@@ -122,11 +122,11 @@
 
 ### Usage
 
-1. Create `.junie/prompts/explain.md` with the format above
+1. Create `.junie/commands/explain.md` with the format above
 2. Use in Junie: `/explain file=src/main.kt`
 3. Commit to version control for team sharing
 
-**Note:** User-global commands can be stored in `~/.junie/prompts/` but are not project-specific.
+**Note:** User-global commands can be stored in `~/.junie/commands/` but are not project-specific.
 
 ---
 
@@ -241,7 +241,7 @@
 project-root/
 ├── .junie/
 │   ├── guidelines.md              # Junie core (references .aiassistant/rules/)
-│   ├── prompts/                  # Junie custom slash commands
+│   ├── commands/                  # Junie custom slash commands
 │   │   ├── [command-1].md         # Custom command
 │   │   └── [command-n].md         # Custom command
 │   └── mcp/

```

#### core-copilot-standalone/.github/configure/windsurf.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/configure/windsurf.md	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/configure/windsurf.md	2026-06-11 00:35:21
@@ -12,7 +12,7 @@
 **Configuration Locations:**
 - `AGENTS.md` - Cascade behavior instructions
 - `.windsurf/rules/` - Path-specific rules for Cascade
-- `.windsurf/prompts/` - Slash commands for Cascade
+- `.windsurf/commands/` - Slash commands for Cascade
 - `.windsurf/prompts/` - Automation workflows for Cascade
 - `.windsurf/skills/` - Multi-step tasks with supporting resources
 
@@ -154,7 +154,7 @@
 
 Reusable prompts invoked with `/command-name`.
 
-**Location:** `.windsurf/prompts/`
+**Location:** `.windsurf/commands/`
 
 **File Format:** Markdown with optional YAML frontmatter
 
@@ -174,7 +174,7 @@
 
 ### Example Command Files
 
-**`.windsurf/prompts/review.md`:**
+**`.windsurf/commands/review.md`:**
 
 ```markdown
 ---
@@ -216,7 +216,7 @@
 Provide specific feedback with line numbers and actionable suggestions.
 ```
 
-**`.windsurf/prompts/test.md`:**
+**`.windsurf/commands/test.md`:**
 
 ```markdown
 ---
@@ -237,7 +237,7 @@
 Use appropriate mocking for external dependencies.
 ```
 
-**`.windsurf/prompts/deploy.md`:**
+**`.windsurf/commands/deploy.md`:**
 
 ```markdown
 ---
@@ -414,7 +414,7 @@
     │   ├── typescript.md
     │   ├── react.md
     │   └── api.md
-    ├── prompts/
+    ├── commands/
     │   ├── review.md
     │   ├── test.md
     │   └── deploy.md

```

#### core-copilot-standalone/.github/instructions/bootstrap-execution-policy.instructions.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/instructions/bootstrap-execution-policy.instructions.md	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/instructions/bootstrap-execution-policy.instructions.md	2026-06-11 00:35:21
@@ -26,7 +26,7 @@
 <planning_and_documentation_sync_rules>
 
 1. Update IMPLEMENTATION.md after each task.
-2. MUST FULLY FOLLOW prompts/prompts/flows - this ensures users get proper solution for their problem
+2. MUST FULLY FOLLOW prompts/commands/flows - this ensures users get proper solution for their problem
 3. MUST NOT NEVER JUMP DIRECTLY TO IMMEDIATE EXECUTION, you are in ENTERPRISE environment, NOT startup, you MUST REASON, prep steps are direct path to get to the point the right way!
 4. Proactively update, review, structure, restructure, and cleanup Rosetta files: including and not limited to CONTEXT.md, ARCHITECTURE.md, CODEMAP.md, TECHSTACK.md, DEPENDENCIES.md, PATTERNS/\*
 5. Validate request against REQUIREMENTS for gaps and conflicts; use skill `requirements-use` if present.

```

#### core-copilot-standalone/.github/prompts/self-help-flow.prompt.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/prompts/self-help-flow.prompt.md	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/prompts/self-help-flow.prompt.md	2026-06-11 00:35:21
@@ -36,7 +36,7 @@
 <match_and_acquire phase="2" subagent="discoverer" role="Capability matcher">
 
 1. Match user request against `Capability Catalog`.
-2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE prompts/coding-flow.prompt.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.md FROM KB`).
+2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE prompts/coding-flow.prompt.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.agent.md FROM KB`).
 3. Extract: purpose, when to use, what to expect, inputs/outputs, HITL gates.
 4. Input: user request + `Capability Catalog`. Output: `Matched Capabilities`.
 5. Recommended skills: any currently useful.

```

#### core-copilot-standalone/.github/skills/coding-agents-farm/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/skills/coding-agents-farm/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/skills/coding-agents-farm/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: tasks-or-plan, cli-selection?, model-preferences?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 metadata:
   version: "1.0"

```

#### core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, existing-prompt?, constraints?, audience?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: prompt-engineer, reviewer, validator
 metadata:

```

#### core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md	2026-06-11 00:35:21
@@ -440,8 +440,8 @@
 - https://github.com/dair-ai/Prompt-Engineering-Guide/blob/main/guides/prompts-advanced-usage.md
 - https://github.com/brexhq/prompt-engineering/blob/main/README.md
 - https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/05-data-ai/prompt-engineer.md
-- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.md
-- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/prompts/prompt-optimize.md
+- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.agent.md
+- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/commands/prompt-optimize.md
 - https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/skills/prompt-engineering-patterns/SKILL.md
 - https://github.com/microsoft/amplifier/blob/amplifier-claude/docs/CREATE_YOUR_OWN_TOOLS.md
 

```

#### core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md	2026-06-11 00:35:21
@@ -1,7 +1,7 @@
 ## What is Rosetta
 
 Rosetta is an instructions and processes enforcement for AI coding agents (like you).
-It is public OSS and central repository of rules/skills/agents/subagents/prompts/workflows stored as markdown files. 
+It is public OSS and central repository of rules/skills/agents/subagents/commands/workflows stored as markdown files. 
 These artifacts are deployed via plugins (preferred) or MCP into a target real software project repository, which has its own files and folder structure.
 
 Coding agents will always be exposed to the same Rosetta bootstrap as you are now (always injected in context): 

```

#### core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta.md	2026-05-29 11:33:03
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta.md	2026-06-11 00:35:21
@@ -73,7 +73,7 @@
 
 Rosetta define command aliases so that it works with ALL IDEs/CodingAgents, you must follow it as it is critical requirement:
 
-1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
+1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.agent.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
 2. `LIST <folder> IN KB` to list immediate children (folders and files) in folder. GRID/CORE will be cut during upload: `core/agents/<name>.md` => `agents/<name>.md`. Prefer listing over searching if you know folder in advance.
 3. `SEARCH <keywords> IN KB` to search an entire knowledge base by keywords
 4. `USE SKILL <skill-name>` to use the skill, note skill is matching name of SKILL.md frontmatter. skill folder name must match that skill name, no .md extension!

```

#### core-copilot-standalone/.github/skills/init-workspace-documentation/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/skills/init-workspace-documentation/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/skills/init-workspace-documentation/SKILL.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: init-workspace-documentation
 description: "Rosetta skill to create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, and AGENT MEMORY.md from workspace analysis."
 license: Apache-2.0
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 tags: ["init", "workspace", "documentation", "context", "architecture"]
 baseSchema: docs/schemas/skill.md
 ---

```

#### core-copilot-standalone/.github/skills/planning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/skills/planning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/skills/planning/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, tech-spec?, constraints?, scope?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: planner
 metadata:

```

#### core-copilot-standalone/.github/skills/reasoning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/skills/reasoning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/skills/reasoning/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: problem, context?, constraints?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: planner, prompt-engineer
 metadata:

```

#### core-copilot-standalone/.github/skills/research/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/.github/skills/research/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-copilot-standalone/.github/skills/research/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: feature, request, scope?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: researcher
 baseSchema: docs/schemas/skill.md

```

#### core-copilot-standalone/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-copilot-standalone/plugin.json	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-copilot-standalone/plugin.json	2026-06-11 00:35:21
@@ -1,4 +1,4 @@
 {
   "name": "core-copilot-standalone",
-  "version": "2.0.42"
+  "version": "2.0.45"
 }

```

#### core-cursor/.cursor-plugin/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/.cursor-plugin/plugin.json	2026-06-05 14:45:57
+++ /tmp/new-gen-r2/core-cursor/.cursor-plugin/plugin.json	2026-06-11 00:35:21
@@ -1,7 +1,7 @@
 {
   "name": "rosetta",
   "description": "Rosetta for Cursor - Software Engineering Accelerator instruction set, workflows, and guardrails.",
-  "version": "2.0.42",
+  "version": "2.0.45",
   "author": {
     "name": "Grid Dynamics",
     "email": "rosetta-support@griddynamics.com"

```

#### core-cursor/agents/architect.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/agents/architect.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor/agents/architect.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: architect
 description: Rosetta Full subagent. Transform requirements into clear, testable tech specifications and architecture.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 baseSchema: docs/schemas/agent.md
 ---

```

#### core-cursor/agents/planner.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/agents/planner.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor/agents/planner.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: planner
 description: Rosetta Full subagent. Execution planning from approved intent/specs, producing sequenced plans scaled to request size.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 tags: ["subagent", "agent", "planning"]
 baseSchema: docs/schemas/agent.md

```

#### core-cursor/agents/prompt-engineer.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/agents/prompt-engineer.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor/agents/prompt-engineer.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: prompt-engineer
 description: Rosetta Full subagent. Prompt authoring and adaptation — discovery, drafting, and delivery of prompt artifacts under explicit HITL approvals.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 tags: ["subagent", "agent"]
 baseSchema: docs/schemas/agent.md

```

#### core-cursor/skills/coding-agents-farm/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/skills/coding-agents-farm/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor/skills/coding-agents-farm/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: tasks-or-plan, cli-selection?, model-preferences?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 metadata:
   version: "1.0"

```

#### core-cursor/skills/coding-agents-prompt-authoring/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, existing-prompt?, constraints?, audience?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: prompt-engineer, reviewer, validator
 metadata:

```

#### core-cursor/skills/init-workspace-documentation/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/skills/init-workspace-documentation/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor/skills/init-workspace-documentation/SKILL.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: init-workspace-documentation
 description: "Rosetta skill to create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, and AGENT MEMORY.md from workspace analysis."
 license: Apache-2.0
-model: claude-opus-4-8
+model: claude-opus-4-6
 tags: ["init", "workspace", "documentation", "context", "architecture"]
 baseSchema: docs/schemas/skill.md
 ---

```

#### core-cursor/skills/planning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/skills/planning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor/skills/planning/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, tech-spec?, constraints?, scope?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: planner
 metadata:

```

#### core-cursor/skills/reasoning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/skills/reasoning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor/skills/reasoning/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: problem, context?, constraints?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: planner, prompt-engineer
 metadata:

```

#### core-cursor/skills/research/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor/skills/research/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor/skills/research/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: feature, request, scope?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: researcher
 baseSchema: docs/schemas/skill.md

```

#### core-cursor-standalone/.cursor/agents/architect.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/agents/architect.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor-standalone/.cursor/agents/architect.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: architect
 description: Rosetta Full subagent. Transform requirements into clear, testable tech specifications and architecture.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 baseSchema: docs/schemas/agent.md
 ---

```

#### core-cursor-standalone/.cursor/agents/planner.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/agents/planner.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor-standalone/.cursor/agents/planner.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: planner
 description: Rosetta Full subagent. Execution planning from approved intent/specs, producing sequenced plans scaled to request size.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 tags: ["subagent", "agent", "planning"]
 baseSchema: docs/schemas/agent.md

```

#### core-cursor-standalone/.cursor/agents/prompt-engineer.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/agents/prompt-engineer.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor-standalone/.cursor/agents/prompt-engineer.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: prompt-engineer
 description: Rosetta Full subagent. Prompt authoring and adaptation — discovery, drafting, and delivery of prompt artifacts under explicit HITL approvals.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 tags: ["subagent", "agent"]
 baseSchema: docs/schemas/agent.md

```

#### core-cursor-standalone/.cursor/skills/coding-agents-farm/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/skills/coding-agents-farm/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor-standalone/.cursor/skills/coding-agents-farm/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: tasks-or-plan, cli-selection?, model-preferences?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 metadata:
   version: "1.0"

```

#### core-cursor-standalone/.cursor/skills/coding-agents-prompt-authoring/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor-standalone/.cursor/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, existing-prompt?, constraints?, audience?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: prompt-engineer, reviewer, validator
 metadata:

```

#### core-cursor-standalone/.cursor/skills/init-workspace-documentation/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/skills/init-workspace-documentation/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor-standalone/.cursor/skills/init-workspace-documentation/SKILL.md	2026-06-11 00:35:21
@@ -2,7 +2,7 @@
 name: init-workspace-documentation
 description: "Rosetta skill to create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, and AGENT MEMORY.md from workspace analysis."
 license: Apache-2.0
-model: claude-opus-4-8
+model: claude-opus-4-6
 tags: ["init", "workspace", "documentation", "context", "architecture"]
 baseSchema: docs/schemas/skill.md
 ---

```

#### core-cursor-standalone/.cursor/skills/planning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/skills/planning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor-standalone/.cursor/skills/planning/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, tech-spec?, constraints?, scope?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: planner
 metadata:

```

#### core-cursor-standalone/.cursor/skills/reasoning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/skills/reasoning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor-standalone/.cursor/skills/reasoning/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: problem, context?, constraints?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: planner, prompt-engineer
 metadata:

```

#### core-cursor-standalone/.cursor/skills/research/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/.cursor/skills/research/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r2/core-cursor-standalone/.cursor/skills/research/SKILL.md	2026-06-11 00:35:21
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: feature, request, scope?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: researcher
 baseSchema: docs/schemas/skill.md

```

#### core-cursor-standalone/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/core-cursor-standalone/plugin.json	2026-06-11 00:35:14
+++ /tmp/new-gen-r2/core-cursor-standalone/plugin.json	2026-06-11 00:35:21
@@ -1,4 +1,4 @@
 {
   "name": "core-cursor-standalone",
-  "version": "2.0.42"
+  "version": "2.0.45"
 }

```


## R3 differences

### Files only in new-gen-r3 (missing from old-gen-r3)
(none)

### Files only in old-gen-r3 (missing from new-gen-r3)
- core-claude/templates
- core-codex/.agents/templates
- core-copilot/templates
- core-cursor/templates

### Files present in both but different (56 files)

#### core-claude/.claude-plugin/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-claude/.claude-plugin/plugin.json	2026-06-05 14:45:57
+++ /tmp/new-gen-r3/core-claude/.claude-plugin/plugin.json	2026-06-11 00:35:23
@@ -1,7 +1,7 @@
 {
   "name": "rosetta",
   "description": "Rosetta for Claude - Software Engineering Accelerator instruction set, workflows, and guardrails.",
-  "version": "2.0.42",
+  "version": "2.0.45",
   "author": {
     "name": "Grid Dynamics",
     "email": "rosetta-support@griddynamics.com"

```

#### core-claude/hooks/hooks.json.tmpl

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-claude/hooks/hooks.json.tmpl	2026-06-11 00:35:14
+++ /tmp/new-gen-r3/core-claude/hooks/hooks.json.tmpl	2026-06-11 00:35:23
@@ -3,7 +3,7 @@
     "SessionStart": [
       {
         "matcher": "startup",
-        "hooks": [{{{bootstrap_hooks_claude}}}]
+        "hooks": [{{{bootstrap_hooks}}}]
       }
     ]{{#if deterministic_hooks}},{{/if}}
 {{#if deterministic_hooks}}

```

#### core-codex/.codex-plugin/hooks.json.tmpl

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-codex/.codex-plugin/hooks.json.tmpl	2026-06-05 14:45:57
+++ /tmp/new-gen-r3/core-codex/.codex-plugin/hooks.json.tmpl	2026-06-11 00:35:23
@@ -3,7 +3,7 @@
     "SessionStart": [
       {
         "matcher": "startup|resume",
-        "hooks": [{{{bootstrap_hooks_codex}}}]
+        "hooks": [{{{bootstrap_hooks}}}]
       }
     ]{{#if deterministic_hooks}},{{/if}}
 {{#if deterministic_hooks}}

```

#### core-codex/.codex-plugin/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-codex/.codex-plugin/plugin.json	2026-06-05 14:45:57
+++ /tmp/new-gen-r3/core-codex/.codex-plugin/plugin.json	2026-06-11 00:35:23
@@ -1,6 +1,6 @@
 {
   "name": "rosetta",
-  "version": "2.0.42",
+  "version": "2.0.45",
   "description": "Rosetta for Codex - Software Engineering Accelerator instruction set, workflows, and guardrails.",
   "author": {
     "name": "Grid Dynamics",

```

#### core-copilot/.github/plugin/hooks.json.tmpl

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/.github/plugin/hooks.json.tmpl	2026-06-05 14:45:57
+++ /tmp/new-gen-r3/core-copilot/.github/plugin/hooks.json.tmpl	2026-06-11 00:35:23
@@ -1,7 +1,7 @@
 {
   "version": 1,
   "hooks": {
-    "sessionStart": [{{{bootstrap_hooks_copilot}}}]{{#if deterministic_hooks}},{{/if}}
+    "sessionStart": [{{{bootstrap_hooks}}}]{{#if deterministic_hooks}},{{/if}}
 {{#if deterministic_hooks}}
     "PreToolUse": [
       {

```

#### core-copilot/.github/plugin/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/.github/plugin/plugin.json	2026-06-05 14:45:57
+++ /tmp/new-gen-r3/core-copilot/.github/plugin/plugin.json	2026-06-11 00:35:23
@@ -1,7 +1,7 @@
 {
   "name": "rosetta",
   "description": "Rosetta for Copilot - Software Engineering Accelerator instruction set, workflows, and guardrails.",
-  "version": "2.0.42",
+  "version": "2.0.45",
   "author": {
     "name": "Grid Dynamics",
     "email": "rosetta-support@griddynamics.com"

```

#### core-copilot/agents/architect.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/agents/architect.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/agents/architect.agent.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: architect
 description: Rosetta Full subagent. Transform requirements into clear, testable tech specifications and architecture.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 baseSchema: docs/schemas/agent.md
 ---

```

#### core-copilot/agents/planner.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/agents/planner.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/agents/planner.agent.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: planner
 description: Rosetta Full subagent. Execution planning from approved intent/specs, producing sequenced plans scaled to request size.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 tags: ["subagent", "agent", "planning"]
 baseSchema: docs/schemas/agent.md

```

#### core-copilot/agents/prompt-engineer.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/agents/prompt-engineer.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/agents/prompt-engineer.agent.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: prompt-engineer
 description: Rosetta Full subagent. Prompt authoring and adaptation — discovery, drafting, and delivery of prompt artifacts under explicit HITL approvals.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 tags: ["subagent", "agent"]
 baseSchema: docs/schemas/agent.md

```

#### core-copilot/commands/self-help-flow.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/commands/self-help-flow.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/commands/self-help-flow.md	2026-06-11 00:35:23
@@ -41,7 +41,7 @@
 <match_and_acquire phase="2" subagent="discoverer" role="Capability matcher">
 
 1. Match user request against `Capability Catalog`.
-2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE commands/coding-flow.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.md FROM KB`).
+2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE commands/coding-flow.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.agent.md FROM KB`).
 3. Extract: purpose, when to use, what to expect, inputs/outputs, HITL gates.
 4. Input: user request + `Capability Catalog`. Output: `Matched Capabilities`.
 5. Recommended skills: any currently useful.

```

#### core-copilot/skills/coding-agents-farm/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/skills/coding-agents-farm/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/skills/coding-agents-farm/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: tasks-or-plan, cli-selection?, model-preferences?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 metadata:
   version: "1.0"

```

#### core-copilot/skills/coding-agents-prompt-authoring/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, existing-prompt?, constraints?, audience?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: prompt-engineer, reviewer, validator
 metadata:

```

#### core-copilot/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md	2026-05-31 14:52:20
+++ /tmp/new-gen-r3/core-copilot/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md	2026-06-11 00:35:23
@@ -440,7 +440,7 @@
 - https://github.com/dair-ai/Prompt-Engineering-Guide/blob/main/guides/prompts-advanced-usage.md
 - https://github.com/brexhq/prompt-engineering/blob/main/README.md
 - https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/05-data-ai/prompt-engineer.md
-- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.md
+- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.agent.md
 - https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/commands/prompt-optimize.md
 - https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/skills/prompt-engineering-patterns/SKILL.md
 - https://github.com/microsoft/amplifier/blob/amplifier-claude/docs/CREATE_YOUR_OWN_TOOLS.md

```

#### core-copilot/skills/coding-agents-prompt-authoring/references/pa-rosetta.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/skills/coding-agents-prompt-authoring/references/pa-rosetta.md	2026-05-31 14:52:20
+++ /tmp/new-gen-r3/core-copilot/skills/coding-agents-prompt-authoring/references/pa-rosetta.md	2026-06-11 00:35:23
@@ -73,7 +73,7 @@
 
 Rosetta define command aliases so that it works with ALL IDEs/CodingAgents, you must follow it as it is critical requirement:
 
-1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
+1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.agent.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
 2. `LIST <folder> IN KB` to list immediate children (folders and files) in folder. GRID/CORE will be cut during upload: `core/agents/<name>.md` => `agents/<name>.md`. Prefer listing over searching if you know folder in advance.
 3. `SEARCH <keywords> IN KB` to search an entire knowledge base by keywords
 4. `USE SKILL <skill-name>` to use the skill, note skill is matching name of SKILL.md frontmatter. skill folder name must match that skill name, no .md extension!

```

#### core-copilot/skills/init-workspace-documentation/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/skills/init-workspace-documentation/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/skills/init-workspace-documentation/SKILL.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: init-workspace-documentation
 description: "Rosetta skill to create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, and AGENT MEMORY.md from workspace analysis."
 license: Apache-2.0
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 tags: ["init", "workspace", "documentation", "context", "architecture"]
 baseSchema: docs/schemas/skill.md
 ---

```

#### core-copilot/skills/planning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/skills/planning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/skills/planning/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, tech-spec?, constraints?, scope?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: planner
 metadata:

```

#### core-copilot/skills/reasoning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/skills/reasoning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/skills/reasoning/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: problem, context?, constraints?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: planner, prompt-engineer
 metadata:

```

#### core-copilot/skills/research/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot/skills/research/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot/skills/research/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: feature, request, scope?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: researcher
 baseSchema: docs/schemas/skill.md

```

#### core-copilot-standalone/.github/agents/architect.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/agents/architect.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/agents/architect.agent.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: architect
 description: Rosetta Full subagent. Transform requirements into clear, testable tech specifications and architecture.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 baseSchema: docs/schemas/agent.md
 ---

```

#### core-copilot-standalone/.github/agents/planner.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/agents/planner.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/agents/planner.agent.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: planner
 description: Rosetta Full subagent. Execution planning from approved intent/specs, producing sequenced plans scaled to request size.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 tags: ["subagent", "agent", "planning"]
 baseSchema: docs/schemas/agent.md

```

#### core-copilot-standalone/.github/agents/prompt-engineer.agent.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/agents/prompt-engineer.agent.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/agents/prompt-engineer.agent.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: prompt-engineer
 description: Rosetta Full subagent. Prompt authoring and adaptation — discovery, drafting, and delivery of prompt artifacts under explicit HITL approvals.
 mode: subagent
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 readonly: false
 tags: ["subagent", "agent"]
 baseSchema: docs/schemas/agent.md

```

#### core-copilot-standalone/.github/configure/claude-code.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/configure/claude-code.md	2026-06-11 00:35:15
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/configure/claude-code.md	2026-06-11 00:35:23
@@ -15,7 +15,7 @@
 
 - `CLAUDE.md` - **ROOT INSTRUCTIONS** (bootstrap, core rules, always applied)
 - `.claude/claude.md` - alternative location of root core rules file, if exists use it instead
-- `.claude/prompts/` - Custom slash commands
+- `.claude/commands/` - Custom slash commands
 - `.claude/agents/` - Custom agents (specialized assistants)
 - `.claude/skills/` - Agent skills (autonomous capabilities)
 - `.claude/plugins/` - Installable plugins (bundles of commands, agents, skills)
@@ -104,13 +104,13 @@
 
 ## Custom Slash Commands
 
-**Location:** `.claude/prompts/` (legacy, still functional) or `.claude/skills/` (recommended)
+**Location:** `.claude/commands/` (legacy, still functional) or `.claude/skills/` (recommended)
 
 **File Format:** Markdown with optional YAML frontmatter
 
 **Invocation:** `/command-name`
 
-**⚠️ IMPORTANT: Custom slash commands have been merged into skills.** Files at `.claude/prompts/review.md` and `.claude/skills/review/SKILL.md` both create `/review` and work identically. Existing `.claude/prompts/` files keep working, but skills add optional features (supporting files, invocation control). **Be aware of naming conflicts** - if a skill and command share the same name, the skill takes precedence.
+**⚠️ IMPORTANT: Custom slash commands have been merged into skills.** Files at `.claude/commands/review.md` and `.claude/skills/review/SKILL.md` both create `/review` and work identically. Existing `.claude/commands/` files keep working, but skills add optional features (supporting files, invocation control). **Be aware of naming conflicts** - if a skill and command share the same name, the skill takes precedence.
 
 ### Command File Structure
 
@@ -131,7 +131,7 @@
 
 ### Command Example
 
-`.claude/prompts/review.md`:
+`.claude/commands/review.md`:
 
 ```markdown
 ---
@@ -335,7 +335,7 @@
 │   │   ├── react.md
 │   │   └── mysql.md
 │   ├── settings.json              # Project settings, team plugins
-│   ├── prompts/
+│   ├── commands/
 │   │   ├── review.md              # Code review command
 │   │   ├── deploy.md              # Deployment command
 │   │   ├── test.md                # Test generation command
@@ -351,7 +351,7 @@
 │       └── team-standards/        # Custom plugin
 │           ├── .claude-plugin/
 │           │   └── plugin.json
-│           └── prompts/
+│           └── commands/
 ├── src/
 ├── tests/
 └── package.json
@@ -385,7 +385,7 @@
 # DO commit shared configuration
 !.claude/CLAUDE.md
 !.claude/rules/
-!.claude/prompts/
+!.claude/commands/
 !.claude/agents/
 !.claude/skills/
 !.claude/settings.json
@@ -398,7 +398,7 @@
 
 1. **`CLAUDE.md` or `.claude/claude.md`** - Root instructions (always first, highest priority)
 2. **`.claude/settings.json`** - Project settings, team plugins
-3. **`.claude/prompts/`** - Project custom commands
+3. **`.claude/commands/`** - Project custom commands
 4. **`.claude/agents/`** - Project agents
 5. **`.claude/skills/`** - Project skills
 

```

#### core-copilot-standalone/.github/configure/cursor.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/configure/cursor.md	2026-06-11 00:35:15
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/configure/cursor.md	2026-06-11 00:35:23
@@ -287,7 +287,7 @@
 
 Custom commands are defined as Markdown files in the `.cursor/commands` directory.
 
-**Location:** `.cursor/prompts/`
+**Location:** `.cursor/commands/`
 
 **File Format:** `.md` (Markdown files)
 
@@ -309,7 +309,7 @@
 
 #### Example Command Files
 
-**`.cursor/prompts/review-code.md`:**
+**`.cursor/commands/review-code.md`:**
 ```markdown
 Please review the following code for:
 - Potential improvements and best practices
@@ -320,7 +320,7 @@
 Provide specific suggestions with code examples.
 ```
 
-**`.cursor/prompts/write-tests.md`:**
+**`.cursor/commands/write-tests.md`:**
 ```markdown
 Generate comprehensive unit tests for the selected code:
 - Test all public methods and functions
@@ -330,7 +330,7 @@
 - Use descriptive test names
 ```
 
-**`.cursor/prompts/add-docs.md`:**
+**`.cursor/commands/add-docs.md`:**
 ```markdown
 Add comprehensive documentation to the selected code:
 - JSDoc/docstring comments for all public APIs
@@ -339,7 +339,7 @@
 - Parameter and return type descriptions
 ```
 
-**`.cursor/prompts/refactor.md`:**
+**`.cursor/commands/refactor.md`:**
 ```markdown
 Refactor the selected code to:
 - Follow SOLID principles
@@ -363,7 +363,7 @@
 - **Add Examples:** Show expected output format when relevant
 - **Reusable:** Design commands for common, repeatable tasks
 - **Team Standards:** Use commands to enforce team conventions
-- **Version Control:** Commit `.cursor/prompts/` to share with team
+- **Version Control:** Commit `.cursor/commands/` to share with team
 
 #### Built-in Commands
 
@@ -391,7 +391,7 @@
 │   │   ├── testing-conventions.mdc
 │   │   ├── api-design.mdc
 │   │   └── security-practices.mdc
-│   ├── prompts/
+│   ├── commands/
 │   │   ├── review-code.md
 │   │   ├── write-tests.md
 │   │   ├── add-docs.md
@@ -438,7 +438,7 @@
 
 1. Commit the entire `.cursor/` directory to version control:
    - `.cursor/rules/` - Project-specific rules (including `agents.mdc`)
-   - `.cursor/prompts/` - Custom slash commands
+   - `.cursor/commands/` - Custom slash commands
    - `.cursor/agents/` - Custom subagents
    - `.cursor/skills/` - Custom skills with scripts and assets
 2. Team members clone the repository with configuration included

```

#### core-copilot-standalone/.github/configure/jetbrains-junie.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/configure/jetbrains-junie.md	2026-06-11 00:35:15
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/configure/jetbrains-junie.md	2026-06-11 00:35:23
@@ -96,7 +96,7 @@
 
 ### Location
 
-**Directory:** `.junie/prompts/` (project root)
+**Directory:** `.junie/commands/` (project root)
 
 ### Format Requirements
 
@@ -122,11 +122,11 @@
 
 ### Usage
 
-1. Create `.junie/prompts/explain.md` with the format above
+1. Create `.junie/commands/explain.md` with the format above
 2. Use in Junie: `/explain file=src/main.kt`
 3. Commit to version control for team sharing
 
-**Note:** User-global commands can be stored in `~/.junie/prompts/` but are not project-specific.
+**Note:** User-global commands can be stored in `~/.junie/commands/` but are not project-specific.
 
 ---
 
@@ -241,7 +241,7 @@
 project-root/
 ├── .junie/
 │   ├── guidelines.md              # Junie core (references .aiassistant/rules/)
-│   ├── prompts/                  # Junie custom slash commands
+│   ├── commands/                  # Junie custom slash commands
 │   │   ├── [command-1].md         # Custom command
 │   │   └── [command-n].md         # Custom command
 │   └── mcp/

```

#### core-copilot-standalone/.github/configure/windsurf.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/configure/windsurf.md	2026-06-11 00:35:15
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/configure/windsurf.md	2026-06-11 00:35:23
@@ -12,7 +12,7 @@
 **Configuration Locations:**
 - `AGENTS.md` - Cascade behavior instructions
 - `.windsurf/rules/` - Path-specific rules for Cascade
-- `.windsurf/prompts/` - Slash commands for Cascade
+- `.windsurf/commands/` - Slash commands for Cascade
 - `.windsurf/prompts/` - Automation workflows for Cascade
 - `.windsurf/skills/` - Multi-step tasks with supporting resources
 
@@ -154,7 +154,7 @@
 
 Reusable prompts invoked with `/command-name`.
 
-**Location:** `.windsurf/prompts/`
+**Location:** `.windsurf/commands/`
 
 **File Format:** Markdown with optional YAML frontmatter
 
@@ -174,7 +174,7 @@
 
 ### Example Command Files
 
-**`.windsurf/prompts/review.md`:**
+**`.windsurf/commands/review.md`:**
 
 ```markdown
 ---
@@ -216,7 +216,7 @@
 Provide specific feedback with line numbers and actionable suggestions.
 ```
 
-**`.windsurf/prompts/test.md`:**
+**`.windsurf/commands/test.md`:**
 
 ```markdown
 ---
@@ -237,7 +237,7 @@
 Use appropriate mocking for external dependencies.
 ```
 
-**`.windsurf/prompts/deploy.md`:**
+**`.windsurf/commands/deploy.md`:**
 
 ```markdown
 ---
@@ -414,7 +414,7 @@
     │   ├── typescript.md
     │   ├── react.md
     │   └── api.md
-    ├── prompts/
+    ├── commands/
     │   ├── review.md
     │   ├── test.md
     │   └── deploy.md

```

#### core-copilot-standalone/.github/prompts/self-help-flow.prompt.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/prompts/self-help-flow.prompt.md	2026-06-11 00:35:15
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/prompts/self-help-flow.prompt.md	2026-06-11 00:35:23
@@ -41,7 +41,7 @@
 <match_and_acquire phase="2" subagent="discoverer" role="Capability matcher">
 
 1. Match user request against `Capability Catalog`.
-2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE prompts/coding-flow.prompt.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.md FROM KB`).
+2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE prompts/coding-flow.prompt.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.agent.md FROM KB`).
 3. Extract: purpose, when to use, what to expect, inputs/outputs, HITL gates.
 4. Input: user request + `Capability Catalog`. Output: `Matched Capabilities`.
 5. Recommended skills: any currently useful.

```

#### core-copilot-standalone/.github/skills/coding-agents-farm/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/skills/coding-agents-farm/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/skills/coding-agents-farm/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: tasks-or-plan, cli-selection?, model-preferences?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 metadata:
   version: "1.0"

```

#### core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, existing-prompt?, constraints?, audience?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: prompt-engineer, reviewer, validator
 metadata:

```

#### core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md	2026-06-11 00:35:15
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md	2026-06-11 00:35:23
@@ -440,8 +440,8 @@
 - https://github.com/dair-ai/Prompt-Engineering-Guide/blob/main/guides/prompts-advanced-usage.md
 - https://github.com/brexhq/prompt-engineering/blob/main/README.md
 - https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/05-data-ai/prompt-engineer.md
-- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.md
-- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/prompts/prompt-optimize.md
+- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.agent.md
+- https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/commands/prompt-optimize.md
 - https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/skills/prompt-engineering-patterns/SKILL.md
 - https://github.com/microsoft/amplifier/blob/amplifier-claude/docs/CREATE_YOUR_OWN_TOOLS.md
 

```

#### core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md	2026-06-11 00:35:15
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md	2026-06-11 00:35:23
@@ -1,7 +1,7 @@
 ## What is Rosetta
 
 Rosetta is an instructions and processes enforcement for AI coding agents (like you).
-It is public OSS and central repository of rules/skills/agents/subagents/prompts/workflows stored as markdown files. 
+It is public OSS and central repository of rules/skills/agents/subagents/commands/workflows stored as markdown files. 
 These artifacts are deployed via plugins (preferred) or MCP into a target real software project repository, which has its own files and folder structure.
 
 Coding agents will always be exposed to the same Rosetta bootstrap as you are now (always injected in context): 

```

#### core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta.md	2026-05-31 14:52:20
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta.md	2026-06-11 00:35:23
@@ -73,7 +73,7 @@
 
 Rosetta define command aliases so that it works with ALL IDEs/CodingAgents, you must follow it as it is critical requirement:
 
-1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
+1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.agent.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
 2. `LIST <folder> IN KB` to list immediate children (folders and files) in folder. GRID/CORE will be cut during upload: `core/agents/<name>.md` => `agents/<name>.md`. Prefer listing over searching if you know folder in advance.
 3. `SEARCH <keywords> IN KB` to search an entire knowledge base by keywords
 4. `USE SKILL <skill-name>` to use the skill, note skill is matching name of SKILL.md frontmatter. skill folder name must match that skill name, no .md extension!

```

#### core-copilot-standalone/.github/skills/init-workspace-documentation/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/skills/init-workspace-documentation/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/skills/init-workspace-documentation/SKILL.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: init-workspace-documentation
 description: "Rosetta skill to create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, and AGENT MEMORY.md from workspace analysis."
 license: Apache-2.0
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 tags: ["init", "workspace", "documentation", "context", "architecture"]
 baseSchema: docs/schemas/skill.md
 ---

```

#### core-copilot-standalone/.github/skills/planning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/skills/planning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/skills/planning/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, tech-spec?, constraints?, scope?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: planner
 metadata:

```

#### core-copilot-standalone/.github/skills/reasoning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/skills/reasoning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/skills/reasoning/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: problem, context?, constraints?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: planner, prompt-engineer
 metadata:

```

#### core-copilot-standalone/.github/skills/research/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/.github/skills/research/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-copilot-standalone/.github/skills/research/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: feature, request, scope?
-model: Claude Opus 4.8
+model: Claude Opus 4.6
 context: default
 agent: researcher
 baseSchema: docs/schemas/skill.md

```

#### core-copilot-standalone/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-copilot-standalone/plugin.json	2026-06-11 00:35:15
+++ /tmp/new-gen-r3/core-copilot-standalone/plugin.json	2026-06-11 00:35:23
@@ -1,4 +1,4 @@
 {
   "name": "core-copilot-standalone",
-  "version": "2.0.42"
+  "version": "2.0.45"
 }

```

#### core-cursor/.cursor-plugin/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/.cursor-plugin/plugin.json	2026-06-05 14:45:57
+++ /tmp/new-gen-r3/core-cursor/.cursor-plugin/plugin.json	2026-06-11 00:35:23
@@ -1,7 +1,7 @@
 {
   "name": "rosetta",
   "description": "Rosetta for Cursor - Software Engineering Accelerator instruction set, workflows, and guardrails.",
-  "version": "2.0.42",
+  "version": "2.0.45",
   "author": {
     "name": "Grid Dynamics",
     "email": "rosetta-support@griddynamics.com"

```

#### core-cursor/agents/architect.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/agents/architect.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor/agents/architect.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: architect
 description: Rosetta Full subagent. Transform requirements into clear, testable tech specifications and architecture.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 baseSchema: docs/schemas/agent.md
 ---

```

#### core-cursor/agents/planner.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/agents/planner.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor/agents/planner.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: planner
 description: Rosetta Full subagent. Execution planning from approved intent/specs, producing sequenced plans scaled to request size.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 tags: ["subagent", "agent", "planning"]
 baseSchema: docs/schemas/agent.md

```

#### core-cursor/agents/prompt-engineer.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/agents/prompt-engineer.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor/agents/prompt-engineer.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: prompt-engineer
 description: Rosetta Full subagent. Prompt authoring and adaptation — discovery, drafting, and delivery of prompt artifacts under explicit HITL approvals.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 tags: ["subagent", "agent"]
 baseSchema: docs/schemas/agent.md

```

#### core-cursor/skills/coding-agents-farm/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/skills/coding-agents-farm/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor/skills/coding-agents-farm/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: tasks-or-plan, cli-selection?, model-preferences?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 metadata:
   version: "1.0"

```

#### core-cursor/skills/coding-agents-prompt-authoring/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, existing-prompt?, constraints?, audience?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: prompt-engineer, reviewer, validator
 metadata:

```

#### core-cursor/skills/init-workspace-documentation/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/skills/init-workspace-documentation/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor/skills/init-workspace-documentation/SKILL.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: init-workspace-documentation
 description: "Rosetta skill to create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, and AGENT MEMORY.md from workspace analysis."
 license: Apache-2.0
-model: claude-opus-4-8
+model: claude-opus-4-6
 tags: ["init", "workspace", "documentation", "context", "architecture"]
 baseSchema: docs/schemas/skill.md
 ---

```

#### core-cursor/skills/planning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/skills/planning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor/skills/planning/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, tech-spec?, constraints?, scope?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: planner
 metadata:

```

#### core-cursor/skills/reasoning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/skills/reasoning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor/skills/reasoning/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: problem, context?, constraints?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: planner, prompt-engineer
 metadata:

```

#### core-cursor/skills/research/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor/skills/research/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor/skills/research/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: feature, request, scope?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: researcher
 baseSchema: docs/schemas/skill.md

```

#### core-cursor-standalone/.cursor/agents/architect.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/.cursor/agents/architect.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor-standalone/.cursor/agents/architect.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: architect
 description: Rosetta Full subagent. Transform requirements into clear, testable tech specifications and architecture.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 baseSchema: docs/schemas/agent.md
 ---

```

#### core-cursor-standalone/.cursor/agents/planner.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/.cursor/agents/planner.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor-standalone/.cursor/agents/planner.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: planner
 description: Rosetta Full subagent. Execution planning from approved intent/specs, producing sequenced plans scaled to request size.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 tags: ["subagent", "agent", "planning"]
 baseSchema: docs/schemas/agent.md

```

#### core-cursor-standalone/.cursor/agents/prompt-engineer.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/.cursor/agents/prompt-engineer.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor-standalone/.cursor/agents/prompt-engineer.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: prompt-engineer
 description: Rosetta Full subagent. Prompt authoring and adaptation — discovery, drafting, and delivery of prompt artifacts under explicit HITL approvals.
 mode: subagent
-model: claude-opus-4-8
+model: claude-opus-4-6
 readonly: false
 tags: ["subagent", "agent"]
 baseSchema: docs/schemas/agent.md

```

#### core-cursor-standalone/.cursor/skills/coding-agents-farm/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/.cursor/skills/coding-agents-farm/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor-standalone/.cursor/skills/coding-agents-farm/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: tasks-or-plan, cli-selection?, model-preferences?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 metadata:
   version: "1.0"

```

#### core-cursor-standalone/.cursor/skills/coding-agents-prompt-authoring/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/.cursor/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor-standalone/.cursor/skills/coding-agents-prompt-authoring/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, existing-prompt?, constraints?, audience?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: prompt-engineer, reviewer, validator
 metadata:

```

#### core-cursor-standalone/.cursor/skills/init-workspace-documentation/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/.cursor/skills/init-workspace-documentation/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor-standalone/.cursor/skills/init-workspace-documentation/SKILL.md	2026-06-11 00:35:23
@@ -2,7 +2,7 @@
 name: init-workspace-documentation
 description: "Rosetta skill to create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, and AGENT MEMORY.md from workspace analysis."
 license: Apache-2.0
-model: claude-opus-4-8
+model: claude-opus-4-6
 tags: ["init", "workspace", "documentation", "context", "architecture"]
 baseSchema: docs/schemas/skill.md
 ---

```

#### core-cursor-standalone/.cursor/skills/planning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/.cursor/skills/planning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor-standalone/.cursor/skills/planning/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: request, tech-spec?, constraints?, scope?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: planner
 metadata:

```

#### core-cursor-standalone/.cursor/skills/reasoning/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/.cursor/skills/reasoning/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor-standalone/.cursor/skills/reasoning/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: problem, context?, constraints?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: planner, prompt-engineer
 metadata:

```

#### core-cursor-standalone/.cursor/skills/research/SKILL.md

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/.cursor/skills/research/SKILL.md	2026-06-10 19:17:11
+++ /tmp/new-gen-r3/core-cursor-standalone/.cursor/skills/research/SKILL.md	2026-06-11 00:35:23
@@ -5,7 +5,7 @@
 disable-model-invocation: false
 user-invocable: true
 argument-hint: feature, request, scope?
-model: claude-opus-4-8
+model: claude-opus-4-6
 context: default
 agent: researcher
 baseSchema: docs/schemas/skill.md

```

#### core-cursor-standalone/plugin.json

```diff
--- /Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/core-cursor-standalone/plugin.json	2026-06-11 00:35:15
+++ /tmp/new-gen-r3/core-cursor-standalone/plugin.json	2026-06-11 00:35:23
@@ -1,4 +1,4 @@
 {
   "name": "core-cursor-standalone",
-  "version": "2.0.42"
+  "version": "2.0.45"
 }

```

