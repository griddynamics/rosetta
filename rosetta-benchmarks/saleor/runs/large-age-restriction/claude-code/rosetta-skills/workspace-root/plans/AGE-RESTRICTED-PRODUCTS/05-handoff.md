# 05 handoff — dashboard (DONE, reviewed)
- schema-main.graphql: additive merge of core declarations only (+120, no deletions; semantic diff vs core empty) — plain copy would add ~3000 lines churn. Fragments use `@lockSchema(schema:"main")`. generate ok.
- UI: product update page checkbox (create unchanged); site settings minimumAge (1-120)/timeZone (Intl list + UTC); customer page birthday only if `isSuperuser===true`, explicit "Clear birthday" (empty/partial input never sends null), chip only with MANAGE_USERS; PERMISSION_DENIED message.
- DEVIATION: no customer history UI exists in dashboard → new CustomerEvents types have no UI (not invented).
- Tests: Jest 6172+ pass; 2 load-flaky tests pass in isolation (AssignedAttributesCard, DropdownRow); pre-existing baseline issues unchanged (useAnnouncements flaky, eslint .snap parse errors, agents/MEMORY.md format).
- Open: staging build ignores the new fields (harmless vs 3.23 API); minimumAge mutation input not @lockSchema'd (staging schema lagging main only).
