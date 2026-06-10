# Story: Skills Taxonomy Reconciliation + Frontmatter Refactoring

Status: IN PROGRESS — **frontmatter `description` compression is complete** (skills, subagents, workflows, phases; applied to r2 **and** r3). Remaining: taxonomy reconciliation, inlining/consolidation, visibility flags, guardrail-rule simplification, and doc sync. r3 is the canonical source; never hand-edit `plugins/` (regenerate via `scripts/pre_commit.py`).

## Completed (this pass)

- **Description diet (W4) — done.** All non-critical skill/subagent/workflow descriptions compressed. Skills → verb-first `To …`; `init-workspace-*` → 2–3 words; gitnexus tightened; subagents → action-led + `Full/Lightweight subagent.` tag.
- **Workflow descriptions (part of W3) — done.** All top-level workflows → `Workflow for …`; all phase files → `Phase N <label> of <flow>` (existing phase numbers kept verbatim, gaps allowed).
- **Guardrail descriptions (part of W5) — done.** The 5 MUST skills (`risk-assessment`, `self-learning`, `self-organization`, `orchestrator-contract`, `subagent-contract`) dropped the redundant `Rosetta MUST skill.` lead while keeping every activation trigger. The 4 critical skills (`dangerous-actions`, `sensitive-data`, `hitl`, `deviation`) kept **verbatim**.
- **`coding-iac` folded into `coding` (part of W1) — done.** Body moved to `skills/coding/assets/iac.md`; `coding/SKILL.md` now carries `MUST follow \`assets/iac.md\``; skill deleted; removed from `coding-flow` recommended lists. The `coding-iac-best-practices.md` rule was kept.
- **`coding-agents-prompt-adaptation` removed** (deviation from the earlier "keep" recommendation — owner-approved this pass): folder deleted (r2+r3); reference dropped from `prompt-engineer.md`, `docs/definitions/skills.md`, `docs/CODEMAP.md`.
- **`hooks-authoring` renamed → `coding-agents-hooks-authoring`** (deviation from "keep as-is" — owner-approved): folder + frontmatter `name` (no other refs existed).
- **`questioning` kept** (not merged into `hitl`): content overlaps hitl's questioning section, but it is the lightweight, subagent-loadable form — merging would force the heavy hitl protocol into subagents. Description compressed only.

## Remaining work

### W0 — Reconcile taxonomy docs
Update `docs/definitions/skills.md` and `docs/definitions/workflows.md` to match built reality: rename entry `plan-manager`→`operation-manager`; add `load-context`/`load-workflow`/`load-context-instructions`; remove `init-workspace-*` once they become phases (W1); add `coding-agents-hooks-authoring`; record the `coding-iac` and `coding-agents-prompt-adaptation` removals; keep `discovery` distinct and `context-engineering` as a TBD placeholder. Reconcile `workflows.md` the same way (it lists unbuilt flows e.g. `discovery-flow`/`testing-flow` and omits built ones e.g. `testgen-flow`/`requirements-authoring-flow`). Fix every `USE SKILL` / `ACQUIRE …/SKILL.md` reference; zero dangling refs. (Done so far: only the `coding-agents-prompt-adaptation` line + the CODEMAP entry.)

### W1 — Inline / consolidate (remaining)
- **`init-workspace-*` skills:** inline each skill body into its matching `init-workspace-flow-*.md` phase, then delete the standalone skill (they are thin wrappers over a single phase). Update the canonical list.
- **`gitnexus-*`:** consolidate 3→1 `gitnexus` skill, or keep `tools`+`cli` and fold `setup`. (Descriptions were compressed this pass; the three skills are still separate.)

### W2 — Visibility flags + cross-IDE research
Tag each kept skill and each workflow/command by visibility via frontmatter. **Claude Code:** hidden-but-auto-activated (guardrails, infra/plumbing) = `user-invocable: false` **+** `disable-model-invocation: false`; hidden parent-only (phases) = `user-invocable: false`; visible = `user-invocable: true`. **Other IDEs:** research the equivalent attributes (no parity assumed) → produce an IDE→attribute matrix (Claude Code, Cursor, Copilot, Codex, OpenCode) for hide-from-menu vs disable-auto, for **both** skills and commands; apply per-IDE frontmatter; extend `plugin_generator.py` where an IDE ignores a flag. **Acceptance:** every hidden skill/phase verified non-listed in the user menu yet still invocable (auto for guardrails, parent-invoked for phases) on each supported IDE, or the limitation documented.

### W3 — Phase hiding (remaining)
Phases stay emitted as commands (the parent workflow invokes them) but get `user-invocable: false` (+ per-IDE equivalents) to drop them from the user `/` menu; top-level flows stay `user-invocable: true`. (Phase description compression is already done; this is the visibility flag only.)

### W5 — Native-trigger reframe (remaining)
Simplify `bootstrap-guardrails.md`: the rule currently restates each guardrail's trigger inline, duplicating the description. Shrink it to a minimal index naming which skills auto-activate **without** restating their trigger conditions. **Done when:** the rule no longer repeats any trigger the description already carries, *and* each guardrail still fires from its description alone (rule absent) in a test.

### W6 — Documentation & reference sync
Update the model docs that describe the taxonomy/visibility/command model: `coding-agents-prompt-authoring/references/{pa-rosetta,pa-rosetta-intro-for-AI,pa-schemas,pa-knowledge-base,pa-intake}.md`, `docs/schemas/skill.md` (+ workflow/command schema if present), `docs/ARCHITECTURE.md` (Command Aliases, Instruction Structure, Bootstrap Flow). Document `user-invocable`/visibility for **both** skills and commands/workflows. **Acceptance:** grep finds no stale skill names, no "phases are user commands" assumption; the visibility model is documented in one canonical place.

## Scope / success / risks (remaining)

- **IN:** `instructions/r3/core/{skills,workflows}/**`, `rules/bootstrap-guardrails.md`, the `coding-agents-prompt-authoring/references/*` model docs, `docs/definitions/{skills,workflows}.md`, `docs/schemas/skill.md`, `docs/ARCHITECTURE.md`, `scripts/plugin_generator.py` (only if W2 needs it), plugin regen. (This pass also mirrored the description edits into r2.)
- **OUT:** MCP server behavior, impl renames.
- **Success:** taxonomy lists reconciled; `init-*` inlined and `gitnexus` consolidated; phases hidden via flag yet still parent-invocable; guardrail rule simplified so guardrails fire from description alone; clean plugin regen.
- **Risks:** reference breakage from inlines/consolidation (W1); an IDE ignoring `user-invocable` leaves a hidden item visible or un-activatable (W2/W3).

## Open items for implementation

1. **gitnexus** shape: 3→1, or keep tools+cli and fold setup.
2. **W5 rule shape:** how lean the simplified `bootstrap-guardrails` pointer should be once native triggers carry the load.
3. **Validation mechanism:** regression prompt suite vs manual checklist vs eval — to prove hidden-but-auto and native-trigger behavior.

## Owner clarifications still in force (verbatim)

- **What counts as a skill:** independence is the test — "is this thing actually a skill … can you use it independently, or is it an extension of the workflow?" Inline = physically merge the body into its host; delete the standalone skill.
- **Who is hidden:** infra/plumbing **and** auto-activated MUST skills.
- **Cross-IDE:** "research how other IDEs need; we add as many attributes as we need in frontmatter. Majority support and follow Claude Code." Build the matrix as a research task.
- **Guardrails vs rule (think the opposite):** "Skill descriptions will always be there. This is the native way. While OUR RULE is a custom addition. The rule probably should be simplified so that we tell what to invoke when." Update descriptions if a trigger is missing.
- **Canonical list:** "authoritative but outdated" — reconcile toward built reality.
- **Naming:** `operation-manager` is the new name; load skills are correct; `discovery` is a distinct skill; `context-engineering` is TBD.
- **Reference docs:** "we must update pa-rosetta and similar files too as part of the task."
