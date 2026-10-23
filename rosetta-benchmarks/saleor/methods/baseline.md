# Baseline

Runs: `S-CC-01` (small, Claude Code) · `L-CC-01` (large, Claude Code) · `S-CP-01` (small, Copilot) · `L-CP-01` (large, Copilot). Everything for this method is in this file: setup, then each run step by step. Rules: [BENCHMARKS.md](../../BENCHMARKS.md).

## The method's commands

| Command / skill | When | Official doc |
| --- | --- | --- |
| plan mode: `claude --permission-mode plan` | start the session | [permission-modes](https://code.claude.com/docs/en/permission-modes) |
| **Yes, and bypass permissions** | approve the final plan; Claude then starts coding (the docs call it "Yes, and switch to BYPASS PERMISSIONS …") | [permission-modes](https://code.claude.com/docs/en/permission-modes) |
| Copilot CLI plan mode: `copilot --plan` | start the session (Copilot) | `copilot --help` (1.0.101) |
| **Accept plan and continue in Interactive execution mode** | approve the final plan (Copilot); Shift+Tab leaves plan mode if it is still on; never an Autopilot option | Copilot CLI plan approval menu (1.0.101) |

**T0 message, small task** (copy as is):

```text
Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**T0 message, large task** (copy as is):

```text
Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

Every other reply is written out in each run below (parts 2, 3, 5, 6).

## 1. Setup for Claude Code (once)

Open a terminal **inside your rosetta checkout**. Skip this part if `git -C ~/saleor-benchmark/saleor tag -l baseline-v1` already prints the tag.

**1.1 Machine** (once per machine, shared by all methods): Node 24 with Claude Code in it, and the Saleor stack.

```bash
nvm install 24 && nvm alias default 24 && nvm use 24
command -v claude || npm install -g @anthropic-ai/claude-code@2.1.305
claude --version                                   # 2.1.305 (all runs use this version)
git -C ~/saleor-benchmark/saleor tag -l baseline-v1   # prints baseline-v1; if not: bench.sh setup (BENCHMARKS.md, section 3)
```

**1.2 Variables** (paste into every new terminal you use for this method):

```bash
export BENCH_DIR="$HOME/saleor-benchmark"
export ENV_DIR="$BENCH_DIR/envs/baseline"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude"
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor" B="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor/scripts/bench.sh"   # inside your rosetta checkout
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**1.3 Own config dir with the common settings** (claude.ai sync off; BENCHMARKS.md, section 3.5) plus the two Baseline settings, hooks off and plan mode as the default:

```bash
mkdir -p "$CLAUDE_CONFIG_DIR"
cat > "$CLAUDE_CONFIG_DIR/settings.json" <<'JSON'
{
  "model": "claude-sonnet-5-5",
  "effortLevel": "medium",
  "disableClaudeAiConnectors": true,
  "syncClaudeAiSkills": false,
  "syncClaudeAiPlugins": false,
  "autoMemoryEnabled": false,
  "sandbox": { "enabled": false },
  "disableAllHooks": true,
  "permissions": { "defaultMode": "plan" },
  "enabledPlugins": {
    "cc-plugin-plugin-authoring@builtin": false,
    "cc-plugin-sec-default@builtin": false,
    "cc-plugin-telemetry@builtin": false
  },
  "env": { "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_CLAUDEAI_MCP_SERVERS": "false", "CLAUDE_CODE_AUTO_CONNECT_IDE": "false" }
}
JSON
```

**1.4 Tag** (the method lives outside the repos, so the tag is the same commit as `baseline-v1`):

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f baseline-v1 baseline-v1; done
```

**1.5 Log in once** (a new config dir has no login):

```bash
(
cd "$BENCH_DIR" && claude
)                                               # in a subshell: your terminal stays where it is
```

In the session: accept the folder-trust prompt, `/login` with your work account, then `/exit`.

## 2. Run S-CC-01: small task: product storage conditions, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/claude-code/baseline/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/baseline"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/small-storage-conditions/claude-code/baseline"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset baseline-v1 && $B start && sleep 60 && $B health      # all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CC-01|' -e 's|^method:.*|method: baseline|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: baseline-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2):

```bash
{ echo "CLAUDE_CONFIG_DIR=$CLAUDE_CONFIG_DIR"; claude --version; node -v; cat "$CLAUDE_CONFIG_DIR/settings.json"
  claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" 2>/dev/null || echo "(no skills dir)"
  for p in "$CLAUDE_CONFIG_DIR"/CLAUDE.md "$CLAUDE_CONFIG_DIR"/agents "$CLAUDE_CONFIG_DIR"/commands "$CLAUDE_CONFIG_DIR"/hooks; do [ -e "$p" ] && echo "user-level: $p"; done
  grep -o '"sandbox": *{[^}]*}' "$CLAUDE_CONFIG_DIR/settings.json" || echo "sandbox: NOT SET"; [ -e "/Library/Application Support/ClaudeCode/managed-settings.json" ] && echo "managed settings present: /Library/Application Support/ClaudeCode/managed-settings.json"
  RULES="$SB/baseline-instructions.md"   # the team rules file (BENCHMARKS.md 3.3)
  for r in saleor saleor-dashboard react-storefront; do
    cmp -s "$RULES" "$BENCH_DIR/$r/CLAUDE.md" && echo "$r: CLAUDE.md = baseline rules" || echo "$r: CLAUDE.md DIFFERS"
    cmp -s "$RULES" "$BENCH_DIR/$r/.github/copilot-instructions.md" && echo "$r: copilot-instructions.md = baseline rules" || echo "$r: copilot-instructions.md DIFFERS"
    git -C "$BENCH_DIR/$r" ls-files | grep -E '(^|/)(AGENTS|CLAUDE|GEMINI)\.md$|\.mdc$|copilot-instructions\.md$|(^|/)\.github/(instructions|skills|agents|hooks)/|(^|/)\.claude/|(^|/)\.cursor/' | sed "s|^|$r: ai-file: |" || true
  done
  for r in saleor saleor-dashboard react-storefront; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; git -C "$BENCH_DIR/$r" status --porcelain; done
} 2>&1 | tee "$RUN/isolation.txt"
```

Expected: no plugins, no skills; no MCP servers; `baseline-v1` among each repo's tags; no `status` lines. `CLAUDE_CONFIG_DIR` is `envs/baseline/claude`; Claude Code 2.1.305 and Node v24; the settings from part 1.3; no `user-level:` lines; in the session, `/hooks` shows only the method's hooks. Rules file: `= baseline rules` for both files in every repo, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`. Claude Code sandbox: `"sandbox": { "enabled": false }` and no `managed settings present` line; in the session, `/sandbox` shows sandboxing off (a managed or org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code: that is not a leak. It must list no `mcp__ide__*` tools (standalone terminal, BENCHMARKS.md section 2).

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --permission-mode plan --allow-dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. the status bar shows `⏸ plan mode on`. If not: `/exit`, reset, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| asks questions | answers from the tables (few expected) |
| shows a plan while its questions are still open | **"No, keep planning"**, answer, wait |
| shows the final plan | **"Yes, and bypass permissions"** (1 method step) |
| stops again only to ask permission | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; copy the answer text, one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

**Step 7. First "done" (T1).** Write the time (T1) in the report, run `/usage` and paste its output into **Appendix A at the end of `report.md`** (block `## T1`). Then send this, after deleting the lines it already asked about:

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

Mark each one `covered` or not in report section 3. For each one not covered, and anything broken, send a follow-up in your own words, one problem per message. When the last one is done: time (T2) in the report, `/usage` and `/context` into Appendix A at the end of `report.md` (block `## T2`; `/context` gives `context_end_pct`).

**Save the approved plan** (Baseline): if the runner wrote it to a file during this run, keep a copy:

```bash
P=$(find "$CLAUDE_CONFIG_DIR/plans" -name "*.md" -newer "$RUN/report.md" 2>/dev/null | head -1 || true)   # written during this run
[ -n "$P" ] && cp "$P" "$RUN/plan.md" && echo "saved $P" || echo "no plan file: the plan is in the session log"
```

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && claude --resume <session id> --permission-mode bypassPermissions --model claude-sonnet-5-5)` and send it there (note it in section 8):

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

**Step 10. Save everything** (terminal 2, before the next reset):

```bash
T1=2026-10-20T14:05            # ← your T1 from the report (time of the first "done")
cp -R "$BENCH_DIR/run-output/." "$RUN/"
python3 "$SB/scripts/session-usage.py" "$CLAUDE_CONFIG_DIR/projects/$(echo "$BENCH_DIR" | tr / -)" \
  --t1 "$T1" --copy-to "$RUN" --out "$RUN/tokens.md"
mkdir -p "$RUN/workspace-root"
find "$BENCH_DIR" -mindepth 1 -maxdepth 1 | while read -r f; do
  case "$(basename "$f")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs | run-output | .claude | .specify | .aidlc | .github | .gitignore) ;;
  *) cp -R "$f" "$RUN/workspace-root/" ;; esac
done
rmdir "$RUN/workspace-root" 2>/dev/null || true
ls -la "$RUN"
```

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `S-CC-01` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 3. Run L-CC-01: large task: age-restricted products, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/claude-code/baseline/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/baseline"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/large-age-restriction/claude-code/baseline"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset baseline-v1 && $B start && sleep 60 && $B health      # all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CC-01|' -e 's|^method:.*|method: baseline|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: baseline-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2):

```bash
{ echo "CLAUDE_CONFIG_DIR=$CLAUDE_CONFIG_DIR"; claude --version; node -v; cat "$CLAUDE_CONFIG_DIR/settings.json"
  claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" 2>/dev/null || echo "(no skills dir)"
  for p in "$CLAUDE_CONFIG_DIR"/CLAUDE.md "$CLAUDE_CONFIG_DIR"/agents "$CLAUDE_CONFIG_DIR"/commands "$CLAUDE_CONFIG_DIR"/hooks; do [ -e "$p" ] && echo "user-level: $p"; done
  grep -o '"sandbox": *{[^}]*}' "$CLAUDE_CONFIG_DIR/settings.json" || echo "sandbox: NOT SET"; [ -e "/Library/Application Support/ClaudeCode/managed-settings.json" ] && echo "managed settings present: /Library/Application Support/ClaudeCode/managed-settings.json"
  RULES="$SB/baseline-instructions.md"   # the team rules file (BENCHMARKS.md 3.3)
  for r in saleor saleor-dashboard react-storefront; do
    cmp -s "$RULES" "$BENCH_DIR/$r/CLAUDE.md" && echo "$r: CLAUDE.md = baseline rules" || echo "$r: CLAUDE.md DIFFERS"
    cmp -s "$RULES" "$BENCH_DIR/$r/.github/copilot-instructions.md" && echo "$r: copilot-instructions.md = baseline rules" || echo "$r: copilot-instructions.md DIFFERS"
    git -C "$BENCH_DIR/$r" ls-files | grep -E '(^|/)(AGENTS|CLAUDE|GEMINI)\.md$|\.mdc$|copilot-instructions\.md$|(^|/)\.github/(instructions|skills|agents|hooks)/|(^|/)\.claude/|(^|/)\.cursor/' | sed "s|^|$r: ai-file: |" || true
  done
  for r in saleor saleor-dashboard react-storefront; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; git -C "$BENCH_DIR/$r" status --porcelain; done
} 2>&1 | tee "$RUN/isolation.txt"
```

Expected: no plugins, no skills; no MCP servers; `baseline-v1` among each repo's tags; no `status` lines. `CLAUDE_CONFIG_DIR` is `envs/baseline/claude`; Claude Code 2.1.305 and Node v24; the settings from part 1.3; no `user-level:` lines; in the session, `/hooks` shows only the method's hooks. Rules file: `= baseline rules` for both files in every repo, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`. Claude Code sandbox: `"sandbox": { "enabled": false }` and no `managed settings present` line; in the session, `/sandbox` shows sandboxing off (a managed or org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code: that is not a leak. It must list no `mcp__ide__*` tools (standalone terminal, BENCHMARKS.md section 2).

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --permission-mode plan --allow-dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. the status bar shows `⏸ plan mode on`. If not: `/exit`, reset, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| asks questions | answers from the tables (more: birthday, guests, PII) |
| shows a plan while its questions are still open | **"No, keep planning"**, answer, wait |
| shows the final plan | **"Yes, and bypass permissions"** (1 method step) |
| stops again only to ask permission | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; copy the answer text, one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

**Step 7. First "done" (T1).** Write the time (T1) in the report, run `/usage` and paste its output into **Appendix A at the end of `report.md`** (block `## T1`). Then send this, after deleting the lines it already asked about:

```text
Don't change any code, just answer: was each of these handled, and where?
1. Existing customers with no birthday: what happens when they try to buy a restricted product?
2. Existing products: are they restricted after the change?
3. Is a data migration or backfill needed?
4. A guest (not signed in): can they buy a restricted product?
5. Are restricted products visible in lists, search, discounts and banners?
6. Emails that recommend products: are restricted products excluded for customers who aren't eligible?
7. Do the terms or the privacy policy need any change?
8. Age boundary: a customer who turns the age today, which time zone, and someone born on 29 February?
9. Who can see the birthday (APIs, webhooks, exports, staff roles), and are changes and staff reads logged?
```

Mark each one `covered` or not in report section 3. For each one not covered, and anything broken, send a follow-up in your own words, one problem per message. When the last one is done: time (T2) in the report, `/usage` and `/context` into Appendix A at the end of `report.md` (block `## T2`; `/context` gives `context_end_pct`).

**Save the approved plan** (Baseline): if the runner wrote it to a file during this run, keep a copy:

```bash
P=$(find "$CLAUDE_CONFIG_DIR/plans" -name "*.md" -newer "$RUN/report.md" 2>/dev/null | head -1 || true)   # written during this run
[ -n "$P" ] && cp "$P" "$RUN/plan.md" && echo "saved $P" || echo "no plan file: the plan is in the session log"
```

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && claude --resume <session id> --permission-mode bypassPermissions --model claude-sonnet-5-5)` and send it there (note it in section 8):

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

**Step 10. Save everything** (terminal 2, before the next reset):

```bash
T1=2026-10-20T14:05            # ← your T1 from the report (time of the first "done")
cp -R "$BENCH_DIR/run-output/." "$RUN/"
python3 "$SB/scripts/session-usage.py" "$CLAUDE_CONFIG_DIR/projects/$(echo "$BENCH_DIR" | tr / -)" \
  --t1 "$T1" --copy-to "$RUN" --out "$RUN/tokens.md"
mkdir -p "$RUN/workspace-root"
find "$BENCH_DIR" -mindepth 1 -maxdepth 1 | while read -r f; do
  case "$(basename "$f")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs | run-output | .claude | .specify | .aidlc | .github | .gitignore) ;;
  *) cp -R "$f" "$RUN/workspace-root/" ;; esac
done
rmdir "$RUN/workspace-root" 2>/dev/null || true
ls -la "$RUN"
```

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `L-CC-01` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 4. Setup for Copilot CLI (once)

> ⚠️ **Not verified yet:** these steps follow the method's docs and Copilot CLI 1.0.101's own help, not a real run.

**Install and use:** the session starts in Copilot CLI's plan mode (`--plan`, plus `defaultMode=plan` in this home), like the Claude Code runs. Send the task prompt, answer its questions, approve the final plan, leave plan mode, then let it implement. Never use autopilot to approve the plan. The only instructions are the team rules file, loaded from `saleor/copilot-rules/` (BENCHMARKS.md 3.3; never `--no-custom-instructions`); no plugins, skills, hooks or MCP servers.

**4.1 Copilot CLI** (once per machine, shared by all methods):

```bash
nvm use 24
npm install -g @github/copilot@1.0.101
copilot --version                                  # GitHub Copilot CLI 1.0.101 (all Copilot runs use this version)
command -v copilot                                 # the npm install, not VS Code's copilotCli shim
```

**4.2 Variables** (paste into every new terminal you use for this method's Copilot runs; every `copilot` command needs `COPILOT_HOME`):

```bash
export BENCH_DIR="$HOME/saleor-benchmark"
export ENV_DIR="$BENCH_DIR/envs/baseline"
export COPILOT_HOME="$ENV_DIR/copilot"
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor" B="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor/scripts/bench.sh"   # inside your rosetta checkout
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$SB/copilot-rules"   # the team rules file for Copilot CLI (BENCHMARKS.md 3.3)
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**4.3 Own Copilot home with the common settings** (BENCHMARKS.md, section 3.5):

```bash
mkdir -p "$COPILOT_HOME"
copilot config autoUpdate false                      # no new CLI downloads
copilot config memory false
copilot config ide.autoConnect false
copilot config model gpt-5.6-terra                   # never Auto
copilot config effortLevel medium
copilot config continueOnAutoMode false
copilot config sandbox.enabled false
copilot config ignoredSkillsLocations "$HOME/.agents/skills"   # shared skill folder outside COPILOT_HOME: skip it
copilot config disableAllHooks true                   # Baseline only: no hooks
copilot config defaultMode plan                       # Baseline only: new sessions start in plan mode
copilot config --list
```

Both `autoUpdate=false` and `--no-auto-update` (in every session start) are needed: the setting only stops further downloads, and the launch flag makes the CLI run its installed version instead of an update it downloaded earlier.

**4.4 Install**: nothing (Baseline has no method).

**4.5 Tag** (the method lives outside the repos, so the tag is the same commit as `baseline-v1`):

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f baseline-v1 baseline-v1; done
```

**4.6 Log in and trust the workspace once** (a new `COPILOT_HOME` has no login and no trusted folders):

```bash
copilot login
(
cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --no-auto-update
)                                               # in a subshell: your terminal stays where it is
```

In the session: accept the folder-trust prompt with the option that remembers the folder, then `/exit`.

**4.7 One-time preparation**: none.

**4.8 Isolation check** (before every run, step 3; `$RUN` = that run's folder):

```bash
{ echo "COPILOT_HOME=$COPILOT_HOME"; copilot --version; node -v; copilot config --list
  copilot plugin list; copilot skill list; copilot mcp list; copilot -C "$BENCH_DIR" instruction list
  copilot config hooks 2>/dev/null || echo "(no inline hooks)"
  echo "sandbox.enabled=$(copilot config sandbox.enabled)"
  for p in "$COPILOT_HOME"/copilot-instructions.md "$COPILOT_HOME"/agents "$COPILOT_HOME"/hooks "$COPILOT_HOME"/skills "$COPILOT_HOME"/mcp-config.json; do [ -e "$p" ] && echo "user-level: $p"; done
  RULES="$SB/baseline-instructions.md"   # the team rules file (BENCHMARKS.md 3.3)
  tail -n +4 "$SB/copilot-rules/.github/instructions/team-rules.instructions.md" | cmp -s - "$RULES" && echo "copilot-rules: team-rules.instructions.md = baseline rules" || echo "copilot-rules: team-rules.instructions.md DIFFERS"
  for r in saleor saleor-dashboard react-storefront; do
    cmp -s "$RULES" "$BENCH_DIR/$r/CLAUDE.md" && echo "$r: CLAUDE.md = baseline rules" || echo "$r: CLAUDE.md DIFFERS"
    cmp -s "$RULES" "$BENCH_DIR/$r/.github/copilot-instructions.md" && echo "$r: copilot-instructions.md = baseline rules" || echo "$r: copilot-instructions.md DIFFERS"
    git -C "$BENCH_DIR/$r" ls-files | grep -E '(^|/)(AGENTS|CLAUDE|GEMINI)\.md$|\.mdc$|copilot-instructions\.md$|(^|/)\.github/(instructions|skills|agents|hooks)/|(^|/)\.claude/|(^|/)\.cursor/' | sed "s|^|$r: ai-file: |" || true
  done
  for r in saleor saleor-dashboard react-storefront; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; git -C "$BENCH_DIR/$r" status --porcelain; done
} 2>&1 | tee "$RUN/isolation.txt"
```

Expected: `COPILOT_HOME` = `envs/baseline/copilot`; version 1.0.101 and Node v24; the common settings, with `ignoredSkillsLocations` set to `~/.agents/skills`, and `skill list` shows none of that folder's skills; no plugins and no skills except the CLI's built-in ones; `config --list` also shows `disableAllHooks=true` and `defaultMode=plan`; `instruction list` shows only `team-rules.instructions.md [external]` (the team rules file, from `saleor/copilot-rules/`); no MCP servers except the CLI's built-in GitHub ones (`--disable-builtin-mcps` turns them off in the session); no inline hooks; no `user-level:` lines; `baseline-v1` among each repo's tags; no `status` lines. Rules file: `= baseline rules` for both files in every repo and for `copilot-rules`, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`. Copilot sandbox: `sandbox.enabled=false`; in the session, `/sandbox` shows sandboxing off (an org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1.

## 5. Run S-CP-01: small task: product storage conditions, Copilot

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/copilot/baseline/`. Not verified (see part 4). Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/baseline"
export COPILOT_HOME="$ENV_DIR/copilot" B="$SB/scripts/bench.sh"
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$SB/copilot-rules"   # the team rules file for Copilot CLI
export RUN="$SB/runs/small-storage-conditions/copilot/baseline"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset baseline-v1 && $B start && sleep 60 && $B health      # all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CP-01|' -e 's|^method:.*|method: baseline|' -e 's|^runner:.*|runner: copilot|' \
  -e 's|^model:.*|model: gpt-5.6-terra|' -e 's|^start_tag:.*|start_tag: baseline-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2): the block in part 4.8. Expected output as listed there.

**Step 4. Start the agent** (terminal 1), a new session (never `--resume` or `--continue`):

```bash
(
grep -l "^cwd: $BENCH_DIR$" "$COPILOT_HOME"/session-state/*/workspace.yaml 2>/dev/null | while read -r w; do rm -rf "$(dirname "$w")"; done   # earlier sessions of this workspace
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" \
  --no-auto-update \
  --model gpt-5.6-terra \
  --reasoning-effort medium \
  --plan \
  --allow-all \
  --disable-builtin-mcps \
  --dynamic-retrieval skills=off
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows GPT-5.6 Terra, effort medium; the mode indicator shows plan mode. If not: `/exit`, reset, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| asks questions | answers from the tables (few expected) |
| shows a plan while its questions are still open | **Suggest changes**, answer, wait |
| shows the final plan | **Accept plan and continue in Interactive execution mode** (1 method step; never an Autopilot option). If the mode indicator still shows plan mode: Shift+Tab to the normal interactive mode (not autopilot), then `Approved, continue.` to permit implementation (same method step) |
| stops again only to ask permission | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; copy the answer text, one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

**Step 7. First "done" (T1).** Write the time (T1) in the report, run `/usage` (AI credits) and paste its output into **Appendix A at the end of `report.md`** (block `## T1`). Then send this, after deleting the lines it already asked about:

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

Mark each one `covered` or not in report section 3. For each one not covered, and anything broken, send a follow-up in your own words, one problem per message. When the last one is done: time (T2) in the report, `/usage` and `/context` into Appendix A at the end of `report.md` (block `## T2`; `/context` gives `context_end_pct`).

**Save the approved plan** (Baseline): if the runner wrote it to a file during this run, keep a copy:

```bash
P=$(find "$COPILOT_HOME/session-state" -name "plan.md" -newer "$RUN/report.md" 2>/dev/null | head -1 || true)   # written during this run
[ -n "$P" ] && cp "$P" "$RUN/plan.md" && echo "saved $P" || echo "no plan file: the plan is in the session log"
```

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --resume <session id> --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps --dynamic-retrieval skills=off)` and send it there (note it in section 8):

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

**Step 10. Save everything** (terminal 2, before the next reset):

```bash
T1=2026-10-20T14:05            # ← your T1 from the report (time of the first "done")
cp -R "$BENCH_DIR/run-output/." "$RUN/"
python3 "$SB/scripts/session-usage.py" "$COPILOT_HOME/session-state" \
  --t1 "$T1" --copy-to "$RUN" --out "$RUN/tokens.md"
mkdir -p "$RUN/workspace-root"
find "$BENCH_DIR" -mindepth 1 -maxdepth 1 | while read -r f; do
  case "$(basename "$f")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs | run-output | .claude | .specify | .aidlc | .github | .gitignore) ;;
  *) cp -R "$f" "$RUN/workspace-root/" ;; esac
done
rmdir "$RUN/workspace-root" 2>/dev/null || true
ls -la "$RUN"
```

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `S-CP-01` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 6. Run L-CP-01: large task: age-restricted products, Copilot

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/copilot/baseline/`. Not verified (see part 4). Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/baseline"
export COPILOT_HOME="$ENV_DIR/copilot" B="$SB/scripts/bench.sh"
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$SB/copilot-rules"   # the team rules file for Copilot CLI
export RUN="$SB/runs/large-age-restriction/copilot/baseline"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset baseline-v1 && $B start && sleep 60 && $B health      # all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CP-01|' -e 's|^method:.*|method: baseline|' -e 's|^runner:.*|runner: copilot|' \
  -e 's|^model:.*|model: gpt-5.6-terra|' -e 's|^start_tag:.*|start_tag: baseline-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2): the block in part 4.8. Expected output as listed there.

**Step 4. Start the agent** (terminal 1), a new session (never `--resume` or `--continue`):

```bash
(
grep -l "^cwd: $BENCH_DIR$" "$COPILOT_HOME"/session-state/*/workspace.yaml 2>/dev/null | while read -r w; do rm -rf "$(dirname "$w")"; done   # earlier sessions of this workspace
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" \
  --no-auto-update \
  --model gpt-5.6-terra \
  --reasoning-effort medium \
  --plan \
  --allow-all \
  --disable-builtin-mcps \
  --dynamic-retrieval skills=off
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows GPT-5.6 Terra, effort medium; the mode indicator shows plan mode. If not: `/exit`, reset, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| asks questions | answers from the tables (more: birthday, guests, PII) |
| shows a plan while its questions are still open | **Suggest changes**, answer, wait |
| shows the final plan | **Accept plan and continue in Interactive execution mode** (1 method step; never an Autopilot option). If the mode indicator still shows plan mode: Shift+Tab to the normal interactive mode (not autopilot), then `Approved, continue.` to permit implementation (same method step) |
| stops again only to ask permission | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; copy the answer text, one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

**Step 7. First "done" (T1).** Write the time (T1) in the report, run `/usage` (AI credits) and paste its output into **Appendix A at the end of `report.md`** (block `## T1`). Then send this, after deleting the lines it already asked about:

```text
Don't change any code, just answer: was each of these handled, and where?
1. Existing customers with no birthday: what happens when they try to buy a restricted product?
2. Existing products: are they restricted after the change?
3. Is a data migration or backfill needed?
4. A guest (not signed in): can they buy a restricted product?
5. Are restricted products visible in lists, search, discounts and banners?
6. Emails that recommend products: are restricted products excluded for customers who aren't eligible?
7. Do the terms or the privacy policy need any change?
8. Age boundary: a customer who turns the age today, which time zone, and someone born on 29 February?
9. Who can see the birthday (APIs, webhooks, exports, staff roles), and are changes and staff reads logged?
```

Mark each one `covered` or not in report section 3. For each one not covered, and anything broken, send a follow-up in your own words, one problem per message. When the last one is done: time (T2) in the report, `/usage` and `/context` into Appendix A at the end of `report.md` (block `## T2`; `/context` gives `context_end_pct`).

**Save the approved plan** (Baseline): if the runner wrote it to a file during this run, keep a copy:

```bash
P=$(find "$COPILOT_HOME/session-state" -name "plan.md" -newer "$RUN/report.md" 2>/dev/null | head -1 || true)   # written during this run
[ -n "$P" ] && cp "$P" "$RUN/plan.md" && echo "saved $P" || echo "no plan file: the plan is in the session log"
```

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --resume <session id> --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps --dynamic-retrieval skills=off)` and send it there (note it in section 8):

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

**Step 10. Save everything** (terminal 2, before the next reset):

```bash
T1=2026-10-20T14:05            # ← your T1 from the report (time of the first "done")
cp -R "$BENCH_DIR/run-output/." "$RUN/"
python3 "$SB/scripts/session-usage.py" "$COPILOT_HOME/session-state" \
  --t1 "$T1" --copy-to "$RUN" --out "$RUN/tokens.md"
mkdir -p "$RUN/workspace-root"
find "$BENCH_DIR" -mindepth 1 -maxdepth 1 | while read -r f; do
  case "$(basename "$f")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs | run-output | .claude | .specify | .aidlc | .github | .gitignore) ;;
  *) cp -R "$f" "$RUN/workspace-root/" ;; esac
done
rmdir "$RUN/workspace-root" 2>/dev/null || true
ls -la "$RUN"
```

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `L-CP-01` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

