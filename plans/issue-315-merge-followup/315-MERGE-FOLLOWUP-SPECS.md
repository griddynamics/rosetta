# 315 merge follow-up — Tech Specs (WHAT)

<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

## TLDR

- Revision 3. It folds in:
  - the owner's G0 answers (`agents/TEMP/315-merge-followup/coding-flow-state.md:44-61`);
  - the G0-bis answers (`:63`);
  - the new git state (`:62`, `:64-69`);
  - the plan review (`plans/issue-315-merge-followup/plan-review.md`, findings F-01…F-24, owner decisions D1–D10).

  Section **R** lists every revision item.
- Tracks A–F of the approved design (`plans/issue-315-merge-followup/architecture-notes.md`, "AN"), plus:
  - track **V**: `scripts/verify/`, `pre_commit.py` wiring;
  - track **P**: plugin-relative README paths (owner D1).
- **V** moves 3 checks to `scripts/verify/` and adds `ac_counts.py` and `ac_links.sh`. Both new checks read ONE shared data file, `docs/definitions/live_counts.json` (scope, link allowlist, count rules and sites). Roots derive from the script location. `pre_commit.py` gains `build_checks()`, `main(argv)` and `--only`, and runs 5 verify steps after "plugin sync". `ac_equivalence.py` stays manual.
- **P** has no generator change. The 20 READMEs / 23 references under `instructions/r3` that name `instructions/r3/...` become plugin-relative. The rule is written into `pa-schemas.md`.
- **A** restores the template test. `hooks-registered` becomes two-way over all 33 hook documents of the 21 hook-carrying folders, with a census guard. `hook-set-isolation.test.ts` is new.
- **B** is content-aware:
  - layer 1 = main's exact lines (31 skills);
  - layer 2 = branch-authored edits (P + E), strict or presence.
- **C/D/E** align counts, fix dead references, and fix repo automation paths.
- **F** keeps the zip names and `-<DATE>`. The release body is generated and replaced on every run: per IDE, 3 blocks separated by `<!-- -->`.

## 0. Authority, conventions, invariants

- Authority order:
  1. owner G0 and G0-bis answers, and the owner-directed git state (`coding-flow-state.md:44-69`);
  2. owner decisions (`:25-42`);
  3. this SPECS;
  4. `plan-review.md`;
  5. AN.

  D1–D25 (`plans/issue-315-plugin-sets/follow.md:165-193`) are settled. In this file "D1…D10" means the review's owner decisions (`plan-review.md:65-74`), not follow.md's.
- **[F]** = fact, with a `path:line` or command proof. **[A]** = assumption. `§X.Y` = this file.
- Root: `/Users/isolomatov/Sources/GAIN/rosetta-manual-branch`, branch `feat/315-plugin-sets`, **HEAD `7b3e7426`** [F]. The owner made these local commits; none is pushed (`coding-flow-state.md:64-69`):
  - `0ad95943`: the merge of `origin/main`, committed as it was staged;
  - `5c97c1ed`: `docs/requirements` → `docs/REQUIREMENTS1` (intermediate);
  - `7b3e7426`: → `docs/REQUIREMENTS`, plus the references in 28 files.
- `.git/MERGE_HEAD` is gone. Nothing is staged.
- Unstaged [F]: 294 `plugins/` READMEs, `.claude/skills/merge-main/SKILL.md`, `scripts/pre_commit.py` (296 ` M`).
- Untracked: `plans/issue-315-merge-followup/`.
- Git hooks are disabled for this clone: `core.hooksPath=/dev/null` (`coding-flow-state.md:62`). Leave it as it is.
- **INV-1** No commit, push, tag, release, `git add`, `git mv`, `git stash`, `git reset`, `git checkout`, or `git config` (`core.hooksPath` included). End to end:
  - HEAD stays `7b3e7426`;
  - nothing is staged (`git diff --cached --quiet`);
  - the remote branch is unchanged.

  The one allowed write is `git restore --worktree --source=7b3e7426 -- <path>`. It is for rolling back a session's own edits to a tracked file that had no unstaged edits at S0. It never touches the index.
- **INV-2** `plugins/` is written ONLY by the local generator at posture false (§9). Never by hand, never by `npx`, never by the full `scripts/pre_commit.py`.
- **INV-3** Mutations run only on scratch copies under `agents/TEMP/315-merge-followup/scratch-*` (gitignored, `.gitignore:113` [F]).
- **INV-4** History is not edited: `CHANGELOG.md`, `**/CHANGES.md`, `docs/stories/**`, `docs/reviews/**`, `archive/**`, `instructions/r2/**`, `agents/TEMP/315-golden/**`, and `agents/IMPLEMENTATION.md` except line 159.
- **INV-5** Generated files are never hand-edited: `plugins/**`; `docs/web/llms-full.txt` (a CI copy, `.github/workflows/pages.yml:40-41` [F]); `docs/web/user-guide/**`; `docs/github-stats.json`.
- **INV-6** Files with unstaged edits at S0 are backed up before editing and are never restored with git, because a git restore would destroy the earlier edit [F]: `scripts/pre_commit.py`, `.claude/skills/merge-main/SKILL.md`, and the 294 plugin READMEs. The same applies to untracked files (`plans/issue-315-merge-followup/**`, scratch) and to S2's moved files (moved back with `mv`).
- **INV-7** Any `instructions/**` edit after S8 (regeneration) forces S8 and S9 to re-run (F-23).

## 1. Vocabulary and computed values

Reference: `docs/CODEMAP.md:157-161`; AN §1. Recomputed with the §2.6 rules [F]:

| key | value | per set (core/workflows/qe/search/modernization) |
|---|---|---|
| skills | 42 | 36/0/2/4/0 |
| workflows (entry points) | 17 | 3/9/4/0/1 |
| workflow_files | 70 | 17/17/27/0/9 |
| request_types | 15 | = 17 − `aqa-flow` (router) − `coding-light-flow` (variant) |
| rules | 5 | 5/0/0/0/0 |
| agents | 10 | 0/10/0/0/0 |
| agent_files | 20 | 0/20/0/0/0 |

- Canonical sentence (byte-identical at every site): `(42 skills, 17 workflows, 10 agents, 5 rules)`.

## 2. Track V — verification toolkit

### 2.1 Target layout

| Path | Status | Pre-commit step | Owner |
|---|---|---|---|
| `scripts/verify/ac_structure.sh` | moved from `plans/issue-315-plugin-sets/verify/` with plain `mv`; changed | `verify structure` | S2 |
| `scripts/verify/ac_crossrefs.py` | moved; root fix only | `verify crossrefs` | S2 |
| `scripts/verify/ac_hooks_content.py` | moved; changed | `verify hooks content` (posture false) | S2 |
| `scripts/verify/ac_counts.py` | new | `verify counts` | S7 |
| `scripts/verify/ac_links.sh` | new | `verify links` | S7 |
| `docs/definitions/live_counts.json` | new; shared data for both new checks (D6) | — | S7 |
| `plans/issue-315-plugin-sets/verify/ac_equivalence.py` | stays; changed (B) | none: the snapshot is local-only | S9 |
| `plans/issue-315-plugin-sets/verify/{permitted_content.json,gen_permitted_content.py}` | new (B) | none | S9 |

### 2.2 Common contract (every check)

- Root derivation. No literal `/Users/` in any check:
  - `scripts/verify/*.py`: `ROOT = pathlib.Path(__file__).resolve().parents[2]`
  - `scripts/verify/*.sh`: `ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"`
  - `plans/issue-315-plugin-sets/verify/*.py`: `parents[3]`
  - Trap: `ac_hooks_content.py:35` uses `parents[3]` today, which is wrong at the new depth.
- Result must not depend on cwd. A copy placed at `<S>/scripts/verify/<check>` checks `<S>`, never the real repo. That is the scratch mutation mechanism.
- Exit codes: `0` pass, `1` findings, `2` usage/environment error. Last stdout line: `<NAME>: ALL PASS` or `<NAME>: FAILURES PRESENT`. Every failure line names `path[:line]`.
- Read-only on the repo. Temp files go only to `${TMPDIR:-/tmp}` via `mktemp`.
- Python: stdlib only, runs under `venv/bin/python` 3.12.13 and `python3` 3.14 [F].
- Bash: `/bin/bash` 3.2.57 plus BSD grep 2.6.0 [F]. No `mapfile`, `declare -A`, `${x,,}`, `grep -P`, or GNU-only `sed`. `jq` is available (`/usr/bin/jq` [F]) and is required by `ac_links.sh`; if missing, exit 2.
- Trap: in the agent's zsh, `grep` is ugrep 7.8.4 [F]. Always run checks with `bash <file>` or `python3 <file>`.
- shellcheck:
  - new `ac_links.sh`: `shellcheck` clean;
  - moved `ac_structure.sh`: `shellcheck -S warning` rc=0 (F-09: it has 16 info findings today [F], in unchanged code).

### 2.3 `ac_structure.sh`

- New `--tree DIR` (default `$ROOT/plugins`). AC1 folder checks read `--tree`; AC4/AC9 read `$ROOT`.
- **AC1 generator-call rule** (conflict §11.1, refined per F-17). Count the NON-comment lines (`^\s*#` excluded) of `$ROOT/scripts/pre_commit.py` that contain the bare token `rosettify-plugins`. Must be exactly 1: today line 90 [F]; lines 87 and 89 are comments. The bare-token count including comments is 3, which is why today's gate is red [F].
- Trap for S10: new `pre_commit.py` code must not put `rosettify-plugins` in any non-comment line.
- AC4, AC9 and the per-folder printout are unchanged (`:27-62`).

### 2.4 `ac_crossrefs.py`

- `ROOT` (`:13`) becomes `pathlib.Path(__file__).resolve().parents[2] / "instructions/r3"`. Behaviour otherwise identical: `CROSSREFS: ALL PASS` today [F].

### 2.5 `ac_hooks_content.py`

- `ROOT = parents[2]`. New flags:
  - `--golden DIR` (default `$ROOT/agents/TEMP/315-golden`);
  - `--require-golden`.
- **No silent skips** (F-08):
  - a nonexistent `--tree` is exit 2;
  - every expected folder must exist, or it is a FAIL `missing folder <plugin>`. This replaces the silent `return` at `check_plugin` `:108-110`. Expected folders: {`core`, `rosetta`, `rosetta-light`} × 7 targets, plus `NO_HOOK_SETS` × 7 targets;
  - the assertion count is printed; a count of 0 is a FAIL.
- **`NO_HOOK_SETS = ["workflows","qe","search","modernization"]`** (AN A.4.5). Per folder, at both postures: 0 `hooks.json` and 0 `*.js` outside `*/skills/harness/references/hooks/*`. 1 assertion per folder (28).
- **Golden cross-check outcome** (owner item 6). Exactly one state, printed in the section header and in the final line:
  - `RAN` (posture false, snapshot present): per-file PASS/FAIL, as today (`:216-231`);
  - `NOT RUN — snapshot absent at <path>`: 0 assertions counted; with `--require-golden` it is a failure;
  - `NOT APPLICABLE — posture=true`.
  - Final line: `HOOKS CONTENT: ALL PASS (golden cross-check: <state>)`. The word `skipped` never appears.
- Docstring: new path and flags; the scratch example is `agents/TEMP/315-merge-followup/scratch-true`.

### 2.6 `docs/definitions/live_counts.json` (D6: the single shared definition)

Shape (keys are exact; the values shown are the initial content):

```json
{
  "schema": 1,
  "scope": {
    "root_globs": ["*.md", "llms-full.txt"],
    "dirs": ["docs", "user-guide", ".github"],
    "extensions": ["md","txt","yml","yaml","json","jsonl","html","sh","py","js","css","toml"],
    "exclude_prefixes": ["CHANGELOG.md", "docs/stories/", "docs/reviews/", "docs/web/llms-full.txt",
                         "docs/github-stats.json", "docs/definitions/live_counts.json",
                         "docs/web/_site/", "docs/web/vendor/", "docs/web/.jekyll-cache/"],
    "exclude_basenames": ["CHANGES.md"],
    "exclude_dir_names": ["node_modules"]
  },
  "links": {
    "release": "r3",
    "allowlist": [
      {"prefix": "instructions/r3/core/rules/bootstrap-", "reason": "prefix glob"},
      {"prefix": "instructions/r3/core/rules/example.md", "reason": "sample, .github/prompts/prompt-comparison.md"},
      {"prefix": "instructions/r3/core/skills/example.md", "reason": "sample, .github/prompts/prompt-comparison.md"},
      {"prefix": "instructions/r3/core/rules/deleted-rule.md", "reason": "sample, .github/prompts/prompt-comparison.md"},
      {"prefix": "instructions/r3/core/skills/my-skill/", "reason": "sample, docs/definitions/folder-structure.md:15"},
      {"prefix": "instructions/r3/aqa/", "reason": "example, docs/REQUIREMENTS/plugin-generator/FR-SET.md:80"}
    ],
    "plugin_relative": {
      "root": "instructions/r3",
      "forbidden": "instructions/r3/",
      "allow_files": ["instructions/r3/core/rules/local-files-mode.md"]
    }
  },
  "counts": {
    "sets": ["core", "workflows", "qe", "search", "modernization"],
    "request_type_exclusions": {"aqa-flow": "router", "coding-light-flow": "variant of coding-flow"},
    "banned": ["~[0-9]+ (SDLC )?workflow", "WORKFLOWS \\(~", "[0-9]+\\+ (structured )?workflows",
               "[0-9]+ workflow types", "30 skills", "(thirteen|Seventeen|fifteen) workflow types"],
    "sites": [ {"id": "C2", "path": "docs/ARCHITECTURE.md", "template": "(…)", "count": 1} ]
  }
}
```

- Scope semantics, implemented identically by both checks:
  - file list = files matching `root_globs` at the root, plus the recursive contents of `dirs`;
  - keep only files whose extension is in `extensions`;
  - drop any path that starts with an `exclude_prefixes` entry;
  - drop any file whose basename is in `exclude_basenames`;
  - drop any file with a path component in `exclude_dir_names`;
  - the list is sorted. Paths only; `grep -I` is a second guard.
- `live_counts.json` excludes itself from the scope. Otherwise its own allowlist text would satisfy the two-way allowlist rule and its patterns would feed the banned scan.
- `sites[]` = §5.3, with `id`, `path`, `template` and `count`.
- Both checks exit 2 on: a missing file, invalid JSON, an unknown `schema`, or a missing key.
- `ac_links.sh --list-files` and `ac_counts.py --list-files` print the resolved scope. S13 diffs them as a consumer test of the one definition; this is not a second definition.

### 2.7 `ac_counts.py`

- Computes §1 from `$ROOT/instructions/r3`:
  - `clean(name)` removes a `~…~` directive;
  - skills = directories in `*/skills/`;
  - workflow_files = distinct `clean` names of `*/workflows/*.md`;
  - workflows = distinct `clean` names whose front-matter `tags:` list has an element equal to `workflow`. Element match, not substring: `workflow-phase` is no match;
  - request_types = workflows − `request_type_exclusions`. Every exclusion must exist, else FAIL;
  - rules and agents = distinct `clean` names; agent_files = the raw count.
- The directories under `instructions/r3` must equal `counts.sets`, else FAIL.
- SITES: render `template` with the computed values: `{skills}`, `{set:core:skills}`, `{word:request_types}` → `fifteen`, `{Word:workflows}` → `Seventeen`. The rendered string must occur exactly `count` times in `path`. So a wrong number fails, and a reworded sentence fails with "0 occurrences".
- BANNED: each regex (Python `re`) has 0 hits over the scope.
- Output: the computed table; each site `PASS|FAIL <id> <path>:<line>`; each banned hit `path:line`. Final line `COUNTS: …`.

### 2.8 `ac_links.sh`

- Scans every file in the scope.
- Normalization first:
  - `https?://github.com/<o>/<r>/(blob|tree|raw)/<ref>/instructions/` → ` instructions/`
  - `(\.\./)+instructions/` → ` instructions/`
- Token: `instructions/<release>/[A-Za-z0-9/_.~-]*` with left boundary = line start or a character outside `[A-Za-z0-9_.-]`. **A leading `/` is a valid boundary (D4).**
  - So `/instructions/r3/core/skills/my-skill/SKILL.md` (`docs/definitions/folder-structure.md:15` [F]) is extracted and matched by its allowlist entry, and a dead `/instructions/r3/x` is caught.
  - `agents/instructions/r1/local.md` is never extracted: wrong release.
  - Trailing `.,:;)` is stripped.
- A token resolves if `test -e "$ROOT/<token>"`. A glob truncates to its literal prefix directory.
- Allowlist from `live_counts.json`. Two-way: an entry with 0 occurrences is a FAIL.
- Output: `DEAD <path>:<line> <token>`, then `scanned= tokens= resolved= allowlisted= dead=`. Final line `LINKS: …`. Runtime < 10 s (prototype 2.5 s [F, review]).
- Baseline with the D4 boundary [F, `agents/TEMP/315-merge-followup/scratch-links-proto-slash.sh`]: 94 dead occurrences, 10 allowlisted (4 `bootstrap-`, 4 samples, `my-skill`, `aqa/`), 84 outside the allowlist.
- Every one of the 84 maps to a planned fix site: README (6), `.github/` (9), web (69). So `dead=0` is reachable [F].
- **Rule L2: plugin-relative guard** (Q1 = YES; `coding-flow-state.md:63`). Runs on every commit as part of `verify links`.
  - It scans every file under `links.plugin_relative.root`; `grep -I` skips binaries.
  - Any occurrence of the substring `instructions/r3/` is `FAIL L2 <path>:<line>`, unless the file is in `allow_files`.
  - It targets `instructions/<release>/` paths only. A workspace or repo path such as `docs/REQUIREMENTS` (Q2) is not affected. Neither is the release-agnostic rule text in `pa-schemas.md` (§7a), which has no `r3` literal.
  - The summary adds `l2_violations=N`.
  - Today [F]: 23 violations in 20 READMEs. They are expected red until S6, then 0 (AC-P1).

### 2.9 `scripts/pre_commit.py` wiring (D2)

- `build_checks() -> list[Check]` returns what `main()` builds inline today. The existing 4 entries and the comment at `:84-89` stay unchanged, compared by content (F-18).
- Insert 5 entries right after `plugin sync`, in this order: `verify structure`, `verify crossrefs`, `verify hooks content`, `verify counts`, `verify links`.
  - Python via `[sys.executable, path]`; bash via `shutil.which("bash")` (missing: ERROR and return 1).
  - `ac_hooks_content.py` runs with no flags: posture false, golden not required.
  - `ac_equivalence.py` is not wired.
- `main(argv: list[str] | None = None) -> int`.
- `--only NAME` (repeatable) runs the named checks in declared order. `NAME` matches a check name or its slug (spaces → `-`, e.g. `verify-links`), so no quoting is needed (F-04).
- An unknown `NAME` prints the valid slugs and returns **64** (`EX_USAGE`), a code no check returns (F-04).
- No arguments: behaviour identical to today. `.githooks/pre-commit` calls it with no args [F, review].

### 2.10 Path-reference updates for the moved/new checks

- Rewrite rule:
  - `plans/issue-315-plugin-sets/verify/{ac_structure.sh,ac_crossrefs.py,ac_hooks_content.py}`, and `verify/<same>`, become `scripts/verify/<same>`;
  - `plans/issue-315-merge-followup/verify/{ac_counts.py,ac_links.sh}` become `scripts/verify/<same>`;
  - `ac_equivalence.py` paths stay;
  - a directory-level mention of `plans/issue-315-plugin-sets/verify/` gets a note that it now holds only `ac_equivalence.py` and its manifest.
- Bare filenames stay. **Edits are in place, and no line is added or removed**: this SPECS and the PLAN cite these files by line number.

| File | Sites [F] |
|---|---|
| `plans/issue-315-plugin-sets/follow.md` | 23, 89, 272-273 |
| `plans/issue-315-plugin-sets/hooks-architecture.md` | 308 |
| `agents/TEMP/315-execution-state.md` (untracked) | 35, 37, 38, 42, 66, 244, 252, 348 |
| `docs/REQUIREMENTS/plugin-generator/NFR.md` | 52 (implementationNotes path only) |
| `docs/REQUIREMENTS/plugin-generator/FR-VAR.md` | 170 (implementationNotes path only) |
| `src/rosettify-plugins/tests/hook-schema/claude-codex.schema.test.ts` | 6 (comment) |
| `src/rosettify-plugins/tests/hook-schema/validator.ts` | 7 (comment) |
| **`plans/issue-315-merge-followup/architecture-notes.md`** (P7) | 10 full-path sites: `plans/issue-315-merge-followup/verify/ac_counts.py` ×2, `…/ac_links.sh` ×3, `plans/issue-315-plugin-sets/verify/ac_crossrefs.py` ×1, `…/ac_hooks_content.py` ×3, `…/ac_structure.sh` ×1. The 3 `ac_equivalence.py` paths stay. 48 bare or full mentions in total [F] |
| **`plans/issue-315-merge-followup/discovery-notes.md`** (P7) | `:66` brace list → `scripts/verify/{ac_structure.sh,ac_crossrefs.py,ac_hooks_content.py}` + `plans/issue-315-plugin-sets/verify/ac_equivalence.py`; `:31` stays (equivalence) |

- Not edited: `docs/REQUIREMENTS/plugin-generator/CHANGES.md:538,606` (history).

### 2.11 Acceptance (V)

- AC-V1 Each check run from `/tmp` reports this repo; a copy under `<S>/scripts/verify/` reports `<S>`. `grep -rn '/Users/' scripts/verify plans/issue-315-plugin-sets/verify` returns nothing.
- AC-V2 A second non-comment `rosettify-plugins` line in a scratch `pre_commit.py` fails AC1. The same text as a comment passes.
- AC-V3 `hooks.json` or `*.js` outside harness in a domain folder fails `ac_hooks_content.py` at both postures. A missing expected folder fails. A nonexistent `--tree` exits 2.
- AC-V4 Snapshot absent → final line says `NOT RUN — snapshot absent`, exit 0. With `--require-golden`, exit 1.
- AC-V5 `ac_counts.py` fails in each of these cases:
  - a site number is changed;
  - a site sentence is reworded;
  - a skill directory is added;
  - a banned form is inserted;
  - an exclusion is missing;
  - `live_counts.json` is invalid (exit 2).
- AC-V6a L2 fails on a scratch README line naming `instructions/r3/core/workflows/help-flow.md`. It passes for the same text in `core/rules/local-files-mode.md`, and for a `docs/REQUIREMENTS` mention.
- AC-V6 `ac_links.sh` reports one `DEAD` per inserted form: link, blob URL, backtick, YAML comment, `../`, and leading `/`. It fails on an allowlist entry with 0 occurrences. It does not extract `$root/agents/instructions/r1/local.md`.
- AC-V7 `pre_commit.py --only <slug>` returns the check's code. Output ends with `Pre-commit failed during <name>.` or `Pre-commit checks passed.`. `--only bogus` returns 64.
- AC-V8 `grep -rnoE '[A-Za-z0-9_./{},-]*verify/[{a-z_,.]*ac_(structure|crossrefs|hooks_content|counts|links)' <§2.10 files> | grep -v 'scripts/verify/'` returns nothing. Line counts of the §2.10 files are unchanged (`wc -l` vs the S0 baseline).

## 3. Track A — hooks tests

### 3.1 `read-once-template-registration.test.ts` (rewrite)

- Templates root: `process.env.ROSETTA_TEMPLATES_DIR ?? <ROOT>/src/rosettify-plugins/plugins` (approved addition).
- Cases = AN A.4.1 (7 rows, keyed by document form). Per case:
  - the read-once command substring;
  - the reset event and command;
  - antigravity has NO `read-once-reset`, with an in-code citation of `docs/hooks/antigravity.md:44`.
- Census: `**/hooks.json.tmpl` equals the 7 paths [F].
- Cross-form markers: the plugin form has `agent-plugins` and not `.github/hooks/`; the standalone form is the reverse (`ac_hooks_content.py:87-88`).
- Structural parse with token stripping (AN A.4.1):
  - `{{#if deterministic_hooks}},{{/if}}` → `,`
  - a guard-only line is dropped
  - `{{{bootstrap_hooks}}}` → `` (empty)
  - Copilot plugin form: `\{{destination}}` → `X`, then `{{destination}}` → `X`
  - `JSON.parse`, then the top-level event keys per case. AN's parse fallback applies only if the parse proves fragile, and it must be recorded.
- Catalog: `hookSupportModules['read-once']` deep-equals `['read-once-reset','read-once-shared']`; `rosetta` and `core` have 6 modules and `bootstrap: true`; the 4 domain sets have `hooks: []` and `bootstrap: false` [F].

### 3.2 `hooks-registered.test.ts` (D5: all hook-carrying folders + census)

- `PLUGINS_DIR = process.env.ROSETTA_PLUGINS_DIR ?? <ROOT>/plugins`.
- Hook-carrying folders are DERIVED from `src/rosettify-plugins/plugins.json`: sets with non-empty `hooks`, × each variant's `destinationSuffix`, × `.targets`. Folder = `<set>-<target><suffix>` → 21 folders [F]. The test never hard-codes that folder list.
- Documents per target (`jsonPath`, `bundleDir`, `manifestPath`), 11 per set → **33 entries** [F: posture-true scratch has 33 `hooks.json` outside harness]:

| target | jsonPath → bundleDir | manifestPath |
|---|---|---|
| claude | `hooks/hooks.json` → `hooks/` | `.claude-plugin/plugin.json` |
| cursor | `hooks/hooks.json` (plugin form) → `hooks/`; `hooks.json` (standalone staging) → `hooks/` | `.cursor-plugin/plugin.json` |
| copilot | `.github/plugin/hooks.json` → `hooks/`; `hooks.json` (root copy of the plugin form) → `hooks/`; `hooks/hooks.json` (standalone staging) → `hooks/` | `.github/plugin/plugin.json` |
| codex | `.codex/hooks.json` → `.codex/hooks/`; `.codex-plugin/hooks.json` → `.codex/hooks/` | `.codex-plugin/plugin.json` |
| antigravity | `hooks.json` → `hooks/` | `plugin.json` |
| cursor-standalone | `.cursor/hooks.json` → `.cursor/hooks/` | `plugin.json` |
| copilot-standalone | `.github/hooks/hooks.json` → `.github/hooks/` | `plugin.json` |

- **Census guard.** For every derived folder, the set of `hooks.json` found outside `*/skills/harness/references/hooks/*` must equal that target's `jsonPath` set. Each of these fails with a named message:
  - a derived folder missing from `PLUGINS_DIR`;
  - a document not in the table;
  - a table entry with no document.
- `NEVER_REGISTERED = {'read-once-shared'}`. `UNREGISTERED_BY_IDE = { antigravity: ['read-once-reset'] }` (it applies to every `*-antigravity*` folder; comment cites `docs/hooks/antigravity.md:44`).
- Referenced hooks = `/([A-Za-z0-9_-]+)\.js(?![A-Za-z0-9])/`. Trap: `plugin.json` contains the substring `plugin.js` [F]. Each referenced name must be a discovered `src/hooks/src/hooks/*.ts` hook, else "unknown hook".
- Posture-shape test, one per entry, never skipped:
  - `shipped`: bundleDir has 0 `*.js` and 0 advisory references;
  - `advisory`: forward (bundles − exceptions ⊆ referenced) and reverse (referenced ⊆ bundles).
  - The branch is printed and asserted; anything else fails.
- The false comment at `:66-69` is removed. `shipsHooks` gates only the forward and reverse rules.

### 3.3 `hook-set-isolation.test.ts` (new)

- Same `PLUGINS_DIR`. The folders are derived from `plugins.json` (sets with empty `hooks`) × targets = 28 [F]. Each exists, and has 0 `hooks.json` and 0 `*.js` outside harness.

### 3.4 Acceptance (A)

- AC-A1 `src/hooks/node_modules/.bin/vitest run --root src/hooks`: 0 failed files. Baseline [F]: `1 failed | 34 passed (35)`, 1435 tests. S1 records the exact final count, and the DoD names it (F-19).
- AC-A2 Each mutation fails its target test (scratch copies via the env overrides):
  - (1) cursor plugin form without `read-once.js`;
  - (2) Copilot plugin form copied over the standalone form;
  - (3) `read-once-reset.js` added to antigravity;
  - (4) an 8th `hooks.json.tmpl`;
  - (5) `hooks.json` in `workflows-claude/`;
  - (6) posture-true: remove the `read-once.js` registration from `rosetta-claude/hooks/hooks.json` → forward rule;
  - (7) posture-true: add `rosetta-claude/hooks/ghost.js` → forward rule;
  - (8) posture-true: delete `rosetta-cursor/hooks/loose-files.js` → reverse rule;
  - (9) `read-once-shared` removed from `NEVER_REGISTERED` (temporary edit, reverted from backup) → forward rule on every advisory entry;
  - (10) delete `rosetta-copilot-standalone-light/.github/hooks/hooks.json` → census;
  - (11) add an extra `rosetta-cursor-light/extra/hooks.json` → census;
  - (12) `rm -rf core-codex` → census.
- AC-A3 With `ROSETTA_PLUGINS_DIR=<posture-true scratch>`, `hooks-registered` and `hook-set-isolation` pass and print `advisory` for all 33 entries. Against `plugins/`, they pass and print `shipped` for all 33.

## 4. Track B — equivalence gate (manual #315 gate)

- `ROOT = parents[3]`. New `--tree DIR` (default `$ROOT/plugins`) and `--golden DIR` (default `$ROOT/agents/TEMP/315-golden`). Module guarded by `if __name__ == "__main__":`.
- Per differing file, the rules are evaluated in this order:
  1. `BRANCH_AUTHORED` strict entries;
  2. path classes (`PERMITTED`, unchanged);
  3. `MAIN_POST_GOLDEN` (layer 1);
  4. otherwise unaccounted, and the `n=0` unified diff is printed.
- **Layer 1.** Manifest skills = main-edited skill READMEs (`git diff --name-only 785054e9 1513c578 -- 'instructions/r3/*/skills/*/README.md'`, 42 [F]) that match no path class: 31 [F]. Accepted when there are 0 deletions and the file's hunks include the manifest hunk (anchor header + ordered added lines).
- **Layer 2 (`BRANCH_AUTHORED`)** covers every shipped file changed since the merge commit `0ad95943`: P, E, and the `docs/REQUIREMENTS` rename (`7b3e7426`). That is 22 files, each rendered into 21 plugin folders [F: scratch build 420 README copies; 21 `pa-schemas.md`; HEAD regeneration diff = exactly 21 `requirements-authoring/README.md` copies]:
  - **strict** (no path class covers them): the 14 READMEs `codemap, dangerous-actions, deviation, orchestration, post-mortem, questioning, risk-assessment, rosetta, self-learning, self-organization, sensitive-data, subagent-directives, solr-extending, solr-query`, plus `skills/coding-agents-prompt-authoring/references/pa-schemas.md`. For each (target folder, file): the golden→current hunk multiset equals {layer-1 hunk, if in the manifest} ∪ {the listed layer-2 hunks}. Any extra hunk fails.
  - **presence** (Q3 = presence-only, `coding-flow-state.md:63`; already blanket-permitted by path classes 14/18/21): the 6 P READMEs `coding-agents-hooks-authoring, coding-agents-prompt-authoring, debugging, load-project-context, natural-writing, testing`, **plus `requirements-authoring/README.md`** (the 2 `docs/REQUIREMENTS` lines from `7b3e7426`; class 21). The listed hunks must be present in every target copy; other hunks stay path-permitted (OQ-B1, out of scope).
  - Entry data per (target folder, file): `removed`, `added` (rendered text, byte-exact), `source` (`instructions/…:line`), `reason`.
  - The data is written by `gen_permitted_content.py branch --tree plugins`. It reads the S8 tree, the golden, and `git diff -U0 0ad95943 -- instructions/r3` (merge commit vs worktree, read-only). That covers both the committed rename and the uncommitted S6 edits. It refuses when a golden→current hunk of a declared file is neither the layer-1 hunk nor maps 1:1 to a source-changed line. The manifest diff is reviewed in S9's loop.
  - The per-target rendering is not assumed. It is recorded by S8 (§9). The planning-time scratch measurement is in `agents/TEMP/315-merge-followup/scratch-d1/render-table.txt` [F].
- Two-way. Each of these fails:
  - a declared file identical to golden;
  - a declared hunk that is absent (strict and presence).
- Report per target: `N path-permitted, M content-permitted, K unaccounted`.
- `permitted_content.json`: sections `main_post_golden` (source refs, `source.commits` required) and `branch_authored`. Deterministic output: sorted keys, 2-space indent, trailing newline.
- `gen_permitted_content.py main --from 785054e9 --to 1513c578 [--check]` reads git only. `--check` covers the `main_post_golden` section.
- AC-B1 Against real `plugins/` after S8: `EQUIVALENCE: ALL PASS`.
- AC-B2 Each of these FAILs with its reason named, on `--tree <scratch copy>`:
  - AN B.6 rows 1-4;
  - row 5 (revert the E line in `orchestration/README.md`);
  - revert one P line in a strict file (`sensitive-data`);
  - revert one P line in a presence file (`debugging`);
  - revert the `docs/REQUIREMENTS` line in a scratch copy of `rosetta-claude/skills/requirements-authoring/README.md` (presence);
  - add an unrelated line to `pa-schemas.md`.
- AC-B3 `main --check` exits 0. After one manifest line is edited in scratch, it exits 1.
- AC-B4 `--tree <posture-true scratch>`: only hooks-family diffs are unaccounted. They are listed, not fixed (OQ-B2).

## 5. Track C — count alignment

### 5.1 Rules

- Vocabulary = §1. Banned forms = `live_counts.json` `counts.banned`. No site is under `instructions/` (AN C.1 RC4 [F]).

### 5.2 Edits (C1–C14 = AN C.4; C15–C18 added at planning time; P1 approved: all 4 count lines change)

| # | Site | Owner |
|---|---|---|
| C1 | `docs/ARCHITECTURE.md:217-223` table + note | S3 |
| C2 | `docs/ARCHITECTURE.md:313` | S3 |
| C3 | `docs/web/docs/architecture.md:282` | S11 |
| C4 | `FAQ.md:123` | S3 |
| C5 | `docs/web/docs/faq.md:129` (mirror C4) | S11 |
| C6 | `docs/SecurityOnePager.md:25` | S3 |
| C7, C8 | `docs/web/roadmap.md:104,105` | S11 |
| C9, C10, C12, C13, C15 | `llms-full.txt:69,133,342,399,208` | S3 |
| C11 | `llms-full.txt:245` unchanged (gated) | — |
| C14 | `agents/IMPLEMENTATION.md:159`: all 6 `advanced` → `workflows` [F]; per-set counts in C10 form. `:157` untouched | S3 |
| C16 | `docs/web/index.md:124` `thirteen workflow types` → C17 text | S11 |
| C17 | `README.md:233` | S3 |
| C18 | `OVERVIEW.md:64` (S3) + `docs/web/docs/overview.md:71` (S11) | S3/S11 |

Exact target strings. These are byte-exact and win over any paraphrase:

```
C1  | Set | Skills | Workflows | Workflow files | Rules | Agents |
    | --- | ------ | --------- | -------------- | ----- | ------ |
    | `core` | 36 | 3 | 17 | 5 | 0 |
    | `workflows` | 0 | 9 | 17 | 0 | 10 |
    | `qe` | 2 | 4 | 27 | 0 | 0 |
    | `search` | 4 | 0 | 0 | 0 | 0 |
    | `modernization` | 0 | 1 | 9 | 0 | 0 |
    | **total (`rosetta`)** | **42** | **17** | **70** | **5** | **10** |
    "Workflows" = entry points (front-matter `tags` contains `workflow`); 15 of them are distinct request types. "Workflow files" = every workflow and phase file.
C2  (42 skills, 17 workflows, 10 agents, 5 rules)
C3  The `rosetta` plugin contains all five sets (42 skills, 17 workflows, 10 agents, 5 rules).
C4  Rosetta covers 17 SDLC workflows (15 distinct request types):
C6  of 17 workflows the user selects per request
C7  17 structured workflows covering the full SDLC
C8  42 skills spanning
C9  one of 17 workflows (15 distinct request types)
C10 core/ (36 skills, 3 workflows / 17 workflow files, 5 rules
    workflows/ (10 agents, 9 workflows / 17 workflow files)
    qe/ (2 skills, 4 workflows / 27 workflow files)
    search/ (4 skills)
    modernization/ (1 workflow / 9 workflow files)
C12 Full plugin `rosetta` = all five sets (42 skills, 17 workflows, 10 agents, 5 rules)
C13 Rosetta = 17 SDLC workflows
C15 9 · WORKFLOWS (17)
C16 one of fifteen request types
C17 one of fifteen request types
C18 Seventeen workflows cover the SDLC
```

- C1 replaces `docs/ARCHITECTURE.md:217-223`. The note follows the table after one blank line. `:215` stays.
- Out of scope, report only: `docs/PATTERNS/shell-proxy-pattern.md:50`; `agents/IMPLEMENTATION.md:98`; `agents/init-workspace-flow-state.md:34`.

### 5.3 `counts.sites` (count = 1 unless stated)

- `docs/CODEMAP.md`:
  - `{skills} skills, {workflow_files} workflow files, {rules} rules, {agents} agents ({agent_files} files)`
  - `{workflows} of the workflow files are entry points`
  - `{request_types} of those`
- `docs/ARCHITECTURE.md`: the 5 per-set rows, the total row, and the C2 canonical sentence.
- `docs/web/docs/architecture.md`: ``The `rosetta` plugin contains`` and the canonical sentence.
- `llms-full.txt`: C9, C10 (5 fragments), C11, C12, C13, C15.
- `FAQ.md` and `docs/web/docs/faq.md`: `Rosetta covers {workflows} SDLC workflows ({request_types} distinct request types)`.
- `docs/SecurityOnePager.md`: C6.
- `docs/web/roadmap.md`: C7, C8.
- `README.md` and `docs/web/index.md`: `one of {word:request_types} request types`.
- `OVERVIEW.md` and `docs/web/docs/overview.md`: `{Word:workflows} workflows cover the SDLC`.
- AC-C1 `ac_counts.py` ALL PASS; 0 banned hits.
- AC-C2 `41 skills` at C2 → FAIL naming `C2 docs/ARCHITECTURE.md`.
- AC-C3 Track C changes no `instructions/**` file.

### 5.4 Pre-commit docs (D3; supersedes P2)

- Content: `scripts/pre_commit.py` runs, in order:
  1. hooks build
  2. plugin sync (`npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false`)
  3. `verify structure`, `verify crossrefs`, `verify hooks content`, `verify counts`, `verify links` (`scripts/verify/`, scope and rules in `docs/definitions/live_counts.json`)
  4. type validation
  5. tests

  `--only <slug>` runs selected steps. `plans/issue-315-plugin-sets/verify/ac_equivalence.py` is a manual #315 gate, not part of pre-commit.

| Site [F] | Change | Owner |
|---|---|---|
| `docs/PATTERNS/pre-commit-plugin-sync.md:18-24` | ordered list 1-4 → the 9 steps above | S3 |
| `docs/PATTERNS/pre-commit-plugin-sync.md:36` (Occurrences; the review cited `:38`, the chain is at `:36`) | arrow chain → the new order; add Occurrences lines for `scripts/verify/` and `docs/definitions/live_counts.json` (`:34-40`) | S3 |
| `DEVELOPER_GUIDE.md:303` | "…regenerates all plugin payloads … and then executes type validation" → names the verify steps, type validation and tests, plus `--only` | S3 |
| `docs/ARCHITECTURE.md:434` | the step sentence → the order above. The bundle-sync clause stays | S3 |
| `docs/web/docs/developer-guide.md:290`, `docs/web/docs/architecture.md:365` | mirrors | S11 |

## 6. Track D — dead links and web sync

### 6.1 Target

- `ac_links.sh` `dead=0`. The web mirrors the final root text, and names the zips `rosetta-<ide>…-*.zip`.

### 6.2 Scope

- = `live_counts.json` `scope` (§2.6).

### 6.3 Root edits (S3)

- `README.md:83,84,120-123` → `instructions/r3/qe/skills/{qa-knowledge,qa-structure}/README.md`, `instructions/r3/search/skills/solr-*/README.md`.
- `docs/ARCHITECTURE.md:39` → `(rosetta-<ide> package)`. Keep the box width.
- `docs/ARCHITECTURE.md:445` → the F text (§8.4).
- `docs/ARCHITECTURE.md:434` → §5.4.

### 6.4 Web edits (S11, via `.claude/skills/sync-web-site/SKILL.md`; G-DWEB = its §3 table, approved before §4)

- Pages:
  - `docs/web/docs/{introduction,architecture,plugins,installation,developer-guide,faq,overview}.md`
  - `docs/web/index.md`, `docs/web/roadmap.md`
  - the 15 `docs/web/docs/*-flow.md`
  - `docs/web/docs/{self-help-flow,help-flow}.md` (P3)
- Content rows:
  - AN D.5;
  - C3, C5, C7, C8, C16, C18-web;
  - the E web rows `architecture.md:385`, `developer-guide.md:406`;
  - zip names `plugins.md:63,94,110,129`, `installation.md:86,118,134,153`, `index.md:266,279,288,299`;
  - `architecture.md:376` (mirror of `:445`);
  - §5.4 web mirrors;
  - `developer-guide.md:44,50` (`core/workflows/coding-agents-prompting-flow.md` → `workflows/workflows/…`);
  - `coding-flow.md`, `init-workspace-flow.md:370`, `requirements-authoring-flow.md:287`;
  - the wider `architecture.md` drift (`:43,286-292,310,353-358,365` still name `core-*` as the full plugin [F]).
- **P3 is decided at G-DWEB:** `self-help-flow.md:17` (its target was deleted under D3) and the false claim at `help-flow.md:22`.
- **Validation is static only (D9).** Body diff per shared heading (SKILL `:144`); spacing re-read (SKILL `:140`). No `bundle install`, no Jekyll server. This is a recorded deviation from SKILL §4 `:77-82`, noted in the G-DWEB table and in `validation.md`.
- AC-D1 `ac_links.sh` `dead=0`.
- AC-D2 (F-20) `grep -rnE 'Download `?core-(cursor|copilot|codex|antigravity)|core-<ide> package' docs/web --include='*.md' | grep -v user-guide` returns nothing. The split `core-*` plugins may still be described.
- AC-D3 Every edited web region maps to an approved G-DWEB row.

## 7. Track E — repo automation paths (repo paths, NOT plugin content)

| Site | Became |
|---|---|
| `.github/prompts/repo-implement-code.md:39`, `repo-implement-plan.md:63` | `instructions/r3/workflows/workflows/coding-flow.md` |
| `.github/workflows/{e2e-testing:205,repo-analysis:143,repo-implement:279,repo-plan:246,repo-triage:220,validate-prompts:262}.yml` | `instructions/r3/workflows/agents/*.md` |
| `.github/scripts/run-test-cases.sh:38` (comment) | `instructions/r3/workflows/agents/*.md` |

- These files live in THIS repo and address its source tree, so they keep repo paths.
- `orchestration/README.md:28` moved to Track P (§7a). It ships in plugins, so under D1 it is plugin-relative.
- `publish-instructions.yml` belongs to F.
- AC-E1 `ac_links.sh` reports 0 dead under `.github/`.

## 7a. Track P — plugin-relative README paths (owner D1; no generator change)

- **Rule.** A README under `instructions/r3/<set>/skills/<skill>/` names shipped files as the plugin sees them, relative to the plugin root: `skills/…`, `workflows/…`, `agents/…`, `rules/…`, and `.` for the root. It never names `instructions/r3/...`. The generator already rewrites plugin-relative tokens per IDE [F]. Excluded: `instructions/r3/core/rules/local-files-mode.md` (2 references). It legitimately reads `instructions/r3`: local mode runs against this repo's source tree.
- **Scope measured [F].** `grep -rn 'instructions/r3' instructions/r3` gives 20 READMEs / 23 lines, plus local-files-mode.md:
  - `core/skills/`: `codemap:46`, `coding-agents-hooks-authoring:35`, `coding-agents-prompt-authoring:53`, `dangerous-actions:32`, `debugging:40`, `deviation:32`, `load-project-context:30`, `natural-writing:42,53`, `orchestration:28,40`, `post-mortem:31`, `questioning:30`, `risk-assessment:33`, `rosetta:28`, `self-learning:33`, `self-organization:31,32`, `sensitive-data:32`, `subagent-directives:31`, `testing:36`
  - `search/skills/`: `solr-extending:31`, `solr-query:45`
- **Transform** (applied in scratch and proven: 23 lines changed, 0 `instructions/r3` left outside local-files-mode [F, `agents/TEMP/315-merge-followup/scratch-d1/apply_d1.py`]):
  - T1, inbound-coupling commands:
    - `grep -rn "<pattern>" instructions/r3/core --include="*.md"` → `grep -rn "<pattern>" . --include="*.md"`
    - **`coding-agents-prompt-authoring:53` (Q2, `coding-flow-state.md:63`).** The search scope becomes `. docs/REQUIREMENTS` (plugin root plus the workspace requirements folder). The 3 `docs/stories` citations are dropped from the coupling list. `docs/REQUIREMENTS` is a workspace/repo path, not a plugin path, and is allowed by the rule and by L2. The line becomes, byte-exact:

```
- Inbound couplings (`grep -rn "coding-agents-prompt-authoring\|pa-rosetta\|prompt-engineer" . docs/REQUIREMENTS --include="*.md" -l`): `agents/prompt-engineer.md` (only subagent using this skill), `workflows/coding-agents-prompting-flow.md` (dispatches `prompt-engineer` through this skill, steps 2–7), `skills/hitl/README.md` (this skill delegates HITL logic to `hitl` rather than restating it), `skills/reasoning/SKILL.md` and `skills/questioning/SKILL.md` (list `prompt-engineer` as an agent).
```

    - `… /Users/isolomatov/Sources/GAIN/rosetta/instructions/r3/core --include…` → `… . --include…` (`solr-extending:31`; this also removes a leaked absolute path)
    - **Measured 16 such commands, not 18** [F, `grep -rno 'grep -r[a-z]* ' instructions/r3 --include=README.md` → 16]. Also, `solr-query:45` and `solr-extending:31` scoped their grep to `core` while the skills live in `search`. `.` fixes that too.
  - T2, prose folder mentions:
    - ``in `instructions/r3/core` references`` → ``in the plugin root (`.`) references`` (`coding-agents-hooks-authoring:35`)
    - ``no file in `instructions/r3/core` greps`` → ``no file in the plugin root (`.`) greps`` (`risk-assessment:33`)
    - ``no folder under `instructions/r3/core/skills/` `` → ``no folder under `skills/` `` (`codemap:46`)
  - T3, file and folder paths: `instructions/r3/<set>/X` → `X`. Examples:
    - `natural-writing:42,53` `workflows/help-flow.md`
    - `self-organization:31` `skills/orchestration/assets/o-team-manager.md:36`
    - **`orchestration:28` → `` `agents/` ``**: re-derived Track E fix. AN's `instructions/r3/workflows/agents/` is superseded.
- **Rule text** added to the `README rules:` bullet at `instructions/r3/core/skills/coding-agents-prompt-authoring/references/pa-schemas.md:58` [F: line 58] (inside `:50-58`), as a new sub-bullet inserted as line 59, byte-exact. The text carries no `r3` literal, on purpose: an `instructions/r3/…` example would trip AC-P1, the S13 grep, and the Q1 rule. Verified in scratch: 0 hits after insertion [F]:

```
  - Paths are plugin-relative: name shipped files as the plugin sees them (`skills/<name>/SKILL.md`, `workflows/<flow>.md`, `agents/<name>.md`, `rules/<file>.md`; `.` = plugin root), never a repository path such as `instructions/<release>/…`; the generator rewrites plugin-relative paths per IDE. Inbound-coupling check: `grep -rn "<skill>" . --include="*.md"` from the plugin root.
```

- **Rendering proven by a scratch build** [F]:
  - `npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks false --source $PWD --instructionsSource <scratch-d1>/instructions --output <scratch-d1>/out` → rc=0, 49 folders;
  - `diff -rq plugins out` = 420 files = 20 READMEs × 21 copies;
  - `git status` unchanged.
  - Per target (`render-table.txt`): `orchestration:28` renders `agents/` unchanged in all 7 rosetta targets. `workflows/help-flow.md` renders as:
    - `claude`: `workflows/help-flow.md`
    - `cursor`, `copilot`, `cursor-standalone`: `commands/help-flow.md`
    - `codex`, `antigravity`: `skills/help-flow/SKILL.md`
    - `copilot-standalone`: `prompts/help-flow.prompt.md`
  - Resolution check [F, `scratch-d1/resolve_check.py`]: of 301 path tokens on the 23 rendered lines across the 7 targets, 299 resolve inside their plugin. Codex resolves via `.agents/` and `.codex/`. The 2 that do not are pre-existing tokens, not introduced by P: Codex `agents/engineer.md` and `agents/prompt-engineer.md`, since Codex ships agents as `.codex/agents/*.toml`. Report only (§10).
  - The same build on the old form gives `instructions/r3/{commands,prompts}/agents/` in Cursor/Copilot (review F-01 [F]). P removes that defect class from these READMEs without touching the generator.
- The `pa-schemas.md` edit ships in 21 folders (core + rosetta) [F: 21 copies today, identical to golden in claude, cursor and codex].
- AC-P1 `grep -rn 'instructions/r3' instructions/r3 | grep -v 'core/rules/local-files-mode.md'` returns nothing.
- AC-P2 `git diff --numstat -- instructions/` (worktree vs HEAD `7b3e7426`) lists exactly the 20 READMEs (23 changed lines in total) plus `pa-schemas.md` (+1). All 21 show ` M` (nothing is staged), and `pa-schemas.md` becomes ` M` (F-10).
- AC-P3 S8's regeneration changes exactly the 462 expected copies (§9), and S8's resolution check reproduces 299/301 with the same 2 pre-existing exceptions.

## 8. Track F — release body grouped by IDE

### 8.1 Unchanged (owner override 1)

- `:118` `DATE`, `:133` `zip_name="${folder}-${version}-${DATE}.zip"`, the upload set, `--clobber`, and the Assets panel (alphabetical, AN F.2.3 [F]) stay. The old dated zips on `v3.1.13` stay. AN F.4.1 and AN F.7 bullets 2-3 are void.

### 8.2 New step `Compose release index` (`id: index`)

- Placement: after "Create plugin archives" and before "Create GitHub Release", with the same `if:`. It runs before any tag moves.
- `env:` `ARCHIVES: ${{ steps.plugins.outputs.archives }}`, `ARCHIVE_DATE: ${{ steps.plugins.outputs.date }}`, `REPO: ${{ github.repository }}`. The new shell uses no inline `${{ }}`.
- `VERSION=$(jq -r .version plugins/rosetta-claude/.claude-plugin/plugin.json)`, `TAG=v${VERSION}`. For each zip, `folder` = the zip name minus `-${VERSION}-${ARCHIVE_DATE}.zip`. On a mismatch: `::error::` and exit 1.
- **Layout (D7; replaces G1-G4).** Declared constant `IDE_ORDER=(claude cursor copilot codex antigravity)`. `COMBO_SET=rosetta`. The other sets come from `plugins.json` `.sets[].name` in order; suffixes come from `.variants[].destinationSuffix`. The standalone target is `<ide>-standalone` if it is in `.targets`. Per IDE, 3 blocks; an empty block is omitted:
  - **Block 1:** `rosetta-<ide>`, `rosetta-<ide>-light`
  - **Block 2:** `core-<ide>`, `workflows-<ide>`, `qe-<ide>`, `search-<ide>`, `modernization-<ide>`
  - **Block 3:** `rosetta-<ide>-standalone`, `rosetta-<ide>-standalone-light`, then `core-<ide>-standalone` … `modernization-<ide>-standalone`
  - Claude, Codex and Antigravity have blocks 1-2 only. 14 standalone folders exist [F].
  - Expected entries: claude 7 (2+5), cursor 14 (2+5+7), copilot 14, codex 7, antigravity 7 = 49 [F: 49 folders].
- Unplaced folder: listed under `### Other`, then `::error::unplaced plugin folder(s): …` and exit 1. A folder with no archive is skipped.
- Output `RELEASE_INDEX.md` and step outputs `tag`, `index_file`.
- Format (exact):
  - `## Plugin downloads`, then one `### <IDE>` per IDE: `Claude Code`, `Cursor`, `GitHub Copilot (VS Code, JetBrains)`, `Codex`, `Antigravity`.
  - Entries: `- [<zip>](https://github.com/${REPO}/releases/download/${TAG}/<zip>)`. Links point at THIS run's dated zips.
  - Blocks are separated by `\n\n<!-- -->\n\n`.
- **Separator fact** (owner-reported, `coding-flow-state.md:58`). The owner suggested 3 empty lines. GitHub's GFM render API (`gh api markdown`) showed that 1 and 3 blank lines both render as ONE list, while `<!-- -->` splits it into separate lists. So `<!-- -->` stays.

### 8.3 Release step and Summary

- The release step asserts `${TAG_PATCH}` == `steps.index.outputs.tag` (via env).
- After the tag loop:
  - `gh api "repos/${REPO}/releases/generate-notes" -f tag_name="${TAG_PATCH}" -f target_commitish="${GITHUB_SHA}" --jq .body > release-notes.md`;
  - **on failure: `::warning::`, empty notes, and the release still ships (P6)**;
  - `RELEASE_BODY.md` = index + `\n\n` + notes.
- `gh release create … --notes-file RELEASE_BODY.md` (`--generate-notes` removed). The fallback `gh release edit … --notes-file RELEASE_BODY.md`, then `upload --clobber`.
- **The body is regenerated and replaced on every run. Hand edits are not supported** (owner, `coding-flow-state.md:51`; F-13).
- Summary: append `RELEASE_INDEX.md` under `### Plugin archives` when present; otherwise the flat list via env.

### 8.4 Doc text

- `docs/ARCHITECTURE.md:445` (S3; mirror `architecture.md:376` by S11): each plugin folder is zipped as `<folder>-<version>-<date>.zip` and attached with `instructions.zip`. The generated release body is replaced on every run and lists the zips per IDE in 3 blocks: rosetta and rosetta-light; the domain plugins core → modernization; then all standalones. The Assets panel stays alphabetical.

### 8.5 Acceptance (F)

- AC-F1 (F-15) `actionlint` comparison on `(step name, shellcheck code, severity)`, never on `line:col`. Per existing step, the count per key must not grow. The new step has 0 findings. Baseline [F]: 16 findings in steps `Create plugin archives` (2), `Create GitHub Release` (1), `Summary` (13).
- AC-F2 Local dry-run (scratch copy, `gh`/`git` shimmed):
  - 49 zips matching `^[a-z-]+-3\.1\.13-[0-9]{4}-[0-9]{2}-[0-9]{2}\.zip$`, with no duplicates;
  - `RELEASE_INDEX.md` equals an independently computed rendering of §8.2 (block order, headings, separators, 49 dated links);
  - `gh release create` receives `--notes-file RELEASE_BODY.md` and no `--generate-notes`;
  - the fallback path (shimmed `create` fails) calls `release edit … --notes-file RELEASE_BODY.md` and then `upload --clobber` (F-12);
  - a failing shimmed `generate-notes` yields a `::warning::` and a body with the index only.
- AC-F3 Negatives:
  - a fake `plugins/newset-claude/` makes the index step exit 1 and name it;
  - without `rosetta-codex`: 48 entries, rc=0;
  - a wrong date suffix: exit 1.
- AC-F4 [A, CI-only] The real `generate-notes` call and the rendering. **Residual risk (F-12):** merging a change to this workflow to `main` triggers it (`:11-18`). So the first real run of the new logic is a production release: tags `v3`, `v3.1` and `v3.1.13` force-moved, RAGFlow DEV publish. G-IMPL states this plainly.

## 9. Regeneration contract

- Command (local generator only): `npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks false --source $PWD`.
- Runs once (S8), after every `instructions/**` edit (S6 only) and before B. INV-7 applies.
- Expected delta: exactly **462** files change content:
  - 20 P READMEs × 21 copies = 420 [F, scratch build];
  - `pa-schemas.md` × 21 [F: 21 copies];
  - `requirements-authoring/README.md` × 21: they still say `docs/requirements` until regeneration. [F: at HEAD, `npm … --output agents/TEMP/315-merge-followup/scratch-regen-head` gives rc=0 and `diff -rq plugins …` = exactly these 21.]

  Baseline `git status --porcelain plugins/` [F]: 294 ` M` README paths. After S8, the path set = baseline ∪ the 462 paths, all ` M`.
- S8 records:
  - the per-target rendering of the 24 changed lines (23 + the rule line). The generator also rewrites `workflows/<flow>.md` inside the rule line per IDE, e.g. `commands/<flow>.md` for Cursor; layer 2 records that as observed;
  - the resolution check (§7a AC-P3).
  B layer 2 is built from that record.
- Proof of "regeneration only": generate again into `agents/TEMP/315-merge-followup/scratch-regen`; `diff -r plugins scratch-regen` is empty. Output independence of the output dir was verified at planning time [F]: before `7b3e7426`, `diff -rq plugins scratch-regen-baseline` gave 0 lines; at HEAD it gives exactly the 21 `requirements-authoring` copies. S0 re-runs this, and the expected result is those 21 lines.
- Publish-first consequence (owner item 5; `follow.md:101` B3). A real full pre-commit regenerates with the published generator. If that generator is behind the local one, the wired checks and hooks tests are expected to go red there. That means "publish first", not a defect.
- **D8 waiver.** The rule at `docs/ARCHITECTURE.md:300` ("full pre-commit check if any `src/*` was modified") is waived until the generator is published. Each pre-commit step is run separately instead (PLAN §8), and the waiver is recorded in `validation.md`.

## 10. Out of scope (recorded, not designed)

- OQ-B1 (incl. the 6 presence-mode READMEs), OQ-B2, OQ-A1, OQ-F3, OQ-E1 (AN §5).
- Sweeping the `v3.1.13` zips. Zip renames (F-II). `pre_commit.py`'s `npx` (owner item 5).
- `docs/PATTERNS/shell-proxy-pattern.md:46-50`. `coding-light-flow` `name: coding-flow`. The `core-<ide>` examples at `coding-agents-hooks-authoring/SKILL.md:44-48,86`.
- Generator path rewriting of `instructions/r3/<set>/workflows/…` tokens (`plugin-rewrite-references.ts:226-230`). There is no generator change (D1). After P, no shipped README carries the form. Other files under `instructions/r3` (non-README) that contain `instructions/r3` [F]: `local-files-mode.md` only, which is excluded by design.
- Codex agent paths `agents/<name>.md` in README prose do not resolve in Codex, which ships `.codex/agents/<name>.toml` (2 pre-existing tokens, §7a).
- `docs/web/docs/help-flow.md:22` beyond the P3 row.

## 11. Conflicts between the approved design and reality (resolved)

1. `ac_structure.sh` is red today (3 references vs 1) because of the owner's comment at `pre_commit.py:86-89` [F]. → §2.3.
2. The root depth changes on the move. → §2.2.
3. AN D.4's regex covers only link and blob forms. The wider rule plus the D4 slash boundary gives 94 occurrences, of which 84 are fixable and 10 allowlisted [F]. → §2.8, §6.4, §7.
4. `hooks-registered`: AN's 10 entries → 33 entries plus a census (D5). → §3.2.
5. Count sites AN missed: C15–C18 [F]. → §5.2 (P1 approved).
6. Generator rewrite of repo paths → D1 plugin-relative rule (no generator change). → §7a. The orchestration fix is re-derived; layer 2 covers 21 files.
7. F with the date kept: the index step reads the version and asserts it equals the tag. → §8.2-8.3.
8. AN C.5's grep false positives. → the precise banned list (§2.6).
9. The actionlint baseline is not clean (16) [F]. → keyed comparison (AC-F1).
10. **New:** the owner brief says "18 inbound-coupling commands"; the measurement gives **16** [F]. The transform covers every `grep` in the 23 references, whatever the count.
11. **New:** AN's E fix for `orchestration:28` (`instructions/r3/workflows/agents/`) contradicts D1. → `agents/` (§7a).
12. **New:** the review cites `docs/PATTERNS/pre-commit-plugin-sync.md:38` for the Occurrences chain; it is at `:36` [F]. → §5.4.
13. **New:** a rule text naming `instructions/r3/...` would trip its own guard (AC-P1, the S13 grep, Q1). → release-agnostic wording, verified 0 hits in scratch [F] (§7a).
14. **New (revision 3):** `7b3e7426` changed `instructions/r3/core/skills/requirements-authoring/README.md` (2 lines, `docs/REQUIREMENTS`). It ships in 21 plugin folders that still say `docs/requirements` [F] → S8 expects 462 changes; B layer 2 presence entry (§4, §9).

## 12. Files affected (summary)

- New:
  - `scripts/verify/{ac_counts.py,ac_links.sh}`
  - `docs/definitions/live_counts.json`
  - `src/hooks/tests/regression/hook-set-isolation.test.ts`
  - `plans/issue-315-plugin-sets/verify/{permitted_content.json,gen_permitted_content.py}`
- Moved: 3 checks → `scripts/verify/`.
- Changed:
  - `scripts/pre_commit.py`; 2 hooks tests; `ac_equivalence.py`
  - `publish-instructions.yml` and 6 other workflow files; 2 prompts; `run-test-cases.sh`
  - 20 READMEs and `pa-schemas.md` under `instructions/r3` (`requirements-authoring/README.md` was already changed by `7b3e7426`)
  - root docs: `ARCHITECTURE`, `README`, `FAQ`, `OVERVIEW`, `SecurityOnePager`, `llms-full.txt`, `IMPLEMENTATION:159`, `DEVELOPER_GUIDE`, `docs/PATTERNS/pre-commit-plugin-sync.md`
  - web pages (§6.4)
  - §2.10 path references, incl. the two design notes (P7)
  - `.claude/skills/sync-web-site/SKILL.md` (lessons, and the `:150` hint)
- Regenerated: 462 `plugins/**` files.

## R. Revision 2 — changelog (finding or decision → change → where)

| Item | Change | Where |
|---|---|---|
| D1 / F-01 | new Track P: the plugin-relative rule, 20 READMEs / 23 lines, rule text in `pa-schemas.md:58`; orchestration fix re-derived to `agents/`; rendering and resolution proven by a scratch build; layer 2 widened to 21 files | §7a, §4, §7, §9, §10, §11.6/10/11 |
| D2 / F-04 | `--only` with slugs; unknown name → 64 | §2.9 |
| D3 / F-05 | the 3 pre-commit docs + web mirrors; P2 superseded | §5.4, §6.3-6.4 |
| D4 / F-02 | `/` is a left boundary; `my-skill` extracted; baseline 94/84/10; `dead=0` reachable | §2.8 |
| D5 / F-07 | 33 entries derived from `plugins.json` + census; 3 census mutations | §3.2, §3.4 |
| D6 / F-16 | single `docs/definitions/live_counts.json` (scope, allowlist, count rules, sites); duplicate LIVE_SCOPE and parity check dropped | §2.6-2.8, §5.3 |
| D7 / F-12, F-13, F-22 | 3-block layout; body replaced each run; `<!-- -->` fact recorded; first-run-is-production residual risk | §8.2-8.5 |
| D8 / F-14 | full pre-commit waiver; steps run separately | §9 |
| D9 / F-21 | static web validation, a recorded deviation | §6.4 |
| P1 | C16–C18 applied, not optional | §5.2-5.3 |
| P6 | warning + ship | §8.3 |
| P7 | design notes updated (rule + site counts) | §2.10 |
| F-08 | no silent skip in `ac_hooks_content.py` | §2.5 |
| F-09 | `shellcheck -S warning` for the moved script | §2.2 |
| F-10 | expected git states (` M` after revision 3); compare `--numstat` | §7a AC-P2 |
| F-15 | actionlint keyed comparison | §8.5 |
| F-17 (Low, applied) | AC1 counts the bare token in non-comment lines | §2.3 |
| F-18 (Low, applied) | content comparison of the kept `pre_commit.py` lines | §2.9 |
| F-19 (Low, applied) | exact hooks count recorded | §3.4 |
| F-20 (Low, applied) | AC-D2 targets full-plugin claims only | §6.4 |
| F-23 | INV-7 | §0 |
| F-03, F-11, F-24 | plan mechanics | PLAN |


### R3. Revision 3 changelog

| Item | Change | Where |
|---|---|---|
| Git state: commits `0ad95943`, `5c97c1ed`, `7b3e7426`; no `MERGE_HEAD`; hooks off | root facts; INV-1 (HEAD stays `7b3e7426`, nothing staged, worktree-only `git restore` allowed for clean tracked files); INV-6 (backups for unstaged, untracked, moved) | §0 |
| `docs/requirements` → `docs/REQUIREMENTS` | 4 paths in this file; 2 in the PLAN; 2 in AN (`:496,599`), in place | §2.6, §2.10; PLAN; AN |
| `requirements-authoring/README.md` changed by `7b3e7426` | S8 expects 462 (was 441); B layer 2 presence entry; base `0ad95943` for the source diff; mutation added | §4, §9, §11.14 |
| Q1 = YES | rule L2 in `ac_links.sh` with config `links.plugin_relative`; AC-V6a | §2.6, §2.8, §2.11 |
| Q2 | `. docs/REQUIREMENTS` scope; 3 `docs/stories` citations dropped; byte-exact line | §7a T1 |
| Q3 = presence-only | 6 P READMEs + `requirements-authoring` in presence mode | §4 |

</CRITICAL>
