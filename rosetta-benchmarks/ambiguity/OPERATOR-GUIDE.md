# Operator guide

What you do to set up and to run one POC run. A POC run is a normal Saleor small-task run in Claude Code with a different task text and a few extra steps at the first "done". As in the Saleor benchmark, your assistant can run the setup and bookkeeping commands; everything the agent receives, you send yourself.

## Setup (once)

1. **Claude Code 2.1.305**, the version pinned in the Saleor benchmark, for the runs and the judge. Under Node 24: `npm install -g @anthropic-ai/claude-code@2.1.305`, then `claude --version` must print `2.1.305`. The settings below and in the method environments turn the auto-updater off.
2. **Saleor setup for your method:** stack, method environment and start tag, as in part 1 of your method file: [baseline.md](../saleor/methods/baseline.md), [rosetta-skills.md](../saleor/methods/rosetta-skills.md), [grill-with-docs.md](../saleor/methods/grill-with-docs.md) or [superpowers.md](../saleor/methods/superpowers.md).
3. **Judge config** (once per machine, outside the Rosetta repo): Opus 5.5, effort xhigh, as the Saleor judge.

   ```bash
   mkdir -p ~/ambiguity-judge/claude
   cat > ~/ambiguity-judge/claude/settings.json <<'JSON'
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
   (cd ~/ambiguity-judge && CLAUDE_CONFIG_DIR=~/ambiguity-judge/claude claude)   # /login, accept folder trust, /exit
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

**4. Answer the agent.** Take every answer from [prompts/answer-sheet.md](./prompts/answer-sheet.md). Answer exactly what was asked; never hint. On v5, never resolve a contradiction the agent did not ask about. Send the method steps as in your method file.

**5. At the first "done" (T1),** after noting the time and `/usage` as in the method file, do these four things in this order:

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

2. **Run the 8 "Done when" checks** on the running stack and write pass/fail and the evidence in report section 9. Don't tell the agent and don't fix anything.
3. **Send the hidden-question check**, exactly as in your method file.
4. **Copy into report Appendix B, word for word:** the agent's "done" message and its answer to the hidden-question check.

**6. Finish the run as in your method file:** follow-ups, T2, your "Done when" check at T2, the post-implementation prompt, saving the files into `$RUN`.

**7. Fill the report:** the Saleor fields as usual, plus `t1_done_checks_passed`, `t1_done_checks` and `questions_unanticipated`. On v5 also `k1_label` and `k2_label` (one of `asked`, `resolved-explicit`, `silent-latest`, `silent-earliest`, `silent-hybrid`; meanings in [METRICS.md](./METRICS.md) section 3).

**8. Set the run's status** in EXPERIMENTS.md to `done`.

## After the run: trust judge (3 sessions)

Only after the report is filled (on v5: after the K1/K2 labels).

1. Your assistant prepares `~/ambiguity-judge/<run ID>/` (the judge's input and the `t1/` folder).
2. Start a **new** session there, paste the prompt from [judge/trust-judge.md](./judge/trust-judge.md), and save the JSON answer to `$RUN/trust-judge-r1.json`. Add `run_id`, `judge_run`, `model`, `date` at the top; change nothing else.

   ```bash
   (cd ~/ambiguity-judge/<run ID> && CLAUDE_CONFIG_DIR=~/ambiguity-judge/claude claude --model claude-opus-5-5 --dangerously-skip-permissions)
   ```

   Check `/model` first: Opus 5.5, effort xhigh.
3. Repeat step 2 twice more, in new sessions: `trust-judge-r2.json`, `trust-judge-r3.json`.

## Rules

- Give the same answer to the same question in every run.
- Don't look at the other repeat of your run before your report is filled.
- If the run breaks for an infrastructure reason, reset and rerun it with the same ID; note it in report section 8.
- Never commit the session log.
