# large-workspace-handling

Splits a workspace too big for one agent's context into non-overlapping subagent scopes, using one of two mutually exclusive strategies.

## Why it exists

Fixes the failure mode where an agent tries to read/edit a 100+ file workspace in one pass, blows its context window, and either stalls or produces partial, inconsistent results. Without this skill a good model would still try to do everything itself, or split work ad hoc with overlapping scopes, no shared output contract, and no verification pass — leading to duplicated effort, dropped files, or conflicting edits across subagents.

## When to engage

Triggers when a large workspace exceeds single-agent context. Actor is a "workspace partitioning strategist" that draws scope boundaries and dispatches subagents; it does not do the work itself. Prerequisites: all Rosetta prep steps fully completed and `load-project-context` skill fully executed; `CODEMAP.md` must exist (if missing, `APPLY PHASE init-workspace-flow-discovery.md` to create it) and its `#` headers must be grepped before scoping. Description frontmatter cites "100+ files"; `init-workspace-flow.md` fires the coupling at `file_count >= 50` — the two thresholds are not the same number and both are load-bearing in their own file.

## How it works

SKILL.md is a single flat file (no assets/, no references/): role → when_to_use_skill → core_concepts. Core_concepts branches into two mutually exclusive strategies:
- **Summarize & Index** — research/analysis without code changes; produces a navigable index with per-module summaries, relevance-classified (High/Medium/Low) findings, and a fixed subagent output structure (scope, TLDR, quick nav, per-group details, cross-group map, follow-ups). Subagents may `USE SKILL reverse-engineering` for code analysis.
- **Work distribution** — coordinated code changes via contract-scoped parallel subagents with explicit boundaries, operations, and success criteria; cross-scope dependencies resolved by execution ordering, shared-interface conflicts by an extra pass; ends in a unified result.

Task-type detection is keyword-driven (understand/analyze/... → Summarize & Index; implement/create/fix/... → Work distribution), tie-breaking to Summarize & Index. Scoping rules (partition into independent areas, one subagent per area, group coupled paths, align to monorepo boundaries, predefine output files in a TEMP folder, spawn in parallel, then spawn a second verification wave) apply to both strategies.

## Mental hooks & unexpected rules

- "merged results address the original request completely" — the partition is only valid if the union of subagent outputs is a complete answer; a strategist that leaves gaps between scopes has failed the skill's core contract.
- "every file belongs to exactly one scope" — scopes must be a strict partition, not a covering; overlap is treated as a defect, not redundancy.
- "Once work is done spawn another set of subagents to verify that the work was done properly" — verification is a separate subagent wave, not a self-check by the same subagent that did the work.
- "Tie-breaker: default to `Summarize & Index`" — ambiguous requests are treated as read-only by default, which is the safer failure direction (no unintended edits) but can surprise a caller expecting action.
- "Request slightly more information than actually needed for better understanding" (Summarize & Index only) — deliberately over-provisions subagent context rather than minimizing tokens.

## Invariants — do not change

- Frontmatter `name: large-workspace-handling` matches the folder name and the entry in `/Users/isolomatov/Sources/GAIN/rosetta/docs/definitions/skills.md` (line 14) — renaming either breaks registration.
- `description` is one keyword-dense sentence under the ~25-token budget; it is the only text a router sees before loading the skill.
- `disable-model-invocation: false` and `user-invocable: true` — the skill must remain both model- and user-triggerable; callers depend on `USE SKILL large-workspace-handling` working from workflows, not just from a human command.
- `APPLY PHASE init-workspace-flow-discovery.md` is a hard-coded coupling to a phase file that lives in `prompts/init-workspace-flow-discovery.prompt.md` (part of `init-workspace-flow`). Renaming or moving that phase file silently breaks this skill's CODEMAP.md bootstrap path.
- "Rosetta prep steps" and "CODEMAP.md" are shared vocabulary/contract terms used verbatim across workflows (`init-workspace-flow.md`, `init-workspace-flow-context.md`, `init-workspace-flow-documentation.md`, `code-analysis-flow.md`) and the `codemap` skill; changing the term or the header format (workspace-relative path + child count + <10-word description, 3-4 levels deep) breaks the scoping contract this skill reads.
- XML section names `<large_workspace_handling>`, `<role>`, `<when_to_use_skill>`, `<core_concepts>` follow the section structure defined by `baseSchema: docs/schemas/skill.md`; renaming them diverges from that schema (intent of any further consumer not documented).
- Alias grammar used in the body (`USE SKILL`, `APPLY PHASE`) follows the canonical typed-alias grammar defined in `docs/schemas/skill.md`; do not substitute freeform phrasing.
- Inbound couplings (do not remove without updating callers): `init-workspace-flow.md:30` passes `USE SKILL large-workspace-handling` to Phase 5/7/8 subagents when `file_count >= 50`; `init-workspace-flow-context.md:50` requires it for composite/multi-repo workspaces; `init-workspace-flow-documentation.md:112` adds a MUST-USE note to `CONTEXT.md` for large projects; `code-analysis-flow.md` (lines 14, 26, 32, 74, 91, 94, 140) requires it for LARGE-classified codebases (≥10 source files) and names it a required skill; `codemap/SKILL.md:78` points here for large-workspace partitioning against `CODEMAP.md` headers.

## Editing guide

Safe to edit: wording inside Summarize & Index / Work distribution bullet lists, the keyword lists used for task-type detection, and scoping heuristics — as long as the two-strategy split and "exactly one scope" partition rule survive. Handle with care: the frontmatter block, the XML section tags, the `APPLY PHASE init-workspace-flow-discovery.md` reference, and the 50-vs-100+ file threshold language, since external workflows branch on these exact strings/numbers. New strategy-specific detail belongs inside that strategy's `##` subsection, not in `core_concepts` top-level bullets (those are prerequisites/shared scoping rules only). Referenced by: `init-workspace-flow.md`, `init-workspace-flow-context.md`, `init-workspace-flow-documentation.md`, `code-analysis-flow.md`, and `codemap/SKILL.md`.
