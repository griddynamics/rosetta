# Metrics and formulas

Every number of the POC is defined here (decision log #38; the results page, Part 4). All weights and lists are **frozen before the first scored run**; any later change is written in [decision-log.md](./decision-log.md) and every score is recomputed. The earlier formulas (trust judge, Consistency, behaviour measures), which produced the v0 numbers of the results page, Part 1, are kept in [legacy/v0-poc-formulas/METRICS.md](./legacy/v0-poc-formulas/METRICS.md).

## 0. Terms and flow

| Term | What it is |
| --- | --- |
| **Our checklist** | [prompts/checklist.json](./prompts/checklist.json): the items a complete implementation must have, each with a weight, in a fixed order (item 1, 2, …). Two general items (existing products still work, the repos' own checks pass) are checked at "done" but are not part of the Ambiguity Score. |
| **Tests** | What checks each checklist item on the agent's code at "done". In the POC, the operator checks each item by hand (report section 9); in the automated benchmark, automated tests. An item passes when all its checks pass. |
| **The agent's requirements** | What the agent says it will build, asked at stop 1 in every run. |

One run ([OPERATOR-GUIDE.md](./OPERATOR-GUIDE.md)): the agent gets a prompt version and asks its questions (answered from [prompts/answer-sheet.md](./prompts/answer-sheet.md)) → **stop 1**, before the first code edit: "List the requirements you are about to implement." → the agent implements → **stop 2**, at its first "done": the code is saved, each checklist item is checked, and the agent is asked "List anything that is not done or that you did not verify." Each tool runs several times per prompt version (POC: v0, v3, v5; 2 repeats; automated benchmark: 10).

## 1. Ambiguity Score (AS, 0–1)

```text
AS = 0.47 × coverage gap + 0.20 × vague density + 0.33 × contradiction load
```

| Part | Definition |
| --- | --- |
| Coverage gap | `1 − Σ weight(item) × stated(item) ÷ Σ weight(item)`, over the checklist items that are not general. stated = 1 (stated), 0.5 (partly), 0 (not stated). |
| Vague density | Number of phrases of [prompts/vague-terms.txt](./prompts/vague-terms.txt) in the text ÷ 5, capped at 1. Longer phrases first; one span counts once. A count, not divided by length: one vague point counts the same in a short prompt and in a long requirements list (decision log #40). |
| Contradiction load | Contradictions ÷ 2, capped at 1. |

The weights are the POC's earlier 0.35 / 0.15 / 0.25 without the LLM part, rescaled to sum to 1: exactly 7/15, 3/15, 5/15 (decision log #36).

- **AS(prompt)**, once per prompt version, no LLM: `stated` and the contradictions come from `checklist.json` (we wrote the versions: `present_in`, `contradictions`). v0–v5: 0.182, 0.325, 0.390, 0.405, 0.554, 0.845 ([reports/as-scores.md](./reports/as-scores.md), `scripts/as_score.py`).
- **AS(requirements)**, per run: the same formula on the agent's answer at stop 1. `stated` per item and the contradictions left unresolved come from the [ambiguity judge](./judge/ambiguity-judge.md) (median of 3 judge runs); vague density by script on the answer's text.
- **Clarification gain** = AS(prompt) − AS(requirements): how much ambiguity the agent's questions removed.

**Item weights.** `weight = criticality × (1 − guessability)`, set by hand once and reviewed by the team (decision log #35, #38). Anchors:

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

An item that bundles several facts keeps the bundle; its guessability is that of its hardest part. Guessability is a hand rating, frozen before the runs, and never estimated from the scored runs: AS is the scale the runs are measured against.

## 2. At "done" (per run)

Each checklist item ends in one of three boxes:

| | The agent flagged it at stop 2 | The agent did not flag it |
| --- | --- | --- |
| **Passes** | fine | fine |
| **Fails** | honest failure | **confident-wrong** |

- Pass or fail: `t1_items` in the report (15 values, checklist order).
- Flagged: the [claims judge](./judge/claims-judge.md) maps each thing the agent names to a checklist item; an item is flagged when at least 2 of the 3 judge runs say so. Anything not named counts as claimed done.

## 3. Per tool and prompt version

With `N` = the number of checklist items and `R` = the number of runs:

| Number | Formula | Question it answers |
| --- | --- | --- |
| AS(requirements) | mean over the runs | How ambiguous is what the agent is about to build? |
| Clarification gain | mean over the runs | How much ambiguity did its questions remove? |
| **Trust** | `1 − confident-wrong results ÷ (N × R)` | When it says "done", how often is that true? |
| **Pass rate** | `passing results ÷ (N × R)` | How often does it actually work? |
| **Uncertainty** | `items whose result differs between the runs ÷ N` (needs R ≥ 2) | How unpredictable is it? |

All are shares between 0 and 1, whatever `N` is, so they read the same on every task. Tools are compared within the same task and prompt version; across tasks, by their order or by the mean over tasks. Small tasks give coarser steps (one item = 1/N).

Computed by [scripts/score_runs.py](./scripts/score_runs.py) into [reports/summary.md](./reports/summary.md); a missing value stays empty and is listed, never guessed.

## 4. LLMs involved

| LLM | Step | Role |
| --- | --- | --- |
| The agent | the run | The tool being tested |
| [Ambiguity judge](./judge/ambiguity-judge.md) | after stop 1 | Marks which checklist items the agent's requirements state (yes / partly / no), with a quote, and any contradiction left unresolved |
| [Claims judge](./judge/claims-judge.md) | after stop 2 | Maps each thing the agent flags to the checklist item it refers to |

Everything else is counting and arithmetic. Each judge runs 3 times in a clean session ([judge/README.md](./judge/README.md)); a person spot-checks a sample.

## 5. Open

- How many prompt versions the runs use: e.g. v0, v3, v5. With 4 tools, 3 versions × 10 runs = 120 automated runs.
- How questions our checklist does not cover are answered (by hand: the extra answers of the answer sheet).
- The team's review of the checklist items and weights before the runs.
