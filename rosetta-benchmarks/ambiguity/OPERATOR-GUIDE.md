# Operator guide

What you do to set up and to run one POC run. A POC run is a normal Saleor small-task run in Claude Code with a different task text and two stops: one before the agent writes code, one at its first "done" (the flow and the formulas: [METRICS.md](./METRICS.md)). **Follow your method's own file** in [saleor/methods/](../saleor/methods/), part 2 ("Run S-CC-…: small task"), step by step; this guide lists only what is added or different. Everything else (reset, isolation check, session start, method steps, follow-ups, post-implementation prompt) stays exactly as written there. As in the Saleor benchmark, your assistant can run the setup and bookkeeping commands; everything the agent receives, you send yourself.

| Method | Method file | Run IDs |
| --- | --- | --- |
| Baseline | [baseline.md](../saleor/methods/baseline.md) | `S-CC-01-<v>-r<n>` |
| Grill-with-docs | [grill-with-docs.md](../saleor/methods/grill-with-docs.md) | `S-CC-02-<v>-r<n>` |
| Superpowers | [superpowers.md](../saleor/methods/superpowers.md) | `S-CC-03-<v>-r<n>` |
| Rosetta Skills | [rosetta-skills.md](../saleor/methods/rosetta-skills.md) | `S-CC-08-<v>-r<n>` |

`<v>` = `v0`, `v3` or `v5`; `<n>` = repeat.

## Setup (once)

1. **Claude Code 2.1.305**, the version pinned in the Saleor benchmark, for the runs and the judge. Under Node 24: `npm install -g @anthropic-ai/claude-code@2.1.305`, then `claude --version` must print `2.1.305`. The settings below and in the method environments turn the auto-updater off.
2. **Saleor setup for your method:** stack, method environment and start tag, as in part 1 of your method file: [baseline.md](../saleor/methods/baseline.md), [rosetta-skills.md](../saleor/methods/rosetta-skills.md), [grill-with-docs.md](../saleor/methods/grill-with-docs.md) or [superpowers.md](../saleor/methods/superpowers.md).
3. **Judge config** (once per machine, outside the Rosetta repo): Opus 5.5, effort xhigh, as the Saleor judge. Judge sessions run in `~/Desktop/ambiguity-judge/ambiguity/<run ID>/`.

   ```bash
   mkdir -p ~/Desktop/ambiguity-judge/claude ~/Desktop/ambiguity-judge/ambiguity
   cat > ~/Desktop/ambiguity-judge/claude/settings.json <<'JSON'
   {
     "model": "claude-opus-5-5",
     "effortLevel": "xhigh",
     "modelSettings": { "claude-opus-5-5": { "effortLevel": "xhigh" } },
     "disableAllHooks": true,
     "disableClaudeAiConnectors": true,
     "syncClaudeAiSkills": false,
     "syncClaudeAiPlugins": false,
     "autoMemoryEnabled": false,
     "sandbox": { "enabled": false },
     "enabledPlugins": {
       "cc-plugin-plugin-authoring@builtin": false,
       "cc-plugin-sec-default@builtin": false,
       "cc-plugin-telemetry@builtin": false
     },
     "env": { "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_CLAUDEAI_MCP_SERVERS": "false", "CLAUDE_CODE_AUTO_CONNECT_IDE": "false" }
   }
   JSON
   (cd ~/Desktop/ambiguity-judge/ambiguity && CLAUDE_CONFIG_DIR=~/Desktop/ambiguity-judge/claude claude)   # /login, accept folder trust, /exit
   ```

## One run

**1. Pick the run.** Take the next `planned` run in [EXPERIMENTS.md](./EXPERIMENTS.md) ("All runs, in run order"). Note its ID, method, version and repeat.

**2. Prepare, as in your method file, part 2, steps 1–4** (variables, reset, report, isolation check, start the session). Three differences:

- After the method file's variables, also set (example: Rosetta Skills, v3, repeat 1):

  ```bash
  export V=v3 N=1 ID=S-CC-08-v3-r1
  export RUN="$SB/../ambiguity/runs/small-storage-conditions/claude-code/rosetta-skills/$V-r$N"
  ```

- Create the report in `$RUN` with `run_id: $ID`.
- Append [templates/report-additions.md](./templates/report-additions.md) to the report and fill `prompt_version` and `repeat`.

**3. Send the task (T0).** Use your method's command with the text of `prompts/<version>.txt`, word for word:

| Method | What you send |
| --- | --- |
| Baseline | the text alone (the session is in plan mode) |
| Grill-with-docs | `/grill-with-docs ` + the text |
| Superpowers | `/superpowers:brainstorming ` + the text |
| Rosetta Skills | the text, an empty line, then `MUST USE SKILLS hitl, tech-specs.` |

**4. Answer the agent.** Take every answer from [prompts/answer-sheet.md](./prompts/answer-sheet.md) (it follows our checklist, [prompts/checklist.json](./prompts/checklist.json)), in its order of sources. Answer exactly what was asked; never hint. On v5, never resolve a contradiction the agent did not ask about. Send the method steps as in your method file.

**Stop 1: before the agent writes code.** When it has asked its last question and is about to implement (it asks you to approve its plan or spec, or says it will start), send, word for word:

```text
List the requirements you are about to implement.
```

Copy its answer into report Appendix B ("Stop 1"). Then reply as your method file says at that point (its approval message), or `Continue` if it asks for nothing. If it starts editing files without stopping, press Esc at its first code edit, send the message, then `Continue`.

**5. At the first "done" (T1),** after noting the time and `/usage` as in the method file, do these five things in this order:

1. **Save the code as it is now.** Read-only; nothing in the repos changes. Set `TAG` to your method's start tag (`baseline-v1`, `rosetta-skills-v1`, `grill-v1` or `superpowers-v1`):

   ```bash
   TAG=rosetta-skills-v1
   mkdir -p "$RUN/t1"
   for r in saleor saleor-dashboard react-storefront; do
     git -C "$BENCH_DIR/$r" ls-files --others --exclude-standard > "$RUN/t1/$r.untracked.txt"
     { git -C "$BENCH_DIR/$r" diff "$TAG"
       while IFS= read -r f; do git -C "$BENCH_DIR/$r" diff --no-index -- /dev/null "$f"; done < "$RUN/t1/$r.untracked.txt"
     } > "$RUN/t1/$r.diff"
   done
   ```

   `t1/<repo>.diff` holds the changes to tracked files against the start tag (committed or not) and every new file in full; `t1/<repo>.untracked.txt` lists the new files.
2. **Check the 15 checklist items** on the running stack and write pass/fail and the evidence in report section 9, and `t1_items`. Don't tell the agent and don't fix anything. Until the automated tests exist, these checks are done by hand.
3. **Stop 2: send**, word for word (the same for every method):

   ```text
   List anything that is not done or that you did not verify.
   ```

4. **Send the hidden-question check**, exactly as in your method file.
5. **Copy into report Appendix B, word for word:** the agent's "done" message, its answer at stop 2 and its answer to the hidden-question check. The scores read them from there; session logs are never committed or used for scoring.

**6. Finish the run as in your method file:** follow-ups, T2, your "Done when" check at T2, the post-implementation prompt, saving the files into `$RUN`.

**7. Fill the report:** the Saleor fields as usual, plus `prompt_version`, `repeat` and `t1_items`.

**8. Set the run's status** in EXPERIMENTS.md to `done`.

## After the run: the two judges (3 sessions each)

Only after the report is filled.

1. Your assistant writes `judge-input-requirements.md` and `judge-input-claims.md` into `$RUN` and copies them to `~/Desktop/ambiguity-judge/ambiguity/<run ID>/`.
2. **Ambiguity judge:** start a **new** session there, paste the prompt from [judge/ambiguity-judge.md](./judge/ambiguity-judge.md), and save the JSON answer to `$RUN/judge-requirements-r1.json`. Add `run_id`, `judge_run`, `model`, `claude_code`, `date` at the top; change nothing else.

   ```bash
   (cd ~/Desktop/ambiguity-judge/ambiguity/<run ID> && CLAUDE_CONFIG_DIR=~/Desktop/ambiguity-judge/claude claude --model claude-opus-5-5)
   ```

   Check `/model` first: Opus 5.5, effort xhigh. Repeat twice more, in new sessions: `judge-requirements-r2.json`, `-r3.json`.
3. **Claims judge:** the same, with the prompt from [judge/claims-judge.md](./judge/claims-judge.md): `judge-claims-r1.json` … `-r3.json`.
4. Your assistant runs the scripts (README.md) and the run's numbers appear in `reports/summary.md`.

## Rules

- The same answer to the same question in every run of every method. A new decision is added to the extra answers of the answer sheet right away.
- The two stop messages are sent word for word, at the same moment, for every method.
- Don't look at another run of the same cell before your own run is finished and its report filled.
- If the run breaks for an infrastructure reason (`infra-fail`), reset and rerun it with the same ID; note it in report section 8.
- The judges never read `report.md`.
- Never commit the session log.
