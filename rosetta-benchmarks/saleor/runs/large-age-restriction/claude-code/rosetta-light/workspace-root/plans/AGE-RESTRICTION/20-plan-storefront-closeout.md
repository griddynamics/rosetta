# 20 — Storefront closeout: messages, locks, verify (Phase E)
Depends on: 17, 18, 19. Parallel with 15, 11. Spec: `S§12` Copy bullet (`messages/en.json`, other locales fall back, A9).

## Do
1. Insert the message keys registered by 17–19 into `messages/en.json` (existing namespaces `cart`, `pdp`, `plp`, `search`, `account`, `checkout`); match key usage in code (`grep` every `t("…")` added in the diff); other locales untouched (fallback `src/i18n/merge-messages.ts:9`).
2. Locks: `pnpm run data:lock` then `data:lock:check`, `core:lock:check`; reconcile `paper-version.json` `coreOverrides` if any hashed file changed (SC-3).
3. Gates with `NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8001/graphql/`: `pnpm run verify` (docs:check, tokens, variants, locks, typecheck, lint, tests), compare with S00 storefront baseline; `pnpm run cost:check`.
4. `git status` review vs PLAN §6 rows 16–20; revert out-of-scope collateral (e.g. codegen noise outside git-ignored dirs).
5. In-repo docs: `agents/IMPLEMENTATION.md` workstream entry; `docs/DATA-ARCHITECTURE.md` one line if a new operation/cache profile was added (docs:check must pass).
6. `20-handoff.md`: final file list, test counts, deviations (SC-3 outcome), not-run list (Playwright e2e).

## Subagents
- `rosetta-light:engineer` — messages/docs; short-term.
- `rosetta-light:executor` — `verify` runs; long-running.

## Notes
- Single owner of `messages/en.json` to avoid concurrent JSON edits; keep key order/format as the file's existing style.
- `verify` runs `typecheck` ⇒ `generate:all`; nobody else may be running codegen at this time (S16 finished).
- If `verify` demands env beyond the API URL (e.g. `NEXT_PUBLIC_DEFAULT_CHANNEL`), use the value recorded in S00; never read `.env*` files.

## Done when
- `pnpm run verify` = baseline or better; every key used in code exists in `en.json`; locks check green.

## Checklist
- [ ] STD-ALL  [ ] STD-E
- [ ] No orphan/missing message keys
- [ ] data/core locks consistent
- [ ] `verify` + `cost:check` results recorded vs baseline
- [ ] Documents updated
- [ ] Not-run list recorded (Playwright e2e, Vercel previews)
