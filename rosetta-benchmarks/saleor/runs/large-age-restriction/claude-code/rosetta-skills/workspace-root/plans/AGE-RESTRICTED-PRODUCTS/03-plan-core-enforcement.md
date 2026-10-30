# 03 — Core enforcement: checkout + drafts
Depends on: 01. Parallel with 02. SPECS §1 (E1–E3), §3.2, §3.3, §3.7, §7.2 (E1/E2/E3 rows).
## Do
1. E1 hooks in `checkoutCreate`, `checkoutLinesAdd`, `checkoutLinesUpdate`, `checkoutCreateFromOrder`.
2. E2 in `complete_checkout()` and `create_order_from_checkout()`, before `assign_checkout_user` and any payment logic.
3. E3: `orderLinesCreate`, `orderLineUpdate`, `draftOrderCreate` (line checks) and `draftOrderComplete` (authority, before email auto-link).
4. Map domain errors to typed GraphQL errors.
5. Tests per SPECS §7.2 including guest-with-matching-email and draft email-only cases.
## Subagents
- engineer (long); reviewer (short, independent) focused on bypass paths.
## Rules
- User = `checkout.user` only; never `info.context.user` for completion decision, never email-linked user (D14).
- Draft "linked customer" = stored `order.user` before `update_user_fields` (D15); email is not a link.
- Skip lines with null variant/product; quantity-0 updates are not checked.
- Enumerate every completion entry point again via code search; any uncovered path = finding, escalate.
## Done when
- §7.2 E1/E2/E3 rows green; payment mocks not called on blocked completion.
## Checklist
- [ ] Implemented  - [ ] Integration tests  - [ ] No extra queries per line (benchmark)  - [ ] Bypass paths reviewed  - [ ] ruff/mypy on touched files  - [ ] Reviewed by non-author  - [ ] Handoff written
