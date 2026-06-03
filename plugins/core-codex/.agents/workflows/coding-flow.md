---
name: coding-flow
description: "Rosetta fixing, improvements, coding, and implementation workflow, includes discovery, tech specs, tech plan, subagent plan review, user plan review, implementation, subagent review implementation, validation, user review, and final validation with reviewer gates, HITL gates, and subagent delegation. Adopts to request size from small to large."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<coding_flow>

<description_and_purpose>

Problem: Unstructured coding leads to scope drift, missing validation, autonomous runaway, and misaligned deliverables.
Solution: Sequential workflow with reviewer gates, HITL gates, subagent delegation, and skill-driven execution scaled per Request size classification.
Validation: Each phase produces verifiable outputs; reviewer catches issues before user; HITL gates prevent autonomous runaway; final validation confirms implementation matches approved intent.

</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed, SKILL `load-context` loaded and fully executed.
2. MUST USE OPERATION_MANAGER for deterministic execution
3. MUST FOLLOW THIS WORKFLOW ENTIRELY AND FULLY, ALL REQUIRED SCALING IS ALREADY PRE-DEFINED BY "applies" ATTRIBUTE.
4. Phases are sequential. Independent subagent tasks within a phase CAN run in parallel.
5. When debugging is needed, INVOKE SUBAGENT `engineer` and USE SKILL `debugging` to isolate debugging context from implementation.
6. Use INVOKE SUBAGENT `executor` for building, running tests, installing packages, and similar mechanical actions.
7. MUST load each phase's skills when entering that phase (just-in-time) when subagents are not used.

</prerequisites>

<discovery phase="1" applies="MEDIUM,LARGE" subagent="discoverer" role="Context discoverer">

1. Gather project context, affected areas, dependencies, constraints, requirements. SMALL: orchestrator handles inline.
2. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Output: discovery-notes.md in FEATURE PLAN folder.
3. Required skills: `load-context`
4. Update `agents/coding-flow-state.md`
5. Do not stop until 100% clear

</discovery>

<design phase="2" applies="ALL" subagent="architect" role="Design architecture requirements and solution">

1. First: design architecture requirements to address user request fully.
2. Second: design 3 best architecture solutions with pro/cons analysis.
3. Third: select the best solution.
4. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Output: concise architecture-notes.md in FEATURE PLAN folder.
5. Recommended skills: `reasoning`, `questioning`
6. Update `agents/coding-flow-state.md`

</design>

<user_review_design phase="3" applies="ALL" type="HITL">

1. Present main solution first and then alternatives, do not assume user is in context, give him full information with TLDR.
1. Present specs, plan, and review findings. User MUST approve: "Yes, I reviewed the design" or "Approve, the design was reviewed".
1. Do NOT assume approval. Anything else = review feedback, iterate.
1. SMALL: combine with Phase 6 into single checkpoint.

</user_review_design>

<tech_plan phase="4" applies="ALL" subagent="architect" role="Senior architect defining specs and plan">

1. MUST USE SKILL `tech-specs` and `planning` together. Split: specs own WHAT, plan owns HOW. Target: 100% clarity.
2. Input: discovery notes, user request, `ARCHITECTURE.md`. Output: `<FEATURE>-SPECS.md` + `<FEATURE>-PLAN.md` in FEATURE PLAN folder.
3. SMALL: output as message, no files. MEDIUM: concise. LARGE: full.
4. Required skills: `tech-specs`, `planning`, `reasoning`
5. Recommended skills: `questioning`
6. Update `agents/coding-flow-state.md`

</tech_plan>

<review_plan phase="5" applies="MEDIUM,LARGE" subagent="reviewer" role="Reviewer inspecting specs and plan against intent">

1. Review specs and plan against user request and discovery notes, do not assume user is in context, give him full information with TLDR.
2. Input: specs, plan, user request. Output: review findings and recommendations.
3. Required skills: `reasoning`
4. Update `agents/coding-flow-state.md`

</review_plan>

<user_review_plan phase="6" applies="ALL" type="HITL">

1. Present specs, plan, and review findings. User MUST approve: "Yes, I reviewed the plan" or "Approve, the plan and specs were reviewed".
2. Do NOT assume approval. Anything else = review feedback, iterate.

</user_review_plan>

<implementation phase="7" applies="ALL" subagent="engineer" role="Senior engineer executing approved plan">

1. Implement approved plan. Build MUST succeed. Tests excluded.
2. Input: approved specs + plan. Output: working code, build passing, update relevant documentation briefly (CONTEXT.md, ARCHITECTURE.md, etc).
3. MUST follow approved scope. MUST stop and escalate if blocked.
4. Required skills: `coding`
5. Recommended skills: `debugging`, `coding-iac`, `sensitive-data`, `testing`, `dangerous-actions`
6. If requirements are used code must contain comments refs to requirement identifiers
7. Update `agents/coding-flow-state.md`

</implementation>

<review_code phase="8" applies="ALL" subagent="reviewer" role="Reviewer inspecting implementation against specs">

1. Review code changes against approved specs and plan.
2. Input: implementation diff, specs, plan, check if documentation is updated, brief, and matches the file intent. Output: review findings and recommendations.
3. Required skills: `coding`
4. Recommended skills: `reasoning`, `debugging`, `coding-iac`, `sensitive-data`, `testing`, `dangerous-actions`
5. Update `agents/coding-flow-state.md`

</review_code>

<impl_validation phase="9" applies="MEDIUM,LARGE" subagent="validator" role="Validation specialist">

1. Validate implementation against specs: git changes, spec coverage, gaps, perform search and MCP fact-checking.
2. Locally execute code and check it works
3. Input: implementation diff, specs, plan, review findings. Output: validation findings.
4. SMALL: orchestrator performs quick inline check.
5. Recommended skills: `reverse-engineering`, `debugging`, `sensitive-data`, `testing`, `dangerous-actions`
6. Update `agents/coding-flow-state.md`

</impl_validation>

<user_review_impl phase="10" applies="ALL" type="HITL">

1. Present implementation, review findings, and validation findings. User MUST approve: "Yes, I approve the implementation".
2. Do NOT assume approval. Do NOT proceed to tests until explicit approval.
3. SMALL: combined with Phase 12 checkpoint.

</user_review_impl>

<tests phase="11" applies="ALL" subagent="engineer" role="Senior engineer writing and running tests">

1. Write and execute tests. All MUST succeed, isolated, idempotent.
2. Input: implementation, specs. Output: passing tests with coverage.
3. Required skills: `testing`, `coding`
4. Recommended skills: `debugging`, `coding-iac`, `sensitive-data`, `dangerous-actions`
5. Update `agents/coding-flow-state.md`

</tests>

<review_tests phase="12" applies="MEDIUM,LARGE" subagent="reviewer" role="Reviewer inspecting test coverage and quality">

1. Review tests against specs: coverage, scenarios, edge cases, mocking correctness.
2. Input: tests, specs, implementation. Output: review findings and recommendations.
3. Required skills: `testing`, `coding`
4. Recommended skills: `debugging`, `coding-iac`, `sensitive-data`, `dangerous-actions`
5. Update `agents/coding-flow-state.md`

</review_tests>

<final_validation phase="13" applies="MEDIUM,LARGE" subagent="validator" role="Final end-to-end verification">

1. Systematic by-dependency validation: databases, APIs, web, mobile. Check logs, clean up.
2. Additionally systematic "manual QA" by yourself.
3. Input: full delivery (code + tests + specs + review findings). Output: final validation report.
4. SMALL: orchestrator confirms build + tests pass.
5. Recommended skills: `coding`, `debugging`, `coding-iac`, `sensitive-data`, `testing`, `dangerous-actions`
6. Update `agents/coding-flow-state.md`

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
