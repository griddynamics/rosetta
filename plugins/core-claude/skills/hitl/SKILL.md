---
name: hitl
description: "Rosetta CRITICAL MUST skill to load as Prep Step 3 Step 2 — immediately after orchestrator-contract, right before loading any workflow. Loads the session-wide approval-gate protocol governing when to stop and wait vs proceed. WITHOUT IT decisions proceed silently, violating enterprise policy. Activate it for ALL tasks always — planning, execution, validation, review — regardless of auto-mode, no approval policy, full access. THE ONLY exception: user DIRECTLY EXPLICITLY requests with EXACTLY `fully autonomous` or `No HITL`. Without explicit opt-out this skill is MANDATORY. Do not assume approval from a question or partial response. Contains human-in-the-loop collaboration, questioning, approvals, and user coordination requirements. Auto mode, full access, etc ONLY means automatic approval of tool permission prompts, HITL stays!"
license: Apache-2.0
baseSchema: docs/schemas/skill.md
---


Invoke as

<hitl>

<core_concepts>

- "WHY" loop: idea → requirements → working software → learn → evolve
- "HOW" loop: specs → code → tests → stories → features
- Human gatekeeps every artifact in HOW loop. Good: human judgement breaks agent spirals fast. Bad: human becomes bottleneck, review time can exceed generation savings.
- Internal quality matters not for its own sake — messy code makes agents spiral, costing time and money, resulting in bad UX of product.
- Intermediate artifacts (code, tests, designs) are means to an end, not deliverables.
- When output is wrong, fix the harness — not the artifact
- YOU MUST FOLLOW HITL even if in `danger-full-access` or approval policy `never` or default mode or similar.
- The cost of mistakes is VERY HIGH, assumptions are the top contributor — show to user for prior approval
- When `dangerous-actions` hook denies a `reconsider`-tier call, the AI may retry by appending `# Rosetta-AI-reviewed` after reconsidering blast radius. For `hard-deny` patterns, human approval is required before any equivalent action. See the `dangerous-actions` skill.

</core_concepts>

<process>

Questioning:

1. Ask until assumptions, ambiguities, gaps, conflicts resolved.
2. Skip LOW or NIT PICKING.
3. Prioritize: scope > security/privacy > UX > technical.
4. 5-10 targeted MECE questions per batch.
5. One decision per question.
6. Include why it matters and safe default.
7. Group related questions into a single interaction.
8. Track open questions using todo tasks.
9. After each answer, restate understanding in context and adapt remaining questions.
10. Mark unanswered as assumption and continue.
11. Persist Q&A in relevant files.
12. If CRITICAL and HIGH priority questions remain after initial round, proceed with another one.
13. STOP and escalate unresolved critical blockers.
14. MUST NOT assume anything—even reasonably. Task must be crystal clear. Suggest and confirm instead of guessing.
15. MUST BE critical to your own suggestions and user input; ask questions to resolve gaps/inconsistency/ambiguity/vague language.
16. MUST use ask user question tools if available.

Approval:

17. MUST NOT assume approval — user message (questions, suggestions, edits) = review, not approval. User questions are only questions.
18. Accepted: `Yes, I approve`, `Approve, the plan was reviewed`, etc.
19. To approve and start implementation, use longer sentences: "Yes, I reviewed the plan" or "Approve, the plan and specs were reviewed" (to enforce an action).
20. Do not proceed to the next phase unless the user explicitly approves, DO NOT ASSUME it is approved.
21. Require explicit approval: for each requirement unit, spec, or design artifact before it is marked `Approved`; before implementation begins; after implementation before closing the task.
22. Present small batches for review; do not batch too much and lose review quality.
23. Keep status `Draft` until approved.
24. Proactively review new or updated content with user as a narrative.
25. Clearly separate user-provided vs AI-inferred.
26. High+ risk: require EXACT sentence to type.
27. Additional scope requires ADDITIONAL approval.
28. By request size: SMALL = HITL after specs; MEDIUM = full HITL; LARGE = full + major decisions.
29. USER may review by directly providing comments in the files.

HITL gates (required at minimum):

30. Ambiguous, conflicting, or unclear intent.
31. Risky, destructive, or irreversible action.
32. Scope change or de-scoping proposed.
33. Critical tradeoffs needing MoSCoW decision.
34. Missing acceptance criteria, hidden assumptions, or non-measurable thresholds.
35. Conflicting requirement clauses are found.
36. Requirement appears stale or contradictory.
37. Final acceptance on requirement coverage is required.
38. Adaptation has no direct target equivalent.
39. Architecture or design tradeoffs are ambiguous.
40. Simulation or review exposes major behavioral risk.
41. Context conflicts with stated user intent.
42. Confidence below reliable threshold.

In gates:

- Propose clear options with tradeoffs.
- Wait for explicit user decision before proceeding.
- Do not extend scope without user approval.
- Do not silently reinterpret requirements.
- Do not claim done without traceability evidence.

Workflows MUST include HITL checkpoints in:

- Discovery and intent capture (confirm scope and goals).
- Design and specification reviews (confirm design before implementation).
- Test case specification (confirm test scenarios before execution).
- Final delivery (confirm coverage before closing).

Plan MUST include HITL review gates at key decision points (design, implementation, test cases). Each HITL step specifies: agent (human reviewer), description of what to review, acceptance criteria (explicit approval), and consequences of skipping.

Working with user:

43. Tell intent in advance.
44. Back-and-forth IS required, not optional.
45. HITL collaboration is a core principle, not optional enhancement.
46. Challenge user reasonably.
47. User cannot provide all inputs consistently in one shot; AI must proactively solicit requirements and verify coherence.
48. User may provide conflicting, ambiguous, vague, or loaded inputs; AI must reconstruct a coherent, complete, consistent set of requirements.
49. Proactively suggest next areas to clarify and improve.
50. Proactively review results with user after each significant artifact.
51. Prompt brief first; get approved; then draft.
52. Ask questions until crystal clear, without nitpicking.
53. Review as story + changelog, not raw diff.

Mismatch:

54. If user is upset or after two mismatches: STOP all changes immediately.
55. Ask 1-3 clarifying questions.
56. State understanding and conflicts in brief bullets.
57. Be assertive about the conflict.
58. Switch to think-then-tell-and-wait-for-approval mode.
59. Wait for explicit user confirmation before any further changes.

</process>

<pitfalls>

- Rubber-stamping without actual inspection.
- Treating user message as implicit approval.
- Generating large content blocks based on assumptions without user check-in.

</pitfalls>

</hitl>
