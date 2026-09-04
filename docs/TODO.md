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

`instructions/r3/workflows/agents/<agent>~profile-lightweight-only~overwrite~.md` (ten files) are full
copies of the ten base agent documents differing in exactly one line: the `model:` candidate list.
A FilenameDirective override replaces a whole document, so there is no partial-override mechanism
today; a base agent edit must be mirrored by hand into its light twin or the two silently diverge.
Options: a frontmatter-only override kind (apply just the declared keys, inherit the body), or a
per-profile model-list map keyed by document path. Guard in the meantime: `diff` each pair and
expect exactly one changed line.

## TODO: instructions — harness configure references still name superseded models

`instructions/r3/core/skills/harness/references/configure/{claude-code,codex,cursor,github-copilot,opencode,windsurf}.md` document
what each IDE itself accepts (e.g. `configure/cursor.md`: "The `model` field accepts the following model
id values", listing `gpt-5.1-codex-max`, `grok-code-fast-1`, `composer-2-fast`). They were deliberately
left out of the issue #187 model upgrade because rewriting them asserts IDE capabilities we cannot
source, so they still name `claude-opus-4-8`, `gpt-5.4-medium`, `gemini-3.1-pro` and friends — and they
DO ship into every plugin. Refresh each list against that IDE's own published model list, then
regenerate. Same reasoning left `docs/hooks/**` alone: those are captured payloads and transcripts,
i.e. recorded evidence, not choices.

## TODO: instructions — model tier cues overlap now that one Gemini spans all three tiers

The schema tier taxonomy (`docs/schemas/*.md`, `templates/shell-schemas/*.md`) keys tiers off token
substrings: large `{opus, high, sol}`, medium `{sonnet, medium, ..., terra}`, small `{haiku, flash,
mini, low, luna, ...}`. With every Gemini collapsed to `gemini-3.7-flash`, `flash` now appears at all
three efforts, so `flash` sitting only in the small tier is misleading. The dead `pro` cue was removed;
deciding whether tier membership should key off the effort suffix instead is a taxonomy decision.

## DECIDED: r2 is pinned and must not be model-upgraded

`instructions/r2/` still names the pre-#187 models (~91 occurrences) and stays that way. r2 is KTLO:
the committed plugin trees build from r3, and a frozen release nothing here regenerates or tests must
not drift. Model upgrades apply to R3 only. Owner decision, 2026-08-19 — do not "fix" these tokens.

## TODO: plugin-generator — no Copilot identifier established for Grok or Composer

`src/rosettify-plugins/src/spec/model-maps.ts` maps `grok-4.6*` and `composer-2.5` for Cursor
(identity values; the repo's authoring catalogue names both as Cursor models, and the superseded
`grok-4.5` upgrades forward to `grok-4.6`) but carries no Copilot entry for either, so those tokens
are dropped from Copilot's `subagent_required_model` lists. That records only that no Copilot-native identifier has been established here — it is NOT a
finding that Copilot lacks the models. Resolve by confirming what Copilot calls them and adding the
entries, or by recording a sourced decision that Copilot does not offer them.

## REVIEW: Move speckit-integration-policy into arrange-workspace-flow

**Status:** Proposed

**What:** Owner-requested follow-up from #315. The rule ships in `core/rules/` and each tool's rules mechanism picks it up; Claude plugins have no rules mechanism so it is pseudo-dormant there. Folding it into `arrange-workspace-flow` was the stated intent.
