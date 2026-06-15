---
name: code-analysis-flow
description: "Workflow for reverse-engineering a codebase into grounded architecture docs, requirements capture, etc."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<code_analysis_flow>

<description_and_purpose>

Problem: Code analysis degrades into transcription, drifts into suggestions/refactors, or stalls when codebase exceeds single-agent context; assumptions and unknowns are silently adopted.
Solution: Thin, sequential workflow that classifies SMALL vs LARGE codebase, delegates analysis to the `reverse-engineering` skill, must partition LARGE codebases via `large-workspace-handling`, gates critical/high unknowns through `questioning`, and optionally extracts requirements via `requirements-authoring`. Grounded by links, HITL at unknowns and final review.
Validation: Output files exist under `docs/<feature>/`; every claim traces to code/docs; no generated or suggested implementation; open questions and assumptions are documented; state file reflects phase evidence.

</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed
2. MUST USE OPERATION_MANAGER for deterministic execution
3. No rush, take your time, MUST FOLLOW WORKFLOW ENTIRELY, no skipping
4. Phases are sequential; module analysis in LARGE codebases runs in parallel via SKILL `large-workspace-handling`.
5. Orchestrator trusts skills to own execution internals; coordinates sequence, artifacts, state, and approvals only.
6. State file: `agents/TEMP/code-analysis-flow-state.md` updated after each phase.
7. Documentation principle: ground with links; no code generation, no suggestions, no speculation. See `best_practices` for sizing and diagram rules.
8. If `/goal` is set repeat phases 4-8 until goal is met.
9. If task is to extract/document/reverse engineer requirements or specifications from existing app/code:
   - This is much more intense per subagent: reclassify SMALL if < 10 source files, otherwise LARGE and MUST USE `large-workspace-handling`.
   - Both orchestrator and subagents MUST USE SKILL `requirements-authoring`
   - Spawn MULTIPLE subagents with each handling one unit of analysis (one module, one community, one screen, one controller, one endpoint, etc) to effectively prevent hallucinations by narrowing scope down for phases `requirements_branch` and `review` (more agents - less scope each).

</prerequisites>

<context_load phase="1" applies="ALL" subagent="discoverer" role="Context gatherer for analysis scope" subagent_required_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro">

1. Read all lines of `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `agents/IMPLEMENTATION.md`; grep headers of `docs/CODEMAP.md`, `docs/TECHSTACK.md`, `docs/DEPENDENCIES.md` if present.
2. Input: user analysis request. Output: loaded project context + entry points (APIs, webhooks, CLIs, cron jobs).
3. Recommended skills: `load-context`
4. Update `code-analysis-flow-state.md`.

</context_load>

<scope_and_classify phase="2" applies="ALL" subagent="discoverer" role="Scope and size scanner" subagent_required_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro">

1. Classify target codebase: LARGE if 100+ files recursively or 4+ modules; otherwise SMALL.
2. Identify target scope (repo, module, feature, path glob). Record boundaries and non-goals.
3. Input: user request + loaded context. Output: `scope` (paths), `size` (SMALL|LARGE), `module-list` (LARGE only).
4. Required skills: `reasoning`
5. Update `code-analysis-flow-state.md`.

</scope_and_classify>

<clarify_unknowns phase="3" applies="ALL" type="HITL">

1. Surface only critical/high assumptions and unknowns affecting analysis accuracy; skip low and nit-picking.
2. Ask up to 10 targeted, MECE, one-decision-per-question batch. Include safe default per question.
3. Record resolved answers and unresolved items as assumptions; both are persisted in final output.
4. Required skills: `questioning`
5. Update `code-analysis-flow-state.md`.

</clarify_unknowns>

<requirements_branch phase="4" applies="ALL" when="user requested requirements reverse-engineering" subagent="architect" role="Requirements engineer extracting intent from code" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Precondition: user explicitly requested requirements reverse-engineering (e.g., "extract requirements", "generate SRS", "generate specifications", "from existing code", "produce EARS/NFRs from code"). If absent, skip this phase entirely.
2. Use `reverse-engineering` skill to distill intent, then `requirements-authoring` skill to produce atomic, testable functional and non-functional requirements with SMART, MECE, acceptance criteria, EARS phrasing, priority (MoSCoW), and predecessors.
3. Input: scope + context. Output: `docs/REQUIREMENTS/` per `requirements-authoring` layout, with HITL per-unit approval owned by that skill.
4. Required skills: `reverse-engineering`, `requirements-authoring`
5. Update `code-analysis-flow-state.md`.
6. Partition workspace USING SKILL `large-workspace-handling` (Summarization & Indexing strategy): every file belongs to exactly one scope; subagents analyze per-module in parallel.
7. Ensure it is possible to rewrite using requirements only completely from scratch without old code present.

</requirements_branch>

<analyze_small phase="5" applies="SMALL" subagent="architect" role="Senior systems analyst producing a single grounded analysis document" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Produce one grounded analysis document covering: components, data models, patterns, logic flow as conceptual algorithm (no line-by-line), boundary and edge cases, unhandled edges, sequence and dependency diagrams in Mermaid, external dependencies with purpose.
2. Reference specific files and line ranges; keep code snippets ≤3 lines.
3. Input: approved scope + context + resolved questions. Output: `docs/<feature>/analysis.md`.
4. Required skills: `reverse-engineering`
5. Update `code-analysis-flow-state.md`.

</analyze_small>

<analyze_large_parallel phase="6" applies="LARGE" subagent="architect" role="Per-module systems analyst (parallel dispatch)" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Partition workspace USING SKILL `large-workspace-handling` (Summarization & Indexing strategy): every file belongs to exactly one scope; subagents analyze per-module in parallel.
2. Per module produce: business logic overview, architecture overview, component analysis (with subcomponents, interface definitions, and major features), identified design patterns and anti-patterns, data architecture with exact contracts (fields, types, purpose), integration patterns, quality observations, engineering insights. Aim 100–200 lines; diagrams in Mermaid with explicit light/dark colors.
3. Input: `module-list` + scope + context. Output: `docs/<feature>/module-<module>.md` per module.
4. Required skills: `large-workspace-handling`, `reverse-engineering`
5. Update `code-analysis-flow-state.md`.

</analyze_large_parallel>

<summarize phase="7" applies="LARGE" subagent="architect" role="Cross-module summarizer" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Read ALL per-module documents in full (no limit/offset), decompose into canonical sections, combine corresponding sections across modules, and produce a unified view.
2. Produce `docs/<feature>/summary.md` with: Business context (processes/scenarios with involved components and Mermaid diagrams), Domain description (data models with business purpose and cross-repo physical references), Detailed analysis (per repository/component: tech stack, features, dependencies), Architecture insights (patterns and conventions), Dependency map (Mermaid at component and subcomponent level).
3. Flag components where information is missing.
4. Input: all `module-<module>.md` documents. Output: `docs/<feature>/summary.md`.
5. Required skills: `reverse-engineering`
6. Update `code-analysis-flow-state.md`.

</summarize>

<review phase="8" applies="ALL" subagent="reviewer" role="Analysis quality reviewer" subagent_required_model="gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-4-6" must-be-subagent>

1. Inspect outputs for groundedness (every claim linked), accuracy, coverage of scope, absence of generated/suggested code, assumption/unknown documentation, and Mermaid diagram legibility in light and dark themes.
2. Input: analysis artifacts + scope + context. Output: review findings and recommendations.
3. Recommended skills: `reasoning`
4. Update `code-analysis-flow-state.md`.
5. If reverse engineering: MUST validate there are NO hallucinations or made-up requirements - this is a contract!

</review>

<user_review phase="9" applies="ALL" type="HITL">

1. Present final artifacts and review findings. User MUST approve: "Yes, I reviewed the analysis" or "Approve, the analysis was reviewed".
2. Do NOT assume approval. Anything else = feedback; iterate on the phase that owns the affected artifact (`analyze_small`, `analyze_large_parallel`, `summarize`, or `requirements_branch`).

</user_review>

<finalize phase="10" applies="ALL" subagent="architect" role="Analysis finalizer" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Update `IMPLEMENTATION.md` with a brief pointer to produced analysis artifacts.
2. Mark `code-analysis-flow-state.md` complete with phase evidence and artifact paths.

</finalize>

</workflow_phases>

<references>

- Skill `reverse-engineering` — extract WHAT and WHY; strip HOW; detect implicit state machines; consolidate scattered logic; exclude dead code and workarounds.
- Skill `requirements-authoring` — atomic, testable, EARS-phrased functional and non-functional requirements with per-unit HITL.
- Skill `large-workspace-handling` — partition 100+ file workspaces; Summarization & Indexing strategy for analysis; parallel subagent dispatch with explicit scope boundaries.
- Skill `questioning` — batch critical/high MECE questions; safe defaults; persist Q&A.
- Skill `reasoning` — 7D decomposition for classification and review.
- Skill `load-context` — load Rosetta project context files.
- Subagents: `discoverer` (context/scope), `architect` (analysis/summary/requirements), `reviewer` (quality review).

</references>

<best_practices>

- Ground every claim with file and line references; fall back to anecdotal references only with explicit call-out.
- Prioritize accuracy over speed; use grep, search, and navigation tools to protect context.
- Distinguish domain intent from implementation accident per `reverse-engineering` pitfalls.
- Preserve domain terminology; collapse duplicate terms into one before writing.
- Diagrams define explicit colors for nodes, text, and edges to remain readable in both light and dark themes.

</best_practices>

<validation_checklist>

- Size classification recorded and matches produced layout (SMALL → single `analysis.md`; LARGE → `module-*.md` + `summary.md`).
- Every analysis claim has file and line reference; no generated code, no refactor suggestions.
- Critical/high assumptions and unknowns are documented (resolved and unresolved).
- Mermaid diagrams render in both themes (explicit colors set).
- Per-module docs stay within 100–200 lines target; code snippets ≤3 lines.
- `code-analysis-flow-state.md` has artifact evidence for every executed phase.
- Requirements branch produced `docs/REQUIREMENTS/` artifacts only when the user requested it.
- `docs/REQUIREMENTS/INDEX.md` is greppable by headers, which provides automatic ToC for all requirement files with short description.
- Outputs map to original user scope with traceable coverage.

</validation_checklist>

<pitfalls>

- Transcribing code instead of recovering intent.
- Running the requirements branch by default when the user did not ask for it.
- Skipping partitioning and overloading a single agent on LARGE codebases.
- Batch-asking low/nit-pick questions instead of critical/high only.
- Specifying current bugs as intended behavior.
- Including dead code, workarounds, or infrastructure plumbing as domain.
- Producing Mermaid diagrams with theme-default colors that become unreadable in the opposite theme.

</pitfalls>

</code_analysis_flow>
