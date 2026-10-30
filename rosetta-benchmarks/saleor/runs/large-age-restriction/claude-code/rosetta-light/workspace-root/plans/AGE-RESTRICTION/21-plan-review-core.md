# 21 — Independent review: core (Phase F)
Depends on: 11. Parallel with 22. Read-only on code. Spec: all of `S§4–§11`; reviewer must judge the diff against the spec, not against implementer notes.

## Do
1. Input to the reviewer: `AGE-RESTRICTION-SPECS.md`, `git diff` + untracked file list of `saleor/` (from `git status --short`, `git diff`), PLAN §6. Withhold `NN-handoff.md` conclusions until the first pass is written.
2. Trace each `S§11` STRIDE row and `S§7` matrix cell to code + test; report any untested or unimplemented cell.
3. Verify the 14 enforcement rows (`S§5`) by reading hook placement: after `assign_checkout_user`, inside the tx, R6 stored-user semantics, legacy flow before payment, `allow_anonymous` only on staff/order paths, qty-0 removal allowed.
4. Privacy/leak review: every resolver/route that can return `User`; app-first requestor; audit loader single-INSERT and `allow_writer`; no birthday/age/min-age in messages, params, logger calls (semgrep rules `.semgrep/` by hand), webhooks, search, filters, exports.
5. Retention review: `deletion.py` vs Django 5.2.18 `Collector` source, migration `0106` content, paths in `S§9.1`, RK-1/RK-4 docstrings, TC-R tests actually fail without the hook.
6. Data/perf: migration additivity (`db_default`), `sqlmigrate` output, NFR-1/2/3 evidence vs `bench-base.json`, SC-5 handling.
7. Test quality: mock boundaries, assertions on behaviour, TC coverage matrix (every `S§13` id → test name).
8. Output: findings list (id, severity blocker/major/minor, file:line, spec ref, suggested owner session per PLAN §6) appended to HANDOFF "Review findings"; `21-handoff.md`.

## Subagents
- `rosetta-light:reviewer` — independent review; long-running. Must not edit product code.

## Notes
- A finding that changes the GraphQL schema reopens G2 (PLAN §9).
- Treat documentation/handoff claims as untrusted until reproduced from code.
- CI-only checks (Inspector, semgrep, migrations-compat) cannot be confirmed locally: flag as residual, do not mark passed.

## Done when
- Written findings list with severity and owner, TC coverage matrix with zero unexplained gaps, explicit statement per STRIDE ID (covered / residual / accepted per spec).

## Checklist
- [ ] STD-ALL (read-only variant)
- [ ] Spec traceability matrix complete (S§5, S§7, S§11, S§13)
- [ ] Security checked (leak routes, write gates, audit, retention)
- [ ] No-PII-in-logs verified by grep + reading
- [ ] Findings routed to owner sessions
