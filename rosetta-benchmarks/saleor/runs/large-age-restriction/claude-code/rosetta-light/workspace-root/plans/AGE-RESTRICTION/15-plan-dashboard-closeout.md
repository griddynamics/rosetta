# 15 — Dashboard closeout: messages, changeset, full gates (Phase D)
Depends on: 13, 14. Parallel with 11, 20. Spec: `S§12` Tooling bullet; PLAN SC-1.

## Do
1. `pnpm run extract-messages` once, after 13/14 are done and their message ids are in HANDOFF; verify the diff of `locale/defaultMessages.json` contains only the new ids.
2. Changeset: `.changeset/<slug>.md` with frontmatter `"saleor-dashboard": patch` (SC-1; `minor` fails `lint:changesets`), one-paragraph user-facing text.
3. Gates: `pnpm run check-types`, `pnpm exec eslint` on all changed files, `pnpm run format:check`, `pnpm test` (Jest + lint-rule tests), `pnpm run lint:changesets`, `pnpm run knip`; compare with S00 dashboard baseline.
4. `git status` review: only §6 rows 12–15 files; revert any collateral from fixers.
5. In-repo docs: `agents/IMPLEMENTATION.md` workstream entry; `docs/ARCHITECTURE.md` only if SC-2 produced a new rule worth one line.
6. `15-handoff.md`: final file list, test counts, SC-2 outcome.

## Subagents
- `rosetta-light:engineer` — closeout edits; short-term.
- `rosetta-light:executor` — gate runs; long-running (`check-types`, Jest).

## Notes
- `extract-messages` output is a CI diff gate; run it last and only here to avoid merge races on one JSON file.
- `knip` flags newly unused exports: new components must be imported by their parents.
- Storybook/Chromatic/e2e are not run locally; list as not run.
- Do not run `lint:eslint`/`lint:prettier` repo-wide (write in place).

## Done when
- All gates equal or better than S00 dashboard baseline; changeset lints; `locale/defaultMessages.json` diff is additive.

## Checklist
- [ ] STD-ALL  [ ] STD-D
- [ ] Changeset is `patch`
- [ ] Messages extracted, diff additive
- [ ] `pnpm test` + `check-types` green vs baseline
- [ ] Documents updated (agents/IMPLEMENTATION.md)
- [ ] Not-run list recorded (Storybook, Chromatic, e2e)
