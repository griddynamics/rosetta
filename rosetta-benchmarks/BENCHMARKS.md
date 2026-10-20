# Saleor benchmark

Compare seven AI coding approaches on one real e-commerce platform (Saleor: core API, dashboard, storefront), on two tasks, in two agent runners: **7 methods × 2 runners × 2 tasks = 28 runs**. The full run list is in [saleor/EXPERIMENTS.md](./saleor/EXPERIMENTS.md).

A run counts only if the result is merge-ready, not a draft that needs cleanup.

## 1. Methods

| # | Method | What is installed for the run |
| ---: | --- | --- |
| 1 | Baseline | Only the shared team rules file (see 3.3). No method, no plugins. Runs start in the runner's built-in plan mode (see 5, "Method steps"). Guide: [saleor/methods/baseline.md](./saleor/methods/baseline.md) |
| 2 | Grill-with-docs | [mattpocock/skills `grill-with-docs`](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs) ([docs](https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md)) at commit `447ca70872026d5b79d6073a546dac082117fed7` (2026-08-15) |
| 3 | Superpowers | [obra/superpowers](https://github.com/obra/superpowers) **v6.4.2** (2026-09-25) |
| 4 | Spec Kit | [github/spec-kit](https://github.com/github/spec-kit) **v1.0.13** (2026-09-29) + one constitution per repo |
| 5 | AWS AI-DLC | [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) **v2.10.0** (2026-09-24) |
| 6 | Rosetta | Plugin `rosetta` **3.1.13** only |
| 7 | Rosetta Light | Plugin `rosetta-light` **3.1.13** only |

Versions were chosen on 2026-10-15 as the newest stable release at least two weeks old. Newer releases (Superpowers v7.0.0, Spec Kit v1.1.x–v1.2.0, AI-DLC v2.11.x) are too fresh, and the AI-DLC v2.11.1 builds are previews. Do not update any method during the study.

Methods 1–6 come from the presentation slide "Six approaches, one more if time allows". BMAD-METHOD is optional (one task, if time allows) and not part of the 28. GSD is not run (archived upstream in May 2026).

**Isolation:** every method runs alone, with no help from any other AI. See 3.5, "Each method runs in a vacuum".

## 2. Runners, models, permissions

| Runner | Model | Effort |
| --- | --- | --- |
| Claude Code | Sonnet 5.5 (`claude-sonnet-5-5`) | medium |
| GitHub Copilot (VS Code) | GPT-6.1 Sol | medium |

- No other agent products (Codex, Cursor, API scripts, …).
- Automatic model switching / Auto model selection is OFF.
- The two runners use different models, so a Claude Code vs Copilot difference is a product + model difference. Methods are compared **within** one runner.
- **Full-access (YOLO) mode, sandbox disabled**, so permission prompts don't affect the test: Claude Code `claude --dangerously-skip-permissions`; Copilot `chat.tools.autoApprove: true` with terminal confirmations off. Baseline starts in plan mode instead and switches to full access when the plan is approved: Claude Code `claude --allow-dangerously-skip-permissions --permission-mode plan`, approved with "Yes, and bypass permissions"; Copilot: the chat's Plan mode (see [saleor/methods/baseline.md](./saleor/methods/baseline.md)). **This is not normal usage. Use it only for this test**, only in disposable benchmark clones with synthetic data, and revert it after the study.

## 3. Environment setup (once)

Everything is done by one script: [saleor/scripts/bench.sh](./saleor/scripts/bench.sh). Don't type the setup or reset commands by hand.

### 3.1 Tools (macOS)

Git, Docker Desktop (running), Node.js 24 + Corepack.

```bash
brew install git
brew install --cask docker
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh && nvm install 24 && nvm use 24 && corepack enable
```

Run `nvm use 24` in every new terminal before the script; it stops with a hint if Node isn't 24.

### 3.2 Run the setup script

```bash
B=<rosetta-repo>/rosetta-benchmarks/saleor/scripts/bench.sh
$B setup     # once, about 2 minutes (longer the first time Docker builds the image)
$B start     # backend API :8000, storefront :3000, dashboard :9000, in the background
$B health    # all three must say OK (wait ~1 minute after start)
$B stop      # when you're done
```

Repos go to `$HOME/saleor-benchmark`. To use another folder, set `BENCH_DIR`, e.g. `BENCH_DIR=~/work/saleor-benchmark $B setup`. Dev server logs are in `$BENCH_DIR/logs/`.

What `setup` does:

1. Downloads the three repos at pinned commits that work together (current `main` branches don't): `saleor` 3.23.41 (`28a1227b…`), `saleor-dashboard` 3.23.39 (`bc75e988…`), `react-storefront` Paper (`05641e1f…`). Don't use the deprecated `saleor/saleor-storefront`.
2. Removes Saleor's own AI instructions and adds our rules file (3.3), commits, and tags `baseline-v1` in all three repos.
3. Builds and starts the backend in Docker, runs migrations and `populatedb --createsuperuser`.
4. Saves the database to `$BENCH_DIR/seed.dump`, so every run starts from exactly the same data (`populatedb` makes random data).
5. Installs storefront and dashboard dependencies.

Running `setup` again is safe: repos that already have `baseline-v1` and an existing `seed.dump` are reused.

**Login:** dashboard `admin@example.com` / `admin` (local only).

**Seed data:** nothing extra to create. You get a product catalog, 20 customers (password `password`), staff groups including Customer Support (useful for the PII check), and the admin above. Birthday, minimum age and storage conditions don't exist before the task, so test data for them comes from the agent's own tests and the programmer's check.

### 3.3 Saleor's AI instructions are removed

The script does this; this section explains what and why. So that no method gets extra help from upstream AI guidance, it removes:

| Repo | Removed |
| --- | --- |
| `saleor` | `CLAUDE.md`, `AGENTS.md`, `.claude/` |
| `saleor-dashboard` | `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.agents/`, `.github/instructions/` |
| `react-storefront` | `AGENTS.md`, `skills/`, `skills-lock.json`, `.cursor/`, `.cursorignore` |
| all three | every nested `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `*.mdc` anywhere in the tree (e.g. `saleor/graphql/CLAUDE.md`, `src/lib/AGENTS.md`) |

Then it adds **one simple team rules file** to every repo, as on the presentation slide ("one instruction file per repository"): [saleor/baseline-instructions.md](./saleor/baseline-instructions.md), general team rules only, no hints about the tasks. It is copied as `CLAUDE.md` and `.github/copilot-instructions.md`, so each runner reads it.

The tag `baseline-v1` is the starting point for **every** method, so all 7 methods get the same rules file. Baseline = runner + model + this file (started in the runner's plan mode, which is built in, not installed); every other method = the same + its own tool. Never change this file during the study. If a method's init step wants to change `CLAUDE.md` or `copilot-instructions.md`, let it, and record that in its protocol.

### 3.5 Set up each method (once)

#### Each method runs in a vacuum

Every method runs with no help from any other AI: no other method, no other plugin, skill, MCP server, instruction file or AI tool. What the agent produces must come only from the runner + model + the method under test.

- **Separate environment per method.** Never install a method into the shared user config. Give each method its own:
  - Claude Code config dir: `export CLAUDE_CONFIG_DIR="$HOME/saleor-benchmark/envs/<method>/claude"` before starting `claude`. Install the method's plugin/skills there. Baseline gets only the settings below.
  - VS Code profile: `code --profile bench-<method>`, with only the GitHub Copilot extensions in it, plus that method's plugin.
  - Copilot CLI (Superpowers only): back up and empty `~/.copilot` before installing; restore it after the Superpowers runs.
- **Common Claude Code settings.** Every method's config dir starts with this `$CLAUDE_CONFIG_DIR/settings.json` (Baseline: nothing else). A work login is a claude.ai org account: without these settings it syncs the org's plugins, skills and connectors into every config dir, and the isolation check fails. Turning skills off in `/skills` does not persist across restarts; these settings do. If the dir was already used with sync on, delete `$CLAUDE_CONFIG_DIR/plugins/synced/`, start `claude` again and re-check.

```json
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
```

- **Repo tags.** Each method's tag is built directly on `baseline-v1`, never on another method's tag, so repos contain only that method's files.
- **Nothing global.** No user-level `CLAUDE.md`, agents, commands, hooks or MCP servers; no user-level Copilot instructions or prompt files; Copilot memory off; no other AI extensions in the profile (Codex, Cursor, Continue, Cline, Claude Code extension, …). If a method's installer writes global files or hooks (check AI-DLC), remove them after its runs and before any other method.
- **No human-side AI.** The programmer answers questions and writes follow-ups themselves. Don't use ChatGPT, another agent, or another session to answer, to review the result, or to write a follow-up.
- **Isolation check before every run.** Save this output into the run protocol. Anything except the method under test means the run must not start:

```bash
claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" "$CLAUDE_CONFIG_DIR/agents" "$CLAUDE_CONFIG_DIR/commands" 2>/dev/null
code --profile bench-<method> --list-extensions
for r in saleor saleor-dashboard react-storefront; do git -C "$HOME/saleor-benchmark/$r" describe --tags; git -C "$HOME/saleor-benchmark/$r" status --porcelain; done
```

Expected: only the method's plugins (none for Baseline), no MCP servers, the method's tag in all 3 repos, and no `status` lines (repos clean before T0). In the Claude Code session, `/skills` must list only the method's skills: no "claude.ai sync" ones.

#### Install

Install at the pinned version only. Disable auto-update. Run the method's per-repo init step (if any) once on top of `baseline-v1`, commit, and tag it with the same tag name in all three repos (`grill-v1`, `superpowers-v1`, `speckit-v1`, `aidlc-v1`, `rosetta-v1`, `rosetta-light-v1`). Every run of that method starts from that tag. Note the one-time setup time in the method's protocol; it is reported separately and not added to any run.

| Method | Claude Code | Copilot |
| --- | --- | --- |
| Grill-with-docs | Copy 3 skills from the pinned commit into `$CLAUDE_CONFIG_DIR/skills/`: `grill-with-docs` + the two it calls, `grilling` and `domain-modeling`. Step by step: [saleor/methods/grill-with-docs.md](./saleor/methods/grill-with-docs.md) | No official support. **Manual port:** copy the same 3 skills into the workspace root `.github/skills/` after every reset (same guide) |
| Superpowers | `git clone --branch v6.4.2 https://github.com/obra/superpowers` → `claude plugin marketplace add ./superpowers` → install `superpowers` from it | Official support is **Copilot CLI only**: install the same pinned checkout with `copilot plugin marketplace add ./superpowers` + `copilot plugin install superpowers@…`; run in Copilot CLI with full access and model GPT-6.1 Sol, medium (check the exact flags with `copilot --help` after installing) |
| Spec Kit | `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.13`, then in each repo `specify init --here --integration claude` and write the constitution | Same CLI; `specify init --here --integration copilot` |
| AWS AI-DLC | `curl -fsSL https://github.com/awslabs/aidlc-workflows/releases/download/v2.10.0/install.sh \| sh`, then in each repo `aidlc config --harness claude` | Same installer; in each repo `aidlc config --harness copilot` (writes the Copilot files into the repo) |
| Rosetta / Rosetta Light | `claude plugin marketplace add griddynamics/rosetta` → `claude plugin install rosetta@rosetta` or `rosetta-light@rosetta` | Add `https://github.com/griddynamics/rosetta` to `chat.plugins.marketplaces` → install `rosetta` or `rosetta-light` |

Install everything inside that method's own environment (see above). Plugins only for Rosetta: no MCP, nothing else.

#### All methods on both runners

Our competitors ran every method, so we test all 7 methods on both runners whenever we can. If a method has no direct support in VS Code Copilot, use the first option that works:

1. Official support in VS Code Copilot: use it as is.
2. Official support in Copilot CLI: run that method's Copilot cells in Copilot CLI with the same model, effort and full-access mode. Mark them `runner: Copilot CLI` (Superpowers).
3. Only skill/instruction files: port them by hand into `.github/skills/` or `.github/copilot-instructions.md`. Mark them `manual port` (Grill-with-docs).
4. Nothing works (the method doesn't activate after 2 attempts from a clean reset): mark the cell `not qualifying` in EXPERIMENTS.md with the reason and what was tried. It stays in the report as a result; it is not silently dropped.

Results from options 2 and 3 are reported with that mark, so readers know the setup was not identical.

## 4. Tasks

The two tasks do not overlap: the small task has no customer, age, or checkout logic.

### Task 1 (small): product storage conditions

**Starter Prompt:**

```text
Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Done when** (evaluator only): staff can set, edit and clear it in the dashboard; it is stored and exposed through the API; the storefront shows it when set and nothing extra when empty; existing products keep working; tests pass.

**Hidden questions** (evaluator only; never in the prompt, the AI must not know about them). The answer is the product decision: the programmer gives exactly this answer when the agent asks, and the judge checks the code against it.

| # | Question | Answer |
| ---: | --- | --- |
| 1 | Plain text or rich text? Maximum length? | Plain text, one optional field, max 250 characters. Empty is allowed. |
| 2 | Translatable, like other product texts? | Yes. It is translatable the same way as the product name and description. The storefront shows the translation when there is one. |
| 3 | Product level or variant level? | Product level. All variants share one value. |
| 4 | Where is it shown? | Only on the storefront product page, in the product description area. Not in cart, checkout or order emails. |
| 5 | Existing products? | Empty by default. A schema migration only; no data migration or backfill. Products without it look and work exactly as before. |
| 6 | Import/export, webhooks, API filters? | It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export. No filter or search by this field is needed. |
| 7 | Who can edit it? | Staff with the `MANAGE_PRODUCTS` permission, same as other product fields. Anyone can read it through the public product API. |

### Task 2 (large): age-restricted products

**Starter Prompt:**

```text
Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.).
Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products.
To make this work, the customer profile should have a birthday field.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Done when** (evaluator only): customer birthday field exists; staff set and see a minimum age per product; the backend blocks checkout for underage, no-birthday, and guest customers (not only the UI); eligible customers and unrestricted products work as before; tests pass.

**Hidden questions** (evaluator only; never in the prompt, the AI must not know about them). The answer is the product decision: the programmer gives exactly this answer when the agent asks, and the judge checks the code against it.

| # | Question | Answer |
| ---: | --- | --- |
| 1 | Existing customers with no birthday? | They can't buy age-restricted products until they add a birthday in their account; the storefront tells them so. Everything else works as before. |
| 2 | Existing products? | Unrestricted. Minimum age is empty by default, and empty means no restriction. |
| 3 | Data migration? | A schema migration only (new nullable fields). No backfill of existing data. |
| 4 | User not signed in (guest)? | A guest can browse and see restricted products but can't buy them: guest checkout with a restricted product is blocked by the backend, and the storefront asks the user to sign in. |
| 5 | Lists, search, discounts, banners? | Restricted products stay visible everywhere, with an age label (for example "18+"). Visibility is not restricted; buying is. |
| 6 | Marketing emails? | Saleor core sends no marketing emails. The agent should check this and say so. Any email that recommends products must not include restricted products for customers who aren't eligible. |
| 7 | Legal policies? | Not a code change. The agent should flag that the terms and privacy policy need a legal review for age restriction and birthday collection. |
| 8 | Birthday boundary and time zone? | A customer who turns the required age today is eligible today. Compare dates, not times; "today" is the current date in the shop's time zone. Someone born on 29 February becomes eligible on 1 March in non-leap years. |
| 9 | PII: who can see the birthday? | The birthday is personal data. Only the customer (own account) and a super-admin can see it. It is not in any public API, public profile, unauthenticated endpoint, webhook payload or export. Support and sales staff can't see it (at most a yes/no "age eligible" flag). Every change and every staff read of a birthday is audit-logged. |

### Questions that are not in the tables

The prompts are short on purpose, like a real ticket, so agents will also ask things the tables above don't cover (field name, label text, error wording, where a setting goes in the dashboard, …). The programmer decides these as the product owner. To keep all runs fair:

- **One answer per question for all runs.** Before answering, look in the tables below. If the question is there, give that answer, word for word. If not, decide, answer, and add a row right away (with the run ID), so every later run (any method, any runner) gets the same answer.
- **Never change an answer already given in a run.** If one was wrong, add a note and discuss it with the team.
- **Answer only what was asked.** Don't add decisions the agent didn't ask about, and don't hint at hidden questions.
- **Not asked = not a defect.** If an agent didn't ask and chose something else that is still reasonable, it is not a mistake. Only the "Done when" lines and the hidden-question tables are scored; the judge checks each run only against the answers given in that run.
- Mark these questions as `extra` in the run report; they don't count as hidden questions.

**Task 1 (small): extra answers**

| # | Question | Answer | First asked in |
| ---: | --- | --- | --- |
| 1 | Where does the value live: a real field on Product, or metadata / an attribute? | A first-class nullable field on Product. | S-CC-02 |
| 2 | How is it shown on the storefront: a separate block, or inside the description HTML? | A separate labelled block after the description, hidden when empty. | S-CC-02 |
| 3 | Name of the field? | `storageConditions` in the API, "Storage conditions" in the UI. | S-CC-02 |
| 4 | What does "everything passes locally" include? E2E tests? | Unit tests and linters in all three repos, plus a manual check on the local stack. No Playwright e2e tests. | S-CC-02 |
| 5 | Where is the 250-character limit enforced (DB column, API validation, dashboard input, translation)? | Everywhere: 250 in the column, the API validation and the dashboard input; the translation uses the same limit. | S-CC-02 |
| 6 | Whitespace-only input: store as empty? | Yes. Trim it, and treat a blank result as empty. | S-CC-02 |
| 7 | Where does the input go in the dashboard product page? | In the General Information card, under the description. | S-CC-02 |
| 8 | Empty or missing translation: fall back to the base value? | Yes. An empty or missing translation falls back to the base value. | S-CC-02 |
| 9 | Settable at product creation? CSV import? | Include it in create, update and the translation mutation. Import is out of scope. (Export and webhooks: hidden question 6.) | S-CC-02 |
| 10 | ADR? Changelog? | No ADR. Add a short CHANGELOG entry and regenerate the schema where needed. | S-CC-02 |

**Task 2 (large): extra answers**

| # | Question | Answer | First asked in |
| ---: | --- | --- | --- |
| | | | |

## 5. Running one experiment

### No limits, but contact Rosetta if a Rosetta run goes wrong

There is no time limit and no follow-up limit: keep going until the task is fully done. Time and follow-ups are still measured (T0/T1/T2, `followup_count`).

Rosetta and Rosetta Light runs only: if something is wrong with the implementation and fixing it takes too much time, contact the Rosetta team before going on. Write that in the run report. Other methods: no outside help; keep going with follow-ups.

### Method steps: equal chances for multi-step methods

Some methods need more than one command by design (Spec Kit: specify → plan → tasks → implement; AI-DLC approval gates; Grill-with-docs interview → next stage; Baseline: plan mode → plan approval → implementation).

- The task prompt text is identical for all methods. If the method has an entry command, put it in front of the prompt (for example `/speckit-specify <prompt>`; Spec Kit v1.0.13 flow: `/speckit-constitution` once, then `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`). Record the command in the protocol.
- When the method stops and waits for its own next step or approval, the programmer sends only that command or the fixed phrase **"Approved, continue."**, with no hints. These are counted as `method_steps`, **not** follow-ups.
- **Baseline:** same prompt, no entry command; the session starts in plan mode. Approve the plan in the runner's menu with the option that also bypasses permissions, and answer any later permission-only stop with **"Approved, continue."**. Each approval counts as a method step (`method_steps`). Details: [saleor/methods/baseline.md](./saleor/methods/baseline.md).
- Questions the method asks (including the grill interview) are answered like any other question (step 5).
- Method steps still count in time and usage. So a method with more ceremony pays for it in time and tokens, but not in the follow-up count.

### Reset before every run

`TAG` = the method's tag, e.g. `rosetta-v1`; `baseline-v1` for Baseline.

```bash
$B reset <TAG>   # code back to <TAG> in all 3 repos (changes and new files removed), database back to seed.dump
$B start
$B health        # all three OK
```

Then start a **new** agent session: Claude Code with no earlier session or memory for this workspace (remove `$CLAUDE_CONFIG_DIR/projects/*saleor-benchmark*`); Copilot with a new chat and cleared chat history. Use the method's own environment (`CLAUDE_CONFIG_DIR` / VS Code profile) and run the isolation check (3.5).

### Steps

1. Reset (above) and pass the isolation check (3.5). Check the runner, model and effort (section 2). Confirm the method is active, e.g. ask what it can do and check that it lists its own workflows. If it isn't active, reset and retry; this is not a scored failure.
2. **Start the timer** and send the task prompt (T0).
3. Don't interrupt or help the agent. Send only method steps when the method asks for them.
4. If the agent asks a question, **the programmer answers it themselves**, as a normal product owner would. If it matches a hidden question, give the answer from that task's table and mark it **asked**. If not, use the extra answers (section 4, "Questions that are not in the tables"). Write the question and the answer in the protocol.
5. When the agent first says it's done: **stop the first-pass timer (T1)** and save usage at this point.
6. **Hidden-question check.** For every hidden question not asked yet, ask the AI in one message, without changing anything: *"Don't change any code, just answer: was each of these handled, and where? <list>"*. Mark each one **covered** (handled correctly without being asked) or **not covered**. This gives the first-pass coverage: asked + covered out of the total.
7. Send follow-ups for not-covered items and anything broken, until the task is fully done. Count each follow-up and each item we had to point out (`missed_questions`).
8. **Stop the final timer (T2)** when the last follow-up is done.
9. Send the post-implementation prompt (below). **Only now, never in advance.**
10. Save usage at the end, straight from the runner: Claude Code `/cost` (and `/usage`); Copilot: the session's premium-request counter. Paste it raw, both the T1 and the T2 values, into Appendix A of the run report. Don't recompute it. Claude Code runs: also run `saleor/scripts/session-usage.py` on the session log; it writes `<RUN_DIR>/tokens.md` (tokens per model, per agent and subagent, per operator message, before / after T1, tool / skill / subagent calls). This shows where the tokens went, not only how many.
11. Fill the run report `<RUN_DIR>/report.md`, copied from the template for the [small](./saleor/templates/run-report-small.md) or [large](./saleor/templates/run-report-large.md) task. All numbers go into its data block at the top; definitions and measurement rules are in [templates/README.md](./saleor/templates/README.md). Update the status in EXPERIMENTS.md.

### Post-implementation prompt

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff`, and save it to <RUN_DIR>/<repo>.diff.
Then write <RUN_DIR>/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

`<RUN_DIR>` = absolute path to `rosetta-benchmarks/saleor/runs/<task>/<runner>/<method>/`, e.g. `runs/large-age-restriction/claude-code/rosetta/`. The programmer creates this folder before sending the prompt. One folder per run holds everything: `report.md` (operator), `agent-report.md`, `tokens.md`, `<repo>.diff` for each repo that changed, and `plan.md` (Baseline: the approved plan, if the runner saved it).

## 6. How we compare

| # | Measure | Who |
| --- | --- | --- |
| 0 | How many follow-ups the human had to send | Operator |
| 0.1 | How many hidden questions the AI missed, so we had to tell it | Operator |
| 0.2 | First-pass coverage of the hidden questions: asked during the run + covered (checked at T1) | Programmer |
| 0.4 | Time: first pass (T1 − T0) and total (T2 − T0) | Operator (timer) |
| 0.3 | A subagent checks what from the checklist and the discussion is actually in the code | Opus 5.5 |
| 1 | Usage at first pass and in total (from the runner) | Operator |
| 3 | git diff + action report (post-implementation prompt) | Agent under test |
| 4 | Absolute score per run, 1–5 per category, without comparing runs | Opus 5.5 |
| 5 | All 7 diffs for one task × one runner side by side, re-scored 1–5 on the same categories | Opus 5.5 |

**Categories (1–5):** 1 Requirements coverage · 2 Hidden requirements (hidden questions) · 3 Correctness · 4 Security & privacy · 5 Tests · 6 Code quality & Saleor conventions · 7 Verification evidence · 8 Merge-readiness.

**Anchors:** 1 = missing/broken · 2 = major gaps · 3 = works with notable gaps · 4 = minor issues only · 5 = complete, nothing to fix.

**Judge:** Claude Opus 5.5, medium effort, 1M context, in Claude Code. Fresh session per job, no method plugins installed. Inputs are blinded: each run is copied into a folder named by a random `run_id`, and method/runner names are removed from `report.md`. The mapping lives in `saleor/reports/mapping.csv` and the judge never sees it.

### Prompt — step 0.3, verification subagent

```text
You are verifying a coding-agent run. Do not change any code.
Inputs: <JUDGE_DIR>/<run_id>/ (diff files + agent-report.md), the task prompt, the checklist below, and the Q&A from the run protocol (every answer the programmer gave counts as a decision to check).
Spawn one subagent. The subagent must, for each checklist item and for each decision/promise the agent made in agent-report.md:
- find the exact place in the diff that implements it (file + hunk), or
- mark it NOT IMPLEMENTED if there is only a mention, a TODO, or nothing.
Return a table: item | status (implemented / partially / not implemented / not applicable) | evidence (file:line or "none").
Checklist:
<PASTE THE TASK CHECKLIST>
```

### Prompt — step 4, absolute per-run score

```text
You are an expert Saleor reviewer. Score ONE run in isolation. Do not compare it to any other run and do not modify any files.
Task prompt: <PASTE TASK PROMPT>
Evaluator checklist: <PASTE "Done when" + hidden questions with answers>
Answers the programmer gave in this run: <PASTE the Q&A from the run protocol>. A decision the agent was never told is not a defect if its choice is reasonable.
Run materials: <JUDGE_DIR>/<run_id>/ (all *.diff files, agent-report.md, verification table from step 0.3).
For each category give a score 1–5 using these anchors (1 missing/broken, 2 major gaps, 3 works with notable gaps, 4 minor issues only, 5 complete) and a 1–2 sentence justification citing files from the diff:
1 Requirements coverage, 2 Hidden requirements, 3 Correctness, 4 Security & privacy, 5 Tests, 6 Code quality & conventions, 7 Verification evidence, 8 Merge-readiness.
Also output: merge_ready (yes/no), blocking defects (list), total score (sum).
Save the result as <REPORTS_DIR>/<task>/<run_id>.absolute.md and as one JSON line appended to <REPORTS_DIR>/<task>/absolute.jsonl.
```

### Prompt — step 5, side by side (one task × one runner, 7 methods)

```text
You are an expert Saleor reviewer. Below are 7 anonymized solutions (run_ids only) to the SAME task, produced on the SAME runner/model. Read all the code first.
Task prompt: <PASTE TASK PROMPT>
Evaluator checklist: <PASTE "Done when" + hidden questions with answers>
Answers the programmer gave in this run: <PASTE the Q&A from the run protocol>. A decision the agent was never told is not a defect if its choice is reasonable.
Solutions: <JUDGE_DIR>/<task>/<runner>/<run_id_1..7>/ (diffs + agent-report.md + step 0.3 verification table).
Now that you have seen every solution, score EACH one again on the same 8 categories, 1–5, with the same anchors. Scores stay absolute (a 5 means "nothing to fix", not "best of the seven"); do not force a ranking and ties are allowed.
For each solution give per-category scores with one-sentence justifications, merge_ready (yes/no), blocking defects.
Then produce one Markdown table: run_id | 8 category scores | total | merge_ready.
Finally list the differences between solutions that most influenced the scores.
Do not modify any files except the output: <REPORTS_DIR>/<task>/<runner>.side-by-side.md.
```

### Final table

One per task, built from the data blocks of the run reports after de-blinding with `mapping.csv` (judge scores go into each report's data block: `verified_in_code`, `judge_absolute`, `judge_side_by_side`, `judge_merge_ready`):

| Method | Runner | Time first pass | Time total | Usage first pass | Usage total | Hidden questions: asked / covered / missed | Follow-ups | Method steps | Verified in code | Absolute (/40) | Side-by-side (/40) | Merge-ready |
| --- | --- | ---: | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |

**Verdict per method:**
- **Acceptable:** merge-ready = yes, Requirements coverage ≥ 4, and no blocking defects.
- **Preferred:** acceptable, with the fewest follow-ups, the shortest total time and the lowest usage. A method costing more than 1.5× the cheapest acceptable one is not preferred unless it is clearly better on quality.
- **Not acceptable:** everything else. Say so plainly.

## 7. Where results go

Everything goes into this folder in the Rosetta repo, on **one branch** (`benchmarks/saleor-v2`):

```text
rosetta-benchmarks/
├── BENCHMARKS.md                               # this document
└── saleor/
    ├── EXPERIMENTS.md                          # the 28 runs + status
    ├── scripts/bench.sh                        # setup, reset, start, stop, health
    ├── scripts/session-usage.py                # token breakdown of one Claude Code session
    ├── methods/<method>.md                     # quick install + run guide per method
    ├── templates/                              # run report templates + metric definitions (README.md)
    ├── prompts/                                # frozen copies of the prompts
    ├── runs/<task>/<runner>/<method>/          # one folder per run: report.md, agent-report.md, tokens.md, <repo>.diff (+ plan.md for Baseline)
    └── reports/                                # judge outputs, mapping.csv, summary tables
```

`<task>`: `small-storage-conditions` · `large-age-restriction`. `<runner>`: `claude-code` · `copilot`. `<method>`: `baseline` · `grill-with-docs` · `superpowers` · `spec-kit` · `aws-ai-dlc` · `rosetta` · `rosetta-light`.

## 8. How to improve the benchmark

1. Repeat each experiment several times (at least 3 per cell), so one lucky or unlucky run doesn't decide the result.
2. Add a set of runs with an Opus-class model instead of Sonnet (Claude Code: Opus 5.5, medium) to check that the ranking holds.
