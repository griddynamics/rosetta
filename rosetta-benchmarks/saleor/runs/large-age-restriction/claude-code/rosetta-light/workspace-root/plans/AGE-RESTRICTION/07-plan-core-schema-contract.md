# 07 — Core schema contract + verification stack (Phase C)
Depends on: 02, 03, 04, 05. Runs alone w.r.t. `schema.graphql` and the shared env; parallel with 06, 08, 09, 10. Ends with gate G2. Spec: `S§6`, `S§2` NFR-5, `S§15` order.

## Do
1. Regenerate: `uv run --no-sync poe build-schema`; confirm non-empty; `get_graphql_schema | diff` empty afterwards.
2. Contract review vs `S§6`: diff must be additions only (no removed/changed existing lines), each new element described with `Added in Saleor 3.24.`; list new enum values per enum; `birthday` appears only in `AccountInput`, `AccountRegisterInput`, `CustomerInput` (+ inherited `UserCreateInput`) and on `User`; absent from `UserInput`/`StaffInput`, every `*Filter*`/`*Where*`/`*Sort*` input. Summarise in `07-handoff.md` as the G2 packet (counts + the exact new SDL lines).
3. Verification stack (env action E2, after G0): stop :8001 if running; clone dev DB into `saleor_agevalid`; `manage.py migrate` on it; start `uvicorn … --port 8001` (no reload); smoke POST introspection and `{ shop { ageRestrictionMinimumAge } }` anonymously, record base URL in HANDOFF (no tokens).
4. Create validation users on the clone via `manage.py shell` (superuser, staff `MANAGE_USERS`, customer with/without birthday, app token) with generated passwords stored only in the scratchpad; record user roles (not secrets) in HANDOFF.
5. Document the restart procedure and owner in HANDOFF Common issues.

## Subagents
- `rosetta-light:engineer` — schema review + stack bring-up; long-running.
- `rosetta-light:executor` — DB clone/migrate/health checks; short-term.

## Notes
- `poe build-schema` captures stdout into the tracked file: on any error the file is truncated; check `git diff --stat saleor/graphql/schema.graphql` and `git checkout --` it before retrying.
- Do not hand-edit `schema.graphql`. If the diff contains anything not in `S§6`, STOP: it is a defect in 01–05 (Cross-scope request to the owner), not a reason to accept it.
- Enum additions are "dangerous", not "breaking" in GraphQL Inspector (`S§2` NFR-5); `approved-breaking-change` label not expected; Inspector cannot run locally, so this manual additive check is the substitute.
- `CREATE DATABASE … TEMPLATE saleor` fails while the API container holds connections (Option B): use `pg_dump | psql` through `docker exec saleor-benchmark-db-1` instead; both are read-only on `saleor`.
- Storefront traffic guard (`graphql/storefront_traffic.py`) may block anonymous calls if the cloned site settings disable traffic: check `S§`-independent smoke result and record.
- After G2 the stack is frozen; any core code change ⇒ restart :8001 and log.

## Done when
- `schema.graphql` regenerated, diff = additions only, G2 packet written; schema check command empty.
- `http://localhost:8001/graphql/` answers introspection and the shop query from a migrated clone; ledger lists `saleor_agevalid`, process id/port, cleanup commands.

## Checklist
- [ ] STD-ALL
- [ ] Additive-only proven (no `-` lines other than reflow, listed if any)
- [ ] Every `S§6` item present, nothing extra
- [ ] `birthday` absent from filter/sort/where/UserInput
- [ ] Stack documented: start/stop/restart, DB name, port, user roles
- [ ] G2 packet ready for the user
