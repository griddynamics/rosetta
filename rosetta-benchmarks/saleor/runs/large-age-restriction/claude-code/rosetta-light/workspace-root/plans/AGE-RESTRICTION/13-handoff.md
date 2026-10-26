# 13 — Dashboard product flag + shop age settings · handoff (2026-10-23)

**Status: DONE (2026-10-23). Row 13 closed. Edits limited to §6 row 13 (`src/products/**`, `src/siteSettings/{components,views}/**`) plus new tests in those dirs.**

**Done**
- Product: `isAgeRestricted` in form data, init, changed-only submit (`isMainSchema()` guard). "Age restricted" toggle + hint + API error in `ProductOrganization.tsx`, wired from `ProductUpdatePage.tsx` on main schema only. Create flow untouched (A13).
- Shop: "Age restriction" section (minimum age 1..120 number input, time-zone `Select`) in `SiteSettingsPage.tsx`; helpers in `ageRestriction.ts`, fields in `AgeRestrictionFields.tsx`; `views/index.tsx` sends the two keys only on main schema.
- Server `INVALID` on `ageRestrictionMinimumAge` / `timeZone` shown via `getShopErrorMessage`.
- Jest: 31 suites / 223 tests green. New: `handlers/utils.stagingSchema.test.ts`, `SiteSettingsPage.stagingSchema.test.tsx`, `ageRestriction.test.ts`, `views/index.test.tsx`.

**Evidence** (scratchpad `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s13-*.log`)
- `check-types:src` exit 0 (tsc + tsc-strict). ESLint on 19 changed/new files: 0 errors. Prettier `--check` clean. `formatjs/enforce-id` passes for 9 new ids.
- Coverage: `ageRestriction.ts` and `AgeRestrictionFields.tsx` 100 %; new lines in `SiteSettingsPage.tsx`, `ProductOrganization.tsx` covered; `views/index.tsx` 91.7 %.
- `:8001` introspection (read-only, no auth): `ShopSettingsInput.{ageRestrictionMinimumAge,timeZone}`, `ProductInput.isAgeRestricted`, `Shop.{ageRestrictionMinimumAge,timeZone}` present. No mutation sent.

**Decisions**
- S13-D1: age section has no `settingsHashes` anchor; carries `data-test-id="age-restriction-settings"` (see HANDOFF).
- Client range check mirrors S§10 (trimmed whole number 1..120); server stays the source of validity. Save disabled while invalid; `onSubmit` guards Enter-key submit.
- `isAgeRestricted` added to `PRODUCT_DETAILS_SAVE_FIELDS` (not in plan): otherwise a flag-only edit leaves Save disabled.
- Time zones: `UTC` + `Intl.supportedValuesOf("timeZone")` + current value; without the API only `UTC` + current.

**Blockers**
- None for 13. X-9 (settings hash + catalog entry) needs an owner; the section works without it.
- Not verified: browser walk-through; Apollo `Shop` cache after save (only mutation variables asserted).

**Next**
- 15: `extract-messages` for the 9 keys in HANDOFF register; patch changeset (SC-1).
- X-9 owner decision.
