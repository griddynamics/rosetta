# 19 — Storefront: sign-up birthday + account birthday form · handoff (2026-10-23)

**Status: done**, except the message keys (S20 owns `messages/en.json`; 9 keys registered in HANDOFF). Repo `react-storefront` (HEAD `3d3c3f5`), working tree only, nothing committed.

**Done**
- Sign-up: optional date in `src/ui/components/sign-up-form.tsx`; `birthday` key omitted when empty. Route `src/app/api/auth/register/route.ts` checks format only (400 `INVALID`, `field: birthday`) and forwards the value only when present. The call is anonymous (`rawMutation`, auth none), so core accepts it.
- Account: `updateBirthday` server action in `account/actions.ts` (`AccountUpdate` `{ birthday }`). New `src/ui/components/account/edit-birthday-form.tsx` mounted in `settings-page.tsx`: stored date, "set your birthday" prompt when unset, eligibility hint from `isAgeEligible`, edit and remove.
- Helpers (new, pure): `src/lib/birthday/birthday-date.ts`. Strict `YYYY-MM-DD`, calendar check, 120-year and future client hint, eligibility hint, optional key.

**Behaviour (set, change, clear, invalid)**
- Set: valid date stored; `me.birthday` shown as stored, `isAgeEligible` hint shown.
- Change: new date replaces the old one.
- Clear: empty value sends `null`; prompt returns.
- Invalid: malformed date makes no API call and shows `errors.invalidBirthday`. Future or older than 120 years is caught by the client hint; core `INVALID` message is shown if it gets through.

**Evidence**
- Vitest: 4 new files, 38 tests pass (route 8, action 9, helpers, edit-form render). Full `vitest run`: 135 files, 845 passed.
- ESLint on changed files: exit 0. `check-design-tokens`: pass. Prettier: all new and changed files pass, except `settings-page.tsx`, whose failure predates this session (HEAD copy fails the same way). I left that pre-existing line alone.
- `tsc --noEmit`: 13 errors, all `NamespacedMessageKeys` for the 9 new keys until S20 lands. Two `checkout/lib` `GatewayTranslator` errors come from session 17's in-progress `gateway-messages.ts`, not this session.
- Coverage: no coverage provider installed, so not measured. New logic is covered by tests (helpers, route and action branches). Component handlers (submit, remove, sign-up interaction) have no DOM tests (SC-4).

**Decisions**
- S19-D1: `account-action-result.ts` has no §6 owner, so no new error keys. INVALID passes the core message (generic "Invalid birthday.", as in neighbouring forms). Other failures use `updateProfileFailed`. Localized keys need the cross-scope request X-5.
- Route and action check format only. Range (future, over 120 years) is client hint plus core authority.
- Date stays a string end to end and is shown as stored. `new Date()` is used only for "today" in the client hint, inside event handlers.
- No logging in new paths (tests assert no console calls). Errors never echo the submitted value.
- New files outside the §6 rows: `src/lib/birthday/*`, `src/app/api/auth/register/route.test.ts`, `account/actions.test.ts`, `account/edit-birthday-form.test.ts`. No session owns `src/lib/`; orchestrator to confirm.

**Blockers / next**
- X-5 (open): `account-action-result.ts` add `invalidBirthday`, `updateBirthdayFailed`.
- S20: add the 9 keys to `messages/en.json` (HANDOFF register). Then `tsc` should be clean for these files.
- S22 review focus: birthday in new paths only (`route.ts`, `actions.ts`, `edit-birthday-form.tsx`, `sign-up-form.tsx`); no logs, URLs, or caches.
