# 11 — Core closeout: CHANGELOG, full gates, docs sync (Phase C)
Depends on: 07, 08, 09, 10. Runs alone in core; parallel with 12–20 (other repos). Spec: `S§1` scope list, `S§2` NFR-5/6, `S§11` S-1, `S§8` rollback, `S§16` A1.

## Do
1. `CHANGELOG.md`: new entry covering feature, additive API (list), new error codes (checkout/payment/order enums), migrations (`account 0106`, `product 0211`, `site 0053`), rollback note (reverse migrations drop columns; birthday data lost), S-1 limitation (self-declared birthday, no verification), privacy note (birthday visible to owner + superuser only, audit events retained after user deletion). Section placement per A1: top section is `# 3.23.0` while repo is 3.23.41; follow `S§16 A1` (`# 3.24.0`) unless repo conventions contradict, record the choice.
2. Whole-repo gates on `DB_s11`: full suite `-m "not e2e" -n 8` (compare with S00 failing list; only pre-existing failures allowed), `ruff check saleor` + `ruff format --check saleor`, `mypy` on all changed non-test files, `makemigrations --check --dry-run`, schema gate (`get_graphql_schema | diff`), `deptry .`, `git status uv.lock pyproject.toml` empty, query-count diff vs `bench-base.json`.
3. Manual semgrep review against `.semgrep/` for every changed file.
4. Short in-repo docs sync: `agents/IMPLEMENTATION.md` workstream entry; `docs/CONTEXT.md`/`docs/COMMERCE-CONTEXT.md` one line each for the age-restriction rule and glossary; `docs/ARCHITECTURE.md` only if a new gotcha (SC-5 cache note, retention hook) deserves one line.
5. Resolve collateral test regressions outside earlier owners' scopes (log each).
6. Write `11-handoff.md` + HANDOFF core summary: final file list (`git status --short`), test counts, residual risks.

## Subagents
- `rosetta-light:engineer` — CHANGELOG, docs, triage; long-running.
- `rosetta-light:executor` — full-suite and lint/type runs; long-running.

## Notes
- Full suite ≈ 20–40 min (unverified, see S00 for the real number); run once after all edits are final, again only after fixes.
- CHANGELOG enforcement in CI (`changelog-check.yml`) only checks that the file changed; wording is the human-facing contract (`S§17`: no docs-site edits).
- Do not regenerate `schema.graphql` here unless the check fails; if it fails, a B session changed API after 07 ⇒ stop and reopen 07/G2.
- `git status` must show only files from PLAN §6 rows 01–11 plus new test files.

## Done when
- Full suite = baseline failures only; lint/type/migration/schema gates clean; CHANGELOG + docs entries present; file list reviewed against §6 with zero strays.

## Checklist
- [ ] STD-ALL  [ ] STD-C
- [ ] Unit + integration coverage of new modules > 85 % (report numbers)
- [ ] Documents updated (CHANGELOG, agents/IMPLEMENTATION.md, docs refs)
- [ ] Query-count diff recorded (TC-P-01/02)
- [ ] CI-only checks listed in handoff as not run locally (Inspector, semgrep, migrations-compat)
- [ ] Migration/rollback and S-1 limitation documented
