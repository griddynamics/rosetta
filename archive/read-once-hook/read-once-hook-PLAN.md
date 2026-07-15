# Plan — `read-once-hook`

## Status Log

| Step | State | Notes / deviations |
|---|---|---|
| 0 — Refresh discovery against official per-surface docs | done | Completed via separate subagents for Copilot, Claude, Cursor, Codex, Windsurf. |
| 1 — Revise architecture against refreshed discovery | done | Shared-layer “reality wins” approach adopted; standalone generator targets made explicit. |
| 2 — Write workflow-correct specs and plan | done | This file plus `read-once-hook-SPECS.md`. |
| 3 — Expand shared runtime normalization/event model | done | Event catalog, tool mappings, context shape, and lifecycle activation semantics expanded for current generated surfaces. |
| 4 — Add shared state/logging/lock building blocks | done | Added reusable file coordination helpers; refactored state/debounce users onto shared primitives; debug sink remained env-gated to `rosetta.log`. |
| 5 — Implement `read-once` and reset hooks | done | Preventive hook plus session/compact reset hooks implemented with common business logic and original-hook reference retained. |
| 6 — Wire bundles/templates/generator targets | done | Bundles and registrations added for Claude, Codex, Cursor, Copilot, and standalone Cursor/Copilot targets. |
| 7 — Add/repair unit + runtime/integration-style coverage | done | Hook behavior, adapter/runtime regressions, template registration, and bundle isolation coverage added/repaired. |
| 8 — Agent review + local verification | done | Fresh-eyes review findings resolved; local hook and generator build/typecheck/test validation completed. |

States: pending / in-progress / done / blocked.

## Original Intent

- Requested outcome: implement the Rosetta `r3` `read-once` hook end-to-end with the required shared runtime work, generator integration, review, and tests, leaving all changes uncommitted in the worktree.
- In-scope:
  - shared normalization/runtime expansion where current official hook surfaces exceed Rosetta
  - reusable low-level state/logging/lock helpers
  - `read-once` preventive hook and reset wiring
  - bundle/template/generator integration for all current generated targets
  - unit/regression/integration-style verification
- Out-of-scope:
  - new generated targets
  - git operations
  - generic shared-output redesign beyond `read-once` needs

## Functional Requirements (EARS)

- [FR-RO-0001] WHEN a supported/generated surface performs a first interceptable read in a normalized session, THEN the system SHALL allow it and record the normalized resource in read-once state.
- [FR-RO-0002] WHEN the same normalized resource is read again in the same normalized session before reset/cleanup, THEN the system SHALL warn or deny according to configured read-once behavior.
- [FR-RO-0003] WHEN a grounded reset/compaction/session lifecycle event occurs for a supported/generated surface, THEN the system SHALL clear or refresh the relevant read-once state through shared reset primitives.
- [FR-RO-0004] WHEN a surface lacks a grounded reset lifecycle hook, THEN the system SHALL still reclaim stale read-once state through shared cleanup-on-access/mutation.
- [FR-RO-0005] WHERE official current hook surfaces expose events/tool names/session identifiers not modeled by Rosetta, THEN the shared normalization layer SHALL adopt them so feature hooks remain IDE-agnostic.
- [FR-RO-0006] WHEN `ROSETTA_DEBUG=1`, THEN the shared logging layer SHALL append structured hook diagnostics only to `rosetta.log`.
- [FR-RO-0007] WHERE the current plugin generator emits targets, THEN `read-once` bundles and registrations SHALL be integrated into each emitted target, including standalone Cursor and Copilot outputs.
- [FR-RO-0008] WHEN tests and local verification run, THEN they SHALL cover shared runtime changes, read-once behavior, bundle/generator registration, and codemap-refresh-style runtime simulations.

## Assumptions and Unknowns

- Codex official read interception remains MCP-read-centric unless implementation-time evidence from current worktree proves a broader official hookable built-in read.
- The exact minimal shared output-shape changes required by `read-once` will be determined during Step 3 while staying within scope.
- Official-doc deltas may require updating stale local fixtures/templates before behavior tests can be trusted.

## 1. Shared Runtime and Normalization

### 1.1 Expand semantic event and tool normalization

**Priority**: P0  
**Predecessors**: None  
**Agent**: senior hooks/runtime engineer  
**Where**: `src/hooks/src/runtime/ide-registry.ts`, `src/hooks/src/runtime/ide-rows/*`, `src/hooks/src/adapters/*`, `src/hooks/src/adapter.ts`, `src/hooks/src/types.ts`, `src/hooks/src/runtime/types.ts`  
**Description**: Expand the shared event/tool model to current official surfaces and make lifecycle hooks activatable without mandatory tool kinds.  
**AC**:
- Shared semantic events cover the read/reset lifecycle actually needed by the feature on supported/generated targets.
- Detection/normalization works for current documented session and lifecycle payloads that the current worktree can represent.
- Lifecycle hooks can run without a fake tool kind.
**NFR**:
- Preserve existing shipped-hook behavior where unaffected.
**EARS FR**:
- `FR-RO-0003`
- `FR-RO-0005`
**Prerequisites**:
- Current discovery and architecture artifacts.
**Consequences**:
- If wrong, feature hooks will either branch per IDE or miss real lifecycle surfaces.
**Watch For**:
- Over-expanding semantics into unrelated features.
- Breaking existing adapter detection order.
**HITL**:
- None

### 1.2 Add shared low-level state/logging/lock primitives

**Priority**: P0  
**Predecessors**: 1.1  
**Agent**: senior hooks/runtime engineer  
**Where**: `src/hooks/src/runtime/`  
**Description**: Add pure key/state/cleanup helpers plus thin persistence/lock wrappers and the gated `rosetta.log` sink.  
**AC**:
- Pure helpers are reusable by multiple hook state sets.
- Persistence is atomic and lock-guarded where needed.
- Logging is silent unless `ROSETTA_DEBUG=1`.
**NFR**:
- Hook failures must remain safe and silent to the user.
**EARS FR**:
- `FR-RO-0004`
- `FR-RO-0006`
**Prerequisites**:
- 1.1 complete enough to define normalized keys.
**Consequences**:
- If wrong, read-once state will be brittle and non-reusable.
**Watch For**:
- Baking read-once concepts into shared helper names or schemas.
**HITL**:
- None

## 2. Feature Hooks

### 2.1 Implement preventive `read-once`

**Priority**: P0  
**Predecessors**: 1.1, 1.2  
**Agent**: senior hooks engineer  
**Where**: `src/hooks/src/hooks/` and any nearby helper modules  
**Description**: Implement common semantic read-prevention logic over the shared normalized event/tool/state layer.  
**AC**:
- First interceptable read is allowed and recorded.
- Repeat read in the same normalized session/resource warns or denies.
- Codex behavior remains limited to documented interceptable reads.
**NFR**:
- No IDE-specific raw branching inside hook business logic.
**EARS FR**:
- `FR-RO-0001`
- `FR-RO-0002`
- `FR-RO-0005`
**Prerequisites**:
- 1.1 and 1.2 complete.
**Consequences**:
- If wrong, the main feature does not prevent duplicate reads reliably.
**Watch For**:
- Treating stop/subagent events as reset boundaries without evidence.
**HITL**:
- None

### 2.2 Implement reset hook wiring

**Priority**: P0  
**Predecessors**: 1.1, 1.2  
**Agent**: senior hooks engineer  
**Where**: `src/hooks/src/hooks/`, target templates, shared lifecycle mapping  
**Description**: Implement grounded reset-hook behavior for actual session/compaction boundaries, with shared cleanup fallback elsewhere.  
**AC**:
- Claude/Cursor/Copilot/Codex use grounded reset inputs only.
- Windsurf uses cleanup fallback only.
- No fabricated reset surfaces are introduced.
**NFR**:
- Reset behavior must align with grounded lifecycle evidence.
**EARS FR**:
- `FR-RO-0003`
- `FR-RO-0004`
**Prerequisites**:
- 1.1 and 1.2 complete.
**Consequences**:
- If wrong, read-once state clears too early or never clears.
**Watch For**:
- Overclaiming reset boundaries.
**HITL**:
- None

## 3. Generator and Bundles

### 3.1 Ship bundles everywhere current generator supports

**Priority**: P0  
**Predecessors**: 2.1, 2.2  
**Agent**: plugin-generator engineer  
**Where**: `src/hooks/scripts/build-bundles.mjs`, `src/rosettify-plugins/src/plugin-processors/plugin-sync-bundles.ts`, `plugins/core-*`, `src/rosettify-plugins/src/spec/targets.ts`  
**Description**: Ensure new hook bundles are built and registered for all current generated targets, including standalone Cursor/Copilot outputs.  
**AC**:
- Claude, Codex, Copilot, Cursor, `core-cursor-standalone`, and `core-copilot-standalone` all ship the necessary bundles/registrations.
- No new target is introduced.
**NFR**:
- Existing bundle sync behavior remains deterministic.
**EARS FR**:
- `FR-RO-0007`
**Prerequisites**:
- 2.1 and 2.2 complete enough to know hook filenames and lifecycle registrations.
**Consequences**:
- If wrong, the feature silently disappears from some generated targets.
**Watch For**:
- Forgetting standalone outputs.
**HITL**:
- None

## 4. Testing and Verification

### 4.1 Add unit and runtime/integration-style tests

**Priority**: P0  
**Predecessors**: 1.2, 2.1, 2.2, 3.1  
**Agent**: testing-focused hooks engineer  
**Where**: `src/hooks/tests/`, generator tests, fixtures  
**Description**: Add shared runtime tests, hook behavior tests, and codemap-refresh-style `runHook` simulations using normalized inputs, locks, and lifecycle resets.  
**AC**:
- Shared primitives have direct tests.
- `read-once` has first-read/repeat-read/reset/cleanup tests.
- Generator registration regressions cover all current targets.
- Runtime-level simulated integration tests exist, patterned after `codemap-refresh.test.ts`.
**NFR**:
- Tests remain isolated and deterministic.
**EARS FR**:
- `FR-RO-0008`
**Prerequisites**:
- Feature and generator wiring present.
**Consequences**:
- If wrong, completion cannot be proven.
**Watch For**:
- Over-relying on synthetic stale fixtures without updating them to current normalized shapes.
**HITL**:
- None

### 4.2 Run agent review and local verification

**Priority**: P0  
**Predecessors**: 4.1  
**Agent**: reviewer + validator  
**Where**: current worktree, local test/build commands  
**Description**: Review the implementation against the specs/plan and verify builds/tests/regenerator outputs locally.  
**AC**:
- Fresh review findings are either resolved or documented.
- Relevant local tests and build/generator commands pass, or failures are understood and fixed.
- Objective-level completion audit has direct evidence for each requirement.
**NFR**:
- No git operations.
**EARS FR**:
- `FR-RO-0008`
**Prerequisites**:
- 4.1 complete.
**Consequences**:
- If skipped, completion remains unproven.
**Watch For**:
- Claiming completion from partial or indirect evidence.
**HITL**:
- None

## Testing

### Scenario Design

- supported surface first read vs repeated read
- reset-capable surface reset clears state
- non-reset surface cleanup fallback reclaims state correctly
- stale local adapter/template assumptions replaced with current normalized behavior
- all current generated targets receive the new hook assets

### Test Data

- real current fixture families per IDE/surface where available
- MCP-read Codex cases
- native Cursor read-hook cases
- Copilot `view` / `Read` cases
- Windsurf `pre_read_code` cases

### Automation / Local Validation

- hook unit tests
- runtime/integration-style `runHook` simulations
- hook registration regression tests
- bundle build
- generator tests / parity tests where relevant

## Documentation and Git

### Docs Update

- update `agents/IMPLEMENTATION.md` if implementation materially changes runtime architecture
- update `agents/MEMORY.md` only if there are meaningful mistake/root-cause learnings
- keep Phase 4/5 artifacts current in `plans/read-once-hook/`

### Git Checkpoints

- No git operations permitted for this task.

## Verification Summary

- Hook package:
  - `cd src/hooks && npm run check`
  - `cd src/hooks && npm test`
  - Result: pass (`22` test files, `655` tests)
- Generator package:
  - `cd src/rosettify-plugins && npm ci`
  - `cd src/rosettify-plugins && npm run typecheck`
  - `cd src/rosettify-plugins && npm run build`
  - `cd src/rosettify-plugins && npm test`
  - Result: pass (`40` test files, `439` tests)
- Review:
  - Fresh review subagent findings were resolved in hook/generator wiring before final validation.
