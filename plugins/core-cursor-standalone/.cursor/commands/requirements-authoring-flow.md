---
name: requirements-authoring-flow
description: "Workflow for authoring requirements and specifications: drafting, review, validation, etc."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<requirements-flow>

<description_and_purpose>
Prevents premature drafting by enforcing HITL gates where every `<req>` unit receives explicit user approval before proceeding. Each phase produces traceable artifacts (Final Requirements Set, Validation Pack, Traceability Matrix). Input: user request for new requirements, edits, review, refactor, or validation; USE SKILL `requirements-authoring` and PROACTIVELY REQUIRE its use in all phases and subagents.
</description_and_purpose>

<workflow_phases>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed (get_context_instructions called and all three prep steps completed).
- No rush, take your time, MUST FOLLOW WORKFLOW ENTIRELY, no skipping
- Every phase MUST update `requirements-authoring-flow-state.md` in FEATURE TEMP with: phase name, status, artifact produced, and open questions.
- Orchestrator and subagents MUST USE SKILL `requirements-authoring`.
- If task is to reverse engineer orchestrator MUST USE SKILL `reverse-engineering`.
- Keep requirement identifiers in code comments only, must not be user facing.
- If `/goal` is set repeat phases 5-6 until goal is met, then continue with the rest of phases.
- This workflow MUST be used with Fable, Opus, GPT-5.5+ class models => IF NOT - DEMAND USER TO SWITCH MODEL

IMPORTANT! If the task is to reverse engineer requirements, spawn MULTIPLE subagents with each handling one unit of analysis (one screen, one page, one controller, one endpoint, etc) to effectively prevent hallucinations by narrow scoping for phases intent_capture, outline, draft, validate.

<discovery phase="1" priority="must" subagent="discoverer" role="Context analyst collecting project and scope signals" subagent_required_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro">

Artifact: Discovery Summary (context, existing requirements, constraints, affected files).
Done when: scope boundaries and relevant requirement files are identified.

1. Complete all preparation steps (PREP 1-3)
2. Detect environment and project structure
3. Read existing requirements, glossary, assumptions, constraints
4. Identify requirement areas (FR, NFR, interfaces, data, traceability)
5. Record assumptions and unknowns
6. Required skills: `requirements-authoring`
7. Recommended skills: `reverse-engineering`

</discovery>

<research phase="2" priority="should" subagent="requirements-engineer" role="Researcher collecting standards and prior decisions" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

Artifact: Research Notes (sources, constraints, prior art, reusable requirement patterns).
Done when: relevant references are gathered OR no additional sources are needed.
Skip when: local context is complete and no external standards are needed.

1. Gather supporting docs and prior decisions
2. Collect requirement patterns and quality criteria
3. Capture measurable thresholds and terminology constraints
4. Required skills: `requirements-authoring`

</research>

<intent_capture phase="3" priority="must" subagent="requirements-engineer" role="Requirements analyst capturing intent and assumptions" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

Artifact: Intent Capture.
Done when: intent is restated, scope and goals confirmed, assumptions listed, and questions resolved.

1. Restate intent and confirm scope and goals
2. List assumptions and targeted questions
3. HITL: present intent capture and get explicit approval
4. Resolve blockers before outlining or drafting
5. Required skills: `requirements-authoring`

</intent_capture>

<outline phase="4" priority="must" subagent="requirements-engineer" role="Information architect proposing MECE requirement layout" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

Artifact: Requirement Outline (areas, file mapping, ID strategy, traceability plan).
Done when: user approves structure and requirement batching strategy.

1. Propose MECE structure and area abbreviations
2. Map files and IDs without writing final requirement text
3. HITL: get user approval on structure and scope
4. Required skills: `requirements-authoring`

</outline>

<draft phase="5" priority="must" subagent="requirements-engineer" role="Author drafting atomic requirement units" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

Artifact: Draft Requirement Units (from `requirements-authoring/assets/ra-requirement-unit.md`).
Done when: every in-scope requirement has schema-complete draft and explicit user decision.

1. Draft in small batches using `<req>` schema
2. Use EARS for FRs and measurable metrics for NFRs
3. Keep unresolved or deferred units as `Draft`
4. Modify files directly, do not show to user
5. Update `<req>` schema if older/missing fields
6. Required skills: `requirements-authoring`
7. If reverse engineering - it must be possible to rewrite using requirements only completely from scratch without old code present.

</draft>

<validate phase="6" priority="must" subagent="reviewer" role="Quality reviewer checking correctness, conflicts, and gaps" subagent_required_model="gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-4-6" must-be-subagent>

Artifact: Validation Report (rubric results, conflict checks, gap checks, risks).
Done when: checklist passes and unresolved issues are either fixed or explicitly deferred.

1. ACQUIRE `requirements-authoring/assets/ra-validation-rubric.md` FROM KB and run validation
2. Run conflict checks and gap checks
3. Verify traceability source -> goal -> req -> test
4. HITL: review findings with user as a narrative / story /walk-through
5. Required skills: `requirements-authoring`
6. Recommended skills: `reverse-engineering`
7. If reverse engineering: MUST additionally validate there are NO hallucinations or made-up requirements

</validate>

<user_review phase="7" priority="must" subagent="HITL" role="HITL">

1. Review all drafts requirements with user by providing a clear and exact story as a narrative/walk-through of a functionality of the application that this affected, use simple words and sentences (consider human doesn't know internal implementation). If possible you can also do that from point of view of the actor that this requirements affect (user of the app, admin of the dashboard, etc)
2. You should combine affected and existing requirements for the proper narrative/story
3. If there are multiple stories - create todo task to review each story separately
4. Review story-by-story with user for approval, provide referenced content, examples, etc
5. The narrative must still be very specific so that it allows to fully approve every aspect of requirements
6. Do not assume user has a context, explain like user sees this first time
7. Must review all assumptions and quirks

</user_review>

<finalization phase="8" priority="must" subagent="requirements-engineer" role="Business analyst finalizing requirement artifacts" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

Artifact: Final Requirements Set, Validation Pack, Traceability Matrix, Change Log.
Done when: artifacts are stored in target location and state file is complete.

1. Deliver final approved requirement set
2. Update index and links
3. ACQUIRE `requirements-authoring/assets/ra-change-log.md` FROM KB and update change log
4. Mark state as complete
5. Required skills: `requirements-authoring`
6. Coding must be performed using `coding-flow` (ask, recommend, switch)

</finalization>

</workflow_phases>

<references>

Use `USE SKILL` for skills, `ACQUIRE FROM KB` for rules.

Skills:

- skill `requirements-authoring` - authoring, reviewing, validating requirements

Rules:

- rule `rules/requirements-best-practices.mdc` - requirements quality and process rules

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
