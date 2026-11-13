# 13 — Dashboard: product age toggle + shop age settings (Phase D)
Depends on: 12. Parallel with 14, 17, 18, 19. Spec: `S§12` Dashboard (Product flag, Shop settings), `S§13` Dashboard tests (product toggle, SiteSettingsPage), `S§10` shop `INVALID`.

## Do
1. Product flag: `ProductUpdateFormData.isAgeRestricted` (`src/products/components/ProductUpdatePage/types.ts:39`), init in `src/products/utils/data.ts` (~:209), submit in `src/products/views/ProductUpdate/handlers/utils.ts`, toggle in `src/products/components/ProductOrganization/ProductOrganization.tsx`. Create flow stays minimal (default false, `createMinimalProduct.ts` untouched, A13).
2. Shop settings: new "Age restriction" `SettingsSection` in `src/siteSettings/components/SiteSettingsPage/SiteSettingsPage.tsx` (int 1..120 + time-zone select), messages in the same dir's `messages.ts`, wiring in `src/siteSettings/views/index.tsx`; server errors via the existing `shop` error mapper (`INVALID` on `ageRestrictionMinimumAge`/`timeZone`).
3. Tests: `handlers/utils.test.ts` (toggle ↔ `productUpdate` input), `SiteSettingsPage.test.tsx` (validation + submit payload), any `ProductOrganization` test following neighbours.
4. Register new i18n message ids/default text in `HANDOFF.md` (do NOT run `extract-messages`).

## Subagents
- `rosetta-light:engineer` — implement + tests; long-running.

## Notes
- Do not run `generate`/`fetch-local-schema`; consume generated types from 12. If `isAgeRestricted`/`ageRestrictionMinimumAge` is `undefined` (staging build, SC-2) the toggle/section renders disabled or hidden, not broken.
- Product flag is NOT a permission-gated UI beyond existing product edit permission; `timeZone` read needs `MANAGE_SETTINGS` — the settings page already requires it.
- Time-zone list: native `Intl.supportedValuesOf("timeZone")` (no new dependency, `S§15`); server remains the source of validity; guard for runtimes lacking the API.
- Use named effects/styles (`lint/rules`: `named-styles` is an error); new files must pass `tsc-strict`.
- Shop is an Apollo singleton (`Shop` cache type policy): after mutation the cache update must reflect new values without refetch weirdness; test the view wiring.

## Done when
- Changed-file `tsc` (`pnpm run check-types:src`), ESLint, Prettier clean; new/updated tests pass (`pnpm run test:quiet <paths>`); manual note of the final form behaviour in `13-handoff.md`.

## Checklist
- [ ] STD-ALL  [ ] STD-D
- [ ] Toggle round-trips through `productUpdate` input (true and false)
- [ ] Settings validation: 0, 1, 120, 121, empty, non-integer
- [ ] Unit/integration coverage of changed lines > 85 %
- [ ] Message ids registered for 15
- [ ] Permission/accessibility: labels, `data-test-id` per repo convention
