# AGE-RESTRICTIONS — HANDOFF (index)

## Status
- 2026-11-05: phase 1 (solution design) DRAFT complete. No code changed.
- 2026-11-05: phase 2 independent review done; rev 2 resolved all 5 findings (see "Review findings"). Still draft at that point; code NOT implemented.
- Artifacts: `architecture-notes.md`, `AGE-RESTRICTIONS-SPECS.md`, `AGE-RESTRICTIONS-PLAN.md`; flow state `agents/TEMP/AGE-RESTRICTIONS/coding-flow-state.md`.
- 2026-11-05: rev 3 applied user-approved D1c / INV-1 visibility invariant. Code NOT implemented.
- 2026-11-05: rev 4 resolved OQ-1 (public display-only `minimumAge`); G1 approved. Code NOT implemented.
- 2026-11-05: rev 5 applied user-approved D6c birthday-clearing contract. Code NOT implemented.

## Review findings (phase 2) — resolved in rev 2
1. SF error mapping: checkout never queries birthday; guest → sign-in CTA, authenticated → generic + account-settings link (SPECS §6, §7; PLAN S4).
2. Dashboard: `CreateProductDialog` is name/type-only; `ageRestricted` on `ProductUpdatePage` only; unrendered `ProductCreatePage` dir not a target (notes §1; SPECS §7, §11; PLAN S3).
3. Payment gateway initialize path corrected to `saleor/saleor/graphql/payment/mutations/transaction/payment_gateway_initialize.py`; sibling paths re-verified (notes §1).
4. Optional `ProductView.ageRestricted` ⇒ no `STOREFRONT_CONTRACT_VERSION` bump (`version.ts:4-8`) (notes §1; SPECS §10, §11; PLAN S4).
5. Superuser birthday audit rows on actor's event history, target id value-free in parameters; no customer-timeline promise (SPECS §4, §5, §7; PLAN S1, V1).

## Next-session pointer
G1 done → S1 Core foundation (PLAN §7). G2 needed before S3/S4.

## Blockers
- None for review. G2 (local migrations, API restart, dashboard schema pin overwrite) must be approved before S3/S4 can run.

## Decisions
- Approved: D1–D10 (SPECS §1.2, user "Yes, I reviewed the design").
- Approved 2026-11-05: D1c / INV-1 — flag affects purchase eligibility only; restricted products remain visible in every catalogue surface (cards, PDP, cart, checkout) with an age label; no query, filter, visibility, availability, or client UI hides them by the flag (user: "Approve, the design and specs were reviewed"). Applied in notes §3, SPECS §0/§1.2/§4/§5/§7/§12, PLAN §2/S1/S2/S4/T/V1/§8/§9.
- Resolved 2026-11-05 OQ-1: label `"{minimumAge}+"` (e.g. `18+`); `Shop.minimumAge` public display-only — exposes no birthday, eligibility, or customer data; never a client authorization input. `Shop.timeZone` MANAGE_SETTINGS-only. R4 revised accordingly (SPECS §4, §7, §8, §10).
- G1 approved 2026-11-05 on user's explicit sentence "Approve, the design and specs were reviewed": R1–R10 (R4 revised), D1c, OQ-1.
- Approved 2026-11-05 D6c birthday clearing: omission = no change; clear only via explicit `clearBirthday: true` (`accountUpdate`, `customerBirthdayUpdate`); ambiguous inputs (explicit `null`, date + clear, null flag, empty superuser call) rejected `INVALID`, no write, no audit; accepted set/clear → one value-free `BIRTHDAY_UPDATED` with `operation`. Applied: notes §3; SPECS §1.2, §4 write matrix, §5, §6, §7 T8–T13 + SF, §8, §10, §12; PLAN §2, S1, S4, T1/T3, V1, §8, §9.

## Deferred / implementation-discovery
SPECS §10 list (ADDED_IN constant, payment error enum names, IANA CharField length, `orderLinesCreate` editable statuses, test file names, `ProductUpdatePage` card placement, SF view models/i18n keys, SF locks). Contract version bump: resolved (none).

## Sessions
| Session | Status | Evidence |
|---|---|---|
| S1 Core foundation | not started | — |
| S2 Core enforcement | not started | — |
| S3 Dashboard | not started | — |
| S4 Storefront | not started | — |
| T1/T2/T3 Tests | not started | — |
| V1 Validation | not started | — |

## Common issues / solutions
- Discovery summaries cited by orchestrator were absent; facts re-verified in source (`architecture-notes.md §1`).
- Compare schemas by declaration name, not raw diff (`agents/MEMORY.md`).
