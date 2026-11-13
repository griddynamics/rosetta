# 02 — Dashboard (saleor-dashboard)
Depends on: 01.
## Do
1. Refresh schema via `fetch-local-schema`; `pnpm run generate`.
2. Input on product create + update pages (250 limit); update payload; translations page field. Changeset.
3. Tests per specs §8 (dashboard list).
## Subagents
- engineer (short-term).
## Notes
- `schema.graphql` is a symlink to `schema-main.graphql`; refresh edit approved by user (A1). Review the schema diff: it must contain only the new field, no unrelated drift; if drift appears → stop, ask.
- Send field in update only when changed (match seo handling).
## Done when
- Jest for touched areas + full lint + `tsc` pass; generated files committed state consistent.
## Checklist
[ ] Implemented [ ] Unit tests [ ] 250-limit [ ] Schema diff clean [ ] Lint/tsc [ ] Changeset [ ] Docs
