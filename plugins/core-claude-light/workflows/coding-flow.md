---
name: coding-flow
description: "Light coding workflow: features, fixes, refactors, unit tests, etc.; scales small to large."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<coding_flow>

<description_and_purpose>

Problem: Unstructured coding leads to scope drift, missing validation, autonomous runaway, and misaligned deliverables.
Solution: Sequential workflow with reviewer gates, HITL gates, subagent delegation, and skill-driven execution scaled per Request size classification.
Validation: Each phase produces verifiable outputs; reviewer catches issues before user; HITL gates prevent autonomous runaway; final validation confirms implementation matches approved intent.
Lightweight variant: a single architect pass produces discovery, design, specs, and plan; one reviewer gate and one HITL gate approve all of it before implementation.

</description_and_purpose>

<task_stage_binding applies="explicit task command invocation only">

1. Default is the full workflow, unchanged. Only an explicit `task_stage=spec|implement` invocation with resolved task context activates this contract; never infer it from existing task files, TEMP state, or request size.
2. USE SKILL `task-management` to inspect current approvals and bind FEATURE/task folders. No-skipping means every applicable phase inside the selected stage; prior phases require verified approval evidence, not replay.
3. `task_stage=spec`: run through `user_review_design` only. In `solution_design`, obtain architecture approval after Step 3 before specs/plan; the normal single-gate rule is overridden only for this explicit stage. Final gate approves specification and plan. Stop even when `/goal` remains unmet.
4. `task_stage=implement`: require current requirements, architecture, and specification/plan approvals; revalidate their source context. Resume the earliest incomplete or freshness-unproven delivery phase. Missing/stale approval or material source drift: report affected work and return the task's define/spec command before implementation; do not redesign silently.
5. TEMP state and continuation phase labels are checkpoints, not approval or freshness evidence. Recover approved decisions from the durable passport using `task-management`. After any interruption, repeat reviews, validation, and tests unless a current passed verification receipt proves their exact input/delivery snapshot and upstream approvals are unchanged. Old reports, phase labels, or missing TEMP never justify skipping unproven checks.
6. After each applicable phase and before interruption, USE SKILL `task-management` to record current progress, artifacts, actual approvals, verification evidence, blockers, and next phase. Record architecture and specification/plan approvals separately. Retain earlier evidence; invalidate affected approvals on revision.
7. SMALL managed tasks may persist concise architecture, specification, and plan in passport sections instead of separate files. Ordinary invocations retain existing message-only/skip rules and never register tasks automatically.
8. For test-first work, `spec` records intent and test plan only; no test authoring/execution. In `implement`, the pre-implementation tests pass permits expected targeted red failures proving the missing behavior; this overrides the tests phase all-success requirement for that pass only. Unexpected failures block. After code changes, require green execution of all planned checks and re-review affected code/tests before verification. Never reuse pre-implementation results as final verification.
9. Implementation includes every size-applicable review/test gate and final validation (SMALL: inline build/test confirmation). A SMALL combined implementation/final gate remains after tests, not a prerequisite blocking tests. Before any final acceptance prompt, USE SKILL `task-management` to record passed verification after all criteria/checks pass, then inspect its current receipt. Failed/stale/incomplete verification blocks acceptance. Present that exact snapshot; bind acceptance to its verification receipt. The outer task command presents any still-pending acceptance.
10. `/goal` loops stay inside the selected stage; they cannot reopen approved design or cross the specification stop boundary. Return the selected stage's result to the invoking task command.

</task_stage_binding>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed
2. MUST USE SKILL `load-project-context` (required: all), `orchestration` (all except trivial), `hitl` (all, unless `No HITL` or `Fully Autonomous`)
3. MUST ALWAYS use todo tasks ledger, ASAP. Phases are sequential. Independent tasks can run in parallel.
4. No rush, take your time, MUST FOLLOW WORKFLOW ENTIRELY within an explicitly selected task stage (otherwise all phases), no skipping, if in doubt - select the safest / longest path, no deviation from the workflow is allowed
5. When debugging is needed, INVOKE SUBAGENT `engineer` with `debugging` skill to save LLM context
6. INVOKE SUBAGENT `executor` for building, running tests, installing packages, and similar mechanical actions.
7. MUST just-in-time load each phase's skills
8. If workflow is for REQUIREMENTS, MUST USE SKILL `requirements-use` and LOAD all affected requirements. Use refs to requirements for subagents.
9. If `/goal` is set repeat phases 4-7 postponing final_validation until goal is met.
10. If migrate/modernize: implementation phase MUST use tiny batches ONLY (1-3 files), never bulk-read (other phases may); specs/plan enforce; FS-copy RECOMMENDED; no behavior change/new code; mirror source; subagents same; REQUIRED TO log <file> started/completed; Use impl subagents like MAP-REDUCE;
11. Run architect subagent with required model in the background and consult with it if already supported or prefer advisor if already available
12. Coding workflow state MUST be saved to `agents/TEMP/<FEATURE>/coding-flow-state.md` file.
13. If context already contains request for TDD => implement properly red and green adjusting this workflow, including by moving execution of phases `tests` and `review_tests` to be after `user_review_design` and before `implementation`.

</prerequisites>

<solution_design phase="1" applies="ALL" subagent="architect" role="Architect producing discovery, design, specs, and plan in one pass" subagent_required_model="claude-opus-5">

Execute strongly in the specified order. A step MUST NOT start before the previous step is complete.

1. Step 1: Discover project context, affected and related code, dependencies, constraints, and requirements; derive the architecture requirements that address the user request fully. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Do not stop until 100% clear.
2. Step 2: Design 3 best architecture solutions on high level with pro/cons analysis.
3. Step 3: Define the best solution, but concise, phrase-terse, compressed, etc. Record Steps 1-3 as concise `architecture-notes.md` in FEATURE PLAN folder.
4. Step 4: Once done, USE SKILL `tech-specs` (load JIT) to create `plans/<FEATURE>/<FEATURE>-SPECS.md`. Specs own WHAT.
5. Step 5: Once done, USE SKILL `planning` (load JIT) to create `plans/<FEATURE>/<FEATURE>-PLAN.md`. Plan owns HOW. Target: 100% clarity. Cross-reference specs, never duplicate them.
6. Required skills: `reasoning`, `tech-specs`, `planning`
7. Recommended skills: `questioning`, `codemap` (structural project discovery)
8. If REQUIREMENTS in use: `requirements-use` skill is required. Plan/Specs must have pointers to requirements identifiers.
9. Additionally discover existing libraries, packages, and search web for similar problems/tasks (if this make sense)
10. SMALL: output specs and plan as message, no files. MEDIUM: concise. LARGE: full.
11. Update `coding-flow-state.md`

</solution_design>

<review_plan phase="2" applies="MEDIUM,LARGE" subagent="reviewer" role="Reviewer inspecting architecture notes, specs, and plan against intent" subagent_required_model="claude-sonnet-5" must-be-subagent>

1. Review all three artifacts together - `architecture-notes.md`, specs, and plan - against user request, do not assume user is in context, give him full information with TLDR.
2. Input: architecture notes, specs, plan, user request. Output: review findings and recommendations.
3. Report gaps between the three artifacts: a design decision absent from specs, a spec element absent from plan.
4. Update `coding-flow-state.md`

</review_plan>

<user_review_design phase="3" applies="ALL" type="HITL">

1. Present main solution first and then alternatives, do not assume user is in context, give him full information with TLDR.
2. Present architecture notes, specs, plan, and review findings. This is the ONLY gate before implementation. User MUST approve: "Yes, I reviewed the design" or "Approve, the design was reviewed".
3. Strict approval; anything else = review feedback, iterate.

</user_review_design>

<implementation phase="4" applies="ALL" subagent="engineer" role="Senior engineer executing approved plan" subagent_required_model="claude-sonnet-5">

1. Implement approved plan. Build MUST succeed. Tests excluded.
2. Input: approved specs + plan. Demand subagent to read and execute it fully. Do not repeat contents => reference instead. Output: working code, build passing, update relevant documentation briefly (CONTEXT.md, ARCHITECTURE.md, etc).
3. MUST follow approved scope. MUST stop and escalate if blocked.
4. Required skills: `coding`
5. Recommended skills: `debugging`, `sensitive-data`, `testing`, `dangerous-actions`
6. If requirements are used code must contain comments refs to requirements identifiers
7. Spawn multiple implementation agents on independent tasks without dependencies and files intersection if reasonable
8. Update `coding-flow-state.md`

</implementation>

<review_code phase="5" applies="ALL" subagent="reviewer" role="Reviewer inspecting implementation against specs" subagent_required_model="claude-sonnet-5" must-be-subagent>

1. Review code changes against approved specs and plan.
2. Input: implementation diff, specs, plan, check if documentation is updated, brief, and matches the file intent. Output: review findings and recommendations.
3. Required skills: `coding`
4. Recommended skills: `reasoning`, `debugging`, `sensitive-data`, `testing`, `dangerous-actions`
5. Update `coding-flow-state.md`
6. MUST also validate by running locally and check implementation actually works, once code review is done and there are no major issues

</review_code>

<tests phase="6" applies="ALL" subagent="engineer" role="Senior engineer writing and running tests" subagent_required_model="claude-sonnet-5">

1. Write and execute tests. All MUST succeed, isolated, idempotent.
2. Input: implementation, specs. Demand subagent to read specs fully. Do not repeat contents => reference instead. Output: passing tests with coverage.
3. Required skills: `testing`, `coding`
4. Recommended skills: `debugging`, `sensitive-data`, `dangerous-actions`
5. Update `coding-flow-state.md`

</tests>

<review_tests phase="7" applies="MEDIUM,LARGE" subagent="reviewer" role="Reviewer inspecting test coverage and quality" subagent_required_model="claude-sonnet-5" must-be-subagent>

1. Review tests against specs: coverage, scenarios, edge cases, mocking correctness.
2. Input: tests, specs, implementation. Output: review findings and recommendations.
3. Required skills: `testing`, `coding`
4. Recommended skills: `debugging`, `sensitive-data`, `dangerous-actions`
5. Update `coding-flow-state.md`

</review_tests>

<final_validation phase="8" applies="MEDIUM,LARGE" subagent="validator" role="Final end-to-end verification" subagent_required_model="claude-sonnet-5">

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
