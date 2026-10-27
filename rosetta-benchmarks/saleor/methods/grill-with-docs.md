# Grill-with-docs

Runs: `S-CC-02` (small, Claude Code) · `L-CC-02` (large, Claude Code) · `S-CP-02` (small, Copilot) · `L-CP-02` (large, Copilot). Everything for this method is in this file: setup, then each run step by step. Rules: [BENCHMARKS.md](../../BENCHMARKS.md).

## The method's commands

| Command / skill | When | Official doc |
| --- | --- | --- |
| `/setup-matt-pocock-skills` | **once**, before the first run (part 1.7); its cost is reported separately and never added to a run | docs/engineering/setup-matt-pocock-skills.md |
| `/grill-with-docs <task>` | T0; it loads the skills `grilling` + `domain-modeling` | docs/engineering/grill-with-docs.md:9,27 |

**T0 message, small task** (copy as is):

```text
/grill-with-docs Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**T0 message, large task** (copy as is):

```text
/grill-with-docs Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

Every other reply is written out in each run below (parts 2, 3, 5, 6).

## 1. Setup for Claude Code (once)

Open a terminal **inside your rosetta checkout**. Skip this part if `git -C ~/saleor-benchmark/saleor tag -l grill-v1` already prints the tag.

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
export ENV_DIR="$BENCH_DIR/envs/grill-with-docs"
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

**1.4 Install Grill-with-docs** (the official way, as its README says: the whole plugin from Claude Code's official marketplace; never copy single skills):

```bash
claude plugin marketplace update claude-plugins-official   # current listing; the marketplace pins the plugin to a commit
claude plugin install mattpocock-skills@claude-plugins-official
claude plugin list                                         # mattpocock-skills@claude-plugins-official only; write its Version into the report (method_version)
python3 -I -c 'import json,os;d=json.load(open(os.environ["CLAUDE_CONFIG_DIR"]+"/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json"));print([p["source"].get("sha") for p in d["plugins"] if p["name"]=="mattpocock-skills"])'   # the commit, e.g. 49dd158
```

Switching an existing environment from the earlier local install (`mattpocock-skills@mattpocock`): `claude plugin uninstall mattpocock-skills@mattpocock && claude plugin marketplace remove mattpocock`, then the block above. Runs before 2026-10-22 (S-CC-02) used the local marketplace at `447ca70`; their reports say so.

**1.5 Tag** (the method lives outside the repos, so the tag is the same commit as `baseline-v1`):

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f grill-v1 baseline-v1; done
```

**1.6 Log in once** (a new config dir has no login):

```bash
(
cd "$BENCH_DIR" && claude
)                                               # in a subshell: your terminal stays where it is
```

In the session: accept the folder-trust prompt, `/login` with your work account, then `/exit`.

**1.7 One-time setup: `/setup-matt-pocock-skills`** (once, after 1.6; it writes the issue-tracker, triage-label and domain-doc configuration the skills read). Its cost is a one-time setup cost: record it in part 7 and never add it to any run.

```bash
# terminal 1 (same variables as 1.2)
nvm use 24
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" checkout -q -f baseline-v1; done
mkdir -p "$ENV_DIR/root"
(
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)
```

In the session: send `/setup-matt-pocock-skills`. Same answers for every run: issue tracker = local markdown; triage labels = not asked (the `triage` skill is not installed); domain docs = single-context; if it asks which file to create, `CLAUDE.md`. Reply `Approved, continue.` to any "shall I continue?". When it is done: run `/usage` and paste it into part 7, then `/exit`.

Then (terminal 2), still before any run:

```bash
python3 "$SB/scripts/session-usage.py" "$CLAUDE_CONFIG_DIR/projects/$(echo "$BENCH_DIR" | tr / -)" --out "$ENV_DIR/setup-tokens.md"   # per model / agent / subagent; copy it to rosetta-benchmarks/saleor/methods/grill-with-docs.setup-tokens.md
for r in saleor saleor-dashboard react-storefront; do
  git -C "$BENCH_DIR/$r" status --porcelain
  git -C "$BENCH_DIR/$r" add -A
  git -C "$BENCH_DIR/$r" -c user.name="saleor-benchmark" -c user.email="saleor-benchmark@localhost" commit -q -m "grill-with-docs: setup-matt-pocock-skills" || echo "$r: nothing to commit"
  git -C "$BENCH_DIR/$r" tag -f grill-v1
done
find "$BENCH_DIR" -mindepth 1 -maxdepth 1 | while read -r f; do
  case "$(basename "$f")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs | run-output | .claude | .gitignore) ;;
  *) cp -R "$f" "$ENV_DIR/root/" ;; esac
done
ls -la "$ENV_DIR/root"
```

`bench.sh reset grill-v1` now returns the repos to the setup commit, and step 2 of each run copies `$ENV_DIR/root` back into the workspace root. Every run starts a new session, after step 4.

## 2. Run S-CC-02: small task: product storage conditions, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/claude-code/grill-with-docs/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/grill-with-docs"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/small-storage-conditions/claude-code/grill-with-docs"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset grill-v1 && cp -R "$ENV_DIR/root/." "$BENCH_DIR/" && $B start && sleep 60 && $B health      # reset to the setup commit, restore the setup files, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CC-02|' -e 's|^method:.*|method: grill-with-docs|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: grill-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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

Expected: only `mattpocock-skills@claude-plugins-official`; no skills dir; no MCP servers; `grill-v1` among each repo's tags; no `status` lines. `CLAUDE_CONFIG_DIR` is `envs/grill-with-docs/claude`; Claude Code 2.1.305 and Node v24; the settings from part 1.3; no `user-level:` lines; in the session, `/hooks` shows only the method's hooks. Rules file: `= baseline rules` for both files in every repo, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`, plus the method's own files at its tag (if its setup changed a rules file, `DIFFERS` is expected: note it in the report). Claude Code sandbox: `"sandbox": { "enabled": false }` and no `managed settings present` line; in the session, `/sandbox` shows sandboxing off (a managed or org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code: that is not a leak. It must list no `mcp__ide__*` tools (standalone terminal, BENCHMARKS.md section 2).

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu shows `grill-with-docs` (plugin skills may show as `mattpocock-skills:grill-with-docs`: the same command; type it as shown and note it in the report) and `setup-matt-pocock-skills`. If not: `/exit`, reset, start again.

**When the checks pass: `/exit`, then start `claude` again WITHOUT the cleanup lines** (`find … rm -rf` and `rm -rf "$BENCH_DIR/run-output"` run only in the first start; running them again would delete the logs of this run): `(cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5)`. This is a NEW session (never `--continue`): its purpose is a clean context, with none of the checks in it. Send the task as the first message of that second session. Do not send the task before this restart.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/grill-with-docs Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| a round of questions | answers from the tables, by number; ~2–3 rounds |
| summary, waits for confirmation | `Approved, continue.` |
| asks permission again | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; answer the question that was asked, directly and in full (BENCHMARKS.md, section 4, "Answer the question that was asked, in full"), one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `S-CC-02` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 3. Run L-CC-02: large task: age-restricted products, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/claude-code/grill-with-docs/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/grill-with-docs"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/large-age-restriction/claude-code/grill-with-docs"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset grill-v1 && cp -R "$ENV_DIR/root/." "$BENCH_DIR/" && $B start && sleep 60 && $B health      # reset to the setup commit, restore the setup files, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CC-02|' -e 's|^method:.*|method: grill-with-docs|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: grill-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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

Expected: only `mattpocock-skills@claude-plugins-official`; no skills dir; no MCP servers; `grill-v1` among each repo's tags; no `status` lines. `CLAUDE_CONFIG_DIR` is `envs/grill-with-docs/claude`; Claude Code 2.1.305 and Node v24; the settings from part 1.3; no `user-level:` lines; in the session, `/hooks` shows only the method's hooks. Rules file: `= baseline rules` for both files in every repo, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`, plus the method's own files at its tag (if its setup changed a rules file, `DIFFERS` is expected: note it in the report). Claude Code sandbox: `"sandbox": { "enabled": false }` and no `managed settings present` line; in the session, `/sandbox` shows sandboxing off (a managed or org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code: that is not a leak. It must list no `mcp__ide__*` tools (standalone terminal, BENCHMARKS.md section 2).

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu shows `grill-with-docs` (plugin skills may show as `mattpocock-skills:grill-with-docs`: the same command; type it as shown and note it in the report) and `setup-matt-pocock-skills`. If not: `/exit`, reset, start again.

**When the checks pass: `/exit`, then start `claude` again WITHOUT the cleanup lines** (`find … rm -rf` and `rm -rf "$BENCH_DIR/run-output"` run only in the first start; running them again would delete the logs of this run): `(cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5)`. This is a NEW session (never `--continue`): its purpose is a clean context, with none of the checks in it. Send the task as the first message of that second session. Do not send the task before this restart.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/grill-with-docs Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| a round of questions | answers from the tables, by number; more rounds |
| summary, waits for confirmation | `Approved, continue.` |
| asks permission again | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; answer the question that was asked, directly and in full (BENCHMARKS.md, section 4, "Answer the question that was asked, in full"), one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `L-CC-02` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 4. Setup for Copilot CLI (once)

> ⚠️ **Not verified yet:** these steps follow the method's docs and Copilot CLI 1.0.101's own help, not a real run.

**Install and use:** there is no Copilot plugin; the method's README installs it on other agents with its own installer, never by copying single skills: `npx skills@latest add mattpocock/skills` with **all** skills (at least `setup-matt-pocock-skills`, as the README requires) and **GitHub Copilot** as the agent. It writes repository files in the workspace root, outside the three repos, and `bench.sh reset` removes them, so they are kept in `$ENV_DIR/root-copilot/` and copied back after every reset. Mark these runs `skills.sh installer`. Then the same commands as Claude Code.

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
export ENV_DIR="$BENCH_DIR/envs/grill-with-docs"
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

**4.4 Install Grill-with-docs** (its README's installer, project scope, not global):

```bash
nvm use 24
$B reset baseline-v1                            # clean repos and workspace root, no Claude Code setup files
(
cd "$BENCH_DIR" && npx skills@latest add mattpocock/skills      # select all skills and the agent "GitHub Copilot"
)                                               # in a subshell: your terminal stays where it is
```

Write the installer version and the skills it wrote into the report.

**4.5 Tag** (the method lives outside the repos, so the tag is the same commit as `baseline-v1`):

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f grill-v1 baseline-v1; done
```

**4.6 Log in and trust the workspace once** (a new `COPILOT_HOME` has no saved account and no trusted folders; the login token itself goes to the macOS Keychain):

```bash
copilot login
(
cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --no-auto-update
)                                               # in a subshell: your terminal stays where it is
```

In the session: accept the folder-trust prompt with **Yes, and remember this folder for future sessions**, then `/exit`.

**4.7 One-time setup: `/setup-matt-pocock-skills`** (as in 1.7; it comes with the installer above): start a fresh session as in step 4 of a run, send `/setup-matt-pocock-skills`, answer as in 1.7 and record its `/usage` in part 7, then `/exit`. Then (terminal 2) commit the changes in the three repos and move the tag `grill-v1` onto that commit (the repo loop after 1.7), and keep the root files:

```bash
mkdir -p "$ENV_DIR/root-copilot"
find "$BENCH_DIR" -mindepth 1 -maxdepth 1 | while read -r f; do
  case "$(basename "$f")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs | run-output) ;;
  *) cp -R "$f" "$ENV_DIR/root-copilot/" ;; esac
done
ls -la "$ENV_DIR/root-copilot"                  # the installer's skills and the setup files
```

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

Expected: `COPILOT_HOME` = `envs/grill-with-docs/copilot`; version 1.0.101 and Node v24; the common settings, with `ignoredSkillsLocations` set to `~/.agents/skills`, `~/.claude/skills` and `~/.github/skills`, and `skill list` has no "Inherited skills" section; `subagents:` shows `explore`, `task`, `general-purpose`, `code-review`, `research` and `security-review` with `model`, `effortLevel` and `contextTier` set to `inherit`, and `disabledSubagents` = `["rubber-duck"]`; in the session, `/subagents` shows "Inherit session model" for those six; no plugins; `skill list` shows the installer's mattpocock skills and the CLI's built-in ones only; `instruction list` shows `team-rules.instructions.md [external]` (the team rules file, from `saleor/copilot-rules/`) plus only the files `/setup-matt-pocock-skills` wrote in the workspace root; no MCP servers (1.0.101's `mcp list` shows the CLI's built-in GitHub server as `Builtin servers: github-mcp-server (http)`: expected, not a leak; `--disable-builtin-mcps` turns it off in the session, and `/env` there must show none; `plugin list` likewise shows the built-in `browser-use (v0.0.4) [disabled]`: expected; S-CP-01); `/env` lists the built-in `computer-use` plugin: expected, its desktop-control MCP server is off by default and must stay off (`0 servers connected`; if it is enabled or connected, don't start); no inline hooks; no `user-level:` lines; no `token env set` line; `grill-v1` among each repo's tags; no `status` lines. Rules file: `= baseline rules` for both files in every repo and for `copilot-rules`, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`, plus the method's own files at its tag (if its setup changed a rules file, `DIFFERS` is expected: note it in the report). Copilot sandbox: `sandbox.enabled=false`; in the session, `/sandbox` shows sandboxing off (an org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1.

## 5. Run S-CP-02: small task: product storage conditions, Copilot

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/copilot/grill-with-docs/`. Not verified (see part 4). Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/grill-with-docs"
export COPILOT_HOME="$ENV_DIR/copilot" B="$SB/scripts/bench.sh" COPILOT_AUTO_UPDATE=false   # no newer cached CLI package
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$SB/copilot-rules"   # the team rules file for Copilot CLI
export RUN="$SB/runs/small-storage-conditions/copilot/grill-with-docs"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset grill-v1 && cp -R "$ENV_DIR/root-copilot/." "$BENCH_DIR/" && $B start && sleep 60 && $B health      # reset to the setup commit, restore the setup files, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CP-02|' -e 's|^method:.*|method: grill-with-docs|' -e 's|^runner:.*|runner: copilot|' \
  -e 's|^model:.*|model: gpt-5.6-terra|' -e 's|^start_tag:.*|start_tag: grill-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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

**When the checks pass: `/exit`, then start `copilot` again WITHOUT the cleanup lines** (`grep … rm -rf` and `rm -rf "$BENCH_DIR/run-output"` run only in the first start; running them again would delete the logs of this run): `(cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps)`. This is a NEW session (never `--resume` or `--continue`): its purpose is a clean context, with none of the checks in it. Send the task as the first message of that second session. Do not send the task before this restart.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/grill-with-docs Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| a round of questions | answers from the tables, by number; ~2–3 rounds |
| summary, waits for confirmation | `Approved, continue.` |
| asks permission again | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; answer the question that was asked, directly and in full (BENCHMARKS.md, section 4, "Answer the question that was asked, in full"), one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

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

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --resume <session id> --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps)` and send it there (note it in section 8):

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `S-CP-02` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 6. Run L-CP-02: large task: age-restricted products, Copilot

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/copilot/grill-with-docs/`. Not verified (see part 4). Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/grill-with-docs"
export COPILOT_HOME="$ENV_DIR/copilot" B="$SB/scripts/bench.sh" COPILOT_AUTO_UPDATE=false   # no newer cached CLI package
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$SB/copilot-rules"   # the team rules file for Copilot CLI
export RUN="$SB/runs/large-age-restriction/copilot/grill-with-docs"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
$B reset grill-v1 && cp -R "$ENV_DIR/root-copilot/." "$BENCH_DIR/" && $B start && sleep 60 && $B health      # reset to the setup commit, restore the setup files, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CP-02|' -e 's|^method:.*|method: grill-with-docs|' -e 's|^runner:.*|runner: copilot|' \
  -e 's|^model:.*|model: gpt-5.6-terra|' -e 's|^start_tag:.*|start_tag: grill-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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

**When the checks pass: `/exit`, then start `copilot` again WITHOUT the cleanup lines** (`grep … rm -rf` and `rm -rf "$BENCH_DIR/run-output"` run only in the first start; running them again would delete the logs of this run): `(cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps)`. This is a NEW session (never `--resume` or `--continue`): its purpose is a clean context, with none of the checks in it. Send the task as the first message of that second session. Do not send the task before this restart.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/grill-with-docs Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| a round of questions | answers from the tables, by number; more rounds |
| summary, waits for confirmation | `Approved, continue.` |
| asks permission again | `Approved, continue.` |

Answers to questions: from BENCHMARKS.md, section 4: this task's hidden-question table first, then "extra answers"; answer the question that was asked, directly and in full (BENCHMARKS.md, section 4, "Answer the question that was asked, in full"), one message per round; never "use your recommendation". Not in either table: decide as product owner and add a row to "extra answers". Something else it asks: pick its default or recommended option and note it in the report.

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

**Step 8. Check the result yourself** (stack still running): report section 4, "Done when": the UI steps, API calls and tests listed there. Then sections 5–6 (red flags, agent's claims).

**Step 9. Post-implementation prompt.** Paste this into the agent; when it's done, `/exit`. If the session was already closed: `(cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --resume <session id> --no-auto-update --model gpt-5.6-terra --reasoning-effort medium --allow-all --disable-builtin-mcps)` and send it there (note it in section 8):

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `L-CP-02` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 7. One-time setup cost: `/setup-matt-pocock-skills` (reported separately, not added to any run)

| Runner | Start | End | Operator | Notes |
| --- | --- | --- | --- | --- |
| Claude Code | 2026-10-22T12:08 | 2026-10-22T12:17 | Oleksii Poletaiev | Plugin `mattpocock-skills@claude-plugins-official` **1.3.1** @ `49dd158`, Claude Code 2.1.305, Sonnet 5.5, effort medium. Run in `~/saleor-benchmark` (not a git repo), repos at `baseline-v1`, new config dir history. Sent (times from the session log): 12:08:16 `/mattpocock-skills:setup-matt-pocock-skills` (it found no git, no `CLAUDE.md`, no `docs/agents/`; recommended local markdown) · 12:10:09 `Local markdown.` · 12:15:29 `Yes, keep the five defaults.` (triage labels; asked because the whole plugin includes `triage`) · 12:17:04 `1. CLAUDE.md. 2. Yes, the root /Users/olepoletaiev/saleor-benchmark is right.` Domain docs were not asked: single-context (`GLOSSARY.md` + `docs/adr/` at the root). It showed the draft and wrote it without another approval. Wrote `CLAUDE.md` (## Agent skills block) and `docs/agents/{issue-tracker,triage-labels,domain}.md` in the workspace root, saved to `envs/grill-with-docs/root/`; nothing changed inside the 3 repos, so `grill-v1` = `baseline-v1`. Before it, `/model` (kept Sonnet 5.5) and `/effort` (cancelled) were run as local commands, no model calls. Replaces the setup of 2026-10-21 17:20–17:24 on 1.2.3 (local marketplace at `447ca70`, $0.1106), whose files differ (root `CONTEXT.md` instead of `GLOSSARY.md`); that one was used by S-CC-02 only. |
| Copilot | | | | |

Claude Code, paste raw (`/usage`; per-agent tokens are in `grill-with-docs.setup-tokens.md`):

```text
/cost and /usage (one screen: Usage › Session), at 12:17–12:18:
Total cost:            $0.1077
Total duration (API):  32s
Total duration (wall): 13m 52s
Total code changes:    0 lines added, 0 lines removed
Usage by model:
    claude-sonnet-5-5:  1.6k input, 2.8k output, 423.4k cache read, 13.7k cache write ($0.1076)
     claude-haiku-5-5:  1.2k input, 14 output, 0 cache read, 0 cache write ($0.0001)
Prompt cache (main):   7 requests · 95% of input tokens from cache · no misses
Current session: 15% used (resets 3:49pm Europe/Warsaw) · Current week (all models): 22% used
Skills, % of usage: /mattpocock-skills:setup-matt-pocock-skills 39% · Plugins: mattpocock-skills 39%
```

Copilot, `/usage` at the end of the setup session (AI credits):

```text
```
