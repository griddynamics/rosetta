# Design Review Notes — `read-once` hook

This file captures the post-discovery review pass over the Phase 2 design package.

## Status: review pass completed, package revised

## Review Inputs

- `plans/read-once-hook/discovery-notes.md`
- `plans/read-once-hook/architecture-notes.md`
- local runtime/generator files cited in those artifacts

## Agent Review Findings Incorporated

### 1. Reset boundaries were overclaimed

Issue found:

- The earlier design treated some non-session lifecycle hooks as reset triggers without evidence they were true reset boundaries.

Resolution applied:

- Reset matrix was narrowed to actual grounded session/compaction boundaries only.
- Removed reset overreach via:
  - Cursor `stop`
  - Copilot `subagentStop`
  - Codex `SubagentStop`

Current design position:

- reset only on grounded session/compaction boundaries
- otherwise shared cleanup fallback

## 2. Shared output work was too broad

Issue found:

- The earlier design implied a larger shared output-expansion project than `read-once` actually requires.

Resolution applied:

- Added a scope guard in `architecture-notes.md`:
  - shared output work expands only where `read-once` or its reset path directly needs it
  - no generic mutation/continuation work unless directly required by this feature

## 3. Generator scope was underspecified

Issue found:

- Standalone generator targets were left too implicit.

Resolution applied:

- Explicitly added:
  - `plugins/core-cursor-standalone/`
  - `plugins/core-copilot-standalone/`
- Design now states that generator scope includes all current generated targets, not only the parent families.

## Remaining Deliberate Boundaries

- `r3` only
- no new generator target for Windsurf
- no git operations
- no feature-hook IDE branching
- no broad shared-output redesign beyond what `read-once` directly needs
- Codex read-once remains grounded to documented interceptable read-like operations, primarily MCP filesystem reads, unless current worktree evidence later proves more

## Package Readiness

The design package is materially stronger after review, but it still remains at the Phase 2 / Phase 3 boundary until user design approval is given.
