# Saleor benchmark: preliminary results (2026-10-26)

**Status: preliminary, 14 of 32 runs have a report (44 %), 11 of them usable now (34 %).** 13 runs on **Claude Code** (Sonnet 5.5, effort medium: 7 on the small task, product "storage conditions" field across backend, dashboard and storefront; 6 on the large task, age-restricted products) and the first **Copilot CLI** run (GPT-5.6 Terra, effort medium). The full version will be published later.

## Progress

The plan started with **28 runs**: 7 methods (Baseline, Grill-with-docs, Superpowers, Spec Kit, AWS AI-DLC, Rosetta coding flow, Rosetta Light) × 2 tasks × 2 runners. Then we decided to test three ways of using Rosetta (coding flow, Rosetta Light, Rosetta Skills), which added **4 Rosetta Skills runs: 32 in total**.

| | Original plan (28) | Added: Rosetta Skills (4) | All (32) |
| --- | ---: | ---: | ---: |
| Run, report in GitHub | **12 (43 %)** | 2 (50 %) | **14 (44 %)** |
| Usable now (reliable + with caveats) | 9 (32 %) | 2 (50 %) | 11 (34 %) |
| Not yet run | 16 (57 %) | 2 (50 %) | **18 (56 %)** |

By runner: Claude Code 13 of 16 (81 %), Copilot CLI 1 of 16 (6 %).

How far each run can be trusted (the reasons are in "Caveats" below):

| Group | Runs | Count |
| --- | --- | ---: |
| **Reliable**: run as the protocol says | Baseline (`S-CC-01`, `L-CC-01`), Rosetta Light (`S-CC-07`, `L-CC-07`), Rosetta Skills (`S-CC-08`, `L-CC-08`) | **6 (19 %)** |
| **Usable with caveats**: a setup or process deviation, documented in the report | Grill-with-docs `S-CC-02` (pilot on the old setup), Superpowers `S-CC-03` (old setup, AI-suggested replies), Spec Kit `S-CC-04` (end cost partly estimated) and `L-CC-04` (follow-ups drafted by an AI assistant), Superpowers `S-CP-03` (first Copilot run, before the Copilot setup was final: team rules file not loaded; operator score not filled yet) | **5 (16 %)** |
| **Rerun recommended**: not comparable as it is | Grill-with-docs `L-CC-02` (one hidden requirement replaced during the run), Superpowers `L-CC-03` (no final checks or score), Rosetta coding flow `S-CC-06` (ran without the one-time `/init-workspace-flow`, while Rosetta Light and Skills started from the initialized workspace) | **3 (9 %)** |
| **Not yet run** | Claude Code: AWS AI-DLC `S-CC-05` (an attempt was stopped during Construction, no report) and `L-CC-05` (in progress), Rosetta coding flow `L-CC-06`; Copilot CLI: 15 runs | **18 (56 %)** |

For every run so far: one run per method (no repetitions), the independent judge (code-quality scores) has not run yet, and operator scores come from different operators.

Each run has its own folder with the agent's diffs, its own report and a token breakdown: [`saleor/runs/`](../runs/). Generated table of all runs: [`summary.md`](./summary.md) (`python3 saleor/scripts/collect-results.py`). Method, rules and scoring: [`BENCHMARKS.md`](../../BENCHMARKS.md).

## All runs

Every run done so far: **14 of the 32** planned in [`EXPERIMENTS.md`](../EXPERIMENTS.md) (8 methods × 2 tasks × 2 runners), 13 on Claude Code and 1 on Copilot CLI; new runs are added as rows when they are committed. Numbers come from each run's report (data block); [`summary.md`](./summary.md) and [`runs.csv`](./runs.csv) are generated from the same reports. Hidden requirements: 7 in the small task, 9 in the large one. Time is to the first "done" (T1) and to the end of the last follow-up (T2), without the time the agent waited for the operator where the report computes it.

| Task | Runner | Run | Method | Status | Operator | Questions asked (hidden / extra) | Hidden: asked / covered / missed | First-pass coverage | Follow-ups | Time to first "done" / total | Cost to first "done" / total | "Done when" passed | Red flags | Tests at the end | Score / merge-ready |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| Small | Claude Code | `S-CC-01` | Baseline | done | Nina Jakovljevic | 0 | 0 / 4 / 3 | 57 % | 3 | 29 min / 1 h 10 min | $1.24 / $3.31 | 7 / 8 | 1 | pass | 3 / no |
| Small | Claude Code | `S-CC-02` | Grill-with-docs (old setup) | done | Oleksii Poletaiev | 14 (5 / 9) | 5 / 2 / 0 | 100 % | 0 | 38 min / 38 min | $4.82 / $4.89 | 8 / 8 | 0 | pass | 4 / yes |
| Small | Claude Code | `S-CC-03` | Superpowers (old setup) | done | agavrilita | 1 (1 / 0) | 1 / 5 / 1 | 86 % | 1 | 36 min / 41 min | $6.76 / $8.08 | 7 / 8 | not assessed | pass | 3 / not reported |
| Small | Claude Code | `S-CC-04` | Spec Kit | done | Oleksii Poletaiev | 0 | 0 / 4 / 3 | 57 % | 3 | 1 h 45 min / 3 h 23 min | $4.58 / ≈ $12.65 | 8 / 8 | 0 | pass | 3 / not stated |
| Small | Claude Code | `S-CC-06` | Rosetta | done | Nina Jakovljevic | 12 (3 / 9) | 3 / 4 / 0 | 100 % | 0 | 2 h / 2 h 28 min | $21.30 / $21.37 | 8 / 8 | 1 | pass | 5 / yes |
| Small | Claude Code | `S-CC-07` | Rosetta Light | done | Igor Solomatov | 12 (5 / 7) | 4 / 3 / 0 | 100 % | 0 | 1 h 32 min / 1 h 32 min | $5.48 / $5.48 | 8 / 8 | 0 | pass | 5 / yes |
| Small | Claude Code | `S-CC-08` | Rosetta Skills | done | Igor Solomatov | 10 (3 / 7) | 3 / 3 / 1 | 86 % | 1 | 56 min / 56 min | $5.64 / $5.64 | 8 / 8 | 0 | pass | 5 / yes |
| Large | Claude Code | `L-CC-01` | Baseline (plan mode) | done | Nina Jakovljevic | 1 (0 / 1) | 0 / 4 / 5 | 44 % | 5 | 37 min / 1 h 40 min | $3.86 / $7.84 | 12 / 12 | 1 | pass | 3 / no |
| Large | Claude Code | `L-CC-02` | Grill-with-docs (task variant) | done | Oleksii Poletaiev | 29 (13 / 16) | 6 / 3 / 0 | 100 % | 2 | 53 min / 1 h 23 min | $9.46 / $10.17 | 12 / 12 | 1 | pass | 4 / no |
| Large | Claude Code | `L-CC-03` | Superpowers (old setup) | done | agavrilita | 3 (1 / 2) | 1 / 4 / 4 | 56 % | 1 | 1 h 16 min / 3 h 23 min | $14.31 / $35.11 | not filled | not filled | not filled | not filled |
| Large | Claude Code | `L-CC-04` | Spec Kit (follow-ups drafted by the assistant) | done | Rustem Cimendur | 2 (0 / 2) | 0 / 4 / 4 (+1 partly) | 44 % | 5 | 51 min / 1 h 25 min | $5.95 / $11.04 | 12 / 12 | 4 | pass | 3 / no |
| Large | Claude Code | `L-CC-07` | Rosetta Light | done | Igor Solomatov | 14 (6 / 8) | 4 / 4 / 1 | 89 % | 2 | 5 h 49 min / 6 h 23 min | $53.30 / $57.65 | 12 / 12 | 0 | pass | 4 / yes |
| Large | Claude Code | `L-CC-08` | Rosetta Skills | done | Igor Solomatov | 20 (5 / 15) | 4 / 4 / 1 | 89 % | 1 | 1 h 59 min / 4 h 3 min | $62.50 / $67.47 | 12 / 12 | 0 | pass | 5 / yes |
| Small | Copilot CLI | `S-CP-03` | Superpowers (before the final Copilot setup) | done | agavrilita | 4 (3 / 1) | 3 / 3 / 1 | 86 % | 2 | 1 h 47 min / 2 h 34 min | 1 406.53 / 1 975.72 AI credits | 8 / 8 | 0 | pass | not filled |

**Reading it:**
- **Small task:** the methods that interview before coding (Grill-with-docs, Rosetta, Rosetta Light) reached 100 % first-pass coverage and needed no follow-ups; Baseline and Spec Kit asked nothing and missed the same 3 hidden requirements. Rosetta Light and Rosetta Skills got the same top operator score as full Rosetta (5 / merge-ready) at about a quarter of its cost ($5.48 and $5.64 against $21.37). Rosetta Skills missed one hidden requirement (CSV export and webhook payloads) in its first spec and needed 1 follow-up.
- **Large task:** `L-CC-02` is a task variant and is not comparable with the others (the operator replaced hidden key #5, see caveats). Grill-with-docs asked or handled all 9 hidden requirements but needed 2 follow-ups because the first "done" was not usable in the running app; Superpowers missed 4 of 9 at first pass and needed a second implementation round (most of its $35.11). Baseline (`L-CC-01`) asked nothing, missed 5 of 9 and needed 5 follow-ups, but was the cheapest ($7.84); 3 / no. Rosetta Light (`L-CC-07`) asked 14 questions, covered 8 of 9 at first pass, needed 2 follow-ups and got 4 / merge-ready, but ran the longest (5 h 49 min to first "done" without operator waits, 36 subagents) at $57.65. Spec Kit (`L-CC-04`) asked nothing about the hidden requirements, covered 4 of 9 on its own (44 %) and needed 5 follow-ups (who can read the birthday, audit log, age label, recommendation emails, shop time zone); it was cheap ($11.04) but not merge-ready (3 / no), with 4 red flags (dashboard schema/codegen not updated, two tests weakened, unrelated files changed). Rosetta Skills (`L-CC-08`) asked the most (20 questions, 15 outside the answer tables), covered 8 of 9 at first pass, needed 1 follow-up and got 5 / merge-ready, but was by far the most expensive run so far ($67.47).

## Details per task

### Small task · Claude Code

| | Baseline (`S-CC-01`) | Grill-with-docs (`S-CC-02`) | Superpowers (`S-CC-03`) | Spec Kit (`S-CC-04`) | Rosetta (`S-CC-06`) | Rosetta Light (`S-CC-07`) | Rosetta Skills (`S-CC-08`) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| How it ran | plain Claude Code in plan mode | `/grill-with-docs` interview, then plain Claude Code | plain prompt; Superpowers loaded brainstorming → writing-plans → executing-plans + TDD by itself | `/speckit-specify` → plan → tasks → implement, then implement/converge until "Converged" | `/coding-flow`: design, plan and implementation gates; 17 subagents (architect on Opus, engineers, reviewers, validators) | plain prompt naming skills `hitl`, `tech-specs` and `USE ROSETTA SUBAGENTS.` (no `/coding-flow`); 12 subagents on Haiku 5.5 (discoverers, engineers, reviewer, validators) | plain prompt naming skills `hitl`, `tech-specs` (no `/coding-flow`); all work in the main agent, no subagents |
| Questions the agent asked | 0 | 14 (2 rounds, ~11 min) | 1 (+ 4 design/plan approvals) | 0 (14 method commands typed by the operator) | 12 in 3 rounds (3 on hidden requirements, 9 extra) + 3 gate approvals | 12 (5 on hidden requirements, 7 extra) + 2 approvals | 10 (3 on hidden requirements, 7 extra) + 4 approvals |
| Hidden requirements: asked / covered without asking / missed | 0 / 4 / 3 | 5 / 2 / 0 | 1 / 5 / 1 | 0 / 4 / 3 | 3 / 4 / 0 | 4 / 3 / 0 | 3 / 3 / 1 |
| First-pass coverage of hidden requirements | 57 % | 100 % | 86 % | 57 % | 100 % | 100 % | 86 % |
| Follow-ups needed after the first "done" | 3 | 0 | 1 | 3 | 0 | 0 | 1 |
| Time to first "done" / total | 29 min / 1 h 10 min | 38 min / 38 min | 36 min / 41 min | 1 h 45 min / **3 h 23 min** | 2 h / 2 h 28 min | 1 h 32 min / 1 h 32 min | 56 min / 56 min |
| Cost to first "done" / total (`/cost`) | $1.24 / $3.31 | $4.82 / $4.89 | $6.76 / $8.08 (incl. $2.19 Opus reviewer subagent) | $4.58 / ≈ $12.65 | $21.30 / $21.37 (incl. $11.71 Opus architect subagent) | $5.48 / $5.48 | $5.64 / $5.64 |
| "Done when" checks passed (operator, at the end) | 7 / 8 | 8 / 8 | 7 / 8 | 8 / 8 | 8 / 8 | 8 / 8 | 8 / 8 |
| Red flags | 1 (unrelated files changed) | 0 | not assessed | 0 | 1 (validator changed dev-DB data outside its snapshot) | 0 | 0 |
| Tests at the end (operator) | pass | pass | pass | pass | pass | pass | pass |
| Operator score (1–5) / merge-ready | 3 / no | 4 / yes | 3 / not reported | 3 / not stated | 5 / yes | 5 / yes | 5 / yes |

**Reading it:**
- Grill's interview caught most of the hidden requirements up front (length limit, translation, webhooks/CSV export); Baseline asked nothing and needed 3 follow-ups for exactly those (length limit, translation, webhooks/export).
- Baseline was cheaper and faster to its first "done", but 40 % of its total cost went into fixing what it had missed. Grill spent more up front and almost nothing after.
- Superpowers stated its assumptions up front (plain text, 250 chars, product level) and asked only about translation, so it covered 6 of 7 at first pass; it missed webhooks/CSV export (1 follow-up). It was the most expensive of the three ($8.08), a quarter of it on an Opus reviewer subagent that Superpowers dispatches itself.
- Spec Kit asked nothing (`specify` wrote its own assumptions: 500 chars, not translated, no CSV), so it missed the same 3 hidden requirements as Baseline. Its strength is the `converge` loop: it kept finding real gaps until all 3 repos matched the spec, and the end result passed 8/8. The cost is operator effort and time: 14 method commands, 3 follow-ups, 3 h 23 min in total.
- Rosetta asked the right product questions up front (length limit, translation, webhooks/CSV) and covered the other 4 on its own: 7/7 on the first pass, 0 follow-ups, 8/8 checks, the only operator score of 5, and the only run where the agent kept the shared `TranslationInput` (no breaking API change). Its independent plan, code and test reviews caught real issues. The price: the most expensive and one of the slowest runs ($21.37, 148 min; 55 % of the cost on the Opus architect) and the heaviest operator load in questions (12, of which 9 outside the answer tables).
- Baseline and Grill made the same API decision on their own (a new `ProductTranslationInput` type, a breaking change in the translation mutation): worth a reviewer's look in both.

### Large task · Claude Code

| | Grill-with-docs (`L-CC-02`) | Rosetta Skills (`L-CC-08`) | Spec Kit (`L-CC-04`) | Baseline (`L-CC-01`) | Rosetta Light (`L-CC-07`) |
| --- | --- | --- | --- | --- | --- |
| How it ran | `/mattpocock-skills:grill-with-docs` interview (5 rounds), then implementation with 2 background subagents (dashboard, storefront); plugin `mattpocock-skills` 1.3.1 from `claude-plugins-official` | plain prompt naming skills `hitl`, `tech-specs`, `orchestration` (no `/coding-flow`); discovery, architect specs, staged implementation with 14 subagents (engineers, reviewers, validators) | `/speckit-specify` → plan → tasks → implement → converge (1 round) → implement; 4 subagents | plain Claude Code in plan mode; 2 Explore subagents | prompt naming skills `hitl`, `tech-specs` and `USE ROSETTA SUBAGENTS.`; discovery, architect specs, plan, staged implementation; 36 subagents |
| Questions the agent asked | 29 in 5 rounds (13 touching hidden requirements, 16 extra) + 1 summary approval | 20 (5 touching hidden requirements, 15 extra) + 2 approvals | 2 (both outside the answer tables) + 5 method commands | 1 (after T1, outside the tables) + plan approval | 14 (6 touching hidden requirements, 8 extra) in 4 rounds + 2 approvals |
| Hidden requirements: asked / covered without asking / missed | 6 / 3 / 0 (of 9; #5 replaced by the operator's variant, see caveats) | 4 / 4 / 1 | 0 / 4 / 4 (+1 partly) | 0 / 4 / 5 | 4 / 4 / 1 |
| First-pass coverage of hidden requirements | 100 % (9 / 9, #5 as the variant) | 89 % | 44 % | 44 % | 89 % |
| Follow-ups needed after the first "done" | 2 (migrations not applied to the running database; dashboard UI hidden behind `FF_USE_STAGING_SCHEMA`) | 1 | 5 (drafted by the assistant at the operator's request) | 5 | 2 (age label in lists; two failing time-dependent tests) |
| Time to first "done" / total | 53 min without operator waits (1 h 51 min wall) / 2 h 21 min wall to the last follow-up | 1 h 59 min / 4 h 3 min | 51 min / 1 h 25 min without operator waits (1 h 43 min / 6 h 13 min wall) | 37 min / 1 h 40 min | 5 h 49 min / 6 h 23 min without operator waits (8 h 22 min / 9 h 44 min wall) |
| Cost to first "done" / total (`/cost`) | $9.46 / $10.17 (subagents ≈ 40 %) | $62.50 / $67.47 | $5.95 / $11.04 | $3.86 / $7.84 | $53.30 / $57.65 |
| "Done when" checks passed (operator, at the end) | 12 / 12 (dashboard items only after the 2 follow-ups) | 12 / 12 | 12 / 12 (#10 checked through the API on 2026-10-23) | 12 / 12 | 12 / 12 |
| Red flags | 1 (said "done" while the feature was not usable in the running app) | 0 | 4 (schema/codegen not updated, tests weakened, unrelated files changed, dashboard customer query fails for non-superuser staff) | 1 | 0 |
| Tests at the end (operator) | pass (changed areas: backend 83, storefront 817, dashboard 77) | pass | pass (backend 75, storefront 818, dashboard 6159 + 1 timeout in an unchanged file) | pass (1 backend failure pre-existing on baseline-v1) | pass |
| Hidden answers followed in the final code | 8 / 8 applicable (#5 replaced by the variant) | not filled | not run (operator read the code: 9 / 9 hidden items checked) | 7.5 / 9 | 8 / 9 (first pass) |
| Operator score (1–5) / merge-ready | 4 / no (dashboard UI only on the staging-schema build; translations to review) | 5 / yes | 3 / no | 3 / no | 4 / yes |

**Reading it:**
- The interview was long (29 questions in 5 rounds, ~58 min of the agent waiting for answers) and asked 6 of the 9 hidden requirements; the other 3 (migration, marketing emails, legal review) were handled correctly without asking.
- The first "done" was not usable in the running app: the agent tested against pytest's own database and gated the dashboard UI behind a staging flag. Both were fixed by one-line follow-ups; backend enforcement, privacy (birthday hidden, audit-logged reads) and the storefront were correct when checked.

## Caveats (read before quoting the numbers)

- **Times are without the operator's waits.** Where a report computes it from the session log, "time" is the agent's time: the minutes the agent waited for the operator (answers, approvals, nights, weekends) are removed. `S-CC-03` and `L-CC-03` were recomputed this way on 2026-10-26 (before: 44 min / 1 h 2 min and 1 h 48 min / 8 h 46 min of clock time). Cost is not recomputed: it is the runner's total.
- **Rosetta coding flow (`S-CC-06`) ran without the one-time `/init-workspace-flow`**, the method's own project preparation (its report, section 1). Rosetta Light (`S-CC-07`, `L-CC-07`) and Rosetta Skills (`S-CC-08`, `L-CC-08`) started from the initialized workspace (`setup_min: 60`). So the three Rosetta variants were not set up the same way; `S-CC-06` should be re-run from the initialized workspace, and `L-CC-06` starts from it.
- **Copilot `S-CP-03` is not comparable with Claude Code in cost.** Copilot CLI reports AI credits, not USD; methods are compared within one runner only. It ran before the Copilot setup was merged: the team rules file was not loaded at session start (`copilot instruction list`: none; the agent read the repos' rule files itself), and `--yolo` was used instead of `--allow-all`. Superpowers chose `gpt-5.3-codex` for 26 of its 30 subagents itself (an explicit model in its task calls), as it chooses an Opus or Fable reviewer in Claude Code: part of the method, not a setup error.

- **One run per method (n = 1).** No repetitions yet; differences can be noise. Our rule is at least 3 runs per cell before a conclusion.
- **Not yet judged.** The scores are the operator's; the independent judge scores (absolute and side by side) are not done yet.
- **Superpowers run notes** (`S-CC-03`, section 8): ran before the method guide (plain prompt instead of `/superpowers:brainstorming`, some replies not the fixed ones), old setup like `S-CC-02`; the operator's per-check results, tests and merge-ready were not recorded; the session log was lost, so `tokens.md` is built from `/cost`; the operator used an AI assistant to suggest replies (BENCHMARKS.md §3.5 says no human-side AI).
- **Rosetta run notes** (`S-CC-06`, section 8): two operator messages reached the agent before T1 (`is it done?` with a paste of the benchmark assistant's notes), which breaks the "don't interrupt" rule; the operator's answer time (~4 + 5 min) is inside the run time; 9 of the 12 questions were not in the answer tables and were answered by the operator (now added to BENCHMARKS.md §4, rows 11–18).
- **Spec Kit run notes** (`S-CC-04`, section 8): with setup, one restarted first attempt and saving the results, the operator spent about 4 h on this run (the table counts only T0 → end); after the follow-ups the operator finished with Spec Kit's own `implement`/`converge` loop (3 extra rounds); the session was interrupted during follow-up 2 and resumed after a re-login, so the total cost is an estimate (`/cost` restarted; Appendix A of the report); "Done when" checks: the operator confirmed the result works overall, per-check detail from the agent's live checks.
- **`L-CC-02` is a task variant, not comparable with other large runs.** During the interview the operator replaced hidden key #5 ("visible everywhere with an age label") with an own rule (restricted products hidden from ineligible viewers, product page blurred) and changed one own answer (EU 18 / US 21 → one store-wide 18). Other notes: one round answered yes/no, one follow-up pasted with the assistant's notes, the operator restarted the storefront after the agent's dashboard restart (report §8).
- **`S-CC-03` dashboard diff (935 KB) is mostly environment noise.** It ran on the old setup, where the dashboard dev server regenerated `schema-main.graphql` and 4 `*.generated.ts` files at start (before T0; its report §1). Without those files its dashboard change is 39 KB / 552 added lines, in line with the others (Baseline 29 KB, Grill-with-docs 30 KB, Spec Kit 34 KB, Rosetta 53 KB). Since 2026-10-21 `bench.sh setup` puts that regeneration into `baseline-v1`.
- **"Total code changes" in `/cost` is not the size of the change.** It counts only lines written with Claude Code's `Edit`/`Write` tools; agents that write code through the shell, generators or subagents show almost nothing there (`L-CC-02`: "18 lines added" against ≈ 3 976 added lines in 131 files in its diffs). Use the run's `<repo>.diff` files for size.
- **`L-CC-04` follow-ups were drafted by the operator's AI assistant**, not written by the operator (report §8). `L-CC-02` sent 2 follow-ups worded from the assistant's description of what the operator saw (its report §8). Both depart from "follow-ups in the operator's own words".
- **Not identical setups.** `S-CC-02` ran before two setup fixes (some upstream `CLAUDE.md` / `AGENTS.md` files were still in the repos, and the agent's shell used Node 20) and on Claude Code 2.1.304; `S-CC-01` ran on the fixed setup with 2.1.305. Details in each report, section 8.
- **IDE context.** Both runs used Claude Code in the VS Code terminal, which can pass the open file to the agent; future runs use a standalone terminal. In `S-CC-01` the IDE tools were not used (`tokens.md`).

## Next

1. Claude Code: AWS AI-DLC (`L-CC-05` in progress, `S-CC-05` to be re-run), Rosetta coding flow large (`L-CC-06`), from the initialized workspace.
2. Reruns: Rosetta coding flow small (`S-CC-06`) with `/init-workspace-flow`; Grill-with-docs large (`L-CC-02`) on the original hidden key; Superpowers large (`L-CC-03`) or its missing final checks and score.
3. Copilot CLI: merge the Copilot setup (branch `benchmarks/saleor-v2-copilot`), one pilot, then the remaining 15 runs (methods/<method>.md, parts 4–6).
4. Judge scores; repetitions.
