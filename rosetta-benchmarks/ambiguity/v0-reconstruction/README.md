# v0 reconstruction: current formulas on the reused Saleor runs

AS(requirements), clarification gain, Trust and pass rate with the current formulas ([METRICS.md](../METRICS.md)) for the four Saleor v0 runs: Baseline `S-CC-01`, Rosetta Skills `S-CC-08`, Grill-with-docs `S-CC-02`, Superpowers `S-CC-03`. No new agent runs. Done 2026-11-24. Uncertainty needs 2 or more runs per method and stays empty.

Scored by the POC's own `scripts/score_runs.py`, pointed at `runs/` here. Output: [results.md](./results.md) (stdout of the command below) and [results.json](./results.json) (the same `compute()` result as JSON).

## Files per run (`runs/small-storage-conditions/claude-code/<method>/v0-r1/`)

| File | What |
| --- | --- |
| `report.md` | Front matter read by the script (`poc_schema: ambiguity-poc/v2`, `prompt_version: v0`, `t1_items`), the 15 items at the first "done" with evidence, and Appendix B with the stop-1 and stop-2 proxies |
| `items-at-done.json` | The same item results with evidence, as data |
| `judge-input-requirements.md`, `judge-requirements-r1..r3.json` | Ambiguity judge: input and the 3 answers |
| `judge-input-claims.md`, `judge-claims-r1..r3.json` | Claims judge: input and the 3 answers |

## How each input was obtained

| Input | Protocol (METRICS.md) | Here |
| --- | --- | --- |
| The agent's requirements (stop 1) | Answer to "List the requirements you are about to implement." before the first code edit | **Proxy:** the requirements document the user approved before coding. Baseline: `plan.md`. Rosetta Skills: the tech spec, §1–§12 (§13 "Implementation deviations" was written after coding and is left out). Superpowers: the design spec. **Grill-with-docs: none recorded** (its plan was shown in the terminal only), so its AS(requirements) stays empty. |
| Pass/fail per checklist item at the first "done" | Tests or operator checks on the code at "done" | **Reconstructed** from the recorded run: the "done" message, the agent's later answer on what it had handled, the follow-ups, the operator checks, the Saleor report and the final diffs. One evidence line per item. |
| Items the agent flagged (stop 2) | Claims judge on the answer to the stop-2 question | **Proxy:** claims judge on the agent's "done" message. |

Judge runs: Claude Code subagents (Opus 5.5, general-purpose, clean context, read only the input file), 3 per judge per run, not the clean-config CLI sessions of [judge/README.md](../judge/README.md). Ambiguity judge prompt: as in [judge/ambiguity-judge.md](../judge/ambiguity-judge.md). Claims judge prompt: "the answer to: List anything that is not done or that you did not verify" replaced by "the message when it said the task was done", and "things the agent says are done do not count" added.

Format changes, no change to the words: in Appendix B, the stop-1 text is a quote block with inner code fences as `~~~`, because the script ends Appendix B at the first `## ` line and reads the first code fence. The script removes the `> ` before it counts vague phrases. Baseline `judge-requirements-r3.json`: the answer was not valid JSON (several quoted strings in one `quote` field); they are joined with `; `, labels unchanged (noted in the file).

## Reading AS(requirements)

AS(requirements) = 0.47 × coverage gap + 0.20 × vague density + 0.33 × contradiction load.

| Run | Coverage gap | Vague density | Unresolved contradictions | AS(requirements) |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 0.110 | 0.20 | 0 | 0.092 |
| Rosetta Skills | 0.000 | 0.00 | 1 | 0.167 |
| Superpowers | 0.104 | 0.20 | 0 | 0.088 |

- Rosetta Skills states all 13 items and uses no vague phrase. Its score comes from one contradiction inside its spec, found by all 3 judge runs: §2 gives the GraphQL field as `String!`, §4 as nullable `String`. One contradiction = 0.33 × ½ = 0.165.
- "Stated" means decided, not right: Baseline's "No translation ... out of scope" counts as stated for item 8, although it is the wrong decision. Correctness shows in Trust and pass rate, not in AS.

## Limits

- One run per method on v0, the clearest prompt version (AS(prompt) = 0.182): no Uncertainty, and nothing yet about more ambiguous prompts.
- Stop 1 and stop 2 are proxies. The documents differ in length (Baseline 37 lines, Rosetta Skills 94, Superpowers 36); a longer document has more room for an internal contradiction.
- Rosetta Skills: the webhook/CSV requirement came from the operator during the spec review, unasked (Saleor report, timeline #6).
- Saleor kept no code snapshot at the first "done". For Baseline, Rosetta Skills and Superpowers, the checks ran at the end of the run; the item states at "done" are inferred from the evidence cited per item.
- Rosetta Skills and Superpowers: the "done" message was recorded only as a short summary.
- Superpowers: the operator did not record which check failed; the error found (translations still shown after the value is removed) is mapped to item 8. Mapping it to item 7 gives the same result.
- Grill-with-docs and Superpowers ran on an older setup (EXPERIMENTS.md).
- One item = 0.067 of Trust or pass rate: the four methods differ by at most 2 items.

## Rerun

From the rosetta repo root, on branch `benchmarks/ambiguity-poc`, without `--write` (that flag would overwrite `reports/` of the real runs):

```bash
python3 rosetta-benchmarks/ambiguity/scripts/score_runs.py --runs rosetta-benchmarks/ambiguity/v0-reconstruction/runs > rosetta-benchmarks/ambiguity/v0-reconstruction/results.md
```
