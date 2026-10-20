# Baseline: quick guide

How to set up the Baseline environment, keep every method out, and do one run. General rules are in [BENCHMARKS.md](../../BENCHMARKS.md); this page only adds what is specific to Baseline, plus the exact texts to paste and the commands that make the run's files.

Runs: `S-CC-01`, `S-CP-01`, `L-CC-01`, `L-CP-01` (see [EXPERIMENTS.md](../EXPERIMENTS.md)).

## What gets installed

Nothing. Baseline = runner + model + the shared team rules file [baseline-instructions.md](../baseline-instructions.md), which `bench.sh setup` already put into every repo as `CLAUDE.md` and `.github/copilot-instructions.md`. No plugins, skills, agents, commands, hooks or MCP servers.

Start tag: `baseline-v1` (made by `bench.sh setup`). Baseline has no tag of its own and no init step, so there is no per-repo setup time.

**Baseline starts in plan mode.** Every Baseline run starts in the runner's built-in plan mode: the agent first explores and writes a plan, the operator approves it, then it implements with full access. Plan mode is part of the runner, not an installed method, so the isolation check is unchanged. The task prompt is the same as for every other method; only the session starts in plan mode (step 2), and approvals are method steps (step 6).

## One-time setup

Do this once, after `bench.sh setup` (BENCHMARKS.md, section 3).

1. Claude Code: a separate config dir with nothing in it but the common settings (BENCHMARKS.md, section 3.5):

```bash
export BENCH_DIR="$HOME/saleor-benchmark"
export BASE="$BENCH_DIR/envs/baseline"
mkdir -p "$BASE/claude"
cat > "$BASE/claude/settings.json" <<'JSON'
{
  "model": "claude-sonnet-5-5",
  "effortLevel": "medium",
  "disableClaudeAiConnectors": true,
  "syncClaudeAiSkills": false,
  "syncClaudeAiPlugins": false,
  "autoMemoryEnabled": false,
  "disableAllHooks": true,
  "enabledPlugins": {
    "cc-plugin-plugin-authoring@builtin": false,
    "cc-plugin-sec-default@builtin": false,
    "cc-plugin-telemetry@builtin": false
  },
  "env": { "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_CLAUDEAI_MCP_SERVERS": "false" }
}
JSON
```

2. Check that the rules file is the only AI file in every repo, and that it is the unchanged baseline file:

```bash
RULES=<rosetta-repo>/rosetta-benchmarks/saleor/baseline-instructions.md
for r in saleor saleor-dashboard react-storefront; do
  echo "== $r"
  cmp "$RULES" "$BENCH_DIR/$r/CLAUDE.md" && echo "CLAUDE.md = baseline rules"
  cmp "$RULES" "$BENCH_DIR/$r/.github/copilot-instructions.md" && echo "copilot-instructions.md = baseline rules"
  git -C "$BENCH_DIR/$r" ls-tree -r --name-only baseline-v1 | grep -E '(^|/)(AGENTS|CLAUDE|GEMINI)\.md$|\.mdc$|(^|/)\.github/instructions/|(^|/)\.claude/|(^|/)\.cursor/'
done
```

Expected: both `cmp` lines print `= baseline rules`, and the `grep` prints only `CLAUDE.md` in each repo. Any other file (for example `saleor/graphql/CLAUDE.md`) means `baseline-v1` was made by the old `bench.sh` that left nested AI files (pilot S-CC-02, deviation 1): delete the three repos' `baseline-v1` setup and run `bench.sh setup` again before any run.

**Claude Code login (once).** The new config dir has no login yet:

```bash
cd "$BENCH_DIR" && CLAUDE_CONFIG_DIR="$BASE/claude" claude
```

Run `/login` with your work account. Then check, in the same session:

- `/plugin` → **Installed**: nothing, built-in plugins switched off except `agents-md` and `diff` (BENCHMARKS.md, section 3.5). No "claude.ai sync" skills;
- `/skills`: no skills (no user, project or synced skills);
- `/mcp`: no MCP servers (no claude.ai connectors).

Anything else in these lists means the environment isn't clean: fix it before any run (BENCHMARKS.md, section 3.5). If the dir was used with sync on, delete `$BASE/claude/plugins/synced/` and start again.

**Copilot (VS Code), once:**

1. Create a VS Code profile `bench-baseline` (Profiles → New Profile → Empty). In it, install only GitHub Copilot and GitHub Copilot Chat. No other AI extensions.
2. Settings in this profile: `chat.tools.autoApprove: true`, terminal confirmations off, Copilot memory off, no user-level instructions or prompt files.
3. In the chat, choose model **GPT-6.1 Sol**, effort medium, auto model selection off.

Record the one-time setup time as `setup_min` in the first Baseline run's report (config dir + login + checks; not part of any run).

## Every run

`RUN_DIR` is the run's folder, always an **absolute** path (the agent writes there), e.g. `<rosetta-repo>/rosetta-benchmarks/saleor/runs/small-storage-conditions/claude-code/baseline`. It must exist before T0, with `report.md` copied from the [small](../templates/run-report-small.md) or [large](../templates/run-report-large.md) template.

1. **Reset.**
   ```bash
   nvm use 24
   B=<rosetta-repo>/rosetta-benchmarks/saleor/scripts/bench.sh
   $B reset baseline-v1 && $B start && $B health
   ```
   Paste the `health` output into the report, section 1. Set the run's status in EXPERIMENTS.md to `running`.
2. **Start a new session** in the workspace root `$BENCH_DIR`, in a terminal where `node -v` shows v24 (the agent inherits this Node; the pilot ran on Node 20 and pnpm failed):
   - Claude Code:
     ```bash
     export BENCH_DIR="$HOME/saleor-benchmark" BASE="$HOME/saleor-benchmark/envs/baseline"
     export CLAUDE_CONFIG_DIR="$BASE/claude"
     export RUN_DIR=<rosetta-repo>/rosetta-benchmarks/saleor/runs/<task>/claude-code/baseline   # absolute; used by the commands below
     node -v; claude --version                       # v24.x; runner_version for the data block
     rm -rf "$CLAUDE_CONFIG_DIR/projects/"*saleor-benchmark*
     # Isolation check (BENCHMARKS.md 3.5): paste the whole output into the report, section 1
     claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" "$CLAUDE_CONFIG_DIR/agents" "$CLAUDE_CONFIG_DIR/commands" 2>/dev/null
     for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" describe --tags; git -C "$BENCH_DIR/$r" status --porcelain; done
     # Plan mode first; full access stays available and is picked when the plan is approved (step 6)
     cd "$BENCH_DIR" && claude --allow-dangerously-skip-permissions --permission-mode plan --model claude-sonnet-5-5
     ```
     Expected: no plugins, no MCP servers, no `ls` output, `baseline-v1` three times and no `status` lines. In the session, check `/model` (Sonnet 5.5, effort medium), `/skills` (none), `/plugin`, `/mcp` (none) and paste them too. These are local commands: they don't count as operator messages. Before T0 the status line must show **plan mode on**. If it doesn't, press Shift+Tab until it does.
   - Copilot: open `$BENCH_DIR` in VS Code with the `bench-baseline` profile, new chat, history cleared, and pick the chat's **Plan** mode (agent picker) instead of Agent. Check that this mode exists in the pinned Copilot version before S-CP-01, and write the exact mode name in the protocol. Run `code --profile bench-baseline --list-extensions` and paste it.
3. **"Method is active"** (BENCHMARKS.md, section 5, step 1) for Baseline means: no method is active, the rules file is in place, and plan mode is on. Step 2 of the one-time setup (the `cmp` / `grep` loop) checks the file; the isolation check covers the rest. Unlike other methods, don't send the agent a "what can you do?" message: there is no method to list, and it would be an extra operator message in the session log.
4. **Start the timer and send the task prompt** (T0), with the session in plan mode. No entry command: the text is exactly the one from BENCHMARKS.md, section 4. Small task:
   ```text
   Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
   Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

   Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
   ```
5. **Questions.** Answer from BENCHMARKS.md, section 4: hidden-question table first (mark **asked**), then the extra answers, word for word. A new question: decide as the product owner, answer, and add a row to the extra answers right away with the run ID. Write every question and answer in the timeline.
6. **Approvals (method steps).** Approve only when the agent asks you to. Each approval counts as `method_steps`, not as a follow-up. Write it in the timeline as `method-step`, with the exact option or text you sent.
   - **Plan approval** (Claude Code shows the plan and an approval menu): pick **"Yes, and bypass permissions"**, the option that approves the plan and turns on full access, so implementation runs like every other method. Copilot: start implementation from the plan the way Plan mode offers it (its handoff to Agent mode), with auto-approve already on; write the exact button or text in the timeline. Don't type feedback into the plan dialog. Questions the agent asks while planning are answered as in step 5. If the plan misses something, don't correct it: approve it, and it shows up later in the hidden-question check.
   - **Any other stop that only asks for permission** ("Shall I proceed?", "Want me to continue with the dashboard?"): send exactly **`Approved, continue.`**
   - If a stop needs an answer other than these two, write the exact text in the timeline and in section 8.
   - Save the approved plan before the next reset, if the runner wrote one to a file. `plans/` is not cleared between runs, so take the newest file and check that its time is after T0:
     ```bash
     P=$(ls -t "$CLAUDE_CONFIG_DIR"/plans/*.md 2>/dev/null | head -1); [ -n "$P" ] && ls -l "$P" && cp "$P" "$RUN_DIR/plan.md"
     ```
     No file: the runner didn't save one; the plan is still in the session log (and in Appendix B, if you copied it).
7. **T1.** When the agent first says it is done: note T1, then right away type `/cost` and `/usage` and copy both outputs into Appendix A (T1). Copy the "done" message into Appendix B.
8. **Hidden-question check.** One message with only the hidden questions not asked yet. Use these exact wordings, so every run asks the same thing (4 and 5 are the pilot's wordings):
   ```text
   Don't change any code, just answer: was each of these handled, and where?
   1. Is the storage conditions value plain text or rich text, and what is its maximum length?
   2. Is it translatable, like the other product texts?
   3. Is it set per product or per variant?
   4. Where is the storage conditions value shown to customers: only on the product page, or also in other places (cart, checkout, order emails)?
   5. Existing products: what value do they get after the change, and is a data migration needed for them?
   6. Is it included in import/export, in webhook payloads, and in API filters?
   7. Who can edit it, and who can read it?
   ```
   Delete the lines already asked and renumber. Large task: same opening line, then the questions from its table in BENCHMARKS.md, section 4. Copy the answer into Appendix B and mark each one **covered** or **not covered**.
9. **Follow-ups**, written by you, for every not-covered item and anything broken. Count each one (`followups`) and each pointed-out hidden question (`hidden_missed`). Run the "Done when" checks (report, section 4) yourself.
10. **T2** = end of the agent's answer to the last follow-up (T2 = T1 if there were none). Type `/cost`, `/usage` and `/context` and copy them into Appendix A (T2). `/context` gives `context_end_pct`.
11. **Post-implementation prompt** (only now). Replace `<RUN_DIR>` with the absolute path, all three times:
    ```text
    Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff`, and save it to <RUN_DIR>/<repo>.diff.
    Then write <RUN_DIR>/agent-report.md containing:
    - experiment info: task, method, runner, model, start/end time;
    - a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
    - for each action, whether it was done (yes/no) and short evidence (command, file, or output).
    Do not make any further code changes.
    ```
    The `<repo>` placeholder stays as is: the agent fills it in.
12. **Save the run's files** (below), before the next reset. Then fill the report and set the status in EXPERIMENTS.md.

## Files of the run and how to make them

| File | Made by | How |
| --- | --- | --- |
| `report.md` | operator | Copied from the template before T0, filled during the run |
| `<repo>.diff` | agent | Post-implementation prompt; checked by the operator (below) |
| `agent-report.md` | agent | Post-implementation prompt |
| `tokens.md` | script | `session-usage.py` (below), Claude Code runs only |
| `session/` | script | Raw session logs, copied by the same command. Git-ignored: they contain local tokens and passwords |
| `plan.md` | runner | The approved plan, if the runner saved it to a file (step 6) |
| `workspace-root/` | operator | Only if the agent wrote files outside the three repos (below) |

**Check the diffs** against the repos (the agent's diff must be the real one):

```bash
for r in saleor saleor-dashboard react-storefront; do
  d="$(cd "$BENCH_DIR/$r" && git add -N . && git diff)"
  if [ -z "$d" ]; then [ -e "$RUN_DIR/$r.diff" ] && echo "$r: unchanged, but $r.diff exists" || echo "$r: unchanged, no diff (OK)"
  else printf '%s\n' "$d" | cmp -s - "$RUN_DIR/$r.diff" && echo "$r: diff OK ($(git -C "$BENCH_DIR/$r" diff --stat | tail -1))" || echo "$r: DIFF MISSING OR DIFFERENT"; fi
done
```

If one is missing or different, make it yourself with the same `git add -N . && git diff > "$RUN_DIR/$r.diff"` and write that in section 8 (the agent's diff is part of its result).

**Token breakdown** (`tokens.md`), Claude Code runs. Close the agent session first (`/exit`), so the log is complete. `--t1` is T1 from the data block:

```bash
python3 <rosetta-repo>/rosetta-benchmarks/saleor/scripts/session-usage.py \
  "$BASE/claude/projects/$(echo "$BENCH_DIR" | tr / -)" --t1 <T1, e.g. 2026-10-20T14:05> \
  --copy-to "$RUN_DIR" --out "$RUN_DIR/tokens.md"
```

A projects dir picks its newest session: that is the run's session only because the dir was emptied in step 2. Check the first line of `tokens.md`: first model call ≈ T0. Then take from it: the "By model" table (report, section 2), `subagents` ("subagents launched"), and the token split per operator message. Expected for Baseline: no "Skills loaded" table. If one appears, something leaked into the environment: write it in section 8. A plan approved in the menu is not a typed message, so in "By operator message" planning and implementation fall into the same row (the task prompt's). To split them, use the plan-approval time from the timeline.

**Workspace-root files.** `bench.sh reset` deletes everything in `$BENCH_DIR` except the repos, so save what the agent wrote there first:

```bash
cd "$BENCH_DIR" && ls -A | grep -vxE 'saleor|saleor-dashboard|react-storefront|seed.dump|logs|envs'
# if anything is listed:
mkdir -p "$RUN_DIR/workspace-root" && cp -R <listed items> "$RUN_DIR/workspace-root/"
```

**Before committing**, shorten home-directory paths in pasted outputs and in `agent-report.md` to `~` (pilot, deviation 4), and make sure `session/` is not staged (`git status` in the Rosetta repo).

## What to watch for

- **Something other than the rules file guides the agent.** Lines like `Loaded saleor/graphql/CLAUDE.md` in the terminal mean a nested AI file survived: the run is not a Baseline run. Note it, stop, fix `baseline-v1`, reset and retry (`retries`).
- **Plan mode not on at T0**, or the session left plan mode before you approved: the run didn't start as Baseline should. Note it; if no code was changed yet, reset and retry (`retries`).
- **Permissions after the plan.** If the agent keeps asking for tool permissions after the plan was approved, the wrong menu option was picked. Switch to bypass with Shift+Tab and note it in section 8.
- **Agent stops early without saying "done"** (e.g. after the backend). That is not T1. If it asks to go on, step 6. If it just stops, note the time and what is left, and write in section 8 how you continued: the rules don't cover this case yet.
- **Node 20 in the agent's shell.** Check `node -v` in the terminal you start `claude` from. If the agent still reports Node 20, write it in section 8.

## Turning it off

Nothing is installed (plan mode is a launch flag, not a setting). Baseline exists only as `$BASE/claude` (used only when `CLAUDE_CONFIG_DIR` points to it) and the `bench-baseline` VS Code profile.
