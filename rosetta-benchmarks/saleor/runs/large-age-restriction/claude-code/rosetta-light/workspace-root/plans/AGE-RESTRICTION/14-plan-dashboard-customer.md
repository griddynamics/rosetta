# 14 — Dashboard: customer age card + error mapping (Phase D)
Depends on: 12. Parallel with 13, 17, 18, 19. Spec: `S§12` Dashboard (Customer page, Errors), `S§7` matrix, `S§13` Dashboard tests (CustomerAgeCard, saveComposition, errors), OQ-1.

## Do
1. New `src/customers/components/CustomerAgeCard/CustomerAgeCard.tsx` (+ messages, tests) rendered from `CustomerDetailsPage.tsx`: flag Yes/No shown only when `isAgeEligible` is non-null; birthday value + date input shown only when `me.isSuperuser === true` (from the `me` fragment added in 12).
2. `src/customers/mutations.ts` `UpdateCustomer` variables composed in `CustomerDetailsPage/saveComposition.ts`: include `birthday` ONLY when a superuser changed it (strict compare to initial; non-superusers would get `PERMISSION_DENIED`).
3. `src/utils/errors/order.ts`: `AGE_RESTRICTION_NOT_ELIGIBLE` → "Customer is not eligible to buy age-restricted products" (+ new `order.test.ts` if none); birthday `INVALID` uses the existing `account.ts` mapper (verify the field name mapping renders under the card).
4. Tests: `CustomerAgeCard` per role (superuser: date + edit; `MANAGE_USERS` non-superuser: flag only; null: hidden), `saveComposition.test.ts` (omits `birthday` unless changed), errors test, `CustomerDetailsPage.test.tsx` wiring.
5. Register new message ids in `HANDOFF.md` (no `extract-messages`).

## Subagents
- `rosetta-light:engineer` — implement + tests; long-running.

## Notes
- Birthday is a `Date` scalar = `YYYY-MM-DD` string. Never `new Date(birthday)` (TZ shift changes the day) — compare/format as strings; `max` attribute = local today is a hint only, server is authoritative (`validate_birthday`).
- `CustomerListDatagrid` and list queries must not select the flag/birthday (D-1). Confirm 12 did not leak them into list fragments.
- Every `birthday`/`isAgeEligible` read by a non-owner is audited server-side: the details page selects them once per page load; avoid polling/refetch loops on that query.
- No birthday into error tracking/analytics: check `src/services/errorTracking` breadcrumbs and form-state loggers (`docs/error-tracking.md`) do not capture field values for this form.
- `me.isSuperuser` is null for non-owners; treat only `true` as superuser. UI hides, API enforces (workspace ARCHITECTURE `## Permissions`).
- Customer-create page birthday input is out of scope (`S§1`).

## Done when
- Changed-file `tsc`/ESLint/Prettier clean; tests listed pass; `CustomerDetailsPage` renders the three role variants in tests.

## Checklist
- [ ] STD-ALL  [ ] STD-D
- [ ] Role matrix tested (superuser / `MANAGE_USERS` / null flag)
- [ ] `saveComposition` omits `birthday` unless changed (incl. cleared → `null` when changed)
- [ ] No `Date` object conversion on the birthday string
- [ ] Message ids registered for 15
- [ ] Security checked: no PII in logs/analytics; UI gate is not the only gate (documented)
