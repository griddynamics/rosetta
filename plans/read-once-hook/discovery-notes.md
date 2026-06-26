# Discovery Notes — `read-once` hook (`r3`)

This file captures refreshed discovery for the Rosetta-repo `read-once` hook task, grounded in official current docs plus local Rosetta runtime/generator code.

## Status: refreshed after per-surface official-doc discovery

## Scope

- Repository: Rosetta itself, not a target project
- Release: `r3` only
- Discovery objective: determine what hooks/events actually exist today per surface, what read-prevention/reset paths are real, and what Rosetta must absorb in the shared normalization/runtime layer

## Upstream Source Fully Read

The original upstream folder was enumerated and every file was read:

- `.gitkeep`
- `LICENSE`
- `README.md`
- `compact.ps1`
- `compact.sh`
- `hook.ps1`
- `hook.sh`
- `install.sh`
- `read-once`
- `read-once.ps1`
- `test-ps1.py`
- `test.sh`

## Upstream Behavior Grounded

The upstream toolset provides:

- repeated-read dedupe
- session-oriented caching
- advisory cross-session awareness
- `warn` and `deny` modes
- TTL expiration
- diff/snapshot support
- stats/token estimation
- compact-triggered reset path

## Local Rosetta Files Analyzed

Core context:

- `docs/CONTEXT.md`
- `docs/ARCHITECTURE.md`
- `gain.json`
- `agents/IMPLEMENTATION.md`
- `agents/MEMORY.md`
- `instructions/r3/core/skills/coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md`
- `instructions/r3/core/skills/reasoning/SKILL.md`
- `instructions/r3/core/workflows/coding-flow.md`
- `instructions/r3/core/rules/bootstrap-rosetta-files.md`

Hooks runtime and adapters:

- `src/hooks/src/runtime/define-hook.ts`
- `src/hooks/src/runtime/types.ts`
- `src/hooks/src/runtime/run-hook.ts`
- `src/hooks/src/runtime/ide-registry.ts`
- `src/hooks/src/runtime/path-utils.ts`
- `src/hooks/src/runtime/debug-log.ts`
- `src/hooks/src/runtime/throttle.ts`
- `src/hooks/src/adapter.ts`
- `src/hooks/src/adapters/claude-code.ts`
- `src/hooks/src/adapters/codex.ts`
- `src/hooks/src/adapters/cursor.ts`
- `src/hooks/src/adapters/copilot.ts`
- `src/hooks/src/adapters/windsurf.ts`
- `src/hooks/src/runtime/ide-rows/claude-code.ts`
- `src/hooks/src/runtime/ide-rows/codex.ts`
- `src/hooks/src/runtime/ide-rows/cursor.ts`
- `src/hooks/src/runtime/ide-rows/copilot.ts`
- `src/hooks/src/runtime/ide-rows/windsurf.ts`

Existing hook patterns:

- `src/hooks/src/hooks/loose-files.ts`
- `src/hooks/src/hooks/dangerous-actions.ts`
- `src/hooks/src/hooks/codemap-refresh.ts`

Tests and generator:

- `src/hooks/tests/codemap-refresh.test.ts`
- `src/hooks/tests/runtime/run-hook.test.ts`
- `src/hooks/tests/regression/hooks-registered.test.ts`
- `src/hooks/tests/regression/bundle-isolation.test.ts`
- `src/hooks/scripts/build-bundles.mjs`
- `src/rosettify-plugins/src/spec/releases.ts`
- `src/rosettify-plugins/src/spec/targets.ts`
- `src/rosettify-plugins/src/generate.ts`
- `src/rosettify-plugins/src/plugin-processors/plugin-sync-bundles.ts`
- `src/rosettify-plugins/tests/e2e/parity.e2e.test.ts`
- hook templates under `plugins/core-*`

## Official Surface Discovery

Separate subagents were used per surface, as explicitly required by the user.

### GitHub Copilot

Official sources used:

- `https://docs.github.com/en/copilot/reference/hooks-reference`
- `https://docs.github.com/en/copilot/concepts/agents/hooks`
- `https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks`
- `https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/use-hooks`

Grounded facts:

- Official event surface is much larger than Rosetta currently models.
- Official events include `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `errorOccurred`, `preCompact`, `agentStop`, `subagentStart`, `subagentStop`, plus CLI-only `permissionRequest` and `notification`.
- `Read` is officially hookable in tool hooks:
  - native tool name `view`
  - PascalCase-compatible alias `Read`
- `sessionId` / `session_id` is officially present.
- `preCompact` officially exists.

Rosetta gaps:

- Copilot shared normalization is far too small.
- Current Copilot tool-kind mapping is stale and incorrectly treats `read` as unsupported.
- Current adapter/context/output shapes drop a large amount of official hook data and output capability.
- Local Copilot guidance in Rosetta is stale relative to official docs.

Implication:

- Copilot is not “unsupported for read interception” in reality.
- Rosetta must adopt official Copilot read/event/session/compaction surfaces in shared normalization instead of hardcoding the old reduced model.

### Claude Code

Official sources used:

- `https://code.claude.com/docs/en/hooks`
- `https://code.claude.com/docs/en/hooks-guide`

Grounded facts:

- Claude Code currently documents 30 hook events.
- `Read` interception is real, but it is via tool hooks, not a dedicated read event:
  - `PreToolUse` for `Read`
  - `PostToolUse`
  - model-visible `Read` output explicitly documented in `PostToolBatch`
- Reset/compaction-adjacent lifecycle exists:
  - `SessionStart.source = startup|resume|clear|compact`
  - `SessionEnd.reason` includes `clear`
  - `PreCompact` and `PostCompact`
  - `InstructionsLoaded.load_reason = compact`

Rosetta gaps:

- Shared Claude event surface is drastically incomplete.
- Claude adapter currently requires `tool_input`, so many official non-tool events are missed entirely.
- Shared runtime is too tool-centric for Claude’s real lifecycle hooks.
- Shared output typing is too narrow for official Claude outputs.
- Core Claude plugin template is behind reality and excludes `Read`.

Implication:

- Claude is not just `PreToolUse/PostToolUse/SessionStart`.
- Shared normalization must be broadened so common hook code can use real Claude lifecycle events without IDE-specific branching.

### Cursor

Official sources used:

- `https://cursor.com/docs/hooks`
- `https://cursor.com/docs/reference/third-party-hooks`
- `https://cursor.com/docs/reference/plugins`

Grounded facts:

- Cursor currently exposes 21 documented hook events.
- Native read interception is stronger than Rosetta currently models:
  - `beforeReadFile`
  - `beforeTabFileRead`
  - `preToolUse` also fires for `Read`, but native read hooks are the real platform-level read interceptors
- Session identifiers:
  - `conversation_id`
  - `generation_id`
  - `session_id` on `sessionStart` / `sessionEnd`
- `preCompact` exists but is observational only.

Rosetta gaps:

- Cursor shared event mapping is far too small.
- Rosetta uses the wrong prompt-submit event name for Cursor.
- Cursor detection is too narrow for the native event surface.
- Tool assumptions are stale for native Cursor.
- No first-class native read-intercept event exists in Rosetta.
- Shared normalized input/output shapes are too small for Cursor lifecycle data.
- Cursor templates use mismatched native tool matchers.

Implication:

- For `read-once`, Cursor should use dedicated native read hooks in shared normalization, not only generic `Read` tool matches.

### Codex

Official sources used:

- `https://developers.openai.com/codex/hooks`
- `https://developers.openai.com/codex/cli/reference`

Grounded facts:

- Codex officially documents 10 hook events:
  - `SessionStart`
  - `PreToolUse`
  - `PermissionRequest`
  - `PostToolUse`
  - `PreCompact`
  - `PostCompact`
  - `UserPromptSubmit`
  - `SubagentStart`
  - `SubagentStop`
  - `Stop`
- Official common fields include `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `model`.
- `session_id` is real and documented.
- Reset/compaction-adjacent support exists:
  - `SessionStart.source = startup|resume|clear|compact`
  - `PreCompact`
  - `PostCompact`
- Official read interception is limited:
  - built-in read is not documented as a hookable tool
  - read-like operations are hookable when they are MCP calls such as filesystem reads

Rosetta gaps:

- Codex shared event surface is incomplete.
- Current Codex detector misses valid `SessionStart`.
- Local tool assumptions are stale or synthetic relative to official docs.
- Shared normalization/context/output models are too narrow for official Codex lifecycle and compaction data.
- Codex template covers only a subset and omits documented reset/compaction semantics.

Implication:

- Codex cannot be treated as “generic built-in Read works the same as Claude/Cursor”.
- For `read-once`, Codex must be designed against what official Codex actually hooks: MCP reads and documented lifecycle/reset hooks.

### Windsurf / Cascade

Official sources used:

- `https://docs.devin.ai/desktop/cascade/hooks`
- `https://docs.devin.ai/desktop/cascade/memories`
- `https://docs.devin.ai/desktop/cascade/agents-md`
- `https://docs.windsurf.com/llms-full.txt`

Grounded facts:

- Windsurf/Cascade currently documents 12 hook events:
  - `pre_read_code`
  - `post_read_code`
  - `pre_write_code`
  - `post_write_code`
  - `pre_run_command`
  - `post_run_command`
  - `pre_mcp_tool_use`
  - `post_mcp_tool_use`
  - `pre_user_prompt`
  - `post_cascade_response`
  - `post_cascade_response_with_transcript`
  - `post_setup_worktree`
- `pre_read_code` is a true interception point and can block.
- `trajectory_id` is the conversation/session id.
- `execution_id` is the per-turn id.
- There is no documented session-start, session-end, reset, or compaction hook.

Rosetta gaps:

- Rosetta drops real non-tool Windsurf lifecycle/response/worktree events.
- Shared runtime cannot cleanly target these non-tool events because `toolKinds` is mandatory.
- Windsurf MCP calls are not classified as `mcp-call`.
- `execution_id` is lost from shared context.
- Important payload detail such as `edits[]`, MCP fields, and transcript-vs-response distinction is lost.

Implication:

- Windsurf reset cannot be modeled via a fake session-start hook.
- Shared normalization should preserve `execution_id` and real Windsurf non-tool events.
- Windsurf remains outside generated-plugin scope because there is no current generator target.

## Generator / Target Scope

Current generator targets are Claude, Codex, Copilot, and Cursor families.

Grounded fact:

- Windsurf runtime/bundle support exists locally, but no current generated plugin target exists.

Implication:

- Windsurf runtime support can be improved in shared code, but this task must not add a new generator target without explicit approval.

## Cross-Surface Conclusions

### 1. The old Rosetta semantic model is too small

Current shared runtime assumptions are stale across all investigated surfaces:

- too few events
- too tool-centric
- incomplete session/turn/subagent identifiers
- incomplete output control models
- stale tool-name mappings

### 2. “Reality wins” means Rosetta must absorb it in shared normalization

Feature hooks must remain common and IDE-agnostic.

Therefore:

- if official docs show a real lifecycle hook, Rosetta should normalize it in shared code
- if official docs show a real tool name/alias, Rosetta should map it in shared code
- feature hooks should not special-case raw IDE payloads

### 3. Read interception is not uniform

- Claude: `PreToolUse(Read)` and related lifecycle/batch surfaces
- Cursor: dedicated `beforeReadFile` / `beforeTabFileRead` plus generic read/tool hooks
- Copilot: `preToolUse` with native `view` and compatible `Read`
- Codex: documented read interception is MCP-read-centric, not generic built-in read
- Windsurf: dedicated `pre_read_code`

Implication:

- a single semantic “read” abstraction is still useful, but shared normalization must map each surface correctly instead of assuming the same raw shape everywhere

### 4. Reset / compaction must follow real lifecycle surfaces per IDE

- Claude: yes
- Cursor: `preCompact` exists, plus session lifecycle
- Copilot: `preCompact` exists officially
- Codex: `PreCompact` / `PostCompact` and `SessionStart.source`
- Windsurf: no documented compaction/reset hooks

Implication:

- implement every available reset/compaction path now
- explicitly mark only the unavailable part per surface as unavailable
- do not turn one missing surface capability into a global blocker

## Refreshed Support Matrix

| Surface | Real read interception today | Real reset/compaction lifecycle today | Current generator target |
|---|---|---|---:|
| Claude | yes | yes | yes |
| Cursor | yes | yes | yes |
| Copilot | yes | yes | yes |
| Codex | partial / MCP-read-centric | yes | yes |
| Windsurf | yes | no documented reset/compaction hook | no |

## Reusable Shared-Layer Needs Confirmed

The user-required shared work remains valid, but it must be lower-level and more reality-driven than the initial draft:

- debug logging to `rosetta.log` only when `ROSETTA_DEBUG=1`
- pure key/state/cleanup building blocks
- thin atomic persistence/lock wrappers
- richer shared event normalization
- richer shared tool-kind normalization
- richer shared hook context for lifecycle/session/turn/subagent data
- shared reset/cleanup primitives reusable across hooks

## Hard Constraints

- `r3` only
- no new plugin targets without explicit approval
- keep explicit upstream reference
- do not port shell scripts verbatim
- do not hardcode feature logic per IDE in the hook itself
