# 22 — Independent review: dashboard + storefront (Phase F)
Depends on: 15, 20. Parallel with 21. Read-only on code. Spec: `S§12`, `S§1` REQ-VIS, `S§7`, `S§10`, `S§11` I-1/I-4; PLAN SC-1..SC-4.

## Do
1. Input: spec + `git diff`/untracked lists of `saleor-dashboard/` and `react-storefront/`, PLAN §6 rows 12–20.
2. Dashboard: UI role gating vs API truth (UI hides, API enforces), `birthday` sent only when a superuser changed it, no list-query selection of `birthday`/`isAgeEligible`, `@lockSchema` use correct (SC-2) and UI tolerant of `undefined`, `patch` changeset (SC-1), generated files only from codegen, `locale/defaultMessages.json` diff additive, no `Date` conversion of the birthday string, no PII in error tracking/logs.
3. Storefront: REQ-VIS (nothing hidden for any requestor; label only), age from shop setting, extension points respected (SC-3) with lock/`coreOverrides` consistent, add-to-cart errors surfaced for LR/BR/UA, checkout mapping, `me` data uncached, no birthday in URL/log/cache/analytics, copy keys exist in `en.json`, tests are Vitest-node compatible (SC-4) and assert behaviour.
4. Cross-repo contract: every field/enum the clients use exists in `schema.graphql` and was not renamed; clients tolerate old/new API where `S§12` says so.
5. Output: findings (id, severity, file:line, spec ref, owner session) in HANDOFF "Review findings"; `22-handoff.md`.

## Subagents
- `rosetta-light:reviewer` — independent review; long-running. Must not edit product code.

## Notes
- Do not run lint fixers (write in place). Read-only commands only.
- Anything needing a core change is routed to core owners and reopens G2.

## Done when
- Findings list with severity/owner; explicit pass/fail per bullet in Do 2–4.

## Checklist
- [ ] STD-ALL (read-only variant)
- [ ] REQ-VIS audited end to end (no hide paths)
- [ ] Security checked (PII in client logs/analytics/cache)
- [ ] SC-1..SC-4 outcomes verified in code
- [ ] Findings routed to owner sessions
