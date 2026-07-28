# Architecture Notes — Workflows to Codex Skills

Status: Approved — Phase 3 approval recorded; no production implementation.

## Scope and constraints

Actor: Rosetta plugin generator. Targets: `core-codex`, `core-antigravity`. Scope: FR-COPY-0080, FR-VAR-0041, FR-VAR-0042, FR-HOOK-0007, FR-STRUCT-0010, FR-STRUCT-0030 (all Approved).

Preserve Antigravity's existing shortest-prefix phase ownership and targeted two-pass reference rewrite. Each workflow `SpecEntry.target` remains the only placement owner.

## Exactly three viable architectures

| Option | Pros | Cons |
| --- | --- | --- |
| A. `SpecEntry.target` + no-argument processor | One placement owner; smallest; reuses proven behavior. | Must derive the base from incoming `frame.target`. |
| B. Configured processor factory | Explicit call site. | Rejected: duplicates placement and can disagree with `SpecEntry.target`. |
| C. `PluginSpec` root/capability | Central metadata. | Rejected: expands the contract and creates a second placement owner. |

**Decision: Option A.** Confidence: **0.98**. It follows the existing two-tier pipeline and keeps `PluginSpec` unchanged.

## Chosen design

Verified order in `pluginProcessSpecEntries`: `computeTargetPath` → `createFileFrame` → entry processors in declaration order. Thus `fileWorkflowToSkill` receives an already-targeted frame.

- Generalize it as a normal no-argument `FileProcessor`; keep `PluginSpec` unchanged.
- Recover the existing target base from incoming `frame.target` before mutation.
- Reuse current VFS ownership and reference-rewrite logic.
- Emit `<base>/<workflow>/SKILL.md` or `<base>/<workflow>/phases/<phase>.md`.
- Strip phase frontmatter only; preserve main-workflow frontmatter.
- Add no factory, argument, flag, identity switch, target branch, or post-hoc move.

Codex composition: workflow `SpecEntry.target = ".agents/skills"`; processor order ends with `fileNormalizeCodexModels` → `fileWorkflowToSkill`; declare only the rules index.

Antigravity composition: keep workflow `SpecEntry.target = "skills"`; use the same processor; retain its post-index frontmatter/model transforms and hook exclusions.

Bootstrap code remains unchanged: the absent Codex workflows index is skipped, while the final plugin-root entry remains; expected counts become r2 = 8 and r3 = 7.

## Production-file changes

1. `src/rosettify-plugins/src/file-processors/file-antigravity-workflow-to-skill.ts` → `file-workflow-to-skill.ts`: use incoming target placement and strip phase frontmatter.
2. `src/rosettify-plugins/src/spec/targets.ts`: compose the shared processor, retarget Codex workflows, and remove its workflow index declaration.

Tests update the renamed processor coverage, both target-output shapes, Codex bootstrap counts, and the independent structural-parity mapping. Generated plugin outputs are regenerated, never hand-edited.

## Behavior-preservation boundaries

- Preserve phase ownership, exact-name/delimiter matching, ordered rewrites, and no-double-rewrite behavior; only phase frontmatter is newly removed.
- Preserve Codex model normalization, non-model frontmatter, config/agents/hooks/rules index, and final plugin-root entry.
- Preserve all Antigravity-only frontmatter/model/index/bootstrap/hook behavior.
- Other targets stay unchanged; zero-phase workflows create no `phases/`; unrelated Markdown references stay unchanged.

## Requirement traceability

| Requirement | Validation evidence |
| --- | --- |
| FR-COPY-0080 | Both target bases, phase ownership/rewrite, body-only phases, zero-phase case |
| FR-VAR-0041 | Codex tree, rules-only index, hook mirror, bootstrap inspection |
| FR-VAR-0042 | Codex skill placement/model normalization; Antigravity isolation |
| FR-HOOK-0007 | Claude/Cursor/Copilot/Codex assembler tests: exactly one final root entry; Codex r2 = 8/r3 = 7 |
| FR-STRUCT-0010 | Independent Codex structural parity |
| FR-STRUCT-0030 | Antigravity structure and body-only phase validation |

## HITL gate

Before production implementation, a human reviewer must explicitly approve Option A, the preservation boundaries, and the six-row requirement coverage. Final acceptance after implementation must review test evidence for every row above.
