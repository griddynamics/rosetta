# Remediation spec — eight `ToBeModified` units, Rosetta plugin generator
Branch `feat/315-plugin-sets`, tree clean. Every gap below re-verified against the code; where behaviour was in question the generator was RUN (scratch output only, never `plugins/`).
Skipped by instruction: FR-ARCH-0020, FR-ARCH-0021 (OrderToken / `~1a~` grammar) — backlog, no fix specified.

## 1. FR-CLI-0030 — Domain folder filter over plugin sets
VERDICT: FIX CODE (with 0031, one change).
Verified: `--domain zzz-nonexistent-domain` → exit 1, stdout empty, output dir empty, stderr = generic `No plugin sets to build ...`, folder never named.
Fix: `generate()` in src/rosettify-plugins/src/generate.ts; new exported `parseDomainTokens` in src/rosettify-plugins/src/spec/plugin-sets.ts (reuse in `selectSets`).
Insert after catalog load, before `selectSets`: for each token, `fs.existsSync(path.join(instructionsSource, releaseName, token))`; on any miss write to stderr and `return 1`:
`Unknown instruction folder(s) for release "<r>": <tok>[, <tok>] (looked for <abs path>[, <abs path>]).`
Optionally append `Folders present under <instructionsSource>/<release>/: <sorted list>.` — helpful for the shipped repo (five names), but a `--source` pointing at a large tree would enumerate arbitrary directories, so cap it or omit it.
No new exit code. Breakage: none — `scripts/pre_commit.py` never passes `--domain`, inherits stdio, reads only the return code; no workflow invokes the generator.
Test: tests/unit/generate.test.ts — fixture instructions tree, `--domain zzz` → exit 1 AND stderr contains the resolved `<...>/r3/zzz` path AND output dir not created.
Effort S. Risk S.

## 2. FR-CLI-0031 — Domain filter matching and empty selection
VERDICT: FIX CODE. Must land with #1.
Verified: `generate.ts` `sets.length === 0` → `return 1` unconditionally, one message for both causes.
Fix, same block: `return domain === undefined ? 1 : 0`. Domain-supplied message becomes
`Domain filter "<domain>" matched no plugin set for release "<r>". Declared sets: ... . Nothing was generated.` (exit 0)
No-domain case keeps exit 1 and the existing wording — an empty release selection is misconfiguration, not a filter outcome. This distinction is implied by the statement ("Where the FILTER matches no declared set") and is easy to miss.
The block already returns before `sweepOrphanDestinations`, so "no plugin output is written" holds. Keep it that way.
Test: tests/unit/generate.test.ts with a `--config` fixture catalog (the shipped plugins.json cannot produce a legitimate empty match — every real folder is some singleton set's sole folder): set `folders:[core,workflows]`, fixture tree containing `qe/` → `--domain qe` exits 0, no output folder created.
Fixture scope, so the implementer does not overbuild it: the order in `generate()` is release-validate (`getRelease`, which reads the BUILT-IN src/spec/releases.ts, not the fixture — use a real release name) → `loadPluginCatalog` → domain-folder check (new) → `selectSets` → the empty branch. Template and VFS pre-flight run only over the SELECTED sets, so a set that does not match is never template-resolved: the fixture needs a valid release name, a structurally valid catalog, and the one instruction folder the check looks for — no per-target template tree. Also re-tag the existing `missing instruction directory → returns exit code 1 (FR-CLI-0031)` test at generate.test.ts: it exercises `buildVfs` throwing, not this unit.
Effort S. Risk M — an observable exit-code change; no consumer found, but it is a shipped contract.

## 3. FR-CLI-0042 — Progress reporting
VERDICT: FIX TEXT. Writing progress to stdout is actively wrong here.
Verified: `initLogger` (src/logging.ts) → pino `transport: pino/file, destination: 2`. Real run `--domain qe`: stdout 0 bytes, stderr 2079 bytes, all progress. Decisive: `buildPipeline` in src/spec/targets.ts threads `out: Writable = process.stdout` into `pluginCopy`/`pluginWrite`; **stdout is the `--dry-run` payload channel** (FR-ARCH-0045). Measured `--dry-run --domain qe`: stdout 2,707,684 bytes of file content, stderr 131,276 bytes of progress. Progress on stdout would corrupt `--dry-run > file`. Nothing consumes stdout (`run_command` in scripts/pre_commit.py inherits stdio and reads the return code only; no workflow invokes the tool).
Text changes:
- statement: "shall emit human-readable progress ... and shall direct error and warning lines to the standard error stream" → "shall emit structured progress (one JSON object per line) for each (set variant × IDE target) pair and major step, naming the set and the IDE target, on the standard error stream together with all error and warning lines; the standard output stream is reserved for `--dry-run` payload (FR-ARCH-0045) and stays empty on a normal run."
- AC1 → "Given: a normal run When: executed Then: one progress line per (set variant × IDE target) appears on stderr naming the set and the IDE target, and stdout is empty."
- new AC2 → "Given: `--dry-run` When: executed Then: the would-write payload appears on stdout and progress remains on stderr."
- Drop "per-plugin counts (copied/renamed/generated)": the emitted field is a single `frames` total. Record the breakdown and TTY pretty-printing in `<notes>` as backlog (priority is Should).
- implementationNotes: `initLogger` (src/logging.ts), `buildPipeline` `out` parameter (src/spec/targets.ts), `pluginWrite` (src/plugin-processors/plugin-write.ts). Flip to Implemented.
Test: optional (verification=Inspection). If wanted: spawn the CLI, assert stdout empty on a normal run and non-empty under `--dry-run`.
Effort S. Risk S.

## 4. FR-CLI-0060 — Comprehensive help
VERDICT: FIX CODE, small.
Verified: `--help` prints a "Plugin sets (--config, --domain)" block that explains the mechanism but never enumerates the descriptor fields. The implementationNotes claim the AC's field list is wrong ("`id`, not `name`") — that claim is STALE: AC4 already lists `name`, and its nine fields are exactly `SET_FIELDS`. Drop that sentence.
Fix: export `SET_FIELDS` (and `VARIANT_FIELDS`, `MANIFEST_FIELDS`) from src/spec/plugin-sets.ts; interpolate them into `program.addHelpText('after', ...)` in src/cli.ts inside the plugin-sets block:
```
  A set descriptor in plugins.json carries exactly these fields:
    <SET_FIELDS.join(', ')>
  A variant carries: <VARIANT_FIELDS.join(', ')>
  A manifest carries: <MANIFEST_FIELDS.join(', ')>
  Any other field is rejected when the catalog loads.
```
Interpolate — never hand-type a second list; that is the same drift trap as FR-SET-0050.
Test: optional (Inspection). `cli.ts` runs `main()` at import, so a test must spawn `--help` as a subprocess and assert each of the nine names appears.
Effort S. Risk S.

## 5. FR-COPY-0011 — Exclude designated source files
VERDICT: FIX TEXT. The code is right; the statement is stale.
Verified: `RULES_EXCLUDES` in src/spec/targets.ts is three entries — `rules/bootstrap.md` (`// r2 MCP mode`), `rules/mcp-files-mode.md` (`// r3 MCP mode`), `rules/local-files-mode.md`. `instructions/r3/core/rules/mcp-files-mode.md` is a real shipped exclusion.
Text changes:
- statement: "The excluded set is the legacy MCP-mode rules `rules/bootstrap.md` and `rules/local-files-mode.md`." → "The excluded set is the three mode-selection rules no plugin ships: `rules/bootstrap.md` (r2 MCP mode), `rules/mcp-files-mode.md` (r3 MCP mode) and `rules/local-files-mode.md`. A target's own `SpecEntry` may extend this list — `copilot-standalone` additionally excludes `rules/speckit-integration-policy.md` from its instructions entry."
- AC1: add `rules/mcp-files-mode.md` to the disjunction.
- implementationNotes: `RULES_EXCLUDES` (src/spec/targets.ts), `isExcluded` (src/plugin-processors/plugin-process-spec-entries.ts, trailing `/**` = folder prefix). Flip to Implemented; status stays Draft.
Test: tests/unit/plugin-processors/plugin-process-spec-entries.test.ts — assert none of the three appear in output frames. Better: an output assertion that no shipped plugin folder contains `rules/mcp-files-mode.md`.
Effort S. Risk S.

## 6. FR-HOOK-0022 — Preserve unmanaged hook-folder files on sync
VERDICT: FIX TEXT (notes only). **The audit is wrong.** AC2 is implemented AND tested.
Verified three ways:
- `pluginSyncBundles` (src/plugin-processors/plugin-sync-bundles.ts) calls `sweepUndeclaredBundles` UNCONDITIONALLY, outside the deterministic-hooks copy block. The helper deletes only a `.js` that is `declared` or present in `bundleSourceDir`; `hooks.json`, non-`.js`, and unrecognised `.js` survive.
- `npx vitest run tests/unit/plugin-processors/plugin-sync-bundles.test.ts` → 12 passed, including `describe('pluginSyncBundles — sweeps bundles the set no longer declares')` with `r3: removes a previously-shipped bundle that the set has since dropped`, `r3: a set that dropped hooks entirely has its whole bundle set swept`, `preserves unmanaged files: a non-bundle .js and a non-.js file both survive`, `r2: sweeps every managed bundle`.
- Two-pass real build (deterministic-hooks true, `--domain core`, then again with a `--config` catalog dropping `loose-files`/`md-file-advisory`): both stale bundles gone, exit 0.
Nuance to record: the two-pass run logged NO sweep line, because `pluginCleanup` — first in `buildPipeline` — `fs.rmSync`s the whole destination folder before the pipeline runs. In the CLI pipeline the sweep is defence-in-depth for direct library callers. Cross-run survival of a hand-added file in an output hook folder is NOT a property of the CLI pipeline; the statement is scoped "When placing hook bundles", so the unit holds at that scope.
Text change: implementationNotes → `pluginSyncBundles` / `sweepUndeclaredBundles` (src/plugin-processors/plugin-sync-bundles.ts), tests named above; add the pluginCleanup sentence. Flip to Implemented. No code change.
Effort S. Risk S.

## 7. FR-SET-0050 — `requires` is metadata, never composition
VERDICT: FIX CODE — but VALIDATE, do not derive. Plus a small statement/AC edit.
Verified: `readSets` (src/spec/plugin-sets.ts) reads `set.requires` only to check each entry names a declared set and that no set requires itself. `buildSpecsForSet` (src/spec/targets.ts) composes `description: set.manifest.description + variant.manifestDescriptionSuffix` — the "Requires Rosetta Core and Workflows" wording is hand-authored in plugins.json. Confirmed in a real dry-run: `qe-claude/.claude-plugin/plugin.json` → `"description": "Rosetta QE - test automation and quality-engineering workflows. Requires Rosetta Core and Workflows."`
Why validation beats derivation: the prose is better than anything generated ("Requires Rosetta Core and Workflows" vs. a bolted-on "Requires: core, workflows"), the description would then have two sources for one fact, and derivation changes shipped manifest bytes in every domain plugin. A load-time check closes the trap the owner named — a `requires` edit that forgets the description — at the exact moment the edit is made.
Fix: src/spec/plugin-sets.ts, `readSets`, inside the EXISTING `for (const req of set.requires)` loop, after the declared-set check:
`if (!new RegExp(`(?<![a-z0-9-])${req}(?![a-z0-9-])`, 'i').test(set.manifest.description)) fail(...)` with
`<file>: plugin set "<set>" requires "<req>", but its manifest.description does not mention it. `requires` is install-time metadata whose only delivery is the description — add it there, or drop the requires entry. Description: "<description>".`
Check the BASE description, not the variant-suffixed composite (suffixes only append). Do NOT use `\b`: it treats `-` as a boundary, so a set named `read-once` would match inside "read-once-shared". The shipped catalog has no hyphenated set names, but the guard costs nothing.
Verified the shipped catalog passes: workflows→core "Core"; qe/search/modernization→core "Core", workflows "Workflows"; rosetta and core have `requires: []`.
Text changes:
- statement: "The generator shall name every entry of it in that set's generated manifest description" → "The generator shall require that the set's declared `manifest.description` names every entry of it, refusing to load a catalog whose description omits one, and shall otherwise let it affect nothing:" (rest unchanged).
- rationale: add one line — the description is authored, not generated; the generator enforces the invariant rather than composing the sentence, because generated prose reads worse and would duplicate the fact.
- keep AC2 as the observable outcome; add `<criteria id="FR-SET-0050.AC5" ears="unwanted" if="a set's requires names a set whose name does not appear in that set's manifest.description" system="the generator" shall="abort at catalog load naming the set and the missing entry, before any output is written"/>`
- implementationNotes → `readSets` (src/spec/plugin-sets.ts) for validation, `buildSpecsForSet` (src/spec/targets.ts) for the composition. Flip to Implemented.
Test: tests/unit/spec/plugin-sets.test.ts — fixture with `requires:['core']` and a description omitting "core" throws `PluginCatalogError` whose message names both; and the shipped plugins.json still loads. Add an output assertion in tests/unit/generate.test.ts that a built `qe-*` manifest description contains "Core" and "Workflows" (a spec-shape assertion is what let this class of bug through before).
Effort S. Risk M — a new hard failure at catalog load; verified the shipped catalog passes, but any downstream fork's plugins.json could now be rejected.

## 8. FR-VAR-0030 — Copilot output
VERDICT: OWNER DECISION. This is a #315 REGRESSION, not stale prose — do not close it by editing the text alone.
Verified current state: `rosetta-copilot/hooks.json`, `.github/plugin/hooks.json` and `hooks/hooks.json` are all 24,443 bytes, MD5 `fc2982d6a0f83a94713ba85fb9688095`; `hooks/hooks.json` carries a 3-entry `sessionStart`. Mechanism: both `template-copilot/.github/plugin/hooks.json.tmpl` and `template-copilot/hooks/hooks.json.tmpl` are the single line `{{{hooks_json}}}`; `HOOK_LAYOUTS` (src/spec/hook-layouts.ts) keys the assembled document by TARGET, so one document serves every tmpl under a target; `mirrors: [{from:'.github/plugin/hooks.json', to:'hooks.json'}]` (src/spec/targets.ts, copilot) makes the third copy.
Verified it is a regression: `git show <pre-315>:src/rosettify-plugins/plugins/core-copilot/hooks/hooks.json.tmpl` is the STANDALONE form — literal `"sessionStart": []` and `node ".github/hooks/<module>.js"` commands; the shipped pre-315 `plugins/core-copilot/hooks/hooks.json` was `{"version":1,"hooks":{"sessionStart":[]}}`. docs/ARCHITECTURE.md still says "copilot — `.github/plugin/hooks.json.tmpl` (plugin) + `hooks/hooks.json.tmpl` (standalone)". #315's parity gate is PATHS only, so a content change here could not be caught.
Impact assessed as LOW: no manifest points at it (no template plugin.json declares `hooks`; only cursor's does, at `./hooks/hooks.json`), and docs/hooks/copilot.md lists Copilot's read locations as `.github/hooks/*.json` and `.claude/settings*.json` — nothing reads `<plugin>/hooks/hooks.json`. `rosetta-copilot-standalone/.github/hooks/hooks.json` is still correctly the 60-byte empty form, produced from the same tmpl via `standaloneTemplates: [['hooks/hooks.json.tmpl','.github/hooks/hooks.json.tmpl']]` under the `copilot-standalone` layout (`payload: 'empty'`).
Options, with a default:
- (A) DEFAULT — FIX CODE, suppress. Stop emitting `hooks/hooks.json` from the `copilot` marketplace target; copilot-standalone is unaffected because `pluginCopy` reads the tmpl from `sourceDir` directly for standalone targets. `pluginCopy`'s main-target branch (`collectTmplFrames` + `copyDirRecursive`) has no per-target preserved-file exclude, so this needs a new `PluginSpec` field (e.g. `preservedExcludes: string[]`) honoured by both, or moving the standalone tmpl out of the shared template folder. Then FIX TEXT: "exactly three `hooks.json` files" → "exactly two", drop AC4's `hooks/hooks.json` clause and point it at copilot-standalone's `.github/hooks/hooks.json`. Effort M, Risk M — changes the shipped output path set, which NFR-0001 parity asserts.
- (B) Restore pre-315 content by keying the assembled document per template path as well as per target. Rejected as default: a bigger refactor (`hooks_json` is one render-context key per spec), and it would put `.github/hooks/` command paths in a folder whose bundles actually live at `hooks/` — wrong in the other direction.
- (C) FIX TEXT only, ratifying current behaviour. Cheapest, but it ratifies an unreviewed change that contradicts docs/ARCHITECTURE.md and CHANGES.md's own account. Acceptable only as an explicit owner choice, and it must also correct docs/ARCHITECTURE.md lines describing `hooks/hooks.json.tmpl` as the copilot standalone template.
Note: CHANGES.md deferred hooks.json suppression because "an IDE manifest points at it" — that rationale is Cursor's and does NOT apply to this file.
Test (option A): tests/e2e or tests/unit/spec/targets-* — assert a built `*-copilot` folder contains exactly `hooks.json` and `.github/plugin/hooks.json` and no `hooks/hooks.json`, while `*-copilot-standalone/.github/hooks/hooks.json` still parses with an empty `sessionStart`.
Effort M. Risk M.

## Summary
| Unit | Verdict | Effort | Risk | Recommendation |
|---|---|---|---|---|
| FR-CLI-0030 | FIX CODE | S | S | DO NOW (with 0031) |
| FR-CLI-0031 | FIX CODE | S | M | DO NOW (with 0030) |
| FR-CLI-0042 | FIX TEXT | S | S | DO NOW |
| FR-CLI-0060 | FIX CODE | S | S | DO NOW |
| FR-COPY-0011 | FIX TEXT | S | S | DO NOW |
| FR-HOOK-0022 | FIX TEXT (notes only) | S | S | CLOSE NOW — audit wrong |
| FR-SET-0050 | FIX CODE (validate) + text | S | M | DO NOW |
| FR-VAR-0030 | OWNER DECISION (default: FIX CODE suppress + text) | M | M | DEFER pending decision |

## Sequencing
1. FR-HOOK-0022 (notes only) — closes immediately, no code.
2. FR-CLI-0030 + FR-CLI-0031 — one commit. 0031 alone would make `--domain typo` exit 0 silently.
3. FR-COPY-0011, FR-CLI-0042 — independent text fixes, any order.
4. FR-CLI-0060 — exports `SET_FIELDS`; independent.
5. FR-SET-0050 — independent; touches the same file as 0030's `parseDomainTokens` export, so sequence after step 2 to avoid a merge conflict in plugin-sets.ts.
6. FR-VAR-0030 — blocked on the owner's choice among A/B/C. Ships with a docs/ARCHITECTURE.md correction either way.

## Anomalies
- The corpus holds **13** `ToBeModified` units, not 10. The three extra carry `ticketId=""` and are unrelated to #315: `NFR-0007` (per-vocabulary model-normalization processors replace `fileNormalizeModels`), `FR-CLI-0021` (clean-architecture CLI source model, RECON-9), `FR-COPY-0033`. "10" is the 315-scoped count. They were not in scope and are not specified here.
- `FR-CLI-0060` `<implementationNotes>` complains the AC names the identity field `id` rather than `name`. Stale — AC4 already reads `name`, and its nine names are exactly `SET_FIELDS`. Delete that sentence with the fix.
- `tests/unit/generate.test.ts` has `it('missing instruction directory → returns exit code 1 (FR-CLI-0031)')`, but it exercises `buildVfs` throwing on a missing instruction directory, not the domain-filter empty-selection rule. Re-tag it.
- `FR-CLI-0034` `<implementationNotes>` records AC5 as PARTIAL (a `--config` naming a directory surfaces raw `EISDIR` rather than a usage report). Unit is marked `Implemented`. Not in scope, flagged as pre-existing.

## Discoveries
- **stdout is already committed to something else.** `buildPipeline` (src/spec/targets.ts) threads `out: Writable = process.stdout` into `pluginCopy` and `pluginWrite`; a `--dry-run` run measured 2,707,684 bytes of file payload on stdout. This single fact settles FR-CLI-0042 against the requirement.
- **The FR-HOOK-0022 sweep landed and is tested.** `sweepUndeclaredBundles` runs unconditionally; 12/12 tests pass in plugin-sync-bundles.test.ts including a four-test sweep block. The audit describes the pre-fix state.
- **`pluginCleanup` wipes the whole destination folder first**, so in the CLI pipeline the bundle sweep never has anything left to sweep — it is defence-in-depth for direct library callers. A hand-added file in an output hook folder does NOT survive a run; the unit's statement is scoped to the sync step, so it still holds.
- **FR-VAR-0030 is a #315 content regression**, proved from git: the pre-315 `hooks/hooks.json.tmpl` under the copilot template was the standalone form. #315's parity gate compares PATHS only, which is exactly why it passed.
- **Nothing in the repository consumes the generator's stdout.** `scripts/pre_commit.py` `run_command` is `subprocess.run(command, cwd=REPO_ROOT, check=False)` — stdio inherited, only `returncode` read — and no workflow under `.github/workflows/` invokes the generator at all. Every "safe to change" claim above rests on this.

## Inconsistencies
- `docs/ARCHITECTURE.md` ("copilot — `.github/plugin/hooks.json.tmpl` (plugin) + `hooks/hooks.json.tmpl` (standalone)") contradicts the shipped `rosetta-copilot/hooks/hooks.json`, which is now byte-identical to the plugin form. Whichever FR-VAR-0030 option is chosen, ARCHITECTURE.md must change with it.
- `FR-CLI-0042`'s statement is silent on where progress goes; only AC1 demands stdout. The statement and its criterion disagree in force — the recommended text fix makes them agree on stderr.
- `FR-HOOK-0022`'s `<implementationNotes>` contradicts the code and the passing test file it would have to name.

## Insights
- Both genuinely-"either" cases resolve the same way, and it is worth naming as a corpus rule: **prefer enforcing an invariant over generating the artifact that satisfies it.** FR-SET-0050 validates an authored description rather than composing one; FR-CLI-0060 interpolates `SET_FIELDS` rather than hand-typing a parallel list. Generation duplicates the fact; enforcement keeps one source and fails at the moment of the edit.
- FR-VAR-0030 is the argument for extending the parity gate: a path-set oracle cannot see a document whose content changed shape. A content hash over the `hooks.json` family, per (set × target), would have caught it in the #315 PR.
- Five of the eight are S/S. The expensive judgement is concentrated in one unit (FR-VAR-0030) and one behavioural contract change (FR-CLI-0031's exit code) — worth handling as two separate reviews rather than folding them into a single "fix the ToBeModified backlog" commit.
