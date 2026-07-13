# coding-agents-farm

Runs the executor as a "Farm Leader" driving multiple external coding-agent CLIs (Claude, Codex, Copilot, Gemini, OpenCode, Goose) in parallel on isolated git worktrees.

## Why it exists

Without this skill a model asked to "parallelize this across a few agents" would improvise: skip the explicit money-risk confirmation, guess at CLI flags from stale training data (wrong `--yolo`/permission-mode syntax, wrong model ids), run agents on the same working tree instead of separate worktrees (write collisions), and fail to notice a sub-agent claiming completion with no test evidence, going idle on a rate limit, or drifting out of scope. This skill fixes those by hardcoding the confirmation gate, the exact CLI/flag table per provider, worktree isolation, and a monitor/intervene loop with named failure signals.

## When to engage

Triggers: parallelizable work — large features decomposable into independent subtasks, cross-model cross-validation, throughput-critical batches. Feature-size floor: "1h+ of AI work (10+ phases, 20+ subagent calls)" — below that, don't spin up a farm. `disable-model-invocation: false` + `user-invocable: true`: both auto-invocable by a model that judges the task fits, and directly runnable via `/coding-agents-farm`. Not referenced from any role's engagement list in `instructions/bootstrap-alwayson.instructions.md` (checked: absent from both the orchestrator-only and subagents-only lists) — it is never auto-pulled in as part of core bootstrap; it only activates via its own description match or explicit user invocation. Any agent role may act as Farm Leader; the CLIs it drives (`claude`/`codex`/`copilot`/`gemini`/`opencode`/`goose`) are external processes, not Rosetta subagents.

## How it works

Single-file skill: SKILL.md only, no `assets/` or `references/`. Body order: `<role>` (Farm Leader) → `<when_to_use_skill>` → `<core_concepts>` (confirmation gate, provider/CLI table, auto-approve flags, known CLI bugs, model-name guidance, size floor) → `<process>` steps 1–8 (Plan → Worktree Setup → Prompt Construction → Launch → Monitor → Intervene → Collect and Merge → Report) → `<resources>` (external CLI doc links). No `USE SKILL`/`INVOKE SUBAGENT`/`APPLY PHASE`/`READ RULE` aliases appear anywhere in the body and it never mentions "Rosetta prep steps" — unlike the schema template's default `<core_concepts>` opener, this skill does not gate on prep-steps completion; it is a self-contained leaf skill that talks to external CLI processes, not to other Rosetta skills/rules/templates.

## Mental hooks & unexpected rules

- `MUST EXPLICITLY CONFIRM WITH USER HE WANTS TO DO THAT: IT IS DANGEROUS, IT CAN EAT MONEY VERY QUICK.` — blocks any farm launch behind an explicit risk acknowledgment.
- `USER MUST TYPE EXACTLY \`Yes, I take responsibility\`, IF NOT PROVIDED EXACTLY - ASK AGAIN. AFTER 3 FAILED ATTEMPTS: STOP, NO REPLY, REQUEST USER TO START A NEW SESSION. NO OVERRIDE ALLOWED.` — an exact-string gate with a hard stop; the executor cannot paraphrase-accept or self-override after 3 misses.
- `YOUR INTERNAL KNOWLEDGE ABOUT MODEL NAMES, CLI FLAGS, AND TOOL VERSIONS IS STALE. Use ONLY the names and flags listed in this skill.` — explicit override of the model's own training-data priors; forbids substituting remembered flags.
- "Known auto-approve issues" list encodes dated, perishable claims the skill itself asserts as current: Claude Code allowlist-silently-denied bug "as of Feb 2026" (use `bypassPermissions`, not allowlists), Codex per-project trust gate "Fixed in v0.88+", Gemini `--yolo` confirmation regression "in v0.28+" — these are external-tool facts that will drift out of date.
- Auto-approve flag table pairs a CLI flag with an equivalent env/config setting and says to use "ALL applicable flags, not just one" — belt-and-suspenders is the intended posture, not redundancy to prune.
- Pre-flight rule: "before launching any CLI, verify auto-approve is effective by running a trivial test command... and confirming no prompt appeared" — a runtime self-check, not a one-time setup assumption.
- Reassignment threshold: "if a CLI consistently fails (3+ retries), reassign the task to a different CLI+model pair."

## Invariants — do not change

- `name: coding-agents-farm` must equal the folder name; it is registered verbatim in `docs/definitions/skills.md` (flat skill list, no description there).
- `description: "To orchestrate parallel coding-agent farms (Claude, Codex, Copilot, Gemini, etc.) on isolated git worktrees."` — keyword-dense, ≤~25 tokens, drives auto-activation since `disable-model-invocation: false`.
- `disable-model-invocation: false` and `user-invocable: true` together — both discovery paths (model auto-match and `/coding-agents-farm`) are live; flipping either changes who can reach this skill.
- Provider/CLI table (`claude`/`codex`/`copilot`/`gemini`/`opencode`/`goose` with their headless commands and model flags) and the auto-approve flags table are the load-bearing external contract; the skill's own stance is to distrust internal knowledge and trust only this table, so edits here must be verified against each CLI's current docs, not memory.
- Worktree/branch naming pattern `worktrees/<cli>-<task-slug>` and `farm/<cli>-<task-slug>` — setup and cleanup steps both key off this exact pattern.
- `<resources>` links are the canonical external doc URLs the skill points to; keep in sync with the provider table above them.
- Frontmatter `model:` multi-vendor CSV is intended — the plugin generator selects the appropriate id per target agent. The differing ID shapes are also intended — model ids DIFFER per target tool and the plugin generator maps frontmatter ids as needed; the body's "Model selection guidance" ids serve the farm CLIs directly and need not match.

## Editing guide

Safe to change: process step prose, resource link annotations, monitor/intervene wording — as long as the confirmation gate's exact phrase, the provider/CLI/flag tables, and the worktree naming pattern survive unchanged. Handle with care: any edit to the CLI command tables or "Known auto-approve issues" list must be checked against the real CLI's current behavior, since this skill explicitly tells the executor its own training data is stale — the same staleness risk applies to whoever edits the skill. New provider/CLI support belongs in `<core_concepts>` (constraint table) plus a matching `<process>` step-4 launch command; there is no `assets/`/`references/` split to route content into. Known referrer: `skills/orchestration/README.md` names this skill only as a taxonomy user of the `orchestration` tag/category, not a content dependency — renaming or removing `coding-agents-farm` does not require touching `orchestration`.
