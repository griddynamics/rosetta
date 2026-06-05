# Step 9 Escalation Note Template — aqa-test-debugging

Loaded on demand from `SKILL.md` step 9 when the 3-iteration cap is reached **and failures remain**. Part A and the iteration-cap rule live in `SKILL.md` (the always-loaded surface); this template is the verbatim escalation-note text written into the analysis artifact's `## Escalation` section AND `agents/aqa-state.md`.

---

## Escalation note (verbatim — copy into both locations)

```
Escalation: 3-iteration cap reached with N failure(s) remaining.

Likely cause:
  - application defect under test (Application Bug category dominates per the canonical taxonomy in step 3), OR
  - fundamental test-spec mismatch (Assertion-failure / Setup-data patterns persist across iterations).

Recommended next steps (the user picks one):
  - Surface remaining failures as application defects to the product team (do NOT continue patching tests around them).
  - Revisit Phase 2 (Requirements Clarification) to verify the test plan's assertions match current API/UI behavior.
  - User decides whether to continue with a 4th iteration under explicit waiver.
```

After writing the note, ask the user how to proceed. Governance of the 4th-iteration / waiver rule lives in `SKILL.md` step 9 — not restated here.
