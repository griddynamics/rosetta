# Discovery — post-merge follow-up, issue #315

Branch `feat/315-plugin-sets` (PR #340). `origin/main` merge is staged and not committed. Merge-base `785054e9`. Main brought 9 commits: 42 skill `README.md` intro lines, a README/web "Skills" section, web sync, changelog.
Context of record: `agents/TEMP/315-execution-state.md`, `plans/issue-315-plugin-sets/follow.md` (decisions D1–D25; do not relitigate).
Evidence files: `agents/TEMP/315-merge-followup/` (`deadlinks.txt`, `dl-main.txt`, `dl-branch.txt`, `eq_full.log`).

## Set shape (measured, `instructions/r3/`)

| Set | Skills | Workflows (entry `*-flow.md`) | Workflow files | Rules | Agents |
|---|---|---|---|---|---|
| core | 36 | 3 | 17 | 5 | 0 |
| workflows | 0 | 9 | 17 | 0 | 10 |
| qe | 2 | 4 | 27 | 0 | 0 |
| search | 4 | 0 | 0 | 0 | 0 |
| modernization | 0 | 1 | 9 | 0 | 0 |
| total (`rosetta`) | 42 | 17 | 70 | 5 | 10 |

The reference vocabulary is `docs/CODEMAP.md:157-161`. "Workflows" = 17 entry points (frontmatter `tags: ["workflow"]`). 15 of them are distinct request types (`aqa-flow` is a router, `coding-light-flow` is a variant of `coding-flow`). "Workflow files" = 70.

## Track A — hooks tests (`src/hooks/tests/regression/`)

- `read-once-template-registration.test.ts` reads `src/rosettify-plugins/src/spec/hook-layouts.ts`, which `623f5976` deleted (D25). The suite fails to load. The regression it guards is unchanged: read-once must stay registered for every IDE that can deliver it.
- Pre-#315 version: `git show 492b6a78~1:src/hooks/tests/regression/read-once-template-registration.test.ts`. It grepped 6 templates for `read-once.js` and `read-once-reset.js`. Its two Copilot labels were swapped: `hooks/hooks.json.tmpl` is the standalone form, and `.github/plugin/hooks.json.tmpl` is the plugin form (`docs/ARCHITECTURE.md` Standalone table).
- The 7 templates live in `src/rosettify-plugins/plugins/template-<ide>/`. All are byte-identical to pre-#315, except that the Copilot plugin form has 28 changed lines (destination and probe guard, D25).
- Shared templates render every hook-carrying plugin. `plugins.json`: `rosetta` (variants standard + `-light`) and `core` declare all 6 modules and `bootstrap: true`. `workflows`/`qe`/`search`/`modernization` declare `hooks: []` and `bootstrap: false`. `hookSupportModules['read-once'] = ['read-once-reset','read-once-shared']`.
- Built at `--deterministic-hooks true` (scratch): `rosetta`, `rosetta-light` and `core` each register read-once and read-once-reset on 6 IDEs, with 3 read-once bundles each. The 4 domain sets: 0 hooks.json, 0 bundles.
- Antigravity registers `read-once` only. The template is identical to pre-#315. It has no compaction or session-boundary event (`docs/hooks/antigravity.md:44`). By design.
- `hooks-registered.test.ts` checks only `rosetta-{claude,copilot,cursor,codex}`, never `core-*`. It self-skips below the hooks release and when no bundle is present. At shipped posture `false`, no advisory bundles ship.
- Owner direction: the full plugin AND the split plugins both ship, so tests MUST cover both install paths. Balance them; do not replace one with the other.

## Track B — equivalence gate (`plans/issue-315-plugin-sets/verify/ac_equivalence.py`)

- AC2 compares `plugins/rosetta-<ide>[-light]` with golden `agents/TEMP/315-golden/core-<ide>[-light]`. A diff passes only if its path matches `PERMITTED` (lines 22-59). Path-only predicates; entry 23 is the precedent (one file, originating commit named).
- It fails now: 31 unaccounted diffs per target, all `skills/<name>/README.md`. For each of the 31, the golden→current diff is exactly main's added lines (intro sentence + blank line), with zero deletions (verified in `rosetta-claude`). Main edited 42 READMEs; the other 11 were already covered by entries 14/18/19/21.
- Owner decision: accept these README files only when the diff is exactly main's added lines and nothing is removed. Any other edit to them must still fail.

## Track C — count alignment (owner: "edit to be aligned across the board")

Statements to align to the vocabulary above:
- `docs/ARCHITECTURE.md:313` (the sentence I merged in) and `:215-223` (the per-set table: its "Workflows" column holds workflow files, not entry points).
- `llms-full.txt:69, 133, 245, 342, 399`; `FAQ.md:123`; `agents/IMPLEMENTATION.md:159`; `docs/SecurityOnePager.md:25` ("12 workflow types"); `docs/web/roadmap.md:104-105` ("14+ workflows", "30 skills"); `docs/web/docs/architecture.md:282`, `docs/web/docs/faq.md:129`.
- `docs/CODEMAP.md:157-161` already correct; it is the reference.

## Track D — web and dead links

- Main added 12 dead links: `README.md:83,84,120-123` and `docs/web/docs/introduction.md:69,70,106-109` point at `instructions/r3/core/skills/{qa-knowledge,qa-structure,solr-*}`. Real homes: `qe/skills/`, `search/skills/`. All 42 README edits landed at the moved files.
- Branch leftovers (`dl-branch.txt`): 59 links on `docs/web/docs/*-flow.md` pages point at `blob/main/instructions/r3/core/workflows/…` for moved workflows. `docs/web/docs/{developer-guide,architecture}.md` have stale `core/agents`, `core/workflows` references.
- Web pages never synced with the branch's root-doc changes: `docs/web/docs/{architecture,plugins,installation,developer-guide}.md`, `docs/web/index.md` (`core-*-standalone-*.zip`, "Each plugin contains core instructions", `core-<ide> package`). Root `docs/ARCHITECTURE.md:39` diagram still says `(core-<ide> package)`.
- Process: `.claude/skills/sync-web-site/SKILL.md`. It has its own HITL: an exact was→became mapping per page, approved before applying.

## Track E — repo automation and comments

- `.github/prompts/repo-implement-code.md:39` and `repo-implement-plan.md:63` fall back to `instructions/r3/core/workflows/coding-flow.md`. That is dead; the real path is `instructions/r3/workflows/workflows/coding-flow.md`.
- Comments naming `instructions/r3/core/agents/*.md` (now `instructions/r3/workflows/agents/`): `.github/workflows/{e2e-testing:205,repo-analysis:143,repo-implement:279,repo-plan:246,repo-triage:220,validate-prompts:262}.yml`, `instructions/r3/core/skills/orchestration/README.md:28`, `docs/web/docs/architecture.md:385`, `docs/web/docs/developer-guide.md:406`.
- Not dead: the `bootstrap-` prefix globs, the `example.md`/`deleted-rule.md`/`my-skill` samples, `instructions/r3/aqa/` in FR-SET (example), and history files (`docs/stories`, `archive`, `CHANGES`, `IMPLEMENTATION` history).

## Out of scope — report only

- `coding-light-flow.md` has `name: coding-flow`. Codex and Antigravity emit two skills named `coding-flow`. Present on main since the initial release.
- `docs/PATTERNS/shell-proxy-pattern.md:46-50` lists `.claude/{skills,agents,commands}` shells that no longer exist in this repo.
- PR check "Validate Prompts" failed on an OpenAI stream disconnect. Re-run needed; no finding.

## Constraints

- Build locally only: `npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks <t|f> --source $PWD [--output DIR]`. Never `npx rosettify-plugins@latest`.
- Regenerate `plugins/` last. Gates: `scripts/verify/{ac_structure.sh,ac_crossrefs.py,ac_hooks_content.py}` + `plans/issue-315-plugin-sets/verify/ac_equivalence.py`, the hooks gate at both postures. Suites: `src/rosettify-plugins`, `src/hooks`, `src/curiocity`.
- Do not edit `plugins/` directly. Do not commit. Do not push.
