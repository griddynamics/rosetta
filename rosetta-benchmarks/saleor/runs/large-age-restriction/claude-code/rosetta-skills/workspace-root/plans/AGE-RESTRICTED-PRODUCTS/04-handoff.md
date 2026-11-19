# 04 handoff — core finalize (DONE)
- schema.graphql regenerated (additive only, 0 removed lines; re-run matches); CHANGELOG entry under 3.23.0 GraphQL API.
- Full core: 18372 passed, 1 skipped (baseline 18161). ruff/format clean on 58 changed files (76 pre-existing ruff errors only in .semgrep fixtures); mypy clean (43 src files); deptry ok; semgrep 6 rules/58 files 0 findings; makemigrations --check clean.
- Isolated runtime: DB `saleor_run` in `age-check-db` (:55432), populatedb sample data + superuser (populatedb --createsuperuser defaults), API `uvicorn saleor.asgi:application` on 127.0.0.1:8001 (env inline: DATABASE_URL, SECRET_KEY, DEBUG=True, ALLOWED_HOSTS=*, PUBLIC_URL). Log: scratchpad run-api.log. Dev API :8000 untouched (200).
- Core docs (repo docs/) deferred to session 07.
