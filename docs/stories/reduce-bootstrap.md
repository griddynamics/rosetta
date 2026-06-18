# Story: Shrink the Running Bootstrap & Make Plugins Primary

Status: DRAFT. Do not implement until approved.
Scope: **r3 only**. Validation design: deferred.

**Authority of this story:** it defines intent, constraints, and the surfaces that must change. It does not pre-decide design. Items needing judgment are marked _[implementer: review & decide]_; items settled by the requester are marked _[decided]_. Mappings labelled "candidate" are starting points to refine, not rulings.

**Goal:** reduce the **running context** the agent carries while executing a request — make the always-injected bootstrap as small as possible (ideally → 0) by moving content behind a user-invoked entry and on-demand skills. Constraint: do **not** merge files into one large core; splitting further is acceptable.

## The `/rosetta` entry (linchpin)

Rosetta becomes a **user-invoked `/rosetta` skill**. Invoking it carries user authority ("the user told you to do X"), which the model obeys natively — so the always-on browbeating prose is no longer needed.

- Delete the adherence / anti-rationalization / red-flags prose (do not just compress it).
- No per-request classification. Only `/rosetta` requests get the full Rosetta treatment; a plain request runs as a normal agent.
- `/rosetta` procedure: load context → select workflow → hand off. No persistence machinery; the workflow + plan carry execution.

## Target always-on footprint

Minimal shared bootstrap (tiny) **+ exactly one mode file** (tiny). Everything heavy lives behind `/rosetta`, skills, and workflows, loaded on demand. Reduce each injected payload toward 0.

**The model is a minimal always-on bootstrap *plus* skills, working together — not "bootstrap *or* skills," and not an empty bootstrap.** A small bootstrap stays always-on; the always-present skill *descriptions* (native coding-agent behavior) drive auto-activation and the skill bodies load on demand. "Toward 0" means shrinking the always-on bootstrap *prose*, not removing the bootstrap or its behavior: guardrails (`hitl`, `sensitive-data`, etc.) keep firing through their skills, not through always-on rule text.

## Mode binding: one alias, different behavior

Command aliases are written once, mode-agnostically, in every skill/workflow. Exactly one mode file is injected per environment and binds each alias to a concrete mechanism — the only place mode logic lives. Three mutually exclusive modes:

- **Plugin mode → `plugin-files-mode.md`**: aliases bind to literal local reads from the plugin install location.
- **MCP mode → `bootstrap.md`**: aliases bind to MCP behavior plus MCP-only mappings ("X means Y by doing Z", e.g. `query_instructions` / `rosetta://{path}`). The `FILE <subpath>` form is deterministic in MCP: RAGFlow stores **path-based tags (2-/3-part)** and the VFS merges/bundles the same tree as `plugin_generator.py`, so `READ SKILL x FILE assets/y.md` resolves the exact file (`ACQUIRE x/assets/y.md FROM KB`), not a fuzzy query.
- **Local / in-repo dev mode → `local-files-mode.md`**: aliases bind to literal local reads from the `instructions/r*` folder (developing Rosetta itself).

Call sites never branch on mode. The alias vocabulary is a **closed contract**: every alias used anywhere must be bound by all three mode files, or it breaks in that mode. Defining and policing that finite set is part of this work.

## Verb / alias vocabulary (W4)

Proposed shape: **`VERB ARTIFACT <name> [FILE <subpath>]`** — clear in plugin mode, deterministically mappable to the MCP equivalents.

Two verb families:

- **Typed artifacts** keep the canonical verbs **`USE SKILL`**, **`USE FLOW`**, **`INVOKE SUBAGENT`** — each means "load and act on this artifact."
- **Generic files** (assets, references, rules, templates): **`READ`** = load into context; **`APPLY`** = read and execute the file's contents.

Anchor example _[decided]_: `ACQUIRE the-skill/assets/some-file.md FROM KB` → **`READ SKILL the-skill FILE assets/some-file.md`** (plugin: read `skills/the-skill/assets/some-file.md`; MCP: maps to the `ACQUIRE` equivalent).

### Transformation patterns to apply

- **P1 — load:** `ACQUIRE <x> FROM KB` → `READ …` for generic files, or `USE SKILL` / `USE FLOW` / `INVOKE SUBAGENT` when `<x>` is a skill/flow/subagent.
  - `ACQUIRE rules/bootstrap.md FROM KB` → `READ RULE bootstrap`
  - `ACQUIRE reverse-engineering/SKILL.md FROM KB` → `USE SKILL reverse-engineering`
- **P2 — load + execute** _[decided]_: `ACQUIRE <x> FROM KB and (FULLY) EXECUTE` → `APPLY …` for generic files. (Typed artifacts already imply execute via `USE`/`INVOKE`.)
  - `ACQUIRE speckit-integration-policy.md FROM KB and execute it` → `APPLY RULE speckit-integration-policy`
  - `ACQUIRE requirements-authoring/assets/ra-validation-rubric.md FROM KB and run validation` → `APPLY SKILL requirements-authoring FILE assets/ra-validation-rubric.md`
- **P3 — bulk normalization:** alias terms appear throughout (phase bodies, steps, examples, schemas, docs, footers). Normalize every occurrence of `ACQUIRE/SEARCH/LIST` and any non-canonical wording to the canonical vocabulary across all files.
  - `SEARCH <keywords> IN KB` and `LIST skills IN KB` → the canonical listing/search verbs (see below)

### Candidate mapping of actual r3 usage — _[implementer: review & decide]_

Audit basis for the vocabulary; finalize per category.

| # | Pattern today | ~Count | Candidate |
|---|---------------|--------|-----------|
| 1 | `ACQUIRE aqa-flow-data-collection.md FROM KB` (phase chaining) | ~35 | `USE FLOW aqa-flow-data-collection` |
| 2 | `ACQUIRE reverse-engineering/SKILL.md FROM KB` (skill load) | ~12 | `USE SKILL reverse-engineering` |
| 3 | `ACQUIRE planning/assets/pl-wbs.md FROM KB` (skill asset/ref) | ~20 | P1 `READ SKILL planning FILE assets/pl-wbs.md` · P2 `APPLY SKILL requirements-authoring FILE assets/ra-validation-rubric.md` |
| 4 | `ACQUIRE rules/bootstrap.md FROM KB` (rule/template) | ~8 | P1 `READ RULE bootstrap` · P2 `APPLY RULE speckit-integration-policy` |
| 5 | `ACQUIRE agents/<x>.md … EXECUTE` (subagent) | ~1 | `INVOKE SUBAGENT <x>` |
| 6 | `ACQUIRE <selected TAG> FROM KB` (tag/dynamic) | ~6 | agent selects, then uses the typed verb above |

- **`LIST`** (~10 uses, enumerates folders) — _[implementer: review & decide]_ keep as a mode-bound listing verb (e.g. `LIST SKILLS` / `LIST WORKFLOWS` / `LIST AGENTS`) or replace with the generated `INDEX.md`.
- **`SEARCH`** (~0 real callers) — _[implementer: review & decide]_ keep or drop.
- **Dangling ref:** `ACQUIRE questions.md FROM KB` in `requirements-authoring/SKILL.md` targets a non-existent file — _[implementer: review & decide]_ fix or remove.
- **`USE FLOW` vs `RUN WORKFLOW`** — _[implementer: review & decide]_ (`USE FLOW` is the existing canonical term).

### `<references>` footers — _[implementer: review & decide]_ per file

The schema marks `<references>` optional. For each file with one: if it only repeats dependencies already invoked inline, **remove it**; otherwise **convert each item to canonical form** and drop any prose verb-teaching line.

**Example A — convert** (`requirements-authoring-flow.md`). Before:

```
<references>

Use `USE SKILL` for skills, `ACQUIRE FROM KB` for rules.

Skills:
- skill `requirements-authoring` - authoring, reviewing, validating requirements

Rules:
- rule `rules/requirements-best-practices.md` - requirements quality and process rules

</references>
```

After (drop the prose line; canonical verbs per item):

```
<references>

Skills:
- USE SKILL `requirements-authoring` — authoring, reviewing, validating requirements

Rules:
- READ RULE `requirements-best-practices` — requirements quality and process rules

</references>
```

**Example B — remove** (`self-help-flow.md`). Its footer items are all already invoked in the phase bodies (`USE SKILL natural-writing` in phase 3, `reasoning` recommended in phase 3, `discoverer` as the phase `subagent=`), so the footer is redundant → delete it:

```
<references>

Subagents:
- INVOKE SUBAGENT `discoverer` — KB listing, acquisition, and guidance

Skills:
- USE SKILL `reasoning`
- USE SKILL `natural-writing`

</references>
```

## Subagents (W3): `load-subagent-context` skill

- The same minimal bootstrap is injected to every agent. The orchestrator instructs each subagent to load its subagent skill (`load-subagent-context`). `/rosetta` and role skills load what the orchestrator needs; `load-subagent-context` loads what a subagent needs.
- `load-subagent-context` replaces the `load-context-instructions` + `load-context` chain for subagents, allowing the "if subagent / if not" branches to be removed from the always-on bootstrap.
- Subagent prep: minimal seed → read `CONTEXT.md` + `ARCHITECTURE.md` (full) → grep `MEMORY.md` headers → pick up assigned steps via OPERATION_MANAGER `next --target`. No workflow selection, no full project-context load.
- Add `load-subagent-context` to `docs/definitions/skills.md`.

## Enforcement in MCP = same as plugins (via shells)

MCP gets the same minimal bootstrap and behaves identically (loads skills by context; orchestrator instructs subagents). On init, Rosetta installs skill/subagent/workflow shells (proxy files) that enforce loading the same way plugins do. The only behavioral shift: classify only on `/rosetta`, not every request.

## Blast radius / scope

- IN: `instructions/r3/core/**` (the ~50 files using `ACQUIRE/SEARCH/LIST`, the bootstrap + three mode files, the shell templates), `scripts/plugin_generator.py` rewrite rules, plugin regeneration, `docs/definitions/skills.md`, per-platform delivery payloads (hook / rules / MCP bundle) shrunk toward 0.
- IN — **`docs/ARCHITECTURE.md`** (targeted): the *Command Aliases* table (new vocabulary + per-mode binding), the *Bootstrap Flow* section (replace "all rules bundled" / "all prep steps mandatory regardless of size" / "classify every request" with: minimal bootstrap + classify only on `/rosetta`), and the alias-vs-file-read boundary wording. Unchanged: RAGFlow, Bundler/VFS/tagging, the underlying MCP tools (they become the MCP binding targets), `rosettify`.
- IN — **contract-of-record docs** (teach the new vocabulary + model, else future prompts reintroduce old terms): `coding-agents-prompt-authoring/references/pa-rosetta.md`, `pa-rosetta-intro-for-AI.md` (also correct the "all agents get the same bootstrap" claim), `pa-hardening.md` and other `pa-*` references citing aliases, the `coding-agents-prompt-authoring` SKILL, and `docs/schemas/*.md` (workflow/skill/agent schemas teach the aliases and `<references>` format). Because the refactor changes the always-on set, update the injected-bootstrap list in `pa-rosetta-intro-for-AI.md` and `pa-rosetta.md`'s load procedure to match the new minimal bootstrap (it currently names `bootstrap_hitl_questioning`, which r3 no longer has).
- OUT: `instructions/r2/**`, MCP server behavior, project-scoped `ABOUT/QUERY/STORE` aliases.

## Open / to confirm

**Gate:** items 1 and 3 are a prerequisite — finalize the closed alias set **before** any P3 bulk normalization and before the three mode files bind aliases. The verb *shape* is `[decided]`; the *complete set* and per-category mapping are not.

1. **Verb vocabulary** — confirm the `VERB ARTIFACT <name> [FILE <subpath>]` shape and the per-category mapping, including whether flow **phase** files use `USE FLOW` or `APPLY`. (`USE SKILL` / `USE FLOW` / `INVOKE SUBAGENT` already exist canonically in `pa-rosetta.md`; this work formalizes them and adds only `READ` / `APPLY` + the `FILE <subpath>` form.)
2. **Minimal bootstrap contents** — what irreducibly stays always-on once the adherence prose is gone.
3. **Closed alias set** — finalize the complete vocabulary so all three mode files can bind every alias.

---

## Appendix — Original intent & requester clarifications (verbatim, no inference)

### Original request

AI Coding Agents (claude code, codex, cursor, etc) are overloaded with our bootstrap and context and users do not always want heavy workflow.

1. The bootstrap that we always load is way too big.
2. Switch from "just say your problem" to "/rosetta just say your problem" (plugin_files_mode/bootstrap.md goes in it, but much more compressed, less fighting with the system prompt).
3. Introduce a `load-subagent-context` skill — the only one a subagent must execute (instead of load-context-instructions and load-context), tailored only for subagents (so less if/then and duplication of instructions in the main bootstraps too). A subagent only needs that common minimal bootstrap, then CONTEXT.md / ARCHITECTURE.md and grep MEMORY.md; the rest the orchestrator should have prepared already.
4. Make plugins primary, MCP secondary. Completely remove the ACQUIRE FROM, SEARCH IN, LIST and other terms; instead use something generic, similar to USE SKILL / RUN WORKFLOW, that works automatically in plugin mode, while providing instructions for MCP mode. Be extremely careful with ACQUIRE FROM — it was used to load any file in any context (asset for a skill, reference in a skill, workflow, any arbitrary rule, etc.).

### Clarifications (requester's words)

- The adherence text: we introduce a skill the user invokes, so the AI doesn't need to reason anymore — that adherence text becomes obsolete. Before it was just in context; now it is written as "USER SAID DO X." Same for the anti-rationalization / red-flags text.
- Classification: we no longer need to direct everything to Rosetta — the user makes a decision. Do not classify every request; classify only `/rosetta` requests. It just works.
- Subagents: you can inject the same minimal bootstrap, then the orchestrator demands the subagent load the subagent's skill. `/rosetta` and the other skills inject what is needed for the orchestrator. Clear separation of concerns and context.
- MCP mode: the task must include ideas/options for MCP mode — how the agent identifies whether to read a local file or request it from MCP. We could make rosetta-cli change content before publishing to MCP, but the best option is command aliases that are clear for plugin mode (it just reads), while for MCP we add a simple mapping "X means Y by doing Z" in the MCP bootstrap itself. MCP needs the mapping anyway; plugin context is reduced again.
- Mode files: we also provide MCP a `bootstrap.md` which contains any deltas/explanations/mappings for MCP mode operation; the plugin gets `plugin_files_mode.md` for the same reason. This is a way to make one command alias and then assign it different behavior. `local-files-mode.md` basically points to the `instructions/r*` folder and says use that folder — not plugin, not MCP, local files.
- Size/structure: I do not care that these files are tripled in the Rosetta repo. I care about the running context when the agent actually executes a user request. I want to make them smaller or even disappear. I do not want to merge them and have a lot of cognitive load in each. I am actually happy to split something more. We reduce the size of each, even to 0 if possible. MCP gets exactly the same minimal bootstrap context and works exactly the same, with skills loaded based on context; the same orchestrator tells subagents. This is a mild shift in architecture and logic. Upon init we will have skill/subagent/workflow shells, which enforce it the same as plugins. I never asked for de-duplication.
- Verbs / examples: example — "ACQUIRE `the-skill/assets/some-file.md` FROM KB" becomes "READ SKILL `the-skill` FILE `assets/some-file.md`" (clear for plugin mode, easy to match to ACQUIRE FROM KB in MCP mode). We could also use the term APPLY instead of READ, meaning read and apply. I want that "ACQUIRE and EXECUTE" to be an exact pattern and use APPLY in that case. Those are two patterns, plus bulk which is a third pattern.
- References pattern: first of all, do we even need it? (those refs could already be mentioned multiple times.) If we still do, convert each item to be like in `self-help-flow.md`. The pattern is not only in references — it could be everywhere; keep the reference-pattern decision and document the bulk items to use canonical wording.
- Scope: we must also update pa-rosetta and similar files as part of the task.
- Decisions: do not decide yourself — tell the implementer to review and decide.

---

> **Maintenance principle — this story file SHRINKS as work lands.** When an item is implemented, collapse it to a one-line nudge and delete detail no longer needed. Keep only: open work (full detail), tiny done-nudges, and durable decisions. Do not let it grow; do not keep finished how-it-was-done prose.
