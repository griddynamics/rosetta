---
name: hitl
description: "Rosetta CRITICAL MUST skill loaded RIGHT WITH IMPLEMENTATION. Human-in-the-loop collaboration, questioning, approvals, and user coordination. MUST be active for ALL tasks by default — planning, execution, validation, review. THE ONLY exception: user DIRECTLY EXPLICITLY requests with EXACTLY 'fully autonomous' or 'No HITL'. Without explicit opt-out this skill is MANDATORY."
tags: []
baseSchema: docs/schemas/skill.md
---

<hitl>

<core_concepts>

- "WHY" loop: idea → requirements → working software → learn → evolve
- "HOW" loop: specs → code → tests → stories → features
- Human gatekeeps every artifact in HOW loop
- When output is wrong, fix the harness — not the artifact
- Assumptions are the top mistake contributor — show to user for prior approval

</core_concepts>

<process>

Questioning:

1. Ask until assumptions, ambiguities, gaps, conflicts resolved.
2. Skip LOW or NIT PICKING.
3. Prioritize: scope > security/privacy > UX > technical.
4. 5-10 targeted MECE questions per batch.
5. One decision per question.
6. Include why it matters and safe default.
7. Track open questions using todo tasks.
8. Adapt remaining questions after each answer.
9. Mark unanswered as assumption and continue.
10. Persist Q&A in relevant files.
11. STOP and escalate unresolved critical blockers.

Approval:

12. MUST NOT assume approval — user message = review, not approval.
13. Accepted: `Yes, I approve`, `Approve, the plan was reviewed`, etc.
14. Do not proceed without explicit approval.
15. Keep status `Draft` until approved.
16. Clearly separate user-provided vs AI-inferred.
17. High+ risk: require EXACT sentence to type.
18. Additional scope requires ADDITIONAL approval.
19. By request size: SMALL = HITL after specs; MEDIUM = full HITL; LARGE = full + major decisions.

HITL gates (required at minimum):

20. Ambiguous, conflicting, or unclear intent.
21. Risky, destructive, or irreversible action.
22. Scope change or de-scoping proposed.
23. Critical tradeoffs needing MoSCoW decision.
24. Missing acceptance criteria or hidden assumptions.
25. Confidence below reliable threshold.

In gates: propose options with tradeoffs, wait for decision.

Working with user:

26. Tell intent in advance.
27. Back-and-forth IS required, not optional.
28. Challenge user reasonably.
29. Proactively solicit and verify coherence.
30. Prompt brief first; get approved; then draft.
31. Review as story + changelog, not raw diff.

</process>

<pitfalls>

- Rubber-stamping without actual inspection.
- Treating user message as implicit approval.

</pitfalls>

</hitl>
