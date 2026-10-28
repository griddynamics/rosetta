---
# ── Data block: the only place for numbers. GitHub shows it as a table.
# Definitions, units and allowed values: templates/README.md. Leave a value empty if unknown; never guess.
schema: saleor-bench-run/v1
run_id: S-CC-03
task: small-storage-conditions
method: superpowers
method_version: v6.4.2 (8ca22dba)
flow: brainstorming -> writing-plans -> executing-plans (native) + test-driven-development
entry_command: none (plain prompt, see section 8)
runner: claude-code
runner_version: 
setup_mark: official
model: claude-sonnet-5-5
effort: medium
start_tag: superpowers-v1
operator: agavrilita (with Claude AI assistance, see section 8)
status: done
# Time: ISO 8601 local time, minute precision, e.g. 2026-10-20T14:05
t0: 2026-10-19T14:51
t1: 2026-10-19T15:27
t2: 2026-10-19T15:45
setup_min:                 # one-time method setup, minutes (not part of the run)
# Usage at T1 (first "done") and at T2 (end). Copy from the runner; don't recompute.
t1_input_tokens: 4900
t1_output_tokens: 94600
t1_cache_read_tokens: 26000000
t1_cache_write_tokens: 252200
t1_cost_usd: 6.76
t1_premium_requests:       # Copilot only
t2_input_tokens: 7400
t2_output_tokens: 114100
t2_cache_read_tokens: 35700000
t2_cache_write_tokens: 290900
t2_cost_usd: 8.08
t2_premium_requests:       # Copilot only
context_end_pct:
subagents:                 # number of subagents launched (0 if none)
# Counts, taken from the timeline (section 2)
method_steps: 5
questions_total: 1
questions_hidden: 1
questions_extra: 0
followups: 1
retries: 0
# Hidden questions (section 3). asked + covered + missed = hidden_total
hidden_total: 7
hidden_asked: 1
hidden_covered: 5
hidden_missed: 1
hidden_matches_answer:     # how many of the 7 the final code follows the answer key (yes = 1, partly = 0.5)
# Outcome (sections 4–5)
done_checks_total: 8
done_checks_passed: 7
red_flags:                 # number of ticked red flags
tests_pass: yes # yes | no (operator ran them at T2)
operator_score: 3
operator_merge_ready:      # yes | no
# Filled later by the evaluator from the judge reports
verified_in_code:          # items verified in code / items checked (e.g. 6/7)
judge_total: 66.7               # diff score: total + bonus, from the totals script
judge_bonus: 0.75               # bonus points for fixed bugs and related improvements
judge_blockers: 2            # number of blocker findings
judge_majors: 1              # number of major findings
judge_minors: 2              # number of minor findings
judge_strengths: 1           # number of strengths
judge_merge_ready_advice: no  # none | no | yes — the judge's advice; operator_merge_ready stays the operator's decision
---

# Run report: S-CC-03 · small task · superpowers · claude-code

<!--
HOW TO USE
1. Copy to rosetta-benchmarks/saleor/runs/small-storage-conditions/<runner>/<method>/report.md
   Everything of the run goes into that folder. A new run of the same ID replaces it (commit the old one first).
2. Fill the sections below DURING the run, top to bottom. Fill the data block at the top as numbers become known.
3. Facts only: paste exact outputs; don't round or recompute. Rules: BENCHMARKS.md, section 5.
-->

## 1. Pre-flight (all ticked before T0)

- [x] `bench.sh reset superpowers-v1` → `start` → `health`: all three OK
- [x] New agent session (old session history deleted before the run; the first message of the session is the task prompt)
- [x] Isolation check passed: only the method under test (output below)
- [ ] All 3 repos on the method's tag and clean (`git status --porcelain` empty), after `start`: **not clean.** Tags correct (`baseline-v1 superpowers-v1`); after `start` the dashboard had 5 modified generated files and the storefront `CLAUDE.md` 1 change (Next.js agent rules), written by the dev servers
- [x] Model and effort checked in the runner: launched with `--model claude-sonnet-5-5 --effort medium`
- [x] Full-access mode on (`--dangerously-skip-permissions`)
- [x] Method is active (`/skills` lists the 15 `superpowers:*` skills; the first answer loaded `brainstorming`)
- [x] BENCHMARKS.md section 4 open (older version of the document; see section 8)

**Isolation check.**

- Result: `PASS`
- In-session `/skills` (Claude Code): only the 15 `superpowers:*` skills; `/plugin`: superpowers + built-in `cc-plugin-*`

<details><summary>Isolation check output</summary>

```text
# isolation check 2026-10-19 14:00:14
CLAUDE_CONFIG_DIR=/Users/agavrilita/saleor-benchmark/envs/superpowers/claude (settings env ENABLE_CLAUDEAI_MCP_SERVERS=false; needed because claude.ai login attaches account connectors)
Installed plugins:

  ❯ superpowers@superpowers-dev
    Version: 6.4.2
    Read from: /Users/agavrilita/saleor-benchmark/envs/superpowers/superpowers-src
    Scope: user
    Status: ✔ enabled

No MCP servers configured. Use `claude mcp add` to add a server.
ls: agents: No such file or directory
ls: commands: No such file or directory
ls: skills: No such file or directory
saleor: tags=baseline-v1 superpowers-v1 
saleor-dashboard: tags=baseline-v1 superpowers-v1 
react-storefront: tags=baseline-v1 superpowers-v1 

# In-session check (operator paste, after switching to CLAUDE_CODE_OAUTH_TOKEN login), 2026-10-19
/skills: 15 x superpowers:* (brainstorming, diagnosing-superpowers, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills); nothing else.
/plugin: superpowers (superpowers-dev, 15 skills) + built-in cc-plugin-agents-md, cc-plugin-diff, cc-plugin-plugin-authoring, cc-plugin-sec-default, cc-plugin-telemetry.
# Earlier attempt with claude.ai account login was contaminated by 15 synced gd-* plugins + 9 "claude.ai sync" skills; discarded, session deleted.
```

</details>

## 2. Timeline

One row per event, in order. All counts in the data block come from this table. Times are local (EEST, 2026-10-19), taken from the session log. The session log itself is **not available**: the cleanup before the next run deleted it (see section 8).

Types: `prompt` · `method-step` · `question` (agent asked → your answer) · `T1` · `hidden-check` · `follow-up` · `T2` · `post-prompt` · `note` (crash, retry, Rosetta team contacted, …)

| # | Time | Type | What happened (short) | Exact text sent by the operator | Hidden # / extra |
| ---: | --- | --- | --- | --- | --- |
| 1 | `14:43` | prompt | Task prompt sent (real T0 14:43:55 in the session log; the data block uses the effective start 14:51, see section 8). `superpowers:brainstorming` loaded 3 s later, by itself | `Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C"). Staff should be able to set it … (plain prompt, no entry command)` |  |
| 2 | `14:45` | question | Agent assumed plain text, optional, product level; asked: translatable? (A untranslated / B translatable) | `Yes. It is translatable the same way as the product name and description. The storefront shows the translation when there is one.` | hidden 2 |
| 3 | `14:47` | method-step | Backend design (part 1 of 3), agent asks "does this look right" (it chose CharField(250)) | `Approved, continue.` |  |
| 4 | `14:48` | method-step | Dashboard + storefront design (parts 2 and 3) | `Approved, continue.` |  |
| 5 | `14:49` | method-step | Spec written to the workspace root (14:48), spec review | `Approved, continue.` |  |
| 6 | `14:52` | method-step | Plan written; asks Subagent-driven vs Native (recommends Native); then loads executing-plans + test-driven-development | `use your recommendation` |  |
| 7 | `15:27` | T1 | Agent's first "done" (last agent message 15:27:13). Caveats: no `productBulkCreate` test, whitespace-only stored as sent. `/cost` at T1 ~15:29: $6.76 (Appendix A) |  |  |
| 8 | `15:31` | hidden-check | Hidden-question check sent 4 min after T1 (wording older than the guide's, #1 to #7 minus #2) | `Don't change any code, just answer: was each of these handled, and where? 1. Plain text or rich text? Maximum length? 2. Product level or variant level? 3. Where is it shown? (cart, checkout, order emails, storefront product page, ...) 4. What happens to existing products? 5. Import/export, webhooks, API filters? 6. Who can edit it, and who can read it?` |  |
| 9 | `15:34` | note | Operator accidentally pasted the header of Claude's mapping table ("The numbers map to the hidden questions like this: \| Check # \| Hidden question \|", no answers) into the session | `(accidental paste)` |  |
| 10 | `15:35` | hidden-check | The same hidden-question check sent a second time; the agent answered both (first answer 15:31–15:34 is the one scored) | `Don't change any code, just answer: was each of these handled, and where? (same list)` |  |
| 11 | `15:40` | follow-up | Follow-up 1 for hidden #6: product webhook payload and CSV export omitted the field. Agent proposed a design (selectable export column, `PRODUCT_FIELDS`) | `It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export. No filter or search by this field is needed.` | hidden 6 (missed) |
| 12 | `15:41` | method-step | Agent: "Does that match what you mean by included in the CSV export?" | `Yes, implement it` |  |
| 13 | `15:45` | T2 | Agent finished the follow-up (last agent message 15:45:42; operator reported 15:48). `/cost` at T2 ~15:46: $8.08 |  |  |
| 14 | `15:50` | post-prompt | Post-implementation prompt sent (older wording: diffs of the working tree against HEAD into `diffs/<task>/…`, moved to this folder) | `Do not commit anything. For every repository you changed, run git add -N . and then git diff, and save it …` |  |

**Usage by model** (T2 `/cost`; token counts are the runner's `/cost` numbers; `tokens.md` is a reduced file built from them). The token fields of the data block use the `claude-sonnet-5-5` line of `/cost` (main model, as displayed: rounded to 0.1k / 0.1m); the Opus reviewer is not included in them:

| Model | Role (main / subagent) | Input | Output | Cache read | Cache write | Cost, USD |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| claude-sonnet-5-5 | main | 7.4k | 114.1k | 35.7m | 290.9k | 5.89 |
| claude-opus-5-5 | subagent (final reviewer, most capable model) | 25.9k | 25.4k | 4.9m | 120.0k | 2.19 |
| claude-haiku-5-5 | runner-internal | 1.3k | 17 | 0 | 0 | 0.0001 |

At T1 (`/cost`): $6.76, of which Sonnet $4.56, Opus $2.19. Raw `/cost` output at T1 and T2: Appendix A.

## 3. Hidden questions

Mark: `asked` = agent asked before or during implementation · `covered` = not asked, but handled correctly (checked at T1) · `missed` = we had to send a follow-up.
Matches = the final code follows the answer in BENCHMARKS.md, section 4: `yes` / `partly` / `no`. **Matches is left empty:** the per-requirement result was not recorded by the operator (section 4); the evidence column cites the saved diff and the agent's answer at T1.

| # | Hidden question | Mark | Matches | Evidence (file:line, or agent's answer at T1) |
| ---: | --- | --- | --- | --- |
| 1 | Plain text, max 250 chars | covered | | `saleor.diff:1028,1036` `CharField(max_length=250, blank=True, null=True)` on Product and ProductTranslation; agent at T1: plain text, 250, INVALID error on create/update/translate/bulk translate, single-line dashboard input (stated as an assumption in its first reply) |
| 2 | Translatable | asked | | Answered by the operator (timeline #2) |
| 3 | Product level, not variant | covered | | Agent at T1: product level only, no variant field (stated assumption) |
| 4 | Shown only on the product page | covered | | Agent at T1: only the storefront description section and the dashboard (product + translations pages); not in cart, checkout, order lines, emails, listing cards, search, SEO |
| 5 | Existing products: empty, schema migration only | covered | | `saleor/product/migrations/0211_product_storage_conditions.py` (nullable columns, no backfill); agent: existing products show nothing |
| 6 | In API, webhook payload, CSV export; no filter | missed | | At T1 the agent said product webhook payload and CSV export omit it "by omission". After follow-up 1: `saleor/webhook/payloads.py` (`"storage_conditions"` in `PRODUCT_FIELDS`), `saleor/csv/utils/__init__.py` (`"storage conditions": "storage_conditions"`), `saleor/graphql/csv/enums.py` (`STORAGE_CONDITIONS`), plus tests |
| 7 | Edit permission `MANAGE_PRODUCTS` | covered | | Agent at T1: edit uses existing `MANAGE_PRODUCTS` (create/update) and `MANAGE_TRANSLATIONS` (translate); anyone can read; no new permission. The diff changes no permission code (inherited) |

First-pass coverage (asked + covered): 6 of 7.

## 4. Done when: checked by the operator at T2

**Operator result, as reported by the operator: 7 of 8 checks passed, 1 did not pass.** The per-row results (which check failed, how each was checked and the evidence) were not recorded, so the rows below are left empty. Tests (check 7) and merge-ready were not reported, so `tests_pass` and `operator_merge_ready` in the data block stay empty. The stack no longer holds this run's code (it was reset to `superpowers-v1` for the next run), so the checks cannot be repeated now; the code survives as the saved diffs.

What the agent reported (not verified by the operator): backend 3,674 tests in the csv/webhook/graphql suites and an earlier 244-test translations suite passed, ruff clean; dashboard 792 products/translations/lock-schema tests, tsc, tsc-strict and eslint clean; the full dashboard Jest run was flaky under load; the storefront suite was not re-run after the follow-up.

| # | Check | Pass? | How checked (command / UI steps) | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | Staff can **set** it in the dashboard and it is saved | | | |
| 2 | Staff can **edit** and **clear** it | | | |
| 3 | Stored in the backend, readable through the API | | | |
| 4 | Storefront shows it when set | | | |
| 5 | Storefront shows nothing extra when empty | | | |
| 6 | Existing products open and work as before | | | |
| 7 | Tests pass locally (backend + changed frontends) | | | |
| 8 | No manual cleanup needed (no junk files, no debug code) | | | |

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

Not assessed by the operator (see section 4); nothing ticked. Visible in the saved diffs: the storefront `CLAUDE.md` change (10 lines) was written by `next dev`, not by the agent; the dashboard diff (39 files, +4756/−2575) includes generated GraphQL files that were already modified before T0 (the agent counts its own part as 33 files, +639/−31).

## 6. Agent's claims vs reality (from `agent-report.md`)

The operator did not verify these (see section 4). Agent's own report, in short:

| Action | Agent says | Operator confirms |
| --- | --- | --- |
| Wrote tests | see `agent-report.md` | not verified |
| Ran tests | yes (backend suites, dashboard Jest, storefront in the first pass) | not verified |
| Ran linters / type checks | yes (ruff, tsc, tsc-strict, eslint) | not verified |
| Started the app / called the API | the application was already running; live checks as reported in the first pass | not verified |
| Checked the UI / screenshot | no browser check of the export dialog | not verified |
| Cleaned up leftovers | partly (scratch files remain in the session scratchpad) | not verified |

## 7. Artifacts (all in this folder)

- [x] `<repo>.diff` for every changed repo (repos: `saleor`, `saleor-dashboard`, `react-storefront`). Taken with the older post-prompt: `git diff` of the working tree against HEAD, so the dev-server noise is included
- [x] `agent-report.md`: the agent's own report (post-implementation prompt)
- [x] `tokens.md` (Claude Code): **reduced version**, per model only, built from the three `/cost` readings (not from `session-usage.py`: the raw session log was deleted before the script was run, so the per-agent, per-message and tool breakdowns are missing)
- [x] Appendix A below: raw `/cost` output at T1 and T2
- [x] Appendix B below: agent messages copied from the terminal
- [ ] `plan.md` (Baseline): n/a
- [x] Workspace-root files the method wrote: `workspace-root/docs/superpowers/{specs,plans}/` (spec and plan; for this run they were written to the workspace root, outside the repos)
- [x] `isolation.txt`

## 8. Notes

- Deviations from the protocol, and why:
- **Run predates the Superpowers guide.** `saleor/methods/superpowers.md` (committed 2026-10-21 10:18, after this run) defines `/superpowers:brainstorming <task>` as the T0 command ("team decision, for repeatable results"). This run sent the plain task prompt (no entry command). Superpowers still loaded `brainstorming` by itself, 1 to 3 seconds after the prompt (session log), see timeline.
- **Replies not as in the guide / rules.** The rules (BENCHMARKS.md §5, guide step 6) say answers come from the tables and never "use your recommendation"; the guide also lists fixed replies per stop. This run used the phrases listed in the timeline (not always the fixed ones).
- **Execution approach.** The agent recommended Native and used it (executing-plans + test-driven-development). The guide's fixed reply for architectural tasks is `Approved. Subagent-driven.`.
- **Hidden-question check wording** differs from the guide's version (older wording, listed in the timeline).
- **Operator.** The programmer sent every message, but Claude (AI) advised which answer or phrase to send at most stops and prepared this report. BENCHMARKS.md §3.5 says "no human-side AI".
- **Older environment.** Repos at the old `baseline-v1` / `superpowers-v1` tags from before the setup fixes of 2026-10-21 (for example "setup puts dashboard codegen output into baseline-v1"; so the dashboard schema and generated files were already modified at T0), old `bench.sh`, config dir with only `ENABLE_CLAUDEAI_MCP_SERVERS=false` (no common `settings.json`), login with a `claude setup-token` token (the first claude.ai login pulled in 15 synced org plugins, 9 org skills and ~40 connector MCP servers; that environment was discarded). `/skills` and `/plugin` in the session showed only the 15 `superpowers:*` skills and the 5 built-in `cc-plugin-*`.
- **Reviewer subagents ran on a stronger model than the session.** Superpowers dispatches its final reviewer "on the most capable model" (`skills/executing-plans/SKILL.md:357`): here `claude-opus-5-5`, while the session model is Sonnet 5.5.
  - **Session log lost.** A cleanup done before the next run deleted `$CLAUDE_CONFIG_DIR/projects/*saleor-benchmark*` before `session-usage.py` had been run for this run. So there is no `session/` and no `session-usage.py` breakdown: `tokens.md` is a reduced, per-model file built from the `/cost` readings, and the token fields of the data block use the `/cost` Sonnet line. Timeline times come from the session log read before it was deleted.
  - **T0 corrected from the log.** The operator first reported T0 as 14:53; the session log showed the prompt at 14:43:55.
  - **Time without the operator's gaps (BENCHMARKS.md, "Time without the operator's gaps").** Real T0 14:43:55, T1 15:27:13: first pass 43m 18s. The agent was blocked waiting for the operator before T1: 14:44:11→14:45:50 (1m 39s), 14:46:03→14:47:22 (1m 19s), 14:47:34→14:48:42 (1m 08s), 14:48:51→14:49:38 (0m 47s), 14:50:18→14:52:41 (2m 23s); total 7m 16s. Gap-free first pass = 43m 18s − 7m 16s = 36m 02s, so `t0` in the data block is the effective start, T1 − 36m 02s = 14:51; `t1` (15:27) and `t2` (15:45) are real. After T1 and before T2 the agent was blocked by the operator for another 13m 26s (15:27:13→15:31:34 4m 21s; 15:31:51→15:34:41 2m 50s; 15:34:45→15:35:07 0m 22s; 15:35:13→15:40:03 4m 50s; 15:40:34→15:41:37 1m 03s); that time is inside `t2 − t0`. The waits were read from the session log before it was deleted.
  - **Tests (check 7):** passed, reported by the operator on 2026-10-21 via Oleksii Poletaiev (`tests_pass: yes`); commands and counts not recorded.
  - **Operator checks (section 4):** 7 of 8 passed according to the operator; the per-row detail was not recorded, and `tests_pass` and `operator_merge_ready` were not reported.
  - **Operator score 3** (works with notable gaps), given by the operator: the first follow-up showed that a large part of the requirements had not been handled, and the cost weighed in. Cost is not part of the score anchors in `templates/README.md`.
  - **`/context` at T2** was not taken (`context_end_pct` empty); `subagents` not counted (the Opus reviewer ran as a subagent; the `/cost` skills panel shows `general-purpose` at 18%).
- Rosetta team contacted (Rosetta and Rosetta Light runs only): n/a
- Strong point of the method in this run: (to be given by the operator)
- Weak point of the method in this run: (to be given by the operator)

## Appendix A. Raw `/cost` output

<details><summary>T1 and T2, exactly as the runner shows them</summary>

```text
## T1 (taken ~15:29, 2 min after the agent's first "done")
Session

   Total cost:            $6.76
   Total duration (API):  21m 7s
   Total duration (wall): 46m 47s
   Total code changes:    136 lines added, 0 lines removed
   Usage by model:
       claude-haiku-5-5:  1.3k input, 17 output, 0 cache read, 0 cache write ($0.0001)
      claude-sonnet-5-5:  4.9k input, 94.6k output, 26.0m cache read, 252.2k cache write ($4.56)
        claude-opus-5-5:  25.9k input, 25.4k output, 4.9m cache read, 120.0k cache write ($2.19)
   Prompt cache (main):   150 requests · 99% of input tokens from cache · no misses · warm (1h TTL, last activity 2m 5s ago)

   What's contributing to your limits usage?
   Approximate, based on local sessions on this machine — does not include other devices or claude.ai

   Last 24h · these are independent characteristics of your usage, not a breakdown

   100% of your usage came from subagent-heavy sessions
   57% of your usage was at >150k context
   22% of your usage came from subagents under "general-purpose"

## T2 (taken ~15:46, ~1 min after the last follow-up was done)
Session

   Total cost:            $8.08
   Total duration (API):  23m 59s
   Total duration (wall): 1h 4m 15s
   Total code changes:    136 lines added, 0 lines removed
   Usage by model:
       claude-haiku-5-5:  1.3k input, 17 output, 0 cache read, 0 cache write ($0.0001)
      claude-sonnet-5-5:  7.4k input, 114.1k output, 35.7m cache read, 290.9k cache write ($5.89)
        claude-opus-5-5:  25.9k input, 25.4k output, 4.9m cache read, 120.0k cache write ($2.19)
   Prompt cache (main):   178 requests · 99% of input tokens from cache · no misses · warm (1h TTL, last activity 1m 4s ago)

   Last 24h: 100% of usage from subagent-heavy sessions; 65% at >150k context; 18% from subagents under "general-purpose"
   Skills: /superpowers:test-driven-development 4%, /superpowers:writing-plans 1%, /superpowers:brainstorming 1%
   Subagents: general-purpose 18%
   Plugins: superpowers 6%
```

`/usage` was pasted together with `/cost` (the panels above); no separate `/usage` output.

## After the post-implementation prompt (read the next morning; the operator's own note, not T1/T2)

```text
   Total cost:            $8.40
   Total duration (API):  24m 49s
   Total duration (wall): 20h 40m 47s
   Total code changes:    194 lines added, 0 lines removed
   Usage by model:
       claude-haiku-5-5:  1.3k input, 17 output, 0 cache read, 0 cache write ($0.0001)
      claude-sonnet-5-5:  11.5k input, 120.0k output, 37.9m cache read, 298.8k cache write ($6.21)
        claude-opus-5-5:  25.9k input, 25.4k output, 4.9m cache read, 120.0k cache write ($2.19)
   Prompt cache (main):   183 requests · 99% of input tokens from cache · no misses · cold — idle 19h 32m 2s, next turn re-caches ~321.4k tokens
```

The post-implementation prompt added about $0.32 ($8.40 − $8.08). It is not part of T2. The T2 values above are the ones used in the data block.

</details>

## Appendix B. Agent messages copied from the terminal

<details><summary>Hidden-question check: the agent's answer at T1 (first reply, 15:31-15:34), word for word (operator paste)</summary>

> Three of these were handled, either as assumptions I stated or by inheriting existing behaviour. Three were not decided at all, and I should have raised them.
>
> 1. Plain text or rich text? Maximum length? Handled.
> - It's plain text, up to 250 characters, a CharField(250) like product name. This was one of the assumptions I wrote back before the design, and you didn't contradict it.
> - The 250-character limit is tested on productCreate, productUpdate, productTranslate and productBulkTranslate. All four return an INVALID validation error.
> - The dashboard shows it as a single-line input.
>
> 2. Product level or variant level? Handled, as a stated assumption.
> - It's product level only. The field is on Product and ProductTranslation, with nothing on variants.
>
> 3. Where is it shown? Only partly.
> - It appears in the storefront product description section and in the dashboard product and translations pages.
> - It does not appear in the cart, checkout, order lines, order emails, listing cards, search results or SEO and JSON-LD data.
> - You only asked for the product description, so I stopped there and never asked about the rest. For refrigerated goods you may want it in the cart or on order confirmations, so that's worth a decision from you.
>
> 4. What happens to existing products? Handled implicitly, not discussed.
> - The migration adds two nullable columns and doesn't backfill. Existing products have no value, the storefront hides the block, and the dashboard shows an empty input.
> - I applied the migration to the local dev database and checked an existing product there.
> - I haven't tested it against a large table. A nullable column with no default should be a quick change on Postgres.
>
> 5. Import/export, webhooks, API filters? Mostly not decided.
> - Translation webhooks: the translation created and updated payloads include the field, through get_translated_keys.
> - Product webhooks and CSV export: the legacy product webhook payload and the CSV export don't include it, the same as the SEO fields. That happened by omission, not by a decision. If integrations or merchants need it, it has to be added.
> - Filters and search: there's no filter, sort or search on it.
> - productBulkCreate: the reviewer says it inherits the field and reports the length error correctly. I haven't tested it, and I haven't checked productBulkUpdate.
>
> 6. Who can edit it, and who can read it? Inherited, with no new permissions.
> - Edit: it uses the existing permissions. MANAGE_PRODUCTS covers create and update, and MANAGE_TRANSLATIONS covers productTranslate and productBulkTranslate. The tests run with those permissions.
> - Read: Product.storageConditions is a plain field like name and description, so anyone who can query the product can read it, including anonymous storefront visitors. The live storefront check confirmed that.
> - Translation management: the translatable-content query (translation(kind: PRODUCT)) requires MANAGE_TRANSLATIONS, which is the existing behaviour.
> - I added no field-level permission and no explicit test for anonymous reads.

</details>

<details><summary>The agent's message at T2 (15:45), word for word (operator paste)</summary>

> Product webhook payloads and the CSV export now include storage conditions, and all the relevant tests and checks pass.
>
> Backend (saleor)
>
> - Webhooks: storage_conditions is now in the product payloads for created, updated and deleted events. It is null when unset. Subscription-style webhooks already had it through the Product type.
> - CSV and XLSX export: there is a new selectable column, ProductFieldEnum.STORAGE_CONDITIONS (storage conditions), tagged as added in Saleor 3.23. It exports the base value, not a translation, and existing exports are unchanged. The schema and CHANGELOG are updated.
> - Tests: payload tests for a value, an unset value and the deleted event, a header-mapping test, get_products_data with the field, and a CSV export test.
>
> Dashboard (saleor-dashboard)
>
> - The product export dialog has a "Storage conditions" checkbox next to Description. It only shows on the main schema, so staging builds, which don't have the enum value yet, never send it.
> - I regenerated the schema and types, extracted the new message, and updated the changeset. Tests cover the field list in both schema modes and the label.
>
> Verification
>
> - Backend: I ran the csv, webhook, graphql csv and graphql product suites (3,674 passed). Ruff check and format are clean, and the schema file is up to date.
> - Dashboard: I ran the products, translations and lock-schema tests (792 passed). tsc, tsc-strict and eslint (0 errors) are clean.
> - Not re-run: I didn't re-run the storefront or the full dashboard suite, because neither changed beyond the export dialog.
>
> You said no filter or search is needed, so I added none. I haven't opened the export dialog in a browser to check that the checkbox looks right.

</details>
