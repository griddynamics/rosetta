# Saleor benchmark: preliminary results (2026-10-21)

**Status: preliminary.** What has been run so far, end to end with a report: **3 runs** on **Claude Code** (Sonnet 5.5, effort medium), all on the **small task** (product "storage conditions" field across backend, dashboard and storefront). Copilot runs, the large task and the other methods follow; the full version will be published later.

Each run has its own folder with the agent's diffs, its own report and a token breakdown: [`saleor/runs/`](../runs/). Generated table of all runs: [`summary.md`](./summary.md) (`python3 saleor/scripts/collect-results.py`). Method, rules and scoring: [`BENCHMARKS.md`](../../BENCHMARKS.md).

## Small task · Claude Code

| | Baseline (`S-CC-01`) | Grill-with-docs (`S-CC-02`) | Superpowers (`S-CC-03`) |
| --- | --- | --- | --- |
| How it ran | plain Claude Code in plan mode | `/grill-with-docs` interview, then plain Claude Code | plain prompt; Superpowers loaded brainstorming → writing-plans → executing-plans + TDD by itself |
| Questions the agent asked | 0 | 14 (2 rounds, ~11 min) | 1 (+ 4 design/plan approvals) |
| Hidden requirements: asked / covered without asking / missed | 0 / 4 / 3 | 5 / 2 / 0 | 1 / 5 / 1 |
| First-pass coverage of hidden requirements | 57 % | 100 % | 86 % |
| Follow-ups needed after the first "done" | 3 | 0 | 1 |
| Time to first "done" / total | 29 / 70 min | 38 / 38 min | 44 / 62 min |
| Cost to first "done" / total (`/cost`) | $1.24 / $3.31 | $4.82 / $4.89 | $6.76 / $8.08 (incl. $2.19 Opus reviewer subagent) |
| "Done when" checks passed (operator, at the end) | 7 / 8 | 8 / 8 | 7 / 8 |
| Red flags | 1 (unrelated files changed) | 0 | not assessed |
| Tests at the end (operator) | pass | pass | not reported (agent: pass) |
| Operator score (1–5) / merge-ready | 3 / no | 4 / yes | 3 / not reported |

**Reading it:**
- Grill's interview caught most of the hidden requirements up front (length limit, translation, webhooks/CSV export); Baseline asked nothing and needed 3 follow-ups for exactly those (length limit, translation, webhooks/export).
- Baseline was cheaper and faster to its first "done", but 40 % of its total cost went into fixing what it had missed. Grill spent more up front and almost nothing after.
- Superpowers stated its assumptions up front (plain text, 250 chars, product level) and asked only about translation, so it covered 6 of 7 at first pass; it missed webhooks/CSV export (1 follow-up). It was the most expensive of the three ($8.08), a quarter of it on an Opus reviewer subagent that Superpowers dispatches itself.
- Baseline and Grill made the same API decision on their own (a new `ProductTranslationInput` type, a breaking change in the translation mutation): worth a reviewer's look in both.

## Caveats (read before quoting the numbers)

- **One run per method (n = 1).** No repetitions yet; differences can be noise. Our rule is at least 3 runs per cell before a conclusion.
- **Not yet judged.** The scores are the operator's; the independent judge scores (absolute and side by side) are not done yet.
- **Superpowers run notes** (`S-CC-03`, section 8): ran before the method guide (plain prompt instead of `/superpowers:brainstorming`, some replies not the fixed ones), old setup like `S-CC-02`; the operator's per-check results, tests and merge-ready were not recorded; the session log was lost, so `tokens.md` is built from `/cost`; the operator used an AI assistant to suggest replies (BENCHMARKS.md §3.5 says no human-side AI).
- **Not identical setups.** `S-CC-02` ran before two setup fixes (some upstream `CLAUDE.md` / `AGENTS.md` files were still in the repos, and the agent's shell used Node 20) and on Claude Code 2.1.304; `S-CC-01` ran on the fixed setup with 2.1.305. Details in each report, section 8.
- **IDE context.** Both runs used Claude Code in the VS Code terminal, which can pass the open file to the agent; future runs use a standalone terminal. In `S-CC-01` the IDE tools were not used (`tokens.md`).

## Next

1. Large task: Superpowers (`L-CC-03`) is in the branch (operator checks not filled yet); other methods follow.
2. The remaining Claude Code runs of the small task (Spec Kit, AI-DLC, Rosetta: in progress today; Rosetta Light: to be re-run), then the large task (age-restricted products).
3. Judge scores; repetitions.
4. Copilot runs once a Copilot seat with the benchmark model is available.
