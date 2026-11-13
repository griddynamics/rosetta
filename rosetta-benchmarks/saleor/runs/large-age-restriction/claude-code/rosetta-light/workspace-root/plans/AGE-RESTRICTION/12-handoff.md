# 12 — Dashboard contract · handoff (2026-10-23)

**Status: DONE (2026-10-23). Row 12 closed. `check-types:src` exit 0 after the mock/fixture edits approved as deviation S12-D1.**

**Done**
- `schema-main.graphql` regenerated via `fetch-local-schema` from :8001. Raw diff +124/-0; every added line is an S§6 declaration or its `Added in Saleor 3.24.` description. No other drift (HEAD declarations match local 3.23.41 output).
- Documents: `Product` +`isAgeRestricted`; `Shop` +`ageRestrictionMinimumAge`, `timeZone`; `CustomerDetails` +`birthday`, `isAgeEligible`; `User` +`isSuperuser`. `siteSettings/mutations.ts` and `customers/mutations.ts` spread `...Shop`/`...CustomerDetails`, so they pick up the fields with no edit.
- `pnpm run generate` (main + staging) exit 0. Staging generated files unchanged in git.
- SC-2 outcome: staging sweep failed on 7 documents (CustomerDetails, UpdateCustomer, UserDetails, Login, ProductDetails, SiteSettings, ShopSettingsUpdate). Fixed with `@lockSchema(schema: "main")` on the 6 new selections only. `id` and other fields untouched. `lockSchema.test.ts` 7/7 green.
- No list query selects `birthday`/`isAgeEligible`: only `customerDetails` query and `updateCustomer` mutation spread `CustomerDetails`; list uses `Customer`.
- `graphql-lint-unused`: no finding on the new selections (37 pre-existing). ESLint and Prettier on the 4 changed fragments: 0 errors, 0 format diffs.
- Jest: 41 suites / 299 tests on fragment consumers (auth, siteSettings, customers, products, attributes, configuration, modeling) pass.

**Check-types blocker (resolved by S12-D1)**
- Before the edits: 17 files (tests, fixtures, stories, all outside §6) built objects typed as `UserFragment`, `ProductFragment`, `ShopFragment`, `CustomerDetailsFragment` without the new required keys. Type-only: Jest passed.
- Orchestrator approved mechanical edits (fully autonomous). Added only the required keys, no logic changes: `isSuperuser: false`, `isAgeRestricted: false`, `ageRestrictionMinimumAge: 18`, `timeZone: "UTC"`, `birthday: null`, `isAgeEligible: null`. Full file list in `HANDOFF.md` deviation S12-D1.
- Verification after edits: `check-types:src` exit 0 (tsc + tsc-strict, 4205 strict files); 164 related Jest suites / 1166 tests pass; prettier clean on 21 touched files; eslint 0 errors (57 pre-existing warnings); `git status` = 27 intended files.

**Contract note for 13/14**
- Hook names unchanged, served by main hooks for both schemas: `useSiteSettingsQuery`, `useShopSettingsUpdateMutation`, `useProductDetailsQuery`, `useCustomerDetailsQuery`, `useUpdateCustomerMutation`, `useUserDetailsQuery`, `useLoginMutation`. Types: `ShopFragment`, `ProductFragment`, `CustomerDetailsFragment`, `UserFragment`.
- May be `undefined` on staging builds (locked to main): `Product.isAgeRestricted`, `Shop.ageRestrictionMinimumAge`, `Shop.timeZone`, `User.birthday`, `User.isAgeEligible`, `User.isSuperuser`. Main types declare the first three non-null; guard reads behind `isMainSchema()`.
- Value shapes: `birthday: string | null` (`YYYY-MM-DD`); `isAgeEligible: boolean | null` (null = not visible); `isSuperuser: boolean | null` (owner only). `Shop.timeZone` needs MANAGE_SETTINGS; only the site-settings page queries `shop` with it.
- Inputs (`InputMaybe`): `ProductInput.isAgeRestricted`, `ShopSettingsInput.{ageRestrictionMinimumAge,timeZone}`, `CustomerInput.birthday`. Send `birthday` only when a superuser changed it (S§12).
- `productUpdate` result selection lives in `src/products/` (13). Add `isAgeRestricted` there if the form must refresh from the mutation response.

**Decisions**
- Lock only the 6 new selections, not whole fragments. `fabbrica*.generated.ts` changed by codegen (test factories typed from fragments); covered by §6 `src/graphql/**/*.generated.ts`.
- Scope check: `git status` shows only the §6 row-12 files plus generated output. `schema.graphql` symlink untouched.

**Next**
- Sessions 13/14: the 17 mock files are already updated (S12-D1). Add the same keys to any new mock typed as these fragments. No open blockers from 12.

**Evidence:** logs in `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s12/` (`generate.log`, `check-types.log`, `jest.log`, `tsc-strict.log`, `unused-after.txt`); pre-change schema backup `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s12/schema-main.head.graphql`.
