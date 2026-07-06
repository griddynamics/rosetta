# Architecture Notes — `read-once` Hook

This file captures revised Phase 2 design choices for the Rosetta `r3` `read-once` hook task after official per-surface discovery.

## Status: revised from refreshed discovery

## TLDR

- The old Rosetta hook model is too small for current reality across Claude Code, Cursor, Copilot, Codex, and Windsurf.
- `read-once` should not be built as IDE-specific business logic. Rosetta must first absorb real hook surfaces into the shared normalization/runtime layer.
- The feature hook itself should stay common and semantic:
  - prevention on a shared semantic `PreRead`
  - reset on shared normalized lifecycle/reset events already available per surface
  - fallback cleanup on state access/mutation where no real reset hook exists
- Shared code must be low-level reusable building blocks:
  - pure key/state/cleanup functions
  - thin atomic persistence/lock wrappers
  - normalized event/tool/context/output adapters
- Generator scope remains Claude, Cursor, Copilot, and Codex. Windsurf stays runtime-only unless the generator target is explicitly approved later.

## Main Solution

Implement `read-once` as common hook logic on top of a reality-first shared hook runtime.

### 1. Expand shared normalization to match actual current hook surfaces

Shared layer responsibilities:

- normalize official raw events into Rosetta semantic events
- normalize official tool names and aliases into Rosetta semantic tool kinds
- preserve shared lifecycle/session/turn/subagent/reset metadata
- shape outputs back into each IDE’s native contract

Key rule:

- Hook business logic must not branch on raw IDE payloads or raw event names.
- If a supported surface has a real hook/event/tool contract that Rosetta does not currently model, Rosetta adopts it in shared code.

### 2. Split runtime concerns cleanly

The shared layer should be separated into:

- event normalization:
  - raw event name -> semantic event
  - event-specific payload extraction
- tool classification:
  - raw tool name -> semantic tool kind
  - read/write/bash/mcp/read-like alias handling
- context shaping:
  - session id
  - turn/generation/execution id
  - source/reason/trigger
  - transcript path
  - permission mode
  - subagent identifiers
  - normalized file identity
- output shaping:
  - allow/deny/ask

Scope guard:

- For this task, shared output expansion is limited to what `read-once` and its reset path actually need.
- Do not broaden shared output work to generic mutation/continuation features unless a supported/generated surface requires it directly for `read-once`.

### 3. Make hook activation work for both tool hooks and lifecycle hooks

The current runtime is too tool-centric.

Required runtime design change:

- hooks must be activatable by semantic event even when no tool kind exists
- tool kinds must be optional for lifecycle hooks
- read-once reset hooks must be able to bind to lifecycle events such as compaction/session hooks without fake tool kinds

### 4. Implement `read-once` using shared semantic hooks

Feature shape:

- one preventive `read-once` hook bound to shared semantic `PreRead`
- one reset hook module reusable across shared lifecycle/reset events
- both use the same pure state/cleanup primitives and thin persistence/lock wrappers

The feature should not care whether `PreRead` came from:

- Claude `PreToolUse(Read)`
- Cursor `beforeReadFile` or `beforeTabFileRead`
- Copilot `preToolUse(view|Read)`
- Codex MCP filesystem read interception
- Windsurf `pre_read_code`

### 5. Build shared state as pure reusable building blocks

The shared substrate must not be read-once-shaped.

Required building blocks:

- pure key functions:
  - normalize session key
  - normalize turn/generation/execution key
  - normalize file/resource key
  - compose namespace keys
- pure state functions:
  - membership check
  - add/remove element
  - merge entries
  - prune expired entries
  - prune bounded collections
  - compute cleanup actions
- thin runtime wrappers:
  - read namespaced blob
  - write namespaced blob atomically
  - mutate-under-lock
  - append debug log line

The same lower-level functions must be reusable for:

- read-once ledgers
- modified-file ledgers
- reset/cleanup flows
- future hook state sets

## Facts From Refreshed Discovery

- Claude currently documents 30 hook events, including `PreCompact`, `PostCompact`, `SessionEnd`, `Stop`, `PostToolBatch`, and many non-tool lifecycle hooks.
- Cursor currently documents 21 hook events, including dedicated native read hooks `beforeReadFile` and `beforeTabFileRead`, plus `preCompact`.
- Copilot officially supports `preToolUse`, `postToolUse`, `preCompact`, `sessionStart`, `sessionEnd`, `agentStop`, `subagentStart`, `subagentStop`, and supports read interception through native `view` / alias `Read`.
- Codex officially supports 10 events including `SessionStart`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, and `Stop`, but official read interception is MCP-read-centric rather than a documented built-in `Read`.
- Windsurf officially supports `pre_read_code` and `post_read_code` plus other non-tool lifecycle/response/worktree hooks, but no documented session-start or compaction hooks.
- Current Rosetta runtime and templates significantly under-model these official surfaces.

## Architecture Options

### Option 1 — Reality-first shared normalization expansion + common semantic feature hooks

Description:

- Expand `ide-registry`, per-IDE rows, adapters, shared context types, and shared output types to actual current hook surfaces.
- Introduce shared semantic read and reset-capable lifecycle handling.
- Keep `read-once` hook logic common and IDE-agnostic.

Pros:

- Matches the user’s “reality wins” rule.
- Keeps feature logic common.
- Makes deviations in vendor hook surfaces less damaging because shared normalization absorbs them.
- Produces reusable low-level primitives instead of feature-shaped services.

Cons:

- Touches more shared runtime code than a narrow patch.
- Requires fixture/template/test updates across multiple surfaces.

### Option 2 — Minimal `read-once` patch against current registry only

Description:

- Keep the current small runtime model and squeeze `read-once` into it.

Pros:

- Smaller immediate patch.

Cons:

- Built on stale assumptions already disproven by official docs.
- Forces IDE-specific branching into hook business logic.
- Fails the user’s explicit requirement that existing code must adapt to reality.

### Option 3 — Per-IDE `read-once` implementations

Description:

- Implement separate feature logic per IDE/surface.

Pros:

- Can exploit each raw surface directly.

Cons:

- Wrong layering for Rosetta.
- High duplication and drift.
- Violates the requirement that hooks implement code in a common way and shared code absorbs the differences.

## Selected Option

Select Option 1.

Why:

- It is the only option aligned with the refreshed discovery and the user’s stated architecture rule.
- It lets Rosetta adopt missing hooks/events/tool names in shared normalization instead of patching around stale assumptions in feature code.
- It keeps `read-once` reusable and compact at the hook layer.

## Read / Reset Matrix

Implement every available part now; explicitly mark only the unavailable part as unavailable.

| Surface | Shared semantic read source | Shared reset inputs available now | Generator target |
|---|---|---|---:|
| Claude | `PreToolUse(Read)` | `SessionStart.source`, `SessionEnd.reason`, `PreCompact`, `PostCompact` | yes |
| Cursor | `beforeReadFile`, `beforeTabFileRead`, `preToolUse(Read)` | `sessionStart`, `sessionEnd`, `preCompact` | yes |
| Copilot | `preToolUse(view|Read)` | `sessionStart`, `sessionEnd`, `preCompact` | yes |
| Codex | MCP read interception, not generic built-in read | `SessionStart.source`, `PreCompact`, `PostCompact` | yes |
| Windsurf | `pre_read_code` | no documented reset/compaction/session lifecycle hook; shared cleanup only | no |

Design consequences:

- Copilot is in scope for read-once prevention once Rosetta adopts the real official Copilot surface.
- Codex read-once must be scoped to documented read-interceptable operations, primarily MCP filesystem reads, unless fresh captured evidence later proves more.
- Windsurf runtime support can be improved, but no new generator target is added in this task.

## Affected Areas

Shared runtime:

- `src/hooks/src/runtime/ide-registry.ts`
- `src/hooks/src/runtime/types.ts`
- `src/hooks/src/runtime/run-hook.ts`
- `src/hooks/src/runtime/debug-log.ts`
- `src/hooks/src/runtime/throttle.ts`
- `src/hooks/src/adapter.ts`
- `src/hooks/src/types.ts`

Per-surface normalization:

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

Feature code:

- `src/hooks/src/hooks/` for `read-once` preventive hook and reusable reset hook module

Generator/templates/tests:

- `plugins/core-claude/`
- `plugins/core-cursor/`
- `plugins/core-cursor-standalone/`
- `plugins/core-copilot/`
- `plugins/core-copilot-standalone/`
- `plugins/core-codex/`
- `src/rosettify-plugins/src/plugin-processors/plugin-sync-bundles.ts`
- `src/rosettify-plugins/src/spec/targets.ts`
- `src/hooks/tests/`
- regression/parity tests and affected fixtures

## Caveats

- Codex read interception must stay grounded in official documented interception surfaces; do not assume a generic built-in `Read`.
- Windsurf has no documented reset/compaction lifecycle hook, so only shared cleanup fallback is available there.
- Official surfaces expose many more outputs than Rosetta currently models, but this task should expand shared outputs only where `read-once` directly needs it.
- The current runtime assumption that `toolKinds` is mandatory is a direct blocker for proper lifecycle-hook support and must be addressed in shared code.
