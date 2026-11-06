# TODO (workspace registry)

Purpose: cross-repo work items: things that need changes or decisions in more than one repo, or in the shared local runtime.
Content: open items only; repo-only items stay in each repo's `docs/TODO.md` (indexed below, not copied). Close an item by deleting it and noting the outcome in `../agents/IMPLEMENTATION.md`.
Style: header `### P<1-3> | <when> | <what> | <where>` (P1 = blocks correct work, P3 = cleanup); body 1-3 bullets with details and links. Grep by `### P`.

## Template
### P? | <when: now / Phase 8 / when touching X> | <what> | <where (workspace-relative)>
- <details, evidence, link to ASSUMPTIONS entry>

## Open
### P2 | Phase 8 | Decide storefront webhook signing: support JWS or require `secretKey`/Bearer header | react-storefront/src/lib/api-auth.ts, saleor webhook config
- Core default signature is JWS; storefront checks HMAC hex only. See `ASSUMPTIONS.md` WA-01 and storefront A12.

### P2 | Phase 8 | Record the local stack recipe (API container start, dashboard `API_URL`, worker, role of `saleor-benchmark-saleor-1`) | docs/ARCHITECTURE.md `## Local runtime`, README.md
- Today only inferred from container labels and `logs/`. See WA-05, WA-06, WA-08.

### P2 | Phase 8 | Confirm local core provisioning for the storefront (channel, app token, payment apps, revalidate webhook) | saleor data, react-storefront env
- See WA-07. Without it checkout/payment and instant freshness cannot be tested end to end.

### P3 | When bumping the core release line | Re-pin dashboard schema and re-run storefront codegen together | saleor-dashboard/schema-main.graphql, saleor-dashboard/package.json `config.saleor.schemaVersion`, react-storefront `generate:all`
- Dashboard pins 3.23; storefront follows the live API. See WA-02, WA-03.

### P3 | Before `fetch-local-schema` in dashboard | It overwrites `schema-main.graphql` through the `schema.graphql` symlink | saleor-dashboard/schema.graphql
- Restore the stable pin (`fetch-schema:main`) if the local core is ahead of the release line.

### P3 | Phase 8 | Verify dashboard UI permission gates against core enforcement | saleor-dashboard/src (SectionRoute), saleor/saleor/graphql
- Repo item: `../saleor-dashboard/docs/ASSUMPTIONS.md` "UI permission gates mirror the API's enforcement".

### P3 | Phase 8 | Settle shared glossary ownership across repos | docs/CONTEXT.md `## Term owners`, saleor/docs/agents/domain.md, saleor-dashboard/CONTEXT.md
- See WA-09, saleor A-01 (resolved: `saleor/docs/CONTEXT.md`), dashboard TODO "Propose glossary terms".

## Repo TODO index (links only)
- `../saleor/docs/TODO.md`, `../saleor-dashboard/docs/TODO.md`, `../react-storefront/docs/TODO.md`.
