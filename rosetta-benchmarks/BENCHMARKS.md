# Saleor benchmark

Compare seven AI coding approaches on one real e-commerce platform (Saleor: core API, dashboard, storefront), on two tasks, in two agent runners: **8 methods × 2 runners × 2 tasks = 32 runs**. The full run list is in [saleor/EXPERIMENTS.md](./saleor/EXPERIMENTS.md).

A run counts only if the result is merge-ready, not a draft that needs cleanup.

## 1. Methods

| #   | Method          | What is installed for the run                                                                                                                                                                                                                                                           |
| --: | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Baseline        | Only the shared team rules file (see 3.3). No method, no plugins. Runs in the runner's built-in **plan mode** (plan → questions → approve → implement): [saleor/methods/baseline.md](./saleor/methods/baseline.md)                                                                      |
| 2   | Grill-with-docs | [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs) `grill-with-docs` ([docs](https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md)) plugin `mattpocock-skills` from Claude Code's official marketplace (`claude-plugins-official`, which pins it to a commit, `49dd158` on 2026-10-22); Copilot: the README's own installer `npx skills@latest add mattpocock/skills`. S-CC-02 used a local marketplace at `447ca70` |
| 3   | Superpowers     | [obra/superpowers](https://github.com/obra/superpowers) **v6.4.2** (2026-09-25)                                                                                                                                                                                                         |
| 4   | Spec Kit        | [github/spec-kit](https://github.com/github/spec-kit) **v1.0.13** (2026-09-29) + one constitution per repo                                                                                                                                                                              |
| 5   | AWS AI-DLC      | [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) **v2.10.0** (2026-09-24)                                                                                                                                                                                          |
| 6   | Rosetta         | Plugin `rosetta` **3.1.17** (2026-10-19) only                                                                                                                                                                                                                                           |
| 7   | Rosetta Light   | Plugin `rosetta-light` **3.1.17** (2026-10-19) only; skills `hitl` + `tech-specs` (large task: + `orchestration`) and `USE ROSETTA SUBAGENTS.` named in the prompt, no `/coding-flow` |
| 8   | Rosetta Skills  | Plugin `rosetta` **3.1.17** (2026-10-19) only; skills `hitl` + `tech-specs` named in the prompt (large task: + `orchestration`), no `/coding-flow`                                                                                                                                                                                                                                     |

Versions were chosen on 2026-10-15 as the newest stable release at least two weeks old. Newer releases (Superpowers v7.0.0, Spec Kit v1.1.x–v1.2.0, AI-DLC v2.11.x) are too fresh, and the AI-DLC v2.11.1 builds are previews. **Exception: Rosetta, Rosetta Light and Rosetta Skills use 3.1.17**, the current release (2026-10-19), although it is newer than the two-week rule allows (3.1.13 would qualify). The study measures the current Rosetta; the exception is stated here so the results can be read with it in mind. Compared with 3.1.13, the gates and phases are the same; the subagent models changed (full: architect `claude-opus-5-5`, reviewers `claude-sonnet-5-5`; light: implementation and reviews on `claude-haiku-5-5`). Do not update any method during the study.

Methods 1–6 come from the presentation slide "Six approaches, one more if time allows". BMAD-METHOD is optional (one task, if time allows) and not part of the 32. GSD is not run (archived upstream in May 2026).

**Isolation:** every method runs alone, with no help from any other AI. See 3.5, "Each method runs in a vacuum".

## 2. Runners, models, permissions

| Runner | Model | Effort |
| --- | --- | --- |
| Claude Code **2.1.305** (`npm install -g @anthropic-ai/claude-code@2.1.305`, under Node 24) | Sonnet 5.5 (`claude-sonnet-5-5`) | medium |
| GitHub Copilot (VS Code) | GPT-5.6 Terra | medium |

- No other agent products (Codex, Cursor, API scripts, …).
- Automatic model switching / Auto model selection is OFF.
- The two runners use different models, so a Claude Code vs Copilot difference is a product + model difference. Methods are compared **within** one runner.
- **Full-access (YOLO) mode, sandbox disabled**, so permission prompts don't affect the test: Claude Code `claude --dangerously-skip-permissions` (Baseline: `--permission-mode plan --allow-dangerously-skip-permissions`, full access is switched on when the plan is approved); Copilot `chat.tools.autoApprove: true` with terminal confirmations off. **This is not normal usage. Use it only for this test**, only in disposable benchmark clones with synthetic data, and revert it after the study.

## 3. Environment setup (once)

Everything is done by one script: [saleor/scripts/bench.sh](./saleor/scripts/bench.sh). Don't type the setup or reset commands by hand.

### 3.1 Tools (macOS)

Git, Docker Desktop (running) with Docker Compose, Node.js 24 + Corepack.

```bash
brew install git
brew install --cask docker
brew install libmagic     # in advance: an agent that runs Saleor's backend tests on the host needs it, so it does not have to install it or ask
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh && nvm install 24 && nvm use 24 && corepack enable
docker compose version     # must print a version; Docker Desktop includes it
```

If `docker compose version` fails (Docker CLI without Docker Desktop, e.g. Colima), install the Compose plugin:

```bash
brew install docker-compose
mkdir -p ~/.docker/cli-plugins && ln -sfn "$(brew --prefix)/opt/docker-compose/bin/docker-compose" ~/.docker/cli-plugins/docker-compose
docker compose version
```

The script also accepts the standalone `docker-compose` binary if the plugin is missing.

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
4. Puts the shared database `test-library/saleor-seed.dump` into `$BENCH_DIR/seed.dump` and restores it, so every run of every operator starts from exactly the same data (`populatedb` makes random data, so a dump made on each machine would differ). `setup`, `from-zips` and `reset` all check this: a different local `seed.dump` is moved to `$BENCH_DIR/logs/seed.dump.own-<time>` and replaced by the shared one. Only without the shared file does `setup` run `populatedb` and save its own dump.
5. Installs storefront and dashboard dependencies.

Running `setup` again is safe: repos that already have `baseline-v1` and an existing `seed.dump` are reused. This is also how the Rosetta zip is used: extract it into `$BENCH_DIR` first, and `setup` then skips the clone.

**Faster start without cloning:** `$B from-zips not-initialized && $B setup` extracts `test-library/saleor-not-initialized-repos.zip` (the `.git` of the three repos at `baseline-v1`, no Rosetta files, commits or tags; made from `saleor-initialized-repos.zip` by resetting to `baseline-v1` and pruning the rest), rebuilds the files with `git reset --hard`, and `setup` then only seeds the database and installs dependencies. Then tag your method as in its file (e.g. `grill-v1`).

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

The tag `baseline-v1` is the starting point for **every** method, so all 8 methods get the same rules file. Baseline = runner + model + this file, in the runner's built-in plan mode; every other method = the same + its own tool. Never change this file during the study. If a method's init step wants to change `CLAUDE.md` or `copilot-instructions.md`, let it, and record that in its protocol.

### 3.5 Set up each method (once)

#### Each method runs in a vacuum

Every method runs with no help from any other AI: no other method, no other plugin, skill, MCP server, instruction file or AI tool. What the agent produces must come only from the runner + model + the method under test.

- **Separate environment per method.** Never install a method into the shared user config. Give each method its own:
  - Claude Code config dir: `export CLAUDE_CONFIG_DIR="$HOME/saleor-benchmark/envs/<method>/claude"` before starting `claude`. Install the method's plugin/skills there. Baseline gets only the settings below.
  - VS Code profile: `code --profile bench-<method>`, with only the GitHub Copilot extensions in it, plus that method's plugin.
  - Copilot CLI (Superpowers only): back up and empty `~/.copilot` before installing; restore it after the Superpowers runs.
- **Common Claude Code settings.** Every method's config dir starts with this `$CLAUDE_CONFIG_DIR/settings.json` (Baseline: nothing else). A work login is a claude.ai org account: without these settings it syncs the org's plugins, skills and connectors into every config dir, and the isolation check fails. Turning skills off in `/skills` does not persist across restarts; these settings do. Hooks stay on: Superpowers, Rosetta and AI-DLC start through their own hooks. The config dir has no hooks of its own, so `/hooks` must show only the method's hooks (none for Baseline and Grill). If the dir was already used with sync on, delete `$CLAUDE_CONFIG_DIR/plugins/synced/`, start `claude` again and re-check. Two built-in plugins stay on: `agents-md` (reads `AGENTS.md` only where a repo has no `CLAUDE.md`) and `diff` (the diff panel).

```json
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
```

- **Repo tags.** Each method's tag is built directly on `baseline-v1`, never on another method's tag, so repos contain only that method's files.
- **Nothing global.** No user-level `CLAUDE.md`, agents, commands, hooks or MCP servers; no user-level Copilot instructions or prompt files; Copilot memory off; no other AI extensions in the profile (Codex, Cursor, Continue, Cline, Claude Code extension, …). If a method's installer writes global files or hooks (check AI-DLC), remove them after its runs and before any other method.
- **No human-side AI.** The programmer answers questions and writes follow-ups themselves. Don't use ChatGPT, another agent, or another session to answer, to review the result, or to write a follow-up. An AI helper for the operator's bookkeeping (recording the run, copying answer texts from the tables) is fine, but it must not invent follow-ups, questions, hints or checks.
- **Isolation check before every run.** Save this output into the run protocol. Anything except the method under test means the run must not start:

```bash
claude plugin list; claude mcp list; ls "$CLAUDE_CONFIG_DIR/skills" "$CLAUDE_CONFIG_DIR/agents" "$CLAUDE_CONFIG_DIR/commands" 2>/dev/null
code --profile bench-<method> --list-extensions
for r in saleor saleor-dashboard react-storefront; do git -C "$HOME/saleor-benchmark/$r" describe --tags; git -C "$HOME/saleor-benchmark/$r" status --porcelain; done
```

Expected: only the method's plugins (none for Baseline), no MCP servers, the method's tag in all 3 repos, and no `status` lines (repos clean before T0). In the Claude Code session, `/skills` must list only the method's skills: no "claude.ai sync" ones. `/context` shows more, and that is not a leak: the runner's bundled skills (17 in 2.1.305) and, if `claude` runs in an IDE terminal, 2 `mcp__ide__*` tools. Start every run from the same kind of terminal.

#### Install

Install at the pinned version only. Disable auto-update. Run the method's per-repo init step (if any) once on top of `baseline-v1`, commit, and tag it with the same tag name in all three repos (`grill-v1`, `superpowers-v1`, `speckit-v1`, `aidlc-v1`, `rosetta-v1`, `rosetta-light-v1`, `rosetta-skills-v1`). Every run of that method starts from that tag. Note the one-time setup time in the method's protocol; it is reported separately and not added to any run.

The exact install commands per method (checked at the pinned versions) are in that method's file in [saleor/methods/](./saleor/methods/), part 1 (Claude Code) and part 4 (Copilot). Spec Kit and AI-DLC are set up once in `envs/<method>/root-<runner>/` and copied into the workspace root after every reset, because the agent runs in `$BENCH_DIR` (not a repo) and Claude Code loads project skills and hooks only from its working directory.

**One-time preparation: only what the method itself requires.** A method gets its own documented one-time preparation if its docs require one. The preparation runs once per method and never per run. Its cost (time, `/cost`, `/usage`) is recorded separately in the method's file and is never added to any run. After it, the agent session is closed and every run starts a new session. Rosetta's `/init-workspace-flow` takes about 30 minutes, so it is run once and its result is saved as two zips in `test-library/`, shared by Rosetta, Rosetta Light and Rosetta Skills: `saleor-initialized-repos.zip` (the entire `.git` of the three repos, HEAD = the init commit tagged for all three methods) and `saleor-initialized-root.zip` (the files Rosetta created outside the repos). All Rosetta work starts with `bench.sh from-zips`: it deletes the old files, extracts both zips and rebuilds the working files with `git reset --hard`. The repos are not cloned and nothing is copied back. The zip is shared by Rosetta, Rosetta Light and Rosetta Skills. All Rosetta work starts by cleaning the three repo folders and extracting the zip; the repos are not cloned (see 1.2a in the method files).

| Method | One-time preparation | Where |
| --- | --- | --- |
| Baseline | none | |
| Grill-with-docs | `/setup-matt-pocock-skills` | [methods/grill-with-docs.md](./saleor/methods/grill-with-docs.md) |
| Superpowers | none | |
| Spec Kit | `specify init --integration claude`, then `/speckit-constitution` (one constitution per repo workspace, same text for every run) | [methods/spec-kit.md](./saleor/methods/spec-kit.md) |
| AWS AI-DLC | `aidlc config --harness claude` and `aidlc doctor` | [methods/aws-ai-dlc.md](./saleor/methods/aws-ai-dlc.md) |
| Rosetta, Rosetta Light, Rosetta Skills | `/init-workspace-flow` | [methods/rosetta-flow.md](./saleor/methods/rosetta-flow.md), [rosetta-light.md](./saleor/methods/rosetta-light.md), [rosetta-skills.md](./saleor/methods/rosetta-skills.md) |

Nothing else is prepared for any method (for example Rosetta's `requirements-authoring-flow` is not run).

Install everything inside that method's own environment (see above). Plugins only for Rosetta: no MCP, nothing else.

#### All methods on both runners

Our competitors ran every method, so we test all 8 methods on both runners whenever we can. If a method has no direct support in VS Code Copilot, use the first option that works:

1. Official support in VS Code Copilot: use it as is.
2. Official support in Copilot CLI: run that method's Copilot cells in Copilot CLI with the same model, effort and full-access mode. Mark them `runner: Copilot CLI` (Superpowers).
3. Only skill/instruction files: port them by hand into `.github/skills/` or `.github/copilot-instructions.md`. Mark them `manual port`. A method's own installer for other agents is not a manual port (Grill-with-docs: `npx skills@latest add mattpocock/skills`).
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
- **Questions in no table: the agent's own recommended option.** To keep runs equal (apples to apples), the assistant does not invent a product decision of its own. The answer is the option the agent marks "(Recommended)", worded with that option's own description, unless a table answer contradicts it (then the table wins, and the answer says so). It is added right away as an extra row (Q&A only), so every later run gets the same decision. If the agent offers no recommended option, the operator decides.
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
| 11 | Translation API: add the field to the shared `TranslationInput`, or a new product-only input (breaking for existing `productTranslate` callers)? | The shared `TranslationInput`. No breaking change to `productTranslate`. | S-CC-06 |
| 12 | May the storefront product page (`page.tsx`) be edited to place the block? | Yes. | S-CC-06 |
| 13 | May the migration be applied to the local Docker dev database? | Yes, the local dev database only. | S-CC-06 |
| 14 | May the agent write test data to the local dev database during validation (with snapshot and restore)? | Yes, with a snapshot first and a full restore after. | S-CC-06 |
| 15 | Should validation use a browser tool on the dashboard and storefront? | Only if one is available without new credentials; otherwise automated tests and API checks. | S-CC-06 |
| 16 | May the implementation step add the new field to existing dashboard test fixtures and typed test literals (so typecheck passes)? | Yes, the field only, no new assertions. | S-CC-06 |
| 17 | Optional extras: count the field in the dashboard translation progress? Edit `.stories.tsx` files? | Count it in the translation progress. No stories edits. | S-CC-06 |
| 18 | Preserve newlines typed into the field on the storefront (e.g. `whitespace-pre-line`)? | No. Plain text; newlines are not preserved. | S-CC-06 |
| 19 | Note, not a hidden question: if it asks which dashboard screens must let staff set the field. The dashboard has no routed product create page: `/products/add` redirects to a "create product" dialog on the product list. | The product update page and the create-product dialog on the product list (that dialog is the create flow). | S-CC-08 |
| 20 | Should staff edit translations on the dashboard's product translation page? | Yes. Staff translate it on the product translations page in the dashboard, the same way as the product name and description. | S-CC-07 |
| 21 | Run the local tests and refresh the schemas against the local stack? Is refreshing the dashboard schema from the local API OK even if it changes a tracked file? | Yes, run against the local stack. Regenerate the schema where needed, and refresh the dashboard schema from the local API; the tracked schema file may change. The local dev database only. | S-CC-07 (first asked as a schema-refresh question in S-CC-08) |
| 22 | May the local API be restarted to apply the migration? | Yes, you may restart the local API to apply the migration. | S-CC-08 |
| 23 | `categoryTranslate` and `collectionTranslate` share `TranslationInput`: reject the field or ignore it there? | Reject it: they must return an INVALID error if `storageConditions` is set. | S-CC-08 |
| 24 | May it enable the `pl` locale in the local storefront config and restart the dev server, to show a real Polish page? | No. Don't change the local config or restart anything; the evidence shown is enough. | S-CC-08 |
| 25 | How should the dashboard behave on the staging schema (keep `@lockSchema` on reads only, hide the field on staging builds, or remove `@lockSchema`)? | Keep `@lockSchema` on reads only. The target is the main (3.23) build; the staging schema doesn't matter for this task. | S-CC-07 |
| 26 | May it install `libmagic` with Homebrew on the host machine (the API or the backend tests do not run without it)? | Yes, installing libmagic is fine. (It should already be installed in advance, see section 3.1.) | S-CC-07 |

**Task 2 (large): extra answers**

| # | Question | Answer | First asked in |
| ---: | --- | --- | --- |
| 1 | Where does the minimum age live: Product, ProductType or variant? Per region? | A flag on Product marks it age-restricted. The minimum age is one setting per store, 18, stored in the database (see 11). No regions or markets. | L-CC-02 |
| 2 | Where is the rule enforced? | Both when a line is added or updated in the checkout and when the checkout is completed. The check at completion is the authority. | L-CC-02 |
| 3 | Staff draft orders: exempt? | No, they are checked the same way. A draft with an age-restricted product and no linked Customer is allowed and can be completed. | L-CC-02 |
| 4 | Can the customer set and change their own birthday? Verification? | Yes, at any time, through their account. No identity verification. | L-CC-02 |
| 5 | Scope: which repos? | All three: backend, dashboard and storefront, with tests in each. | L-CC-02 |
| 6 | Terms / glossary names? | Customer, Birthday, Minimum age, Age-restricted product. | L-CC-02 |
| 7 | "Super-admin": Saleor's `is_superuser`? What do other staff see? | Yes, `is_superuser`. Other staff see only a yes/no "age eligible" flag (hidden #9). | L-CC-02 |
| 8 | Audit log: what is stored? | Only the actor, the time and the action (read or change), no birthday values. The customer's own changes, staff changes and every staff read are logged. | L-CC-02 |
| 9 | Nested objects (`order.user`, `checkout.user`) and leak tests? | The owner-or-super-admin check applies on every route including nested user objects, with leak tests for webhooks, exports and nested objects. | L-CC-02 |
| 10 | Existing carts and orders when a product becomes restricted? | Carts that hold it fail at checkout completion with an error that names the product. Orders already placed stay unchanged. | L-CC-02 |
| 11 | Who changes the store-wide minimum age, and how? | A field in the site settings, default 18, editable in the dashboard by staff with the site-settings permission. A change applies to all later checks. | L-CC-02 |
| 12 | Draft order with a linked Customer who has no birthday? | Not eligible: the draft can't be completed until the Customer's birthday is set or the Customer link is removed. | L-CC-02 |
| 13 | Birthday audit log: a separate model or the existing customer events? | Reuse the existing `CustomerEvent`. | L-CC-02 |
| 14 | Does showing the "age eligible" flag to staff count as a read of the birthday? | Yes, it is audit-logged like a read of the date. | L-CC-02 |
| 15 | Who sees the "age eligible" flag on `order.user` / `checkout.user`? | Only the owner and staff with the customer-management permission; null for everyone else. | L-CC-02 |
| 16 | Who can see the birthday audit events? | Only super-admins. The birthday event types (changed, read) are hidden from the customer events for everyone else; they are still written. | L-CC-02 |
| 17 | Deleting a customer: what happens to the birthday audit events? | They are kept, even if it needs a bigger migration (stop the cascade for these event types). | L-CC-02 |
| 18 | How many read events for the "age eligible" flag? | One per customer per request, only when the field is actually resolved. | L-CC-02 |
| 19 | Who may set or correct a birthday besides the customer? | Only the customer (own account) and a super-admin (Saleor's `is_superuser`) can set or change a birthday. No other staff can. | L-CC-08 |
| 20 | What does the "age eligible" flag mean (for non-superuser staff, or in general)? | It is a yes/no: whether the customer meets the store-wide minimum age today (compare dates, "today" is the current date in the shop's time zone). It reveals no age and no date. Only the owner and staff with the customer-management permission see it; null for everyone else. Reading it is audit-logged, one read event per customer per request, only when the field is actually resolved. | L-CC-08 |
| 21 | Draft orders: "checked, no exemption" vs "no linked customer is allowed": which rule? | Staff draft orders: they are checked the same way, no exemption. A draft with an age-restricted product and no linked Customer is allowed and can be completed. A draft with a linked Customer who has no birthday: not eligible, the draft can't be completed until the Customer's birthday is set or the Customer link is removed. (Rows 3 and 12 together.) | L-CC-08 |
| 22 | What are the valid values for a product's minimum age? | A flag on Product marks it age-restricted. The minimum age is one setting per store, 18, stored in the database. A field in the site settings, default 18, editable in the dashboard by staff with the site-settings permission. A change applies to all later checks. Existing products are unrestricted: minimum age is empty by default, and empty means no restriction. (Rows 1 and 11 together with hidden question 2.) | L-CC-08 |
| 23 | How should a product's minimum age work: flag + store-wide age, per-product age with store default, or per-product age only? | A flag on Product marks it age-restricted. The minimum age is one setting per store, 18, stored in the database. No regions or markets. A field in the site settings, default 18, editable in the dashboard by staff with the site-settings permission. A change applies to all later checks. (Rows 1 and 11 together; "(see 11)" removed from row 1.) | L-CC-08 |
| 24 | Who can change the store-wide minimum age? | A field in the site settings, default 18, editable in the dashboard by staff with the site-settings permission. A change applies to all later checks. (Row 11.) | L-CC-08 |
| 25 | Does "customer-management permission" (for the "age eligible" flag) mean `MANAGE_USERS`? | Yes, MANAGE_USERS. Only the owner and staff with the customer-management permission see the "age eligible" flag; null for everyone else. (Row 15 plus the permission name.) | L-CC-08 |
| 26 | A draft with a customer email but no linked account: treat the matching account as linked? | No. Only an explicit Customer link counts. A draft with no linked Customer is allowed and can be completed. | L-CC-08 |
| 27 | Should `orderBulkCreate` (staff data imports) enforce the age check? | No. Bulk import creates historical orders that are already sold, so it is not checked. | L-CC-08 |
| 28 | Saleor has no shop time zone: how should "today" be defined for age checks (UTC date, or a new shop time zone setting)? Asked after hidden question 8 was answered. | Add a shop time zone setting in the site settings, default UTC, and use it for "today". A customer who turns the required age today is eligible today. Compare dates, not times. Someone born on 29 February becomes eligible on 1 March in non-leap years. | L-CC-08 |
| 29 | How long are the retained audit events kept (retention)? Asked in a status message, not through a question prompt; the operator answered it. | Audit events are kept for 1 year. After that they may be deleted by a retention job. They are kept when the customer is deleted (even if it needs a bigger migration: stop the cascade for these event types) until the 1 year is over. (Row 17 plus the retention rule, decided by the operator.) | L-CC-08 |
| 30 | Should this delivery include a job that deletes age/birthday audit events older than 1 year? (follow-up to row 29) | No. Retention is only documented in TODO: audit events are kept for 1 year, and no deletion job is built in this task. | L-CC-08 |
| 31 | Reorder from a past order with an ineligible buyer: how should restricted lines be handled (drop and report / reject the whole reorder)? | Keep as is: the new cart omits the restricted lines, and the response lists them with code AGE_RESTRICTED and the product names, as in the approved specs. | L-CC-08 |
| 32 | Which age-label fixes to implement when some screens lack the label (only the listed gaps / gaps plus optional extras / report only)? | Restricted products stay visible everywhere, with an age label (for example "18+"). Visibility is not restricted; buying is. Fix the 4 gaps and the optional extras too (discount pickers and summaries, dashboard global search, storefront structured data). (Hidden #5 plus the choice; the "4 gaps" are the ones this agent found: adapt the list to what the agent names.) | L-CC-08 |
| 33 | After the follow-up round: do you want a fix round for weak UI tests (render tests), or accept the delivery with these gaps? | Yes, I accept the delivery as it is, with no fix round for the test gaps. (Weak tests are not a hidden question and not a protocol follow-up.) | L-CC-08 |
| 34 | May the migrations be applied to the local dev database and the local API restarted (so the operator can try the feature)? | Yes, you may apply the migrations to the local dev database only, and restart the local API to apply them. (As small-task extras 13 and 22.) | L-CC-08 |
| 35 | A guest checkout can attach to an adult's account by email at completion: how to treat it? | A guest can browse and see restricted products but can't buy them: guest checkout with a restricted product is blocked by the backend, and the storefront asks the user to sign in. (Hidden #4.) | L-CC-07 |
| 36 | The dashboard needs to know if the viewer is a super-admin: add a `User.isSuperuser` field? | Yes, an owner-only field: a new field, visible only on the viewer's own account. The dashboard uses it to show or hide the birthday. (The agent's recommended option.) | L-CC-07 |
| 37 | Audit rows: how to record the customer and the actor in `CustomerEvent`? | The customer in `user`, the actor in `parameters`: the trail appears under the customer. (The agent's recommended option.) | L-CC-07 |
| 38 | Audit events are deleted with the customer (CASCADE): accept? | Keep audit after deletion. The birthday audit events are kept when the customer is deleted, even if it needs a bigger migration (stop the cascade for these event types). (Extra row 17.) | L-CC-07 |
| 39 | How should the birthday audit rows survive customer deletion (dedicated audit table / `CustomerEvent` FK to `SET_NULL`)? | Reuse the existing `CustomerEvent`. The birthday audit events are kept when the customer is deleted, even if it needs a bigger migration (stop the cascade for these event types). (Extra rows 13 and 17 together; the table wins over the agent's recommended option.) | L-CC-07 |
| 40 | Plan approval: the running dev API on :8000 auto-reloads and breaks once the migration lands. Option A: stop that container, use a separate verification API on :8001 with a cloned database, migrate the real database only at the end with approval. Option B: keep :8000 live and migrate the dev database right after the first core session. | Option A (the agent's recommended option): stop the container, use the separate verification API on :8001 with a cloned database, and at the end, with approval, migrate the real database and restart the container. | L-CC-07 |
| 41 | Plan approval: spec deltas found while planning (SC-1 dashboard changesets must be patch; SC-2 `@lockSchema` where the staging schema lacks fields; SC-3 storefront extension fragments; SC-4 node-only storefront tests; SC-5 read the site settings fresh when the checkout has restricted lines) | Approved as proposed (the agent's recommendation), folded into the specs. Nothing is committed; the agent asks at the end. | L-CC-07 |

Rule for composed answers (rows 21–23): when the agent's question touches several rows, the answer is those rows' key texts in full, in this order. Open point for the team: extra row 1 (a flag on Product, one store-wide minimum age) and hidden question 2 ("minimum age is empty by default") read as two different models; the answers were sent word for word, and the judge rule is not decided.
| 35 | Which time zone does the shop use for the age check (and the future-birthday check)? Saleor has only Django's global TIME_ZONE (UTC). | A new `SHOP_TIME_ZONE` setting (environment variable, IANA name, default UTC) used for the age check and the future-birthday check. Nothing else in Saleor changes. | L-CC-04 |

## 5. Running one experiment

### No limits, but contact Rosetta if a Rosetta run goes wrong

There is no time limit and no follow-up limit: keep going until the task is fully done. Time and follow-ups are still measured (T0/T1/T2, `followup_count`).

Rosetta and Rosetta Light runs only: if something is wrong with the implementation and fixing it takes too much time, contact the Rosetta team before going on. Write that in the run report. Other methods: no outside help; keep going with follow-ups.

### Method steps: equal chances for multi-step methods

Some methods need more than one command by design (Spec Kit: specify → plan → tasks → implement; AI-DLC approval gates; Grill-with-docs interview → next stage; Baseline: plan mode → plan approval → implementation).

- The task prompt text is identical for all methods. Each method is started with **its own slash command** in front of the prompt, exactly as in "Commands per method" below. Record the command in the run report (`entry_command`).
- When the method stops and waits for its own next step or approval, the programmer sends only that command or the fixed phrase **"Approved, continue."**, with no hints. These are counted as `method_steps`, **not** follow-ups.
- **Baseline:** same prompt, no entry command; the session starts in plan mode. Approve the plan in the runner's menu with the option that also bypasses permissions, and answer any later permission-only stop with **"Approved, continue."**. Each approval counts as a method step (`method_steps`). Details: [saleor/methods/baseline.md](./saleor/methods/baseline.md).
- Questions the method asks (including the grill interview) are answered like any other question (step 5).
- Method steps still count in time and usage. So a method with more ceremony pays for it in time and tokens, but not in the follow-up count.

### Commands per method

Each method is started with the slash command its own docs give for "build a feature", and at every stop the operator sends a fixed reply. Both are written out per task and per runner in that method's file in [saleor/methods/](./saleor/methods/) (one file per method: setup, then each run step by step). Rules:

- Send only the reply listed there, word for word. Questions are answered from section 4 (hidden questions, then extra answers), never "use your recommendation".
- Every listed reply is a **method step**, not a follow-up.
- If a method asks something not listed (another choice or menu), pick its default or recommended option, write the question and the choice in the run report, and add it to the method's file in saleor/methods/ so the next runs reply the same.
- Methods that may commit (Superpowers, Spec Kit, AI-DLC): committing is not a red flag for them; the post-implementation prompt diffs against the start tag.

### Reset before every run

`TAG` = the method's tag, e.g. `rosetta-v1`; `baseline-v1` for Baseline.

```bash
$B reset <TAG>   # code back to <TAG> in all 3 repos (changes and new files removed), database back to seed.dump
$B start
$B health        # all three OK
```

Then start a **new** agent session: Claude Code with no earlier session or memory for this workspace (remove `$CLAUDE_CONFIG_DIR/projects/*saleor-benchmark`*); Copilot with a new chat and cleared chat history. Use the method's own environment (`CLAUDE_CONFIG_DIR` / VS Code profile) and run the isolation check (3.5).

### Steps

1. Reset (above) and pass the isolation check (3.5). Check the runner, model and effort (section 2). Confirm the method is active, e.g. ask what it can do and check that it lists its own workflows. If it isn't active, reset and retry; this is not a scored failure. **When the checks pass, `/exit` and start the agent again WITHOUT the cleanup lines** (the cleanup of old session logs and `run-output/` runs once, in the first start only; running it again would delete the logs of this run). This is a NEW session, never `--continue`: its purpose is a clean context, with none of the checks in it. The task is sent as the first message of that second session. The in-session checks are `/model`, `/skills`, `/hooks` or `/plugin`; the "Context loaded using Rosetta" message is not a check, because it appears only after the first message (when the skills and hooks load), and nothing is sent before T0.
2. **Start the timer** and send the task prompt (T0).
3. Don't interrupt or help the agent. Send only method steps when the method asks for them.
4. If the agent asks a question, **the programmer answers it themselves**, as a normal product owner would. If it matches a hidden question, give the answer from that task's table and mark it **asked**. If not, use the extra answers (section 4, "Questions that are not in the tables"). Write the question and the answer in the protocol.
5. When the agent first says it's done: **stop the first-pass timer (T1)** and save usage at this point.
6. **Hidden-question check.** For every hidden question not asked yet, ask the AI in one message, without changing anything: *"Don't change any code, just answer: was each of these handled, and where? "*. Mark each one **covered** (handled correctly without being asked) or **not covered**. This gives the first-pass coverage: asked + covered out of the total.
7. Send follow-ups only for (a) hidden questions that the T1 check showed as not covered, and (b) things the operator found broken in their own check against "Done when" (section 4), until the task is fully done. Nothing else is a follow-up: no idea or "improvement", no extra check, no hint, nothing suggested by a helper (an AI assistant or a colleague). Count each follow-up and each item we had to point out (`missed_questions`). If extra work is done anyway, record it as `extra-work` in the timeline: it is not a follow-up, it is not counted in `followups`, and its cost is reported separately from the first-pass and final numbers (templates/README.md).
8. **Stop the final timer (T2)** when the last follow-up is done.
9. Send the post-implementation prompt (below). **Only now, never in advance.**
10. Save usage at the end, straight from the runner: Claude Code `/cost` (and `/usage`); Copilot: the session's premium-request counter. Paste it raw, both the T1 and the T2 values, into Appendix A of the run report. Don't recompute it. **`/cost` and `/usage` are cumulative for the whole session by default**, never per step: the T1 reading holds everything up to the first "done", the T2 reading everything up to the end. The cost of the follow-up phase is the difference (T2 − T1, computed and labelled as computed). If there was no agent work after T1 (e.g. only the operator's own check), T2 = the last reading taken after the last agent work; a later reading with the same total is the same value. In the data block, the token fields are the sum over the models listed in `/cost` (as the runner shows them); the cost field is the runner's total. Claude Code runs: also run `saleor/scripts/session-usage.py` on the session log; it writes `<RUN_DIR>/tokens.md` (tokens per model, per agent and subagent, per operator message, before / after T1, tool / skill / subagent calls). This shows where the tokens went, not only how many.
11. Fill the run report `<RUN_DIR>/report.md`, copied from the template for the [small](./saleor/templates/run-report-small.md) or [large](./saleor/templates/run-report-large.md) task. All numbers go into its data block at the top; definitions and measurement rules are in [templates/README.md](./saleor/templates/README.md). Update the status in EXPERIMENTS.md.

### Post-implementation prompt

```text
Do not commit anything. For every repository you changed, run `git add -N .` and then `git diff`, and save it to ~/saleor-benchmark/run-output/<repo>.diff (create the folder).
Then write ~/saleor-benchmark/run-output/agent-report.md containing:
- experiment info: task, method, runner, model, start/end time;
- a list of the actions you actually performed during this task, for example: wrote code, reviewed the code, wrote tests, ran tests, ran tests multiple times, ran tests in a different order, cleaned up leftovers, updated documentation, started the application, checked the API, took a screenshot of the final result;
- for each action, whether it was done (yes/no) and short evidence (command, file, or output).
Do not make any further code changes.
```

The agent writes into `~/saleor-benchmark/run-output/` (the same text for every run, so it is copied as is); the programmer then copies that folder into the run folder `rosetta-benchmarks/saleor/runs/<task>/<runner>/<method>/` (`<RUN_DIR>` below) before the next reset. For methods that may commit (Superpowers, Spec Kit, AI-DLC) the method's file uses `git diff <start tag>` instead of `git diff`. One folder per run holds everything: `report.md` (operator), `agent-report.md`, `tokens.md`, and `<repo>.diff` for each repo that changed.

### Working with an AI assistant: the assistant guides, the operator does

The operator may have an AI assistant for **bookkeeping and guidance only** (3.5, "No human-side AI"). The roles are fixed:

**The operator** runs the agent session: starts it, pastes every message, answers every question, approves, and does the own check of the result ("Done when"). Nothing reaches the agent that the operator did not paste.

**The assistant** guides one step at a time and records:
- Gives the operator the exact text to paste, taken from the tables in section 4 and from the method file, in one code block with nothing else in it. Its own comments stay outside that block, so they are not pasted by accident.
- When a question touches a hidden question, the answer is the whole key text of that row, plus the matching extra answer if there is one. **Always the full answer, even if the agent asked only part of it** (e.g. it asks "who may set the birthday?": give every matching row in full, not a shortened or reworded version). Never paraphrase or shorten key texts: word for word.
- **Updates this document and the method files on its own.** Whenever a new rule, a protocol difference, a new extra answer or a correction comes up during a run, the assistant records it here (and in the method file) without being told to. The operator does not have to ask for it.
- When a question is in no table, the operator decides it. The decision is added to "Questions that are not in the tables" as a note ("if it asks this, answer that"), so every later run gets the same answer.
- Reads each spec, brief or plan the agent writes and checks it against the hidden questions and the extra answers. It never writes a message to the agent on its own, and it never suggests an idea, a check or a hint. **Review of the agent's documents (specs, designs, plans): read every document in full, section by section, with the Read tool; a keyword search is never a substitute.** Check each section against all the tables: the hidden questions, and every extra answer given in this run (also the ones the operator decided in this run). Look for gaps and for contradictions (e.g. a rule the spec states that differs from a given answer). **Spec review rule:** an item of the hidden questions or extra answers that the spec does not mention at all is **not** reported to the operator and not raised with the agent (the T1 check finds it). An item the spec covers only partly, or contradicts, goes into one correction sent together with the approval, written with the key texts word for word: `Please improve: (1) …, (2) …. Yes, I approve with those corrections.` If the agent asks for its own approval sentence (e.g. "Yes, I approve the specs with PR-1..7 as proposed."), add it after the corrections. The assistant shows the operator only that one message, and the list of covered items stays short. The rule does not apply to Baseline: its plan is approved in the runner's plan-mode menu, which sends no text, so no corrections are sent ([methods/baseline.md](./saleor/methods/baseline.md)). Follow-ups follow the rule in step 7 of "Steps".
- Records every stop, question, answer, approval and follow-up in the run report as soon as it happens, with the exact text sent, in the order it happened. A report describes this run only: no comparison with other runs, and no mention of them.
- Runs the read-only checks and the bookkeeping commands the protocol defines (health check, isolation check, the "Done when" calls, `session-usage.py`, `collect-results.py`) and commits and pushes only when the operator asks. It never changes the stack, the repos or any config without being asked.
- **Does everything it can do itself.** When the operator says "you do", the assistant runs the whole pre-run setup (steps 1–3 of the method file: variables, `from-zips`/`reset`, `setup`, `start`, `health`, report copy and `sed`, isolation check) and reports PASS/FAIL with the output. It does not hand over commands that it can run. Use `source ~/.nvm/nvm.sh && nvm use 24` in its shell; run long steps in the background. The operator does only what the assistant cannot: starting the interactive agent session, the in-session checks, pasting messages, answering questions, approving, and the own "Done when" check.
- **Hiding applies before and during implementation only.** Until the agent says "done" (T1), the assistant does not hint at hidden questions or at what the specs lack. From T1 on, the check is direct: the hidden-question check, and any clarification question about a hidden question, name the topic openly (the key text may be used), because the purpose is to find out what the agent handled. Such clarification questions are read-only, are recorded as `hidden-check`, and cost nothing extra in the counts.
- **Flaky tests are not failures and are not reported.** A test that fails in a full run, is outside the scope of the work (a file or area the agent did not change), and passes when rerun, is a flaky test. It is not counted as a failure, not reported in the run report, and not held against the method. Known examples: the dashboard test `PaginationButtons › uses the small secondary page arrows`; backend `xdist` worker crashes under load (e.g. in `test_checkout_complete_with_payment.py`), which pass when rerun alone. The assistant reruns such a test once to confirm and writes only the passed counts. A failure that is in the changed area, or that does not pass on rerun, is a real failure and is reported.
- **Operator remarks are observations, not stops.** When the operator pastes agent text together with a comment (what they like, a weak or strong point, a thought), the assistant records it in the report (notes, strong/weak point) and does not turn it into instructions or advice for the operator. It tells the operator what to do only when the agent has actually stopped and needs a reply, which the assistant confirms from the session log.
- **Gives the complete start sequence, every time.** Start command (with cleanup, once) → in-session checks → `/exit` → start command again **without** the cleanup lines → T0 message. The assistant writes all of it in one reply, with each command in its own block, and says which one is the second start. It does not shorten the sequence from memory.
- **Trusts the operator's confirmations.** "Step done" or "all passed" from the operator is recorded as confirmed (note "operator confirmed" in the report). The assistant does not ask again for the same checks.
- **Keeps the pre-flight and the report current**: ticks each pre-flight box as soon as it is verified or confirmed, and pastes the isolation output into the report. Edits the report with the Edit tool, not shell `sed`/`python`.
- **Restart without cleanup.** The step-4 start command deletes old session logs (`$CLAUDE_CONFIG_DIR/projects/*saleor-benchmark*`) and `run-output/`. If the operator needs to start or resume `claude` without that cleanup (a closed or crashed session), the assistant gives the same command without the `find` and `rm` lines (`--continue` to resume), and notes it in the report ("Notes"). Old logs in that folder end up in `tokens.md`.
- Facts about the scripts, so the assistant does not raise false alarms: `bench.sh from-zips` also removes `run-output/` and `plans/` (copy `run-output/` into the run folder before the next reset); `setup` prints "HEAD is not baseline-v1 … skipping schema regeneration" for the initialized repos, which is expected; the login stays in the method's `$CLAUDE_CONFIG_DIR` (`.claude.json`), so a new session does not ask for `/login`.
- Does not decide scores. The operator gives `operator_score`, `operator_merge_ready`, the weak point and the strong point; the assistant writes them as given.

**Asking for the time at every step.** After each message the operator sends, the assistant asks for the time ("tell me the time you sent it"), and records it in the timeline as the real clock time, minute precision. After each stop of the agent that the operator reads, the operator gives the time it was seen. If the operator does not know a time, the assistant reads it once from the session log (`$CLAUDE_CONFIG_DIR/projects/*/*.jsonl`, read-only) and says so in the report. Every time in the report is a real time; the gap-free time below is computed from them and written separately.

**The session log is the authority for the agent's stops.** The operator often brings a stop to the assistant long after the agent made it (the agent asked at 15:55, the operator pasted it at 16:20). The time the operator brings it to the assistant is **not** the time of the stop. At every stop the assistant reads the session log (timestamps are UTC; convert to local time) and records: the time of the agent's question or approval request (the `AskUserQuestion` call or the last message before the stop), and the time of the operator's reply (the next user message in the log). The whole interval from the agent's stop until the reply is "blocked waiting for the operator" and is excluded from the run time, including the time the operator spent bringing it to the assistant and any break. The operator's own time stamps are only a cross-check; if they differ from the log, the log wins and the report says so.

**Time without the operator's gaps.** The operator may be away (a meeting, a break), and a long wait for the operator must not count as the agent's time. The run time is:

> T1 − T0 − the time the agent was blocked waiting for the operator, before T1.

- "Blocked waiting for the operator" means the time from the moment the agent asks a question or asks for an approval until the operator's reply. The session log has it: an `AskUserQuestion` call until its answer, or a stop of the agent until the next operator message.
- A stop of the agent while it waits for its own background subagents is agent time. It is **not** removed.
- The operator's own question rounds are not added back as counted time. The time shown in the data block and in the results table is the gap-free time.
- The data block keeps real `t1` and `t2`. `t0` is the effective start: `t1` minus the gap-free time. The real `t0` stays in the timeline row #1, and the report explains the arithmetic in section 8 (waits listed).
- T2 = T1 unless the protocol allows a follow-up (step 7). Messages after T1 that the protocol does not define are `extra-work` and are not counted.

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

### Prompt — step 5, side by side (one task × one runner, 8 methods)

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

Built by one command from the data blocks of all run reports:

```bash
python3 rosetta-benchmarks/saleor/scripts/collect-results.py --out rosetta-benchmarks/saleor/reports/summary.md --csv rosetta-benchmarks/saleor/reports/runs.csv
```

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
    ├── EXPERIMENTS.md                          # the 32 runs + status
    ├── scripts/bench.sh                        # setup, reset, start, stop, health
    ├── scripts/session-usage.py                # token breakdown of one Claude Code session
    ├── methods/<method>.md                     # one file per method: setup + each run (small/large × Claude Code/Copilot)
    ├── templates/                              # run report templates + metric definitions (README.md)
    ├── runs/<task>/<runner>/<method>/          # one folder per run: report.md, agent-report.md, tokens.md, <repo>.diff (+ plan.md for Baseline)
    └── reports/                                # judge outputs, mapping.csv, summary tables
```

`<task>`: `small-storage-conditions` · `large-age-restriction`. `<runner>`: `claude-code` · `copilot`. `<method>`: `baseline` · `grill-with-docs` · `superpowers` · `spec-kit` · `aws-ai-dlc` · `rosetta` · `rosetta-light` · `rosetta-skills`.

## 8. How to improve the benchmark

1. Repeat each experiment several times (at least 3 per cell), so one lucky or unlucky run doesn't decide the result.
2. Add a set of runs with an Opus-class model instead of Sonnet (Claude Code: Opus 5.5, medium) to check that the ranking holds.
