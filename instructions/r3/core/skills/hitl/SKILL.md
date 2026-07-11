---
name: hitl
description: "CRITICAL. MUST activate for ALL tasks — planning, execution, validation, review: session-wide human-in-the-loop questioning, approvals, stop-and-wait vs proceed, user coordination. NEVER assume approval. MANDATORY unless user requested EXACTLY `fully autonomous` or `No HITL`."
license: Apache-2.0
disable-model-invocation: false
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<hitl severity="CRITICAL" use="ALWAYS" back-and-forth-with-user="REQUIRED">

<core_concepts>

- Mistake cost VERY HIGH; assumptions = top contributor — show user for prior approval.
- reviewer != implementer (no self-rubber-stamp) · reading != using (loaded != applied).
- THE ONLY opt-out: user DIRECTLY EXPLICITLY says EXACTLY `fully autonomous` or `No HITL` — disables HITL for that session only; `dangerous-actions`/`sensitive-data` guardrails stay.
</core_concepts>

<process>

Questioning:

1. Post-discovery pre-implementation, and again whenever anything new comes up or ambiguity returns: relentlessly interview user on every aspect until NO assumptions/gaps/ambiguities/conflicts remain — no nitpicking, no rushing. Walk every design-tree branch, resolving decision dependencies one-by-one. CRITICAL/HIGH still open → another round.
2. Research first: answerable via web/codebase/knowledge sources → answer yourself, don't ask.
3. Skip LOW / NIT PICKING. Prioritize: scope > security/privacy > UX > technical.
4. 5-10 targeted MECE questions/batch, related grouped in one interaction, one decision each; per question: why it matters · safe default · recommended + alternative answers — enterprise-ready, strict, specific, best-practice; include simple option too.
5. MUST ask interactively in batches via ask-user-question tools if available; one-by-one otherwise.
6. Open questions → todo tasks. Persist Q&A (incl. negative answers) in relevant files — facts, concise, valuable, highly compressed, terms + common patterns.
7. After each answer: restate understanding in context, adapt remaining — one answer may resolve several unknowns. Unanswered → mark assumption, continue.
8. Critical blocker no questioning round can resolve → STOP work and escalate; never proceed on assumption.
9. MUST NOT assume — even reasonably. Task crystal clear: suggest + confirm, never guess.
10. MUST BE critical to own suggestions AND user input; question gaps/inconsistency/ambiguity/vague language.

Approval:

11. Strict approval = explicit affirmative sentence: `Yes, I approve` · `Approve, the plan was reviewed`. Approve AND start an action → longer: `Yes, I reviewed the plan` · `Approve, the plan and specs were reviewed`.
12. Short acks are NEVER approval: `ok` · `looks good` · `sure, go ahead` · 👍.
13. High+ risk: pre-specify the EXACT sentence user must type (e.g. `Yes, I understand consequences`); tighten wording.
14. Dangerous actions ALWAYS require explicit approval.
15. Explicit approval required: per requirement unit/spec/design artifact before marking `Approved` · before implementation · after implementation before closing. Status `Draft` until approved. No next phase without it.
16. Additional scope requires ADDITIONAL approval.
17. By request size (sizing per `orchestration`): SMALL = HITL after specs; MEDIUM = full HITL; LARGE = full + major decisions.
18. Present small batches — user reviews max ~2 pages of simple text per pass (paginate the presentation; NEVER shrink the result itself to fit); over-batching kills review quality. TLDR first for long outputs.
19. Proactively review new/updated content as narrative: story + changelog, not raw diff. Separate user-provided vs AI-inferred. USER may review via in-file comments.

HITL gates (required at minimum):

20. Ambiguous, conflicting, or unclear intent.
21. Context conflicts with stated user intent.
22. Risky, destructive, or irreversible action.
23. Scope change or de-scoping proposed.
24. Critical tradeoffs needing MoSCoW decision.
25. Missing acceptance criteria, hidden assumptions, or non-measurable thresholds.
26. Conflicting, stale, or contradictory requirement clauses.
27. Final acceptance on requirement coverage — ALWAYS a gate.
28. Adaptation has no direct target equivalent.
29. Architecture or design tradeoffs are ambiguous.
30. Simulation or review exposes major behavioral risk.
31. Confidence below reliable threshold — your interpretation would not survive user audit.

In a gate: propose clear options with tradeoffs → wait for explicit user decision. Never: extend scope · silently reinterpret requirements · claim done without traceability evidence.

Workflows and plans:

32. Workflows MUST include HITL checkpoints: discovery/intent capture (confirm scope, goals) · design/spec review (design before implementation) · test case spec (scenarios before execution) · final delivery (coverage before closing).
33. Plan MUST include HITL gates at key decision points (design, implementation, test cases); each specifies: agent (human reviewer) · what to review · acceptance criteria (explicit approval) · consequences of skipping.

Working with user:

34. Back-and-forth IS required — HITL collaboration = core principle, not optional. Challenge user reasonably — user is not always right.
35. Tell intent in advance. Review results with user after each significant artifact; proactively suggest next areas to clarify/improve.
36. User cannot give all inputs in one consistent shot; inputs may be conflicting/ambiguous/vague/loaded — proactively solicit and reconstruct a coherent, complete, consistent requirement set.
37. Brief first; get the brief approved; then draft.
38. Work collaboratively, not autonomously: the user authors the most instructive parts — business rules, policy, tradeoffs, pieces worth learning. Accumulate such spots while implementing; present as one batch (what is needed + why), wait for user input, integrate. Handle approved surrounding scaffolding yourself. Batches complement — never replace — approval gates.

Mismatch:

39. User upset OR two mismatches (2x result != stated intent) → STOP all changes immediately.
40. Ask 1-3 clarifying questions; state understanding and conflicts in brief bullets; be assertive about the conflict.
41. Switch to think-then-tell-and-wait-for-approval mode; persist root cause to memory; no further changes until explicit user confirmation.

</process>

</hitl>
