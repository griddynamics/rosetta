## What is Rosetta

Rosetta is an instructions and processes enforcement for AI coding agents (like you).
It is public OSS and central repository of rules/skills/agents/subagents/commands/workflows stored as markdown files. 
These artifacts are deployed via plugins (preferred) or MCP into a target real software project repository, which has its own files and folder structure.

Top-agent sessions receive `bootstrap-alwayson.md` plus exactly one mode file: `mcp-files-mode.md` (MCP), `plugin-files-mode.md` (plugin/standalone), or `local-files-mode.md` (developing Rosetta). Spawned subagents receive only `bootstrap-alwayson.md` + their dispatch prompt, which requires `subagent-directives` and any task-needed skills. Heavy process loads on demand through skills and workflows; the plugin mode file carries no alias mapping because typed aliases operate natively on plugin files.

Rosetta predefines key folders and files in the `bootstrap_rosetta_files` XML tag inside SKILL `load-project-context`.

When evaluating a Rosetta prompt, simulate the perspective of an agent running inside a real target project, not on rosetta repository.
References to files in that structure are valid by design (except init-workspace workflow - which creates or upgrades them).

Read `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` in current rosetta repo to better understand rosetta implementation itself. Remember that current and target repositories ARE DIFFERENT (this content is only available in this repo!).

MUST USE SKILL `orchestration` for all subagent dispatches.
MUST USE SKILL `coding-agents-prompt-authoring` to review and to harden the changes and at least must include pa-rosetta.md, pa-patterns, pa-hardening.md, pa-schemas.md.
Subagents MUST USE SKILL `coding-agents-prompt-authoring` with references listed above (and more if they determine additional references are needed).

Each orchestrator/subagent instance can handle at most 7 prompt files (hard cap). Apply the small/large split thresholds defined in the Workflow section; when splitting, group prompts by release (instructions/r*), then by their prompt families or usage patterns.

## How to think about Rosetta

`instructions` folder has folders for releases (r1, r2, r3, etc).
One agent works with only one release (no cross refs), upgrades switch releases to latest. 
N-1 is supported.
Instructions are uploaded to RAGFlow (all releases as separate datasets), where MCP reads it from latest stable dataset only.
Instructions are also copied and adapted by plugin generator to generate coding agent plugins (to avoid MCP altogether).
Instructions (skills, rules, templates, prompts, workflows, commands, agents, subagents) are used by AI coding agents themselves, those are not user facing.
We only support large SOTA models (by Anthropic, OpenAI, Google, z.ai, DeepSeek, Kimi) of different tiers (fast, workhorse, complex) minding overall cost. AI coding agent on every call passes the entire conversation history and we pay for all of those tokens every time (this is how LLMs work, cached tokens though payed with 80% discount), thus reducing history by using progressive disclosure, utilizing subagents and by compressing text especially in bootstraps is very important to reduce the actual cost. Note, every action (to load skill, to read files, to write file, to execute tool call, etc, and results of those) is full round trip. AI coding agents can only handle 5 steps at once (if more - LLM skip steps, etc) and our primary goal is reliability.
Other engineers install Rosetta plugins (preferred) or MCP to their TARGET repos (so no rosetta repo context available), those plugins/mcp then internally pass instructions to coding agents on how to do things right. Since instructions are not user facing we can and should take compression shortcuts (terms, phrases, intermediate documents, etc). Exception: parts of instructions for user facing results (messages and user facing documents).
AI coding agents support subagents feature: the top agent assumes orchestrator role and executes subagents sequentially or in parallel, basically managing its own team. Very small tasks do not need subagent overhead, but medium to large require use of subagents to reduce cost and prevent context compaction. Subagent run physically in he same process and environment (only LLM context is fresh).
If conversation history runs for long or loads too many files/calls it overflows. AI coding agents perform context compaction.
Context compaction destroys majority of knowledge (bootstraps, reasoning, original code) and renders coding agent fully unreliable.
You review original instructions so that they work properly within coding agents on the target repository. 
Must distinguish repos, actors, prompts, etc as defined above.
Use references `rosetta`, `cto-ims-kb`, `RulesOfPower` (all must be).
