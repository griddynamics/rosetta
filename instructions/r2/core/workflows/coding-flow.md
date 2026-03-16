---
name: coding-flow
description: "Rosetta coding and implementation workflow, includes discovery, tech specs, tech plan, subagent plan review, user plan review, implementation, subagent review implementation, validation, user review, and final validation with reviewer gates, HITL gates, and subagent delegation."
baseSchema: docs/schemas/workflow.md
---

<coding_flow>

<description_and_purpose>

Problem: Unstructured coding leads to scope drift, missing validation, autonomous runaway, and misaligned deliverables.
Solution: Sequential workflow with reviewer gates, HITL gates, subagent delegation, and skill-driven execution scaled per Request size classification.
Validation: Each phase produces verifiable outputs; reviewer catches issues before user; HITL gates prevent autonomous runaway; final validation confirms implementation matches approved intent.

</description_and_purpose>

<workflow_phases>

- Rosetta prep steps completed
- Phases are sequential. Independent subagent tasks within a phase CAN run in parallel.
- Scale per Request size classification (SMALL / MEDIUM / LARGE). Phase attributes indicate minimum size.
- When debugging is needed, INVOKE SUBAGENT `engineer` separately to isolate debugging context from implementation.
- Use INVOKE SUBAGENT `executor` for building, running tests, installing packages, and similar mechanical actions.

<discovery phase="1" applies="MEDIUM,LARGE" subagent="discoverer" role="Context discoverer">

1. Gather project context, affected areas, dependencies, constraints. SMALL: orchestrator handles inline.
2. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Output: discovery-notes.md in FEATURE PLAN folder.
3. Recommended skills: `load-context`
4. Update `agents/coding-flow-state.md`

</discovery>

<tech_plan phase="2" applies="ALL" subagent="architect" role="Senior architect defining specs and plan">

1. USE SKILL `tech-specs` and USE SKILL `planning` together. Split: specs own WHAT, plan owns HOW.
2. Input: discovery notes, user request, `ARCHITECTURE.md`. Output: `<FEATURE>-SPECS.md` + `<FEATURE>-PLAN.md` in FEATURE PLAN folder.
3. SMALL: output as message, no files. MEDIUM: concise. LARGE: full.
4. Recommended skills: `tech-specs`, `planning`, `reasoning`, `questioning`
5. Update `agents/coding-flow-state.md`

</tech_plan>

<review_plan phase="3" applies="MEDIUM,LARGE" subagent="reviewer" role="Reviewer inspecting specs and plan against intent">

1. Review specs and plan against user request and discovery notes.
2. Input: specs, plan, user request. Output: review findings and recommendations.
3. Recommended skills: `reasoning`
4. Update `agents/coding-flow-state.md`

</review_plan>

<user_review_plan phase="4" applies="ALL" type="HITL">

1. Present specs, plan, and review findings. User MUST approve: "Yes, I reviewed the plan" or "Approve, the plan and specs were reviewed".
2. Do NOT assume approval. Anything else = review feedback, iterate.
3. SMALL: may combine with Phase 8 into single checkpoint.

</user_review_plan>

<implementation phase="5" applies="ALL" subagent="engineer" role="Senior engineer executing approved plan">

1. Implement approved plan. Build MUST succeed. Tests excluded.
2. Input: approved specs + plan. Output: working code, build passing.
3. MUST follow approved scope. MUST stop and escalate if blocked.
4. Recommended skills: `coding`
5. Update `agents/coding-flow-state.md`

</implementation>

<review_code phase="6" applies="ALL" subagent="reviewer" role="Reviewer inspecting implementation against specs">

1. Review code changes against approved specs and plan.
2. Input: implementation diff, specs, plan. Output: review findings and recommendations.
3. Recommended skills: `reasoning`
4. Update `agents/coding-flow-state.md`

</review_code>

<impl_validation phase="7" applies="MEDIUM,LARGE" subagent="validator" role="Validation specialist">

1. Validate implementation against specs: git changes, spec coverage, gaps, MCP fact-checking.
2. Input: implementation diff, specs, plan, review findings. Output: validation findings.
3. SMALL: orchestrator performs quick inline check.
4. Recommended skills: `coding`
5. Update `agents/coding-flow-state.md`

</impl_validation>

<user_review_impl phase="8" applies="ALL" type="HITL">

1. Present implementation, review findings, and validation findings. User MUST approve: "Yes, I approve the implementation".
2. Do NOT assume approval. Do NOT proceed to tests until explicit approval.
3. SMALL: combined with Phase 4 checkpoint.

</user_review_impl>

<tests phase="9" applies="ALL" subagent="engineer" role="Senior engineer writing and running tests">

1. Write and execute tests. All MUST succeed, isolated, idempotent.
2. Input: implementation, specs. Output: passing tests with coverage.
3. Recommended skills: `testing`
4. Update `agents/coding-flow-state.md`

</tests>

<review_tests phase="10" applies="MEDIUM,LARGE" subagent="reviewer" role="Reviewer inspecting test coverage and quality">

1. Review tests against specs: coverage, scenarios, edge cases, mocking correctness.
2. Input: tests, specs, implementation. Output: review findings and recommendations.
3. Recommended skills: `reasoning`
4. Update `agents/coding-flow-state.md`

</review_tests>

<final_validation phase="11" applies="MEDIUM,LARGE" subagent="validator" role="Final end-to-end verification">

1. Systematic by-dependency validation: databases, APIs, web, mobile. Check logs, clean up.
2. Input: full delivery (code + tests + specs + review findings). Output: final validation report.
3. SMALL: orchestrator confirms build + tests pass.
4. Recommended skills: `coding`
5. Update `agents/coding-flow-state.md`

</final_validation>

</workflow_phases>

<references>

Subagents:
- `discoverer` (Lightweight): context discovery
- `architect` (Full): tech specs and architecture
- `engineer` (Full): implementation and testing
- `executor` (Lightweight): builds, tests, packages, mechanical actions
- `reviewer` (Full): logical inspection against intent, provides recommendations
- `validator` (Full): verification through actual execution

Skills:
- `coding`, `testing`, `tech-specs`, `planning`, `reasoning`, `debugging`, `questioning`, `load-context`

MCPs:
- `DeepWiki`, `Context7` — external documentation and library knowledge
- `Playwright`, `Chrome-DevTools` — web app testing
- `Appium` — mobile app testing
- `GitNexus` — codebase knowledge graph
- `Serena` — semantic code retrieval at symbol level

</references>

</coding_flow>
