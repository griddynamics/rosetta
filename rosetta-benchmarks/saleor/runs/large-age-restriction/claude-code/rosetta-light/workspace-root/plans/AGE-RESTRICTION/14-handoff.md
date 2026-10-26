# 14 — Dashboard customer age card · handoff (2026-10-23)

**Status: DONE. Row 14 closed.** Ran under "fully autonomous" (no HITL stops). Nothing committed.

**Done**
- `CustomerAgeCard` (new): flag Yes/No only when `isAgeEligible` is non-null; date input only when `me.isSuperuser === true`; hidden when neither is visible. Sidebar of `CustomerDetailsPage`, after `CustomerInfo`. Reads guarded by `isMainSchema()`.
- `saveComposition.ts` `buildCustomerBirthdayChange`: `{}` unless a superuser changed the date; cleared input sends `null`. Page passes `birthdayChange`; `views/CustomerDetails.tsx` spreads it into `CustomerInput`.
- `hasBirthday` save segment; `src/utils/errors/order.ts` maps `AGE_RESTRICTION_NOT_ELIGIBLE` to fixed copy.

**Evidence**
- Jest `src/customers` + `src/utils/errors`: 18 suites / 127 tests pass (new: `CustomerAgeCard.test.tsx`, `order.test.ts`; extended: `saveComposition.test.ts`, `CustomerDetailsPage.test.tsx`).
- `tsc --noEmit` and `tsc-strict` exit 0. Prettier clean. ESLint 0 errors on 12 files (warnings only on pre-existing lines).
- Scope: git status diff vs baseline shows only owned paths. Session 13 files under `src/products/**` and `src/siteSettings/**` are not 14's.
- List queries do not select the flag or birthday: `CustomerDetails` is spread only in the detail query and `updateCustomer`.

**Decisions**
- `S14-D1`: birthday INVALID uses card copy, not the `account.ts` mapper (it returns the token copy for any non-email `INVALID`). Shared fix tracked as X-14.
- Birthday stays a `YYYY-MM-DD` string; `max` is a local-today hint only.
- Server `PERMISSION_DENIED` on birthday is not expected from the UI (no payload for non-superusers). A server denial uses the existing mutation error path (residual).

**Message register (for 15)**
`l4rwe7` Age verification · `jYDJA5` Eligible for age-restricted products · `qTyhPO` Date of birth · `QpoMoy` Enter a valid date of birth · `MLWtIp` date of birth (save segment) · `+SaxZ3` Customer is not eligible to buy age-restricted products. Ids are formatjs sha512 contenthash, checked against existing ids. `extract-messages` and `locale/defaultMessages.json` untouched.

**Blockers / next**
- No blockers. X-14 (optional) open for the orchestrator. 15 adds these six keys via `extract-messages`, with 13's keys.
