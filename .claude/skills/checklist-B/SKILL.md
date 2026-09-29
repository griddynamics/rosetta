---
name: checklist
description: Session self-verification checklist
---

Problem: Long-running work may drift, forget requirements, or falsely appear complete.

Solution: Create and maintain a checklist as the persistent completion spine.

1. After discovery/questions are resolved and before implementation, create a category/aspect-based checklist.
   - Capture source of truth: requirements, acceptance criteria, constraints, non-goals, assumptions, and authoritative references.
   - Cover all relevant internal/external factors.
   - Categories/aspects must be cumulatively exhaustive; items mutually exclusive where practical.
   - Include only medium+ findings.
   - Calibrate severity from impact, risk, and consequences of omission/failure.
   - Create before implementation context biases the analysis.
   - Each item contains < 8 words.
   - Each item covers archetype/concept.
   - Mix general ("Build: no warnings, no errors", "Absolutely all unit tests pass") and request-specific items
   - Checklist is not a plan.
   - Checklist has items for result verification.

2. Store the checklist in a project/feature temporary location. It may be committed for multi-session work.
   - Persist its path and validation instructions through context compaction.

3. Keep the checklist synchronized with scope.
   - Add requirements, constraints, dependencies, or risks discovered later.
   - Never silently delete, weaken, merge away, or downgrade existing items. Record the reason for any material change.

4. Before reporting completion, reload the checklist and validate every item against the final state.
   - Resolve deviations, then repeat validation.
   - Continue until the implementing agent finds zero unresolved medium+ issues.

5. Then spawn a fresh-eye reviewer subagent.
   - Do not prime it with the implementing agent's conclusion.
   - Give it the source of truth, checklist, relevant final state/diff, and validation evidence.
   - It must independently assess:
     - checklist completeness;
     - actual satisfaction of every checklist item;
     - missing medium+ risks based on impact/severity/consequences.
   - It must report findings plus a 0–100% confidence score that the work is complete.
   - Any new medium+ finding must be added to the checklist, resolved, and the validation cycle repeated.

6. Terminate successfully only when:
   - implementing agent: zero unresolved medium+ findings;
   - fresh-eye reviewer: zero unresolved medium+ findings;
   - fresh-eye reviewer provides its final confidence score.
   Otherwise continue the cycle or explicitly report unresolved/blocked items instead of declaring completion.