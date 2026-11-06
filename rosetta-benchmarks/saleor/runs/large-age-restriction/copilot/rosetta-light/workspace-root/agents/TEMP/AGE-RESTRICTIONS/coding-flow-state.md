# coding-flow state — AGE-RESTRICTIONS

Feature: age-restricted products (core + dashboard + storefront). Size: MEDIUM (cross-service). HITL: on.
Plan folder: `plans/AGE-RESTRICTIONS/`.

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | prerequisites | done (orchestrator) | design decisions D1–D10 approved by user ("Yes, I reviewed the design") |
| 1 | solution_design (architect) | done — rev 5 | created 2026-11-05; rev 2 = review findings; rev 3 = D1c/INV-1 (flag gates purchase only; restricted products stay visible + labelled on cards, PDP, cart, checkout; never hidden by any query/filter/visibility/availability/UI) |
| 2 | review_plan (reviewer) | done — 5 findings, all resolved in rev 2 | see `plans/AGE-RESTRICTIONS/HANDOFF.md` "Review findings" |
| 3 | user_review_design (HITL G1) | done — approved 2026-11-05 ("Approve, the design and specs were reviewed"), accepted as G1 per user's explicit instruction | covers R1–R10 (R4 revised), D1c/INV-1, OQ-1 resolved (public display-only `minimumAge`; `timeZone` MANAGE_SETTINGS-only) |
| 4 | implementation S1→(S2∥S3∥S4) | not started | G2 before local migrate / schema refresh |
| 5 | review_code | not started | |
| 6 | tests T1∥T2∥T3 | not started | |
| 7 | review_tests | not started | |
| 8 | final_validation V1 | not started | then G3 |

Open: implementation-discovery list (SPECS §10, incl. absent-vs-null input detection). Resolved: R1–R10, OQ-1. Applied rev 5: D6c birthday clearing (omission = no change; clear only via `clearBirthday: true`; ambiguous inputs rejected, no write/audit) — SPECS §4 write matrix, §7 T8–T13. Next: phase 4 S1 (then G2 before S3/S4).
Side effects so far: created `plans/AGE-RESTRICTIONS/` and `agents/TEMP/AGE-RESTRICTIONS/` with 5 markdown files; revs 2–5 edited only those files; no source, DB, service, or schema changes. Code not implemented.
