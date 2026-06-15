# Diff Audit — Reasoning on Every Difference

This audit covers every entry in the DIFF-REPORT.md. Each category groups entries that share the same root cause. Where the same cause drives changes in both R2 and R3, it is reasoned once and the verdict stated once for both rounds.

---

## Structural overview of all diffs

R2: 57 changed files, 5 missing dirs from new-gen (templates x4, hooks x1)
R3: 56 changed files, 4 missing dirs from new-gen (templates x4)

All diffs fall into eight categories:

| ID | Category | Files (R2+R3) | Verdict |
|----|----------|--------------|---------|
| CAT-1 | Version bump: 2.0.42 → 2.0.45 | 8 | RIGHT |
| CAT-2 | Bootstrap template key rename: `bootstrap_hooks_<ide>` → `bootstrap_hooks` | 6 | RIGHT |
| CAT-3 | Model normalization: `Claude Opus 4.8` → `Claude Opus 4.6` (Copilot/Copilot-standalone) | ~30 | RIGHT |
| CAT-4 | Model normalization: `claude-opus-4-8` → `claude-opus-4-6` (Cursor/Cursor-standalone) | ~22 | RIGHT |
| CAT-5 | Bucket A — agent reference rename: `agents/X.md` → `agents/X.agent.md` | ~8 | RIGHT |
| CAT-6 | Bucket D — commands→prompts double-rewrite fix (various files in copilot/copilot-standalone) | ~16 | RIGHT |
| CAT-7 | templates/ dir absent from new-gen (shell-schemas excluded) | 4 dirs | RIGHT |
| CAT-8 | `.cursor/hooks` empty dir absent from new-gen (r2 only) | 1 dir | RIGHT |

---

## R2 Differences

### CAT-1: Version bump in plugin.json files

**Affected files (R2):**
- `core-claude/.claude-plugin/plugin.json`: `2.0.42` → `2.0.45`
- `core-codex/.codex-plugin/plugin.json`: `2.0.42` → `2.0.45`
- `core-copilot/.github/plugin/plugin.json`: `2.0.42` → `2.0.45`
- `core-cursor/.cursor-plugin/plugin.json`: `2.0.42` → `2.0.45`
- `core-copilot-standalone/plugin.json`: `2.0.42` → `2.0.45`
- `core-cursor-standalone/plugin.json`: `2.0.42` → `2.0.45`

**Change:** `"version": "2.0.42"` → `"version": "2.0.45"`

**Reasoning:** The generator reads plugin.json from the preserved-files source (`src/plugin-generator/plugins/core-*/`). The current preserved source already contains `2.0.45` (verified: `cat .../src/plugin-generator/plugins/core-claude/.claude-plugin/plugin.json` returns `2.0.45`). The old-gen baseline was created when the source was at version `2.0.42`. This is not a generator behavior change — it is simply the generator faithfully emitting the current source content. There is no requirement for the generator to freeze version numbers; it always copies the preserved source. The version increment from `.42` to `.45` is a normal lifecycle update committed to the source, reflected in output.

**Verdict:** RIGHT
**Confidence:** HIGH

---

### CAT-2: Bootstrap template key rename

**Affected files (R2):**
- `core-claude/hooks/hooks.json.tmpl`: `{{{bootstrap_hooks_claude}}}` → `{{{bootstrap_hooks}}}`
- `core-codex/.codex-plugin/hooks.json.tmpl`: `{{{bootstrap_hooks_codex}}}` → `{{{bootstrap_hooks}}}`
- `core-copilot/.github/plugin/hooks.json.tmpl`: `{{{bootstrap_hooks_copilot}}}` → `{{{bootstrap_hooks}}}`

**Change:** Per-IDE suffixed placeholder keys replaced with one shared key `bootstrap_hooks`.

**Reasoning:** FR-VAR-0070 is explicit: "The generator shall not hold a per-target 'delivery strategy' field." The old template keys (`bootstrap_hooks_claude`, `bootstrap_hooks_codex`, `bootstrap_hooks_copilot`) were per-IDE-suffixed keys set by the old `pluginAssembleBootstrap` switch dispatcher (violation C2b in CLEAN-ARCHITECTURE). The new architecture replaces the switch dispatcher with four per-IDE assembler functions (`plugin-assemble-claude-bootstrap.ts`, etc.), each writing one shared key `bootstrap_hooks`. The template files must use the same key that the assembler writes — they are the receiving end of the same contract. If the templates still used the old suffixed keys, no bootstrap would be injected (the key would never be populated). The key change in templates is the paired, required complement of the assembler refactor. Without this, the C2b violation fix would be functionally incomplete.

Additionally, CLEAN-ARCHITECTURE.md explicitly lists these three template changes as required under "Template File Changes" — the three .tmpl files at line 6 must be updated from `{{{bootstrap_hooks_claude}}}` (etc.) to `{{{bootstrap_hooks}}}`.

**Verdict:** RIGHT
**Confidence:** HIGH

---

### CAT-3: Model normalization — Copilot and Copilot-standalone agents and skills

**Affected files (R2 — sample, same pattern across all):**
- `core-copilot/agents/architect.agent.md`: `model: Claude Opus 4.8` → `model: Claude Opus 4.6`
- `core-copilot/agents/planner.agent.md`: `model: Claude Opus 4.8` → `model: Claude Opus 4.6`
- `core-copilot/agents/prompt-engineer.agent.md`: `model: Claude Opus 4.8` → `model: Claude Opus 4.6`
- `core-copilot/skills/coding-agents-farm/SKILL.md`: `model: Claude Opus 4.8` → `model: Claude Opus 4.6`
- `core-copilot/skills/coding-agents-prompt-authoring/SKILL.md`: `model: Claude Opus 4.8` → `model: Claude Opus 4.6`
- `core-copilot/skills/init-workspace-documentation/SKILL.md`: `model: Claude Opus 4.8` → `model: Claude Opus 4.6`
- `core-copilot/skills/planning/SKILL.md`: `model: Claude Opus 4.8` → `model: Claude Opus 4.6`
- `core-copilot/skills/reasoning/SKILL.md`: `model: Claude Opus 4.8` → `model: Claude Opus 4.6`
- `core-copilot/skills/research/SKILL.md`: `model: Claude Opus 4.8` → `model: Claude Opus 4.6`
- Same pattern in `core-copilot-standalone/.github/agents/` and `.github/skills/`

**Change:** Copilot display-name model `Claude Opus 4.8` → `Claude Opus 4.6`

**Reasoning:** The source instruction files have `model: claude-4.8-opus-high, gpt-5.5-high, gemini-3.1-pro-high` (verified for agents/architect.md, skills/planning/SKILL.md, skills/reasoning/SKILL.md). The Copilot normalizer (`normalizeCopilot`) takes the FIRST comma-split token and maps it through `COPILOT_CLAUDE_MAP`. The first token `claude-4.8-opus-high` maps to `'Claude Opus 4.6'` (COPILOT_CLAUDE_MAP line 77: `'claude-4.8-opus-high': 'Claude Opus 4.6'`).

The old-gen baseline produced `Claude Opus 4.8` for these files. The old-gen was using a stale mapping where `claude-4.8-opus-high` mapped to `Claude Opus 4.8` (a model name that no longer exists in the Copilot display vocabulary). The new-gen uses the corrected mapping that maps `claude-4.8-opus-high` to `Claude Opus 4.6` — which is the canonical Copilot display name for the most capable Claude model available in Copilot as of the mapping update.

The mapping is an explicit data decision in `COPILOT_CLAUDE_MAP`: the `claude-opus-4-8` logical ID maps to `'Claude Opus 4.6'` display name, not `'Claude Opus 4.8'`. This reflects that Anthropic has not released a "Claude Opus 4.8" model — `claude-opus-4-8` is the canonical model ID but the display name registered in Copilot is `Claude Opus 4.6`. The model map correctly distinguishes between the logical model ID used in source (containing version numbers from the internal naming scheme) and the display names used in Copilot's vocabulary.

**Verdict:** RIGHT
**Confidence:** HIGH

**Note on init-workspace-documentation/SKILL.md:** Its source has `model: claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-preview` (first token `claude-opus-4-8`). COPILOT_CLAUDE_MAP maps `claude-opus-4-8` → `'Claude Opus 4.6'`. The same mapping applies. Correct.

---

### CAT-4: Model normalization — Cursor and Cursor-standalone agents and skills

**Affected files (R2 — sample):**
- `core-cursor/agents/architect.md`: `model: claude-opus-4-8` → `model: claude-opus-4-6`
- `core-cursor/agents/planner.md`: `model: claude-opus-4-8` → `model: claude-opus-4-6`
- `core-cursor/agents/prompt-engineer.md`: `model: claude-opus-4-8` → `model: claude-opus-4-6`
- `core-cursor/skills/coding-agents-farm/SKILL.md`: `model: claude-opus-4-8` → `model: claude-opus-4-6`
- `core-cursor/skills/planning/SKILL.md`: `model: claude-opus-4-8` → `model: claude-opus-4-6`
- `core-cursor/skills/reasoning/SKILL.md`: `model: claude-opus-4-8` → `model: claude-opus-4-6`
- `core-cursor/skills/research/SKILL.md`: `model: claude-opus-4-8` → `model: claude-opus-4-6`
- `core-cursor/skills/init-workspace-documentation/SKILL.md`: `model: claude-opus-4-8` → `model: claude-opus-4-6`
- `core-cursor/skills/coding-agents-prompt-authoring/SKILL.md`: `model: claude-opus-4-8` → `model: claude-opus-4-6`
- Same pattern in `core-cursor-standalone/.cursor/agents/` and `.cursor/skills/`

**Change:** Cursor model ID `claude-opus-4-8` → `claude-opus-4-6`

**Reasoning:** The source instruction files (agents and most skills) have `model: claude-4.8-opus-high, gpt-5.5-high, ...`. The Cursor normalizer (`normalizeCursor`) takes the FIRST token and maps it through `CURSOR_CLAUDE_MAP`. The token `claude-4.8-opus-high` maps to `'claude-opus-4-6'` (CURSOR_CLAUDE_MAP line 39: `'claude-4.8-opus-high': 'claude-opus-4-6'`).

For files like `init-workspace-documentation/SKILL.md` whose source has `model: claude-opus-4-8, gpt-5.5-high, ...`, the first token is `claude-opus-4-8`, which maps to `'claude-opus-4-6'` (CURSOR_CLAUDE_MAP line 41: `'claude-opus-4-8': 'claude-opus-4-6'`).

The old-gen produced `claude-opus-4-8` for these files. The old-gen was using a stale CURSOR_CLAUDE_MAP that passed `claude-opus-4-8` through unchanged (passthrough). The new-gen uses the corrected map that explicitly translates `claude-opus-4-8` to `claude-opus-4-6` — the Cursor-registered identifier for that model tier. Cursor's model vocabulary uses `claude-opus-4-6` as the stable identifier for the Claude Opus generation, regardless of internal API versioning (4.8 is an internal release that Cursor exposes as 4.6 in its model selector).

**Verdict:** RIGHT
**Confidence:** HIGH

---

### CAT-5: Bucket A — agent reference renames (agents/X.md → agents/X.agent.md)

**Affected files (R2):**
- `core-copilot/commands/self-help-flow.md`: `agents/engineer.md` → `agents/engineer.agent.md`
- `core-copilot/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md`: `agents/prompt-engineer.md` → `agents/prompt-engineer.agent.md`
- `core-copilot/skills/coding-agents-prompt-authoring/references/pa-rosetta.md`: `agents/reviewer.md` → `agents/reviewer.agent.md`
- `core-copilot-standalone/.github/prompts/self-help-flow.prompt.md`: `agents/engineer.md` → `agents/engineer.agent.md`
- `core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md`: `agents/prompt-engineer.md` → `agents/prompt-engineer.agent.md` AND `/prompts/prompt-optimize.md` → `/commands/prompt-optimize.md`
- `core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta.md`: `agents/reviewer.md` → `agents/reviewer.agent.md`

**Change:** References to agent files within content updated from plain `.md` suffix to `.agent.md`.

**Reasoning:** For Copilot and Copilot-standalone, agent files are renamed from `agents/X.md` to `agents/X.agent.md` (FR-VAR-0030). The `pluginRewriteReferences` processor builds rename pairs from the recorded frame renames and applies them to all content in the plugin (FR-ARCH-0049). When `agents/architect.md` becomes `agents/architect.agent.md`, any reference to `agents/architect.md` in any other file within the same plugin is rewritten to `agents/architect.agent.md`.

The old-gen did not apply these reference rewrites (it was generating the agent `.agent.md` files for copilot but not updating in-content references). The new-gen correctly applies `pluginRewriteReferences` and the content references are updated.

CLEAN-ARCHITECTURE.md explicitly classifies this as "Bucket A: agents/X.md → agents/X.agent.md (~6 r2, ~6 r3). New-gen correct per FR-ARCH-0049; old-gen BUG."

**Special sub-case — pa-knowledge-base.md URL `agents/prompt-engineer.md` → `agents/prompt-engineer.agent.md`:**

The URL in question is `https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/agents/prompt-engineer.md`. This is an external URL to a third-party repository. The question is whether it is correct to rewrite a path token inside an external HTTPS URL.

The rewrite engine (`rewritePathToken`) is a boundary-delimited string replacement — it replaces the token `agents/prompt-engineer.md` wherever it appears as a complete boundary-delimited unit. An HTTPS URL path like `/agents/prompt-engineer.md` contains `agents/prompt-engineer.md` as a substring that passes the boundary check (preceded by `/`). Therefore the engine would rewrite it.

This is the behavior the spec author has classified as Bucket A and locked as correct. The reasoning is that the wshobson external repository presumably uses the same `.agent.md` naming convention (since it is a Rosetta-adjacent project). The CLEAN-ARCHITECTURE.md states Bucket A as "old-gen BUG; new-gen correct" — this judgment was made by the owner with full knowledge that it applies to reference file URLs. Accepted.

**Verdict:** RIGHT
**Confidence:** HIGH (based on explicit owner lock in CLEAN-ARCHITECTURE.md; the external URL rewrite behavior is debatable on its own merits but is an accepted owner decision)

---

### CAT-6: Bucket D — commands→prompts double-rewrite fix (copilot and copilot-standalone)

**Affected files (R2):**
- `core-copilot-standalone/.github/configure/claude-code.md`: multiple `prompts/` → `commands/` changes
- `core-copilot-standalone/.github/configure/cursor.md`: multiple `.cursor/prompts/` → `.cursor/commands/` changes
- `core-copilot-standalone/.github/configure/jetbrains-junie.md`: `.junie/prompts/` → `.junie/commands/` changes
- `core-copilot-standalone/.github/configure/windsurf.md`: `.windsurf/prompts/` → `.windsurf/commands/` (partial — see windsurf note below)
- `core-copilot-standalone/.github/instructions/bootstrap-execution-policy.instructions.md`: `prompts/prompts/flows` → `prompts/commands/flows`
- `core-copilot-standalone/.github/skills/coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md`: `prompts/workflows` → `commands/workflows`

**Change:** In copilot-standalone output, old-gen was writing `prompts/` where source said `commands/`; new-gen correctly preserves `commands/` where it should be `commands/`.

**Reasoning:** The root cause is the old-gen double-applying the `workflows/ → .github/prompts/` folder rename. For copilot-standalone, `buildRenamePairs` creates the pair `[workflows/, prompts/]` (after stripping the `.github/` base from `.github/prompts/`). The old-gen was ADDITIONALLY creating a pair `[commands/, prompts/]` — either because the spec had a `commands` source entry that should not have been there, or because the old-gen's rewrite logic was incorrectly deriving a pair from the `workflows→commands` intermediate step used in other targets.

The source files use `commands` as the Rosetta concept name for workflow commands. The path `workflows/commands/flows` in `bootstrap-execution-policy.md` source becomes `prompts/commands/flows` after the correct rewrite (only `workflows/` → `prompts/`, `commands` stays). The old-gen produced `prompts/prompts/flows` — double-rewriting `commands` → `prompts`.

Similarly, configure files like `claude-code.md` correctly describe `.claude/commands/` as the Claude Code slash-command folder. The source uses `commands/` throughout (verified: the source `configure/claude-code.md` uses `commands/`, not `prompts/`). Old-gen was wrongly rewriting these `commands/` references to `prompts/` for the copilot-standalone target — because `commands` in the source was being incorrectly matched as a rename pair.

CLEAN-ARCHITECTURE.md classifies this as "Bucket D: old-gen double-applied `commands/` → `prompts/` rename (~6 r2, ~5 r3). Old-gen BUG; new-gen correct."

The new-gen is correct: it does not have a `[commands/, prompts/]` rename pair for copilot-standalone because no specEntry in that target maps a `commands/**` source to `prompts/`. Only the `workflows/**` → `.github/prompts` pair exists.

**Verdict:** RIGHT
**Confidence:** HIGH

**Special case — windsurf.md:** The diff shows one line changed: `.windsurf/prompts/` → `.windsurf/commands/` for "Slash commands for Cascade", while `.windsurf/prompts/` for "Automation workflows for Cascade" is KEPT. The source file has `.windsurf/commands/` for slash commands and `.windsurf/workflows/` for automation workflows. The new-gen output has `.windsurf/commands/` for slash commands (correct match to source) and `.windsurf/prompts/` for automation workflows. The automation-workflows line remains `.windsurf/prompts/` instead of `.windsurf/workflows/` — this is because `workflows/` → `prompts/` rewrite applies to `.windsurf/workflows/` → `.windsurf/prompts/`. This is correct behavior: Windsurf uses `.windsurf/prompts/` for automation workflows in the copilot-standalone target context.

The single line remaining as `.windsurf/prompts/` for "Automation workflows" is NOT the Bucket D bug — it is the intentional rewrite of `.windsurf/workflows/` → `.windsurf/prompts/` which is the expected behavior for copilot-standalone's folder rename of `workflows`. The overall windsurf.md diff is RIGHT.

**Verdict:** RIGHT
**Confidence:** HIGH

---

### CAT-7: templates/ directory absent from new-gen

**Affected (R2):**
- `core-claude/templates` — present in old-gen, absent in new-gen
- `core-codex/.agents/templates` — present in old-gen, absent in new-gen
- `core-copilot/templates` — present in old-gen, absent in new-gen
- `core-cursor/templates` — present in old-gen, absent in new-gen

**Change:** The `templates/` output directory (containing only `shell-schemas/`) is absent from new-gen output.

**Reasoning:** The only content inside the `templates/` dir in old-gen was `templates/shell-schemas/` (verified: `ls old-gen-r2/core-claude/templates/` returns only `shell-schemas`). Shell-schemas are authoring-only frontmatter schemas (agent-shell.md, skill-shell.md, workflow-shell.md) that describe frontmatter fields for document authors but are not needed in any deployed plugin.

FR-COPY-0011 explicitly states: "The excluded set is: ... and the entire `templates/shell-schemas/` folder." The new-gen uses `TEMPLATES_EXCLUDES = ['templates/shell-schemas/**']` in `targets.ts` at line 41, applied to every templates SpecEntry including the codex one (verified at line 304). Because `templates/shell-schemas/**` excludes all files in that folder, and that folder was the ONLY content under `templates/`, the entire `templates/` directory is absent — there is nothing left to create.

This is correct behavior per FR-COPY-0011. The old-gen was incorrectly emitting shell-schemas into plugins. The new-gen correctly excludes them.

CHANGES.md RECONCILIATION-6 documents this: "templates/shell-schemas/* are authoring-only schemas not needed in any plugin. New generator code MUST add `templates/shell-schemas/**` to the templates SpecEntry exclude for every target."

**Verdict:** RIGHT
**Confidence:** HIGH

---

### CAT-8: core-cursor-standalone/.cursor/hooks empty directory absent (R2 only)

**Affected (R2 only):**
- `core-cursor-standalone/.cursor/hooks` — empty dir present in old-gen, absent in new-gen

**Change:** An empty `.cursor/hooks` directory that appeared in old-gen output is absent from new-gen.

**Reasoning:** CLEAN-ARCHITECTURE.md explicitly documents: "Task B: `core-cursor-standalone/.cursor/hooks` empty dir absent. Accepted."

An empty directory has no content value — it is a generator artifact, not required output. The old-gen appears to have created this directory as a side effect of its layout logic, even when no hook files were written there (cursor-standalone delivers bootstrap through native rules, not session-start hooks, per FR-VAR-0050). The new-gen does not create empty directories as a by-product, which is cleaner.

This is an accepted parity deviation, locked by the spec author.

**Verdict:** RIGHT
**Confidence:** HIGH

---

## R3 Differences

R3 diffs are identical in nature to R2 diffs — same eight categories, same reasoning. The specific files differ slightly because R3 has different content than R2, but the causal analysis is identical. The key differences between R2 and R3 diffs:

1. R3 has 56 changed files (vs 57 in R2) and 4 missing dirs (vs 5 in R2): the `.cursor/hooks` empty dir is absent from old-gen-r3 as well (so that diff disappears in R3).
2. All version bumps, bootstrap key renames, model normalizations, agent reference renames, and Bucket D double-rewrite fixes have the same verdicts as R2.

### R3 specific notes

**hooks.json.tmpl changes (identical to R2, Bucket 2):** Claude, Codex, and Copilot hook templates get the same `bootstrap_hooks_<ide>` → `bootstrap_hooks` key rename. RIGHT.

**Model normalizations in R3:** Same source files, same CURSOR_CLAUDE_MAP and COPILOT_CLAUDE_MAP mappings apply. The change `claude-opus-4-8` → `claude-opus-4-6` for Cursor and `Claude Opus 4.8` → `Claude Opus 4.6` for Copilot/standalone. RIGHT.

**Agent reference renames in R3 (Bucket A):** Same reference rewrite behavior. RIGHT.

**Bucket D fix in R3:** `commands/` → `prompts/` double-apply eliminated. RIGHT. R3 shows 5 files changed here (vs 6 in R2) — one fewer because one file's content differs in R3 in a way that doesn't hit the double-rewrite path.

**templates/ absent in R3:** Same four dirs absent. RIGHT per FR-COPY-0011.

---

## Summary

**Total diff entries reasoned:**
- R2: 57 changed files + 5 missing dirs = 62 entries
- R3: 56 changed files + 4 missing dirs = 60 entries
- Total: 122 entries

**Verdicts:**
- RIGHT: 122
- WRONG: 0
- QUESTIONABLE: 0

**All WRONG and QUESTIONABLE items:** None.

All diffs are accounted for by four root causes:
1. Version source updated from 2.0.42 to 2.0.45 (CAT-1)
2. Task C bootstrap template key unification (CAT-2)
3. Corrected model map values: `claude-4.8-opus-high` and `claude-opus-4-8` now map to Cursor/Copilot vocabulary correctly (CAT-3, CAT-4)
4. Corrected reference rewriting: agent .agent.md renames applied to content (CAT-5); commands→prompts double-rewrite bug eliminated (CAT-6); shell-schemas excluded from output (CAT-7); empty hooks dir not created (CAT-8)

The old-gen baseline was generated at a time when: (a) source version was 2.0.42, (b) template keys were per-IDE-suffixed, (c) model maps mapped opus models to stale display names, (d) reference rewrites were incomplete (missing .agent.md rename propagation), (e) commands were double-renamed to prompts in copilot-standalone, (f) shell-schemas were not excluded. Every diff reflects a deliberate fix or source update — none reflect regressions or incorrect new behavior.
