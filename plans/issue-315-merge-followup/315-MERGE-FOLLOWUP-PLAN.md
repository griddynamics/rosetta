# 315 merge follow-up — Execution Plan (HOW)

WHAT lives in `plans/issue-315-merge-followup/315-MERGE-FOLLOWUP-SPECS.md` ("SPECS §N"). This file holds only the sequence, sessions, gates, verification and DoD. Revision 3 folds in the owner's G0 and G0-bis answers, the owner-directed git state (`agents/TEMP/315-merge-followup/coding-flow-state.md:44-69`), and the plan review (`plans/issue-315-merge-followup/plan-review.md`). See §11 for the revision changelogs.

## TLDR

- 14 sessions (S0–S13) and 5 gates (G0 done, G0-bis done, G-DWEB, G-IMPL, G-ESC).
- Git: HEAD `7b3e7426` (local owner commits, not pushed); nothing staged; hooks disabled (`core.hooksPath=/dev/null`).
- **Phase 0:** S0 baseline. G0 and G0-bis are answered: Q1 yes, Q2 `. docs/REQUIREMENTS`, Q3 presence-only.
- **Phase 1:** 7 parallel sessions on disjoint files:
  - S1 A-tests
  - S2 V-move + path refs (incl. P7)
  - S3 root docs: C, D-root, D3 pre-commit docs, F doc
  - S4 E `.github`
  - S5 F pipeline
  - S6 P plugin-relative READMEs (the only `instructions/**` owner)
  - S7 new checks + `live_counts.json`
- **Phase 2:** S8 regenerates `plugins/` with the local generator, alone with respect to `plugins/` readers. S11 may do its read-only prep.
- **Phase 3:** S9 B-gate ∥ S10 pre-commit wiring ∥ S11 D-web (G-DWEB inside).
- **Phase 4:** S12 whole-diff review → S13 validation (steps run separately, D8 waiver) → G-IMPL (coding-flow Phase 10).
- Mini-loop per implementation session: engineer → separate reviewer → fix. At most 3 rounds, then G-ESC.
- All subagents run on `sonnet` (`coding-flow-state.md:23`).

## 1. Read first (every session)

1. SPECS §0 (invariants, including INV-7) and the session's SPECS sections.
2. AN (`plans/issue-315-merge-followup/architecture-notes.md`): only the sections the session block cites. After S2, AN has moved paths but unchanged line numbers (SPECS §2.10).
3. `agents/TEMP/315-merge-followup/coding-flow-state.md:25-61`: owner decisions.
4. S1, S2, S8, S10 also read `docs/ARCHITECTURE.md:288-305` and `:387-434`.

## 2. Governing rules (one line each)

| # | Rule | Authority |
|---|---|---|
| R1 | No commit, push, tag, release, and no git state change (`add`, `mv`, `stash`, `reset`, `checkout`, `config` incl. `core.hooksPath`). HEAD stays `7b3e7426`; nothing staged. Only `git restore --worktree --source=7b3e7426 -- <path>` is allowed, for rollback of clean tracked files (§5.2) | SPECS INV-1 |
| R2 | `plugins/` is written only by S8's local generator command (sole exception: S8 rollback from the S0 byte-identical backup) | SPECS INV-2, §9 |
| R3 | Never run `npx` for the generator. Never run `scripts/pre_commit.py` without `--only`. The full pre-commit rule is waived until publish (D8) | owner item 5; SPECS §9 |
| R4 | Mutations only on `agents/TEMP/315-merge-followup/scratch-*` copies | SPECS INV-3 |
| R5 | History and generated files are never hand-edited | SPECS INV-4, INV-5 |
| R6 | Back up before the first edit; roll back from the backup, never with git | §5.2; SPECS INV-6 |
| R7 | D1–D25 and the owner decisions are not reopened. A new conflict → STOP → orchestrator | `follow.md:165-193`; `coding-flow-state.md:25-61` |
| R8 | Run checks as `bash <file>` / `python3 <file>`, never as pasted pipelines (zsh `grep` is ugrep) | SPECS §2.2 |
| R9 | Every new or changed check goes RED on a deliberate break, then GREEN. Every scratch root is proven GREEN unmutated first (F-03) | AN §3; review F-03 |
| R10 | Report facts vs assumptions. "Coded" is not "done" | `subagent-directives` |
| R11 | Any `instructions/**` edit after S8 → re-run S8 and S9 | SPECS INV-7 |
| R12 | Use `src/hooks/node_modules/.bin/vitest run --root src/hooks`, from the repo root, never bare `npx` (F-24; verified: 37 tests pass this way) | review F-24 |

## 3. Records

- Per session: `agents/TEMP/315-merge-followup/handoff-S<N>.md`, ≤ 40 lines. Contents:
  - status and files touched;
  - each verification command with its last output line;
  - mutation log, one row per mutation: `<mutation> → <expected> → <observed>`;
  - deviations, open items, and the review-round count.
- Orchestrator: updates `agents/TEMP/315-merge-followup/coding-flow-state.md` after every session and gate.
- Baseline: `agents/TEMP/315-merge-followup/baseline/` (S0). Validation: `agents/TEMP/315-merge-followup/validation.md` (S13).

## 4. File ownership (one owner per file; parallel is valid only because these sets are disjoint)

| Owner | Files (write) |
|---|---|
| S0 | `agents/TEMP/315-merge-followup/{baseline,scratch-true,scratch-regen-baseline}/**`, `src/hooks/dist/**` (build, Phases 0–3) |
| S1 | `src/hooks/tests/regression/{read-once-template-registration,hooks-registered}.test.ts`, `src/hooks/tests/regression/hook-set-isolation.test.ts` (new) |
| S2 | `scripts/verify/{ac_structure.sh,ac_crossrefs.py,ac_hooks_content.py}` (moved); the SPECS §2.10 files: `plans/issue-315-plugin-sets/{follow,hooks-architecture}.md`, `agents/TEMP/315-execution-state.md`, `docs/REQUIREMENTS/plugin-generator/{NFR,FR-VAR}.md`, `src/rosettify-plugins/tests/hook-schema/{claude-codex.schema.test.ts,validator.ts}`, **`plans/issue-315-merge-followup/{architecture-notes,discovery-notes}.md` (P7)** |
| S3 | **`docs/ARCHITECTURE.md` (sole owner: C1, C2, `:39`, `:434`, `:445`)**, `README.md`, `FAQ.md`, `OVERVIEW.md`, `docs/SecurityOnePager.md`, `llms-full.txt`, `agents/IMPLEMENTATION.md:159`, `DEVELOPER_GUIDE.md`, `docs/PATTERNS/pre-commit-plugin-sync.md` |
| S4 | `.github/prompts/{repo-implement-code,repo-implement-plan}.md`, `.github/workflows/{e2e-testing,repo-analysis,repo-implement,repo-plan,repo-triage,validate-prompts}.yml`, `.github/scripts/run-test-cases.sh` |
| S5 | `.github/workflows/publish-instructions.yml`, `agents/TEMP/315-merge-followup/scratch-release/**` |
| S6 | **all `instructions/**` edits:** the 20 READMEs of SPECS §7a, and `instructions/r3/core/skills/coding-agents-prompt-authoring/references/pa-schemas.md` |
| S7 | `scripts/verify/{ac_counts.py,ac_links.sh}` (new), `docs/definitions/live_counts.json` (new) |
| S8 | `plugins/**` (generator only), `agents/TEMP/315-merge-followup/scratch-regen/**` |
| S9 | `plans/issue-315-plugin-sets/verify/{ac_equivalence.py,permitted_content.json,gen_permitted_content.py}` |
| S10 | `scripts/pre_commit.py` |
| S11 | `docs/web/**` except `docs/web/llms-full.txt` and `docs/web/user-guide/**`; `.claude/skills/sync-web-site/SKILL.md` (lessons and the `:150` hint) |
| S13 | `src/hooks/dist/**` (Phase 4 rebuild), `agents/TEMP/315-merge-followup/{scratch-true-final,scratch-regen-final,validation.md}` |

- Each session may also write its own `agents/TEMP/315-merge-followup/{scratch-*-S<N>,backup/S<N>,handoff-S<N>.md}`.
- Collisions resolved by these assignments:
  - `ac_hooks_content.py` (the move plus every edit): S2 only.
  - `docs/ARCHITECTURE.md` (C, D, D3, F): S3 only.
  - `instructions/**`: S6 only. E no longer touches instructions; the orchestration line moved to P.
  - `live_counts.json` (read by both new checks): S7 only.
  - `src/hooks/dist`: S0, then S13.
  - `scripts/verify/`: S2 and S7, on disjoint files.
  - The AN/discovery notes: S2 only. In-place edits only, with line counts unchanged.

## 5. Shared procedures

### 5.1 S0 — baseline (orchestrator via `executor`, sonnet)

`B=agents/TEMP/315-merge-followup/baseline`:

1. Git state:
   - `git rev-parse HEAD > $B/head.txt`. Expected `7b3e7426…`; anything else → STOP.
   - `git diff --cached --quiet; echo $? > $B/staged-rc.txt`. Expected `0`: nothing staged.
   - `test ! -f .git/MERGE_HEAD`.
   - `git config --local --get core.hooksPath > $B/hooks-path.txt` (`/dev/null`).
   - `git status --porcelain=v1 > $B/status.txt`. Expected 296 ` M` and 1 `??` (`plans/issue-315-merge-followup/`).
   - `git diff > $B/worktree-vs-head.patch` (F-11: separates the earlier unstaged edits from new ones)
   - `git status --porcelain | awk 'substr($0,2,1)=="M" {print substr($0,4)}' | xargs shasum > $B/preexisting-unstaged.sha` (worktree-modified files only: 294 plugin READMEs, `scripts/pre_commit.py`, `.claude/skills/merge-main/SKILL.md`)
   - `git tag -l | shasum > $B/tags.sha`
   - `git config --get user.name > $B/git-user.txt`
   - `git ls-remote origin refs/heads/feat/315-plugin-sets > $B/remote-branch.txt`
2. Plugins:
   - `git status --porcelain plugins/ | awk '{print $2}' | sort > $B/plugins-paths.txt` (882)
   - `find plugins -type f -exec shasum {} + | sort -k2 > $B/plugins-sha.txt`
   - `cp -R plugins $B/plugins-backup` (F-11; 107 MB)
3. Line counts of the SPECS §2.10 files → `$B/wc-2.10.txt`.
4. Checks at their old paths, plus the D4 prototype. Expected in parentheses:
   - `ac_structure.sh` (FAIL AC1)
   - `ac_crossrefs.py` (PASS)
   - `ac_hooks_content.py` (PASS 84)
   - `ac_equivalence.py` (FAIL 434)
   - `bash agents/TEMP/315-merge-followup/scratch-links-proto-slash.sh $PWD` (94 lines)
   - → `$B/checks.txt`
5. Lint and tests:
   - actionlint, keyed (F-15): for each workflow, `actionlint -format '{{range $err := .}}{{$err.Filepath}}|{{$err.Line}}|{{$err.Kind}}|{{$err.Message}}{{"\n"}}{{end}}'`. Map `Line` to its step name via venv PyYAML. Strip `:[0-9]+:[0-9]+` from messages. Write `(file, step, code, severity)` counts to `$B/actionlint-keyed.txt`. Expected for publish: `Create plugin archives` 2, `Create GitHub Release` 1, `Summary` 13.
   - `src/hooks/node_modules/.bin/vitest run --root src/hooks > $B/hooks-vitest.txt 2>&1` (expected `1 failed | 34 passed`, 1435).
6. Shared posture-true tree:
   - `npm --prefix src/hooks run build`
   - `rm -rf agents/TEMP/315-merge-followup/scratch-true`
   - `npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks true --source $PWD --output $PWD/agents/TEMP/315-merge-followup/scratch-true` (rc=0, 49 folders, 33 hook documents)
   - READ-ONLY from here on.
7. Regeneration baseline:
   - `rm -rf agents/TEMP/315-merge-followup/scratch-regen-baseline && npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks false --source $PWD --output $PWD/agents/TEMP/315-merge-followup/scratch-regen-baseline && diff -rq plugins agents/TEMP/315-merge-followup/scratch-regen-baseline`
   - Expected: exactly 21 lines, all `*/skills/requirements-authoring/README.md`. These are the copies `7b3e7426` left stale [F, planning: `scratch-regen-baseline` gave 0 before the rename, and `scratch-regen-head` gives these 21 at HEAD]. Anything else → STOP → G-ESC.

- Done when: every artifact exists and every expected value matches, or the mismatch is recorded and work STOPs.

### 5.2 Backup and rollback (every session, R6)

- Before the first edit: `rsync -R <touch list> agents/TEMP/315-merge-followup/backup/S<N>/`.
- Rollback by file category:
  - **Tracked and clean at S0** (not in `$B/preexisting-unstaged.sha`): `git restore --worktree --source=7b3e7426 -- <path>`, or copy the backup back. Both give the HEAD content.
  - **Unstaged at S0** (`scripts/pre_commit.py`, `.claude/skills/merge-main/SKILL.md`, the 294 plugin READMEs): copy the backup back ONLY. A git restore would destroy the owner's earlier edit.
  - **Untracked** (`plans/issue-315-merge-followup/**`, scratch) and **new files**: copy the backup back, or delete.
  - **S2's moved files**: `mv` them back.
- Never `git checkout`, `stash`, `reset`, or `restore --staged`.

### 5.3 Scratch root (F-03: anchored excludes)

- Create: `S=agents/TEMP/315-merge-followup/scratch-root-S<N>; rsync -a --exclude /.git --exclude /plugins --exclude /agents/TEMP --exclude /venv --exclude node_modules ./ $S/ && cp -R plugins $S/plugins`.
  - Trap: an unanchored `--exclude plugins` also drops `src/rosettify-plugins/plugins/template-*`, and AC9 then fails.
- **Step 0 of every mutation series:** run the copied check(s) on the unmutated `$S` and require GREEN. Exception: when the check is red on the real repo only because owned work is unfinished, record the same red list on `$S`.
- Checks copied under `$S/scripts/verify/` derive their root from `$S`. Never symlink `plugins/`.

### 5.4 Mini-loop (S1–S7, S9–S11)

1. Implement: `engineer` (sonnet) with the session block, SPECS refs, and R1–R12.
2. Review: a separate `reviewer` (sonnet), never the implementer. Inputs:
   - the session block and SPECS sections;
   - `git diff -- <touch list>`, read against `$B/worktree-vs-head.patch`, plus the new files;
   - the handoff.
   It checks the contract, done-when, the mutation log, R1–R12 and scope. Output: blocking or non-blocking findings with `path:line`.
3. Fix: the same engineer. Re-review: the same reviewer.
4. Exit: 0 blocking findings, verification green, and the mutation log complete. **At most 3 rounds** → G-ESC.

### 5.5 Subagent prompt skeleton

- Role.
- `USE SKILL subagent-directives, coding, testing`.
- The session block, verbatim.
- Refs by `path:line`.
- R1–R12.
- Output: a handoff file plus a ≤ 15-line message.
- Evidence: every claim carries `path:line` or a command and its output. Facts are marked apart from assumptions.

## 6. Sequence

| Phase | # | Session | Depends on | Parallel with |
|---|---|---|---|---|
| 0 | S0 | baseline + shared scratch trees | — | — |
| 0 | G0-bis | answered (`coding-flow-state.md:63`) | — | — |
| 1 | S1 | A hooks tests | G0-bis | S2–S7 |
| 1 | S2 | V move + fixes + path refs (+P7) | G0-bis | S1, S3–S7 |
| 1 | S3 | root docs: C, D-root, D3, F doc | G0-bis | S1, S2, S4–S7 |
| 1 | S4 | E `.github` paths | G0-bis | S1–S3, S5–S7 |
| 1 | S5 | F release pipeline + dry-run | G0-bis | S1–S4, S6, S7 |
| 1 | S6 | P plugin-relative READMEs + rule | G0-bis | S1–S5, S7 |
| 1 | S7 | `ac_counts`, `ac_links`, `live_counts.json` | G0-bis | S1–S6 |
| 2 | S8 | regenerate `plugins/`; runs alone with respect to `plugins/` readers | S1–S7 closed | S11 (read-only prep) |
| 3 | S9 | B equivalence gate | S8 | S10, S11 |
| 3 | S10 | pre-commit wiring (D2) | S2, S7, S8 | S9, S11 |
| 2–3 | S11 | D-web via sync-web-site (G-DWEB inside) | S3, S7 | S8 (prep only), S9, S10 |
| 4 | S12 | whole-diff review (coding-flow Phases 8, 12) | S1–S11 closed | — |
| 4 | S13 | validation (Phases 9, 11, 13) | S12 closed | — |
| 4 | G-IMPL | owner approves the implementation (Phase 10) | S13 | — |

- Unlisted pairs are sequential. Parallelism is valid only through §4.
- S8 runs while no session reads `plugins/`: S1, S2, S7 are closed; S9 and S10 have not started.
- Order kept from AN §2: every `instructions/**` edit (now S6) before regeneration; regeneration before B; root docs before web; web last.
- Changed from AN §2: the tracks run in parallel on disjoint files; V and P join Phase 1; the wiring runs after regeneration; F no longer gates the web zip names.

## 7. Sessions

### S1 — Track A hooks tests (D5)

- **Role.** engineer. **Refs:** SPECS §3; AN A.4 (`architecture-notes.md:161-240`), A.6 (`:255-271`).
- **Touch.** §4 S1. Read-only: the 7 templates, `src/rosettify-plugins/plugins.json`, `src/hooks/tests/helpers/release.ts`.
- **Do.**
  1. Rewrite `read-once-template-registration.test.ts:1-63` per SPECS §3.1.
  2. `hooks-registered.test.ts`:
     - `:17-19` → `ROSETTA_PLUGINS_DIR` and the derived folder list;
     - `:21-26` → the 33-entry table and the census;
     - `:28-33` → the exceptions;
     - `:47-76` → the two-way rule and the posture shape;
     - `:1-10` → the header.
  3. New `hook-set-isolation.test.ts`.
- **Traps.**
  - Folder lists come from `plugins.json`, never hard-coded.
  - Copilot's plugin form keeps its bundles in `hooks/`; Codex's `.codex-plugin` form keeps them in `.codex/hooks/`.
  - `plugin.json` contains the substring `plugin.js`.
  - The antigravity template has inline guards: strip tokens, not lines.
- **Verify.**
  - `src/hooks/node_modules/.bin/vitest run --root src/hooks tests/regression`: 4 files, 0 failed.
  - The full `… vitest run`: 0 failed files; record the exact count.
  - `ROSETTA_PLUGINS_DIR=$PWD/agents/TEMP/315-merge-followup/scratch-true src/hooks/node_modules/.bin/vitest run --root src/hooks tests/regression/hooks-registered.test.ts tests/regression/hook-set-isolation.test.ts`: 33× `advisory`. Against `plugins/`: 33× `shipped`.
- **Mutations.** SPECS AC-A2 (1)–(12).
  - Templates: on `cp -R src/rosettify-plugins/plugins …/scratch-tmpl-S1` with `ROSETTA_TEMPLATES_DIR`.
  - Trees: on `cp -R …/scratch-true …/scratch-true-S1` or `cp -R plugins …/scratch-false-S1`.
  - (9) is a temporary test edit, reverted from the backup.
- **Done when.**
  - Verification passes; 12/12 mutations RED→GREEN.
  - `git diff --stat -- src/hooks/tests` = 2 files; the new file is untracked.
  - The handoff holds the exact test count.
- **Rollback.** §5.2.

### S2 — Track V: move and fix three checks; path references (incl. P7)

- **Role.** engineer. **Refs:** SPECS §2.1–2.5, §2.10, §2.11 (AC-V1–V4, V8); `plans/issue-315-plugin-sets/verify/{ac_structure.sh:1-65,ac_crossrefs.py:1-105,ac_hooks_content.py:1-247}`.
- **Do.**
  1. `mkdir -p scripts/verify && mv plans/issue-315-plugin-sets/verify/{ac_structure.sh,ac_crossrefs.py,ac_hooks_content.py} scripts/verify/`. Plain `mv`, executable bits kept.
  2. Root derivation per SPECS §2.2 (`ac_hooks_content.py:35`: `parents[3]` → `parents[2]`).
  3. `ac_structure.sh`: `--tree`, and the AC1 rule counting the bare token in non-comment lines (`:11-25`).
  4. `ac_hooks_content.py`, per SPECS §2.5:
     - `NO_HOOK_SETS`;
     - no silent skip (`:107-110`);
     - `--golden`, `--require-golden`, the three states;
     - the docstring.
  5. SPECS §2.10 path references, including the two design notes. In place only: no line added or removed.
- **Verify** (from `/tmp`):
  - `bash <repo>/scripts/verify/ac_structure.sh` → ALL PASS.
  - `python3 <repo>/scripts/verify/ac_crossrefs.py` → ALL PASS.
  - `python3 <repo>/scripts/verify/ac_hooks_content.py` → `ALL PASS (golden cross-check: RAN)`, printing 84 + 28 new assertions.
  - `--tree …/scratch-true --posture true` → `NOT APPLICABLE`.
  - `--tree /nonexistent` → exit 2.
  - `--golden /nonexistent` → exit 0, `NOT RUN — snapshot absent`; adding `--require-golden` → exit 1.
  - `shellcheck -S warning scripts/verify/ac_structure.sh` → rc=0.
  - `python3 -m py_compile scripts/verify/*.py`.
  - The AC-V8 grep returns nothing, and `wc -l` equals `$B/wc-2.10.txt`.
  - `grep -rn '/Users/' scripts/verify` returns nothing.
- **Mutations** (scratch root §5.3; Step 0 GREEN first):
  - (a) a second non-comment `rosettify-plugins` line in `$S/scripts/pre_commit.py` → AC1 FAIL.
  - (b) the same as a comment → PASS.
  - (c) `rm -rf $S/plugins/qe-codex` → AC1 FAIL, and hooks `missing folder` FAIL.
  - (d) `hooks.json` copied into `$S/plugins/workflows-claude/` → FAIL. The same on a posture-true copy → FAIL.
  - (e) a `.js` under `$S/plugins/qe-cursor/skills/` → FAIL.
  - (f) ``USE SKILL `solr-query` `` appended to a file under `$S/instructions/r3/core/skills/` → AC6b FAIL.
  - (g) the copies report `$S` paths.
- **Done when.**
  - All pass.
  - `git status --porcelain plans/issue-315-plugin-sets/verify` = ` D` × 3.
  - `ac_equivalence.py` untouched.
- **Rollback.** §5.2, including moving the files back.

### S3 — root docs: Track C, D-root, D3 pre-commit docs, F doc text

- **Role.** engineer. **Refs:** SPECS §1, §5.2, §5.4, §6.3, §8.4; AN C.4 (`architecture-notes.md:474-507`).
- **Do.**
  1. Counts: C1, C2, C4, C6, C9, C10, C12–C15, C17, C18-root. Byte-exact from the SPECS §5.2 fenced block.
  2. D-root: `README.md:83,84,120-123`; `docs/ARCHITECTURE.md:39`.
  3. D3 (SPECS §5.4): `docs/PATTERNS/pre-commit-plugin-sync.md:18-24,34-40`, `DEVELOPER_GUIDE.md:303`, `docs/ARCHITECTURE.md:434`.
  4. F text: `docs/ARCHITECTURE.md:445` (SPECS §8.4).
- **Traps.**
  - The canonical substring is byte-identical at C2, C3 and C12.
  - C14 is line 159 only.
  - The `:39` box keeps its width.
  - `docs/web/llms-full.txt` is never touched.
  - Web mirrors belong to S11.
- **Verify.**
  - Self-sufficient: `grep -F` of each SPECS §5.2 string at its site, and `grep -F` of the §5.4 D3 texts. The `ac_counts.py` run is S13's (and S7's red-list mapping), not a done-criterion here.
  - `git status --porcelain instructions/` is unchanged by S3.
- **Mutations.** None new: S3 adds no check. The counts mutations are S7's.
- **Done when.** The above hold; the handoff lists the expected-red site ids.
- **Rollback.** §5.2.

### S4 — Track E `.github` paths

- **Role.** engineer. **Refs:** SPECS §7; AN E.5 (`architecture-notes.md:716-729`).
- **Do.** The 2 prompt fallbacks, the 6 workflow comments, and `run-test-cases.sh:38`. Nothing else.
- **Verify.**
  - `grep -n 'instructions/r3/workflows/' <each edited file>` hits the edited lines.
  - actionlint keyed counts for the 6 workflows are ≤ `$B/actionlint-keyed.txt`.
  - `ac_links.sh`, once S7 has landed: 0 dead under `.github/`.
  - `git diff --numstat` = 1 line per file.
- **Mutations.** None new (S7 owns the checker).
- **Done when.** The above hold.
- **Rollback.** §5.2.

### S5 — Track F release pipeline (D7)

- **Role.** engineer. **Refs:** SPECS §8; `.github/workflows/publish-instructions.yml:114-226`.
- **Do.**
  1. Step `Compose release index` after `:145` (SPECS §8.2, 3-block layout).
  2. Release step `:147-202` per SPECS §8.3.
  3. Summary `:204-226`.
  4. Dry-run harness in `scratch-release/`:
     - `extract_steps.py` (venv PyYAML) substitutes `${{ … }}` from the harness env and the parsed `$GITHUB_OUTPUT`;
     - `bin/gh` and `bin/git` shims log argv and return canned output. There are two gh modes: `create` succeeds, or `create` fails (to exercise the fallback). There is also a failing `generate-notes` mode;
     - copies of `plugins/` and `src/rosettify-plugins/plugins.json`;
     - `run-dry.sh` runs the 4 steps.
- **Traps.**
  - **The scratch dir is inside the repo worktree.** An unshimmed `git tag/push/config` hits the real repo. `run-dry.sh`:
    - puts `bin/` first on `PATH`;
    - exports `GIT_DIR=/nonexistent`;
    - sets `GITHUB_WORKSPACE`/`GITHUB_SHA` to scratch values;
    - unsets `GITHUB_TOKEN`/`GH_TOKEN`;
    - asserts that `command -v git gh` resolves to the shims.
  - The zip step writes `../../<zip>`, so it runs only inside scratch-release.
  - Separator `<!-- -->` (SPECS §8.2 fact).
- **Verify.**
  - actionlint keyed: the new step has 0 findings, and no existing step's count grows (AC-F1).
  - `bash …/scratch-release/run-dry.sh` → AC-F2 (all 5 bullets).
  - `git tag -l | shasum` and `git config --get user.name` equal the baseline before and after.
- **Mutations.** AC-F3 ×3.
- **Done when.**
  - The above pass.
  - `shim.log` proves `--notes-file RELEASE_BODY.md` on both the create and the fallback paths, and never `--generate-notes`.
  - AC-F4 and the F-12 residual risk are recorded for G-IMPL.
- **Rollback.** §5.2.

### S6 — Track P: plugin-relative README paths (D1)

- **Role.** engineer. **Refs:** SPECS §7a; the measured transform `agents/TEMP/315-merge-followup/scratch-d1/apply_d1.py`; the rendering table `scratch-d1/render-table.txt`.
- **Touch.** The 20 READMEs listed in SPECS §7a, and `pa-schemas.md:58`. Nothing else under `instructions/`.
- **Do.**
  1. Apply T1–T3 to the 23 lines, byte-for-byte as in SPECS §7a.
  2. Add the rule sub-bullet (SPECS §7a, byte-exact, no `r3` literal) under the `README rules:` bullet at `pa-schemas.md:58`.
- **Traps.**
  - `rules/local-files-mode.md` is excluded by design.
  - `coding-agents-prompt-authoring:53` (Q2): search scope `. docs/REQUIREMENTS`; drop the 3 `docs/stories` citations. Byte-exact line in SPECS §7a T1. `docs/REQUIREMENTS` is a workspace path and is allowed.
  - `orchestration:28` becomes `` `agents/` ``, NOT AN's `instructions/r3/workflows/agents/`.
  - The grep count is 16, not 18.
- **Verify.**
  - AC-P1 (the grep returns nothing).
  - AC-P2: `git diff --numstat -- instructions/` = the 20 READMEs (23 lines) + `pa-schemas.md` (+1). Status: all 21 ` M` (worktree vs HEAD; nothing staged).
  - Scratch build from the worktree: `npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks false --source $PWD --output $PWD/agents/TEMP/315-merge-followup/scratch-p-S6`, then `diff -rq plugins …/scratch-p-S6 | wc -l` → 462 (420 P READMEs + 21 `pa-schemas.md` + 21 `requirements-authoring/README.md` already changed at HEAD).
  - Re-run the resolution check from `scratch-d1/resolve_check.py`, adapted to read the index version of each file as "before": 299/301, with the same 2 pre-existing Codex exceptions.
- **Mutations.** None (no check). AC-P1 is enforced on every commit by S7's L2 rule (Q1) and by the S13 grep. After S6, L2 must show `l2_violations=0` on the real repo.
- **Done when.** The above hold; the handoff holds the 462-path list and the rendering table.
- **Rollback.** §5.2. After S8 has run, rollback also requires re-running S8 (R11).

### S7 — new checks and the shared scope file (D4, D6)

- **Role.** engineer. **Refs:** SPECS §2.2, §2.6–2.8, §5.3; prototype `agents/TEMP/315-merge-followup/scratch-links-proto-slash.sh`.
- **Touch.** §4 S7.
- **Do.**
  1. `docs/definitions/live_counts.json` (SPECS §2.6), with `sites` per §5.3.
  2. `scripts/verify/ac_counts.py` (§2.7).
  3. `scripts/verify/ac_links.sh` (§2.8), with the D4 slash boundary and rule L2 (Q1 = YES, config `links.plugin_relative`).
- **Traps.**
  - Bash 3.2 + BSD grep; `jq` for the JSON.
  - `live_counts.json` excludes itself.
  - The allowlist is two-way.
  - Never extract `agents/instructions/r1/…`.
- **Verify.**
  - `shellcheck scripts/verify/ac_links.sh` clean.
  - `python3 -m py_compile scripts/verify/ac_counts.py`.
  - `time /bin/bash scripts/verify/ac_links.sh` < 10 s.
  - On the real repo, every remaining DEAD or site FAIL maps to an unfinished owner session (S3, S4, S11). Listed with ids. Expected S11-owned reds until S11 lands: sites C3, C5, C7, C8, C16 (`docs/web/index.md:124`) and C18-web (`docs/web/docs/overview.md:71`), plus the BANNED hits at those two lines and `docs/web/docs/faq.md:129`, `docs/web/docs/architecture.md:282`, `docs/web/roadmap.md:104-105`.
  - `diff <(bash scripts/verify/ac_links.sh --list-files) <(python3 scripts/verify/ac_counts.py --list-files)` is empty.
- **Mutations** (scratch root; Step 0 records the same red list as the real repo):
  - counts:
    - (a) `41 skills` at C2 → FAIL `C2`;
    - (b) reword C4 → FAIL (0 occurrences);
    - (c) `mkdir $S/instructions/r3/core/skills/zz-fake` → FAIL on the skills sites;
    - (d) `~17 SDLC workflows` into `$S/docs/TODO.md` → BANNED FAIL;
    - (e) `rm $S/instructions/r3/qe/workflows/aqa-flow.md` → exclusion FAIL;
    - (f) a `tags: ["workflow-phase"]` file → workflows stays 17, workflow_files becomes 71;
    - (g) invalid JSON in `$S/docs/definitions/live_counts.json` → exit 2.
  - links, one `DEAD` each:
    - (h) a link form in `$S/README.md`;
    - (i) a blob URL form;
    - (j) a backtick form in `$S/.github/prompts/zz.md`;
    - (k) a YAML comment form;
    - (l) a `../` form;
    - (m) a leading `/` form (`/instructions/r3/nope.md`).
  - Two more:
    - (n) an `agents/instructions/r1/local.md` line → 0 DEAD;
    - (o) all `instructions/r3/aqa/` occurrences removed from `$S/docs/REQUIREMENTS/plugin-generator/FR-SET.md` → stale-allowlist FAIL.
  - L2 (Q1). Step 0 on an `$S` with S6's 23 lines already transformed, or with `apply_d1.py` run on `$S/instructions`, shows `l2_violations=0`. Then:
    - (p) add `` `instructions/r3/core/workflows/help-flow.md` `` to `$S/instructions/r3/core/skills/hitl/README.md` → `FAIL L2 …hitl/README.md:<n>`;
    - (q) the same line added to `$S/instructions/r3/core/rules/local-files-mode.md` → no L2 failure;
    - (r) a `docs/REQUIREMENTS` mention in a scratch README → no L2 failure.
- **Real repo before S6:** L2 reports 23 violations in 20 READMEs. They are expected red and owned by S6.
- **Done when.** 18/18 mutations as expected, and the verification holds.
- **Rollback.** §5.2.

### S8 — regenerate `plugins/` (runs alone)

- **Role.** executor. **Depends:** S1–S7 closed. **Refs:** SPECS §9.
- **Do.**
  1. Pre-check: `git diff --numstat -- instructions/` equals S6's handoff. Otherwise STOP.
  2. `npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks false --source $PWD`.
  3. Proofs:
     - the `find plugins -type f -exec shasum {} +` diff vs `$B/plugins-sha.txt` = exactly the 462 paths in S6's handoff;
     - `diff -rq plugins agents/TEMP/315-merge-followup/scratch-p-S6` is empty;
     - regenerate into `…/scratch-regen`, then `diff -r plugins …/scratch-regen` is empty;
     - the `git status --porcelain plugins/` path set = baseline plus the `pa-schemas.md` copies.
  4. Record the per-target rendering of the 24 changed lines and the resolution check (AC-P3) → the handoff. S9 builds layer 2 from these.
- **Done when.** All proofs hold.
- **Rollback.** Preferred: revert S6 from its backup and re-run step 2; then the diff vs `$B/plugins-sha.txt` is empty. Fallback (R2 exception): `rsync -a --delete $B/plugins-backup/ plugins/`.

### S9 — Track B equivalence gate

- **Role.** engineer. **Depends:** S8, Q3. **Refs:** SPECS §4; AN B.4-B.6 (`architecture-notes.md:357-428`); `plans/issue-315-plugin-sets/verify/ac_equivalence.py:1-136`.
- **Do.**
  1. `ac_equivalence.py`:
     - root, `--tree`, `--golden` at `:14-19`;
     - the `__main__` guard at `:136`;
     - the layers and their evaluation order after `:59`;
     - `compare()` at `:73-90`;
     - the report and two-way contract at `:92-133`.
  2. `gen_permitted_content.py` (`main`, `branch`) and the generated `permitted_content.json`: layer 1 = 31 skills; layer 2 = 15 strict + 7 presence files (Q3 = presence-only: the 6 P READMEs + `requirements-authoring`), from S8's record. Source diff base: `0ad95943`.
- **Verify.**
  - `python3 plans/issue-315-plugin-sets/verify/ac_equivalence.py` → ALL PASS.
  - `gen_permitted_content.py main --from 785054e9 --to 1513c578 --check` → 0.
  - `--tree <cp of scratch-true>` → only hooks-family diffs are unaccounted; they are listed.
- **Mutations.** AC-B2 (9 cases) on `cp -R plugins …/scratch-eq`, each with `--tree`; AC-B3.
- **Done when.**
  - All RED as expected; GREEN on the real tree.
  - The manifest diff has been reviewed in the loop, and `source.commits` is present.
- **Rollback.** §5.2.

### S10 — `scripts/pre_commit.py` wiring (D2)

- **Role.** engineer. **Depends:** S2, S7, S8. **Refs:** SPECS §2.9; `scripts/pre_commit.py:81-107`.
- **Touch.** `scripts/pre_commit.py` only. **Back it up first** (INV-6).
- **Do.** `build_checks()`, the 5 verify entries after `plugin sync`, `main(argv)`, `--only` with slugs, and exit 64 for an unknown name.
- **Verify.** NEVER run it without `--only`.
  - Import check: `venv/bin/python -c "import runpy; m=runpy.run_path('scripts/pre_commit.py', run_name='x'); print([c.name for c in m['build_checks']()])"` → the 9 names in order.
  - `--only verify-structure`, `verify-crossrefs`, `verify-hooks-content` → 0 each.
  - `verify-counts` and `verify-links` → 0 once S3, S4 and S11 have landed; before that nonzero, ending `Pre-commit failed during verify counts.` (recorded).
  - `--only bogus` → 64.
  - `bash scripts/verify/ac_structure.sh` still PASS: 1 non-comment `rosettify-plugins` line.
  - The comment block and the `plugin sync` line match the backup by content (`grep -F` the 7 lines) (F-18).
- **Mutations** (scratch root): replace `$S/scripts/verify/ac_crossrefs.py` with `import sys; sys.exit(1)` → `venv/bin/python $S/scripts/pre_commit.py --only verify-crossrefs` exits nonzero and names it. Restored → 0.
- **Done when.** The above hold; `git diff -- scripts/pre_commit.py` = the owner comment + S10's additions.
- **Note.** Until the generator is published, a real full pre-commit may be red on the wired checks (SPECS §9). This is not a defect.
- **Rollback.** Copy the backup back.

### S11 — Track D-web via `sync-web-site` (G-DWEB inside; D9)

- **Role.** engineer, following `.claude/skills/sync-web-site/SKILL.md` §0–§4 (`:59-82`) with this plan's scope. The skill's 5-day window and its own widening (SKILL `:145`) are overridden. **Depends:** S3, S7. **Refs:** SPECS §6.4, §5.2, §5.4.
- **Do.**
  1. §1–§2 on the scoped pages (read-only; may start in Phase 2).
  2. §3: `agents/TEMP/315-merge-followup/dweb-table.md` with columns page | line | was | became | source (root `path:line` or SPECS row). It covers every SPECS §6.4 row, the P3 options, and a row that records the static-validation deviation (D9). → **G-DWEB.**
  3. §4: apply only the approved rows.
  4. Static validation: body diff per shared heading (SKILL `:144`); spacing re-read (SKILL `:140`). No server, no `bundle install`.
  5. SKILL lessons: new lessons only, plus the `:150` hint → `instructions/r3/*/skills`.
- **Verify.**
  - `bash scripts/verify/ac_links.sh` → `dead=0`.
  - `python3 scripts/verify/ac_counts.py` → ALL PASS.
  - The AC-D2 grep returns nothing.
  - `docs/web/llms-full.txt` and `docs/web/user-guide` are unchanged.
- **Done when.** AC-D1–D3 hold, and each edited region maps to an approved row.
- **Rollback.** §5.2.

### S12 — whole-diff review (coding-flow Phases 8, 12)

- **Role.** reviewer, fresh.
- **Inputs:**
  - SPECS, PLAN and all handoffs;
  - `git diff` (worktree vs HEAD `7b3e7426`) of every §4 file, read against `$B/worktree-vs-head.patch`;
  - the new and moved files.
- **Checks:**
  - every AC;
  - cross-session consistency:
    - canonical sentence byte-identity;
    - one scope file;
    - the layer-2 text equals S8's recorded rendering;
    - the §7a lines equal the transform;
  - R1–R12;
  - test quality: no vacuous pass, branch printed, census present;
  - scope; history and generated files untouched.
- **Exit.** 0 blocking findings. Fixes go to the owning engineer, at most 2 rounds, then G-ESC.

### S13 — validation (coding-flow Phases 9, 11, 13)

- **Role.** validator. Runs §8 in full. Writes `validation.md`: each command, its rc and last line, **the D8 waiver statement**, the D9 static-web deviation, and the residual risks (F-12, publish-first). Checks §9 honestly. Any RED → STOP. The validator fixes nothing.

## 8. Final verification matrix (S13)

```
B=agents/TEMP/315-merge-followup/baseline; T=agents/TEMP/315-merge-followup/scratch-true-final; R=agents/TEMP/315-merge-followup/scratch-regen-final
# --- pre-commit steps, run separately (D8 waiver of docs/ARCHITECTURE.md:300; npx not used) ---
npm --prefix src/hooks run build:quiet --silent                                   # 1 hooks build
rm -rf $R && npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks false --source $PWD --output $PWD/$R
diff -r plugins $R                                                               # 2 plugin sync (local): empty
venv/bin/python scripts/pre_commit.py --only verify-structure --only verify-crossrefs \
  --only verify-hooks-content --only verify-counts --only verify-links          # 3 verify: "Pre-commit checks passed."
bash src/validate-types.sh                                                       # 4 type validation: rc 0
bash src/run-tests.sh                                                            # 5 tests: "Test validation passed"
# --- the checks individually, posture false ---
bash    scripts/verify/ac_structure.sh                        # STRUCTURE: ALL PASS
python3 scripts/verify/ac_crossrefs.py                        # CROSSREFS: ALL PASS
python3 scripts/verify/ac_hooks_content.py --require-golden   # ALL PASS (golden cross-check: RAN)
python3 scripts/verify/ac_counts.py                           # COUNTS: ALL PASS
bash    scripts/verify/ac_links.sh                            # LINKS: ALL PASS, dead=0
python3 plans/issue-315-plugin-sets/verify/ac_equivalence.py  # EQUIVALENCE: ALL PASS (manual #315 gate)
python3 plans/issue-315-plugin-sets/verify/gen_permitted_content.py main --from 785054e9 --to 1513c578 --check
grep -rn 'instructions/r3' instructions/r3 | grep -v 'core/rules/local-files-mode.md'   # AC-P1: empty
# --- posture true (scratch only) ---
npm --prefix src/hooks run build
rm -rf $T && npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks true --source $PWD --output $PWD/$T
bash    scripts/verify/ac_structure.sh --tree $T
python3 scripts/verify/ac_hooks_content.py --tree $T --posture true       # NOT APPLICABLE — posture=true
python3 plans/issue-315-plugin-sets/verify/ac_equivalence.py --tree $T    # hooks-family only; record the list
ROSETTA_PLUGINS_DIR=$PWD/$T src/hooks/node_modules/.bin/vitest run --root src/hooks tests/regression/hooks-registered.test.ts tests/regression/hook-set-isolation.test.ts   # 33x advisory
# --- suites, with counts ---
npm --prefix src/rosettify-plugins test    # 940
npm --prefix src/hooks test                # 0 failed files; = the count in S1's handoff
npm --prefix src/curiocity test            # 432
# --- pipeline ---
<keyed actionlint per S0 step 5> | diff - $B/actionlint-keyed.txt    # per-key counts not higher; 0 in the new step
bash agents/TEMP/315-merge-followup/scratch-release/run-dry.sh       # AC-F2 + AC-F3
# --- git and state proof ---
test "$(git rev-parse HEAD)" = "$(cat $B/head.txt)"                   # still 7b3e7426: no commit
git diff --cached --quiet                                             # nothing staged
test ! -f .git/MERGE_HEAD
git config --local --get core.hooksPath | diff - $B/hooks-path.txt    # hooks setting untouched
test "$(git tag -l | shasum)" = "$(cat $B/tags.sha)"                  # no tag
git ls-remote origin refs/heads/feat/315-plugin-sets | diff - $B/remote-branch.txt   # no push
git config --get user.name | diff - $B/git-user.txt
find plugins -type f -exec shasum {} + | sort -k2 | diff $B/plugins-sha.txt - | grep '^[<>]' | awk '{print $NF}' | sort -u   # == S6's 462 paths
git status --porcelain | grep -vE '^( M | D |\?\? )'                 # empty: only worktree edits, S2 moves, new files
```

- Take `plugins-sha` snapshots before and after the suites: a suite that writes into `plugins/` fails the matrix.

## 9. Definition of Done (S12 and S13 check each item honestly; `[x]` only with evidence)

- [ ] S0 baseline complete (incl. the worktree patch, the plugins backup, the keyed actionlint, and a regeneration diff of exactly the 21 `requirements-authoring` copies). G0 and G0-bis answers recorded (D10).
- [ ] A: template test restored; `hooks-registered` 33 entries derived from `plugins.json` + census, two-way, branch printed; `hook-set-isolation` 28; 12/12 mutations; the suite has 0 failed files at the exact recorded count; posture true gives 33× `advisory`.
- [ ] V: 3 checks in `scripts/verify/`, location-rooted, `/tmp`-invariant; AC1 counts non-comment lines; `NO_HOOK_SETS` at both postures; no silent skip; the golden check three-state; `shellcheck -S warning` rc=0.
- [ ] V: `live_counts.json` is the single scope/rule/site definition, read by both checks; both checks meet SPECS §2.7–2.8; `ac_links` `dead=0` with the slash boundary; 15/15 mutations.
- [ ] V: `pre_commit.py` has 5 verify entries after `plugin sync`, `--only` slugs, 64 on an unknown name, the kept lines equal by content, `ac_equivalence` not wired; the full script was never run.
- [ ] V: every SPECS §2.10 reference updated, incl. the two design notes (P7); line counts unchanged; `CHANGES.md` untouched.
- [ ] P: 20 READMEs / 23 lines plugin-relative, plus the `pa-schemas.md` rule; AC-P1–P3; L2 `l2_violations=0`; 462 regenerated copies; 299/301 tokens resolve (2 pre-existing Codex exceptions reported).
- [ ] B: ALL PASS; layer 1 = 31 skills; layer 2 = 15 strict + 7 presence (incl. `requirements-authoring`), matching S8's rendering record; AC-B2 9/9 and AC-B3 RED; posture-true list recorded.
- [ ] C: C1–C18 exactly as SPECS §5.2; `ac_counts` ALL PASS; C14 on line 159 only.
- [ ] D3: `pre-commit-plugin-sync.md`, `DEVELOPER_GUIDE.md:303` and `docs/ARCHITECTURE.md:434` state the new step order; web mirrors via S11.
- [ ] D-web: G-DWEB table approved before any web edit; static validation recorded as a deviation (D9); P3 decided; `docs/web/llms-full.txt` and `docs/web/user-guide/**` untouched.
- [ ] E: 2 prompts, 6 workflow comments, `run-test-cases.sh:38`.
- [ ] F: names and date unchanged; 3-block layout; `<!-- -->`; this run's dated links; guard before tagging; `--notes-file` on both paths; the notes failure warns and ships; body replaced each run; summary grouped; dry-run + negatives pass; keyed actionlint not higher.
- [ ] Regeneration: local generator only; the `plugins-sha` delta = exactly S6's 462 paths; `diff -r` vs a fresh generation is empty.
- [ ] D8: all 5 pre-commit steps run separately and green; the waiver recorded in `validation.md`.
- [ ] Suites: rosettify-plugins 940, hooks at the recorded count with 0 failed files, curiocity 432.
- [ ] Git: HEAD still `7b3e7426`; nothing staged; no `MERGE_HEAD`; tags, remote branch, `user.name` and `core.hooksPath` unchanged; status shows only ` M`, ` D` and `??`.
- [ ] Every mini-loop closed in ≤ 3 rounds or went through G-ESC; handoffs complete; deviations and assumptions listed.
- [ ] SPECS §10 out-of-scope items untouched and listed.
- [ ] G-IMPL approved, with the F-12 residual risk and the publish-first consequence stated plainly.

## 10. HITL gates

| Gate | When | Presented | Pass condition |
|---|---|---|---|
| G0 | done | owner answers: `coding-flow-state.md:44-61` (D1–D10, P1, P3 at G-DWEB, P5, P6, P7; P2 superseded by D3) | answered |
| G0-bis | done | Q1–Q3 answered, below | answered |
| G-DWEB | S11 step 2 | `dweb-table.md` | explicit approval per `.claude/skills/sync-web-site/SKILL.md:73-75`; only approved rows are applied |
| G-IMPL (Phase 10) | after S13 | `validation.md`, DoD, deviations, anomalies. **Residual risks stated plainly:** (1) F-12: the first real run of the new release logic is a production release (tags force-moved, RAGFlow DEV publish), so watch it; (2) publish-first: a full pre-commit may be red until the generator is published; (3) D8: the full pre-commit was not run (waived), only its steps separately. Also a proposed `agents/IMPLEMENTATION.md` entry, written only if approved | explicit owner approval |
| G-ESC | a mini-loop at its limit, any R-rule breach, any unexpected RED in S0/S8/S13 | the finding with evidence | owner decides; work stays stopped |

G0-bis answers (`coding-flow-state.md:63`):

- **Q1 = YES.** `ac_links.sh` rule L2 runs on every commit (SPECS §2.8; S7 mutations (p)–(r)).
- **Q2.** `coding-agents-prompt-authoring/README.md:53` searches `. docs/REQUIREMENTS` and drops the 3 `docs/stories` citations (SPECS §7a T1; S6).
- **Q3 = presence-only** for the 6 path-class READMEs, plus `requirements-authoring` (SPECS §4; S9).

## 11. Revision 2 changelog (PLAN side; SPECS side in SPECS §R)

| Item | Change here |
|---|---|
| D1 / F-01 | new S6 (P) owns all `instructions/**`; the orchestration line moved out of S4; S8 expects 441 files; S9 layer 2 = 21 files; R11 |
| D2 / F-04 | S10 slugs, exit 64 |
| D3 / F-05 | S3 touch list + DoD line |
| D4 / F-02 | S7 mutation (m); baseline prototype `scratch-links-proto-slash.sh` (94) |
| D5 / F-07 | S1: 33 entries, census mutations (10)–(12) |
| D6 / F-16 | new S7 owns `live_counts.json` + both checks; the parity check is a consumer test only |
| D7 / F-12, F-13, F-22 | S5 3-block layout, fallback and notes-failure shims; G-IMPL residual risk |
| D8 / F-14 | S13 runs the 5 steps separately; waiver in `validation.md`; G-IMPL |
| D9 / F-21 | S11 static validation as a recorded deviation, with its own G-DWEB row |
| D10 / F-06 | G0 defaults removed; G0-bis needs explicit answers |
| P1, P3, P6, P7 | P1 applied in S3/S11; P3 at G-DWEB; P6 in S5; P7 in S2 |
| F-03 | §5.3 anchored excludes + Step 0 GREEN (R9) |
| F-08, F-09, F-10 | S2 no-silent-skip checks and `shellcheck -S warning`; S6 `numstat`/`MM` expectations |
| F-11 | S0 worktree patch, pre-existing shas, plugins backup; S8 fallback rollback |
| F-15 | S0/S5/S13 keyed actionlint |
| F-23 | R11 |
| F-17, F-18, F-19, F-20, F-24 (Low; applied though not in the requested list) | S2 AC1 bare token; S10 content comparison; S1 exact count; AC-D2 scope; R12 `npm exec` |

## 12. Revision 3 changelog

| Item | Change here |
|---|---|
| Git state (`0ad95943`, `5c97c1ed`, `7b3e7426`; no MERGE_HEAD; hooks off) | TLDR; R1 (worktree-only `git restore` for clean tracked files); S0 step 1 (HEAD `7b3e7426`, staged-rc, hooksPath, worktree-vs-head patch); §5.2 rollback by file category; §8 git proof; DoD git line |
| `requirements-authoring` README stale in 21 plugin copies | S0 step 7 expects exactly 21 lines; S6/S8 expect 462; S9 presence entry, base `0ad95943`, AC-B2 9 cases |
| `docs/requirements` → `docs/REQUIREMENTS` | S2 touch list, S7 mutation (o) |
| Q1 = YES | S7 L2 rule + mutations (p)–(r); S6 note; 18 mutations |
| Q2 | S6 trap line |
| Q3 = presence-only | S9 layer 2 = 15 strict + 7 presence |
| G0-bis | answered; Phase 1 no longer waits on it |

