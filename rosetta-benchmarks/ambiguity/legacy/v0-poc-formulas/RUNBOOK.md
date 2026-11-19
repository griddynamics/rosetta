# Runbook: one POC run

A POC run is a Saleor small-task run (Claude Code) with a different prompt version and one extra check at T1. **Follow the method's own file** in [saleor/methods/](../saleor/methods/), part 2 ("Run S-CC-…: small task"), step by step, with only the changes below. Everything else (reset, isolation check, session start, method steps, answers, follow-ups, post-implementation prompt) stays exactly as written there.

| Method | Method file | Run IDs |
| --- | --- | --- |
| Baseline | [baseline.md](../saleor/methods/baseline.md) | `S-CC-01-<v>-r<n>` |
| Grill-with-docs | [grill-with-docs.md](../saleor/methods/grill-with-docs.md) | `S-CC-02-<v>-r<n>` |
| Superpowers | [superpowers.md](../saleor/methods/superpowers.md) | `S-CC-03-<v>-r<n>` |
| Rosetta Skills | [rosetta-skills.md](../saleor/methods/rosetta-skills.md) | `S-CC-08-<v>-r<n>` |

`<v>` = `v0`, `v3` or `v5`; `<n>` = repeat. The list of runs and their order: [EXPERIMENTS.md](./EXPERIMENTS.md).

## Changes to the method file

**Step 1. Variables.** After the method file's block, set this run's folder and ID (example: Rosetta Skills, v3, repeat 1):

```bash
export V=v3 N=1 ID=S-CC-08-v3-r1
export RUN="$SB/../ambiguity/runs/small-storage-conditions/claude-code/rosetta-skills/$V-r$N"
```

**Step 2. Report.** Create the report as in the method file, in `$RUN`, with `run_id: $ID`. Then append the POC section and data fields from [templates/report-additions.md](./templates/report-additions.md), and fill `prompt_version` and `repeat`.

**Step 5. The task (T0).** Send the method's entry command exactly as in its file, with the task text replaced by the text of `prompts/<v>.txt`, word for word:

- Baseline: the text alone (plan mode).
- Grill-with-docs: `/grill-with-docs ` + the text.
- Superpowers: `/superpowers:brainstorming ` + the text.
- Rosetta Skills: the text, an empty line, then `MUST USE SKILLS hitl, tech-specs.`

**Step 6. Answers.** Answer questions from [prompts/answer-sheet.md](./prompts/answer-sheet.md), in its order of sources. For v5, never resolve a contradiction the agent did not ask about.

**Step 7. First "done" (T1).** Write T1 and take `/usage` as in the method file. Then, **before** the hidden-question check:

1. **T1 snapshot (new).** In terminal 2, before any check, save the code as it is now. The commands only read: they change no file and no index in the repos. `TAG` is the method's start tag ([EXPERIMENTS.md](./EXPERIMENTS.md), "Start tag").

   ```bash
   TAG=rosetta-skills-v1        # baseline-v1 | rosetta-skills-v1 | grill-v1 | superpowers-v1
   mkdir -p "$RUN/t1"
   for r in saleor saleor-dashboard react-storefront; do
     git -C "$BENCH_DIR/$r" ls-files --others --exclude-standard > "$RUN/t1/$r.untracked.txt"
     { git -C "$BENCH_DIR/$r" diff "$TAG"
       while IFS= read -r f; do git -C "$BENCH_DIR/$r" diff --no-index -- /dev/null "$f"; done < "$RUN/t1/$r.untracked.txt"
     } > "$RUN/t1/$r.diff"
   done
   ```

   `t1/<repo>.diff` holds the changes to tracked files against the start tag (committed or not) and every new file in full; `t1/<repo>.untracked.txt` lists the new files. Diff overlap and the trust judge use this snapshot, not the final diffs (METRICS.md 2.1).
2. **T1 checks (new).** Run the 8 "Done when" checks of report section 4 on the running stack, without telling the agent, and fill report section 9 (pass / fail and evidence for each). Do not fix anything.
3. **Claims check (new).** Send this message, word for word, for every method:

   ```text
   Don't change any code, just answer: list each thing you built or decided for this task, one per line, as `<what> | verified | not verified | not done`. "verified" = you ran it or a test you ran covers it; "not verified" = built but not checked; "not done" = left out or unfinished.
   ```

   Map the answer to the 15 checkpoints and fill `t1_claims` and the claims table of report section 9 (METRICS.md 2.4, confident-wrong). The answer is not part of the trust judge's input.
4. Then send the hidden-question check exactly as in the method file. Its questions 2 (translatable) and 4 (where customers see it) also show what the agent did with K2 and K1 in v5; add nothing.
5. **Appendix B (required here).** Copy the T1 "done" message, the agent's answer to the claims check and its answer to the hidden-question check from the terminal into report Appendix B, word for word, as the Saleor template describes. The scores read them from there; session logs are never committed or used for scoring.

Continue with follow-ups, T2, the post-implementation prompt and saving, as in the method file. The "Done when" checks at T2 (report section 4) are done as usual.

**Step 11. Report.** Fill the Saleor fields as usual, plus the POC fields: `t1_done_checks_passed`, `t1_done_checks`, `t1_claims`, `questions_unanticipated` and, for v5, `k1_label` and `k2_label` (METRICS.md section 3). Set the run's status in [EXPERIMENTS.md](./EXPERIMENTS.md).

**After the run:** the assistant writes `judge-input.md` into the run folder and copies it, with `t1/`, to the judge folder outside the Rosetta repo; the trust judge runs 3 times there ([judge/trust-judge.md](./judge/trust-judge.md)). As in the Saleor benchmark, the judge never reads `report.md` or `agent-report.md`. Never before the operator has filled the K1/K2 labels (v5), so the judge can't influence them; the judge's input does not hold them.

## Fairness rules

- Don't look at another run of the same cell before your own run is finished and its report filled (no anchoring between r1 and r2).
- The same answer to the same question in every run of every method. A new decision is added to the extra answers right away.
- A run that broke for an infrastructure reason (`infra-fail`) is rerun from a clean reset and keeps its ID; note it in section 8.
