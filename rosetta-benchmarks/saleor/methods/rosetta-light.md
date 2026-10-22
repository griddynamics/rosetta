# Rosetta Light

Runs: `S-CC-07` (small, Claude Code) · `L-CC-07` (large, Claude Code) · `S-CP-07` (small, Copilot) · `L-CP-07` (large, Copilot). Everything for this method is in this file: setup, then each run step by step. Rules: [BENCHMARKS.md](../../BENCHMARKS.md).

## The method's commands

| Command / skill | When | Official doc |
| --- | --- | --- |
| `/init-workspace-flow` | **once**, before the first run (part 1.7); its cost is reported separately and never added to a run | docs/web/user-guide/scenarios/ (init workspace); plugins/core-claude*/workflows/init-workspace-flow.md |
| `<task>` + `MUST USE SKILLS hitl, tech-specs.` (large task: `MUST USE SKILLS hitl, tech-specs, orchestration.`) + `USE ROSETTA SUBAGENTS.` | T0 (no `/coding-flow`: the method is the named skills and the subagents; the large task adds `orchestration`) | plugins/core-claude-light/skills/tech-specs/SKILL.md (description), plugins/core-claude-light/skills/hitl/SKILL.md:35,41; plugins/core-claude-light/agents/ |
| `Yes, I approve` | each approval stop: only this exact sentence counts | skills/hitl/SKILL.md:35 |

**T0 message, small task** (copy as is):

```text
Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.

MUST USE SKILLS hitl, tech-specs.

USE ROSETTA SUBAGENTS.
```

**T0 message, large task** (copy as is):

```text
Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.

MUST USE SKILLS hitl, tech-specs, orchestration.

USE ROSETTA SUBAGENTS.
```

Every other reply is written out in each run below (parts 2, 3, 5, 6).

## 1. Setup for Claude Code (once)

Open a terminal **inside your rosetta checkout**. Do each step once per machine; skip a step that is already done.

**1.1 Machine** (once per machine, shared by all methods): Node 24 with Claude Code in it (the Saleor stack comes from 1.2a).

```bash
nvm install 24 && nvm alias default 24 && nvm use 24
command -v claude || npm install -g @anthropic-ai/claude-code@2.1.305
claude --version                                   # 2.1.305 (all runs use this version)
```

**1.2 Variables** (paste into every new terminal you use for this method):

```bash
export BENCH_DIR="$HOME/saleor-benchmark"
export ENV_DIR="$BENCH_DIR/envs/rosetta-light"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude"
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor" B="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor/scripts/bench.sh"   # inside your rosetta checkout
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**1.2a Starting point: the two zips** (the first setup and every Rosetta run begin here; the repos are never cloned). `test-library/` holds two zips, the same for Rosetta, Rosetta Light and Rosetta Skills:

- `saleor-initialized-repos.zip` (40 MB): the entire `.git` of the three repos. HEAD is the init commit, tagged `rosetta-v1`, `rosetta-light-v1` and `rosetta-skills-v1`; its parent is `baseline-v1`.
- `saleor-initialized-root.zip` (19 KB): the files Rosetta created outside the repos, in `~/saleor-benchmark` (`README.md`, `gain.json`, `docs/`, `agents/`).

`bench.sh from-zips` deletes the old repo files (it keeps `node_modules`) and every other file in the workspace root (it keeps `seed.dump`, `logs` and `envs`), extracts both zips and runs `git reset --hard` in each repo. `bench.sh setup` then restores the database and installs dependencies; it sees `baseline-v1`, so it does not clone. Nothing is copied back. Only the person creating the zips skips `from-zips`: they run `bench.sh setup` once (it clones the repos) and then do 1.7.

```bash
nvm use 24
$B from-zips && $B setup && $B start && sleep 60 && $B health      # repos at the init commit, root files in place, all three OK
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

**1.4 Install Rosetta Light** (pinned version):

```bash
[ -d "$ENV_DIR/src/.git" ] || git clone -q --branch v3.1.17 https://github.com/griddynamics/rosetta "$ENV_DIR/src"
claude plugin marketplace add "$ENV_DIR/src"
claude plugin install rosetta-light@rosetta
claude plugin list                                             # rosetta-light@rosetta 3.1.17 only
```

**1.5 Tag**: nothing to do. The method tag `rosetta-light-v1` comes with the zip, on the init commit (1.2a). Never re-tag it to `baseline-v1`: that would remove the init.

**1.6 Log in once** (a new config dir has no login):

```bash
(
cd "$BENCH_DIR" && claude
)                                               # in a subshell: your terminal stays where it is
```

In the session: accept the folder-trust prompt, `/login` with your work account, then `/exit`.

**1.7 One-time project preparation: `/init-workspace-flow`** (once per method, after 1.6; it sets up the project context for every run of this method). Its cost is a one-time setup cost: record it in part 7 and never add it to any run. Skip this part if the two zips in `test-library/` exist: you already started from them (1.2a), so never run the init again (about 30 minutes).

```bash
# terminal 1: start from a clean workspace on baseline-v1 (same variables as 1.2)
nvm use 24
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" checkout -q -f baseline-v1; done
(
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)
```

In the session: send `/init-workspace-flow`. Answer its questions as product owner, one message per round; reply `Approved, continue.` to any "shall I continue?". Write the start and end time. When it is done: run `/usage` and paste it into part 7; do not `/exit` before that.

Then (terminal 2), still before any run:

```bash
python3 "$SB/scripts/session-usage.py" "$CLAUDE_CONFIG_DIR/projects/$(echo "$BENCH_DIR" | tr / -)" --out "$ENV_DIR/init-tokens.md"   # per model / agent / subagent
# files the init wrote inside the repos: commit them and tag the commit for all three Rosetta methods
for r in saleor saleor-dashboard react-storefront; do
  git -C "$BENCH_DIR/$r" status --porcelain --ignored | grep -v "node_modules\|__pycache__\|\.next"   # git-ignored files are not committed: `git add -f` any that the init created
  git -C "$BENCH_DIR/$r" add -A
  git -C "$BENCH_DIR/$r" -c user.name="saleor-benchmark" -c user.email="saleor-benchmark@localhost" commit -q -m "rosetta: init-workspace-flow" || echo "$r: nothing to commit"
  for t in rosetta-v1 rosetta-light-v1 rosetta-skills-v1; do git -C "$BENCH_DIR/$r" tag -f "$t"; done
done
ls -A "$BENCH_DIR"     # the files the init wrote outside the repos
```

Then `/exit`. Keep `init-tokens.md` and copy it to `rosetta-benchmarks/saleor/methods/rosetta-light.init-tokens.md` so it is committed with the results.

Then save the two zips (terminal 2). Zip only, maximum compression (`-9`, deflate: the macOS `zip` has no bzip2 build). The repos zip holds only the `.git` folders, not the working files, dependencies or caches; `git reset --hard` rebuilds the working files on extraction. One pair of zips serves Rosetta, Rosetta Light and Rosetta Skills; the init is run once, with the full `rosetta` plugin.

```bash
TL="$(git rev-parse --show-toplevel)/test-library"
rm -f "$TL/saleor-initialized-repos.zip" "$TL/saleor-initialized-root.zip"
(cd "$BENCH_DIR" && for r in saleor saleor-dashboard react-storefront; do git -C "$r" status --porcelain; find "$r/.git"; done | zip -9 -y -X -q -@ "$TL/saleor-initialized-repos.zip")   # status lines must be empty: everything committed
(cd "$BENCH_DIR" && ls -A | grep -v -x -e saleor -e saleor-dashboard -e react-storefront -e seed.dump -e logs -e envs -e run-output -e .DS_Store | zip -9 -r -y -X -q -@ "$TL/saleor-initialized-root.zip" -x '*.DS_Store')   # everything outside the repos
ls -lh "$TL"/saleor-initialized-*.zip && unzip -tq "$TL/saleor-initialized-repos.zip" | tail -1 && unzip -tq "$TL/saleor-initialized-root.zip" | tail -1   # GitHub rejects files over 100 MB
```

Commit the two zips with the results. Every later start uses them (1.2a).

## 2. Run S-CC-07: small task: product storage conditions, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/claude-code/rosetta-light/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/rosetta-light"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/small-storage-conditions/claude-code/rosetta-light"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Start from the zips and open the report** (terminal 2):

```bash
nvm use 24
$B from-zips && $B setup && $B start && sleep 60 && $B health      # repos at the init commit, root files in place, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CC-07|' -e 's|^method:.*|method: rosetta-light|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: rosetta-light-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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

Expected: only `rosetta-light@rosetta`; no MCP servers; `rosetta-light-v1` among each repo's tags; no `status` lines. `CLAUDE_CONFIG_DIR` is `envs/rosetta-light/claude`; Claude Code 2.1.305 and Node v24; the settings from part 1.3; no `user-level:` lines; in the session, `/hooks` shows only the method's hooks. Rules file: `= baseline rules` for both files in every repo, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`, plus the method's own files at its tag (if its setup changed a rules file, `DIFFERS` is expected: note it in the report). Claude Code sandbox: `"sandbox": { "enabled": false }` and no `managed settings present` line; in the session, `/sandbox` shows sandboxing off (a managed or org policy can force it on: then don't start). Anything else: don't start, fix it and repeat step 2. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code: that is not a leak. It must list no `mcp__ide__*` tools (standalone terminal, BENCHMARKS.md section 2).

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu lists the `hitl` and `tech-specs` skills; `/plugin` shows `rosetta-light`. If not: `/exit`, repeat step 2, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.

MUST USE SKILLS hitl, tech-specs.

USE ROSETTA SUBAGENTS.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables |
| asks for approval (specs, design, implementation) | `Yes, I approve` |
| any other "shall I continue?" | `Approved, continue.` |

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

**Step 10. Save everything** (terminal 2, before the next start):

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/`. It also holds the init files from the root zip (`README.md`, `gain.json`, `docs/`, `agents/`); what the agent added or changed in them is the difference. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `S-CC-07` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 3. Run L-CC-07: large task: age-restricted products, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/claude-code/rosetta-light/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/rosetta-light"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/large-age-restriction/claude-code/rosetta-light"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Start from the zips and open the report** (terminal 2):

```bash
nvm use 24
$B from-zips && $B setup && $B start && sleep 60 && $B health      # repos at the init commit, root files in place, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CC-07|' -e 's|^method:.*|method: rosetta-light|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: rosetta-light-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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

Expected: only `rosetta-light@rosetta`; no MCP servers; `rosetta-light-v1` among each repo's tags; no `status` lines. `CLAUDE_CONFIG_DIR` is `envs/rosetta-light/claude`; Claude Code 2.1.305 and Node v24; the settings from part 1.3; no `user-level:` lines; in the session, `/hooks` shows only the method's hooks. Rules file: `= baseline rules` for both files in every repo, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`, plus the method's own files at its tag (if its setup changed a rules file, `DIFFERS` is expected: note it in the report). Claude Code sandbox: `"sandbox": { "enabled": false }` and no `managed settings present` line; in the session, `/sandbox` shows sandboxing off (a managed or org policy can force it on: then don't start). Anything else: don't start, fix it and repeat step 2. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code: that is not a leak. It must list no `mcp__ide__*` tools (standalone terminal, BENCHMARKS.md section 2).

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu lists the `hitl` and `tech-specs` skills; `/plugin` shows `rosetta-light`. If not: `/exit`, repeat step 2, start again.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.

MUST USE SKILLS hitl, tech-specs, orchestration.

USE ROSETTA SUBAGENTS.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables, + major-decision questions ("LARGE = MEDIUM + any major decisions", skills/hitl/SKILL.md:41) |
| asks for approval (specs, design, implementation) | `Yes, I approve` |
| any other "shall I continue?" | `Approved, continue.` |
| the agent asks for its own approval sentence (e.g. `Yes, I approve the specs with PR-1..7 as proposed.`) | the assistant writes one message: `Please improve: (1) …, (2) ….` for spec items covered only partly (key texts word for word), then `Yes, I approve with those corrections` + the agent's own sentence; items the spec does not mention at all are not raised (they are found at T1). Its own proposals (PR-n) are approved as proposed unless a table answer contradicts one |

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

**Step 10. Save everything** (terminal 2, before the next start):

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/`. It also holds the init files from the root zip (`README.md`, `gain.json`, `docs/`, `agents/`); what the agent added or changed in them is the difference. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `L-CC-07` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 4. Setup for Copilot CLI (once)

> ⚠️ **Not verified yet:** these steps follow the method's docs and Copilot CLI 1.0.101's own help, not a real run.

**Install and use:** plugin `rosetta-light` from the pinned clone's Copilot marketplace (`.github/plugin/marketplace.json`, marketplace `rosetta`). Its skills, agents, commands and session-start hook must load. Then the same task prompt and approval phrase.

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
export ENV_DIR="$BENCH_DIR/envs/rosetta-light"
export COPILOT_HOME="$ENV_DIR/copilot"
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$BENCH_DIR/saleor,$BENCH_DIR/saleor-dashboard,$BENCH_DIR/react-storefront"   # loads each repo's .github/copilot-instructions.md
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor" B="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor/scripts/bench.sh"   # inside your rosetta checkout
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
copilot config --list
```

Both `autoUpdate=false` and `--no-auto-update` (in every session start) are needed: the setting only stops further downloads, and the launch flag makes the CLI run its installed version instead of an update it downloaded earlier.

Hooks and skills stay on: the method's own hooks and skills must load. Never set `disableAllHooks` or `--dynamic-retrieval skills=off` in this home.

**4.4 Install Rosetta Light** (pinned version, the clone from part 1.4):

```bash
[ -d "$ENV_DIR/src/.git" ] || git clone -q --branch v3.1.17 https://github.com/griddynamics/rosetta "$ENV_DIR/src"
copilot plugin marketplace add "$ENV_DIR/src"                 # marketplace "rosetta" (.github/plugin/marketplace.json)
copilot plugin install rosetta-light@rosetta
copilot plugin list                                           # rosetta-light 3.1.17 only
```

**4.5 Tag**: The method tag comes with the zips (part 1.2a); check it, do not re-tag:

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -l rosetta-light-v1; done   # comes with the zip (1.2a)
```

**4.6 Log in and trust the workspace once** (a new `COPILOT_HOME` has no login and no trusted folders):

```bash
copilot login
(
cd "$BENCH_DIR" && copilot -C "$BENCH_DIR" --no-auto-update
)                                               # in a subshell: your terminal stays where it is
```

In the session: accept the folder-trust prompt with the option that remembers the folder, then `/exit`.

**4.7 One-time preparation** (as in 1.7; skip it if you start from the zips in `test-library/`, part 1.2a): start a fresh session as in step 4 of a run, send `/init-workspace-flow`, then commit the init changes in the three repos and put the three Rosetta method tags on that commit (the commands after 1.7). Record its `/usage` in part 7. Then `/exit`.

**4.8 Isolation check** (before every run, step 3; `$RUN` = that run's folder):

```bash
{ echo "COPILOT_HOME=$COPILOT_HOME"; copilot --version; node -v; copilot config --list
  copilot plugin list; copilot skill list; copilot mcp list; copilot instruction list
  copilot config hooks 2>/dev/null || echo "(no inline hooks)"
  echo "sandbox.enabled=$(copilot config sandbox.enabled)"
  for p in "$COPILOT_HOME"/copilot-instructions.md "$COPILOT_HOME"/agents "$COPILOT_HOME"/hooks "$COPILOT_HOME"/skills "$COPILOT_HOME"/mcp-config.json; do [ -e "$p" ] && echo "user-level: $p"; done
  RULES="$SB/baseline-instructions.md"   # the team rules file (BENCHMARKS.md 3.3)
  for r in saleor saleor-dashboard react-storefront; do
    cmp -s "$RULES" "$BENCH_DIR/$r/CLAUDE.md" && echo "$r: CLAUDE.md = baseline rules" || echo "$r: CLAUDE.md DIFFERS"
    cmp -s "$RULES" "$BENCH_DIR/$r/.github/copilot-instructions.md" && echo "$r: copilot-instructions.md = baseline rules" || echo "$r: copilot-instructions.md DIFFERS"
    git -C "$BENCH_DIR/$r" ls-files | grep -E '(^|/)(AGENTS|CLAUDE|GEMINI)\.md$|\.mdc$|copilot-instructions\.md$|(^|/)\.github/(instructions|skills|agents|hooks)/|(^|/)\.claude/|(^|/)\.cursor/' | sed "s|^|$r: ai-file: |" || true
  done
  for r in saleor saleor-dashboard react-storefront; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; git -C "$BENCH_DIR/$r" status --porcelain; done
} 2>&1 | tee "$RUN/isolation.txt"
```

Expected: `COPILOT_HOME` = `envs/rosetta-light/copilot`; version 1.0.101 and Node v24; the common settings, with `ignoredSkillsLocations` set to `~/.agents/skills`, and `skill list` shows none of that folder's skills; `plugin list` shows `rosetta-light` only; `skill list` shows its skills and the CLI's built-in ones only; `instruction list` shows the three repos' `.github/copilot-instructions.md` plus only the files the Rosetta init wrote (zips); no MCP servers except the CLI's built-in GitHub ones (`--disable-builtin-mcps` turns them off in the session); no inline hooks; no `user-level:` lines; `rosetta-light-v1` among each repo's tags; no `status` lines. Rules file: `= baseline rules` for both files in every repo, and `ai-file:` lines only for `CLAUDE.md` and `.github/copilot-instructions.md`, plus the method's own files at its tag (if its setup changed a rules file, `DIFFERS` is expected: note it in the report). Copilot sandbox: `sandbox.enabled=false`; in the session, `/sandbox` shows sandboxing off (an org policy can force it on: then don't start). Anything else: don't start, fix and reset. Paste it into report section 1.

## 5. Run S-CP-07: small task: product storage conditions, Copilot

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/copilot/rosetta-light/`. Not verified (see part 4). Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/rosetta-light"
export COPILOT_HOME="$ENV_DIR/copilot" B="$SB/scripts/bench.sh"
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$BENCH_DIR/saleor,$BENCH_DIR/saleor-dashboard,$BENCH_DIR/react-storefront"
export RUN="$SB/runs/small-storage-conditions/copilot/rosetta-light"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Start from the zips and open the report** (terminal 2):

```bash
nvm use 24
$B from-zips && $B setup && $B start && sleep 60 && $B health      # repos at the init commit, root files in place, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CP-07|' -e 's|^method:.*|method: rosetta-light|' -e 's|^runner:.*|runner: copilot|' \
  -e 's|^model:.*|model: gpt-5.6-terra|' -e 's|^start_tag:.*|start_tag: rosetta-light-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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
Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.

MUST USE SKILLS hitl, tech-specs.

USE ROSETTA SUBAGENTS.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables |
| asks for approval (specs, design, implementation) | `Yes, I approve` |
| any other "shall I continue?" | `Approved, continue.` |

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

**Step 10. Save everything** (terminal 2, before the next start):

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/`. It also holds the init files from the root zip (`README.md`, `gain.json`, `docs/`, `agents/`); what the agent added or changed in them is the difference. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `S-CP-07` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 6. Run L-CP-07: large task: age-restricted products, Copilot

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/copilot/rosetta-light/`. Not verified (see part 4). Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/rosetta-light"
export COPILOT_HOME="$ENV_DIR/copilot" B="$SB/scripts/bench.sh"
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$BENCH_DIR/saleor,$BENCH_DIR/saleor-dashboard,$BENCH_DIR/react-storefront"
export RUN="$SB/runs/large-age-restriction/copilot/rosetta-light"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Start from the zips and open the report** (terminal 2):

```bash
nvm use 24
$B from-zips && $B setup && $B start && sleep 60 && $B health      # repos at the init commit, root files in place, all three OK
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CP-07|' -e 's|^method:.*|method: rosetta-light|' -e 's|^runner:.*|runner: copilot|' \
  -e 's|^model:.*|model: gpt-5.6-terra|' -e 's|^start_tag:.*|start_tag: rosetta-light-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
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
Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.

MUST USE SKILLS hitl, tech-specs, orchestration.

USE ROSETTA SUBAGENTS.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| questions | answers from the tables, + major-decision questions ("LARGE = MEDIUM + any major decisions", skills/hitl/SKILL.md:41) |
| asks for approval (specs, design, implementation) | `Yes, I approve` |
| any other "shall I continue?" | `Approved, continue.` |
| the agent asks for its own approval sentence (e.g. `Yes, I approve the specs with PR-1..7 as proposed.`) | the assistant writes one message: `Please improve: (1) …, (2) ….` for spec items covered only partly (key texts word for word), then `Yes, I approve with those corrections` + the agent's own sentence; items the spec does not mention at all are not raised (they are found at T1). Its own proposals (PR-n) are approved as proposed unless a table answer contradicts one |

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

**Step 10. Save everything** (terminal 2, before the next start):

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/`. It also holds the init files from the root zip (`README.md`, `gain.json`, `docs/`, `agents/`); what the agent added or changed in them is the difference. Fill the rest of the report (data block: times, `/usage` numbers, counts) and set `L-CP-07` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 7. One-time setup cost: `/init-workspace-flow` (reported separately, not added to any run)

| Runner | Start | End | Operator | Notes |
| --- | --- | --- | --- | --- |
| Claude Code | | | | One init for all Rosetta methods (shared zips): its cost is recorded in `rosetta-skills.md` part 7 (about 1 h, 52 min wall time, $31.20). Not repeated here. |
| Copilot | | | | |

Claude Code, paste raw (`/usage`; per-agent tokens are in `rosetta-light.init-tokens.md`):

```text
```

Zips in `test-library/` (size, sha256):

```text
```

Copilot, `/usage` at the end of the init session (AI credits):

```text
```
