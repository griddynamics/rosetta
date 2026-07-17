---
name: coding-flow
description: "Workflow for all coding: features, fixes, refactors, unit tests, etc.; scales small to large."
tags: ["workflow"]
user-invocable: true
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

1. All Rosetta prep steps MUST be FULLY completed, SKILL `load-project-context` loaded and fully executed.
2. MUST use todo tasks for reliability
3. No rush, take your time, MUST FOLLOW WORKFLOW ENTIRELY, no skipping, if in doubt - select the safest / longest path, no deviation from the workflow is allowed
4. Phases are sequential. Independent tasks can run in parallel
5. When debugging is needed, INVOKE SUBAGENT `engineer` with `debugging` skill to save LLM context
6. INVOKE SUBAGENT `executor` for building, running tests, installing packages, and similar mechanical actions.
7. MUST just-in-time load each phase's skills
8. If workflow is for REQUIREMENTS, MUST USE SKILL `requirements-use` and LOAD all affected requirements. Use refs to requirements for subagents.
9. If `/goal` is set repeat phases 7-12 postponing user_review_impl and final_validation until goal is met.
10. If migrate/modernize: implementation phase MUST use tiny batches ONLY (1-3 files), never bulk-read (other phases may); specs/plan enforce; FS-copy RECOMMENDED; no behavior change/new code; mirror source; subagents same; REQUIRED TO log <file> started/completed; Use impl subagents like MAP-REDUCE;
11. Run architect subagent with required model in the background and consult with it if already supported
12. Coding workflow state MUST be saved to AGENTS TEMP FEATURE folder as `coding-flow-state.md` file.

</prerequisites>

<discovery phase="1" applies="MEDIUM,LARGE" subagent="discoverer" role="Context discoverer" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra">

1. Gather project context, affected areas, dependencies, constraints, requirements. SMALL: orchestrator handles inline.
2. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Output: `discovery-notes.md` in FEATURE PLAN folder.
3. Required skills: `load-project-context`
4. Recommended skills: `codemap` (structural project discovery)
5. If REQUIREMENTS in use: `requirements-use` skill is required.
6. Additionally request to discover existing libraries, packages, search web for similar problems/tasks (if this make sense)
7. Update `coding-flow-state.md`
8. Do not stop until 100% clear

</discovery>

<design phase="2" applies="ALL" subagent="architect" role="Design architecture requirements and solution" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol">

1. First: design architecture requirements to address user request fully.
2. Second: design 3 best architecture solutions with pro/cons analysis.
3. Third: select the best solution.
4. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Output: concise `architecture-notes.md` in FEATURE PLAN folder.
5. Required skills: `reasoning`
6. Recommended skills: `questioning`
7. Update `coding-flow-state.md`

</design>

<user_review_design phase="3" applies="ALL" type="HITL">

1. Present main solution first and then alternatives, do not assume user is in context, give him full information with TLDR.
1. Present specs, plan, and review findings. User MUST approve: "Yes, I reviewed the design" or "Approve, the design was reviewed".
1. Strict approval; anything else = review feedback, iterate.
1. SMALL: combine with Phase 6 into single checkpoint.

</user_review_design>

<tech_plan phase="4" applies="ALL" subagent="architect" role="Senior architect defining specs and plan" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol">

1. MUST USE SKILL `tech-specs` and `planning` together. Split: specs own WHAT, plan owns HOW. Target: 100% clarity.
2. Input: discovery notes, user request, `ARCHITECTURE.md`. Output: `<FEATURE>-SPECS.md` + `<FEATURE>-PLAN.md` in FEATURE PLAN folder.
3. SMALL: output as message, no files. MEDIUM: concise. LARGE: full.
4. Required skills: `tech-specs`, `planning`
5. If medium/large `reasoning` skill is required
6. If REQUIREMENTS in use: `requirements-use` skill is required. Plan/Specs must have pointers to requirements identifiers.
7. Recommended skills: `questioning`
8. Update `coding-flow-state.md`

</tech_plan>

<review_plan phase="5" applies="MEDIUM,LARGE" subagent="reviewer" role="Reviewer inspecting specs and plan against intent" subagent_required_model="gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-5, grok-4.5, gpt-5.6-terra" must-be-subagent>

1. Review specs and plan against user request and discovery notes, do not assume user is in context, give him full information with TLDR.
2. Input: specs, plan, user request. Output: review findings and recommendations.
3. Update `coding-flow-state.md`

</review_plan>

<user_review_plan phase="6" applies="ALL" type="HITL">

1. Present specs, plan, and review findings. User MUST approve: "Yes, I reviewed the plan" or "Approve, the plan and specs were reviewed".
2. Strict approval; anything else = review feedback, iterate.

</user_review_plan>

<implementation phase="7" applies="ALL" subagent="engineer" role="Senior engineer executing approved plan" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra">

1. Implement approved plan. Build MUST succeed. Tests excluded.
2. Input: approved specs + plan. Demand subagent to read and execute it fully. Do not repeat contents => reference instead. Output: working code, build passing, update relevant documentation briefly (CONTEXT.md, ARCHITECTURE.md, etc).
3. MUST follow approved scope. MUST stop and escalate if blocked.
4. Required skills: `coding`
5. Recommended skills: `debugging`, `sensitive-data`, `testing`, `dangerous-actions`
6. If requirements are used code must contain comments refs to requirements identifiers
7. Spawn multiple implementation agents on independent tasks without dependencies and files intersection if reasonable
8. Update `coding-flow-state.md`

</implementation>

<review_code phase="8" applies="ALL" subagent="reviewer" role="Reviewer inspecting implementation against specs" subagent_required_model="gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-5, grok-4.5, gpt-5.6-terra" must-be-subagent>

1. Review code changes against approved specs and plan.
2. Input: implementation diff, specs, plan, check if documentation is updated, brief, and matches the file intent. Output: review findings and recommendations.
3. Required skills: `coding`
4. Recommended skills: `reasoning`, `debugging`, `sensitive-data`, `testing`, `dangerous-actions`
5. Update `coding-flow-state.md`
6. If SMALL must also validate by running locally and check implementation actually works, once code review is done and there are no major issues

</review_code>

<impl_validation phase="9" applies="MEDIUM,LARGE" subagent="validator" role="Validation specialist" subagent_required_model="gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-5, grok-4.5, gpt-5.6-terra">

1. Validate implementation against specs: git changes, spec coverage, gaps, perform search and MCP fact-checking.
2. Then it must run locally and check it actually works if there are no major issues
3. Input: implementation diff, specs, plan, review findings. Demand subagent to read and verify specs/plan fully. Do not repeat contents => reference instead. Output: validation findings.
4. SMALL: orchestrator performs quick inline check.
5. Recommended skills: `reverse-engineering`, `debugging`, `sensitive-data`, `testing`, `dangerous-actions`
6. Update `coding-flow-state.md`

</impl_validation>

<user_review_impl phase="10" applies="ALL" type="HITL">

1. Present implementation, review findings, and validation findings. User MUST approve: "Yes, I approve the implementation".
2. Strict approval required before proceeding to tests.
3. SMALL: combined with Phase 12 checkpoint.

</user_review_impl>

<tests phase="11" applies="ALL" subagent="engineer" role="Senior engineer writing and running tests" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra">

1. Write and execute tests. All MUST succeed, isolated, idempotent.
2. Input: implementation, specs. Demand subagent to read specs fully. Do not repeat contents => reference instead. Output: passing tests with coverage.
3. Required skills: `testing`, `coding`
4. Recommended skills: `debugging`, `sensitive-data`, `dangerous-actions`
5. Update `coding-flow-state.md`

</tests>

<review_tests phase="12" applies="MEDIUM,LARGE" subagent="reviewer" role="Reviewer inspecting test coverage and quality" subagent_required_model="gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-5, grok-4.5, gpt-5.6-terra" must-be-subagent>

1. Review tests against specs: coverage, scenarios, edge cases, mocking correctness.
2. Input: tests, specs, implementation. Output: review findings and recommendations.
3. Required skills: `testing`, `coding`
4. Recommended skills: `debugging`, `sensitive-data`, `dangerous-actions`
5. Update `coding-flow-state.md`

</review_tests>

<final_validation phase="13" applies="MEDIUM,LARGE" subagent="validator" role="Final end-to-end verification" subagent_required_model="gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-5, grok-4.5, gpt-5.6-terra">

1. Systematic by-dependency validation: databases, APIs, web, mobile. Check logs, clean up.
2. Additionally systematic "manual QA" by yourself.
3. Input: full delivery (code + tests + specs + review findings). Demand subagent to read specs fully. Do not repeat contents => reference instead. Output: final validation report.
4. SMALL: orchestrator confirms build + tests pass.
5. Recommended skills: `coding`, `debugging`, `sensitive-data`, `testing`, `dangerous-actions`
6. Update `coding-flow-state.md`

</final_validation>

</workflow_phases>

<references>

MCPs:

- `DeepWiki`, `Context7` — external documentation and library knowledge
- `Playwright`, `Chrome-DevTools` — web app testing
- `Appium` — mobile app testing
- `GitNexus` — codebase knowledge graph
- `Serena` — semantic code retrieval at symbol level

</references>

</coding_flow>
