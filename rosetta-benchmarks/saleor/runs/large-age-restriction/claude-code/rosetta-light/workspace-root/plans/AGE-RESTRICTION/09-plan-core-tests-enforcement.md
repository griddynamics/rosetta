# 09 — Core enforcement tests, all completion paths + staff orders (Phase C)
Depends on: 04, 05, 06. Parallel with 07, 08, 10, 12–20. Spec: `S§13` TC-H-01..04, TC-E-01..08, TC-E-11, TC-B-08, TC-B-11, TC-P-01; `S§5` matrix.

## Do
1. Happy paths: adult `checkoutLinesAdd` → `transactionInitialize` → `checkoutComplete`; guest with unrestricted products on all completion paths unchanged (TC-H-01/02).
2. Guest with an adult's email: `checkoutComplete` (both flows), `orderCreateFromCheckout`, auto-completion task, `transactionInitialize` ⇒ `AGE_RESTRICTION_LOGIN_REQUIRED`, no order, no attach-based pass (TC-H-03, TC-E-11).
3. Line-time guards: guest/no-birthday/minor on `checkoutLinesAdd`, `checkoutCreate(lines)`, `checkoutLinesUpdate` qty 2 (LR/BR/UA, `variants` = restricted ids only), qty 0 allowed, `checkoutCreateFromOrder` excludes restricted lines with `unavailableVariants[].code` (TC-E-01..04, TC-B-11).
4. Authority tests with restricted line injected by fixture (bypassing line-time guard): `checkoutComplete` transaction + legacy payment (assert `_process_payment` not called), `orderCreateFromCheckout`, `automatic_checkout_completion_task` (no order, warning logged without values), Stripe webhook path, `transactionInitialize`, `transactionProcess` (TC-E-05).
5. Drafts: no-customer draft create/linesCreate/complete succeed (TC-H-04); linked to `no_bday` ⇒ NOT_ELIGIBLE then passes after unlink or superuser sets adult birthday (TC-E-07); `user_email` = minor's email with no `user` ⇒ blocked (TC-E-08).
6. Drift between add and pay: flag set / min age raised / birthday cleared after line add ⇒ completion blocks (TC-B-08); settings changed between two calls in one process is seen immediately (SC-5).
7. TC-E-06: messages/params/captured logs contain no birthday, age, min age. TC-P-01: extend/compare `graphql/checkout/tests/benchmark` query counts vs S00 baseline json.

## Subagents
- `rosetta-light:engineer` — write tests; long-running.
- `rosetta-light:executor` — run on `DB_s09` (`-n 3`); short-term.

## Notes
- New files only, names per PLAN §6 row 09; reuse 06 fixtures.
- Task/webhook tests must exercise the `site_settings=None` fallback (SC-5): change `age_restriction_minimum_age` via ORM between two completions in the same process and expect the new value to apply.
- Mock only the external seam (payment gateway/plugin manager/webhook HTTP). Do not mock `validate_age_restriction`.
- `automatic_checkout_completion_task` already catches/logs `ValidationError`: assert the logged text via `caplog` has only generic wording.
- Count-query tests must use the same fixtures as baseline benchmarks, otherwise the diff is meaningless.

## Done when
- Each TC id above has a named passing test; `-n0` and `-n 3` green on `DB_s09`; query-count diff shows no change for unrestricted checkouts (numbers in `09-handoff.md`).

## Checklist
- [ ] STD-ALL  [ ] STD-T
- [ ] All 14 rows of `S§5` have ≥1 test; #8/#9 included
- [ ] LR/BR/UA and NE mapping per surface asserted (`S§10`)
- [ ] Security checked: S-2 and T-2 reproduced as failing-before/passing-after logic
- [ ] Integration coverage of changed lines in `checkout/complete_checkout.py` + mutations > 85 %
