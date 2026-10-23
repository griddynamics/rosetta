# Spec Kit

Runs: `S-CC-04` (small, Claude Code) · `L-CC-04` (large, Claude Code) · `S-CP-04` (small, Copilot) · `L-CP-04` (large, Copilot). Everything for this method is in this file: setup, then each run step by step. Rules: [BENCHMARKS.md](../../BENCHMARKS.md).

## The method's commands

| Command / skill | When | Official doc |
| --- | --- | --- |
| `specify init --here --force --integration claude --script sh --non-interactive` | once, at setup (part 1.4), in the workspace root; runs no model | README.md:46 |
| `/speckit-constitution <principles>` | once, at setup | README.md:77,82 |
| `/speckit-specify <task>` | T0 | docs/quickstart.md:87 |
| `/speckit-plan <tech stack>` | spec written | docs/reference/agentic-sdd.md:76 |
| `/speckit-tasks` | plan written | README.md:85 |
| `/speckit-implement` | tasks written: starts the coding | README.md:86 |
| `/speckit-converge` | after implement; repeat implement → converge until "✅ Converged" | README.md:87,90 |

**T0 message, small task** (copy as is):

```text
/speckit-specify Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**T0 message, large task** (copy as is):

```text
/speckit-specify Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

Every other reply is written out in each run below (parts 2, 3, 5, 6).

## 1. Setup for Claude Code (once)

Open a terminal **inside your rosetta checkout**. Skip this part if `git -C ~/saleor-benchmark/saleor tag -l speckit-v1` already prints the tag.

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
export ENV_DIR="$BENCH_DIR/envs/spec-kit"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude"
export ROOT_DIR="$ENV_DIR/root-claude-code"
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
  "enabledPlugins": {
    "cc-plugin-plugin-authoring@builtin": false,
    "cc-plugin-sec-default@builtin": false,
    "cc-plugin-telemetry@builtin": false
  },
  "env": { "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_CLAUDEAI_MCP_SERVERS": "false" }
}
JSON
```

**1.4 Install Spec Kit** (pinned version):

```bash
(
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.13
mkdir -p "$ROOT_DIR" && cd "$ROOT_DIR"
specify init --here --force --integration claude --script sh --non-interactive
ls -a "$ROOT_DIR"                                              # .claude  .specify
)                                               # in a subshell: your terminal stays where it is
```

**1.5 Tag** (the method lives outside the repos, so the tag is the same commit as `baseline-v1`):

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f speckit-v1 baseline-v1; done
```

**1.6 Log in once** (a new config dir has no login):

```bash
(
cd "$BENCH_DIR" && claude
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/login` with your work account, then `/exit`.

**1.7 Constitution** (once, same text for every run; taken from the team rules file):

```bash
(
$B reset speckit-v1 && cp -R "$ROOT_DIR/." "$BENCH_DIR/"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

Send this, wait until it's done, run `/cost` and `/usage` and paste both into part 7, then `/exit`:

```text
/speckit-constitution Use the team engineering rules in CLAUDE.md as the project principles: follow the existing code style, structure and patterns; keep changes focused on the task; no new dependencies unless really needed; add or update automated tests for every change; run the relevant tests and linters before finishing.
```

```bash
cp "$BENCH_DIR/.specify/memory/constitution.md" "$ROOT_DIR/.specify/memory/constitution.md"
```

Then save the setup usage, before any run (step 4 of a run deletes this session's log). `specify init` itself runs no model:

```bash
python3 "$SB/scripts/session-usage.py" "$CLAUDE_CONFIG_DIR/projects/$(echo "$BENCH_DIR" | tr / -)" --out "$ENV_DIR/setup-tokens.md"   # per model / agent / subagent; copy it to rosetta-benchmarks/saleor/methods/spec-kit.setup-tokens.md
```

## 2. Run S-CC-04: small task: product storage conditions, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/claude-code/spec-kit/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/spec-kit"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/small-storage-conditions/claude-code/spec-kit"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f speckit-v1 baseline-v1 >/dev/null; done   # method tag = current baseline-v1
$B reset speckit-v1 && $B start && sleep 60 && $B health      # all three OK
cp -R "$ENV_DIR/root-claude-code/." "$BENCH_DIR/"      # Spec Kit files into the workspace root
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-small.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: S-CC-04|' -e 's|^method:.*|method: spec-kit|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: speckit-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2):

```bash
{ claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" 2>/dev/null || echo "(no skills dir)"
  for r in saleor saleor-dashboard react-storefront; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; git -C "$BENCH_DIR/$r" status --porcelain; done
} 2>&1 | tee "$RUN/isolation.txt"
```

Expected: no plugins; no MCP servers; `speckit-v1` among each repo's tags; no `status` lines. Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code and, if `claude` runs in an IDE terminal, 2 `mcp__ide__*` tools: that is not a leak.

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu shows `speckit-specify`, `speckit-plan`, `speckit-tasks`, `speckit-implement`, `speckit-converge`. If not: `/exit`, reset, start again.

**When the checks pass: `/exit`, then start `claude` again WITHOUT the cleanup lines** (`find … rm -rf` and `rm -rf "$BENCH_DIR/run-output"` run only in the first start; running them again would delete the logs of this run): `(cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5)`. This is a NEW session (never `--continue`): its purpose is a clean context, with none of the checks in it. Send the task as the first message of that second session. Do not send the task before this restart.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/speckit-specify Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| `## Question [N]` tables after specify | one line per question: `Q<N>: Custom - <answer copied from the table>`, e.g. `Q1: Custom - Plain text, one optional field, max 250 characters. Empty is allowed.` |
| spec written | `/speckit-plan Use the existing stack and patterns of the three repositories: saleor (Python, Django, GraphQL), saleor-dashboard (React, TypeScript), react-storefront (Next.js, TypeScript). No new dependencies.` |
| plan written | `/speckit-tasks` |
| tasks written | `/speckit-implement` |
| "Some checklists have unchecked items … (yes/no)" | `yes` |
| implement finished | `/speckit-converge` |
| converge added tasks (no "✅ Converged") | `/speckit-implement`, then `/speckit-converge` again (usually not needed) |
| suggests clarify / checklist / analyze | `Continue with the next step.` |

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
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff speckit-v1`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

Spec Kit may commit by design, so the diff is taken against `speckit-v1`. Committing is not a red flag for it.

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/cost` numbers, counts) and set `S-CC-04` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 3. Run L-CC-04: large task: age-restricted products, Claude Code

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/claude-code/spec-kit/`. Two terminals, both **inside your rosetta checkout**: terminal 1 runs the agent, terminal 2 is for the other commands.

**Step 1. Variables** (paste into both terminals):

```bash
export SB="$(git rev-parse --show-toplevel)/rosetta-benchmarks/saleor"   # inside your rosetta checkout
export BENCH_DIR="$HOME/saleor-benchmark" ENV_DIR="$HOME/saleor-benchmark/envs/spec-kit"
export CLAUDE_CONFIG_DIR="$ENV_DIR/claude" B="$SB/scripts/bench.sh"
export RUN="$SB/runs/large-age-restriction/claude-code/spec-kit"   # this run's folder
[ -f "$SB/../BENCHMARKS.md" ] && echo "ok: $SB" || echo "ERROR: cd into your rosetta checkout and paste this block again"
```

**Step 2. Reset and open the report** (terminal 2):

```bash
nvm use 24
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag -f speckit-v1 baseline-v1 >/dev/null; done   # method tag = current baseline-v1
$B reset speckit-v1 && $B start && sleep 60 && $B health      # all three OK
cp -R "$ENV_DIR/root-claude-code/." "$BENCH_DIR/"      # Spec Kit files into the workspace root
rm -rf "$RUN" && mkdir -p "$RUN" && cp "$SB/templates/run-report-large.md" "$RUN/report.md"   # replaces an earlier run of this ID (commit it first)
sed -i '' -e 's|^run_id:.*|run_id: L-CC-04|' -e 's|^method:.*|method: spec-kit|' -e 's|^runner:.*|runner: claude-code|' \
  -e 's|^model:.*|model: claude-sonnet-5-5|' -e 's|^start_tag:.*|start_tag: speckit-v1|' -e 's|^setup_mark:.*|setup_mark: official|' "$RUN/report.md"
```

**Step 3. Isolation check** (terminal 2):

```bash
{ claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" 2>/dev/null || echo "(no skills dir)"
  for r in saleor saleor-dashboard react-storefront; do echo "$r: $(git -C "$BENCH_DIR/$r" tag --points-at HEAD | tr '\n' ' ')"; git -C "$BENCH_DIR/$r" status --porcelain; done
} 2>&1 | tee "$RUN/isolation.txt"
```

Expected: no plugins; no MCP servers; `speckit-v1` among each repo's tags; no `status` lines. Anything else: don't start, fix and reset. Paste it into report section 1. In the session, `/context` also lists about 17 skills bundled with Claude Code and, if `claude` runs in an IDE terminal, 2 `mcp__ide__*` tools: that is not a leak.

**Step 4. Start the agent** (terminal 1):

```bash
(
find "$CLAUDE_CONFIG_DIR/projects" -maxdepth 1 -name '*saleor-benchmark*' -exec rm -rf {} + 2>/dev/null || true
rm -rf "$BENCH_DIR/run-output"
cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5
)                                               # in a subshell: your terminal stays where it is
```

In the session: `/model` shows Sonnet 5.5, effort medium. `/` menu shows `speckit-specify`, `speckit-plan`, `speckit-tasks`, `speckit-implement`, `speckit-converge`. If not: `/exit`, reset, start again.

**When the checks pass: `/exit`, then start `claude` again WITHOUT the cleanup lines** (`find … rm -rf` and `rm -rf "$BENCH_DIR/run-output"` run only in the first start; running them again would delete the logs of this run): `(cd "$BENCH_DIR" && claude --dangerously-skip-permissions --model claude-sonnet-5-5)`. This is a NEW session (never `--continue`): its purpose is a clean context, with none of the checks in it. Send the task as the first message of that second session. Do not send the task before this restart.

**Step 5. Send the task (T0).** Paste this into the agent and write the time (T0) in the report timeline:

```text
/speckit-specify Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Step 6. At each stop reply exactly this** (each reply is a method step; answers to questions are not):

| The agent | You reply |
| --- | --- |
| `## Question [N]` tables after specify | one line per question: `Q<N>: Custom - <answer copied from the table>`, e.g. `Q1: Custom - They can't buy age-restricted products until they add a birthday in their account; the storefront tells them so. Everything else works as before.`, more questions |
| spec written | `/speckit-plan Use the existing stack and patterns of the three repositories: saleor (Python, Django, GraphQL), saleor-dashboard (React, TypeScript), react-storefront (Next.js, TypeScript). No new dependencies.` |
| plan written | `/speckit-tasks` |
| tasks written | `/speckit-implement` |
| "Some checklists have unchecked items … (yes/no)" | `yes` |
| implement finished | `/speckit-converge` |
| converge added tasks (no "✅ Converged") | `/speckit-implement`, then `/speckit-converge` again (usually not needed); expect 2+ rounds, count them |
| suggests clarify / checklist / analyze | `Continue with the next step.` |

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
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff speckit-v1`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

Spec Kit may commit by design, so the diff is taken against `speckit-v1`. Committing is not a red flag for it.

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

The folder must have `report.md`, `agent-report.md`, a `<repo>.diff` per changed repo, `isolation.txt`, `tokens.md`, `session/` (git-ignored), and `workspace-root/` if the method wrote files there. Fill the rest of the report (data block: times, `/cost` numbers, counts) and set `L-CC-04` to `done` in EXPERIMENTS.md. Then check that your run shows up and nothing is missing:

```bash
python3 "$SB/scripts/collect-results.py"                 # your run in the table; "Missing values" lists empty fields
```

## 4. Setup for Copilot (once)

> ⛔ **Not runnable yet:** Copilot runs need a Copilot seat with GPT-5.6 Terra; the current account has Copilot Free. These steps follow the method's docs and are **not verified**.

**Install and use:** `(cd "$HOME/saleor-benchmark/envs/spec-kit/root-copilot" && specify init --here --force --integration copilot --script sh --non-interactive)`; after every reset copy that folder into `~/saleor-benchmark`. Then the same `/speckit-*` commands.

VS Code profile with only the two Copilot extensions:

```bash
code --profile bench-spec-kit --install-extension GitHub.copilot --install-extension GitHub.copilot-chat
code --profile bench-spec-kit --list-extensions     # only these two
```

In that profile: Settings → permissions **Allow all** (`chat.permissions.default`), model picker **GPT-5.6 Terra** (not Auto), Copilot memory off. Tag:

```bash
for r in saleor saleor-dashboard react-storefront; do git -C "$HOME/saleor-benchmark/$r" tag -f speckit-v1 baseline-v1; done
```

## 5. Run S-CP-04: small task: product storage conditions, Copilot

Folder: `rosetta-benchmarks/saleor/runs/small-storage-conditions/copilot/spec-kit/`. Not verified (see part 4).

1. Reset as in the Claude Code run, step 2 (with `$RUN` set to this folder), then the Copilot-specific step from part 4.
2. Open the workspace: `code --profile bench-spec-kit "$HOME/saleor-benchmark"`, new chat, **Agent** mode, model GPT-5.6 Terra.
3. Send the task (T0):

   ```text
   /speckit-specify Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
   Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.
   
   Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
   ```

4. At each stop reply exactly as in the Claude Code run of this task (part 2, step 6).
5. T1, hidden-question check, follow-ups, T2, check the result, post-implementation prompt: as in part 2, steps 7–9. Usage = the session's premium-request counter instead of `/cost`.
6. Save: copy `~/saleor-benchmark/run-output/` into the run folder (no `session-usage.py` for Copilot).

## 6. Run L-CP-04: large task: age-restricted products, Copilot

Folder: `rosetta-benchmarks/saleor/runs/large-age-restriction/copilot/spec-kit/`. Not verified (see part 4).

1. Reset as in the Claude Code run, step 2 (with `$RUN` set to this folder), then the Copilot-specific step from part 4.
2. Open the workspace: `code --profile bench-spec-kit "$HOME/saleor-benchmark"`, new chat, **Agent** mode, model GPT-5.6 Terra.
3. Send the task (T0):

   ```text
   /speckit-specify Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
   Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
   To make this work, the customer profile should have a birthday field.
   
   Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
   ```

4. At each stop reply exactly as in the Claude Code run of this task (part 3, step 6).
5. T1, hidden-question check, follow-ups, T2, check the result, post-implementation prompt: as in part 3, steps 7–9. Usage = the session's premium-request counter instead of `/cost`.
6. Save: copy `~/saleor-benchmark/run-output/` into the run folder (no `session-usage.py` for Copilot).

## 7. One-time setup cost: `/speckit-constitution` (reported separately, not added to any run)

| Runner | Start | End | Operator | Notes |
| --- | --- | --- | --- | --- |
| Claude Code | | | | |
| Copilot | | | | |

Claude Code, paste raw (`/cost`, then `/usage`; per-agent tokens are in `spec-kit.setup-tokens.md`):

```text
```

Copilot, premium-request counter at the end of the setup session:

```text
```
