# Saleor benchmark: preliminary results (2026-10-22)

**Status: preliminary, 9 of 32 runs done.** What has been run so far, end to end with a report, on **Claude Code** (Sonnet 5.5, effort medium): **7 runs on the small task** (product "storage conditions" field across backend, dashboard and storefront) and **2 runs on the large task** (age-restricted products). Copilot runs and the other methods follow; the full version will be published later.

Each run has its own folder with the agent's diffs, its own report and a token breakdown: [`saleor/runs/`](../runs/). Generated table of all runs: [`summary.md`](./summary.md) (`python3 saleor/scripts/collect-results.py`). Method, rules and scoring: [`BENCHMARKS.md`](../../BENCHMARKS.md).

## All runs

Every run done so far: **9 of the 32** planned in [`EXPERIMENTS.md`](../EXPERIMENTS.md) (8 methods × 2 tasks × 2 runners), all on Claude Code; new runs are added as rows when they are committed. Numbers come from each run's report (data block); [`summary.md`](./summary.md) and [`runs.csv`](./runs.csv) are generated from the same reports. Hidden requirements: 7 in the small task, 9 in the large one. Time is to the first "done" (T1) and to the end of the last follow-up (T2), without the time the agent waited for the operator where the report computes it.

| Task | Runner | Run | Method | Status | Operator | Questions asked (hidden / extra) | Hidden: asked / covered / missed | First-pass coverage | Follow-ups | Time to first "done" / total | Cost to first "done" / total | "Done when" passed | Red flags | Tests at the end | Score / merge-ready |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| Small | Claude Code | `S-CC-01` | Baseline | done | Nina Jakovljevic | 0 | 0 / 4 / 3 | 57 % | 3 | 29 min / 1 h 10 min | $1.24 / $3.31 | 7 / 8 | 1 | pass | 3 / no |
| Small | Claude Code | `S-CC-02` | Grill-with-docs (old setup) | done | Oleksii Poletaiev | 14 (5 / 9) | 5 / 2 / 0 | 100 % | 0 | 38 min / 38 min | $4.82 / $4.89 | 8 / 8 | 0 | pass | 4 / yes |
| Small | Claude Code | `S-CC-03` | Superpowers (old setup) | done | agavrilita | 1 (1 / 0) | 1 / 5 / 1 | 86 % | 1 | 44 min / 1 h 2 min | $6.76 / $8.08 | 7 / 8 | not assessed | pass | 3 / not reported |
| Small | Claude Code | `S-CC-04` | Spec Kit | done | Oleksii Poletaiev | 0 | 0 / 4 / 3 | 57 % | 3 | 1 h 45 min / 3 h 23 min | $4.58 / ≈ $12.65 | 8 / 8 | 0 | pass | 3 / not stated |
| Small | Claude Code | `S-CC-06` | Rosetta | done | Nina Jakovljevic | 12 (3 / 9) | 3 / 4 / 0 | 100 % | 0 | 2 h / 2 h 28 min | $21.30 / $21.37 | 8 / 8 | 1 | pass | 5 / yes |
| Small | Claude Code | `S-CC-07` | Rosetta Light | done | Igor Solomatov | 12 (5 / 7) | 4 / 3 / 0 | 100 % | 0 | 1 h 32 min / 1 h 32 min | $5.48 / $5.48 | 8 / 8 | 0 | pass | 5 / yes |
| Small | Claude Code | `S-CC-08` | Rosetta Skills | done | Igor Solomatov | 10 (3 / 7) | 3 / 3 / 1 | 86 % | 1 | 56 min / 56 min | $5.64 / $5.64 | 8 / 8 | 0 | pass | 5 / yes |
| Large | Claude Code | `L-CC-02` | Grill-with-docs (task variant) | done | Oleksii Poletaiev | 29 (13 / 16) | 6 / 3 / 0 | 100 % | 2 | 53 min / 1 h 23 min | $9.46 / $10.17 | 12 / 12 | 1 | pass | 4 / no |
| Large | Claude Code | `L-CC-03` | Superpowers (old setup) | done | agavrilita | 3 (1 / 2) | 1 / 4 / 4 | 56 % | 1 | 1 h 48 min / 8 h 46 min | $14.31 / $35.11 | not filled | not filled | not filled | not filled |

**Reading it:**
- **Small task:** the methods that interview before coding (Grill-with-docs, Rosetta, Rosetta Light) reached 100 % first-pass coverage and needed no follow-ups; Baseline and Spec Kit asked nothing and missed the same 3 hidden requirements. Rosetta Light and Rosetta Skills got the same top operator score as full Rosetta (5 / merge-ready) at about a quarter of its cost ($5.48 and $5.64 against $21.37). Rosetta Skills missed one hidden requirement (CSV export and webhook payloads) in its first spec and needed 1 follow-up.
- **Large task:** the two runs are not comparable with each other: `L-CC-02` is a task variant (the operator replaced hidden key #5, see caveats). Grill-with-docs asked or handled all 9 hidden requirements but needed 2 follow-ups because the first "done" was not usable in the running app; Superpowers missed 4 of 9 at first pass and needed a second implementation round (most of its $35.11).

## Details per task

### Small task · Claude Code

| | Baseline (`S-CC-01`) | Grill-with-docs (`S-CC-02`) | Superpowers (`S-CC-03`) | Spec Kit (`S-CC-04`) | Rosetta (`S-CC-06`) | Rosetta Light (`S-CC-07`) | Rosetta Skills (`S-CC-08`) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| How it ran | plain Claude Code in plan mode | `/grill-with-docs` interview, then plain Claude Code | plain prompt; Superpowers loaded brainstorming → writing-plans → executing-plans + TDD by itself | `/speckit-specify` → plan → tasks → implement, then implement/converge until "Converged" | `/coding-flow`: design, plan and implementation gates; 17 subagents (architect on Opus, engineers, reviewers, validators) | plain prompt naming skills `hitl`, `tech-specs` and `USE ROSETTA SUBAGENTS.` (no `/coding-flow`); 12 subagents on Haiku 5.5 (discoverers, engineers, reviewer, validators) | plain prompt naming skills `hitl`, `tech-specs` (no `/coding-flow`); all work in the main agent, no subagents |
| Questions the agent asked | 0 | 14 (2 rounds, ~11 min) | 1 (+ 4 design/plan approvals) | 0 (14 method commands typed by the operator) | 12 in 3 rounds (3 on hidden requirements, 9 extra) + 3 gate approvals | 12 (5 on hidden requirements, 7 extra) + 2 approvals | 10 (3 on hidden requirements, 7 extra) + 4 approvals |
| Hidden requirements: asked / covered without asking / missed | 0 / 4 / 3 | 5 / 2 / 0 | 1 / 5 / 1 | 0 / 4 / 3 | 3 / 4 / 0 | 4 / 3 / 0 | 3 / 3 / 1 |
| First-pass coverage of hidden requirements | 57 % | 100 % | 86 % | 57 % | 100 % | 100 % | 86 % |
| Follow-ups needed after the first "done" | 3 | 0 | 1 | 3 | 0 | 0 | 1 |
| Time to first "done" / total | 29 min / 1 h 10 min | 38 min / 38 min | 44 min / 1 h 2 min | 1 h 45 min / **3 h 23 min** | 2 h / 2 h 28 min | 1 h 32 min / 1 h 32 min | 56 min / 56 min |
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

| | Grill-with-docs (`L-CC-02`) |
| --- | --- |
| How it ran | `/mattpocock-skills:grill-with-docs` interview (5 rounds), then implementation with 2 background subagents (dashboard, storefront); plugin `mattpocock-skills` 1.3.1 from `claude-plugins-official` |
| Questions the agent asked | 29 in 5 rounds (13 touching hidden requirements, 16 extra) + 1 summary approval |
| Hidden requirements: asked / covered without asking / missed | 6 / 3 / 0 (of 9; #5 replaced by the operator's variant, see caveats) |
| First-pass coverage of hidden requirements | 100 % (9 / 9, #5 as the variant) |
| Follow-ups needed after the first "done" | 2 (migrations not applied to the running database; dashboard UI hidden behind `FF_USE_STAGING_SCHEMA`) |
| Time to first "done" / total | 53 min without operator waits (1 h 51 min wall) / 2 h 21 min wall to the last follow-up |
| Cost to first "done" / total (`/cost`) | $9.46 / $10.17 (subagents ≈ 40 %) |
| "Done when" checks passed (operator, at the end) | 12 / 12 (dashboard items only after the 2 follow-ups) |
| Red flags | 1 (said "done" while the feature was not usable in the running app) |
| Tests at the end (operator) | pass (changed areas: backend 83, storefront 817, dashboard 77) |
| Hidden answers followed in the final code | 8 / 8 applicable (#5 replaced by the variant) |
| Operator score (1–5) / merge-ready | 4 / no (dashboard UI only on the staging-schema build; translations to review) |

**Reading it:**
- The interview was long (29 questions in 5 rounds, ~58 min of the agent waiting for answers) and asked 6 of the 9 hidden requirements; the other 3 (migration, marketing emails, legal review) were handled correctly without asking.
- The first "done" was not usable in the running app: the agent tested against pytest's own database and gated the dashboard UI behind a staging flag. Both were fixed by one-line follow-ups; backend enforcement, privacy (birthday hidden, audit-logged reads) and the storefront were correct when checked.

## Caveats (read before quoting the numbers)

- **One run per method (n = 1).** No repetitions yet; differences can be noise. Our rule is at least 3 runs per cell before a conclusion.
- **Not yet judged.** The scores are the operator's; the independent judge scores (absolute and side by side) are not done yet.
- **Superpowers run notes** (`S-CC-03`, section 8): ran before the method guide (plain prompt instead of `/superpowers:brainstorming`, some replies not the fixed ones), old setup like `S-CC-02`; the operator's per-check results, tests and merge-ready were not recorded; the session log was lost, so `tokens.md` is built from `/cost`; the operator used an AI assistant to suggest replies (BENCHMARKS.md §3.5 says no human-side AI).
- **Rosetta run notes** (`S-CC-06`, section 8): two operator messages reached the agent before T1 (`is it done?` with a paste of the benchmark assistant's notes), which breaks the "don't interrupt" rule; the operator's answer time (~4 + 5 min) is inside the run time; 9 of the 12 questions were not in the answer tables and were answered by the operator (now added to BENCHMARKS.md §4, rows 11–18).
- **Spec Kit run notes** (`S-CC-04`, section 8): with setup, one restarted first attempt and saving the results, the operator spent about 4 h on this run (the table counts only T0 → end); after the follow-ups the operator finished with Spec Kit's own `implement`/`converge` loop (3 extra rounds); the session was interrupted during follow-up 2 and resumed after a re-login, so the total cost is an estimate (`/cost` restarted; Appendix A of the report); "Done when" checks: the operator confirmed the result works overall, per-check detail from the agent's live checks.
- **`L-CC-02` is a task variant, not comparable with other large runs.** During the interview the operator replaced hidden key #5 ("visible everywhere with an age label") with an own rule (restricted products hidden from ineligible viewers, product page blurred) and changed one own answer (EU 18 / US 21 → one store-wide 18). Other notes: one round answered yes/no, one follow-up pasted with the assistant's notes, the operator restarted the storefront after the agent's dashboard restart (report §8).
- **"Total code changes" in `/cost` is not the size of the change.** It counts only lines written with Claude Code's `Edit`/`Write` tools; agents that write code through the shell, generators or subagents show almost nothing there (`L-CC-02`: "18 lines added" against ≈ 3 976 added lines in 131 files in its diffs). Use the run's `<repo>.diff` files for size.
- **Not identical setups.** `S-CC-02` ran before two setup fixes (some upstream `CLAUDE.md` / `AGENTS.md` files were still in the repos, and the agent's shell used Node 20) and on Claude Code 2.1.304; `S-CC-01` ran on the fixed setup with 2.1.305. Details in each report, section 8.
- **IDE context.** Both runs used Claude Code in the VS Code terminal, which can pass the open file to the agent; future runs use a standalone terminal. In `S-CC-01` the IDE tools were not used (`tokens.md`).

## Next

1. Large task: Grill-with-docs (`L-CC-02`) is done as a task variant (hidden key #5 replaced; to be re-run on the original key for comparison); Superpowers (`L-CC-03`) is in the branch (operator checks not filled yet); other methods follow.
2. The remaining Claude Code runs of the small task (AI-DLC: in progress today; Rosetta Light: to be re-run), then the large task (age-restricted products).
3. Judge scores; repetitions.
4. Copilot runs once a Copilot seat with the benchmark model is available.
