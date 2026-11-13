# 15 — Dashboard closeout · handoff (2026-10-23)

**Status: DONE (2026-10-23). Row 15 closed.** Ran under "fully autonomous" (no HITL stops). Nothing committed.

**Done**
- `pnpm run extract-messages`: `locale/defaultMessages.json` +60/-0. 15 new ids, all age/birthday (13: 9 ids, 14: 6 ids). No other churn.
- Changeset `.changeset/age-restriction-dashboard.md`, `"saleor-dashboard": patch` (SC-1). `pnpm run lint:changesets` exit 0.
- `docs/CONTEXT.md`: 3 bullets (Catalog, Customers, Site settings). `agents/IMPLEMENTATION.md`: "Age restriction (dashboard)" entry. `docs/ARCHITECTURE.md` untouched (field-level `@lockSchema` already documented at line 54).
- X-14 and X-15 not changed (see Decisions).

**Gates (exact)**
- `check-types`: exit 0 (tsc + tsc-strict, 4214 strict files).
- `pnpm test` run 1: Jest 6200 passed, 1 failed, 8 skipped (6209). Lint-rules exit 0 (run separately; `pnpm test` only reaches it when Jest passes).
- `pnpm test` run 2: Jest 6199 passed, 2 failed, 8 skipped (6209). Lint-rules exit 0 (run separately).
- Failures: run 1 `src/home/HomeWidgetTabs.test.tsx`; run 2 `ProductVariantMediaSelectDialog.test.tsx`, `ProductTypeDetailsPage.dirtyState.test.tsx`. All are "Exceeded timeout of 5000 ms" under parallel load. Each file passes alone (1/1, and 8/8 for the two). Not in the known list; useMetadataForm and useAnnouncements passed in both runs. Baseline S00: 6132 passed, 2 failed.
- ESLint (no fix) on 57 changed .ts/.tsx: 0 errors, 144 warnings. 16 warnings sit on lines this change added, all in session 13 test files (13 explicit-function-return-type, 3 no-non-null-assertion). The rest are pre-existing.
- `format:check`: only `agents/MEMORY.md` (baseline; not edited). Changeset, docs and locale are prettier clean.
- `knip`: exit 0, empty report. `lockSchema.test.ts`: 7/7.
- Not run: Storybook, Chromatic, Playwright e2e, browser walk-through.

**Decisions**
- X-15 stays a limitation. The anchor needs `hashes.ts` and a `store.ts` catalog entry (in `src/configuration/**`) plus `id={settingsHashes.storeAgeRestriction}` on the section in `SiteSettingsPage.tsx`. The last file is session 13's, outside the area you named. A partial change would leave a catalog href with no DOM id, which the hashes.ts contract forbids.
- X-14 stays a limitation. `CustomerAgeCard` maps birthday INVALID itself and is the only birthday consumer, so the mapper's wrong copy is not reachable in the UI. A mapper branch would duplicate the `QpoMoy` definition in `utils/errors/account.ts`.

**Blockers / next**
- None. Remaining: 21, 22, 23; G3 open.
- Known limitations: X-14, X-15 (no owner assigned). 16 warnings on session 13 test lines are optional cleanup.

**Evidence:** `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s15/` (`check-types.log`, `test.log`, `test2.log`, `lint-rules.log`, `eslint.json`, `knip.log`, `format-check.log`, `lockschema.log`).
