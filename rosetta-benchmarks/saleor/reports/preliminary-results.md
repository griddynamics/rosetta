# Saleor benchmark: preliminary results (2026-11-02)

> **Snapshot of 2 Nov.** On 5 Nov the team lead aligned scores and red flags to one rule for all runs (the score judges the final code; follow-ups are counted separately). Changed since this snapshot: `S-CP-01` 3 → 4 (merge-ready yes), `S-CP-04` 3 → 4, `S-CC-02` 4 → 3, `S-CP-02` 3.5 → 3, `L-CP-03` merge-ready yes → no; red flags recounted in 8 runs. Current values: [summary.md](summary.md), [runs.csv](runs.csv) and section 8 ("Why not 5") of each run report.
>
> **Added 13 Nov: diff judge results for all 4 cells** (both tasks × both runners), in ["Diff judge: all cells"](#diff-judge-all-cells-added-13-nov). The rest of this file is still the 2 Nov snapshot.

**Status: preliminary, 25 of 32 runs done (78 %): 22 with a result, 19 of them usable now (59 %), and 3 AWS AI-DLC runs that ended without a result.** 15 runs on **Claude Code** (Sonnet 5.5, effort medium: small task, product "storage conditions" field across backend, dashboard and storefront; large task, age-restricted products) and 10 on **Copilot CLI** (GPT-5.6 Terra, effort medium). The full version will be published later.

**Known benchmark deficiency (found 2026-10-28): dashboard type check.** The operator's "Tests pass locally" check did not run the dashboard type check (`pnpm run check-types`), which CI runs. A run that fails it gets +1 follow-up, not a blocker; a run that passes gets a strong point. Decision and procedure: BENCHMARKS.md, section 5, "Known deficiency: dashboard type check". Small task, Claude Code: Grill-with-docs and Rosetta Skills fail it (+1 follow-up each); Baseline, Superpowers, Spec Kit, Rosetta coding flow and Rosetta Light pass it.

## Progress

The plan started with **28 runs**: 7 methods (Baseline, Grill-with-docs, Superpowers, Spec Kit, AWS AI-DLC, Rosetta coding flow, Rosetta Light) × 2 tasks × 2 runners. Then we decided to test three ways of using Rosetta (coding flow, Rosetta Light, Rosetta Skills), which added **4 Rosetta Skills runs: 32 in total**.

| | Original plan (28) | Added: Rosetta Skills (4) | All (32) |
| --- | ---: | ---: | ---: |
| Done | **23 (82 %)** | 2 (50 %) | **25 (78 %)** |
| of them with a result | 20 | 2 | 22 |
| of them usable now (reliable + with caveats) | 17 (61 %) | 2 (50 %) | 19 (59 %) |
| of them without a result (AWS AI-DLC) | 3 | – | 3 |
| Not yet run | 5 (18 %) | 2 (50 %) | **7 (22 %)** |

By runner: Claude Code 15 of 16 (94 %), Copilot CLI 10 of 16 (63 %). In progress on 2 Nov: `L-CC-06`, `S-CP-08`.

How far each run can be trusted (the reasons are in "Caveats" below):

| Group | Runs | Count |
| --- | --- | ---: |
| **Reliable**: run as the protocol says | Baseline (`S-CC-01`, `L-CC-01`, `S-CP-01`), Rosetta Light (`S-CC-07`, `L-CC-07`), Rosetta Skills (`S-CC-08`, `L-CC-08` rerun of 26 Oct), Spec Kit `S-CP-04` | **8 (25 %)** |
| **Usable with caveats**: a setup or process deviation, documented in the report | Grill-with-docs `S-CC-02` (pilot on the old setup), `S-CP-02` and `L-CP-02` (follow-ups worded by the operator's AI assistant from what the operator saw), Superpowers `S-CC-03` (old setup, AI-suggested replies) and `S-CP-03` (before the final Copilot setup; status in EXPERIMENTS.md not set), Spec Kit `S-CC-04` (end cost partly estimated), `L-CC-04` (follow-ups drafted by an AI assistant) and `L-CP-04` (before the switch to the 1M Copilot context tier; 5 of 45 tasks open at the first "done"), Baseline `L-CP-01` (a Copilot authorization outage split the follow-ups over two days), Superpowers `L-CP-03` (operator with an AI assistant; a Copilot outage of 18 h after the first "done"), Rosetta Light `S-CP-07` (Copilot CLI 1.0.103 instead of 1.0.101; Rosetta clone at `817b3adf`, the moved v3.1.17 tag; how its retry stops are counted is under review) | **11 (34 %)** |
| **Rerun recommended**: not comparable as it is | Grill-with-docs `L-CC-02` (one hidden requirement replaced during the run), Superpowers `L-CC-03` (no final checks or score), Rosetta coding flow `S-CC-06` (ran without the one-time `/init-workspace-flow`, while Rosetta Light and Skills started from the initialized workspace) | **3 (9 %)** |
| **No result**: the method did not reach a first "done" | AWS AI-DLC `S-CC-05` (stopped during its Construction phase), `L-CC-05` (stopped after more than 6 h and about $160 of usage) and `S-CP-05` (not qualifying: AI-DLC's review gate loops at intent-capture after 2 clean resets) | **3 (9 %)** |
| **Not yet run** | Claude Code: Rosetta coding flow `L-CC-06` (in progress); Copilot CLI: AWS AI-DLC `L-CP-05`, Rosetta coding flow `S-CP-06` and `L-CP-06`, Rosetta Light `L-CP-07`, Rosetta Skills `S-CP-08` (in progress) and `L-CP-08` | **7 (22 %)** |

For every run so far: one run per method (no repetitions), and operator scores come from different operators. The diff judge (code-quality scores, [SCORE-DIFFS.md](../../SCORE-DIFFS.md)) has scored all 4 cells: 28 runs, 7 methods × 2 tasks × 2 runners (AWS AI-DLC has no diff). The small Claude Code Rosetta coding flow rerun of 3 Nov (`S-CC-06`) was judged on 16 Nov in its own session: 74.6 (see caveats).

Each run has its own folder with the agent's diffs, its own report and a token breakdown: [`saleor/runs/`](../runs/). Generated table of all runs: [`summary.md`](./summary.md) (`python3 saleor/scripts/collect-results.py`). Method, rules and scoring: [`BENCHMARKS.md`](../../BENCHMARKS.md).

## What we track and how merge-ready is decided (updated 2 Nov)

Since 28 Oct each run report has these fields and rules on top of the operator's measures:

- **Diff judge** ([SCORE-DIFFS.md](../../SCORE-DIFFS.md)), per run: `judge_total` (score + bonus), `judge_bonus`, `judge_blockers` / `judge_majors` / `judge_minors` / `judge_strengths`, `judge_merge_ready_advice`. Rules added since v1: the judge first asks why the run did something (INTENT) before calling it a problem; bonuses for fixed earlier bugs, related improvements, proactive safeguards and DELTA items (what the run did right that Baseline did not); a finding's level follows the harm that remains, and a fix that is small (no design decision, one repo, no new type or API field, no behavior other repos rely on) is at most minor (decision-log D80–D82, proposals by Andra Ciobanu). The judge has scored all 4 cells (results: "Diff judge: all cells" below).
- **Dashboard type check** (`pnpm run check-types`): part of "Tests pass locally" since 28 Oct (known deficiency, see the top of this file).
- **Time without waits:** the time the agent was blocked waiting for the operator is removed, and, as decided on 2 Nov, also runner stalls and runner outages (e.g. the Copilot outage of 28–29 Oct), before and after the first "done", for every run. So far only the Rosetta runs `L-CC-07` and `L-CC-08` were recomputed this way.
- **Method steps vs questions:** a Rosetta stop that only asks to retry or continue ("May I retry with the corrected path?") is answered `Approved, continue.` and counted as a method step, not as a question (BENCHMARKS.md section 5, "Method steps", and the reply tables in the Rosetta method files).
- **Rosetta version:** the `v3.1.17` tag was moved on 23 Oct (`6215332c` → `817b3adf`); the earlier Rosetta runs used `6215332c`, `S-CP-07` used `817b3adf` (noted in its report). Since 2 Nov the Rosetta method files pin the commit (`git checkout 6215332c` after cloning).
- **Operator merge-ready:** "can be merged after a normal review, without rework". A breaking public API change (e.g. `productTranslate` taking a new `ProductTranslationInput!` instead of `TranslationInput!`) is rework, so not merge-ready, in every run (applied on 2 Nov to `S-CC-02`, `S-CP-02`, `S-CC-04`, as in `S-CC-01`). A full operator checklist (Andra Ciobanu's proposal: Done-when items, red flags and the judge's major types) is being agreed; after that every operator re-checks their finished runs with it.

**Merge-ready, small task, Claude Code: operator vs judge** (they agree on all 7 runs; the other cells are in "Diff judge: all cells" below):

| Run | Operator | Judge | Why (judge's reason; operator's where recorded) |
| --- | --- | --- | --- |
| Baseline `S-CC-01` | no | no | Breaking `productTranslate` input; edits to the off-limits storefront mapper / `ProductView` contract. Minor: no server-side trimming. |
| Grill-with-docs `S-CC-02` | no (was yes until 2 Nov) | no | Breaking `productTranslate` input. Minor: the field is missing from the CSV export dialog. |
| Superpowers `S-CC-03` | no | no | Orphan translations: after the value is removed, customers still see its translation and staff cannot see or clear it. Minor: no trimming, changeset type. |
| Spec Kit `S-CC-04` | no (set on 2 Nov) | no | Breaking `productTranslate` input. Minor: the break is not in the CHANGELOG. |
| Rosetta coding flow `S-CC-06` | yes | yes | Only minors: translated values not trimmed, field missing in the create dialog, leftover spec references. |
| Rosetta Light `S-CC-07` | yes | yes | Only minors: CSV export dialog option, server-side trimming, translation payload, changeset, a duplicate max-length error. |
| Rosetta Skills `S-CC-08` | yes | yes | Only minors: CSV export dialog option, trimming on the update path, translation payload, empty string instead of null. |

The three Rosetta variants are the only small Claude Code runs with no major finding; the others either broke the translation API (Baseline, Grill-with-docs, Spec Kit) or left stale translations (Superpowers). One run per method, so this is an observation, not a rule. On the other 3 cells the operator and the judge agree less often (see below).

### Diff judge: all cells (added 13 Nov)

Source: `reports/judge-<task>-<runner>-v2.json` (rating → self-challenge → validator, SCORE-DIFFS.md); the same values are in each run report's data block, [`summary.md`](summary.md) and [`runs.csv`](runs.csv). Rows are in the judge's score order. Score = total + bonus. Operator merge-ready = current value (after the 5 Nov alignment). Compare runs only within one cell.

**Small task · Claude Code** (judged 29 Oct, re-leveled 30 Oct; agreement on merge-ready 7 / 7)

| Method | Run | Score | Bonus | Blockers / majors / minors · strengths | Judge advice | Operator merge-ready |
| --- | --- | ---: | ---: | --- | --- | --- |
| Rosetta coding flow | `S-CC-06` (rerun of 3 Nov, judged 16 Nov, see caveats) | **74.6** | 5.9 | 0 / 0 / 6 · 1 | yes | yes |
| Rosetta Skills | `S-CC-08` | 73.6 | 4.7 | 0 / 0 / 5 · 2 | yes | yes |
| Superpowers | `S-CC-03` | 73.5 | 5.45 | 0 / 1 / 7 · 2 | no | no |
| Rosetta Light | `S-CC-07` | 73.4 | 5.2 | 0 / 0 / 8 · 3 | yes | yes |
| Grill-with-docs | `S-CC-02` | 71.6 | 4.15 | 0 / 1 / 6 · 1 | no | no |
| Spec Kit | `S-CC-04` | 70.7 | 2.65 | 0 / 1 / 6 · 2 | no | no |
| Baseline | `S-CC-01` | 66.2 | 0 | 0 / 2 / 8 · 1 | no | no |

**Large task · Claude Code** (agreement 4 / 7)

| Method | Run | Score | Bonus | Blockers / majors / minors · strengths | Judge advice | Operator merge-ready | Judge's main reason |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| Rosetta Light | `L-CC-07` | **78.4** | 10.6 | 0 / 1 / 8 · 5 | no | yes | 1 major: a signed-in eligible customer whose cart started as a guest cannot add restricted products until checkout; 3 pre-existing bugs fixed |
| Rosetta coding flow | `L-CC-06` | 76.6 | 8.95 | 0 / 0 / 8 · 2 | yes | yes | minors only; enforcement, privacy, audit and time zone built and tested |
| Rosetta Skills | `L-CC-08` | 75.0 | 7.7 | 0 / 0 / 11 · 2 | yes | yes | minors only (payment start not gated, audit cascade, no dashboard audit view, …) |
| Grill-with-docs | `L-CC-02` | 71.2 | 5.55 | 0 / 3 / 10 · 1 | no | yes | dashboard feature hidden on the default build (staging-schema gate), uncached storefront listings, "today" fixed to UTC |
| Superpowers | `L-CC-03` | 67.9 | 2.4 | 0 / 2 / 14 · 0 | no | yes | `isAgeEligible` with a caller-chosen age reveals customers' ages without audit; draft orders not age-checked |
| Spec Kit | `L-CC-04` | 67.8 | 3.4 | 1 / 3 / 11 · 0 | no | no | blocker: saving a customer page in the dashboard erases the birthday; any MANAGE_USERS staff can change birthdays; drafts not age-checked |
| Baseline | `L-CC-01` | 64.6 | 0 | 0 / 3 / 14 · 0 | no | no | `ageEligible(minimumAge)` lets staff and apps derive a customer's age; "today" fixed to UTC |

**Small task · Copilot CLI** (agreement 2 / 7)

| Method | Run | Score | Bonus | Blockers / majors / minors · strengths | Judge advice | Operator merge-ready | Judge's main reason |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| Rosetta coding flow | `S-CP-06` | **74.8** | 6.05 | 0 / 0 / 6 · 2 | yes | yes | minors only; contract, validation, translation paths and storefront extension point correct and tested |
| Spec Kit | `S-CP-04` | 69.0 | 4.65 | 0 / 3 / 11 · 0 | no | yes | `productTranslate` permission change breaks translator-only staff; `productBulkTranslate` silently drops the field |
| Rosetta Skills | `S-CP-08` | 67.2 | 3.15 | 0 / 3 / 12 · 0 | no | yes | NOT NULL column crashes null translation inputs; category/collection translate crash; no tests for five required behaviors |
| Superpowers | `S-CP-03` | 67.0 | 2.0 | 0 / 1 / 16 · 0 | no | yes | `productBulkTranslate` silently drops the field while reporting success |
| Grill-with-docs | `S-CP-02` | 66.7 | 3.9 | 2 / 1 / 10 · 0 | no | no | blockers: staff cannot type spaces in the input; `productTranslate` input change breaks dashboard saving and API clients |
| Rosetta Light | `S-CP-07` | 66.4 | 1.75 | 0 / 3 / 10 · 1 | no | yes | category/collection translate crash; null on a NOT NULL column without a default (also breaks rolling deploys); bulk translate drops the field |
| Baseline | `S-CP-01` | 66.0 | 0 | 0 / 2 / 11 · 0 | no | yes | bulk translate drops the field; category/collection translate raise unhandled errors |

**Large task · Copilot CLI** (agreement 4 / 7)

| Method | Run | Score | Bonus | Blockers / majors / minors · strengths | Judge advice | Operator merge-ready | Judge's main reason |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| Rosetta Skills | `L-CP-08` | **78.5** | 10.95 | 0 / 1 / 8 · 3 | no | yes | the dashboard cannot save the age flag on its own; backend, storefront and privacy solid |
| Rosetta Light | `L-CP-07` | 76.8 | 9.55 | 0 / 0 / 12 · 2 | yes | yes | minors only; enforcement, privacy, audit and labels complete and tested |
| Superpowers | `L-CP-03` | 72.7 | 7.65 | 0 / 3 / 14 · 1 | no | no | age check only in `checkoutComplete` (auto-completion, checkout apps and the legacy Stripe webhook bypass it); rejection only after payment |
| Rosetta coding flow | `L-CP-06` | 69.3 | 6.0 | 1 / 5 / 14 · 2 | no | yes | store minimum age unreadable and reset to 18 by any Site Settings save; unlinked drafts blocked; mobile sticky "Add to bag" no longer submits |
| Spec Kit | `L-CP-04` | 67.6 | 4.75 | 1 / 1 / 18 · 0 | no | no | `checkoutComplete` and `checkoutCreate` run no age check, so the restriction is bypassable |
| Grill-with-docs | `L-CP-02` | 65.5 | 5.0 | 1 / 5 / 18 · 0 | no | yes | the dashboard wipes birthdays on every customer save; any MANAGE_USERS staff can write birthdays; mobile sticky "Add to bag" broken |
| Baseline | `L-CP-01` | 64.0 | 0 | 0 / 3 / 17 · 0 | no | no | completion check and birthday privacy untested; mobile sticky "Add to bag" broken; impersonating staff checked on their own age |

**Reading it:**
- Baseline has the lowest score in all 4 cells (64.0–66.2). A Rosetta variant has the top score in all 4 cells, but which one differs: coding flow on the small task (both runners), Rosetta Light on large Claude Code, Rosetta Skills on large Copilot.
- The judge advises merge-ready for 7 of 28 runs, all Rosetta variants: small Claude Code coding flow, Light and Skills; large Claude Code coding flow and Skills; small Copilot coding flow; large Copilot Light.
- Operator and judge agree on merge-ready in 17 of 28 runs. Every disagreement is operator "yes", judge "no" (11 runs, 8 of them on Copilot). Typical reasons are defects that a manual check of the "Done when" items does not show: `productBulkTranslate` silently dropping the field (4 small Copilot runs), category/collection translate crashes, birthdays wiped by an ordinary dashboard save, the mobile sticky "Add to bag" button no longer submitting.
- Spread: the small Copilot cell is tight below the top (66.0–69.0 for 6 of 7 runs); the large cells spread 14 points.

## All runs

Every run done so far: **25 of the 32** planned in [`EXPERIMENTS.md`](../EXPERIMENTS.md) (8 methods × 2 tasks × 2 runners), 15 on Claude Code (2 of them AWS AI-DLC without a result) and 10 on Copilot CLI (1 of them AWS AI-DLC without a result); new runs are added as rows when they are committed. Numbers come from each run's report (data block); [`summary.md`](./summary.md) and [`runs.csv`](./runs.csv) are generated from the same reports. Hidden requirements: 7 in the small task, 9 in the large one. Time is to the first "done" (T1) and to the end of the last follow-up (T2), without the time the agent waited for the operator where the report computes it.

| Task | Runner | Run | Method | Status | Operator | Questions asked (hidden / extra) | Hidden: asked / covered / missed | First-pass coverage | Follow-ups | Time to first "done" / total | Cost to first "done" / total | "Done when" passed | Red flags | Tests at the end | Score / merge-ready |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| Small | Claude Code | `S-CC-01` | Baseline | done | Nina Jakovljevic | 0 | 0 / 4 / 3 | 57 % | 3 | 29 min / 1 h 10 min | $1.24 / $3.31 | 7 / 8 | 1 | pass | 3 / no |
| Small | Claude Code | `S-CC-02` | Grill-with-docs (old setup) | done | Oleksii Poletaiev | 14 (5 / 9) | 5 / 2 / 0 | 100 % | 1 | 38 min / 38 min | $4.82 / $4.89 | 8 / 8 | 0 | pass | 4 / no (breaking API change; was yes until 2 Nov) |
| Small | Claude Code | `S-CC-03` | Superpowers (old setup) | done | agavrilita | 1 (1 / 0) | 1 / 5 / 1 | 86 % | 1 | 36 min / 41 min | $6.76 / $8.08 | 7 / 8 | not assessed | pass | 3 / no |
| Small | Claude Code | `S-CC-04` | Spec Kit | done | Oleksii Poletaiev | 0 | 0 / 4 / 3 | 57 % | 3 | 1 h 45 min / 3 h 23 min | $4.58 / ≈ $12.65 | 8 / 8 | 0 | pass | 3 / no (breaking API change) |
| Small | Claude Code | `S-CC-05` | AWS AI-DLC | no result: stopped during Construction, no first "done" | – | – | – | – | – | – | – | – | – | – | – |
| Small | Claude Code | `S-CC-06` | Rosetta | done | Nina Jakovljevic | 12 (3 / 9) | 3 / 4 / 0 | 100 % | 0 | 2 h / 2 h 28 min | $21.30 / $21.37 | 8 / 8 | 1 | pass | 5 / yes |
| Small | Claude Code | `S-CC-07` | Rosetta Light | done | Igor Solomatov | 12 (5 / 7) | 4 / 3 / 0 | 100 % | 0 | 1 h 32 min / 1 h 32 min | $5.48 / $5.48 | 8 / 8 | 0 | pass | 5 / yes |
| Small | Claude Code | `S-CC-08` | Rosetta Skills | done | Igor Solomatov | 10 (3 / 7) | 3 / 3 / 1 | 86 % | 2 | 56 min / 56 min | $5.64 / $5.64 | 8 / 8 | 0 | pass | 5 / yes |
| Large | Claude Code | `L-CC-01` | Baseline (plan mode) | done | Nina Jakovljevic | 1 (0 / 1) | 0 / 4 / 5 | 44 % | 5 | 37 min / 1 h 40 min | $3.86 / $7.84 | 12 / 12 | 1 | pass | 3 / no |
| Large | Claude Code | `L-CC-02` | Grill-with-docs (task variant) | done | Oleksii Poletaiev | 29 (13 / 16) | 6 / 3 / 0 | 100 % | 2 | 53 min / 1 h 23 min | $9.46 / $10.17 | 12 / 12 | 1 | pass | 4 / yes |
| Large | Claude Code | `L-CC-03` | Superpowers (old setup) | done | agavrilita | 3 (1 / 2) | 1 / 4 / 4 | 56 % | 1 | 1 h 16 min / 3 h 23 min | $14.31 / $35.11 | not filled | not filled | not filled | not filled |
| Large | Claude Code | `L-CC-04` | Spec Kit (follow-ups drafted by the assistant) | done | Rustem Cimendur | 2 (0 / 2) | 0 / 5 / 4 | 56 % | 5 | 51 min / 1 h 25 min | $5.95 / $11.04 | 12 / 12 | 4 | pass | 3 / no |
| Large | Claude Code | `L-CC-05` | AWS AI-DLC | no result: stopped after more than 6 h and about $160, no first "done" | Patryk | – | – | – | – | more than 6 h / – | about $160 / – | – | – | – | – |
| Large | Claude Code | `L-CC-07` | Rosetta Light | done | Igor Solomatov | 14 (6 / 8) | 4 / 4 / 1 | 89 % | 2 | 4 h 36 min / 5 h 09 min | $53.30 / $57.65 | 12 / 12 | 0 | pass | 4 / yes |
| Large | Claude Code | `L-CC-08` | Rosetta Skills (rerun 26 Oct, without the `orchestration` skill) | done | Igor Solomatov | 16 (5 / 11) | 3 / 6 / 0 | 100 % | 2 | 2 h 45 min / 3 h 44 min | $23.72 / $24.73 | 12 / 12 | not filled | pass | 5 / yes |
| Small | Copilot CLI | `S-CP-01` | Baseline (plan mode) | done | Nina Jakovljevic | 1 (1 / 0) | 1 / 4 / 2 | 71 % | 5 | 13 min / 1 h 24 min | 208.77 / 389.10 AI credits | 8 / 8 | 2 | pass | 3 / no |
| Small | Copilot CLI | `S-CP-02` | Grill-with-docs | done | Oleksii Poletaiev | 20 (7 / 13) | 4 / 3 / 0 | 100 % | 2 | 14 min / ≈ 17 min (agent time; the run spans two days) | 393.06 / 452.33 AI credits | 8 / 8 | 1 | pass | 3.5 / no (breaking API change; was yes until 2 Nov) |
| Small | Copilot CLI | `S-CP-03` | Superpowers (before the final Copilot setup) | done | agavrilita | 4 (3 / 1) | 3 / 3 / 1 | 86 % | 2 | 1 h 47 min / 2 h 34 min | 1 406.53 / 1 975.72 AI credits | 8 / 8 | 0 | pass | 4 / yes |
| Small | Copilot CLI | `S-CP-04` | Spec Kit | done | Rustem Cimendur | 0 | 0 / 7 / 0 | 100 % | 4 | 33 min / 1 h 21 min | 698.70 / 870.42 AI credits | 8 / 8 | 3 | pass | 3 / yes |
| Small | Copilot CLI | `S-CP-05` | AWS AI-DLC | no result: not qualifying, AI-DLC's review gate loops at intent-capture after 2 clean resets, no first "done" | Rustem Cimendur | 11 (3 hidden) | – | – | – | 3 attempts, ≈ 1 h 02 min in total (wall, from the logs: 44 + 2 + 17 min) / – | 490.88 AI credits for the 3 attempts, no code written / – | – | – | – | – |
| Small | Copilot CLI | `S-CP-07` | Rosetta Light (Copilot CLI 1.0.103, Rosetta `817b3adf`) | done | Rustem Cimendur | 25 (5 / 20; most of the extra are retry approvals, counting under review) | 3 / 3 / 1 | 86 % | 1 | 30 min / 57 min | 792.74 / 1,113.87 AI credits | 8 / 8 | 0 | pass | 4 / yes |
| Large | Copilot CLI | `L-CP-01` | Baseline (plan mode) | done | Nina Jakovljevic | 4 (2 / 2) | 2 / 3 / 4 | 56 % | 10 | 7 min / – (follow-ups over two days: Copilot authorization outage and a night) | 194.70 / 1,746.54 AI credits | 12 / 12 (6 failed at the first check) | 3 | pass | 3 / no |
| Large | Copilot CLI | `L-CP-02` | Grill-with-docs | done | Oleksii Poletaiev | 30 (12 / 18) | 7 / 2 / 0 | 100 % | 5 | 27 min / ≈ 43 min (agent time) | 600.76 / 848.91 AI credits | 12 / 12 | 1 | pass | 4 / yes (was 3 / yes until 2 Nov) |
| Large | Copilot CLI | `L-CP-03` | Superpowers (operator with an AI assistant) | done | agavrilita | 5 (2 / 3) | 2 / 5 / 2 | 78 % | 2 | 2 h 40 min / – (an 18 h Copilot outage after the first "done") | 1,776.76 / 1,887.89 AI credits | 7 / 12 | 2 | pass | 3 / yes |
| Large | Copilot CLI | `L-CP-04` | Spec Kit (before the 1M context tier) | done | Rustem Cimendur | 0 | 0 / 6 / 3 | 67 % | 3 | 51 min / 1 h 03 min | 964.12 / 1,024.05 AI credits | 12 / 12 | 4 | fail (focused suites pass; full suites and Playwright not run) | 2 / no |

**Reading it:**
- **Small task:** the methods that interview before coding (Grill-with-docs, Rosetta, Rosetta Light) reached 100 % first-pass coverage; Rosetta and Rosetta Light needed no follow-ups, Grill-with-docs 1 (dashboard type check, known deficiency); Baseline and Spec Kit asked nothing and missed the same 3 hidden requirements. Rosetta Light and Rosetta Skills got the same top operator score as full Rosetta (5 / merge-ready) at about a quarter of its cost ($5.48 and $5.64 against $21.37). Rosetta Skills missed one hidden requirement (CSV export and webhook payloads) in its first spec and needed 2 follow-ups (that one, and the dashboard type check).
- **Large task:** `L-CC-02` is a task variant and is not comparable with the others (the operator replaced hidden key #5, see caveats). Grill-with-docs asked or handled all 9 hidden requirements but needed 2 follow-ups because the first "done" was not usable in the running app; Superpowers missed 4 of 9 at first pass and needed a second implementation round (most of its $35.11). Baseline (`L-CC-01`) asked nothing, missed 5 of 9 and needed 5 follow-ups, but was the cheapest ($7.84); 3 / no. Rosetta Light (`L-CC-07`) asked 14 questions, covered 8 of 9 at first pass, needed 2 follow-ups and got 4 / merge-ready, but ran the longest (4 h 36 min to first "done" without operator waits, 36 subagents) at $57.65. Spec Kit (`L-CC-04`) asked nothing about the hidden requirements, covered 5 of 9 on its own (56 %) and needed 5 follow-ups (who can read the birthday, audit log, age label, recommendation emails, shop time zone); it was cheap ($11.04) but not merge-ready (3 / no), with 4 red flags (dashboard schema/codegen not updated, two tests weakened, unrelated files changed). Rosetta Skills (`L-CC-08`, rerun without the `orchestration` skill) asked 16 questions (11 outside the answer tables), covered all 9 at first pass, needed 2 follow-ups and got 5 / merge-ready, at $24.73.

- **Copilot CLI (8 runs with a result, AI credits, not comparable with Claude Code in cost):** every method reached at least 71 % first-pass coverage on the small task, but every run needed follow-ups, mostly because the first "done" did not work on the running stack (migrations not applied, a dashboard Save button that stayed disabled). Spec Kit covered all 7 hidden requirements without asking (its spec wrote them as assumptions) but cost the most of the small runs (870 credits); Grill-with-docs asked the most and was the cheapest (452). On the large task Grill-with-docs asked or covered all 9 hidden requirements (the first large run to do so on the key as written), then needed 5 follow-ups, one a real logic bug (adults blocked until their birthday in the current year). Baseline (`L-CP-01`) was the fastest and cheapest to its first "done" (7 min, 195 credits) but that "done" was not usable: 6 of 12 checks failed (e.g. staff could not save a minimum age), so it needed 10 follow-ups and ended at 1,747 credits, 3 / no. Superpowers (`L-CP-03`) worked 2 h 40 min on its own and cost the most (1,888 credits); it missed 2 of 9 hidden requirements, passed 7 of 12 checks and left 22 changed or new storefront files to clean up (red flags: unrelated files changed, implementation left uncommitted), yet the operator gave 3 / merge-ready. Rosetta Light (`S-CP-07`) passed 8 of 8 checks with 1 follow-up (CSV export and webhook payloads) in 30 min, 4 / merge-ready, at 1,114 credits; its subagents stopped about 20 times for harness errors (wrong paths, an unavailable model) and asked to retry.
- **`L-CC-08` was re-run on 26 Oct** without the `orchestration` skill (the first run used it, unlike Rosetta Light): $24.73 instead of $67.47, all hidden requirements covered, 2 follow-ups, 5 / merge-ready.

## Details per task

### Small task · Claude Code

| | Baseline (`S-CC-01`) | Grill-with-docs (`S-CC-02`) | Superpowers (`S-CC-03`) | Spec Kit (`S-CC-04`) | Rosetta (`S-CC-06`) | Rosetta Light (`S-CC-07`) | Rosetta Skills (`S-CC-08`) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| How it ran | plain Claude Code in plan mode | `/grill-with-docs` interview, then plain Claude Code | plain prompt; Superpowers loaded brainstorming → writing-plans → executing-plans + TDD by itself | `/speckit-specify` → plan → tasks → implement, then implement/converge until "Converged" | `/coding-flow`: design, plan and implementation gates; 17 subagents (architect on Opus, engineers, reviewers, validators) | plain prompt naming skills `hitl`, `tech-specs` and `USE ROSETTA SUBAGENTS.` (no `/coding-flow`); 12 subagents on Haiku 5.5 (discoverers, engineers, reviewer, validators) | plain prompt naming skills `hitl`, `tech-specs` (no `/coding-flow`); all work in the main agent, no subagents |
| Questions the agent asked | 0 | 14 (2 rounds, ~11 min) | 1 (+ 4 design/plan approvals) | 0 (14 method commands typed by the operator) | 12 in 3 rounds (3 on hidden requirements, 9 extra) + 3 gate approvals | 12 (5 on hidden requirements, 7 extra) + 2 approvals | 10 (3 on hidden requirements, 7 extra) + 4 approvals |
| Hidden requirements: asked / covered without asking / missed | 0 / 4 / 3 | 5 / 2 / 0 | 1 / 5 / 1 | 0 / 4 / 3 | 3 / 4 / 0 | 4 / 3 / 0 | 3 / 3 / 1 |
| First-pass coverage of hidden requirements | 57 % | 100 % | 86 % | 57 % | 100 % | 100 % | 86 % |
| Follow-ups needed after the first "done" | 3 | 1 | 1 | 3 | 0 | 0 | 2 |
| Time to first "done" / total | 29 min / 1 h 10 min | 38 min / 38 min | 36 min / 41 min | 1 h 45 min / **3 h 23 min** | 2 h / 2 h 28 min | 1 h 32 min / 1 h 32 min | 56 min / 56 min |
| Cost to first "done" / total (`/cost`) | $1.24 / $3.31 | $4.82 / $4.89 | $6.76 / $8.08 (incl. $2.19 Opus reviewer subagent) | $4.58 / ≈ $12.65 | $21.30 / $21.37 (incl. $11.71 Opus architect subagent) | $5.48 / $5.48 | $5.64 / $5.64 |
| "Done when" checks passed (operator, at the end) | 7 / 8 | 8 / 8 | 7 / 8 | 8 / 8 | 8 / 8 | 8 / 8 | 8 / 8 |
| Red flags | 1 (unrelated files changed) | 0 | not assessed | 0 | 1 (validator changed dev-DB data outside its snapshot) | 0 | 0 |
| Tests at the end (operator) | pass | pass | pass | pass | pass | pass | pass |
| Operator score (1–5) / merge-ready | 3 / no | 4 / no | 3 / no | 3 / no | 5 / yes | 5 / yes | 5 / yes |
| Diff judge: score (total + bonus) | 66.2 | 71.6 | 73.5 | 70.7 | **74.6** | 73.4 | 73.6 |
| Diff judge: blockers / majors / minors · strengths | 0 / 2 / 8 · 1 | 0 / 1 / 6 · 1 | 0 / 1 / 7 · 2 | 0 / 1 / 6 · 2 | **0 / 0 / 3** · 1 | 0 / 0 / 8 · 3 | 0 / 0 / 5 · 2 |
| Diff judge: merge-ready advice | no | no | no | no | yes | yes | yes |

**Reading it:**
- Grill's interview caught most of the hidden requirements up front (length limit, translation, webhooks/CSV export); Baseline asked nothing and needed 3 follow-ups for exactly those (length limit, translation, webhooks/export).
- Baseline was cheaper and faster to its first "done", but 40 % of its total cost went into fixing what it had missed. Grill spent more up front and almost nothing after.
- Superpowers stated its assumptions up front (plain text, 250 chars, product level) and asked only about translation, so it covered 6 of 7 at first pass; it missed webhooks/CSV export (1 follow-up). It was the most expensive of the three ($8.08), a quarter of it on an Opus reviewer subagent that Superpowers dispatches itself.
- Spec Kit asked nothing (`specify` wrote its own assumptions: 500 chars, not translated, no CSV), so it missed the same 3 hidden requirements as Baseline. Its strength is the `converge` loop: it kept finding real gaps until all 3 repos matched the spec, and the end result passed 8/8. The cost is operator effort and time: 14 method commands, 3 follow-ups, 3 h 23 min in total.
- Rosetta asked the right product questions up front (length limit, translation, webhooks/CSV) and covered the other 4 on its own: 7/7 on the first pass, 0 follow-ups, 8/8 checks, the only operator score of 5, and the only run where the agent kept the shared `TranslationInput` (no breaking API change). Its independent plan, code and test reviews caught real issues. The price: the most expensive and one of the slowest runs ($21.37, 148 min; 55 % of the cost on the Opus architect) and the heaviest operator load in questions (12, of which 9 outside the answer tables).
- Baseline, Grill and Spec Kit made the same API decision on their own (a new `ProductTranslationInput` type, a breaking change in the translation mutation). On 2 Nov the operators made it one rule: this breaking change means not merge-ready, in every run (`S-CC-02` and `S-CP-02` changed from yes, `S-CC-04` set; same reason as `S-CC-01`). The operators' merge-ready verdicts on the small Claude Code task now match the judge's advice for all 7 runs.
- **Diff judge** (`reports/judge-small-storage-conditions-claude-code-v2.json`, clean run of 29 Oct with bonuses for improvements, safeguards and DELTA items against Baseline): Rosetta scores highest (74.6 for the 3 Nov rerun, judged 16 Nov; the first run had 74.5); Rosetta Skills (73.6), Superpowers (73.5) and Rosetta Light (73.4) follow; Baseline is lowest (66.2). No run has a blocker. Rosetta, Rosetta Light and Rosetta Skills have no majors, and the judge advises these three as merge-ready. The majors that remain: the breaking `productTranslate` change (Baseline, Grill-with-docs, Spec Kit), edits to off-limits storefront files (Baseline), translations customers still see after the value is removed (Superpowers). Majors are leveled by the harm that remains after existing safeguards (re-leveled 30 Oct without a re-judge). Read its advice next to the operator's decision, not instead of it (see caveats).

### Large task · Claude Code

| | Grill-with-docs (`L-CC-02`) | Rosetta Skills (`L-CC-08`) | Spec Kit (`L-CC-04`) | Baseline (`L-CC-01`) | Rosetta Light (`L-CC-07`) |
| --- | --- | --- | --- | --- | --- |
| How it ran | `/mattpocock-skills:grill-with-docs` interview (5 rounds), then implementation with 2 background subagents (dashboard, storefront); plugin `mattpocock-skills` 1.3.1 from `claude-plugins-official` | plain prompt naming skills `hitl`, `tech-specs` (no `/coding-flow`, no `orchestration`; rerun 26 Oct); brief, specs and plan approvals, then staged implementation behind gates G0–G2 with 25 subagents (12 engineers, 6 reviewers, 3 discoverers, 3 executors, 1 validator) | `/speckit-specify` → plan → tasks → implement → converge (1 round) → implement; 4 subagents | plain Claude Code in plan mode; 2 Explore subagents | prompt naming skills `hitl`, `tech-specs` and `USE ROSETTA SUBAGENTS.`; discovery, architect specs, plan, staged implementation; 36 subagents |
| Questions the agent asked | 29 in 5 rounds (13 touching hidden requirements, 16 extra) + 1 summary approval | 16 (5 touching hidden requirements, 11 extra) + 6 method steps (brief, specs, plan approvals; gates G0–G2) | 2 (both outside the answer tables) + 5 method commands | 1 (after T1, outside the tables) + plan approval | 14 (6 touching hidden requirements, 8 extra) in 4 rounds + 2 approvals |
| Hidden requirements: asked / covered without asking / missed | 6 / 3 / 0 (of 9; #5 replaced by the operator's variant, see caveats) | 3 / 6 / 0 | 0 / 5 / 4 (#4 covered; final code matches it partly) | 0 / 4 / 5 | 4 / 4 / 1 |
| First-pass coverage of hidden requirements | 100 % (9 / 9, #5 as the variant) | 100 % | 56 % | 44 % | 89 % |
| Follow-ups needed after the first "done" | 2 (migrations not applied to the running database; dashboard UI hidden behind `FF_USE_STAGING_SCHEMA`) | 2 (a changed backend test failing in the dev container; a signed-in adult blocked in the storefront cart) | 5 (drafted by the assistant at the operator's request) | 5 | 2 (age label in lists; two failing time-dependent tests) |
| Time to first "done" / total | 53 min without operator waits (1 h 51 min wall) / 2 h 21 min wall to the last follow-up | 2 h 45 min without operator waits / 3 h 44 min | 51 min / 1 h 25 min without operator waits (1 h 43 min / 6 h 13 min wall) | 37 min / 1 h 40 min | 4 h 36 min / 5 h 09 min without operator waits and runner stalls (8 h 22 min / 9 h 44 min wall) |
| Cost to first "done" / total (`/cost`) | $9.46 / $10.17 (subagents ≈ 40 %) | $23.72 / $24.73 | $5.95 / $11.04 | $3.86 / $7.84 | $53.30 / $57.65 |
| "Done when" checks passed (operator, at the end) | 12 / 12 (dashboard items only after the 2 follow-ups) | 12 / 12 | 12 / 12 (#10 checked through the API on 2026-10-23) | 12 / 12 | 12 / 12 |
| Red flags | 1 (said "done" while the feature was not usable in the running app) | 0 | 4 (schema/codegen not updated, tests weakened, unrelated files changed, dashboard customer query fails for non-superuser staff) | 1 | 0 |
| Tests at the end (operator) | pass (changed areas: backend 83, storefront 817, dashboard 77) | pass | pass (backend 75, storefront 818, dashboard 6159 + 1 timeout in an unchanged file) | pass (1 backend failure pre-existing on baseline-v1) | pass |
| Hidden answers followed in the final code | 8 / 8 applicable (#5 replaced by the variant) | 9 / 9 | not run (operator read the code: 9 / 9 hidden items checked) | 7.5 / 9 | 8 / 9 (first pass) |
| Operator score (1–5) / merge-ready | 4 / yes (changed from no on 28 Oct; for review: dashboard UI only on the staging-schema build, translations) | 5 / yes | 3 / no | 3 / no | 4 / yes |

**Reading it:**
- The interview was long (29 questions in 5 rounds, ~58 min of the agent waiting for answers) and asked 6 of the 9 hidden requirements; the other 3 (migration, marketing emails, legal review) were handled correctly without asking.
- The first "done" was not usable in the running app: the agent tested against pytest's own database and gated the dashboard UI behind a staging flag. Both were fixed by one-line follow-ups; backend enforcement, privacy (birthday hidden, audit-logged reads) and the storefront were correct when checked.

## Caveats (read before quoting the numbers)

- **Runner stalls are excluded only in the Rosetta runs so far (28 Oct).** When the whole run was idle until the operator typed `continue` (a Claude Code stall), that window is now removed from the time like a wait for the operator: `L-CC-07` 73 min (7 min 41 s + 65 min 37 s; 5 h 49 min → 4 h 36 min to first "done"), `L-CC-08` 9 min 28 s (2 h 54 min → 2 h 45 min). Cost does not change. The other runs are not yet checked for such stalls, and for `L-CC-07` it is not yet checked in the log that no background task finished during the 65-minute window.
- **AWS AI-DLC did not finish any of its 3 runs so far.** None reached a first "done":
  - Small task, Claude Code (`S-CC-05`): stopped by the operator during AI-DLC's Construction phase, with a partial diff. Its run report is not in the branch yet, so time and cost are not known.
  - Large task, Claude Code (`L-CC-05`): stopped after more than 6 hours and about $160 of usage, more than twice the most expensive finished run ($57.65, `L-CC-07`). Report to follow.
  - Small task, Copilot CLI (`S-CP-05`): not qualifying. In all 3 attempts (2 clean resets) the AI-DLC engine's review gate looped at intent-capture: it kept asking for a fresh confirmation of the intent documents and never accepted one. 490.88 AI credits and about 1 hour in total, no code written; that is more than the finished Baseline (389.10) and Grill-with-docs (452.33) small Copilot runs. Report and token breakdown: `runs/small-storage-conditions/copilot/aws-ai-dlc/`.
  - The pattern is the same in all 3: AI-DLC asked its questions (11 in `S-CP-05`, 3 of them hidden requirements), then went in circles: on Copilot its review gate looped at intent capture and no code was written; on Claude Code it stopped in Construction with a partial diff (`S-CC-05`) or ran more than 6 h without a first "done" (`L-CC-05`).
  - Under the same rules as the other methods, AI-DLC used as much as or more than the others and delivered nothing reviewable. This is a result in itself.

- **Times are without the operator's waits.** Where a report computes it from the session log, "time" is the agent's time: the minutes the agent waited for the operator (answers, approvals, nights, weekends) are removed. `S-CC-03` and `L-CC-03` were recomputed this way on 2026-10-26 (before: 44 min / 1 h 2 min and 1 h 48 min / 8 h 46 min of clock time). Cost is not recomputed: it is the runner's total.
- **Rosetta coding flow (`S-CC-06`) ran without the one-time `/init-workspace-flow`**, the method's own project preparation (its report, section 1). Rosetta Light (`S-CC-07`, `L-CC-07`) and Rosetta Skills (`S-CC-08`, `L-CC-08`) started from the initialized workspace (`setup_min: 60`). So the three Rosetta variants were not set up the same way; `S-CC-06` should be re-run from the initialized workspace, and `L-CC-06` starts from it.
- **Copilot run notes since 28 Oct** (each report, section 8): `L-CP-01` and `L-CP-03` were hit by a Copilot outage (authorization errors; `L-CP-03` paused 18 h after its first "done"), so their total time is not comparable and is not shown; time to the first "done" and cost are not affected. `L-CP-03` was run with an AI assistant on the operator's side (BENCHMARKS.md §3.5 says no human-side AI), and its 3 / merge-ready stands next to 7 of 12 checks passed. `S-CP-07` ran on Copilot CLI 1.0.103 and on the Rosetta clone at `817b3adf` (the v3.1.17 tag was moved on 23 Oct; earlier Rosetta runs used `6215332c`); its operator answered the subagents' retry stops with the agent's own option and counted them as extra questions, while the method counts such stops as method steps (to be aligned, so its question count is not comparable yet).
- **Copilot `S-CP-03` is not comparable with Claude Code in cost.** Copilot CLI reports AI credits, not USD; methods are compared within one runner only. It ran before the Copilot setup was merged: the team rules file was not loaded at session start (`copilot instruction list`: none; the agent read the repos' rule files itself), and `--yolo` was used instead of `--allow-all`. Superpowers chose `gpt-5.3-codex` for 26 of its 30 subagents itself (an explicit model in its task calls), as it chooses an Opus or Fable reviewer in Claude Code: part of the method, not a setup error.

- **One run per method (n = 1).** No repetitions yet; differences can be noise. Our rule is at least 3 runs per cell before a conclusion.
- **Diff judge.** All 4 cells are judged (one judge session per cell, n = 1). The judge sees the method folder names, so it is not blind. Its merge advice is advice; `operator_merge_ready` stays the operator's decision. The small Claude Code JSON (29 Oct) predates the `S-CC-06` rerun of 3 Nov: the 74.5 in it belongs to the first run. The rerun was judged on 16 Nov (`judge/judge-small-storage-conditions-claude-code-rosetta-flow-rerun.json`): 74.6, 0 / 0 / 6, merge advice yes. Rosetta Light and Grill-with-docs were judged in the same session as a calibration check: 72.7 (was 73.4) and 71.1 (was 71.6; one more major: hand-edited staging schema). The tables keep the 29 Oct values for them. The step-5 validator has not run on the 16 Nov JSON. The large Claude Code cell was judged in rounds (two groups of runs), although the size rule said one pass (decision-log D86; the size formula is open with the architect).
- **Superpowers run notes** (`S-CC-03`, section 8): ran before the method guide (plain prompt instead of `/superpowers:brainstorming`, some replies not the fixed ones), old setup like `S-CC-02`; the operator's per-check results, tests and merge-ready were not recorded; the session log was lost, so `tokens.md` is built from `/cost`; the operator used an AI assistant to suggest replies (BENCHMARKS.md §3.5 says no human-side AI).
- **Rosetta run notes** (`S-CC-06`, section 8): two operator messages reached the agent before T1 (`is it done?` with a paste of the benchmark assistant's notes), which breaks the "don't interrupt" rule; the operator's answer time (~4 + 5 min) is inside the run time; 9 of the 12 questions were not in the answer tables and were answered by the operator (now added to BENCHMARKS.md §4, rows 11–18).
- **Spec Kit run notes** (`S-CC-04`, section 8): with setup, one restarted first attempt and saving the results, the operator spent about 4 h on this run (the table counts only T0 → end); after the follow-ups the operator finished with Spec Kit's own `implement`/`converge` loop (3 extra rounds); the session was interrupted during follow-up 2 and resumed after a re-login, so the total cost is an estimate (`/cost` restarted; Appendix A of the report); "Done when" checks: the operator confirmed the result works overall, per-check detail from the agent's live checks.
- **`L-CC-02` is a task variant, not comparable with other large runs.** During the interview the operator replaced hidden key #5 ("visible everywhere with an age label") with an own rule (restricted products hidden from ineligible viewers, product page blurred) and changed one own answer (EU 18 / US 21 → one store-wide 18). Other notes: one round answered yes/no, one follow-up pasted with the assistant's notes, the operator restarted the storefront after the agent's dashboard restart (report §8).
- **`S-CC-03` dashboard diff (935 KB) is mostly environment noise.** It ran on the old setup, where the dashboard dev server regenerated `schema-main.graphql` and 4 `*.generated.ts` files at start (before T0; its report §1). Without those files its dashboard change is 39 KB / 552 added lines, in line with the others (Baseline 29 KB, Grill-with-docs 30 KB, Spec Kit 34 KB, Rosetta 53 KB). Since 2026-10-21 `bench.sh setup` puts that regeneration into `baseline-v1`.
- **"Total code changes" in `/cost` is not the size of the change.** It counts only lines written with Claude Code's `Edit`/`Write` tools; agents that write code through the shell, generators or subagents show almost nothing there (`L-CC-02`: "18 lines added" against ≈ 3 976 added lines in 131 files in its diffs). Use the run's `<repo>.diff` files for size.
- **`L-CC-04` follow-ups were drafted by the operator's AI assistant**, not written by the operator (report §8). `L-CC-02` sent 2 follow-ups worded from the assistant's description of what the operator saw (its report §8). Both depart from "follow-ups in the operator's own words".
- **Not identical setups.** `S-CC-02` ran before two setup fixes (some upstream `CLAUDE.md` / `AGENTS.md` files were still in the repos, and the agent's shell used Node 20) and on Claude Code 2.1.304; `S-CC-01` ran on the fixed setup with 2.1.305. Details in each report, section 8.
- **IDE context.** `S-CC-01` and `S-CC-06` ran Claude Code in the VS Code integrated terminal, so the IDE tools were available; no run used them (0 IDE tool calls in every `tokens.md`, and no open file or selection sent to the agent). New runs use a standalone terminal with no IDE connection. Why, and the settings: [BENCHMARKS.md, section 2](../../BENCHMARKS.md#2-runners-models-permissions).

## Next

1. Claude Code: Rosetta coding flow large (`L-CC-06`), from the initialized workspace. AWS AI-DLC: run reports for `S-CC-05` and `L-CC-05`.
2. Reruns: Rosetta coding flow small (`S-CC-06`) with `/init-workspace-flow`; Grill-with-docs large (`L-CC-02`) on the original hidden key; Superpowers large (`L-CC-03`) or its missing final checks and score.
3. Copilot CLI, 6 runs left: AWS AI-DLC on the large task (`L-CP-05`, last); Rosetta coding flow `S-CP-06`, `L-CP-06`; Rosetta Light large `L-CP-07`; Rosetta Skills `S-CP-08` (Oleksii, in progress) and `L-CP-08`. `S-CP-03` needs its status in EXPERIMENTS.md; `S-CP-07` its question count aligned with the method.
4. Validator (step 5) for the 16 Nov `S-CC-06` rerun judgement; repetitions.
