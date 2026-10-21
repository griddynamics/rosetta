# Saleor benchmark — experiment matrix

All scored experiments of the Saleor benchmark: **7 methods × 2 runners × 2 tasks = 28 runs** (one repetition). Rules, prompts and scoring are in [../BENCHMARKS.md](../BENCHMARKS.md).

Methods come from the presentation slide "Six approaches, one more if time allows" plus Rosetta Light. Not scored: BMAD-METHOD (optional, "if time allows", one task only); GSD (archived upstream in May 2026).

## Overview

| Method | What is installed for the run | In Copilot | Small · Claude Code | Small · Copilot | Large · Claude Code | Large · Copilot |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline | only the shared team rules file (`baseline-instructions.md`) | Yes | `S-CC-01` | `S-CP-01` | `L-CC-01` | `L-CP-01` |
| Grill-with-docs | mattpocock/skills `grill-with-docs` @ `447ca70` | Manual port | `S-CC-02` | `S-CP-02` | `L-CC-02` | `L-CP-02` |
| Superpowers | superpowers v6.4.2 | Copilot CLI | `S-CC-03` | `S-CP-03` | `L-CC-03` | `L-CP-03` |
| Spec Kit | Spec Kit v1.0.13 + constitution per repo | Yes | `S-CC-04` | `S-CP-04` | `L-CC-04` | `L-CP-04` |
| AWS AI-DLC | AI-DLC v2.10.0 | Via repository files | `S-CC-05` | `S-CP-05` | `L-CC-05` | `L-CP-05` |
| Rosetta | plugin `rosetta` 3.1.17 only | Yes | `S-CC-06` | `S-CP-06` | `L-CC-06` | `L-CP-06` |
| Rosetta Light | plugin `rosetta-light` 3.1.17 only | Yes | `S-CC-07` | `S-CP-07` | `L-CC-07` | `L-CP-07` |

Run ID format: `<task>-<runner>-<method#>` — `S`/`L` = small/large task, `CC`/`CP` = Claude Code / Copilot. This ID is for operators only; the judge sees a separate random `run_id` (see `reports/mapping.csv`).

## All 28 runs

Status values: `planned` · `running` · `done` · `not qualifying` (method can't run on that runner after 2 attempts) · `infra-fail` (rerun from a clean reset). One folder per run ID. A new run of the same ID replaces the folder: commit the old run first, then it stays in git history.

| # | Run ID | Task | Runner | Model · effort | Method | Run folder | Status |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `S-CC-01` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Baseline | `runs/small-storage-conditions/claude-code/baseline/` | planned |
| 2 | `S-CC-02` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Grill-with-docs | `runs/small-storage-conditions/claude-code/grill-with-docs/` | done (old setup, see report section 8) |
| 3 | `S-CC-03` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Superpowers | `runs/small-storage-conditions/claude-code/superpowers/` | planned |
| 4 | `S-CC-04` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Spec Kit | `runs/small-storage-conditions/claude-code/spec-kit/` | planned |
| 5 | `S-CC-05` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | AWS AI-DLC | `runs/small-storage-conditions/claude-code/aws-ai-dlc/` | planned |
| 6 | `S-CC-06` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Rosetta | `runs/small-storage-conditions/claude-code/rosetta/` | planned |
| 7 | `S-CC-07` | Small — product storage conditions | Claude Code | Sonnet 5.5 · medium | Rosetta Light | `runs/small-storage-conditions/claude-code/rosetta-light/` | planned |
| 8 | `S-CP-01` | Small — product storage conditions | GitHub Copilot | GPT-5.6 Terra · medium | Baseline | `runs/small-storage-conditions/copilot/baseline/` | planned |
| 9 | `S-CP-02` | Small — product storage conditions | GitHub Copilot | GPT-5.6 Terra · medium | Grill-with-docs | `runs/small-storage-conditions/copilot/grill-with-docs/` | planned ⚠ Copilot: manual port |
| 10 | `S-CP-03` | Small — product storage conditions | GitHub Copilot | GPT-5.6 Terra · medium | Superpowers | `runs/small-storage-conditions/copilot/superpowers/` | planned ⚠ Copilot: runs in Copilot CLI |
| 11 | `S-CP-04` | Small — product storage conditions | GitHub Copilot | GPT-5.6 Terra · medium | Spec Kit | `runs/small-storage-conditions/copilot/spec-kit/` | planned |
| 12 | `S-CP-05` | Small — product storage conditions | GitHub Copilot | GPT-5.6 Terra · medium | AWS AI-DLC | `runs/small-storage-conditions/copilot/aws-ai-dlc/` | planned ⚠ Copilot: via repository files |
| 13 | `S-CP-06` | Small — product storage conditions | GitHub Copilot | GPT-5.6 Terra · medium | Rosetta | `runs/small-storage-conditions/copilot/rosetta/` | planned |
| 14 | `S-CP-07` | Small — product storage conditions | GitHub Copilot | GPT-5.6 Terra · medium | Rosetta Light | `runs/small-storage-conditions/copilot/rosetta-light/` | planned |
| 15 | `L-CC-01` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Baseline | `runs/large-age-restriction/claude-code/baseline/` | planned |
| 16 | `L-CC-02` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Grill-with-docs | `runs/large-age-restriction/claude-code/grill-with-docs/` | planned |
| 17 | `L-CC-03` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Superpowers | `runs/large-age-restriction/claude-code/superpowers/` | planned |
| 18 | `L-CC-04` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Spec Kit | `runs/large-age-restriction/claude-code/spec-kit/` | planned |
| 19 | `L-CC-05` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | AWS AI-DLC | `runs/large-age-restriction/claude-code/aws-ai-dlc/` | planned |
| 20 | `L-CC-06` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Rosetta | `runs/large-age-restriction/claude-code/rosetta/` | planned |
| 21 | `L-CC-07` | Large — age-restricted products | Claude Code | Sonnet 5.5 · medium | Rosetta Light | `runs/large-age-restriction/claude-code/rosetta-light/` | planned |
| 22 | `L-CP-01` | Large — age-restricted products | GitHub Copilot | GPT-5.6 Terra · medium | Baseline | `runs/large-age-restriction/copilot/baseline/` | planned |
| 23 | `L-CP-02` | Large — age-restricted products | GitHub Copilot | GPT-5.6 Terra · medium | Grill-with-docs | `runs/large-age-restriction/copilot/grill-with-docs/` | planned ⚠ Copilot: manual port |
| 24 | `L-CP-03` | Large — age-restricted products | GitHub Copilot | GPT-5.6 Terra · medium | Superpowers | `runs/large-age-restriction/copilot/superpowers/` | planned ⚠ Copilot: runs in Copilot CLI |
| 25 | `L-CP-04` | Large — age-restricted products | GitHub Copilot | GPT-5.6 Terra · medium | Spec Kit | `runs/large-age-restriction/copilot/spec-kit/` | planned |
| 26 | `L-CP-05` | Large — age-restricted products | GitHub Copilot | GPT-5.6 Terra · medium | AWS AI-DLC | `runs/large-age-restriction/copilot/aws-ai-dlc/` | planned ⚠ Copilot: via repository files |
| 27 | `L-CP-06` | Large — age-restricted products | GitHub Copilot | GPT-5.6 Terra · medium | Rosetta | `runs/large-age-restriction/copilot/rosetta/` | planned |
| 28 | `L-CP-07` | Large — age-restricted products | GitHub Copilot | GPT-5.6 Terra · medium | Rosetta Light | `runs/large-age-restriction/copilot/rosetta-light/` | planned |

## Copilot setup per method

All 7 methods are tested on both runners. Details are in BENCHMARKS.md, section 3.5, "All methods on both runners".

- **Grill-with-docs:** no official Copilot support. **Manual port** of the skill into `.github/skills/`. Mark its Copilot runs `manual port`.
- **Superpowers:** officially Copilot **CLI** only. Its Copilot runs use Copilot CLI with the same model, effort and full access. Mark them `runner: Copilot CLI`.
- **AWS AI-DLC:** supported in Copilot through repository files set up by its installer.
- If a method still can't be activated after 2 attempts from a clean reset, mark the cell `not qualifying` with the reason.

## Optional (not in the 28)

| Run ID | Task | Runner | Method | Status |
| --- | --- | --- | --- | --- |
| `X-CC-08` | one task, chosen before the run | Claude Code | BMAD-METHOD | only if time allows |
