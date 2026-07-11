# coding-agents-hooks-authoring
Reference sheet for authoring, registering, and debugging Rosetta's cross-IDE hooks and their SemanticKind taxonomy.

## Why it exists
Without this skill a capable model would place a new hook helper file directly at the top level of `src/hooks/src/hooks/`, assume the bundler recurses into subdirectories, forget to add the hook to every plugin's `hooks.json.tmpl`, or widen a JSON matcher without also updating `lookupToolKind`/`toolKinds` — each of these produces a hook that silently never fires (or produces a dead bundle) with no error at authoring time, only a CI regression-test failure or a runtime no-op.

## When to engage
Triggers: authoring or registering a Rosetta hook, adding a `SemanticKind`, or debugging a hook that won't fire (per `description`). No entry in `bootstrap-alwayson.md`'s engagement lists, so it is not restricted to orchestrator or subagents — `disable-model-invocation: false` + `user-invocable: true` means it both auto-engages on matching context and is directly callable by any agent. No declared `<prerequisites>` (schema section absent here).

## How it works
Single flat `SKILL.md`; no `assets/` or `references/` subfolders — everything lives under one root `<hooks_authoring>` wrapper (a non-standard tag name; the skill does not use the schema's usual `<role>`/`<when_to_use_skill>`/`<core_concepts>`/`<process>` section split). Body is a sequence of plain `###` subsections: hook entry rule, helper placement, non-recursive build, adding a SemanticKind (4-step procedure), registration paths per plugin, platform-scoped events, tests, sync command, pitfalls, and a reference-files list.

## Mental hooks & unexpected rules
- "There is **no `{ recursive: true }`**. Subdirectories are invisible to the bundler." — a helper file dropped one level too shallow silently compiles into a dead top-level bundle for all 5 IDEs.
- "`SemanticKind = keyof typeof TOOL_KINDS` so TypeScript enforces coverage." — adding a kind without updating every IDE column is a compile error, not a runtime surprise.
- "Matcher passes the event in; `toolKinds` must include the mapped kind or the call is dropped silently." — widening `hooks.json.tmpl`'s matcher alone does nothing; the drop has no log line.
- "Direct edits to generated `hooks.json` files are overwritten on the next `npx -y rosettify-plugins@latest` run." — the template (`.tmpl`) is the only editable source; the generated file is a build artifact.
- "`PreToolUse` is absent on Copilot" — per-IDE event support gaps are real; a platform-exclusive event must be added to `CLAUDE_CODE_ONLY_HOOKS` or the registration test mis-flags it.
- "Before adding a second scoped hook, refactor the Set to `Map<string, Set<IdeName>>`." — a forced refactor threshold triggered by count, not by a stylistic preference.
- "Regex `[rf]{2,}` false positives — matches `rm -rr` and `rm -ff`." — a named regex anti-pattern with the exact fixed lookahead pattern to use instead.
- "`buildDenyMessage` echoes `evidence` to transcript by default. Pass `redact=true` for DANGEROUS_CONTENT matches" — evidence logging defaults to unredacted; secrets leak into the transcript unless the flag is passed explicitly.

## Invariants — do not change
- `name: coding-agents-hooks-authoring` must equal the folder name; registered in `docs/definitions/skills.md` (line 42) — renaming either breaks discovery.
- `disable-model-invocation: false` / `user-invocable: true` are both explicit per `docs/schemas/skill.md`'s requirement that these two keys always be set even at default values.
- Root `<hooks_authoring>` open/close tag pair — the schema convention is `<[the_skill_name]>` (matching the skill name), but this skill uses a distinct wrapper name; keep it internally consistent since nothing external parses it, but do not assume it equals the skill name when copying the schema template.
- Exact file paths and line references quoted in the body (`src/hooks/scripts/build-bundles.mjs:24`, `src/hooks/src/runtime/run-hook.ts:98`, `hooks-registered.test.ts`) are load-bearing pointers into the real source tree; if the referenced code moves, these become silently stale documentation.
- The 5 plugin `hooks.json.tmpl` paths listed under Registration are the canonical source list; the Windsurf caveat ("registration is not covered by the regression test... register manually if needed") is the one plugin without an automated safety net — do not drop that caveat when editing.
- Sync command `venv/bin/python scripts/pre_commit.py` is the only documented way to rebuild bundles, run tests, and re-sync `instructions/r{2,3}/core/` into plugin directories; changing this command without updating the underlying script breaks every downstream plugin.
- Frontmatter `description` is the always-visible, keyword-dense trigger for auto-activation ("author, register, and test Rosetta hooks, add a SemanticKind, or debug a hook that won't fire") — thinning these keywords narrows when the model self-selects this skill.
- Hook event names (`PreToolUse` and siblings), the `hooks.json`/`hooks.json.tmpl` schema shape, and the `SemanticKind`/`TOOL_KINDS` naming are external IDE contracts shared with `src/hooks/src/runtime/ide-registry.ts` and 5 plugin templates; renaming any of these in prose without renaming them in source produces documentation that no longer matches the code it describes.

## Editing guide
Safe to change: prose wording inside each `###` subsection, reordering pitfalls, adding new pitfalls. Handle with care: the 4-step SemanticKind procedure (order matters — `toolKinds` gating happens in `run-hook.ts:98` before `run(ctx)`), the exact regex fixes under Pitfalls, and every quoted file:line reference (verify against source before editing, since staleness is silent). New content belongs directly in `SKILL.md`; there is no `assets/`/`references/` split — if per-IDE detail grows, that split (one file per IDE row, or a dedicated `references/semantic-kinds.md`) is the natural place to move it. No other skill or rule file in `instructions/r3/core` references this skill by name (confirmed by repo-wide grep) — it is a standalone reference sheet, not a declared prerequisite of anything else.
