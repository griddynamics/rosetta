# plugin-customizations — PLAN (HOW)

<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

## Read first
`plans/plugin-customizations/plugin-customizations-SPECS.md` (WHAT, contracts) · `plans/plugin-customizations/architecture-notes.md` (facts F1–F13, decision) · `docs/REQUIREMENTS/plugin-generator/FR-CUST.md` + units listed in SPECS §1 · `docs/ARCHITECTURE.md` § Plugins (local-build rule, line ~310) · `agents/MEMORY.md` "`scripts/pre_commit.py` Regenerates Plugins With The PUBLISHED Generator".

## Governing rules
- Requirements authoritative; reference IDs in code comments only (requirements-use).
- Regenerate `plugins/` ONLY with the local build: `npm --prefix src/rosettify-plugins run build && node src/rosettify-plugins/dist/cli.js --source . --release r3 --deterministic-hooks false [--publish rosetta,rosetta-light]` (ARCHITECTURE § Plugins). Never edit `pre_commit.py` to use it.
- npx-3.3.10 window (D1): `pre_commit.py` gains ONLY `--publish rosetta,rosetta-light` on its existing npx call (S18). Until CI publishes the new generator on merge, `npx -y rosettify-plugins@latest` is 3.3.10, which rejects `--publish` (and without it would write pre-#315 `plugins/core-<ide>`). In that window: never run full `scripts/pre_commit.py`; run only `--only` checks that do not invoke `plugin sync` (slugs below); regenerate with the local build. Publishing is CI-driven: `.github/workflows/publish-rosettify-plugins.yml` publishes on push to `main` touching `src/rosettify-plugins/**` and fails if the version already exists — no manual publish before merge is assumed.
- Verify scope while code steps run concurrently: S3, S4, S5, S6a, S7 verify ONLY their own vitest files (`npm --prefix src/rosettify-plugins test -- <files>`; vitest does not typecheck). Whole-project `typecheck` + full `test` run only in S2 (no concurrent code step), S6b and S8.
- Preserve multi-set capability (plugin sets, `template-<ide>`, multiset fixtures, `set-<id>-only`, `--domain`, `--publish`): the user re-splits later; nothing here may remove it.
- No commits/pushes unless the user asks. No edits under `plugins/` by hand.
- `$T` = `agents/TEMP/plugin-customizations` (SCM-excluded). Absolute paths in every shell call.
- Pre-commit check slugs (non-sync): `hooks-build verify-structure verify-crossrefs verify-hooks-content verify-counts verify-links type-validation tests` → `venv/bin/python scripts/pre_commit.py --only <slug> [--only <slug>...]`.

## Records
Decisions/findings: `plans/plugin-customizations/HANDOFF.md` (one line per step: status, evidence path, deviations). Validation evidence: `$T/` + summary in HANDOFF. Requirement status: S16.

## File ownership (prevents collisions)
| Owner step | Files |
|---|---|
| S1 | `docs/REQUIREMENTS/plugin-generator/{assets/plugin-sets-split.md,assets/plugins.split.json,INDEX.md,CHANGES.md}`, `FR-SET.md` (`<notes>` of 0001, 0020 only) |
| S2 | `src/types.ts`, `src/vfs/directives.ts`, `tests/unit/vfs/directives.test.ts` |
| S3 | `src/vfs/{source-resolver,build-vfs,customizations}.ts`, `tests/unit/vfs/{build-vfs,source-resolver,customizations}.test.ts` |
| S4 | `src/vfs/effective-sources.ts`, `src/file-processors/file-apply-overrides.ts`, `tests/unit/vfs/effective-sources.test.ts`, `tests/unit/file-processors/file-apply-overrides.test.ts` (incl. rework of the index-0 case, line ~80) |
| S5 | `src/plugin-processors/{plugin-cleanup,plugin-copy,plugin-sync-bundles,plugin-write}.ts`, `src/spec/targets.ts`, their 4 unit tests, `tests/helpers/build-specs.ts` |
| S6a | `src/{cli,cli-args}.ts`, `src/spec/plugin-sets.ts`, `tests/unit/{cli-args,cli-help}.test.ts`, `tests/unit/spec/plugin-sets.test.ts` |
| S6b | `src/generate.ts`, `tests/unit/generate.test.ts`, `tests/e2e/{customizations,sample}.e2e.test.ts`, new fixtures (SPECS §7), `tests/fixtures/sample-instructions/r2/core/rules/order-swap-fixture~overwrite~ide-claude-only~.md` |
| S7 | `src/rosettify-plugins/{README.md,package.json,package-lock.json}` |
| S10 | `instructions/r3/**`, `instructions/r2/core/skills/coding-agents-hooks-authoring/SKILL.md` |
| S11 | `src/rosettify-plugins/plugins.json`, `plugins/**` (generated) |
| S18 | `scripts/pre_commit.py` (one argument pair only) |
| S12–S15b | lists in each step; S16 `docs/REQUIREMENTS/plugin-generator/{FR-*.md,ASSUMPTIONS.md,STRUCTURES.md,GLOSSARY.md,MODEL.md,NFR.md,TRACE.md,INDEX.md,CHANGES.md}` (S1 is finished before S16 starts) |

(paths in S2–S6b relative to `src/rosettify-plugins/`)

## Phases & parallelism
| Phase | # | Session | Depends on | Parallel with |
|---|---|---|---|---|
| 0 | S0 | Baseline & inventory | — | — (alone, first) |
| 1 | S1 | Split documentation | S0 | S2–S9 |
| 2 | S2 | Directives + shared types | S0 | S1 |
| 2 | S3 | Multi-source VFS + order key | S2 | S1, S6a, S7 |
| 2 | S4 | Effective sources + overwrite | S3 | S1, S6a, S7 |
| 2 | S5 | WriteMode in writers | S4 | S1, S6a, S7 |
| 2 | S6a | CLI args + catalog helpers | S2 | S1, S3, S4, S5, S7 |
| 2 | S6b | generate orchestration + e2e | S3, S4, S5, S6a | S1, S7 |
| 2 | S7 | Package README + version 3.5.0 | S2 | S1, S3–S6b |
| 2 | S8 | Gate G-AC5 + suite | S6b, S7 | S9 |
| 2 | S9 | Generator review | S6b, S7 | S8 |
| — | H1 | **HITL: generator approved** | S1, S8, S9 | — |
| 3 | S10 | Content collapse | H1 | — (alone) |
| 3 | S11 | Catalog + regenerate | S10 | — (alone) |
| — | H2 | **HITL: collapse approved** | S11 | — |
| 4 | S12 | Ripple: distribution & CI | H2 | S13, S14, S15a, S15b, S16, S18 |
| 4 | S13 | Ripple: verify scripts & tests | H2 | S12, S14, S15a, S15b, S16, S18 |
| 4 | S14 | Ripple: technical docs | H2 | S12, S13, S15a, S15b, S16, S18 |
| 4 | S15a | Ripple: scenario docs + user-guide→docs/web sync | H2 | S12, S13, S14, S15b, S16, S18 |
| 4 | S15b | Ripple: customization guide + top-level user docs | H2 | S12, S13, S14, S15a, S16, S18 |
| 4 | S16 | Requirements status + split-text edits (→ Draft) | H2 | S12–S15b, S18 |
| 4 | S18 | `pre_commit.py` `--publish` argument | H2 | S12–S16 |
| 5 | S17 | Final validation (a)+(b-i)+(b-ii)+(c) | S12–S16, S18 | — (alone) |
| — | H3 | **HITL: final** (Draft requirement units, merge → CI publish) | S17 | — |

Unlisted pairs are sequential. Parallelism is valid only because paired steps share no files (ownership table). S3→S4→S5 are serialized (shared signatures: `SourceFile`, `TargetMatchContext`, `SpecBuildContext`; a concurrent whole-project typecheck would see half-done peers). Latent collisions resolved: `types.ts` landed once in S2 (S3/S5/S6a/S6b consume only); `generate.ts` single owner S6b; `cli.ts`/`plugin-sets.ts` single owner S6a; `buildVfs` default param keeps the ≈9 existing call sites untouched by S3; `live_counts.json` (S13) vs the doc texts it checks (S14/S15a/S15b) — S13 defines templates first-thing and posts them in HANDOFF; S17 runs `verify-counts`.

## Steps

### S0 — Baseline & inventory · executor · haiku · G0 alone
Goal: freeze evidence before any change.
Do: build current generator; generate baseline; record inventories.
Cmd: `mkdir -p $T && npm --prefix src/rosettify-plugins run build && node src/rosettify-plugins/dist/cli.js --source . --release r3 --deterministic-hooks false --output $T/out-baseline; echo $? > $T/baseline.exit; git rev-parse HEAD > $T/baseline.sha` · `find instructions -name '*~*' -type f | sort > $T/directive-files.txt` (expect 11, r3 only) · collision commands from SPECS §5 → `$T/collisions.txt` (expect 0/0/0).
Done when: `$T/out-baseline` has 49 folders; three inventory files exist; counts match expectations or deviation logged.

### S1 — Split documentation · engineer · sonnet · ∥ S2–S9
Goal: record today's split before moving (SPECS §5 bullet 4).
Files: owner list S1. ACs: user decision (traceability to FR-SET-0001, FR-SET-0020 notes).
Verify: `cmp src/rosettify-plugins/plugins.json docs/REQUIREMENTS/plugin-generator/assets/plugins.split.json` · per-set counts in the md equal `git ls-files instructions/r3/<set> | wc -l` (workflows 38, qe 60, search 42, modernization 9) · marker table has 24 rows (8 per file: 22 singular + 2 plural `(requires the \`modernization\` and \`workflows\` plugins)` at `arrange-workspace-flow.md:101`, `init-workspace-flow.md:158`) equal to `git grep -nE "\(requires the [^)]*plugins?\)" -- instructions`.
Done when: both assets exist, linked from INDEX.md and both `<notes>`; CHANGES.md batch line added.

### S2 — Directives + shared types · engineer · sonnet · ∥ S1
Goal: SPECS §3.1, §3.2.
ACs: FR-ARCH-0021 (all 9 criteria), FR-ARCH-0020.AC1 (order `1a`).
Traps: `rosetta` tree has no OrderToken today → zero output change expected; `parseDirectives` stays basename-only (file naming added by S3 rethrow).
Verify: `npm --prefix src/rosettify-plugins run typecheck && npm --prefix src/rosettify-plugins test -- tests/unit/vfs/directives.test.ts`.

### S3 — Multi-source VFS + order key · engineer · sonnet · ∥ S1, S6a, S7
Goal: SPECS §3.3, §3.5, §3.6.
ACs: FR-ARCH-0022.AC1-4, FR-ARCH-0026.AC1-4 (+AC5 unit), FR-CUST-0002.AC1-5 (unit), FR-CUST-0003.AC1-3 (unit), FR-CUST-0001.AC5 (unit), FR-ARCH-0010, FR-ARCH-0012.
Traps: load order must be built letter→folder→sorted raw path (today's Map grouping is raw-path-major, F2); sort BEFORE freeze; main missing folder still throws, customization missing release/folder skips; `validateCustomizationRoots` inspects ONLY `<root>/<release>/` and ignores dot-entries there (amended FR-CUST-0002, D3) — `collectSourceFiles` must not turn such an ignored entry into a VFS file.
ACs (added): FR-ARCH-0024.AC1 at `buildVfs` level — 4 real customization roots (`cust1..cust4`, overwrite at 2 and 4) produce sources ordered A,B,C,D,E with keys per FR-ARCH-0026 (the overwrite resolution itself is asserted in S4).
Verify: `npm --prefix src/rosettify-plugins test -- tests/unit/vfs/build-vfs.test.ts tests/unit/vfs/source-resolver.test.ts tests/unit/vfs/customizations.test.ts`.

### S4 — Effective sources + overwrite · engineer · sonnet · after S3 · ∥ S1, S6a, S7
Goal: SPECS §3.7, §3.8.
ACs: FR-ARCH-0024.AC1, AC3, AC5 (unit), FR-ARCH-0041, FR-ARCH-0014 (identity on no-change).
Traps: orphan = `filtered[0]` has `overwrite` (even if later overwrites exist); keep the lead-change `target_contents` refresh.
Verify: `npm --prefix src/rosettify-plugins test -- tests/unit/vfs/effective-sources.test.ts tests/unit/file-processors/file-apply-overrides.test.ts`.

### S5 — WriteMode in writers · engineer · sonnet · after S4 · ∥ S1, S6a, S7
Goal: SPECS §3.9.
ACs: FR-CLI-0036 suppression contract (unit), FR-CLI-0050 dry-run unchanged.
Traps: `'dry-run'` must stay byte-identical to today's `dryRun=true` (sink + logs); `pluginCopy` returns `.tmpl` frames in all modes; `pluginSyncBundles` in `suppressed` still runs its checks and reports errors (e.g. missing bundle dir) but writes/removes nothing (skips copy and `sweepUndeclaredBundles`).
Verify: `npm --prefix src/rosettify-plugins test -- tests/unit/plugin-processors/plugin-cleanup.test.ts tests/unit/plugin-processors/plugin-copy.test.ts tests/unit/plugin-processors/plugin-sync-bundles.test.ts tests/unit/plugin-processors/plugin-write.test.ts`.

### S6a — CLI args + catalog helpers · engineer · sonnet · ∥ S1, S3, S4, S5, S7
Goal: SPECS §3.4, §3.10 (parsers incl. pure `resolveCustomizationRoots(sourceRoot, values)`, options, help text; `pluginName`, `allDeclaredPluginNames`, `declaredFoldersForRelease`). `cli.ts` passes `customizations`/`publish` into `GenerateOptions` (fields exist from S2; consumed by S6b).
ACs: FR-CLI-0035.AC1-4 (tests: relative → `<source>/x`, absolute verbatim, order across commas and repeats, empty token, missing value), FR-CLI-0036 name derivation (unit).  A1/A2 accepted (D4).
Verify: `npm --prefix src/rosettify-plugins test -- tests/unit/cli-args.test.ts tests/unit/cli-help.test.ts tests/unit/spec/plugin-sets.test.ts`.

### S6b — generate orchestration + e2e · engineer · sonnet · ∥ S7
Goal: SPECS §3.11, §6; fixtures §7.
ACs: FR-CLI-0036.AC1-6 (explicit cases: AC2 — pre-existing `core-claude/` byte-identical after a `--publish rosetta,rosetta-light` run; AC5 — `core` unpublished + its folder missing ⇒ pre-flight exit 1, nothing written), FR-CUST-0001.AC1-4, FR-CUST-0002.AC1-5 (AC4 `repo-like` root exits 0; AC5 `r3/.DS_Store` ignored), FR-CUST-0003.AC1-3 (generate level, output untouched), FR-ARCH-0024.AC2, AC4, AC6, FR-ARCH-0026.AC5.
Traps: every new error before `sweepOrphanDestinations` (F10/F12); `declaredFoldersForRelease` over whole catalog, not `selectSets`; orphan check per spec with `spec.set` + run's active profile; dedupe pre-flight messages (orphan errors by origin × destination, `buildVfs` errors by message) so 14 specs sharing one VFS do not repeat one fault 14×; `order-swap-fixture~overwrite~ide-claude-only~.md` (r2 fixture, no base) becomes an orphan error — rework it keeping the token-order-swap intent and update `e2e/sample.e2e.test.ts:296`; new fixtures isolated.
Verify: `npm --prefix src/rosettify-plugins run typecheck && npm --prefix src/rosettify-plugins test`.

### S7 — Package README + version · engineer · haiku · ∥ S3–S6b
Goal: README documents `--customizations`, `--publish`, OrderToken, overwrite semantics; `package.json` 3.4.0 → 3.5.0 (+ lock) (D9). Note: version must not exist on npm, else the CI publish job fails.
Verify: `node -p "require('/Users/isolomatov/Sources/GAIN/rosetta-manual-branch/src/rosettify-plugins/package.json').version"` = `3.5.0`; `npm view rosettify-plugins@3.5.0 version` prints nothing (unpublished).

### S8 — Gate G-AC5 + suite · validator · sonnet · ∥ S9
Goal: prove ASR-1 / FR-CUST-0001.AC5 on the real tree (pre-collapse, original catalog).
Cmd: `npm --prefix src/rosettify-plugins run build && node src/rosettify-plugins/dist/cli.js --source . --release r3 --deterministic-hooks false --output $T/out-new; echo $? > $T/new.exit; diff -r $T/out-baseline $T/out-new && cmp $T/baseline.exit $T/new.exit` · `npm --prefix src/rosettify-plugins run test:coverage` · fixture smoke: `--customizations` + `--publish` + `--dry-run` on `tests/fixtures` (sink lists only published).
Done when: diff empty, exit codes equal, suite green, coverage ≥ threshold. Non-empty diff = STOP (defect) → back to owner step.

### S9 — Generator review · reviewer · opus · ∥ S8
Goal: diff (`git diff -- src/rosettify-plugins`) vs SPECS §3/§6 and each AC; purity (FR-ARCH-0014), no identity branching (FR-ARCH-0005), error kinds/placement, help text accuracy.
Done when: findings list in HANDOFF; blockers fixed by owner step and S8 re-run.

### H1 — HITL gate
Present: S8 evidence, S9 findings, AC→test matrix (below). Proceed to S10 only on explicit approval.

### S10 — Content collapse + stale hook-template paths · engineer · sonnet · alone
Goal: SPECS §5 (move, markers, D8 keep, D6 hooks-authoring SKILL r3 + r2). Instruction edits land here so S11 regenerates them.
Do: re-run collision check (must be 0/0/0 else STOP); `git mv` each file per mapping (plain `git mv`, never `-f`/`-k`; any refusal = STOP); remove empty set dirs; strip the 24 markers, each together with its leading whitespace (lines read `"…"   (requires …)`), regex `\(requires the [^)]*plugins?\)`.
D8 (keep): split-era text edits inside files that stayed in `core/` are NOT reverted by the move. List: `git diff -M --name-status ff164dd0 HEAD -- instructions/r3/core | grep '^M'` — `rules/{plugin-files-mode,local-files-mode,mcp-files-mode,speckit-integration-policy}.md` (e.g. plugin-files-mode "resolve BY NAME across EVERY installed Rosetta plugin…"), ~22 `skills/*/README.md` + `coding-agents-prompt-authoring/references/pa-{adapt,rosetta,schemas}.md` path rewrites, `workflows/{arrange-workspace-flow,help-flow,init-workspace-flow-shells}.md`. Kept as is; only the 24 marker lines are restored. The `configure/*` deletion moved into the `harness` skill (`skills/harness/references/configure/`, commit 492b6a78) and is not restored.
Verify: `ls instructions/r3` = `core` · `git status --porcelain instructions | grep -c '^R'` = 149 · `git grep -nE "\(requires the [^)]*plugins?\)" -- instructions` = empty · for each of the 24 touched lines, the line equals its `ff164dd0` form: `git diff ff164dd0 -- instructions/r3/core/workflows/{help-flow,init-workspace-flow,arrange-workspace-flow}.md` shows no hunk covering those lines (other hunks = D8 kept edits, logged) · D6: `grep -nE "core-(claude|codex|copilot|cursor|antigravity|windsurf)" instructions/r{2,3}/core/skills/coding-agents-hooks-authoring/SKILL.md` = empty and every path the edited lines name exists (`ls`).

### S11 — Catalog + regenerate · engineer · sonnet · alone
Goal: SPECS §4 catalog, §5 `plugins/` state.
Do: edit `plugins.json` — `rosetta` `[core]` (standard + `-light`) and `core` declared, unpublished (D1); `git rm -r -q plugins/core-*` (DESTRUCTIVE, tracked, reversible); local regen with `--publish rosetta,rosetta-light` (orphan sweep removes `workflows-*`, `qe-*`, `search-*`, `modernization-*`).
Verify: `ls plugins | wc -l` = 14 and names per SPECS §5 · collapse oracle: `diff -r $T/out-new/rosetta-<x> plugins/rosetta-<x>` for all 14 → only the 24 marker lines of the 3 workflows' per-IDE copies and the D6 hooks-authoring SKILL lines (log every hunk in HANDOFF; anything else = STOP) · `npm --prefix src/rosettify-plugins test -- tests/e2e/parity.e2e.test.ts`.

### H2 — HITL gate
Present: S10/S11 evidence, hunk log, `git status` summary. Proceed on approval.

### S12 — Ripple: distribution & CI · engineer · sonnet · ∥ S13–S16 (incl. S15a, S15b)
Files (15): `.agents/plugins/marketplace.json`, `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json`, `.github/plugin/marketplace.json`, `.github/workflows/{publish-instructions,e2e-testing,repo-analysis,repo-implement,repo-plan,repo-triage,validate-prompts}.yml`, `.github/scripts/run-test-cases.sh`, `.github/prompts/{repo-analysis,repo-implement-code,repo-implement-plan}.md`.
Target: SPECS §8 R1–R4. Trap: release index `other_sets` now = `core` with no archives → omit empty block 2; keep the zip loop catalog-driven.
Verify: `jq . <each manifest>` · R1/R2 greps scoped to these files = 0 · `actionlint .github/workflows/*.yml` (if installed; else log).

### S13 — Ripple: verify scripts & tests · engineer · sonnet · ∥ S12, S14, S15a, S15b, S16
Files (8): `scripts/verify/{ac_structure.sh,ac_crossrefs.py,ac_hooks_content.py,ac_counts.py}`, `docs/definitions/live_counts.json`, `src/hooks/tests/regression/{hook-set-isolation,read-once-template-registration}.test.ts` (latter loops the 4 domain set names, line ~215), `tests/e2e-tests/coding-rosetta/config.json` (inspect; expected no change).
Target: SPECS §8 R5 (catalog-driven, vacuous pass, skip-not-fail). First action: post the new `live_counts.json` templates to HANDOFF for S14/S15a/S15b.
Verify: `venv/bin/python scripts/pre_commit.py --only verify-structure --only verify-crossrefs --only verify-hooks-content` · `npm --prefix src/hooks test -- tests/regression`.

### S14 — Ripple: technical docs · engineer · sonnet · ∥ S12, S13, S15a, S15b, S16
Files (18): `docs/{ARCHITECTURE,CONTEXT,ASSUMPTIONS,AUTOMATION-ARCHITECTURE,CODEMAP,MCP-ARCHITECTURE,TODO,TESTING-PLUGINS,hooks-verify}.md`, `docs/definitions/folder-structure.md`, `docs/PATTERNS/{domain-set-architecture,document-bundling,pre-commit-plugin-sync,shell-proxy-pattern,tag-based-retrieval,vfs-resource-paths}.md`, `agents/IMPLEMENTATION.md`, `OVERVIEW.md`.
Target: SPECS §8 R1, R2, R6, R8. ARCHITECTURE hot spots: lines 54–58 diagram, 175–235 (Instruction Structure: one folder now; "Customization is by domain, not by overlay … none planned" → replaced by `--customizations`), 318–346 (plugin table → 2 plugins, `core` dormant), 432, 439 (hook-carrying folders), 450 (release blocks), 458–462 (Extension Points), 475 (Tradeoff "Domain sets over org overlays"); CONTEXT line 87. D6: `docs/hooks-verify.md` `core-<ide>` occurrences (~lines 362, 379, 408) → current names (`src/rosettify-plugins/plugins/template-<ide>/…` for templates, `plugins/rosetta-<ide>/…` for generated output); verify `grep -n "core-\(claude\|codex\|copilot\|cursor\|antigravity\)" docs/hooks-verify.md` = empty. Docs state facts only (MEMORY rule).
Verify: R1/R2/R8 greps scoped to these files = 0 (history excluded) · `venv/bin/python scripts/pre_commit.py --only verify-links`.

### S15a — Ripple: scenario docs + docs/web sync · engineer · sonnet · ∥ S12–S14, S15b, S16
Files (45): `user-guide/scenarios/*.md` (13), `docs/web/user-guide/scenarios/*.md` (13, ONLY via `venv/bin/python scripts/sync_user_guide_web.py`), `docs/web/docs/{adhoc-flow,api-aqa-flow,aqa-flow,architecture,code-analysis-flow,coding-agents-prompting-flow,coding-flow,developer-guide,external-lib-flow,init-workspace-flow,introduction,mcp-architecture,modernization-flow,requirements-authoring-flow,research-flow,security-flow,testgen-flow,ui-aqa-flow}.md` (18), `docs/web/index.md`.
Target: SPECS §8 R1, R2, R8 (instruction links point to `instructions/r3/core/...`; no "requires the X plugin" wording); docs/web mirrors adapted, not regenerated (except the user-guide sync).
Verify: R1/R2/R8 greps scoped = 0 · `venv/bin/python scripts/pre_commit.py --only verify-links`.

### S15b — Ripple: customization guide + top-level user docs · engineer · sonnet · ∥ S12–S14, S15a, S16
Files (7): `README.md`, `PLUGINS.md`, `INSTALLATION.md`, `QUICKSTART.md`, `USAGE_GUIDE.md`, `DEVELOPER_GUIDE.md`, `llms-full.txt` (hand-edited; `.github/workflows/pages.yml` only copies it).
Target: SPECS §8 R1, R2, R7, R8; canonical customization section `PLUGINS.md` § "Build customized plugins" (D7), linked from README, USAGE_GUIDE, DEVELOPER_GUIDE and docs/web (S15a adds the docs/web link after S15b posts the anchor in HANDOFF). Remove "REQUIRES … `qe` on top of `core` and `workflows`" variants (QUICKSTART 106, 124 et al.).
Verify: R1/R2/R8 greps scoped = 0 · `venv/bin/python scripts/pre_commit.py --only verify-links --only verify-counts`.

### S16 — Requirements status + split-text edits (→ Draft) · engineer (requirements-use) · sonnet · ∥ S12–S15b, S18
Do (status): set `implementation="Implemented"` + concise `implementationNotes` (files) for FR-CUST-0001..0003, FR-CLI-0035, 0036, FR-ARCH-0021, 0022, 0024, 0026, FR-ARCH-0020 (ToBeModified→Implemented); refresh implementationNotes of FR-SET-0001 (catalog = `rosetta` + unpublished `core`), FR-SET-0020 (order key replaces layer index).
Do (D10 text edits): edit texts that state the split catalog as current fact so they match `rosetta` + unpublished `core`, keeping wording capability-generic and valid for multi-set catalogs (illustrative examples may stay, attributed to `assets/plugins.split.json`). Every edited `<req>` → `status="Draft"`, `changed="<date>"`, `approved_by` cleared; prose files (ASSUMPTIONS, GLOSSARY, INDEX, TRACE) get a CHANGES.md batch entry instead. Units (hit counts from an R8-style scan; classify each hit fact-vs-example before editing):
| Unit / file | Intended change |
|---|---|
| FR-SET (file prose), FR-SET-0020, 0030, 0040, 0050, 0060, 0070 | "six sets / 49 folders / domain plugins" as fact → current catalog; five-folder layering ACs kept as generic examples citing `plugins.split.json` |
| FR-SET-0001 | implementationNotes only (no Draft unless statement changes) |
| FR-CLI-0030, 0031, 0036, 0042 | `--domain qe` / `rosetta`+`core` examples: keep mechanism, re-anchor examples to split catalog asset or current sets |
| FR-ARCH-0025, 0060 | `set-qe-only` examples stay (capability); add note that no current set is `qe` |
| FR-SEED-0001 (FR-COPY.md) | preserved-template sharing across six sets → "several sets" generic |
| FR-PROF-0021 | `-light` vs split-set suffix examples → generic, cite split asset |
| FR-STRUCT-0010 (STRUCTURES.md) | example folder list → `rosetta-<ide>[-light]`; split layout as dormant example |
| DATA-CFG-0007 (MODEL.md), NFR-0001, FR-GEN-0001/0002, FR-HOOK-0001 | inspect; edit only where the split catalog is stated as fact |
| ASSUMPTIONS.md AC-4, AC-23, AC-24, AG-3, AG-9 | set-folder list → `core` only today, multi-folder generic; AC-23 disjointness note kept for future split |
| GLOSSARY.md (Domain, PluginSet "declared sets are …"), INDEX.md, TRACE.md goal texts | current catalog wording; G6–G14 goals unchanged in meaning |
Verify: `grep -c 'implementation="NotStarted"' docs/REQUIREMENTS/plugin-generator/FR-CUST.md` = 0 · each note cites existing files (`ls`) · list of Draft units posted to HANDOFF for H3 · R8 greps over `docs/REQUIREMENTS/plugin-generator/` (excl. `assets/`, CHANGES.md) show only attributed examples.

### S17 — Final validation · validator · sonnet · alone
Do: first `npm view rosettify-plugins version > $T/npm-latest.txt` (record; all (b) expectations assume 3.3.10). (a) SPECS §9(a) → `git status --porcelain plugins/` shows no drift vs S11 (+ marker-free); (b-i) SPECS §9(b-i) literal user pair with only `--output $T/npx-literal` added — record exit codes and resulting tree (an error is a valid recorded outcome); (b-ii) SPECS §9(b-ii) adjusted comparable run (both b-i and b-ii run, D2) → `diff -r` per pair, every hunk classified I/P/D in `plans/plugin-customizations/validation.md`; pre-commit non-sync checks: `venv/bin/python scripts/pre_commit.py --only hooks-build --only verify-structure --only verify-crossrefs --only verify-hooks-content --only verify-counts --only verify-links --only type-validation --only tests`; R1–R7 greps repo-wide; real-tree customization smoke SPECS §9(c).
Done when: all green; zero unclassified hunks; D-class items listed for H3.

### H3 — HITL final
Present validation.md, D-class list, S16 Draft units for approval. Summary checklist:
- [ ] Generator version 3.5.0 (D9) absent on npm; merge to `main` triggers CI publish (`publish-rosettify-plugins.yml`), which closes the npx-3.3.10 window; first full `pre_commit.py` only after that publish.
- [ ] `pre_commit.py` diff = the single `--publish rosetta,rosetta-light` argument pair (D1).
- [ ] Draft requirement units (S16 list) approved → `status="Approved"`.
- [ ] MCP impact: instruction paths moved `r3/{workflows,qe,search,modernization}/…` → `r3/core/…`, so MCP VFS resource paths/root tags change; instructions must be re-published to MCP (publish-instructions pipeline / Rosetta CLI), and any deployment with `INSTRUCTION_ROOT_FILTER` naming `workflows|qe|search|modernization` must be updated (docs/MCP-ARCHITECTURE.md § Instruction root filter).
- [ ] Plugin versions untouched (D5); known 3.1.16 vs 3.1.22 drift deferred to the user's later main merge.
User: approves, decides merge.

### S18 — `pre_commit.py` `--publish` argument · engineer · haiku · ∥ S12–S16
Do: add ONLY `"--publish", "rosetta,rosetta-light"` to the existing `plugin sync` npx command in `scripts/pre_commit.py` (still `npx -y rosettify-plugins@latest`; no local-generator switch; no other change) (D1).
Verify: `git diff -- scripts/pre_commit.py` shows exactly that argument pair · `venv/bin/python -c "import sys; sys.path.insert(0,'/Users/isolomatov/Sources/GAIN/rosetta-manual-branch/scripts'); import pre_commit"` imports cleanly · do NOT run the `plugin-sync` check (3.3.10 window).

## Traceability (9 approved units → step → test)
| Unit · ACs | Step | Test / gate |
|---|---|---|
| FR-CUST-0001 · AC1-4 | S3, S6b, S17 | `e2e/customizations.e2e.test.ts` |
| FR-CUST-0001 · AC5 | S3, S8 | `unit/vfs/build-vfs.test.ts` + G-AC5 |
| FR-CUST-0002 · AC1-5 | S3, S6b | `unit/vfs/customizations.test.ts`, `unit/generate.test.ts` |
| FR-CUST-0003 · AC1-3 | S3, S6b | same |
| FR-CLI-0035 · AC1-4 | S6a | `unit/cli-args.test.ts`, `unit/cli-help.test.ts` |
| FR-CLI-0036 · AC1-6 | S5, S6a, S6b | processor tests + `unit/generate.test.ts` (explicit AC2, AC5 cases) |
| FR-ARCH-0021 · 9 criteria | S2 | `unit/vfs/directives.test.ts` |
| FR-ARCH-0022 · AC1-4 | S3 | `unit/vfs/build-vfs.test.ts` |
| FR-ARCH-0024 · AC1 (order, 4 roots) / AC1,3,5 / AC2 / AC4,6 | S3 / S4 / S6b / S6b | `build-vfs` / `effective-sources`, `file-apply-overrides` / e2e / `generate` |
| FR-ARCH-0026 · AC1-4 / AC5 | S3 / S3, S6b | `build-vfs` / `customizations`, `generate` |

## Rollback & destructive operations
All changes are git-tracked; no commit unless the user asks. Rollback: uncommitted → `git restore --staged --worktree <paths>`; committed → `git revert`. Destructive ops (listed, all recoverable from git): S10 `git mv` ×149 (reverse mv); S11 `git rm -r plugins/core-*` (`git checkout HEAD -- plugins/core-*`); S11 generator orphan sweep deletes tracked `plugins/{workflows,qe,search,modernization}-*` (`git checkout HEAD -- <dir>`); `$T` scratch deletion (untracked, regenerable). Never: full `pre_commit.py` before CI has published the new version; `git clean`; `--force` anything.

## Decisions (user, 2026-11-05)
- D1 (Q1=a): `pre_commit.py` gets ONLY `--publish rosetta,rosetta-light` on its existing npx call(s) (S18); still `npx@latest`. `core` stays declared in `plugins.json`, unpublished. npx-3.3.10 window until CI publishes on merge: only `--only` non-sync checks; local-build regeneration.
- D2 (Q2): S17 runs both (b-i) literal pair with only `--output` added and (b-ii) adjusted comparable invocation.
- D3 (Q3): FR-CUST-0002 amended and re-approved — only `<root>/<release>/` checked; dot-entries there ignored; non-release entries under `<root>/` ignored; new AC4/AC5 mapped (SPECS §7; S3, S6b).
- D4 (Q4): A1 and A2 accepted.
- D5 (Q5): plugin versions untouched; no version-restore step (user merges main later).
- D6 (Q6): fix now — stale `core-<ide>` paths in `instructions/r3/core/skills/coding-agents-hooks-authoring/SKILL.md` (+ r2 counterpart) in S10 (before S11 regeneration) and in `docs/hooks-verify.md` in S14.
- D7 (Q7): `PLUGINS.md` § "Build customized plugins" (S15b).
- D8 (Q8): keep split-era text edits; restore only the 24 marker lines (S10).
- D9 (Q9): `rosettify-plugins` 3.4.0 → 3.5.0 (S7).
- D10 (Q10): edit requirement texts naming split sets/49 folders now, capability-generic, each edited unit → Draft for user approval at H3 (S16 table).
- Context: the user re-splits later; nothing removes multi-set capability (governing rule).

</CRITICAL>
