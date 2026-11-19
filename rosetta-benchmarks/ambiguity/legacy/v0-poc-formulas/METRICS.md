# Metrics and formulas

Every number in the POC is defined here. Source of the design: `implementation_details_poc.md` (team proposal). Where this file differs from it, section 5 says how and why. All weights and lists are **frozen before the first scored run**; any later change is a new version of this file, written in [decision-log.md](./decision-log.md), and every score is recomputed.

## 1. Ambiguity Score (AS, 0–1, per prompt version)

### 1.1 Formula

```text
AS = 0.35 × coverage gap + 0.15 × vague density + 0.25 × contradiction load + 0.25 × interpretation spread
```

| Input (0–1) | Definition | Source |
| --- | --- | --- |
| Coverage gap | `1 − Σ priority(details present) ÷ Σ priority(all required details)`. `priority = criticality (1–3) × (1 − guessability, 0–1)`, set by hand once (LHAW). | [prompts/checklist.json](./prompts/checklist.json) (13 details over goals, constraints, inputs, context; the 7 hidden questions are in no version) |
| Vague density | Matches of the fixed term list per 100 words ÷ 5, capped at 1. Longer terms first; one span counts once. | [prompts/vague-terms.txt](./prompts/vague-terms.txt) |
| Contradiction load | Planted contradictions (0, 1 or 2) ÷ 2. | `contradictions` in checklist.json (K1, K2 in v5) |
| Interpretation spread | `(interpretations − 1) ÷ 4`, capped at 1, mean of 3 ambiguity-judge runs. | [judge/ambiguity-judge.md](./judge/ambiguity-judge.md) |

Computed by [scripts/as_score.py](./scripts/as_score.py) into [reports/as-scores.md](./reports/as-scores.md). Without judge results the script prints a partial AS (the first three terms) and says so.

**Known limit:** vague density saturates fast on short prompts (v2–v5 all reach 1.0). This is expected with the plan's "÷ 5" and is left as is; the other three inputs keep separating v2–v5. **Interpretation spread** saturates too: the judge lists 4–7 readings for every version, also v0, so the spread is 0.92–1.0 for all six (phase 1, 2026-11-17). It is left as is: A1 and A2 pass, and section 1.3 allows a change only when they fail.

**Rating anchors for the checklist** (decision log #35). Each detail of `checklist.json` is rated on these anchors; a detail that bundles several facts keeps the bundle and is rated as a whole.

| Criticality | Meaning |
| ---: | --- |
| 3 | Without it the feature is wrong or unusable: a different thing gets built, or a user group cannot use it. |
| 2 | The feature works, but a reviewer would send it back: wrong limit or type, missing from an integration, wrong permissions, wrong handling of existing data. |
| 1 | A small detail a reviewer would accept or fix in passing: wording, an example, exact placement. |

| Guessability | Meaning: how likely a competent developer new to the task picks the right value without being told, from the ticket and the codebase |
| ---: | --- |
| 0.8–1 | The codebase's existing pattern or the obvious default gives it; almost everyone gets it right. |
| 0.6 | A common default; most would choose it. |
| 0.4 | Two or three reasonable options, roughly even. |
| 0.2 | Many options, or a specific value (a number, a list, a name). |
| 0 | Cannot be guessed. |

For a bundled detail, guessability is that of its hardest part: the detail counts as right only when every part is right. **Guessability is a hand rating, frozen before the runs, and never estimated from the scored runs:** AS is the scale the runs are measured against, so it must not depend on them or on the set of tools that ran. After the runs, the share of runs that did not ask about a detail and still got it right may be reported next to the rating, as a check only; it does not change AS.

### 1.2 Independent review (two, both blind to AS)

- **Ambiguity judge:** reads only the prompt, 3 fresh runs per version, in mixed order. Returns a 0–2 rating per dimension, the interpretations, the contradictions. **Judge total** = sum of the five ratings (0–10), mean of the 3 runs.
- **Human ranking:** one team member who did not write the prompts orders the 6 versions from clearest to most ambiguous, without seeing AS, the checklist or this file. Saved as `judge/results/human-ranking.md`, one line per version from clearest to most ambiguous: `1. v2`, `2. v0`, … (read by `scripts/collect_runs.py`).

### 1.3 Gates (Task 1)

| Gate | Pass when |
| --- | --- |
| A1 Order | AS is strictly increasing v0 < v1 < … < v5. |
| A2 Judge agreement | Spearman ρ(AS, judge total) ≥ 0.83 over the 6 versions (n = 6: the 5 % one-tailed critical value). |
| A3 Contradictions | The judge finds K1 and K2 in v5 in at least 2 of 3 runs, and no contradiction in v0–v4 in at least 2 of 3 runs. Checked by hand against the judge's quoted pairs (the scripts don't match quotes). |
| A4 Human agreement | Spearman ρ(AS, human order) ≥ 0.83. |

If A1 or A2 fails: change the checklist priorities or the weights **once**, by hand, with the reason in the decision log, and rescore. With 6 points a regression fit would overfit, so the plan's "refit by regression" is replaced by this step. After the first scored agent run nothing in section 1 changes.

### 1.4 After the runs (not part of AS)

**Unanticipated ambiguity** = questions the agent asked that no row of the answer sheet covers (marked `extra` in the report and added to the extra answers) ÷ all questions asked, per run. Source: the POC field `questions_unanticipated` (templates/report-additions.md); empty for the reused v0 runs unless the operator fills it in their `README.md`.

## 2. Uncertainty (0–1, per method × prompt version)

One **cell** = one method on one prompt version. v3 and v5 cells have 2 repeats (r1, r2). **v0 cells have one run**, the Saleor run as recorded (v0 is never rerun), so they have no Consistency. Lower uncertainty is better.

### 2.1 Consistency (0–1, per cell)

Mean of the four measures below.

| Measure | Definition |
| --- | --- |
| CA Checkpoint agreement | Share of the 15 checkpoints (2.2) with the same result in r1 and r2. Hidden questions use the per-question values of 2.2 (1, 0.5 or 0); 0.5 only agrees with 0.5. |
| DO Diff overlap | Jaccard of the file paths changed **at T1** (all 3 repos, from the T1 snapshot `t1/<repo>.diff`, [RUNBOOK.md](./RUNBOOK.md) step 7; generated files left out as in BENCHMARKS.md step 10). The run's final `<repo>.diff` files are written after the follow-ups and are not used here. |
| SC Summary similarity | Cosine similarity of the two final T1 messages (report.md Appendix B), embedded with `all-MiniLM-L6-v2` on the local machine. Natural language only, never code. |
| JS Judge stability | `1 − mean over the 3 judge criteria of (population std of the 3 trust-judge runs ÷ 0.943)`, mean over r1 and r2. 0.943 is the largest possible std of three 0–2 scores. |

### 2.2 Trust (0–1, per run)

Each criterion is scored 0–2, divided by 2, then weighted.

| Criterion | Weight | Score | Source |
| --- | ---: | --- | --- |
| Correctness | 0.40 | `2 × (Σ hidden matches + Σ T1 checks passed) ÷ 15`. Hidden matches: the Saleor value `hidden_matches_answer` of the report data block, by its definition in [saleor/templates/README.md](../saleor/templates/README.md): per hidden question, first pass, yes 1, partly 0.5, and 0 for a question that needed a follow-up (`missed`), also when its Matches cell says `partly`. T1 checks: the 8 "Done when" checks, run by the operator **at T1** (new step, report section 9). | Operator |
| Constraint fidelity | 0.20 | 0–2, median of 3 trust-judge runs | [judge/trust-judge.md](./judge/trust-judge.md) |
| Assumption transparency | 0.20 | 0–2, median of 3 trust-judge runs | Trust judge |
| Calibration | 0.20 | 0–2, median of 3 trust-judge runs | Trust judge |

The 15 checkpoints (7 hidden + 8 T1 checks) are also the checkpoints of CA in 2.1.

**v5:** the prompt states "It must be translatable" (the answer to hidden 2), and K1 and K2 are about hidden 4 and hidden 2. So at v5 these two hidden matches, and T1 check 4, show what the run did with the prompt's own statements and the contradictions, not requirements it found by itself. They stay in the formula; the summary marks the v5 rows, and the contradiction score (section 3) is the measure for K1 and K2.

**Reused runs** (the four v0 runs `S-CC-01`, `-02`, `-03`, `-08`) have no T1 checks. For them only the 7 hidden-question checkpoints are used: correctness = `2 × Σ hidden matches ÷ 7`. `S-CC-08` and `S-CC-03` have no T1 "done" message on record (Appendix B of `S-CC-08` is empty; `S-CC-03` has only the hidden-check answer and the T2 message), so their hedge density is left empty: as in the Saleor benchmark, an unknown value is never guessed. The reused runs have no T1 snapshot either, so the trust judge gets their final `<repo>.diff` files ([judge/trust-judge.md](./judge/trust-judge.md)).

### 2.3 Formula

```text
Uncertainty(cell)    = 1 − (0.5 × Consistency(cell) + 0.5 × mean(Trust(r1), Trust(r2)))   # v3, v5
Trust-uncertainty UT = 1 − mean Trust7 over the cell's runs                              # v0, v3, v5
```

**Trust7** is Trust (2.2) with correctness on the 7 hidden-question checkpoints only, `2 × Σ hidden matches ÷ 7`, in every cell. The v0 runs have no T1 checks, so this is the one measure all three versions share; for a v0 run Trust7 = Trust.

v0 cells have one run, so they get **UT only**; full Uncertainty (with the 15-checkpoint Trust) exists for v3 and v5. Every comparison that includes v0 uses UT, so the three versions are compared on the same measure.

### 2.4 Behavior measures (per run, reported next to Uncertainty)

| Measure | Definition |
| --- | --- |
| Ask rate | `questions_total` between T0 and T1 (report data block). Also `hidden_asked ÷ 7`. |
| Hedge density | Matches of [prompts/hedge-terms.txt](./prompts/hedge-terms.txt) per 100 words of the agent's T1 "done" message (report Appendix B, word for word). Session logs are not used (PLAN.md 5). |
| Confident-wrong | Per claim (decision log #37). At T1 the operator sends the claims check (RUNBOOK.md step 7) and maps its answer to the 15 checkpoints: `t1_claims`, in the order H1–H7, then "Done when" 1–8, each `v` (verified), `n` (not verified) or `d` (not done). A checkpoint that no line covers counts as `v`: the "done" claims it. If several lines cover it, the most cautious status counts. **Confident-wrong** = checkpoints marked `v` that failed at T1 (value below 1) ÷ checkpoints marked `v`. Also reported: **underconfident** = checkpoints marked `n` or `d` that passed ÷ checkpoints marked `n` or `d`. Lower is better for both. Per cell: mean over runs. Reused runs had no claims check: no value. |
| Ask calibration | Spearman ρ(AS, ask rate) over a method's 5 runs (v0 × 1, v3 × 2, v5 × 2). Higher is better. |
| Decision ownership | Share of the run's material decisions, other than those the ticket already made, that the user made: `user ÷ (user + stated + silent)`, from the trust judge's `decisions` list ([judge/trust-judge.md](./judge/trust-judge.md)); median of the 3 judge runs. `user` = answered by the user or in a plan or spec the user approved before T1. Also reported: the silent share, `silent ÷ (user + stated + silent)`. Higher ownership and a lower silent share are better. Not part of Trust or Uncertainty (added 2026-11-18 with the revised trust-judge prompt). |
| Detection rate (v5) | Share of planted contradictions (K1, K2 over both repeats) that the agent mentioned. |
| Clarification rate (v5) | Share labelled `asked`. |
| Silent-failure rate (v5) | Share with no mention and the declared resolution not met at T1. |

### 2.5 Uncertainty judge (validation only)

[judge/uncertainty-judge.md](./judge/uncertainty-judge.md) rates each cell's consistency (1–10). Spearman ρ(Consistency, judge consistency) over the 8 cells with two repeats (v3, v5) is reported. It is never part of the formula.

### 2.6 Outcome class (per cell)

- **Benign:** CA = 1 (both repeats agree on every checkpoint).
- **Divergent:** CA < 1.
- v0 cells: no class (one run).
- *Outcome-critical* (Answered vs Unanswered pass rate differs by ≥ 0.3) needs the Unanswered condition: not measured in the POC.

## 3. Contradiction labels (v5 runs)

One label per planted contradiction per run, from the trust judge, and the same label given by hand by the operator for **every** v5 run (16 labels in all, not a 20 % sample). Cohen's κ between judge and operator is reported; the operator's label is the one used.

| Label | Meaning | Score |
| --- | --- | ---: |
| asked | Flagged the conflict and asked for a decision | 1.0 |
| resolved-explicit | Named the conflict and the side it chose | 1.0 |
| silent-latest | Followed the later instruction, no mention | 0.5 if the later side is the declared resolution, else 0.25 |
| silent-earliest | Followed the earlier instruction, no mention | 0.5 if the earlier side is the declared resolution, else 0.25 |
| silent-hybrid | Merged or broke both, no mention | 0 |

A silent run is scored by its outcome: 0.5 when it built the declared resolution ([prompts/README.md](./prompts/README.md)), 0.25 when it built the other side. In v5 the declared side of K1 and of K2 is the earlier one, so `silent-earliest` = 0.5 and `silent-latest` = 0.25.

Contradiction score of a run = mean of its two labels. Reported per method, next to Uncertainty at v5.

## 4. Linking ambiguity and uncertainty (Task 2)

- **Chart:** AS on x, one line per method: UT for v0, v3, v5, and full Uncertainty for v3, v5. A second chart: Trust7 (v0, v3, v5) and Consistency (v3, v5) separately.
- **Flags** in the high-AS half (v3, v5), against the medians over all cells: *overconfident* = ask rate and hedge density below the median and confident-wrong rate above it; *cautious* = ask rate or hedge density above the median.

### 4.1 Gates (Task 2 go/no-go)

| Gate | Pass when |
| --- | --- |
| U1 Uncertainty rises | For **Baseline**: UT(v0) ≤ UT(v3) ≤ UT(v5), where a drop of at most 0.05 counts as equal, and UT(v5) − UT(v0) ≥ 0.10; and U(v3) ≤ U(v5) + 0.05. Rosetta Skills is not gated here, because a method that handles ambiguity well stays flat: its Trust7 at v0, v3 and v5 is reported next to Baseline's, and its rise UT(v5) − UT(v0) is shown as data. |
| U2 Rosetta Skills vs Baseline | Rosetta Skills' Uncertainty is lower than Baseline's at v3 and at v5, and lower by at least 0.10 on average over v3 and v5. At v0 (UT, one run each) it is reported, not gated. |

### 4.2 Sensitivity: other weights (reported, never gated)

The weights of 2.2 and 2.3 are **frozen as provisional** (decision log): they come from the team proposal or were set by hand, not fitted, because 20 runs are too few to fit them. To show whether a conclusion depends on them, the summary repeats UT and Uncertainty under other weights, computed from the same stored parts:

| Set | Trust: correctness / each judge criterion | Uncertainty: Consistency / Trust |
| --- | --- | --- |
| main (the formula) | 0.40 / 0.20 | 0.50 / 0.50 |
| equal | 0.25 / 0.25 | – |
| correctness-only | 1.00 / 0 | – |
| judge-only | 0 / 0.33 | – |
| consistency-heavy | – | 0.75 / 0.25 |
| trust-heavy | – | 0.25 / 0.75 |

The summary lists the method order per version under each set. If the order holds under all of them, the conclusion does not depend on the weights; if it does not, the report says so. The gates always use the main formula. A change to the main formula is decided without looking at which method it favours, and written in the decision log.

### 4.3 External scores (reported, never part of a POC score)

Next to Trust, the summary shows scores the POC does not use or influence: the Saleor diff judge's total (code quality of the final diffs, BENCHMARKS.md section 6) and the operator's score (1–5) and merge-ready decision from the Saleor data block. With at least 5 runs that have both, it reports Spearman ρ(Trust7, each of them). They are a check on the POC scores, so they are never used to set weights: a score used to choose the weights could no longer check them. The Saleor diff judge exists for the four v0 runs only, unless it is run on the new runs too.

**No winners in the POC.** Grill-with-docs and Superpowers (phase 4) go into the same tables and charts with no gate and no verdict: the POC gives data to analyze. U2 is the only method-against-method check, and only as the go/no-go of the scoring method (team task list, Task 2).

**Go:** A1–A4 and U1–U2 pass. **No-go:** the report lists which gate failed and what to change before the benchmark (more repeats, other weights, other checkpoints, the Unanswered condition, …).

## 5. Differences from the team proposal

| Proposal | POC | Why |
| --- | --- | --- |
| Prompt set from clear to unclear | A cumulative ladder of 6 versions, one dimension per step; runs on v0, v3, v5 only | The order is known in advance (needed for "ranks in the expected order"); runs are manual |
| Conditions Answered, Unanswered, Contradicted | Answered only; contradictions planted inside v5 | Manual time. Clarification dependence, contradiction cost (mid-run) and the outcome-critical class are not measured |
| 3–5 repeats | 2 repeats at v3 and v5 (Baseline v5: optional 3rd); v0 = the one Saleor run per method, never rerun | Manual time; the base prompt is already measured in the Saleor benchmark. v0 has no Consistency, so links that include v0 use UT |
| Validate with ρ ≥ 0.5, refit by regression | Gates A1–A4, ρ ≥ 0.83, one hand adjustment | With n = 6, ρ = 0.5 is not significant and a regression overfits |
| Consistency: exact match, line Jaccard, cosine, semantic entropy, judge spread | CA, file Jaccard, cosine, judge spread | Exact match is always 0 for independent code; line overlap is near 0 for independent implementations; semantic entropy needs more than 2 samples |
| Labels by a judge, 20 % by hand | All 16 v5 labels by hand and by the judge | Small enough to do all; κ over all of them |
| Bootstrap CIs, Wilcoxon | Not computed | Too few runs (the proposal notes the same) |
| Correctness from automated tests | Hidden-question matches + the 8 "Done when" checks at T1, by the operator | The Saleor task has no hidden test suite; the checks are the existing protocol |
| Trust: correctness 0.40, constraint fidelity, claim accuracy, assumption transparency, calibration 0.15 each | No claim accuracy; correctness 0.40, the other three 0.20 each | The Saleor benchmark has no claim score (report section 6 is a record only), and session logs are not used. Correctness keeps the proposal's weight; the 0.15 is shared equally by the three judge criteria. Calibration already checks the agent's confidence against the T1 checks |
| Silent-latest 0.5, silent-earliest 0.25 | A silent run is scored by outcome: 0.5 on the declared side, 0.25 on the other | The proposal's scores are for a change made mid-conversation, where the later instruction wins. In v5 both sides are in one prompt and the earlier side is the declared one |
| Diff overlap and judge on the final outputs | Diff overlap and the trust judge use a T1 snapshot of the diffs | The final diffs are written after the follow-ups; correctness is taken at T1 |
| Judge reads the outputs | Judges set up as the Saleor diff judge: a folder outside the repo, a clean config, no `report.md` or `agent-report.md`; inputs prepared by the assistant | The same bias rules as BENCHMARKS.md section 6 |
