<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Tech Specs — `read-once-hook`

## TLDR

- Implement Rosetta `r3` `read-once` end-to-end as common hook logic over an expanded shared normalization/runtime layer.
- Prevention happens before the second read, using a common semantic read-intercept surface mapped from each supported IDE/tool reality.
- Shared runtime work is mandatory and reusable: `rosetta.log` debug sink, pure state/cleanup building blocks, thin atomic persistence/lock wrappers, richer event/tool/context normalization.
- Generator integration must cover every current generated target: Claude, Codex, Copilot, Cursor, `core-cursor-standalone`, `core-copilot-standalone`.
- Windsurf runtime support may be improved in shared code but no new generated target is added.
- Reset follows real grounded lifecycle/session/compaction inputs per surface; unsupported reset surfaces fall back to shared cleanup on access/mutation.

## 1. Overview & Scope

### In Scope

- Re-implement upstream `tools/read-once` as Rosetta `r3` TypeScript hooks.
- Keep explicit reference to the upstream original.
- Expand Rosetta shared hook normalization/runtime where current official hook surfaces exceed the local model.
- Add reusable shared runtime primitives for:
  - debug logging to `rosetta.log` gated by `ROSETTA_DEBUG=1`
  - pure state/set/cleanup building blocks
  - thin atomic persistence/lock wrappers
  - per-session lock/debounce coordination reuse
- Integrate every current generated target.
- Add codemap-refresh-style runtime/integration coverage and standard unit/regression coverage.

### Out of Scope

- New generated targets, especially Windsurf generation.
- Broad shared output-surface redesign beyond what `read-once` directly needs.
- Shell-script porting.
- Git commit / merge / sync actions.

## 2. Non-Functional Requirements and ASRs

- Common hook logic MUST stay IDE-agnostic.
- Shared normalization MUST absorb IDE/event/tool deviations from reality.
- Shared state helpers MUST be reusable by future hooks and modified-file ledgers.
- Debug logging MUST never break hooks and MUST write only to `rosetta.log` when `ROSETTA_DEBUG=1`.
- Hook execution MUST remain deterministic under duplicate IDE emissions and concurrent sessions.
- Backward compatibility MUST preserve current shipped hooks and generator behavior outside intended normalization fixes.

## 3. Architecture & Component Design

### 3.1 Shared normalization/runtime changes

Target state:

- `src/hooks/src/runtime/ide-registry.ts`
  - broaden semantic event catalog to cover currently grounded lifecycle/read/reset hooks
  - broaden semantic tool-kind mapping where current docs prove support
- `src/hooks/src/types.ts`
  - richer normalized input and output shapes for lifecycle/session/turn/reset data actually needed by `read-once`
- `src/hooks/src/runtime/types.ts`
  - hook activation no longer requires tool kinds for lifecycle-only hooks
  - hook context carries normalized session/turn/resource/reset fields needed by common hooks
- `src/hooks/src/runtime/run-hook.ts`
  - executes hooks against semantic events even when no tool kind exists
  - keeps platform dedup and hook-level dedup compatible with richer contexts

### 3.2 Shared state/logging/lock building blocks

Target state under `src/hooks/src/runtime/`:

- debug log helper:
  - append structured line to `rosetta.log`
  - silent unless `ROSETTA_DEBUG=1`
- pure key/state/cleanup helpers:
  - normalize session keys
  - normalize turn/generation/execution keys
  - normalize file/resource keys
  - membership/add/remove/merge operations
  - TTL pruning
  - bounded-retention pruning
  - cleanup decision helpers
- thin persistence/coordination helpers:
  - atomic read/write of namespaced blobs
  - mutate-under-lock
  - reusable per-session/per-namespace lock helpers

### 3.3 `read-once` feature hooks

Target state under `src/hooks/src/hooks/`:

- preventive `read-once` hook on shared semantic read-pre event
- reset hook module reused across grounded lifecycle/reset events

Feature behavior:

- first read in a normalized session/resource namespace is allowed and recorded
- repeated read of the same normalized resource in the same normalized session warns or denies, per hook mode
- state cleanup runs on access/mutation and additionally on grounded lifecycle reset events

### 3.4 Generator/templates/bundles

Target state:

- new `read-once` bundle ships to all current generated targets
- new lifecycle/reset registrations are added where needed per target template
- standalone Cursor/Copilot outputs are updated explicitly
- bundle sync list includes the new hook bundles

## 4. API Contracts

Shared semantic hook contracts required by this feature:

- common semantic read-pre event must exist for:
  - Claude `PreToolUse(Read)`
  - Cursor `beforeReadFile`, `beforeTabFileRead`, and `preToolUse(Read)` where needed
  - Copilot `preToolUse(view|Read)`
  - Codex documented read-interceptable MCP operations
  - Windsurf `pre_read_code`
- common lifecycle/reset activation must support grounded reset-capable events without requiring a fake tool kind

`read-once` output contract:

- allow first read
- deny repeated read when configured
- advisory message for warn mode

No broader generic output mutation is required unless implementation proves a supported/generated surface needs it directly for `read-once`.

## 5. Data Models & Schemas

Required normalized data:

- session identifier
- turn/generation/execution identifier when available
- normalized resource/file key
- lifecycle reset fields such as `source`, `reason`, `trigger` where grounded
- namespace identifier for hook-owned state sets

Required stored state:

- read-once ledger per normalized session namespace
- entry timestamps for TTL cleanup
- optional namespace metadata for cleanup bookkeeping

## 6. Error Handling Strategy

- all shared logging/persistence helpers MUST fail closed with respect to internal crashes and fail safe for user-visible output
- hook runtime MUST suppress internal errors from surfacing as malformed hook responses
- corrupted or missing state blobs MUST be recoverable by cleanup/reinitialization logic
- unsupported read/reset surfaces MUST be explicitly no-op for the unavailable behavior, not global blockers

## 7. Testing Strategy with Test Cases

### Hook behavior

- first read allowed and recorded
- second read denied in deny mode
- second read advised in warn mode
- TTL cleanup re-allows expired entries
- lifecycle reset clears the ledger where the surface supports it
- unsupported reset surfaces still behave correctly via cleanup-on-access

### Shared runtime

- richer event normalization per supported surface
- lifecycle hooks execute without tool kinds
- state mutation under lock is deterministic
- `rosetta.log` gating works and stays silent otherwise

### Generator/regression

- hook bundle is shipped everywhere current generator supports
- standalone Cursor/Copilot outputs include it
- existing hooks remain registered and isolated

### Real-environment style coverage

- codemap-refresh-style simulation around `runHook`, adapter normalization, state files/locks, and lifecycle events
- multi-surface fixture coverage for real normalized payloads

## 8. Security Considerations

- state files and logs must not leak beyond intended local storage locations
- debug log must be opt-in only
- deny/advisory outputs must not include unnecessary raw payload leakage

## 9. Dependencies

- existing hook runtime and adapter stack
- existing build-bundles pipeline
- existing rosettify-plugins generator and parity tests
- existing Vitest-based hook/regression tests

## 10. Assumptions

- User’s “on your own” instruction authorizes proceeding past the design gate with best judgment.
- Codex read-once remains grounded to documented read-interceptable MCP operations unless current worktree evidence later proves broader official support.
- Windsurf remains runtime-only because no current generated target exists.

## 11. Tech Summary: Files and Services Affected

- `src/hooks/src/runtime/ide-registry.ts`
- `src/hooks/src/runtime/types.ts`
- `src/hooks/src/runtime/run-hook.ts`
- `src/hooks/src/runtime/debug-log.ts`
- `src/hooks/src/runtime/throttle.ts`
- new shared runtime helper files under `src/hooks/src/runtime/`
- `src/hooks/src/types.ts`
- `src/hooks/src/adapter.ts`
- `src/hooks/src/adapters/{claude-code,codex,cursor,copilot,windsurf}.ts`
- `src/hooks/src/runtime/ide-rows/{claude-code,codex,cursor,copilot,windsurf}.ts`
- new `src/hooks/src/hooks/read-once*.ts`
- `src/hooks/scripts/build-bundles.mjs`
- `src/rosettify-plugins/src/plugin-processors/plugin-sync-bundles.ts`
- `src/rosettify-plugins/src/spec/targets.ts`
- hook templates under:
  - `plugins/core-claude/`
  - `plugins/core-codex/`
  - `plugins/core-copilot/`
  - `plugins/core-copilot-standalone/`
  - `plugins/core-cursor/`
  - `plugins/core-cursor-standalone/`
- hook tests, regression tests, generator tests, and parity fixtures

</CRITICAL>
