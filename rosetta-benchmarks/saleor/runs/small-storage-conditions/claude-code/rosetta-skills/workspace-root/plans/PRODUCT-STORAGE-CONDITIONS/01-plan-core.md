# 01 — Core (saleor)
## Do
1. Implement specs §4–§7 core items: model fields + migration `0211`, GraphQL read/create/update/bulk, translations (shared `TranslationInput`), webhook `PRODUCT_FIELDS`, CSV export column, CHANGELOG.
2. Category/collection translate: INVALID if `storageConditions` set.
3. Rebuild `schema.graphql` (`uv run poe build-schema`); apply migration to local DB; restart local API.
4. Tests per specs §8 (core list).
## Subagents
- engineer (short-term): implement. validator (short-term): run tests + queries against restarted API, independent of engineer.
## Notes
- Do not strip/trim stored value. Do not touch search index.
- Start command of local API unknown (WA-06): discover before restart; report if it is not startable.
## Done when
- New pytest cases pass; touched test modules + `make migrations --check` + lint/mypy per `saleor/CLAUDE.md` green.
- Live `product { storageConditions }` and `productUpdate` work on :8000; migration applied.
## Checklist
[ ] Implemented [ ] Unit/API tests added per specs §8 [ ] Edge cases (250/251, `<`, empty) [ ] Backward compatible schema [ ] Lint+types [ ] Docs/CHANGELOG [ ] Ran against live API
