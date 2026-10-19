This file contains grep compatible list of very concise improvements, suggestions, large TODOs, etc. Do not create TOC, it should come from grep.

## REVIEW: Build dockerimage using UVX

**Status:** Proposed

**What**: src/rosetta-mcp-server/Dockerfile to use `uvx rosetta-mcp@<specific-version>` instead of `Python -m`. 

## REVIEW: Split plugins from marketplace

**What:** Have plugins.json extracted from marketplace and marketplace just references the file/folder. To make it reusable.

## TODO: Hooks — lint-format-advisory deferred

**Status:** Deferred — moved from `docs/plans/2026-05-05-lint-format-advisory.md`

- **Strict plan-step dedup** — read `plans/<name>/plan.json` and skip the advisory if a syntax/type/lint/format step is already present; currently only time-based throttle prevents double-nudge.
- **Actual linter invocation** — replace the advisory with on-demand execution of language-appropriate tooling (per-extension map: `ruff` for `.py`, `eslint`/`tsc` for `.ts`/`.js`, `prettier` for `.css`/`.html`, etc.).
- **Session-long throttle TTL** — extend `src/hooks/src/runtime/throttle.ts` with a per-hook `ttlMs` option so `lint-format-advisory` can dedupe per `(session, filePath)` for the entire session lifetime, not just 5 seconds.


## TODO: Hooks adapter gaps (from QA 2026-05-23)

- **Gemini CLI hook validation** — https://github.com/griddynamics/rosetta/issues/93
- **Unknown-tool fallback live test** — https://github.com/griddynamics/rosetta/issues/95
- **Adapter as public consumable module** — https://github.com/griddynamics/rosetta/issues/96
- **OpenCode + JetBrains/Junie validation** — https://github.com/griddynamics/rosetta/issues/97
- **VS Code hook support** — https://github.com/griddynamics/rosetta/issues/98

## TODO: Requirements — split oversized plugin-generator requirement files

`docs/requirements/plugin-generator/` files over the 300-line refactor threshold, deferred from the
profiles change so that change stayed reviewable:
- `FR-ARCH.md` — 898 lines. Split by concern (VFS/directives · processor tiers · pipeline · parity).
- `FR-COPY.md` — 418 lines. Candidate split: extract model handling (FR-COPY-0020/0021/0022/0080/0081/
  0082/0083/0084) into `FR-MODEL.md`, preserving ids.
- `FR-CLI.md` — 338 lines.
IDs must stay stable across any split; update INDEX.md and cross-references.

## TODO: Requirements — `FR-ARCH-*` id prefix is ambiguous across components

`FR-ARCH-0016` is defined only in `docs/requirements/rosettify/ARCH.md`, while
`docs/requirements/plugin-generator/FR-ARCH.md` defines its own `FR-ARCH-0001..0059`. One prefix,
two components, so a bare `FR-ARCH-00NN` reference is ambiguous repo-wide. Consider component-scoped
prefixes (e.g. `FR-PGARCH-*` vs `FR-RSARCH-*`) or a documented qualification convention.
No current cross-component citation is broken.

## TODO: plugin-generator — requirement ids embedded in emitted log messages

`src/rosettify-plugins/src/generate.ts` and `plugin-processors/plugin-process-spec-entries.ts` pass
requirement ids inside logger message strings (e.g. `'FR-ARCH-0050: plugin-processor start'`,
`'FR-ARCH-0049: excluded file ghost frame ...'`). These are emitted output, visible under `--verbose`,
and conflict with the standing rule that requirement ids belong in code comments only, never in
user-facing strings. Pre-existing (present at HEAD before the build-profiles change); the two
equivalent defects in `--help` text were fixed with that change. Move the ids into adjacent comments
and leave the log messages plain.

## TODO: instructions — lightweight agent documents duplicate their base counterparts

`instructions/r3/core/agents/<agent>~profile-lightweight-only~overwrite~.md` (ten files) are full
copies of the ten base agent documents differing in exactly one line: the `model:` candidate list.
A FilenameDirective override replaces a whole document, so there is no partial-override mechanism
today; a base agent edit must be mirrored by hand into its light twin or the two silently diverge.
Options: a frontmatter-only override kind (apply just the declared keys, inherit the body), or a
per-profile model-list map keyed by document path. Guard in the meantime: `diff` each pair and
expect exactly one changed line.

## TODO: instructions — configure/*.md IDE model catalogues: newest models added 2026-10-13, superseded ones kept

On 2026-10-13 the newest models were added to `instructions/r3/core/configure/{claude-code,github-copilot,cursor,codex,opencode,windsurf}.md` (and the identical copies in `skills/harness/references/configure/`), using each vendor's own id format: Claude Code full ids and aliases, Copilot display names, Cursor ids with bracketed options, Codex ids, OpenCode `provider/model_id` (checked against Models.dev), Windsurf effort-suffixed `model_uid`. Superseded entries were kept (Cursor legacy lines on purpose). Still open: Cursor ids for GPT 6.1 Sol, Gemini 3.8 Flash and Grok 4.7 are inferred from Cursor's naming pattern, not quoted from its docs; Windsurf docs do not confirm a `model:` field in workflow files and list no Haiku 5.5; Codex docs name Max and Ultra effort levels but not the config values, so `model_reasoning_effort` keeps `minimal|low|medium|high|xhigh`. Copilot lists `Grok 4.7`, which the generator's Copilot map still lacks (next TODO). The text below is the earlier note.

`instructions/r3/core/configure/{claude-code,codex,cursor,github-copilot,opencode,windsurf}.md` document
what each IDE itself accepts (e.g. `configure/cursor.md`: "The `model` field accepts the following model
id values", listing `gpt-5.1-codex-max`, `grok-code-fast-1`, `composer-2-fast`). They were deliberately
left out of the issue #187 model upgrade because rewriting them asserts IDE capabilities we cannot
source, so they still name `claude-opus-4-8`, `gpt-5.4-medium`, `gemini-3.1-pro` and friends — and they
DO ship into every plugin. Refresh each list against that IDE's own published model list, then
regenerate. Same reasoning left `docs/hooks/**` alone: those are captured payloads and transcripts,
i.e. recorded evidence, not choices.

## TODO: instructions — model tier cues overlap now that one Gemini spans all three tiers

The schema tier taxonomy (`docs/schemas/*.md`, `templates/shell-schemas/*.md`) keys tiers off token
substrings: large `{opus, high, sol, argon}`, medium `{sonnet, medium, ..., luna-high}`, small `{haiku, flash,
mini, low, luna, ...}`. With every non-Pro Gemini collapsed to `gemini-3.8-flash`, `flash` now appears at all
three efforts, so `flash` sitting only in the small tier is misleading. The same is now true of `luna`:
the former workhorse `terra` tier was folded into `gpt-6-luna` (effort raised one step), so `luna`
spans small (`gpt-6-luna`, `-medium`), medium (`-high`) and large (`-xhigh`) by effort alone. The dead
`pro` cue was removed and `argon` (the Gemini Pro tier since 2026-10-14) joined the large cue; `flash` stays in the small tier. Deciding whether tier membership should key off the effort suffix instead is a
taxonomy decision.

## DECIDED: r2 is pinned and must not be model-upgraded

`instructions/r2/` still names the pre-#187 models (~91 occurrences) and stays that way. r2 is KTLO:
the committed plugin trees build from r3, and a frozen release nothing here regenerates or tests must
not drift. Model upgrades apply to R3 only. Owner decision, 2026-08-19 — do not "fix" these tokens.

## TODO: plugin-generator — no Copilot identifier established for Grok or Composer

`src/rosettify-plugins/src/spec/model-maps.ts` maps `grok-4.7*` and `composer-2.5` for Cursor
(identity values; the repo's authoring catalogue names both as Cursor models, and the superseded
`grok-4.6*` and `grok-4.5` upgrade forward to `grok-4.7`) but carries no Copilot entry for either, so those tokens
are dropped from Copilot's `subagent_required_model` lists. That records only that no Copilot-native identifier has been established here — it is NOT a
finding that Copilot lacks the models. Resolve by confirming what Copilot calls them and adding the
entries, or by recording a sourced decision that Copilot does not offer them.

## TODO: models — identifiers assumed in the 2026-10-13 upgrade (Claude 5.5 / GPT-6.1 Sol / GPT-6 Luna / Gemini 3.8 Flash / Grok 4.7)

Claude Code ids (`claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`) come from the Claude API
model table. The Cursor short ids and Copilot display names (`Claude Opus 5.5`, `GPT-6.1 Sol`,
`GPT-6 Luna`, `Gemini 3.8 Flash`) follow the generator's existing naming pattern; they are not checked
against either IDE's published model list. Not verified: that `openai/codex-action` (pinned v1.11)
accepts `model: gpt-6-luna` with `effort: xhigh` in the `repo-plan` and `repo-triage` workflows. The
terra tier no longer exists as a target, so Cursor and Copilot cannot tell the old terra and luna tiers
apart (no effort in their ids). Left unchanged on purpose: `src/curiocity/demo/**` and
`M6-RESULTS.md` (a recorded run on older ids), `docs/stories/**`, and the retained superseded map keys.

Further open items from the independent review of this upgrade:

- **Haiku 5.5 and Claude Code auto permission mode.** The curiocity notes (`src/curiocity/src/agents/claude-code/profile.ts`, README) record that Haiku-class models did not support auto mode and hung on permission prompts. The light-profile `engineer`, `reviewer`, `validator` and `researcher` now resolve to `claude-haiku-5-5`. Not verified for Haiku 5.5. The `profile.ts` comment still says "Sonnet 5" because it records an observation, not a choice.
- **Curiocity model SDK.** `@ai-sdk/anthropic` 4.0.7 knows `claude-sonnet-5*` but not `claude-opus-5-5` or `claude-haiku-5-5`; for an unknown model it falls back to forced-tool JSON mode, which Opus 5.5 rejects (`tool_choice` any/tool is a 400). Matters only if a curiocity role is pointed at `opus-5-5`; the e2e config uses `sonnet-5-5`.
- **First `gpt-` token in a few workflow lists.** `init-workspace-flow.md` (documentation phase) and `research-flow.md` (`prompt_craft`) list `gpt-6-luna-xhigh` (from `gpt-5.6-terra-high`) before `gpt-6.1-sol-high`, so Codex picks luna there. This is the order the lists already had; reorder if sol should lead.
- **`llms-full.txt`** (root and `docs/web/`) still names `Sonnet 4.6` / `GPT-5.4-medium`. It was already two generations stale before this upgrade.
- **`rosettify-prompts` judge calls on a 5.5 model** keep thinking on at low effort with extra `max_tokens`; not exercised against the live API.

## TODO: models — Gemini 4 Argon identifiers (2026-10-14)

`gemini-4-argon` now takes the Gemini Pro tier (`gemini-3-pro*`, `gemini-3.1-pro*` resolve forward to it) in the generator maps and sits before `gemini-3.8-flash` on every list that also names opus. The Cursor id `gemini-4-argon` was confirmed by the owner from Cursor. The Copilot display name `Gemini 4 Argon` follows Copilot's own display-name format and is not checked against Copilot's published model list. Google had not published a public API id for Argon when this was added (limited rollout; only third-party sources name it), so `gemini -m gemini-4-argon` may be rejected; the `coding-agents-farm` skill already says to drop `-m` and relaunch on an `unknown model` rejection. `configure/cursor.md` and `configure/github-copilot.md` keep their legacy Gemini 3.1 Pro lines on purpose (superseded entries kept).

## TODO: plugin-generator — Cursor and Copilot Gemini maps key effort forms for the Pro tier, Argon and two Flash bases; three superseded Flash keys are bare

`CURSOR_GEMINI_MAP` / `COPILOT_GEMINI_MAP` use `effortForms()` for `gemini-4-argon`, the Pro-tier bases (`gemini-3.1-pro`, `gemini-3.1-pro-preview`, `gemini-3-pro`, `gemini-3-pro-preview`), `gemini-3.8-flash` and `gemini-3.7-flash`. The superseded `gemini-3.5-flash`, `gemini-3-flash` and `gemini-3-flash-preview` keys are bare. An effort-qualified form of those (for example `gemini-3.5-flash-low`, which `FR-ARCH-0057` says authors write on a superseded Flash token) is unmapped and passes through raw on Cursor and Copilot. Nothing in `instructions/r3` authors those tokens today, so no output is wrong yet. Decide whether to key those three bases with `effortForms()` too (adds 12 keys per map; update the key-count test).

## TODO: requirements — `MODEL.md` reference profile still mixes old and new values

The hypothetical `modelOverrides` example in `docs/requirements/plugin-generator/MODEL.md` and several profile-block criteria (`FR-COPY-0020` 2, 3, 5; `FR-COPY-0021` 4; `FR-COPY-0022` 3, 4; `FR-COPY-0083` AC4; `FR-COPY-0084` AC2) keep `gpt-5.4*` replacement values while the Claude and Copilot values moved to 5.5. They are illustrative profile blocks, not built-in behavior, and were left as in the #187 upgrade. Owner decision whether to make them consistent.

