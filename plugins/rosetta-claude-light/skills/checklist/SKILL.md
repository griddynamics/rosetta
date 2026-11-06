---
name: checklist
description: Session self-verification checklist
---

Problem: long-running work may drift, forget requirements, or falsely appear complete.
Solution: create and maintain a checklist as the persistent completion spine, verify at the end.

Key Points:
- Checklist is category and aspect based (mix), it is not a plan.
- By default aimed at AI usage, not for humans.
- Captures source of truth: requirements, acceptance criteria, constraints, non-goals, assumptions, and authoritative references.
- Covers all relevant internal/external factors.
- Categories/aspects must be cumulatively exhaustive; items mutually exclusive where practical.
- Limited only by medium+ findings, not amounts/count. Calibrates severity from impact, risk, and consequences of omission/failure.
- Is created before implementation context biases the analysis.
- Each item contains < 8 words and covers archetype/concept.
- Mix general ("Build: no warnings, no errors", "Absolutely all unit tests pass") and request-specific items
- Checklist has items for result verification and evidence/proofs.
- Precise, non-ambiguous, and temporal wording.
- Author items to be ranked (0 - not started .. 100 - fully completed) by checklist consumer, do not use binary checkboxes.
- Goal is to have high coverage by checklist itself.

Adapt the starter to your context:

1. Generate and store the checklist in a project/feature temporary location. It may be committed for multi-session work.
   - Persist its path and validation instructions through context compaction.

2. MUST keep the checklist synchronized with scope.
   - Add requirements, constraints, dependencies, or risks discovered later.
   - Never silently delete, weaken, merge away, or downgrade existing items. Record the reason for any material change.

3. Before reporting completion, reload the checklist and honestly validate every item against the final state from your existing context.
   - Resolve deviations, then repeat validation.
   - Continue until the implementing agent finds zero unresolved medium+ issues.
   - Keeps cost down.

4. Then spawn a fresh-eye reviewer subagent.
   - Do not prime it with the implementing agent's conclusion.
   - Give it the source of truth, checklist, relevant final state/diff, and validation evidence.
   - It must independently assess:
     - checklist completeness;
     - actual satisfaction of every checklist item;
     - missing medium+ risks based on impact/severity/consequences.
   - It must report findings plus a 0–100% confidence score that the work is complete.
   - Any new medium+ finding must be added to the checklist, resolved, and the validation cycle repeated (from step 3).
   - This is expensive: run only when sure and follow old reviewer if possible (instead of new copy).

5. Terminate successfully only when:
   - implementing agent: zero unresolved medium+ findings;
   - fresh-eye reviewer: zero unresolved medium+ findings;
   - fresh-eye reviewer provides its final confidence score.
   Otherwise continue the cycle or explicitly report unresolved/blocked items instead of declaring completion.
