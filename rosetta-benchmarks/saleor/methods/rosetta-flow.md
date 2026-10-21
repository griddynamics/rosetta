# Rosetta

Runs: `S-CC-06` (small, Claude Code) · `L-CC-06` (large, Claude Code) · `S-CP-06` (small, Copilot) · `L-CP-06` (large, Copilot). Everything for this method is in this file: setup, then each run step by step. Rules: [BENCHMARKS.md](../../BENCHMARKS.md).

## The method's commands

| Command / skill | When | Official doc |
| --- | --- | --- |
| `/init-workspace-flow` | **once**, before the first run (part 1.7); its cost is reported separately and never added to a run | docs/web/user-guide/scenarios/ (init workspace); plugins/core-claude*/workflows/init-workspace-flow.md |
| `/coding-flow <task>` | T0 | docs/web/user-guide/scenarios/coding.md:8 |
| `Yes, I reviewed the design` · `Yes, I reviewed the plan` · `Yes, I approve the implementation` | its 3 gates: only these exact phrases count | plugins/core-claude/workflows/coding-flow.md:66,95,137 |

**T0 message, small task** (copy as is):

```text
/coding-flow Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**T0 message, large task** (copy as is):

```text
/coding-flow Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

Every other reply is written out in each run below (parts 2, 3, 5, 6).

## 1. Setup for Claude Code (once)

Open a terminal **inside your rosetta checkout**. Skip this part if `git -C ~/saleor-benchmark/saleor tag -l rosetta-v1` already prints the tag.

**1.1 Machine** (once per machine, shared by all methods): Node 24 with Claude Code in it, and the Saleor stack.

```bash
nvm install 24 && nvm alias default 24 && nvm use 24
command -v claude || npm install -g @anthropic-ai/claude-code@2.1.305
claude --version                                   # 2.1.305 (all runs use this version)
git -C ~/saleor-benchmark/saleor tag -l baseline-v1   # prints baseline-v1 once the zip is extracted (1.2a); do not run a plain bench.sh setup first, it would clone the repos
```

**1.2 Variables** (paste into every new terminal you use for this method):

```bash
export BENCH_DIR="$HOME/saleor-benchmark"
export ENV_DIR="$BENCH_DIR/envs/rosetta"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude"
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor" B="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor/scripts/bench.sh"   # inside your rosetta checkout
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**1.2a Start from the zip** (all Rosetta work starts here, before anything else touches `$BENCH_DIR`; the repos are never cloned. Only the person creating the zip skips this: they do 1.1, run `bench.sh setup` once and then 1.7). `test-library/saleor-initialized.zip` holds the entire `.git` of the three repos at the pinned versions (tag `baseline-v1`, and the init commit tagged `rosetta-v1`, `rosetta-light-v1` and `rosetta-skills-v1`) plus the workspace-root files the init wrote. It is the same for Rosetta, Rosetta Light and Rosetta Skills.

```bash
nvm use 24
TL="$(git rev-parse --show-toplevel)/test-library"
[ -f "$TL/saleor-initialized.zip" ] || echo "ERROR: $TL/saleor-initialized.zip not found: pull it, or create it (1.7)"
rm -rf "$BENCH_DIR/saleor" "$BENCH_DIR/saleor-dashboard" "$BENCH_DIR/react-storefront"   # cleanup first: no old clone survives
unzip -q "$TL/saleor-initialized.zip" -d "$BENCH_DIR"
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" reset -q --hard HEAD; done      # the zip has only .git: rebuild the working trees from it
rm -rf "$ENV_DIR/root" && mkdir -p "$ENV_DIR/root"                                       # the workspace-root files, copied back after every reset
find "$BENCH_DIR" -mindepth 1 -maxdepth 1 | while read -r f; do
  case "$(basename "$f")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs | run-output | .claude | .gitignore) ;;
  *) cp -R "$f" "$ENV_DIR/root/" ;; esac
done
$B setup        # sees baseline-v1 in the extracted repos, so it does not clone: builds Docker, seeds the database, installs dependencies
for r in saleor saleor-dashboard react-storefront; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; done   # rosetta-v1 rosetta-light-v1 rosetta-skills-v1 in all three
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
  "enabledPlugins": {
    "cc-plugin-plugin-authoring@builtin": false,
    "cc-plugin-sec-default@builtin": false,
    "cc-plugin-telemetry@builtin": false
  },
  "env": { "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_CLAUDEAI_MCP_SERVERS": "false" }
}
JSON
```

**1.4 Install Rosetta** (pinned version):

```bash
[ -d "$ENV_DIR/src/.git" ] || git clone -q --branch v3.1.17 https://github.com/griddynamics/rosetta "$ENV_DIR/src"
claude plugin marketplace add "$ENV_DIR/src"
claude plugin install rosetta@rosetta
claude plugin list                                             # rosetta@rosetta 3.1.17 only
```

**1.5 Tag**: nothing to do. The method tag `rosetta-v1` comes with the zip, on the init commit (1.2a). Never re-tag it to `baseline-v1`: that would remove the init.

**1.6 Log in once** (a new config dir has no login):

```bash
(
cd "$BENCH_DIR" && claude
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/login` with your work account, then `/exit`.

**1.7 One-time project preparation: `/init-workspace-flow`** (once per method, after 1.6; it sets up the project context for every run of this method). Its cost is a one-time setup cost: record it in part 7 and never add it to any run. Skip this part if `test-library/saleor-initialized.zip` exists: you already started from it (1.2a), so never run the init again (about 30 minutes).

```bash
# terminal 1: start from a clean workspace on baseline-v1 (same variables as 1.2)
nvm use 24
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" checkout -q -f baseline-v1; done
mkdir -p "$ENV_DIR/root"
(
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)
```

In the session: send `/init-workspace-flow`. Answer its questions as product owner, one message per round; reply `Approved, continue.` to any "shall I continue?". Write the start and end time. When it is done: run `/cost` and `/usage` and paste both into part 7; do not `/exit` before that.

Then (terminal 2), still before any run:

```bash
T_INIT_END=$(date +%Y-%m-%dT%H:%M)
python3 "$SB/scripts/session-usage.py" "$CLAUDE_CONFIG_DIR/projects/$(echo "$BENCH_DIR" | tr / -)" --out "$ENV_DIR/init-tokens.md"   # per model / agent / subagent
# files the init wrote inside the repos: commit them and move the method tag onto that commit
for r in saleor saleor-dashboard react-storefront; do
  git -C "$BENCH_DIR/$r" status --porcelain
  git -C "$BENCH_DIR/$r" add -A
  git -C "$BENCH_DIR/$r" -c user.name="saleor-benchmark" -c user.email="saleor-benchmark@localhost" commit -q -m "rosetta-flow: init-workspace-flow" || echo "$r: nothing to commit"
  for t in rosetta-v1 rosetta-light-v1 rosetta-skills-v1; do git -C "$BENCH_DIR/$r" tag -f "$t"; done   # one init commit, one tag per Rosetta method
done
# files the init wrote in the workspace root (outside the repos): saved, and copied back after every reset
find "$BENCH_DIR" -mindepth 1 -maxdepth 1 | while read -r f; do
  case "$(basename "$f")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs | run-output | .claude | .gitignore) ;;
  *) cp -R "$f" "$ENV_DIR/root/" ;; esac
done
ls -la "$ENV_DIR/root"
```

Then `/exit`. `bench.sh reset rosetta-v1` now returns the repos to the init commit, and step 2 of each run copies `$ENV_DIR/root` back into the workspace root. Keep `init-tokens.md` and copy it to `rosetta-benchmarks/saleor/methods/rosetta-flow.init-tokens.md` so it is committed with the results. Every run of this method then starts from the same prepared project.

Then save the result as the zip (terminal 2). It holds the entire `.git` of the three repos (the init commit carries all three Rosetta method tags, set above) and the workspace-root files. It does not hold the working trees, installed dependencies, caches or build output: `git reset --hard` rebuilds the trees from `.git` on extraction (1.2a). One zip serves Rosetta, Rosetta Light and Rosetta Skills; the init is run once, with the full `rosetta` plugin. Maximum compression, zip only (`-9`, deflate: the macOS `zip` has no bzip2 build):

```bash
TL="$(git rev-parse --show-toplevel)/test-library"
rm -f "$TL/saleor-initialized.zip"
(cd "$BENCH_DIR" && for r in saleor saleor-dashboard react-storefront; do git -C "$r" status --porcelain; find "$r/.git"; done | zip -9 -y -X -q -@ "$TL/saleor-initialized.zip")   # status lines must be empty: everything committed
(cd "$ENV_DIR/root" && find . ! -name .DS_Store ! -name . | sed 's|^\./||' | zip -9 -y -X -q -@ "$TL/saleor-initialized.zip")   # workspace-root files go to the top level of the zip
ls -lh "$TL/saleor-initialized.zip" && unzip -tq "$TL/saleor-initialized.zip" | tail -1   # GitHub rejects files over 100 MB
```

Commit the zip with the results. Every later start uses it (1.2a).

## 2. Run S-CC-06: small task: product storage conditions, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/claude-code/rosetta-flow/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/rosetta"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/small-storage-conditions/claude-code/rosetta-flow"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset rosetta-v1 && cp -R "$ENV_DIR/root/." "$BENCH_DIR/" && $B start && sleep 60 && $B health      # reset to the init commit, restore the init files, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CC-06|' -e 's|^method:.*|method: rosetta|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: rosetta-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2):

```bash
{ claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" 2>/dev/null || echo "(no skills dir)"
  for r in saleor saleor-dashboard react-storefront; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; git -C "$BENCH_DIR/$r" status --porcelain; done
} 2>&1 | tee "$RUN/isolation.txt"
```

Expected: only `rosetta@rosetta`; no MCP servers; `rosetta-v1` among each repo's tags; no `status` lines. Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code and, if `claude` runs in an IDE terminal, 2 `mcp__ide__*` tools: that is not a leak.

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu shows `coding-flow`; `/hooks` shows the Rosetta SessionStart hooks; its first answer says `Context loaded using Rosetta`. If not: `/exit`, reset, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/coding-flow Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables |
| design gate | `Yes, I reviewed the design` |
| plan gate | `Yes, I reviewed the plan` |
| implementation gate | `Yes, I approve the implementation` |
| any other "shall I continue?" | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; copy the answer text, one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

**Step 7. First "done" (T1).** Write the time (T1) in the report, run `/cost` and `/usage` and paste both outputs into **Appendix A at the end of `report.md`** (block `## T1`). Then send this, after deleting the lines it already asked about:

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

Mark each one `covered` or not in report section 3. For each one not covered, and anything broken, send a follow-up in your own words, one problem per message. When the last one is done: time (T2) in the report, `/cost`, `/usage` and `/context` into Appendix A at the end of `report.md` (block `## T2`; `/context` gives `context_end_pct`).

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/cost` numbers, counts) and set `S-CC-06` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 3. Run L-CC-06: large task: age-restricted products, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/claude-code/rosetta/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/rosetta"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/large-age-restriction/claude-code/rosetta"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset rosetta-v1 && cp -R "$ENV_DIR/root/." "$BENCH_DIR/" && $B start && sleep 60 && $B health      # reset to the init commit, restore the init files, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CC-06|' -e 's|^method:.*|method: rosetta|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: rosetta-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2):

```bash
{ claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" 2>/dev/null || echo "(no skills dir)"
  for r in saleor saleor-dashboard react-storefront; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; git -C "$BENCH_DIR/$r" status --porcelain; done
} 2>&1 | tee "$RUN/isolation.txt"
```

Expected: only `rosetta@rosetta`; no MCP servers; `rosetta-v1` among each repo's tags; no `status` lines. Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code and, if `claude` runs in an IDE terminal, 2 `mcp__ide__*` tools: that is not a leak.

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu shows `coding-flow`; `/hooks` shows the Rosetta SessionStart hooks; its first answer says `Context loaded using Rosetta`. If not: `/exit`, reset, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/coding-flow Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables, + major-decision questions ("LARGE = MEDIUM + any major decisions", skills/hitl/SKILL.md:41) |
| design gate | `Yes, I reviewed the design` |
| plan gate | `Yes, I reviewed the plan` |
| implementation gate | `Yes, I approve the implementation` |
| any other "shall I continue?" | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; copy the answer text, one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

**Step 7. First "done" (T1).** Write the time (T1) in the report, run `/cost` and `/usage` and paste both outputs into **Appendix A at the end of `report.md`** (block `## T1`). Then send this, after deleting the lines it already asked about:

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

Mark each one `covered` or not in report section 3. For each one not covered, and anything broken, send a follow-up in your own words, one problem per message. When the last one is done: time (T2) in the report, `/cost`, `/usage` and `/context` into Appendix A at the end of `report.md` (block `## T2`; `/context` gives `context_end_pct`).

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/cost` numbers, counts) and set `L-CC-06` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 4. Setup for Copilot (once)

> ⛔ **Not runnable yet:** Copilot runs need a Copilot seat with GPT-5.6 Terra; the current account has Copilot Free. These steps follow the method's docs and are **not verified**.

**Install and use:** VS Code settings: add `$HOME/saleor-benchmark/envs/rosetta/src` to `chat.plugins.marketplaces` → Copilot chat gear → **Browse Marketplaces** → install `rosetta`. Then the same `/coding-flow` and gate phrases.

VS Code profile with only the two Copilot extensions:

```bash
code --profile bench-rosetta --install-extension GitHub.copilot --install-extension GitHub.copilot-chat
code --profile bench-rosetta --list-extensions     # only these two
```

In that profile: Settings → permissions **Allow all** (`chat.permissions.default`), model picker **GPT-5.6 Terra** (not Auto), Copilot memory off. Tag:

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$HOME/saleor-benchmark/$r" tag -l rosetta-v1; done   # comes with the zip (1.2a); do not re-tag
```

One-time preparation for Copilot: as in 1.7, send `/init-workspace-flow` in a new Agent chat of the same profile, then commit the init changes in the three repos and put the three Rosetta method tags on that commit. Usage = the session's premium-request counter; record it in part 7.

## 5. Run S-CP-06: small task: product storage conditions, Copilot

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/copilot/rosetta-flow/`. Not verified (see part 4).

1. Reset as in the Claude Code run, step 2 (with `$RUN` set to this folder).
2. Open the workspace: `code --profile bench-rosetta "$HOME/saleor-benchmark"`, new chat, **Agent** mode, model GPT-5.6 Terra.
3. Send the task (T0):

   ```text
   /coding-flow Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
   Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.
   
   Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
   ```

4. At each stop reply exactly as in the Claude Code run of this task (part 2, step 6).
5. T1, hidden-question check, follow-ups, T2, check the result, post-implementation prompt: as in part 2, steps 7–9. Usage = the session's premium-request counter instead of `/cost`.
6. Save: copy `~/saleor-benchmark/run-output/` into the run folder (no `session-usage.py` for Copilot).

## 6. Run L-CP-06: large task: age-restricted products, Copilot

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/copilot/rosetta-flow/`. Not verified (see part 4).

1. Reset as in the Claude Code run, step 2 (with `$RUN` set to this folder).
2. Open the workspace: `code --profile bench-rosetta "$HOME/saleor-benchmark"`, new chat, **Agent** mode, model GPT-5.6 Terra.
3. Send the task (T0):

   ```text
   /coding-flow Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
   Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
   To make this work, the customer profile should have a birthday field.
   
   Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
   ```

4. At each stop reply exactly as in the Claude Code run of this task (part 3, step 6).
5. T1, hidden-question check, follow-ups, T2, check the result, post-implementation prompt: as in part 3, steps 7–9. Usage = the session's premium-request counter instead of `/cost`.
6. Save: copy `~/saleor-benchmark/run-output/` into the run folder (no `session-usage.py` for Copilot).

## 7. One-time setup cost: `/init-workspace-flow` (reported separately, not added to any run)

| Runner | Start | End | Operator | Notes |
| --- | --- | --- | --- | --- |
| Claude Code | | | | One init for all Rosetta methods (shared zip): its cost is recorded in `rosetta-skills.md` part 7 (about 1 h, 52 min wall time, $31.20). Not repeated here. |
| Copilot | | | | |

Claude Code, paste raw (`/cost`, then `/usage`; per-agent tokens are in `rosetta-flow.init-tokens.md`):

```text
```

Zip `test-library/saleor-initialized.zip` (size, commit that added it):

```text
```

Copilot, premium-request counter at the end of the init session:

```text
```
