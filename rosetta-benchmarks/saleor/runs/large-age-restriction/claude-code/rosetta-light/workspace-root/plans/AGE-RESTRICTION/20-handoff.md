# 20 — Storefront closeout · handoff (2026-10-23)

**Status: done.** Repo `react-storefront` (HEAD `3d3c3f5`), working tree only, nothing committed. Note: the X-5 file is `src/ui/components/account/account-action-result.ts` (the brief's `src/app/...` path was wrong; HANDOFF register path is correct).

**Done**
- `messages/en.json`: 22 keys added in the file's format and nesting (21 registered by 17/18/19, plus X-5 `account.errors.updateBirthdayFailed`). Other 7 locales untouched; English fallback via merge in `src/i18n/request.ts` and `src/i18n/load-messages.ts`.
- S18 temporary cast and fallback removed: `src/lib/custom/age-restriction-config.ts` reads `t.raw("ageRestriction.{label,neutral,srLabel}")`; deleted `src/lib/custom/age-restriction-copy.ts` and its test (3 tests).
- X-5: `account-action-result.ts` adds `invalidBirthday`, `updateBirthdayFailed`. `account/actions.ts` `updateBirthday` returns only these keys (no core English text). `account/actions.test.ts` updated.
- `src/lib/birthday/*` reviewed, no change needed.
- Docs: `docs/CONTEXT.md` (new "Age-restricted products" section, cart gap wording), `docs/DATA-ARCHITECTURE.md` (fork tag `shop:age-restriction`), `docs/TODO.md` (silent-failure entry reworded, new age-gap entry), `docs/ASSUMPTIONS.md` A5 update, `agents/IMPLEMENTATION.md` workstream entry.

**Evidence**
- `pnpm exec tsc --noEmit` exit 0. A stale git-ignored `tsconfig.tsbuildinfo` gave one false error; deleted (regenerated).
- `pnpm run verify` (`NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8001/graphql/`) exit 0: docs:check, design tokens, graphql variants, data:lock:check (68 calls), core:lock:check, typecheck, lint 0 errors / 19 warnings (S00 baseline 19), vitest 147 files / 953 tests pass (S16 baseline 127 / 787).
- `pnpm run cost:check`: 4 files / 30 tests pass. ESLint and Prettier clean on touched files.

**Decisions**
- S20-D1: birthday action maps core `INVALID` and malformed input to `invalidBirthday` (was core English text / `updateProfileFailed`). Refines S19-D1.
- S20-D2: `t.raw` keeps `{age}` for the badge to fill; avoids next-intl ICU missing-argument errors.
- S20-D3: other locales get no keys (no invented translations); `scripts/sync-messages-checkout-from-en.mjs` deliberately not run (writes other locales).
- `data:lock` not regenerated: `data:lock:check` already matches.

**Blockers**: none.

**Known limitations (open, not closed)**
- X-9: quick-add age CTA has no listing caller (decision pending).
- X-11: contact-step sign-in notice rarely shows (payment step consumes the stash).
- X-13: cart-drawer quantity errors silent (incl. age rejections).
- `/api/auth/register` route still returns English "Invalid birthday."; sign-up form maps the birthday field to the localized key, so the shopper never sees it.
- Not run: Playwright e2e, `next build`, `build:check`, `check:ppr-resume`, `guardrails:canary`, semgrep/CI-only; `knip` is not a gate and is noisy (435 lines, pre-existing).
- ja/ko catalogs were already missing keys vs en (3 and 10); English fallback covers them.
- Coverage not measured (no provider installed).

**Footprint**: no DB, process or container. Logs in `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s20/` (keep).

**Next**: sessions 21/22 review; orchestrator decision on X-9; FU-1 legal review remains open (G3).
