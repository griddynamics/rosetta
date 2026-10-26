# 12 — Dashboard contract: schema, documents, codegen, staging sweep (Phase D)
Depends on: 07, G2. Parallel with 16 and core tests 08–11. Spec: `S§12` Dashboard bullets 1–4, `S§15`, `S§16` A8/A13; PLAN SC-1/SC-2.

## Do
1. `API_URL=http://localhost:8001/graphql/ pnpm run fetch-local-schema` (verification stack from 07). Review `git diff` of `schema-main.graphql`: declaration-name diff vs HEAD must be exactly the `S§6` additions plus documented patch skew (3.23.39 → local 3.23.41; workspace doc says declaration sets were identical). If other drift appears, restore the file and apply only the `S§6` declarations, logged as deviation.
2. GraphQL documents (this session is their only editor): `Product` fragment `src/fragments/products.ts:215` (+`isAgeRestricted`), `src/fragments/shop.ts` (+`ageRestrictionMinimumAge`, `timeZone`), `CustomerDetails` fragment `src/fragments/customers.ts:151` (+`birthday`, `isAgeEligible`), `me` fragment `src/fragments/auth.ts:24` (+`isSuperuser`), `src/siteSettings/mutations.ts:4` and `src/customers/mutations.ts:4` return selections as needed.
3. `pnpm run generate` (main + staging); commit-ready `src/graphql/*.generated.ts` (working tree only).
4. Staging sweep: run `pnpm run test:quiet src/graphql/lockSchema.test.ts`. If staging validation fails on new selections, add `@lockSchema(schema: "main")` to exactly those selections (never all fields of a fragment; keep `id`), regenerate, re-run; record SC-2 outcome in HANDOFF.
5. Provide 13/14 a typed contract note in `12-handoff.md`: generated type/hook names, which fields can be `undefined` on staging builds.

## Subagents
- `rosetta-light:engineer` — schema + documents + codegen; long-running.
- `rosetta-light:executor` — codegen/test runs; short-term.

## Notes
- `schema.graphql` is a tracked symlink to `schema-main.graphql`; the fetch script writes through it. Do not touch `schema-staging.graphql` or `schema-directives.graphql`.
- `CustomerListDatagrid`/customer list queries must NOT select `isAgeEligible`/`birthday` (audit noise D-1, `S§11`); check which queries reuse `CustomerDetails` before editing the fragment and split if a list query spreads it (unused-field lint: `pnpm run graphql-lint-unused`).
- Mutation input fields (`productUpdate.input.isAgeRestricted`, `UpdateCustomer.input.birthday`) arrive through typed variables, so document validation passes on staging; the risk is only selections.
- After this session no one else runs `generate`; 13/14 file a Cross-scope request if they need a document change.
- Node 24 required by repo scripts; pnpm 11.

## Done when
- `pnpm run generate` clean; `lockSchema.test.ts` green on both schemas; `pnpm run check-types:src` passes with the new generated types in place (UI not yet using them).
- `git diff --stat` limited to §6 row-12 files; declaration-name diff recorded in `12-handoff.md`.

## Checklist
- [ ] STD-ALL  [ ] STD-D
- [ ] Declaration diff = `S§6` only
- [ ] No list query selects `birthday`/`isAgeEligible`
- [ ] SC-2 outcome recorded (gated or not)
- [ ] Generated files untouched by hand
- [ ] Contract note for 13/14 written
