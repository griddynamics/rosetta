# 19 — Storefront: sign-up birthday + account birthday form (Phase E)
Depends on: 16. Parallel with 17, 18, 13, 14. Spec: `S§12` Storefront (Sign-up, Account bullets), `S§7` (owner write/read), `S§11` privacy note, `S§13` Storefront Vitest list.

## Do
1. `src/ui/components/sign-up-form.tsx`: optional date input; `src/app/api/auth/register/route.ts:82` forwards `birthday` only when provided (to `accountRegister` input).
2. `src/ui/components/account/edit-birthday-form.tsx` (new) rendered from `settings-page.tsx`; server action in `src/app/(storefront)/[locale]/[channel]/(main)/account/actions.ts` calling `AccountUpdate` with `{ birthday }` (clear = `null`), returning success or the `INVALID` error as in neighbouring forms (`edit-name-form.tsx` pattern, `account-action-result.ts`).
3. `CurrentUserProfile` data (from 16) feeds the form's initial value (`birthday`) and eligibility hint (`isAgeEligible`).
4. Vitest `.test.ts` (SC-4): register route forwards `birthday` (and omits it when absent); birthday action success + `INVALID` mapping; form default/validation helpers pure.
5. Register message keys in HANDOFF; no `messages/en.json` edits.

## Subagents
- `rosetta-light:engineer` — implement + tests; long-running.

## Notes
- Date handling as `YYYY-MM-DD` strings; never `new Date(...)` round-trips (TZ day shift).
- `me`/birthday data is per-user: no shared or tagged caches, no URL/query-string/localStorage/analytics/log exposure (`S§11`). Server actions must not `console.log` inputs or error payloads containing the value.
- BFF routes hold tokens in httpOnly cookies; keep that boundary (`docs/ARCHITECTURE.md` `## Auth (BFF)`).
- Registration from checkout (`registerCheckoutAccount` in `(checkout)/actions.ts`) is S17's file and out of spec for birthday.
- Server-side validation is authoritative (future/>120y rejected by core); client constraint only a hint.
- Use `pnpm exec tsc --noEmit`, not `pnpm run typecheck`.

## Done when
- Changed-file `tsc`, ESLint, Prettier clean; new tests pass; behaviour note (set, change, clear, invalid) in `19-handoff.md`.

## Checklist
- [ ] STD-ALL  [ ] STD-E
- [ ] Birthday optional at sign-up; absent ⇒ key omitted
- [ ] Account form: set / change / clear / invalid
- [ ] No PII in logs, URLs, caches
- [ ] Message keys registered
- [ ] Unit coverage of new logic > 85 %
