# 05 — Dashboard
Depends on: 04. Parallel with 06. SPECS §3.5, §7.3. Owns `saleor-dashboard/**`.
## Do
1. `schema-main.graphql` ← core schema (D12); `pnpm run generate`.
2. Product update page flag; site settings `minimumAge`/`timeZone`; customer page birthday (superuser only) + eligibility chip; `isSuperuser` in `UserFragment`; customer history handles new event types.
3. Tests (SPECS §7.3), messages extraction, changeset.
## Subagents
- engineer (long); reviewer (short, independent).
## Rules
- Do not run `fetch-local-schema` (symlink overwrites main pin); copy core's generated schema deliberately and diff-review.
- Product flag on update page only (D13). Never display age/date in chip. Birthday sent only if dirty and superuser.
- Strict-mode TS for new files; never hand-edit `*.generated.ts`.
## Done when
- `pnpm test`, `check-types`, `lint:eslint`, `format:check`, `extract-messages`, `knip` green; schema diff = core additions only.
## Checklist
- [ ] Implemented  - [ ] Unit tests  - [ ] Permission gating tested  - [ ] Messages extracted  - [ ] Changeset  - [ ] Reviewed by non-author  - [ ] Handoff written
