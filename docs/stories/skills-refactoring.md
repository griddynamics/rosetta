# Story: Skills Taxonomy Reconciliation + Frontmatter Refactoring

Status: IN PROGRESS — frontmatter `description` compression is complete; structural/visibility/taxonomy work remains. Confirmed scope with owner. Source = `instructions/r3/core/**` (also mirrored to r2 this pass — see Completed; never hand-edit `plugins/`).

**Current vs target:** Findings (F*) describe the *current* state; Workstreams (W*) describe the *target* state and the gap to close. Code may already be partway to a target — partial progress is **not** completion. Execute each workstream to its described target, never to "looks already done."

## Completed (this pass)

- **W4 — Description diet — DONE.** All non-critical skill/subagent/workflow descriptions compressed. Skills → verb-first `To …`; `init-workspace-*` → 2–3 words; gitnexus tightened; subagents → action-led + `Full/Lightweight subagent.` tag.
- **W3 (description part) — DONE.** Top-level workflows → `Workflow for …`; phase files → `Phase N <label> of <flow>` (existing phase numbers kept verbatim, gaps allowed). Phase *hiding* (visibility flag) still open.
- **W5 (description part) — DONE.** The 5 MUST skills (`risk-assessment`, `self-learning`, `self-organization`, `orchestrator-contract`, `subagent-contract`) dropped the redundant `Rosetta MUST skill.` lead, every activation trigger kept. The 4 critical skills (`dangerous-actions`, `sensitive-data`, `hitl`, `deviation`) kept **verbatim**. The bootstrap-guardrails *rule* simplification is still open.
- **W1 (coding-iac part) — DONE.** `coding-iac` folded into `coding`: body → `skills/coding/assets/iac.md`; `coding/SKILL.md` carries `MUST follow \`assets/iac.md\``; skill deleted; removed from `coding-flow` recommended lists. The `coding-iac-best-practices.md` rule kept. (`init-workspace-*` inline still open; gitnexus consolidation dropped.)
- **`questioning` kept** (not merged into `hitl`): content overlaps hitl's questioning section, but it is the lightweight, subagent-loadable form; merging would force the heavy hitl protocol into subagents. Description compressed only.
- **Release targeting (r2 vs r3):** this pass applied to **both** (owner-approved, **one-time**). Default is `r3`; **ask each request which release(s) to apply to** — do not assume r2.
- **Recorded into the plan below (owner-approved):** `coding-agents-prompt-adaptation` **removed** (folder + `prompt-engineer.md` ref + `docs/definitions/skills.md` + `docs/CODEMAP.md`); `hooks-authoring` **renamed → `coding-agents-hooks-authoring`** (kept). The Recommendation table and Scope reflect these.

## Problem

The skill set has drifted from its own canonical taxonomy and carries cost that does not pay for itself:

- Some `SKILL.md` files are not standalone capabilities — they are thin wrappers over a single workflow phase (`init-workspace-*`) or extensions of a parent skill (`coding-iac`).
- Infra/plumbing and reactive-guardrail skills appear in the user `/` menu where users must never invoke them.
- Workflow phase files are emitted as user commands (generator renames `workflows/`→`commands/`), so internal phases leak into the user `/` menu even though they are only invocable through their parent workflow.
- Frontmatter `description` fields run long. Instructions are agent-facing; every token is paid on every turn; Must compressed call to action; Can use phrases and unicode;
- The implemented set diverges from `docs/definitions/skills.md` (authoritative but outdated).

## Findings (evidence)

- **F1 — Canonical drift.** `docs/definitions/skills.md` lists ~15 skills never built and omits 12 that exist. It is authoritative intent but outdated: fix it where reality has legitimately moved on.
- **F2 — `init-workspace-*` are thin wrappers.** Each `init-workspace-flow-*.md` phase just does `ACQUIRE init-workspace-X/SKILL.md FROM KB and EXECUTE` (e.g. `init-workspace-flow-context.md:34`). Inlining = merge skill body into its one phase file, delete skill. The canonical list still calls these skills (`skills.md:32-38`) — outdated; W0 removes them.
- **F3 — Description is the NATIVE trigger; our rule is the custom add-on.** `bootstrap-guardrails.md:50-74` issues `MUST USE SKILL hitl / sensitive-data / self-learning / risk-assessment / dangerous-actions / deviation / questioning / self-organization`. Skill descriptions are always present and drive IDE-native auto-activation. **Current state:** the rule is already grouped (`always_on / action_gated / event_triggered / self_monitoring`) but still **restates each skill's activation trigger inline** — that duplication of the description, not the grouping/formatting, is the cost. Correct direction: descriptions own the trigger; the rule shrinks to a minimal pointer (see W5).
- **F4 — Independent skills = subagent-invoked ones.** `agents/*.md` invoke `coding, testing, debugging, planning, tech-specs, reasoning, research, requirements-authoring/use, reverse-engineering, coding-agents-prompt-authoring/adaptation`. These are the keep-visible core.
- **F5 — Precedent.** Commit `cefeea4 "Merge review skills"` — consolidation is established; no competing in-flight branch.

## Confirmed decisions (owner-approved)

1. **Canonical list:** authoritative but outdated — reconcile toward it, update the list where reality moved on.
2. **Names:** `operation-manager` is the correct new name (fix list entry `plan-manager` → `operation-manager`); `load-context` / `load-workflow` / `load-context-instructions` are correct (add to list); `discovery` is a separate, distinct skill (leave as its own unbuilt entry); `context-engineering` is **TBD** (definition unknown — leave as open placeholder). No impl renames.
3. **Guardrails / auto-activated skills:** keep descriptions as the native trigger and *augment* any missing trigger signal; **do not** trim them below activation strength. Simplify the custom bootstrap rule instead (W5).
4. **Off-list skills:** this doc gives **recommendations with confidence**, not verdicts. Implementation decides.
5. **Scope:** one story = taxonomy reconciliation **+** the 4 objectives.
6. **Cross-IDE visibility:** captured as a research task with acceptance criteria (W2), not built here.
7. **Workflow phases:** stay emitted as commands (parent invokes them) but get `user-invocable: false` (+ per-IDE equivalents) to drop them from the user `/` menu; top-level flows stay `user-invocable: true`. Visibility is a frontmatter flag only; the sole top-level/phase difference is the flag.

## Recommendation table (implementation decides)

> Description compression was applied to every kept skill this pass (not repeated per row). **Resolved this pass:** `coding-iac` folded into `coding`; `coding-agents-prompt-adaptation` removed — both no longer listed. Remaining recommendations are unchanged from the original analysis.

| Skill(s) | Canon? | Recommendation | Visibility | Conf. |
|---|---|---|---|---|
| coding, testing, debugging, planning, tech-specs, reasoning, research, requirements-authoring, requirements-use, reverse-engineering, coding-agents-prompt-authoring, large-workspace-handling | ✓ | Keep — independent capability (F4) | visible | High |
| hitl, sensitive-data, dangerous-actions, deviation, risk-assessment, self-learning, self-organization, questioning | ✓ | Keep — reactive guardrail; description carries trigger (F3, W5) | hidden | High |
| load-context, load-workflow, load-context-instructions, operation-manager, orchestrator-contract, subagent-contract | partial | Keep — infra/plumbing | hidden | High |
| init-workspace-context, -discovery, -documentation, -patterns, -rules, -shells, -verification | (outdated) | Inline into matching `init-workspace-flow-*.md`; delete skill (F2) — **pending** | n/a (phase) | High |
| gitnexus-cli, gitnexus-setup, gitnexus-tools | ✗ | Keep all three (consolidation dropped this pass) | hidden/conditional | Med |
| specflow-use | ✗ | Keep — integration connector, conditional on SpecFlow MCP | hidden/conditional | Med |
| coding-agents-hooks-authoring (was `hooks-authoring`) | ✗ | Keep — meta/dev skill; renamed this pass | hidden | Med |
| natural-writing | ✗ | Keep — capability (used by `self-help-flow`) | visible | Med |
| coding-agents-farm | ✗ | Keep — standalone orchestration capability | visible | Med |

## Workstreams

- **W0 — Reconcile taxonomy.** Update `docs/definitions/skills.md` per Confirmed Decision 2: rename entry `plan-manager`→`operation-manager`; add `load-context/load-workflow/load-context-instructions`; remove `init-workspace-*` (now phases); keep `discovery` distinct, `context-engineering` as TBD placeholder; record the off-list recommendations. Update every `USE SKILL` / `ACQUIRE …/SKILL.md` reference; zero dangling refs. Apply the same reconciliation to `docs/definitions/workflows.md` (parallel drift — lists unbuilt flows e.g. `discovery-flow`/`context-engineering-flow`/`testing-flow`, omits built ones e.g. `testgen-flow`/`requirements-authoring-flow`): reconcile toward built reality, same TBD/distinct policy. *(This pass touched only the `coding-agents-prompt-adaptation` line + CODEMAP entry; the rest is pending. Also add `coding-agents-hooks-authoring`.)*
- **W1 — Inline.** Merge each `init-workspace-*` skill body into its matching `init-workspace-flow-*.md` phase, then delete the standalone skill (F2). *(`coding-iac` fold already done; gitnexus consolidation dropped — the 3 skills stay.)*
- **W2 — Visibility + cross-IDE research.** Tag each kept skill **and each workflow/command** by visibility class via frontmatter. **Claude Code flags (explicit):** hidden-but-auto-activated (guardrails, infra/plumbing) = `user-invocable: false` **+** `disable-model-invocation: false`; hidden, parent-invoked only (phases) = `user-invocable: false`; visible = `user-invocable: true`. **Other IDEs:** implementer/AI researches and derives the equivalent attributes — do not assume parity. **Research task (AC):** produce IDE→attribute matrix (Claude Code, Cursor, Copilot, Codex, OpenCode) for hide-from-menu vs disable-auto, for **both skills and commands**; apply per-IDE frontmatter; extend `plugin_generator.py` where an IDE ignores the flag. Acceptance: every hidden skill/phase verified non-listed in the user menu yet still invocable (auto for guardrails, parent-invoked for phases) on each supported IDE, or the limitation documented. *(Pending.)*
- **W3 — Workflow phase hiding.** Phases stay emitted as commands (parent invokes them); add `user-invocable: false` (+ per-IDE equivalents) to remove them from the user `/` menu. Top-level flows stay `user-invocable: true`. *(Phase description compression already done; this is the visibility flag only.)*
- **W5 — Native-trigger reframe (F3).** `bootstrap-guardrails.md` restates each guardrail's trigger inline, duplicating the (now-authoritative) descriptions. **Target:** shrink the rule to a minimal index naming which skills auto-activate **without restating their trigger conditions**. **Done when:** the rule no longer repeats any trigger the description already carries, *and* each guardrail still fires from its description alone (rule absent) in a test.
- **W6 — Documentation & reference sync.** The taxonomy, visibility, and command/phase model is described in several model docs that will drift. Update: `coding-agents-prompt-authoring/references/pa-rosetta.md` and `pa-rosetta-intro-for-AI.md` (skill/workflow model, command aliases, canonical-list policy), `pa-schemas.md` (frontmatter schemas — document `user-invocable`/visibility for **skills and commands/workflows**), `pa-knowledge-base.md` + `pa-intake.md` (skill taxonomy references), `docs/schemas/skill.md` (and workflow/command schema if present), and `docs/ARCHITECTURE.md` (Command Aliases, Instruction Structure, Bootstrap Flow). Acceptance: grep finds no stale skill names, no "phases are user commands" assumption, and the visibility-flag model is documented in one canonical place referenced by the rest. *(Pending.)*

## Scope, success, risks

- IN: `instructions/r3/core/skills/**` + `workflows/**`, `instructions/r3/core/rules/bootstrap-guardrails.md`, `instructions/r3/core/skills/coding-agents-prompt-authoring/references/{pa-rosetta,pa-rosetta-intro-for-AI,pa-schemas,pa-knowledge-base,pa-intake}.md`, `docs/definitions/{skills,workflows}.md`, `docs/schemas/skill.md`, `docs/ARCHITECTURE.md`, `scripts/plugin_generator.py` (only if W2 needs it), plugin regen.
- OUT (default): r2, MCP server behavior, impl renames. **Release targeting is per-request — ask each time which release(s) to apply; default `r3`, do not assume r2.** This pass applied to r2 + r3 by owner request (one-time).
- Success: list reconciled; recommendations applied by implementation; zero dangling refs; phases hidden from the user menu via flag yet still parent-invocable; all workflow descriptions compressed; non-critical descriptions ≤25 tokens; guardrails fire from description alone; clean plugin regen.
- Risks: reference breakage from `init-workspace-*` inlines (W1); IDE that ignores the `user-invocable` flag leaves a hidden skill/phase visible or a hidden skill un-activatable (W2/W3); weakened guardrail activation if a description loses its trigger during W5.

## Open items for implementation

1. **F2 confirmation** at execution: `init-workspace-*` become phases (removed as skills).
2. **W5 rule shape:** how lean the simplified `bootstrap-guardrails` pointer should be once native triggers carry the load.
3. **Validation mechanism:** regression prompt suite vs manual checklist vs eval — to prove hidden-but-auto and native-trigger behavior.

## Original Intent & Owner Clarifications (verbatim — no inference)

### Original request

AI Coding Agents (claude code, codex, cursor, etc) are overloaded with our skills, and users see our internal guts.

1. Inline skills that are only used in workflows and only make sense in that setting (example: `init-workspace-*` vs `coding`).
2. Identify which skills make or do not make sense to be available to users (example: `user-invocable:false` in frontmatter for Claude Code and other IDEs).
3. Workflow phases must not be user visible; their description must be compressed, likely to just step names / phase responsibility.
4. Analyze frontmatter descriptions across the board to reduce them, except critically important ones (`dangerous-actions`, `sensitive-data`, etc.).
Grill me. Save output to `docs/stories/skills-refactoring.md`.

### Clarifications (owner's words)

- **What counts as a skill (Obj 1):** "does it make sense to have this skill used independently… is this thing actually a skill, like human-level skill, can you use it independently, or is it an extension of the workflow?" `reverse-engineering` is used in many workflows but that is not the test — independence is. "coding-iac makes no sense, it instead should be an asset in coding skill + call to action in coding skill."
- **Inline mechanism:** physically merge the skill body into its host; delete the standalone skill.
- **Who is hidden (Obj 2):** hide infra/plumbing **and** auto-activated MUST skills.
- **Cross-IDE (Obj 2):** "research how other IDEs need; we add as many attributes as we need in frontmatter. Majority support and follow Claude Code." Build the matrix later (research task), not now.
- **Description format (Obj 4):** "<= 25 tokens, do not say 'use when', start with verb 'To [verb]' or something similar. Every token counts."
- **Preserve verbose descriptions:** `dangerous-actions`, `sensitive-data`, `hitl`, `deviation`.
- **Canonical list:** "the list is authoritative but outdated."
- **Naming:** "operation-manager is the new name. load skills are correct. discovery is absolutely a different animal." `context-engineering`: "we don't know yet what it should be."
- **Guardrails / descriptions vs rule (think the opposite):** "Skill descriptions will always be there. This is the native way. While OUR RULE is a custom addition. The rule probably should be simplified so that we tell what to invoke when or something similar. Maybe we need to update descriptions if something is missing."
- **Off-list skills:** "You don't [decide]. Implementation does. You can provide a recommendation table, based on real existing skills, and provide your confidence and/or top options."
- **Scope:** expand to the full task (taxonomy reconciliation + the four objectives); "the full task is better than partial." r3; DRAFT.
- **Workflow phases (Obj 3):** "Phases are directly called out from the workflow. User must not know them." They MUST still be emitted as commands — "otherwise those will not be invocable." "Use frontmatter flags properly: we compress the description (to not waste tokens) and we remove them from the user UI (as phases are not directly invocable, only through the parent workflow)." Do not add description — only compress.

### Clarifications (this pass — owner-approved)

- **Release targeting:** applied to both r2 and r3 this pass (one-time). Policy going forward: **ASK each request which release(s) to apply to (r2 vs r3); default `r3`.**
- **Workflow descriptions:** all start with "Workflow for …"; routing-trigger flows (aqa, testgen) rephrased to topic form, dropping "MUST apply when".
- **Phase descriptions:** keep `Phase N <1-2 words> of <flow>-flow`, numbers matching the parent `*-flow.md`.
- **Guardrails:** densify only, may drop "Rosetta", no value lost; do not repeat "MUST skill. MUST …"; the 4 critical stay verbatim.
- **init-* skill descriptions:** 2–3 words.
- **`coding-iac`:** fold into `coding` via `assets/iac.md` + a `MUST follow` call-to-action.
- **`coding-agents-prompt-adaptation`:** remove (unused beyond the prompt-engineer agent; authoring is primary). Recorded in the Recommendation table.
- **`hooks-authoring`:** rename to `coding-agents-hooks-authoring` (folder + refs).
- **gitnexus:** keep the 3 skills; **consolidation dropped** (descriptions tightened this pass).
- **`questioning`:** keep (lightweight, subagent-loadable); compress description only.
