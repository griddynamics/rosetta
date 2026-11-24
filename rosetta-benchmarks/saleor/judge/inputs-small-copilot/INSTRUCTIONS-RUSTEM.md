# Run the diff judge: small task (storage conditions) × Copilot

Goal: judge the 7 Copilot runs of the small task with Claude Code (Opus 5.5, xhigh) and give back one JSON.
Why you: Oleksii hit the weekly Claude limit (resets 2:00 Europe/Warsaw).

Nothing to decide yourself. Follow the steps exactly; the rules are in `rosetta-benchmarks/SCORE-DIFFS.md` and `rosetta-benchmarks/BENCHMARKS.md` section 6 "Diff judge" (read the Sequence table).

Files in this folder:
- `first-message-small-copilot.md`: the judge's first message (paths are Oleksii's, see Part 1, step 3).
- `task-small.md`: task prompt, "Done when", hidden questions and answers, extra answers.

## Part 1. For the assistant (Copilot/Claude chat) of the operator

Give this text to your assistant. It must do steps 1–3 and nothing else.

1. **Judge folder (outside the Rosetta repo).**
   - Make `~/saleor-judge`.
   - Extract `test-library/saleor-not-initialized-repos.zip` into it. It gives three repos: `saleor`, `saleor-dashboard`, `react-storefront`.
   - In each repo: `git checkout baseline-v1`; `git status` must be clean.
   - Do NOT start the judge inside the Rosetta repo (it would load the repo's CLAUDE.md/AGENTS.md/skills and bias the ratings).
2. **Clean Claude Code config** in `~/saleor-judge/claude/settings.json`, exactly:
   ```json
   {
     "syncClaudeAiSkills": false,
     "syncClaudeAiPlugins": false,
     "env": {
       "DISABLE_AUTOUPDATER": "1",
       "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1",
       "ENABLE_CLAUDEAI_MCP_SERVERS": "false",
       "CLAUDE_CODE_AUTO_CONNECT_IDE": "false"
     },
     "model": "claude-opus-5-5",
     "disableClaudeAiConnectors": true,
     "disableAllHooks": true,
     "sandbox": { "enabled": false },
     "effortLevel": "xhigh",
     "modelSettings": { "claude-opus-5-5": { "effortLevel": "xhigh" } },
     "autoMemoryEnabled": false,
     "skipDangerousModePermissionPrompt": true
   }
   ```
   No plugins, skills or hooks. You log in to Claude Code with your own account on first start.
3. **Inputs.** Copy `task-small.md` to `~/saleor-judge/task-small.md`. Make the first message from `first-message-small-copilot.md` with the paths replaced (set `REPO` to the Rosetta repo path on your machine):
   ```bash
   REPO=/path/to/rosetta   # your checkout, branch benchmarks/saleor-v2
   cp $REPO/rosetta-benchmarks/saleor/judge/inputs-small-copilot/task-small.md ~/saleor-judge/task-small.md
   sed -e "s#/Users/olepoletaiev/Downloads/Projects/rosetta#$REPO#g" \
       -e "s#/Users/olepoletaiev/saleor-judge#$HOME/saleor-judge#g" \
       $REPO/rosetta-benchmarks/saleor/judge/inputs-small-copilot/first-message-small-copilot.md \
       > ~/saleor-judge/first-message-small-copilot.md
   grep -c "olepoletaiev" ~/saleor-judge/first-message-small-copilot.md   # must print 0
   ```
   Check that `$REPO/rosetta-benchmarks/saleor/runs/small-storage-conditions/copilot/` has 7 method folders with `saleor.diff`, `saleor-dashboard.diff`, `react-storefront.diff` (baseline, grill-with-docs, superpowers, spec-kit, rosetta-flow, rosetta-light, rosetta-skills).
4. Do not add rules for the judge. Never give the judge `report.md`, `agent-report.md` or BENCHMARKS.md.

## Part 2. For the operator (you)

Use a normal Terminal window (not the VS Code terminal, not Copilot CLI).

1. Start the judge:
   ```bash
   cd ~/saleor-judge
   CLAUDE_CONFIG_DIR=~/saleor-judge/claude caffeinate -i claude --model claude-opus-5-5 --dangerously-skip-permissions
   ```
   Check the header says `Opus 5.5 with xhigh effort`.
2. Paste the whole first message (`pbcopy < ~/saleor-judge/first-message-small-copilot.md`, then Cmd+V, Enter).
3. Wait. The diffs are about 669K tokens, above the budget, so the judge splits the work into rounds with 2 background subagents. This is normal. While subagents run: do not type, do not press Esc.
   - On a session/weekly limit (HTTP 429) Claude Code continues by itself at the reset time. Leave the window open, keep the Mac awake and plugged in. Do not start a new session.
   - If a subagent failed and the judge stops, send: `Resume the same subagents; do not start new ones and do not wrap up early.`
4. The judge reports a leaderboard and stops. **Before approving**, send the self-challenge prompt (exact text, from BENCHMARKS.md section 6):
   ```text
   Honestly: do you see overstatements, inventions, assumptions, wrong or missing evidence, wrong line numbers, nitpicks, root causes counted twice, values that do not follow the values table, impact levels not based on the finding's own impact, evidence from another run, or missing findings (negatives and strengths) in any run and any metric? Anything else you see is wrong? Did you analyze the positive and the negative side of every difference, starting with why the run did it that way (does it make sense, does it follow a base rule, does it solve a problem others missed)? Did you level any contradicted answer as a blocker by type instead of by its impact? For every major: which existing safeguards, what remaining harm, and for whom? List each problem, fix it in the JSON, run the totals script again, and repeat the RULE-REPORT.
   ```
   Wait until it fixes the JSON, reruns the totals and stops.
5. Send: `Approved, continue.` The judge runs the validator on the top 3 runs, decides each objection, updates the JSON and reruns the totals. Wait for the final leaderboard and RULE-REPORT.
6. Send back to Oleksii (git or chat):
   - the final JSON: `$REPO/rosetta-benchmarks/saleor/judge/judge-small-storage-conditions-copilot-v2.json`;
   - a screenshot or copy of the final leaderboard and the RULE-REPORT;
   - notes about anything unusual (limit hits, resumed agents, deviations the judge reported).

Oleksii then writes the results into the 8 run reports, `summary.md` and `runs.csv`. The aws-ai-dlc run is not judged (no diffs, `not-qualifying`); it goes last in the final table.
