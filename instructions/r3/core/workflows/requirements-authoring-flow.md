---
name: requirements-authoring-flow
description: Rosetta workflow for requirements authoring (creating, updating, improving, reviewing). Guides AI through discovery, intent capture, iterative requirement drafting with mandatory user approvals, validation, and delivery. Contains discovery, research, intent capture, outline, drafting, validating, and finalization
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<requirements-flow>

<description_and_purpose>
Prevents premature drafting by enforcing HITL gates where every `<req>` unit receives explicit user approval before proceeding. Each phase produces traceable artifacts (Final Requirements Set, Validation Pack, Traceability Matrix). Input: user request for new requirements, edits, review, refactor, or validation; active skill is `requirements-authoring`.
</description_and_purpose>

<workflow_phases>

Every phase MUST update `requirements-authoring-flow-state.md` in FEATURE TEMP with: phase name, status, artifact produced, and open questions.

<discovery phase="1" priority="must" subagent="requirements-engineer" role="Context analyst collecting project and scope signals">

Artifact: Discovery Summary (context, existing requirements, constraints, affected files).
Done when: scope boundaries and relevant requirement files are identified.

1. Complete all preparation steps (PREP 1-3)
2. Detect environment and project structure
3. Read existing requirements, glossary, assumptions, constraints
4. Identify requirement areas (FR, NFR, interfaces, data, traceability)
5. Record assumptions and unknowns

</discovery>

<research phase="2" priority="should" subagent="requirements-engineer" role="Researcher collecting standards and prior decisions">

Artifact: Research Notes (sources, constraints, prior art, reusable requirement patterns).
Done when: relevant references are gathered OR no additional sources are needed.
Skip when: local context is complete and no external standards are needed.

1. Gather supporting docs and prior decisions
2. Collect requirement patterns and quality criteria
3. Capture measurable thresholds and terminology constraints

</research>

<intent_capture phase="3" priority="must" subagent="requirements-engineer" role="Requirements analyst capturing intent and assumptions">

Artifact: Intent Capture.
Done when: intent is restated, scope and goals confirmed, assumptions listed, and questions resolved.

1. Restate intent and confirm scope and goals
2. List assumptions and targeted questions
3. HITL: present intent capture and get explicit approval
4. Resolve blockers before outlining or drafting

</intent_capture>

<outline phase="4" priority="must" subagent="requirements-engineer" role="Information architect proposing MECE requirement layout">

Artifact: Requirement Outline (areas, file mapping, ID strategy, traceability plan).
Done when: user approves structure and requirement batching strategy.

1. Propose MECE structure and area abbreviations
2. Map files and IDs without writing final requirement text
3. HITL: get user approval on structure and scope

</outline>

<draft phase="5" priority="must" subagent="requirements-engineer" role="Author drafting atomic requirement units">

Artifact: Draft Requirement Units (from `requirements-authoring/assets/ra-requirement-unit.xml`).
Done when: every in-scope requirement has schema-complete draft and explicit user decision.

1. Draft in small batches using `<req>` schema
2. Use EARS for FRs and measurable metrics for NFRs
3. Keep unresolved or deferred units as `Draft`

</draft>

<validate phase="6" priority="must" subagent="requirements-reviewer" role="Quality reviewer checking correctness, conflicts, and gaps">

Artifact: Validation Report (rubric results, conflict checks, gap checks, risks).
Done when: checklist passes and unresolved issues are either fixed or explicitly deferred.

1. ACQUIRE `requirements-authoring/assets/ra-validation-rubric.md` FROM KB and run validation
2. Run conflict checks and gap checks
3. Verify traceability source -> goal -> req -> test
4. HITL: review findings with user as narrative

</validate>

<finalization phase="7" priority="must" subagent="requirements-engineer" role="Business analyst finalizing requirement artifacts">

Artifact: Final Requirements Set, Validation Pack, Traceability Matrix, Change Log.
Done when: artifacts are stored in target location and state file is complete.

1. Deliver final approved requirement set
2. Update index and links
3. ACQUIRE `requirements-authoring/assets/ra-change-log.md` FROM KB and update change log
4. Mark state as complete

</finalization>

</workflow_phases>

<references>

Use `USE SKILL` for skills, `ACQUIRE FROM KB` for rules.

Skills:
- skill `requirements-authoring` - authoring, reviewing, validating requirements

Rules:
- rule `rules/requirements-best-practices.md` - requirements quality and process rules

</references>

<validation_checklist>

- Every phase produced its artifact
- No must phase skipped or merged
- Should phase skipped only with reason
- PREP steps completed before discovery
- Intent capture approved before outline and draft
- Structure approved before drafting
- Each `<req>` explicitly user-approved
- Validation rubric passed or deferred explicitly
- Traceability links are complete
- State file reflects final status
- Actors are clear at each HITL gate
- Non-goals are not introduced

</validation_checklist>

<pitfalls>

- Skip questioning and guess intent
- Draft before intent capture approval
- Batch too much and lose review quality
- Mark req Approved without user approval
- Mix implementation details into requirements
- Validate without checking conflicts and gaps
- Omit traceability updates
- Forget state updates and lose flow continuity

</pitfalls>

</requirements-flow>
