# research
Meta-prompting skill: craft an optimized research prompt first, then execute it as a separate subagent — never research directly.

## Why it exists
Fixes the failure mode where an AI treats its training-data knowledge as sufficient and skips external verification. The skill forces the opposite: "Search documentation for libraries, versions, and issues not in built-in knowledge" and "MUST prioritize ACCURACY over SPEED ... MUST be grounded: prove with links and references." Without it a competent model would answer from memory, present a single unverified source as fact, and skip the explicit self-validation pass this skill mandates.

## When to engage
Actor: the `researcher` subagent (`mode: subagent`, `readonly: false`). Trigger: systematic research needing grounded references, multi-option analysis, and self-validation; skip for simple lookups or single-source questions. Prerequisite: "All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed." Not meant for casual direct invocation — `workflows/self-help-flow.md` flags `/research ...` as a BAD example because "using the skill directly bypasses the structured research workflow; PRIORITY RULE applies," steering real usage through `research-flow` instead.

## How it works
Single flat SKILL.md, no `assets/` or `references/`. Flow: `<role>` (senior research specialist, meta-prompting) → `<when_to_use_skill>` gate → `<core_concepts>` (prep-step prerequisite, meta-prompting approach, a hard restriction against touching CONTEXT.md/ARCHITECTURE.md/IMPLEMENTATION.md) → `<process>`, itself split in two: "Research rules" govern how research is actually carried out (plan, tree-of-thoughts with ≥3 options, ongoing `research-state.md`, save to `docs/<feature>-research.md`, grounding/HITL discipline, parallel subagents) and "Enforcement rules for the generated research prompt" are 5 MUSTs that this skill bakes into the prompt it hands off, not into its own execution. Invoked by the `researcher` subagent inside `research-flow` phase 3 (`execute_research`), and ad hoc by orchestration's team-manager asset for external-knowledge lookups.

## Mental hooks & unexpected rules
- "craft an optimized research prompt first, then execute it — never research directly" — this skill's real output is a prompt, not an answer; answering research questions inline is out of contract.
- "MUST NOT update CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, and create any other documents EXCEPT those mentioned explicitly" — research output is deliberately walled off from the project's core docs.
- "Follow tree-of-thoughts pattern and analyze at least 3 options" — a single correct-looking option still fails the skill's contract.
- "Fall back to anecdotal references, but call this out EXPLICITLY!" — anecdote is permitted only with a loud disclaimer, never silently blended with reputable sources.
- "MUST use DeepWiki and Context7" — a named-tool mandate written into the generated research prompt, not a suggestion.
- "MUST think about and align consequences and consequences of consequences to prevent oversight" — second-order-effects analysis is required of the crafted prompt, not optional depth.

## Invariants — do not change
- Frontmatter `name: research` equals the folder name and the registry entry at `docs/definitions/skills.md:4` — renaming either breaks registration.
- `description` is one dense sentence under the ~25-token budget ("To run systematic deep research via meta-prompting — grounded references, incremental tracking, self-validation.").
- `disable-model-invocation: false`, `user-invocable: true` — both model- and user-triggerable; `agents/researcher.md`'s `USE SKILL research` depends on model-invocability.
- `agent: researcher` with `context: default` — intended; kept as affinity metadata (which subagent this skill serves). It only becomes a fork target under `context: fork`.
- XML section names `<research>`, `<role>`, `<when_to_use_skill>`, `<core_concepts>`, `<process>` are structural anchors that other tooling may parse.
- Two distinct, similarly-named state files: `research-state.md` (this skill, `agents/researcher.md`) is the skill-level tracker; `research-flow-state.md` (`workflows/research-flow.md`) is the workflow-level tracker — do not rename either without checking both call sites, and do not assume they are the same file.
- Inbound couplings: `agents/researcher.md:33,40` ("Apply `research` skill." / "USE SKILL research") — the subagent contractually required to run this skill; `workflows/research-flow.md:51` ("Required skills: `research`", phase 3 `execute_research`) — the sanctioned entry point; `skills/orchestration/assets/o-team-manager.md:9` ("USE SKILL `research` for external knowledge if needed") — an ad hoc invocation path outside `research-flow`; `workflows/self-help-flow.md:53` — documents direct `/research` invocation as bypassing the structured workflow.

## Editing guide
Safe to edit: wording inside the "Research rules" / "Enforcement rules for the generated research prompt" bullet lists, as long as the meta-prompting split survives (this skill governs how research is carried out; the crafted prompt separately carries its own 5 enforcement rules). Handle with care: frontmatter (`name`, `description`, `agent`/`context`, the three-model list echoed into `research-flow.md` phase attributes), the two state-file names, and the `docs/<feature>-research.md` / `research-prompt.md` output paths, since `research-flow.md` and `researcher.md` branch on these exact strings. Referenced by: `agents/researcher.md`, `workflows/research-flow.md`, `skills/orchestration/assets/o-team-manager.md`, and `workflows/self-help-flow.md` (as a cautionary example).
