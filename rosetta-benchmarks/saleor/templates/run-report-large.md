---
# ── Data block: the only place for numbers. GitHub shows it as a table.
# Definitions, units and allowed values: templates/README.md. Leave a value empty if unknown; never guess.
schema: saleor-bench-run/v1
run_id:                    # L-CC-02, L-CP-06, … (EXPERIMENTS.md)
repetition: 1              # 1, 2, 3 … for repeated runs of the same cell
task: large-age-restriction
method:                    # baseline | grill-with-docs | superpowers | spec-kit | aws-ai-dlc | rosetta | rosetta-light
method_version:            # e.g. 3.1.13, v6.4.2, 447ca70
flow:                      # workflow actually used, e.g. coding-flow, coding-light-flow, specify-plan-tasks-implement, none
entry_command:             # exact text in front of the prompt, e.g. /grill-with-docs ; "none" for Baseline
runner:                    # claude-code | copilot | copilot-cli
runner_version:
setup_mark:                # official | copilot-cli | manual-port
model:                     # claude-sonnet-5-5 | gpt-6.1-sol
effort: medium
start_tag:                 # e.g. grill-v1
operator:
status:                    # done | not-qualifying | infra-fail | pilot
# Time: ISO 8601 local time, minute precision, e.g. 2026-10-20T14:05
t0:
t1:
t2:
setup_min:                 # one-time method setup, minutes (not part of the run)
# Usage at T1 (first "done") and at T2 (end). Copy from the runner; don't recompute.
t1_input_tokens:
t1_output_tokens:
t1_cache_read_tokens:
t1_cache_write_tokens:
t1_cost_usd:
t1_premium_requests:       # Copilot only
t2_input_tokens:
t2_output_tokens:
t2_cache_read_tokens:
t2_cache_write_tokens:
t2_cost_usd:
t2_premium_requests:       # Copilot only
context_end_pct:
subagents:                 # number of subagents launched (0 if none)
# Counts, taken from the timeline (section 2)
method_steps:
questions_total:
questions_hidden:
questions_extra:
followups:
retries:
# Hidden questions (section 3). asked + covered + missed = hidden_total
hidden_total: 9
hidden_asked:
hidden_covered:
hidden_missed:
hidden_matches_answer:     # how many of the 9 the final code follows the answer key (yes = 1, partly = 0.5)
# Outcome (sections 4–5)
done_checks_total: 12
done_checks_passed:
red_flags:                 # number of ticked red flags
tests_pass:                # yes | no (operator ran them at T2)
operator_score:            # 1–5, anchors in templates/README.md
operator_merge_ready:      # yes | no
# Filled later by the evaluator from the judge reports
verified_in_code:          # items verified in code / items checked (e.g. 8/9)
judge_absolute:            # /40
judge_side_by_side:        # /40
judge_merge_ready:         # yes | no
---

# Run report: <RUN_ID> · large task · <METHOD> · <RUNNER>

<!--
HOW TO USE
1. Copy to rosetta-benchmarks/saleor/runs/large-age-restriction/<runner>/<method>/report.md
   (repetition 2+: folder <method>.r2/, <method>.r3/ …). Everything of the run goes into that folder.
2. Fill the sections below DURING the run, top to bottom. Fill the data block at the top as numbers become known.
3. Facts only: paste exact outputs; don't round or recompute. Rules: BENCHMARKS.md, section 5.
-->

## 1. Pre-flight (all ticked before T0)

- [ ] `bench.sh reset <TAG>` → `start` → `health`: all three OK
- [ ] New agent session (no earlier chat or memory for this workspace)
- [ ] Isolation check passed: only the method under test (output below)
- [ ] All 3 repos on the method's tag and clean (`git status --porcelain` empty), after `start`
- [ ] Model and effort checked in the runner (not "auto")
- [ ] Full-access mode on (Claude Code `--dangerously-skip-permissions` / Copilot auto-approve)
- [ ] Method is active (its command is listed / it shows its workflow)
- [ ] BENCHMARKS.md section 4 open: hidden questions + extra answers

**Isolation check** (BENCHMARKS.md, section 3.5). Claude Code: skip the `code` line; Copilot: skip the `claude` lines.

```bash
claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" "$CLAUDE_CONFIG_DIR/agents" "$CLAUDE_CONFIG_DIR/commands" 2>/dev/null
code --profile bench-<method> --list-extensions
for r in saleor saleor-dashboard react-storefront; do git -C "$HOME/saleor-benchmark/$r" describe --tags; git -C "$HOME/saleor-benchmark/$r" status --porcelain; done
```

- Result: `<PASS / FAIL>` (FAIL = the run must not start: fix, reset, check again)
- Cause, if FAIL: `<...>`
- In-session `/skills` (Claude Code): `<only the method's skills / list>`

<details><summary>Isolation check output</summary>

```text
<paste>
```

</details>

## 2. Timeline

One row per event, in order. All counts in the data block come from this table.

Types: `prompt` · `method-step` · `question` (agent asked → your answer) · `T1` · `hidden-check` · `follow-up` · `T2` · `post-prompt` · `note` (crash, retry, Rosetta team contacted, …)

| # | Time | Type | What happened (short) | Exact text sent by the operator | Hidden # / extra |
| ---: | --- | --- | --- | --- | --- |
| 1 | `<HH:MM>` | prompt | Task prompt sent (T0) | `<entry command> Some of our products can only be sold to customers above a certain age …` | |
| 2 | | | | | |

**Usage by model** (Claude Code: from `tokens.md`, see below; Copilot: from the runner, if it shows it):

| Model | Role (main / subagent) | Input | Output | Cache read | Cache write | Cost, USD |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| | | | | | | |

Raw `/cost` output at T1 and T2: paste it into Appendix A at the end of this file.

**Claude Code: token breakdown + raw session logs** (run before the next reset):

```bash
python3 rosetta-benchmarks/saleor/scripts/session-usage.py \
  "$CLAUDE_CONFIG_DIR/projects/$(echo "$BENCH_DIR" | tr / -)" --t1 <T1, e.g. 2026-10-20T14:05> \
  --copy-to <RUN_DIR> --out <RUN_DIR>/tokens.md
```

It reads the session log Claude Code writes for every run and reports tokens per model, per agent (main + each subagent), per operator message, and tool / skill / subagent calls. Use its "By model" table for the table above.


## 3. Hidden questions

Mark: `asked` = agent asked before or during implementation · `covered` = not asked, but handled correctly (checked at T1) · `missed` = we had to send a follow-up.
Matches = the final code follows the answer in BENCHMARKS.md, section 4: `yes` / `partly` / `no`.

| # | Hidden question | Mark | Matches | Evidence (file:line, or agent's answer at T1) |
| ---: | --- | --- | --- | --- |
| 1 | Existing customers with no birthday | | | |
| 2 | Existing products unrestricted by default | | | |
| 3 | Schema migration only, no backfill | | | |
| 4 | Guest: can browse, can't buy restricted | | | |
| 5 | Lists / search / discounts / banners: visible with age label | | | |
| 6 | Marketing emails checked | | | |
| 7 | Legal policies flagged for review | | | |
| 8 | Birthday boundary + shop time zone | | | |
| 9 | PII: only customer + super-admin see birthday; audit log | | | |

## 4. Done when: checked by the operator at T2

Check it yourself; don't rely on the agent's report. Use the field names the agent chose. Test customers: `populatedb` customers have the password `password`; set their birthdays in the dashboard (adult, turns the age **today**, one day too young, none).

```bash
API=localhost:8000/graphql/
tok() { curl -s $API -H 'Content-Type: application/json' \
  --data "{\"query\":\"mutation{tokenCreate(email:\\\"$1\\\",password:\\\"$2\\\"){token}}\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["tokenCreate"]["token"])'; }
ADMIN=$(tok admin@example.com admin)
YOUNG=$(tok <underage-customer-email> password)

# Backend blocks checkout, not only the UI: create a checkout with a restricted variant as the underage
# customer, then try checkoutComplete. Expected: an error, no order.
curl -s $API -H 'Content-Type: application/json' -H "Authorization: Bearer $YOUNG" \
  --data '{"query":"mutation{ checkoutCreate(input:{channel:\"default-channel\", lines:[{quantity:1, variantId:\"<RESTRICTED_VARIANT_ID>\"}]}){ checkout{id} errors{field code message} } }"}'

# PII: the birthday must not be readable without a token or by a support-staff token
curl -s $API -H 'Content-Type: application/json' \
  --data '{"query":"{ user(email:\"<customer-email>\"){ <BIRTHDAY_FIELD> } }"}'

# Backend tests for the changed area
docker compose -p saleor-benchmark -f "$BENCH_DIR/saleor/.devcontainer/docker-compose.yml" \
  exec -T -w /app saleor pytest <changed-test-files> -q
```

| # | Check | Pass? | How checked (command / UI steps) | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | Customer birthday field exists (customer account, API, dashboard) | | | |
| 2 | Staff can set and see a minimum age per product in the dashboard | | | |
| 3 | **Backend** blocks checkout: underage customer | | | |
| 4 | **Backend** blocks checkout: customer with no birthday | | | |
| 5 | **Backend** blocks checkout: guest with a restricted product | | | |
| 6 | Customer who turns the age **today** can buy | | | |
| 7 | Adult customer can buy a restricted product | | | |
| 8 | Unrestricted products work as before for everyone | | | |
| 9 | Storefront shows the restriction (list + product page) and explains why buying is blocked | | | |
| 10 | Birthday not readable without a token, nor by support staff | | | |
| 11 | Tests pass locally (backend + changed frontends) | | `<commands + pass/fail counts>` | |
| 12 | No manual cleanup needed (no junk files, no debug code) | | | |

## 5. Red flags

Tick every one you see; one line of evidence each.

- [ ] Logic only in the UI, not enforced in the backend
- [ ] Model changed but no migration, or the migration fails on a clean DB
- [ ] GraphQL schema / dashboard codegen not updated
- [ ] Tests skipped, deleted, weakened or marked `xfail` to pass
- [ ] Tests written but never run by the agent
- [ ] Unrelated files changed or refactored
- [ ] Leftovers: debug prints, commented-out code, TODOs, temp files
- [ ] New dependency without need
- [ ] Agent said "done" while something was clearly broken
- [ ] Agent committed or pushed
- [ ] Other: `<...>`

Evidence: `<one line per ticked item>`

## 6. Agent's claims vs reality (from `agent-report.md`)

| Action | Agent says | Operator confirms |
| --- | --- | --- |
| Wrote tests | | |
| Ran tests | | |
| Ran linters / type checks | | |
| Started the app / called the API | | |
| Checked the UI / screenshot | | |
| Cleaned up leftovers | | |

## 7. Artifacts (all in this folder)

- [ ] `<repo>.diff` for every changed repo (repos: `<...>`)
- [ ] `agent-report.md`: the agent's own report (post-implementation prompt)
- [ ] `tokens.md` (Claude Code): token breakdown from `session-usage.py`. Raw session logs stay local in `session/` (git-ignored)
- [ ] Appendix A below: raw `/cost` output at T1 and T2
- [ ] Appendix B below: agent messages copied from the terminal, if any
- [ ] Workspace-root files the method wrote (e.g. `CONTEXT.md`, `docs/`), if any: `workspace-root/`

## 8. Notes

- Deviations from the protocol, and why: `<none / ...>`
- Rosetta team contacted (Rosetta and Rosetta Light runs only): `<n/a / no / yes: when, why, outcome>`
- Strong point of the method in this run: `<...>`
- Weak point of the method in this run: `<...>`

## Appendix A. Raw `/cost` output

<details><summary>T1 and T2, exactly as the runner shows them</summary>

```text
## T1
<paste>

## T2
<paste>
```

</details>

## Appendix B. Agent messages copied from the terminal

Only messages worth keeping word for word (the "done" message, the answer to the hidden-question check, notable snapshots). One `<details>` block each.
