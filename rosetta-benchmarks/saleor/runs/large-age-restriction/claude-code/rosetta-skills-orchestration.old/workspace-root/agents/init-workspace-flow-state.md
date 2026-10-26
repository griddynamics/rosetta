# init-workspace-flow state

- mode: plugin (RUNNING AS A PLUGIN in context; no Rosetta files on disk)
- plugin_active: true
- composite: true (root not git; sub-repos: saleor, saleor-dashboard, react-storefront, each with own docs/ + CLAUDE.md)
- file_count: 6805 source files (saleor 1173 py non-test; dashboard 4803 ts/js; storefront 829 ts/js) (~13k total files excl. .git/node_modules) -> use `large-workspace-handling` in phases 5,7,8
- existing_files: none at root per roster (docs/, agents/, gain.json absent before init)
- gain_json: created (IDEs: claude-code, copilot; SCM+tracker GitHub; other fields placeholders)

## Phases
- 0 prereqs: done (no todo tool available; this file is the ledger)
- 1 context: done
- 2 shells: SKIPPED (plugin mode)
- 3 discovery: DONE 2026-10-21 (3 repos + root registry docs/TECHSTACK|CODEMAP|DEPENDENCIES.md)
- 4 rules: DISABLED
- 5 patterns: SKIPPED (not requested)
- 6 code-graph: DONE 2026-10-21 (user chose CODEMAP only; no LSP/graph config; no CONTEXT.md addition)
- 7 documentation: DONE 2026-10-21 (4 scopes; see gaps)
- 8 questions: DONE 2026-10-21 (answers applied; open assumptions kept in docs: WA-01,02,03,04,07,08,09 etc.)
- 9 verification: DONE 2026-10-21 (audit passed; minor findings remediated)

## Gaps for phase 8
- P3: CODEMAP descriptions in all 3 repos inferred from names, not read from source (saleor headers prefixed `saleor/`)
- P3: saleor/.jwt_key.pem looks like private key, untracked/ignored; user asked if intentional (unanswered)
- P3: saleor-dashboard has root CONTEXT.md glossary (human content; preserve in P7)
- P7 react-storefront DONE (docs/CONTEXT, ARCHITECTURE + DATA-/CHECKOUT-ARCHITECTURE, ASSUMPTIONS A1-A15, TODO; agents/IMPLEMENTATION, MEMORY). Gaps for P8: A1 upstream AI files removed (user will fix failing checks himself; NOT recorded in docs); A5 silent add-to-cart failure; A8 checkout auth skips rate limit; A9 hardcoded `en`; A11/A12 webhook revalidation single-channel + HMAC hex format; A15 stale human docs (README 7 vs 8 locales, ADR 0001/0003, robots.ts); A14 unused code/Adyen; broken /collections link
- P7 saleor-dashboard DONE (docs/CONTEXT 100L, ARCHITECTURE 146L, ASSUMPTIONS, TODO; agents/IMPLEMENTATION, MEMORY). Gaps for P8: new_order_ui flag unused?; customer types GA?; legacy sales vs promotions precedence; staging schema in shipped builds?; API vs UI permission parity (check ../saleor); removed .claude/skills/saleor-dashboard-styles intentional?; EXPIRED/PARTIALLY_RETURNED order status meaning; voucher usage-limit rules. Stale human docs logged in its docs/TODO.md (multi-schema.md runtime vs build-time, TECHSTACK feature-flag count, 3 dead refs, .travis/)
- P7 saleor DONE (11 docs: CONTEXT+COMMERCE/CATALOG/PLATFORM-CONTEXT, ARCHITECTURE+GRAPHQL-/INTEGRATION-ARCHITECTURE, ASSUMPTIONS A-01..A-18, TODO, agents/IMPLEMENTATION, MEMORY). Gaps for P8: A-01 glossary location (docs/agents/domain.md expects root CONTEXT.md); ADR-0004 vs code (gift card update balance_amount + unlocked full save) P1; A-04/A-05 gift card customer restriction on confirm, code suffix in Order.transactionSummaries; A-09 product vs variant visible_in_listings; A-12 staff channel restrictions scope; A-18 order import permission vs export-only; A-10 ADR-0009 lock re-read unverified; .jwt_key.pem question unanswered
- P7 root registry DONE (docs/CONTEXT 54L, ARCHITECTURE 85L, ASSUMPTIONS WA-01..09, TODO; agents/IMPLEMENTATION, MEMORY; README.md). Gaps for P8: WA-01 storefront webhook signing (core JWS vs HMAC hex); WA-06 how API launched/seed.dump restored/dashboard API_URL; WA-07 local core has channel/app token/payment apps/revalidate webhook?; WA-03 storefront API version unrecorded; WA-02/04 schema parity & staging fetch date; WA-05 Celery?; WA-08 mail -> Mailpit?; WA-09 glossary owner; dashboard `fetch-local-schema` overwrites schema-main via symlink

## STATUS: COMPLETE (2026-10-21)
- Deferred gaps: open assumptions in docs/ASSUMPTIONS.md (WA-*), <repo>/docs/ASSUMPTIONS.md; gain.json placeholders (wiki, build mgmt, issue URL, vocabulary)
- Follow-up: start new chat session; shells skipped (plugin mode)
