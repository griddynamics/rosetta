# Saleor benchmark — experiment matrix

All scored experiments of the Saleor benchmark: **8 methods × 2 runners × 2 tasks = 32 runs** (one repetition). Rules, prompts and scoring are in [../BENCHMARKS.md](../BENCHMARKS.md). The two runners are Claude Code and GitHub Copilot **CLI**: every Copilot cell (`CP`) runs in Copilot CLI 1.0.101, never in VS Code.

Methods come from the presentation slide "Six approaches, one more if time allows" plus Rosetta Light and Rosetta Skills. Not scored: BMAD-METHOD (optional, "if time allows", one task only); GSD (archived upstream in May 2026).

## Overview

| Method | What is installed for the run | In Claude Code | In Copilot CLI | Small · Claude Code | Small · Copilot | Large · Claude Code | Large · Copilot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | only the shared team rules file (`baseline-instructions.md`); starts in the runner's plan mode | Yes (plan mode) | Yes (plan mode) | `S-CC-01` | `S-CP-01` | `L-CC-01` | `L-CP-01` |
| Grill-with-docs | plugin `mattpocock-skills` @ `claude-plugins-official` (`49dd158`; S-CC-02: `447ca70`) | Plugin (official marketplace) | skills.sh installer (repository files) | `S-CC-02` | `S-CP-02` | `L-CC-02` | `L-CP-02` |
| Superpowers | superpowers v6.4.2 | Plugin | Plugin | `S-CC-03` | `S-CP-03` | `L-CC-03` | `L-CP-03` |
| Spec Kit | Spec Kit v1.0.13 + constitution per repo | `specify init --integration claude` (repository files) | `specify init --integration copilot` (repository files) | `S-CC-04` | `S-CP-04` | `L-CC-04` | `L-CP-04` |
| AWS AI-DLC | AI-DLC v2.10.0 | `aidlc config --harness claude` (repository files) | `aidlc config --harness copilot` (repository files) | `S-CC-05` | `S-CP-05` | `L-CC-05` | `L-CP-05` |
| Rosetta | plugin `rosetta` 3.1.17 only | Plugin | Plugin | `S-CC-06` | `S-CP-06` | `L-CC-06` | `L-CP-06` |
| Rosetta Light | plugin `rosetta-light` 3.1.17 only; no `/coding-flow`, prompt names skills `hitl`, `tech-specs` (both tasks) and `USE ROSETTA SUBAGENTS.` | Plugin | Plugin | `S-CC-07` | `S-CP-07` | `L-CC-07` | `L-CP-07` |
| Rosetta Skills | plugin `rosetta` 3.1.17 only; no `/coding-flow`, prompt names skills `hitl`, `tech-specs` (both tasks) | Plugin | Plugin | `S-CC-08` | `S-CP-08` | `L-CC-08` | `L-CP-08` |

Run ID format: `<task>-<runner>-<method#>` — `S`/`L` = small/large task, `CC`/`CP` = Claude Code / Copilot CLI. This ID is for operators only; the diff judge uses the run folder names.

## All 32 runs

Status values: `planned` · `running` · `done` · `not qualifying` (method can't run on that runner after 2 attempts) · `infra-fail` (rerun from a clean reset). One folder per run ID. A new run of the same ID replaces the folder: commit the old run first, then it stays in git history.

| # | Run ID | Task | Runner | Model · effort | Method | Run folder | Status |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `S-CC-01` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Baseline | `runs/small-storage-conditions/claude-code/baseline/` | done |
| 2 | `S-CC-02` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Grill-with-docs | `runs/small-storage-conditions/claude-code/grill-with-docs/` | done (old setup, see report section 8) |
| 3 | `S-CC-03` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Superpowers | `runs/small-storage-conditions/claude-code/superpowers/` | done (old setup, plain prompt without the entry command, see report section 8) |
| 4 | `S-CC-04` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Spec Kit | `runs/small-storage-conditions/claude-code/spec-kit/` | done |
| 5 | `S-CC-05` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | AWS AI-DLC | `runs/small-storage-conditions/claude-code/aws-ai-dlc/` | stopped by the operator during Construction (incomplete: no T1, partial diff, see report section 8) |
| 6 | `S-CC-06` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Rosetta Flow | `runs/small-storage-conditions/claude-code/rosetta-flow/` | done |
| 7 | `S-CC-07` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Rosetta Light | `runs/small-storage-conditions/claude-code/rosetta-light/` | done |
| 8 | `S-CP-01` | Small — product storage conditions | GitHub Copilot CLI | GPT-5.6 Terra · medium | Baseline | `runs/small-storage-conditions/copilot/baseline/` | done |
| 9 | `S-CP-02` | Small — product storage conditions | GitHub Copilot CLI | GPT-5.6 Terra · medium | Grill-with-docs | `runs/small-storage-conditions/copilot/grill-with-docs/` | done (2026-10-27; 2 follow-ups, both found by the operator on the running stack; run spans two days, agent time ≈ 17 min, see report section 8) |
| 10 | `S-CP-03` | Small — product storage conditions | GitHub Copilot CLI | GPT-5.6 Terra · medium | Superpowers | `runs/small-storage-conditions/copilot/superpowers/` | planned |
| 11 | `S-CP-04` | Small — product storage conditions | GitHub Copilot CLI | GPT-5.6 Terra · medium | Spec Kit | `runs/small-storage-conditions/copilot/spec-kit/` | done |
| 12 | `S-CP-05` | Small — product storage conditions | GitHub Copilot CLI | GPT-5.6 Terra · medium | AWS AI-DLC | `runs/small-storage-conditions/copilot/aws-ai-dlc/` | not qualifying: AI-DLC review gate loops at intent-capture after 2 clean resets. Report section 8; attempts saved in `_attempts/` |
| 13 | `S-CP-06` | Small — product storage conditions | GitHub Copilot CLI | GPT-5.6 Terra · medium | Rosetta Flow | `runs/small-storage-conditions/copilot/rosetta-flow/` | planned |
| 14 | `S-CP-07` | Small — product storage conditions | GitHub Copilot CLI | GPT-5.6 Terra · medium | Rosetta Light | `runs/small-storage-conditions/copilot/rosetta-light/` | done (2026-10-29; 1 follow-up, hidden #6; Copilot CLI 1.0.103 deviation; see report section 8) |
| 15 | `L-CC-01` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Baseline | `runs/large-age-restriction/claude-code/baseline/` | done |
| 16 | `L-CC-02` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Grill-with-docs | `runs/large-age-restriction/claude-code/grill-with-docs/` | done (task variant: key #5 replaced, report §8) |
| 17 | `L-CC-03` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Superpowers | `runs/large-age-restriction/claude-code/superpowers/` | done (old setup, plain prompt without the entry command; closed without the post-implementation prompt and the Done-when checks, see report section 8) |
| 18 | `L-CC-04` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Spec Kit | `runs/large-age-restriction/claude-code/spec-kit/` | done |
| 19 | `L-CC-05` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | AWS AI-DLC | `runs/large-age-restriction/claude-code/aws-ai-dlc/` | no result: stopped after more than 6 h and about $160 of usage without a first "done" (report to follow) |
| 20 | `L-CC-06` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Rosetta | `runs/large-age-restriction/claude-code/rosetta-flow/` | planned |
| 21 | `L-CC-07` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Rosetta Light | `runs/large-age-restriction/claude-code/rosetta-light/` | done (T0 without the `orchestration` skill, as the current protocol; "fully autonomous" message sent mid-run; report sections 2 and 8) |
| 22 | `L-CP-01` | Large — age-restricted products | GitHub Copilot CLI | GPT-5.6 Terra · medium | Baseline | `runs/large-age-restriction/copilot/baseline/` | done |
| 23 | `L-CP-02` | Large — age-restricted products | GitHub Copilot CLI | GPT-5.6 Terra · medium | Grill-with-docs | `runs/large-age-restriction/copilot/grill-with-docs/` | done (2026-10-27; interview covered all 9 hidden requirements; 5 follow-ups on the running stack, see report section 8) |
| 24 | `L-CP-03` | Large — age-restricted products | GitHub Copilot CLI | GPT-5.6 Terra · medium | Superpowers | `runs/large-age-restriction/copilot/superpowers/` | planned |
| 25 | `L-CP-04` | Large — age-restricted products | GitHub Copilot CLI | GPT-5.6 Terra · medium | Spec Kit | `runs/large-age-restriction/copilot/spec-kit/` | done (2026-10-27; 5 of 45 tasks open at T1, 3 follow-ups; score 2, not merge-ready, see report sections 5 and 8) |
| 26 | `L-CP-05` | Large — age-restricted products | GitHub Copilot CLI | GPT-5.6 Terra · medium | AWS AI-DLC | `runs/large-age-restriction/copilot/aws-ai-dlc/` | planned (Copilot: via repository files) |
| 27 | `L-CP-06` | Large — age-restricted products | GitHub Copilot CLI | GPT-5.6 Terra · medium | Rosetta Flow | `runs/large-age-restriction/copilot/rosetta-flow/` | planned |
| 28 | `L-CP-07` | Large — age-restricted products | GitHub Copilot CLI | GPT-5.6 Terra · medium | Rosetta Light | `runs/large-age-restriction/copilot/rosetta-light/` | planned |
| 29 | `S-CC-08` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Rosetta Skills | `runs/small-storage-conditions/claude-code/rosetta-skills/` | done (3 extra messages after T1 were not protocol follow-ups and are not counted, see report section 8) |
| 30 | `S-CP-08` | Small — product storage conditions | GitHub Copilot CLI | GPT-5.6 Terra · medium | Rosetta Skills | `runs/small-storage-conditions/copilot/rosetta-skills/` | planned |
| 31 | `L-CC-08` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Rosetta Skills | `runs/large-age-restriction/claude-code/rosetta-skills/` | done (rerun without the `orchestration` skill, 2026-10-26; the first run is in git history; Claude Code 2.1.310; 3 operator messages outside the protocol, report sections 2 and 8) |
| 32 | `L-CP-08` | Large — age-restricted products | GitHub Copilot CLI | GPT-5.6 Terra · medium | Rosetta Skills | `runs/large-age-restriction/copilot/rosetta-skills/` | planned |

## Claude Code setup per method

All 8 methods are tested on both runners. Every Claude Code cell runs with the method's own `CLAUDE_CONFIG_DIR` (`envs/<method>/claude`), model `claude-sonnet-5-5`, medium effort, `--dangerously-skip-permissions`. Details are in BENCHMARKS.md, section 3.5; the commands are in part 1 of each method file.

- **Baseline:** starts in Claude Code's plan mode (`--permission-mode plan`), full access switched on once the plan is approved; no hooks and no skills. See [methods/baseline.md](./methods/baseline.md).
- **Grill-with-docs:** official plugin `mattpocock-skills`, installed from the `claude-plugins-official` marketplace with `claude plugin install`.
- **Superpowers:** plugin, installed with `claude plugin install` from the pinned v6.4.2 clone.
- **Spec Kit, AWS AI-DLC:** repository files written by the method's own installer (`specify init --integration claude`, `aidlc config --harness claude`) and copied into the workspace root after every reset.
- **Rosetta, Rosetta Light, Rosetta Skills:** plugin `rosetta` / `rosetta-light`, installed with `claude plugin install` from the pinned 3.1.17 clone.
- If a method still can't be activated after 2 attempts from a clean reset, mark the cell `not qualifying` with the reason.

## Copilot setup per method

All 8 methods are tested on both runners. Every Copilot cell runs in **GitHub Copilot CLI** with the method's own `COPILOT_HOME` (`envs/<method>/copilot`), model `gpt-5.6-terra` on the long context tier (1M tokens: `contextTier long_context` and `--context long_context`), medium effort, `--allow-all` and `--no-auto-update`. Runs recorded before that setting (`S-CP-01`–`S-CP-04`, `L-CP-02` and `L-CP-04`) used the default tier. Details are in BENCHMARKS.md, section 3.5; the commands are in part 4 of each method file.

- **Baseline:** starts in Copilot CLI's plan mode, like the Claude Code runs; no hooks and no skill retrieval. See [methods/baseline.md](./methods/baseline.md).
- **Grill-with-docs:** no Copilot plugin; the README installs it on other agents with `npx skills@latest add mattpocock/skills` (all skills, agent GitHub Copilot), which writes repository files. Never copy single skills. Mark its Copilot runs `skills.sh installer`.
- **Superpowers:** plugin, installed with `copilot plugin install` from the pinned v6.4.2 clone.
- **Spec Kit, AWS AI-DLC:** repository files written by the method's own installer (`specify init --integration copilot`, `aidlc config --harness copilot`) and copied into the workspace root after every reset.
- **Rosetta, Rosetta Light, Rosetta Skills:** plugin `rosetta` / `rosetta-light`, installed with `copilot plugin install` from the pinned 3.1.17 clone.
- If a method still can't be activated after 2 attempts from a clean reset, mark the cell `not qualifying` with the reason.

## Optional (not in the 32)

| Run ID | Task | Runner | Method | Status |
| --- | --- | --- | --- | --- |
| `X-CC-08` | one task, chosen before the run | Claude Code | BMAD-METHOD | only if time allows |
