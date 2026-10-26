# Superpowers

Runs: `S-CC-03` (small, Claude Code) · `L-CC-03` (large, Claude Code) · `S-CP-03` (small, Copilot) · `L-CP-03` (large, Copilot). Everything for this method is in this file: setup, then each run step by step. Rules: [BENCHMARKS.md](../../BENCHMARKS.md).

## The method's commands

| Command / skill | When | Official doc |
| --- | --- | --- |
| `/superpowers:brainstorming <task>` | T0: starts the method explicitly, so every run starts the same way (team decision, for repeatable results) | RELEASE-NOTES.md:300 ("Invoke `superpowers:brainstorming` … directly") |
| skill `brainstorming` (auto) | first: questions, design or spec | README.md:309 |
| skill `writing-plans` (auto) | large task: plan, then asks for the execution approach | skills/writing-plans/SKILL.md:189-194 |
| skill `subagent-driven-development` (auto) | coding, one subagent per task | skills/subagent-driven-development/SKILL.md:8 |

**T0 message, small task** (copy as is):

```text
/superpowers:brainstorming Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**T0 message, large task** (copy as is):

```text
/superpowers:brainstorming Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

Every other reply is written out in each run below (parts 2, 3, 5, 6).

## 1. Setup for Claude Code (once)

Open a terminal **inside your rosetta checkout**. Skip this part if `git -C ~/saleor-benchmark/saleor tag -l superpowers-v1` already prints the tag.

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
export ENV_DIR="$BENCH_DIR/envs/superpowers"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude"
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor" B="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor/scripts/bench.sh"   # inside your rosetta checkout
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**1.3 Own config dir with the common settings** (claude.ai sync off, hooks on; BENCHMARKS.md, section 3.5):

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
  "enabledPlugins": {
    "cc-plugin-plugin-authoring@builtin": false,
    "cc-plugin-sec-default@builtin": false,
    "cc-plugin-telemetry@builtin": false
  },
  "env": { "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_CLAUDEAI_MCP_SERVERS": "false", "CLAUDE_CODE_AUTO_CONNECT_IDE": "false" }
}
JSON
```

**1.4 Install Superpowers** (pinned version):

```bash
[ -d "$ENV_DIR/src/.git" ] || git clone -q --branch v6.4.2 https://github.com/obra/superpowers "$ENV_DIR/src"
claude plugin marketplace add "$ENV_DIR/src"
claude plugin install superpowers@superpowers-dev
claude plugin list                                             # superpowers@superpowers-dev 6.4.2 only
```

**1.5 Tag** (the method lives outside the repos, so the tag is the same commit as `baseline-v1`):

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f superpowers-v1 baseline-v1; done
```

**1.6 Log in once** (a new config dir has no login):

```bash
(
cd "$BENCH_DIR" && claude
)                                               # in a subshell: your terminal stays where it is
```

In the session: accept the folder-trust prompt, `/login` with your work account, then `/exit`.

**1.7 Check that it triggers** (once; the check from its README: "start a fresh session and send `Let's make a react todo list` — a working install auto-triggers `brainstorming` before any code is written"):

```bash
(
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

Send this; it must answer with "Using brainstorming …" and a question, not code. Then `/exit` (step 4 of every run deletes this session):

```text
Let's make a react todo list
```

## 2. Run S-CC-03: small task: product storage conditions, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/claude-code/superpowers/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/superpowers"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/small-storage-conditions/claude-code/superpowers"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f superpowers-v1 baseline-v1 >/dev/null; done   # method tag = current baseline-v1
$B reset superpowers-v1 && $B start && sleep 60 && $B health      # all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CC-03|' -e 's|^method:.*|method: superpowers|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: superpowers-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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

Expected: only `superpowers@superpowers-dev`; no MCP servers; `superpowers-v1` among each repo's tags; no `status` lines. `CLAUDE_CONFIG_DIR` is `envs/superpowers/claude`; Claude Code 2.1.305 and Node v24; the settings from part 1.3; no `user-level:` lines; in the session, `/hooks` shows only the method's hooks. Rules file: `= baseline rules` for both files in every repo, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`, plus the method's own files at its tag (if its setup changed a rules file, `DIFFERS` is expected: note it in the report). Claude Code sandbox: `"sandbox": { "enabled": false }` and no `managed settings present` line; in the session, `/sandbox` shows sandboxing off (a managed or org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code: that is not a leak. It must list no `mcp__ide__*` tools (standalone terminal, BENCHMARKS.md section 2).

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu shows `superpowers:brainstorming`; `/hooks` shows its SessionStart hook. After T0 its first answer says "Using brainstorming …". If not: `/exit`, reset, start again.

**When the checks pass: `/exit`, then start `claude` again WITHOUT the cleanup lines** (`find … rm -rf` and `rm -rf "$BENCH_DIR/run-output"` run only in the first start; running them again would delete the logs of this run): `(cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5)`. This is a NEW session (never `--continue`): its purpose is a clean context, with none of the checks in it. Send the task as the first message of that second session. Do not send the task before this restart.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/superpowers:brainstorming Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables |
| short design in the chat, waits for yes | `Approved, continue.` |
| "Spec written and committed … Please review it" | `Approved, continue.` (if it chose architectural) |
| "Please review the plan. Which execution approach …?" | `Approved. Subagent-driven.` (architectural only) |
| "Would you like me to set up an isolated worktree?" | `No, work in place.` |
| tests fail before it starts: proceed? | `Proceed.` |
| "Implementation complete. What would you like to do?" | `3. Keep the branch as-is.` |
| permission to start / continue | `Approved, continue.` |

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

**Follow-ups in Superpowers:** a follow-up ("do what you missed: …") makes it run its workflow again (design → plan → implementation). Your message counts as a **follow-up**; your replies inside that rework (`Approved, continue.`, `Approved. Subagent-driven.`, …) are **method steps**, from the table in step 6. Its time and tokens count as rework (after T1).

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && claude --resume <session id> --permission-mode bypassPermissions --model claude-sonnet-5-5)` and send it there (note it in section 8):

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff superpowers-v1`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

Superpowers may commit by design, so the diff is taken against `superpowers-v1`. Committing is not a red flag for it.

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `S-CC-03` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 3. Run L-CC-03: large task: age-restricted products, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/claude-code/superpowers/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/superpowers"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/large-age-restriction/claude-code/superpowers"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f superpowers-v1 baseline-v1 >/dev/null; done   # method tag = current baseline-v1
$B reset superpowers-v1 && $B start && sleep 60 && $B health      # all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CC-03|' -e 's|^method:.*|method: superpowers|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: superpowers-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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

Expected: only `superpowers@superpowers-dev`; no MCP servers; `superpowers-v1` among each repo's tags; no `status` lines. `CLAUDE_CONFIG_DIR` is `envs/superpowers/claude`; Claude Code 2.1.305 and Node v24; the settings from part 1.3; no `user-level:` lines; in the session, `/hooks` shows only the method's hooks. Rules file: `= baseline rules` for both files in every repo, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`, plus the method's own files at its tag (if its setup changed a rules file, `DIFFERS` is expected: note it in the report). Claude Code sandbox: `"sandbox": { "enabled": false }` and no `managed settings present` line; in the session, `/sandbox` shows sandboxing off (a managed or org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code: that is not a leak. It must list no `mcp__ide__*` tools (standalone terminal, BENCHMARKS.md section 2).

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu shows `superpowers:brainstorming`; `/hooks` shows its SessionStart hook. After T0 its first answer says "Using brainstorming …". If not: `/exit`, reset, start again.

**When the checks pass: `/exit`, then start `claude` again WITHOUT the cleanup lines** (`find … rm -rf` and `rm -rf "$BENCH_DIR/run-output"` run only in the first start; running them again would delete the logs of this run): `(cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5)`. This is a NEW session (never `--continue`): its purpose is a clean context, with none of the checks in it. Send the task as the first message of that second session. Do not send the task before this restart.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/superpowers:brainstorming Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables (one at a time) |
| short design in the chat, waits for yes | `Approved, continue.` (if it chose bounded) |
| "Spec written and committed … Please review it" | `Approved, continue.` |
| "Please review the plan. Which execution approach …?" | `Approved. Subagent-driven.` |
| "Would you like me to set up an isolated worktree?" | `No, work in place.` |
| tests fail before it starts: proceed? | `Proceed.` |
| "Implementation complete. What would you like to do?" | `3. Keep the branch as-is.` |
| permission to start / continue | `Approved, continue.` |

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

**Follow-ups in Superpowers:** a follow-up ("do what you missed: …") makes it run its workflow again (design → plan → implementation). Your message counts as a **follow-up**; your replies inside that rework (`Approved, continue.`, `Approved. Subagent-driven.`, …) are **method steps**, from the table in step 6. Its time and tokens count as rework (after T1).

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && claude --resume <session id> --permission-mode bypassPermissions --model claude-sonnet-5-5)` and send it there (note it in section 8):

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff superpowers-v1`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

Superpowers may commit by design, so the diff is taken against `superpowers-v1`. Committing is not a red flag for it.

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `L-CC-03` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 4. Setup for Copilot CLI (once)

> ⚠️ **Not verified yet:** these steps follow the method's docs and Copilot CLI 1.0.101's own help, not a real run.

**Install and use:** its README supports Copilot CLI as a plugin (`copilot plugin marketplace add obra/superpowers-marketplace`, `copilot plugin install superpowers@superpowers-marketplace`). To pin v6.4.2, the same plugin is installed from the pinned clone of part 1.4, as for Claude Code. Its skills and session-start hook must load. Then the same commands as Claude Code.

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
export ENV_DIR="$BENCH_DIR/envs/superpowers"
export COPILOT_HOME="$ENV_DIR/copilot"
export COPILOT_AUTO_UPDATE=false   # every copilot command runs the installed 1.0.101, never a newer cached package
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
copilot config ignoredSkillsLocations "$HOME/.agents/skills"   # skill folders outside COPILOT_HOME that Copilot reads anyway: skip them
copilot config ignoredSkillsLocations "$HOME/.claude/skills"
copilot config ignoredSkillsLocations "$HOME/.github/skills"
python3 -I - "$COPILOT_HOME/settings.json" <<'PY'   # built-in subagents use the session's model and effort; rubber-duck (another model family) off
import json, os, sys
p = sys.argv[1]; s = json.load(open(p)) if os.path.exists(p) else {}
sub = s.setdefault("subagents", {})
for a in ("explore", "task", "general-purpose", "code-review", "research", "security-review"):
    sub.setdefault("agents", {})[a] = {"model": "inherit", "effortLevel": "inherit", "contextTier": "inherit"}
sub["disabledSubagents"] = sorted(set(sub.get("disabledSubagents", [])) | {"rubber-duck"})
json.dump(s, open(p, "w"), indent=2)
PY
copilot config --list
```

`autoUpdate=false`, `COPILOT_AUTO_UPDATE=false` (4.2) and `--no-auto-update` (in every session start) do different jobs: the setting stops new downloads; the variable and the flag make the CLI run its installed version, never a newer package from the shared cache (`~/Library/Caches/copilot/pkg`); the variable also covers the setup and check commands.

Hooks and skills stay on: the method's own hooks and skills must load. Never set `disableAllHooks` or `--dynamic-retrieval skills=off` in this home.

**4.4 Install Superpowers** (pinned version, the clone from part 1.4):

```bash
[ -d "$ENV_DIR/src/.git" ] || git clone -q --branch v6.4.2 https://github.com/obra/superpowers "$ENV_DIR/src"
copilot plugin marketplace add "$ENV_DIR/src"                 # local marketplace "superpowers-dev" (.claude-plugin/marketplace.json)
copilot plugin install superpowers@superpowers-dev
copilot plugin list                                           # superpowers@superpowers-dev (v6.4.2) enabled; built-in browser-use disabled
```

Copilot CLI reads a local marketplace plugin live from `$ENV_DIR/src` and copies nothing: keep that clone at the pinned tag and never edit it during the study.

**4.5 Tag** (the method lives outside the repos, so the tag is the same commit as `baseline-v1`):

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f superpowers-v1 baseline-v1; done
```

**4.6 Log in and trust the workspace once** (a new `COPILOT_HOME` has no saved account and no trusted folders; the login token itself goes to the macOS Keychain):

```bash
copilot login
(
cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --no-auto-update
)                                               # in a subshell: your terminal stays where it is
```

In the session: accept the folder-trust prompt with **Yes, and remember this folder for future sessions**, then `/exit`.

**4.7 Check that it triggers** (once, as in 1.7): start a fresh session as in step 4 of a run and send `Let's make a react todo list`; it must answer with "Using brainstorming …" and a question, not code. Then `/exit`.

**4.8 Isolation check** (before every run, step 3; `$RUN` = that run's folder):

```bash
{ echo "COPILOT_HOME=$COPILOT_HOME"; copilot --version; node -v; copilot config --list
  python3 -I -c 'import json,os;print("subagents:", json.dumps(json.load(open(os.environ["COPILOT_HOME"]+"/settings.json")).get("subagents")))'
  copilot -C "$BENCH_DIR" plugin list; copilot -C "$BENCH_DIR" skill list; copilot -C "$BENCH_DIR" mcp list; copilot -C "$BENCH_DIR" instruction list
  copilot config hooks 2>/dev/null || echo "(no inline hooks)"
  echo "sandbox.enabled=$(copilot config sandbox.enabled)"
  env | grep -qE '^(COPILOT_GITHUB_TOKEN|GH_TOKEN|GITHUB_TOKEN)=' && echo "token env set: unset it (it overrides the saved login)"
  for p in "$COPILOT_HOME"/copilot-instructions.md "$COPILOT_HOME"/instructions "$COPILOT_HOME"/agents "$COPILOT_HOME"/hooks "$COPILOT_HOME"/skills "$COPILOT_HOME"/mcp-config.json "$COPILOT_HOME"/lsp-config.json; do [ -e "$p" ] && echo "user-level: $p"; done
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

Expected: `COPILOT_HOME` = `envs/superpowers/copilot`; version 1.0.101 and Node v24; the common settings, with `ignoredSkillsLocations` set to `~/.agents/skills`, `~/.claude/skills` and `~/.github/skills`, and `skill list` has no "Inherited skills" section; `subagents:` shows `explore`, `task`, `general-purpose`, `code-review`, `research` and `security-review` with `model`, `effortLevel` and `contextTier` set to `inherit`, and `disabledSubagents` = `["rubber-duck"]`; in the session, `/subagents` shows "Inherit session model" for those six; `plugin list` shows `superpowers` only; `skill list` shows its skills and the CLI's built-in ones only; `instruction list` shows only `team-rules.instructions.md [external]` (the team rules file, from `saleor/copilot-rules/`); no MCP servers (the CLI's built-in GitHub servers are not listed here; `--disable-builtin-mcps` turns them off in the session, and `/env` there must show none); no inline hooks; no `user-level:` lines; no `token env set` line; `superpowers-v1` among each repo's tags; no `status` lines. Rules file: `= baseline rules` for both files in every repo and for `copilot-rules`, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`, plus the method's own files at its tag (if its setup changed a rules file, `DIFFERS` is expected: note it in the report). Copilot sandbox: `sandbox.enabled=false`; in the session, `/sandbox` shows sandboxing off (an org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1.

## 5. Run S-CP-03: small task: product storage conditions, Copilot

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/copilot/superpowers/`. Not verified (see part 4). Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/superpowers"
export COPILOT_HOME="$ENV_DIR/copilot" B="$SB/scripts/bench.sh" COPILOT_AUTO_UPDATE=false   # no newer cached CLI package
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$SB/copilot-rules"   # the team rules file for Copilot CLI
export RUN="$SB/runs/small-storage-conditions/copilot/superpowers"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f superpowers-v1 baseline-v1 >/dev/null; done   # method tag = current baseline-v1
$B reset superpowers-v1 && $B start && sleep 60 && $B health      # all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CP-03|' -e 's|^method:.*|method: superpowers|' -e 's|^runner:.*|runner: copilot|' \
  -e 's|^model:.*|model: gpt-5.6-terra|' -e 's|^start_tag:.*|start_tag: superpowers-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2): the block in part 4.8. Expected output as listed there.

**Step 4. Start the agent** (terminal 1), a new session (never `--resume` or `--continue`):

```bash
(
grep -l "^cwd: $BENCH_DIR$" "$COPILOT_HOME"/session-state/*/workspace.yaml 2>/dev/null | while read -r w; do rm -rf "$(dirname "$w")"; done   # earlier sessions of this workspace
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows GPT-5.6 Terra, effort medium; the normal interactive mode (not plan, not autopilot). If not: `/exit`, reset, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/superpowers:brainstorming Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables |
| short design in the chat, waits for yes | `Approved, continue.` |
| "Spec written and committed … Please review it" | `Approved, continue.` (if it chose architectural) |
| "Please review the plan. Which execution approach …?" | `Approved. Subagent-driven.` (architectural only) |
| "Would you like me to set up an isolated worktree?" | `No, work in place.` |
| tests fail before it starts: proceed? | `Proceed.` |
| "Implementation complete. What would you like to do?" | `3. Keep the branch as-is.` |
| permission to start / continue | `Approved, continue.` |

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

**Follow-ups in Superpowers:** a follow-up ("do what you missed: …") makes it run its workflow again (design → plan → implementation). Your message counts as a **follow-up**; your replies inside that rework (`Approved, continue.`, `Approved. Subagent-driven.`, …) are **method steps**, from the table in step 6. Its time and tokens count as rework (after T1).

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --resume <session id> --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps)` and send it there (note it in section 8):

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff superpowers-v1`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

Superpowers may commit by design, so the diff is taken against `superpowers-v1`. Committing is not a red flag for it.

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `S-CP-03` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 6. Run L-CP-03: large task: age-restricted products, Copilot

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/copilot/superpowers/`. Not verified (see part 4). Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/superpowers"
export COPILOT_HOME="$ENV_DIR/copilot" B="$SB/scripts/bench.sh" COPILOT_AUTO_UPDATE=false   # no newer cached CLI package
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$SB/copilot-rules"   # the team rules file for Copilot CLI
export RUN="$SB/runs/large-age-restriction/copilot/superpowers"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f superpowers-v1 baseline-v1 >/dev/null; done   # method tag = current baseline-v1
$B reset superpowers-v1 && $B start && sleep 60 && $B health      # all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CP-03|' -e 's|^method:.*|method: superpowers|' -e 's|^runner:.*|runner: copilot|' \
  -e 's|^model:.*|model: gpt-5.6-terra|' -e 's|^start_tag:.*|start_tag: superpowers-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2): the block in part 4.8. Expected output as listed there.

**Step 4. Start the agent** (terminal 1), a new session (never `--resume` or `--continue`):

```bash
(
grep -l "^cwd: $BENCH_DIR$" "$COPILOT_HOME"/session-state/*/workspace.yaml 2>/dev/null | while read -r w; do rm -rf "$(dirname "$w")"; done   # earlier sessions of this workspace
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows GPT-5.6 Terra, effort medium; the normal interactive mode (not plan, not autopilot). If not: `/exit`, reset, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/superpowers:brainstorming Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables (one at a time) |
| short design in the chat, waits for yes | `Approved, continue.` (if it chose bounded) |
| "Spec written and committed … Please review it" | `Approved, continue.` |
| "Please review the plan. Which execution approach …?" | `Approved. Subagent-driven.` |
| "Would you like me to set up an isolated worktree?" | `No, work in place.` |
| tests fail before it starts: proceed? | `Proceed.` |
| "Implementation complete. What would you like to do?" | `3. Keep the branch as-is.` |
| permission to start / continue | `Approved, continue.` |

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

**Follow-ups in Superpowers:** a follow-up ("do what you missed: …") makes it run its workflow again (design → plan → implementation). Your message counts as a **follow-up**; your replies inside that rework (`Approved, continue.`, `Approved. Subagent-driven.`, …) are **method steps**, from the table in step 6. Its time and tokens count as rework (after T1).

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --resume <session id> --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps)` and send it there (note it in section 8):

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff superpowers-v1`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

Superpowers may commit by design, so the diff is taken against `superpowers-v1`. Committing is not a red flag for it.

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `L-CP-03` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

4. At each stop reply exactly as in the Claude Code run of this task (part 3, step 6).
5. T1, hidden-question check, follow-ups, T2, check the result, post-implementation prompt: as in part 3, steps 7–9. Usage = the session's premium-request counter instead of `/cost`.
6. Save: copy `~/saleor-benchmark/run-output/` into the run folder (no `session-usage.py` for Copilot).

## 7. Notes

### Questions the agent asked that are not in the tables

Superpowers' own questions that BENCHMARKS.md, section 4 does not cover (hidden questions and extra answers) and that this file's reply tables do not cover. The operator decided each answer once; if a later run is asked the same, send the same answer. Each row has the run ID where it was first asked. Mark such a question `extra` in the run report.

| # | If it asks this | Answer | First asked in |
| ---: | --- | --- | --- |
| 1 | No question: the agent ends its turn in the middle of the subagent-driven run with a status such as "Still pending: its required scoped re-review, then the storefront implementation, end-to-end validation, and final branch review." and waits at an empty input box (nothing is running) | `Approved, continue.` (a method step, not a follow-up; BENCHMARKS.md section 5, "Method steps") | S-CP-03 |
| 2 | No menu: after saving a new plan, the agent asks in plain chat "Please review the plan and confirm it captures the requested scope; I'll use the previously selected subagent-driven execution method." (it does not ask which execution approach) | `Approved. Subagent-driven.` (the plan-review reply of the reply table; chosen by the operator) | S-CP-03 |
