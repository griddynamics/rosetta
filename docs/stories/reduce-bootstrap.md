# Story: Shrink the Running Bootstrap & Make Plugins Primary

Status: **single plan of record for r3.** Build proceeds one-by-one with HITL checks; companion file `docs/stories/bootstrap-removed.md` is the loss-archive.
Scope: **r3 only** (`instructions/r3/core/**`; never r2 — files differ). **r2 is live/published — do not touch; r3 is in preparation, not deployed anywhere** — intermediate inconsistency is an authoring concern, not a runtime risk. (User-directed r2 exception executed: `plan-manager` dissolved into r2 `adhoc-flow` — see `bootstrap-removed.md`.) Executors of the resulting prompts: Sonnet 4.6 / GPT-5.4-class, later, on *other* repos. Validation design: deferred.

**Authority of this story:** it defines intent, constraints, and the surfaces that must change. It does not pre-decide design. Items needing judgment are marked _[implementer: review & decide]_; items settled by the requester are marked _[decided]_. Mappings labelled "candidate" are starting points to refine, not rulings.

**Roles.**
- **User (requester)** — the **ultimate decision maker.** Senior prompt/meta-process engineer and architect. Sets scope and intent; approves or rejects every change. Work runs as **propose → user review → change** cycles: the author proposes/analyses, the user reviews and decides, the author then changes — repeat. The author does not implement unapproved changes.
- **Author** (this work) — the AI assistant, refactoring Rosetta's own r3 instruction files *in this repo*. Moves content target-by-target, one-by-one, with HITL checks; proposes, never auto-decides. **Must read** `coding-agents-prompt-authoring/references/pa-rosetta-intro-for-AI.md` + `pa-rosetta.md` as grounding before authoring.
- **Reviewer** — background `prompt-engineer` subagent (opus, read-only) — reviews each artifact and recommends; never edits.
- **Executor** (downstream) — Sonnet 4.6 / GPT-5.4-class models that later run the *resulting* skills on *other* repos. When this doc says "the agent," it means this executor unless a section is explicitly about the author.

**Goal:** reduce the **running context** the agent carries while executing a request — make the always-injected bootstrap as small as possible (ideally → 0) by moving content behind a user-invoked entry and on-demand skills. Constraint: do **not** merge files into one large core; splitting further is acceptable.

**This is the single plan of record for r3** — intent, the seam, the concrete skill structure, the method, and sequencing all live here. Companion files: **`docs/stories/bootstrap-removed.md`** (the loss-archive — verbatim text + provenance of anything removed, so nothing is lost) and **`docs/stories/reduce-bootstrap-mental-model.md`** (the `orchestration` rebuild grounding — what it is and WHY).

## Why the bootstrap looks the way it does (the seam that drives this)

The bootstrap is not five files — it is one accreted **defense system**, and each layer is scar tissue over a specific way coding agents fail. None of it exists "because someone wanted it"; every layer answers a failure mode. The reduction is simply reassigning each defense to the mechanism that addresses its *root cause*:

1. **Rationalized step-skipping** ("this is simple, I'll just do it") — `EXTREMELY_IMPORTANT` / `RED_FLAGS` / `FORBIDDEN`. Root cause: always-on text has **no authority** — the model weighs it against the system prompt and its own judgment and talks itself out of it. The browbeating tries to manufacture authority through volume, and mostly fails — you cannot out-shout a model's prior.
2. **Non-deterministic process-following** (drops steps, loses the thread after compaction) — `OPERATION_MANAGER` / `Phase 0`. A **real capability gap**, not a rationalization. Must survive intact.
3. **Context hallucination** (answers from ambient assumptions, not *this* repo) — the prep / context-load steps. Root cause: nothing grounded the agent first.
4. **Catastrophic safety failure** (leaks a secret, deletes data, runs a dangerous command) — `guardrails` / `sensitive-data` / `dangerous-actions`. Can happen on a one-line task.
5. **False approval** (treats its own output as signed off, rubber-stamps, over-batches) — `hitl`.

**The seam.** Two fundamentally different kinds of defense were conflated:

- **Safety (4, partly 5) is unconditional.** A typo fix can still leak a secret. It must fire on *every* request regardless of phrasing.
- **Rigor (1, 2, 3) is "how to do good work" — expensive, and a *choice*.**

The `/rosetta`-only model is not packaging; it **is this seam**. A user who does not type `/rosetta` is choosing the lean path, and that choice is legitimate. The old bootstrap's real defect was not size — it was **fighting the user's lean choice with volume**, browbeating every request into heavyweight process nobody asked for. `/rosetta` makes rigor *requested*, so authority becomes **real instead of manufactured**.

**Consequence for the content (why this is re-voicing, not relocation).** Once rigor is explicitly invited, the anti-rationalization mass **largely dissolves** — there is nothing left to rationalize against, so most of `RED_FLAGS` / `EXTREMELY_IMPORTANT` has no job and should be deleted, not moved. What remains becomes a *calm, confident senior-engineer procedure* ("you asked for the rigorous flow — here it is"). The coercion itself is the thing we can finally delete, because **invitation does its job.** The always-on layer then shrinks to the safety floor plus a pointer to `/rosetta` — not because smaller is the goal, but because that is all that is unconditionally true for a request the user deliberately kept lean.

## Skill description field

GENERIC form: "To <verb> <what it does + when/why; dense keywords>".
CRITICAL/guardrail form: 'Rosetta CRITICAL MUST skill. MUST activate when <condition>'. 
Budget: all skills share ~1K tokens — keep ≤ ~25 tokens and dense; over-long is ignored the same as terse, keyword-dense descriptions trigger best. 
EXCEPTION: disable-model-invocation:true => this description is actually user friendly, no need to compress/etc.

## load-context-instructions and Mode Detection — ✅ done

Dissolved + archived. Modes are declared by injection, not probed (no IF/THEN): each mode file states its mode up top — plugin keeps the literal `RUNNING AS PLUGIN` marker; MCP `bootstrap.md` declares MCP Mode, startup chain = `get_context_instructions` (blocking; truncated → read full file) → `load-context` → `load-workflow`; local declares Local Files Mode. Fallback = `load-project-context`. Skill-ref lists stay worded `USE SKILL <name>` — skill tool activation needs the word "SKILL" + name together.

## The `/rosetta` entry (linchpin)

Rosetta becomes a **user-invoked `/rosetta` skill**. Invoking it carries user authority ("the user told you to do X"), which the model obeys natively — so the always-on browbeating prose is no longer needed.

- Delete the adherence / anti-rationalization / red-flags prose (do not just compress it).
- No per-request classification. Only `/rosetta` requests get the full Rosetta treatment; a plain request runs as a normal agent.
- `/rosetta` procedure: prereqs (`orchestrator-contract`, `hitl`) handle context → select workflow → hand off. No persistence machinery; the workflow + plan carry execution.

## Target always-on footprint

Minimal shared bootstrap (tiny) **+ exactly one mode file** (tiny). Everything heavy lives behind `/rosetta`, skills, and workflows, loaded on demand. Reduce each injected payload toward 0.

**The model is a minimal always-on bootstrap *plus* skills, working together — not "bootstrap *or* skills," and not an empty bootstrap.** A small bootstrap stays always-on; the always-present skill *descriptions* (native coding-agent behavior) drive auto-activation and the skill bodies load on demand. "Toward 0" means shrinking the always-on bootstrap *prose*, not removing the bootstrap or its behavior: guardrails (`hitl`, `sensitive-data`, etc.) keep firing through their skills, not through always-on rule text.

### The 4 keeps (always-on)

Only these remain injected on every request:
1. **It is `get_context_instructions` itself** — the entry / mode declaration.
2. **Enterprise setting + `reasonable`** — enterprise env, not startup; the `reasonable` definition, compressed.
3. **Transparency + how to use TODO tasks** — the deterministic-execution pointer.
4. **Safe fallbacks** — when unsure → overdo; better safe than sorry.

Plus: **guardrail engagement = compact actor lists only, inside `bootstrap-alwayson` `<skill_engagement_rules>`** — skill names per actor (all agents / orchestrator-top / subagents) + USE-SKILL definition; **NO per-skill trigger text** — skill descriptions are always visible and say when (repeating them in always-on = paying twice). ✅ The standalone `bootstrap-guardrails.md` file is dissolved (user ruling: only alwayson survives). The **activation model is unchanged** (out of scope).

**[decided] `bootstrap-alwayson` is the ONLY always-on rule file** (plus exactly one mode file). **Size budget: < 100 lines AND < 1.5K tokens, excluding frontmatter.** Every remaining `bootstrap-*` file must eventually dissolve into it, a skill, or the archive.

### Tasks are the reliability gate (how to think) [decided]

Always-on drops every OPERATION_MANAGER reference; built-in todo tasks carry it instead — framed as *how to think*, not a rule: **tasks are the reliability gate** — units of work on a checklist ledger; always open tasks, work one at a time, close when complete, take the next only after the previous closes. EC (phases/steps) is **added on top** for large only; tasks are the always-present base.

### Always-on target file: `rules/bootstrap-alwayson.md` ✅ done

Built + **wired into the bootstrap manifest** (`bootstrap-manifest.ts` before `bootstrap-core-policy`; Copilot rules-exclude in `targets.ts`). Sections: `<high_important_core_policies>`, `<reasonable-definition>`, `<tasks>`, `<skill_engagement_rules>` (all-agents + orchestrator-only), `<core_rosetta_files>`. Verified: typecheck + 439 tests pass; r2 regen byte-identical; r3 places it in the Claude hook and Copilot `instructions/`.

**Cut so far (archived to `bootstrap-removed.md`):** `reasonable-definition` (from `bootstrap-guardrails`); `plugin-files-mode` EI#9–10 (priorities/merge).
**Added:** `<intrinsics>` validation line extended with `— gates acceptance`.
**Deferred dedup ✅ resolved:** both dup sources gone — `bootstrap-core-policy` and `bootstrap-guardrails` dissolved; `bootstrap-alwayson` is the single always-on home for engagement rules.

**Cursor marketplace plugin.json:** ✅ `bootstrap-alwayson.mdc` added to the `rules[]` seed (`src/rosettify-plugins/plugins/core-cursor/.cursor-plugin/plugin.json`, before `bootstrap-core-policy`). Claude/Codex/Copilot plugin.json don't enumerate rules (hooks/auto-load); Cursor standalone auto-loads `.cursor/rules/*.mdc`.

**Wanted but NOT yet done in `bootstrap-alwayson` (revisit):**
- **Core-wisdom intrinsics** — ✅ harvested (39 unique, over this repo + `references/**`); the universal validation/done cluster (5 lines) added to `bootstrap-alwayson` `<intrinsics>`. Domain-specific ones → **route into their skills when each is next built/touched** (map below); many already live there.

  **Intrinsics routing map (insert if missing when working the skill):**
  - `testing` — "it worked when I tried" ≠ comprehensive · tests-written-after ≠ TDD · ad-hoc ≠ systematic · tests pass ≠ healthy design
  - `debugging` — symptoms ≠ root cause · TDD-simplest ≠ debug-root-cause
  - `research` — "didn't find" ≠ "doesn't exist" · cannot reproduce ≠ doesn't exist · package exists ≠ safe to install
  - `review` / `hitl` — reviewer ≠ implementer (no self-rubber-stamp) · reading ≠ using
  - `coding` — clarity over cleverness · explicit over implicit · correctness over perfection · vertical slices over horizontal
  - `orchestration` — request size ≠ task size · completion ≠ goal achievement
  - Already placed (no action): `review=static vs validate`, `trust but verify`, `if anything could go wrong it will`, `current paths ≠ deployed`, `accuracy over speed`.
- **Merge XML sections further** — went 7→5; could consolidate more to cut section noise.
- ✅ **Compress `reasonable-definition`** — paragraph → chain-of-thought checklist (~half tokens). Kept anchors as name+gloss (Toulmin/ALARP/Bayesian/Simon — load-bearing knowledge-pulls; gloss makes them fire). Burden-inversion folded in as a tag (`by default unreasonable — earn it; else just ASK`); audit-survives kept as closing `Test`. Full original still in `bootstrap-removed.md`.

## The skills

`load-context-instructions` ✅ dissolved + removed (archived; mode-detection superseded by one-mode-file-per-environment; `get_context_instructions` (MCP only) loads always-on rules from `bootstrap-alwayson.md`). `load-workflow` is **superseded** — absorbed into `rosetta`; original removed only after the replacement is verified working.

1. **hitl** ✅ done — grilling woven verbatim into `hitl` core_concepts (post-discovery relentless interview); `questioning` updated with the technique (loop-until-clear, few independent Qs, impact + enterprise safe defaults).
2. **load-project-context** ✅ *(done)* — built + registered (`skills.md`); reviewer-passed. `load-context` body + full roster (`<bootstrap_rosetta_files>` kept verbatim) + `hitl` prereq + todo-ledger `<tasks>`; leaf (no next-steps); priorities/merge stay always-on. Absorbs `load-context`; `load-context` removed later in the rename sweep.
3. **orchestration** ✅ rebuilt (shell copy of `orchestrator-contract`, re-voiced step-by-step) — `<context>` (manager rules · subagent-output handling · intrinsics) · `<request_sizing>` (SMALL/MEDIUM/LARGE → machinery + asset per band) · `<process>` (dispatch · routing · quality incl. mini-loops) · `<subagent_prompt_template>` (compressed key:value; `Output specs*`/`Evidence specs*` = what orchestrator demands back; orchestrator decides subagent's `load-project-context`). Prereqs: `hitl`, `load-project-context`. Assets: `o-team-manager.md` (MEDIUM+, ← gd-work-on converted; `gd-think`→`reasoning`) · `o-session-execution-controller.md` (LARGE, ← `operation-manager` orchestrator side + `todo-tasks-fallback` orchestrator part). Supersedes the per-size table / `o-subagent-delegation.md` / `o-operation-manager-commands.md` plan. **Activation floor [decided] stands** (trivial → no orchestration).

   **Decided:** subagents CAN spawn subagents · complexity shifts size one step; re-enter sizing as reality shifts · mini-loop = `produce → check` cycle gated by orchestrator (loop or accept) · no `discovery`/`simulation` skills exist.
4. **rosetta** ✅ *(done)* — smart router; absorbs `load-workflow`; prereqs: `orchestration`, `hitl`; FORBIDDEN/no-jump-to-code gate. **Always loads `orchestration`.** A calm senior-engineer procedure ("you asked for the rigorous flow — here it is") — re-voiced, not relocated browbeating.
5. **subagent-directives** ✅ built — pure duties only (the prompt is self-describing → no input-contract narration): MUST-skills init · EC asset pickup · ask-before-execute · stop+report when blocked · checklist close-out · return per Output/Evidence specs · escalation chain. `disable-model-invocation: true`, `user-invocable: false`. Asset: `s-session-execution-controller.md` (← `operation-manager` subagent side: `next --target` → one step → todo tasks → close on evidence; no fallback — CLI fails → blocked+report). Original `subagent-contract` removed in rename sweep.
6. **execution-controller** ✅ superseded as a standalone skill — `operation-manager` split **by actor** into the two `*-session-execution-controller.md` assets. EXECUTION_CONTROLLER = `npx -y rosettify@latest plan …`, CLI-only (MCP-first dropped). `todo-tasks-fallback` dissolved into both assets (fallback = orchestrator only); rule file + `operation-manager` → removal sweep + archive.

## Reconciliation with the architecture diagram [decided]

The `Rosetta-v3-skill-refactoring-Main.drawio` diagram is authoritative; its truths, folded in:

- **`load-context-instructions` dissolves completely** ✅ done (supersedes "stays unchanged" and "splits per consumer"); `get_context_instructions` in MCP `bootstrap.md` loads always-on rules from `bootstrap-alwayson.md`.
- **`rosetta` fully absorbs `load-workflow`** (supersedes "stays separate") — no more links to `load-workflow`; `rosetta` is the smart router.
- **Entry routing:** `/rosetta` (or plain) → `rosetta` detects the best option and hands off to the workflow. **`/<workflow>` and `/<skill>` bypass `rosetta` entirely** — its skill is never called.
- **Removal is last** (process I must not skip) — draft the new (AI) → approve → make it work → **only then remove originals**. `load-context`, `load-workflow`, and `operation-manager` stay until their dissolution/replacement is verified and working.
- **Todo enforcement is the always-on base**; skills add on top, never restate it (no duplication). Clarify: the **getting-ready/prep** process also MUST use todo tasks.
- **One composable subagent-delegation template** — not three separate templates. ✅ lives as `<subagent_prompt_template>` inside `orchestration/SKILL.md` (the `assets/o-subagent-delegation.md` plan superseded).
- **Orchestrator decomposition strategies** (compose AND/OR; distinct from sizing): **map-reduce** · **split by roles** (different engineers) · **delegate-to-plan** (HTN-style progressive planning, orchestrator re-reviews as new facts arrive).
- **`todo-tasks-fallback` splits** into always-on + `load-project-context` (reinforced but trimmed — not the current large form).
- **Lightweight subagent** = small/easy task + fewer skills loaded (differs across many skills, mostly by task size); orchestrator decides whether to add `load-project-context` (skip if the task doesn't need it or already references the files).
- **Orchestrator MUST instruct every subagent to read always-on bootstrap rules** — this is unconditional regardless of task size.
- Priorities live in **always-on only** (the diagram's in-skill placement is stale).

## Renames — deferred sweep, NOT now

`load-context`→`load-project-context`, `orchestrator-contract`→`orchestration` (new skill ✅ exists), `subagent-contract`→`subagent-directives` (new skill ✅ exists), `operation-manager`/`OPERATION_MANAGER`→`EXECUTION_CONTROLLER` (concept only — skill dissolved into EC assets ✅). Done as **one sweep AFTER** the per-skill extractions are built and checked — including the ~37 `load-context` reference sites and the shell-schema templates. Until then, new skills reference **current** names; transitional duplication is accepted. Verb vocabulary (`ACQUIRE`→`READ`/`APPLY`, below) is a separate, later pass.

## Method (how we work)

**Authoring principles (durable, apply to every artifact here).**
- **Tell how to think, not what to do** — nudge the executor's reasoning; don't dictate steps. *Clarify (real meaning):* hand the agent a **working model** — the mechanism + properties + design-intent it reasons from and exploits, e.g. *"files load in context → optimize for progressive disclosure; docs SRP/DRY/MECE/terse; md headers ⇒ grep + load line-ranges = Auto-TOC."* **Steps and process guidance stay legitimate — that IS what Rosetta does**; "not what to do" forbids bare imperatives and motivational vibes *without* a model (*"reason from this project, not your priors"* = brainfart), not steps themselves.
- **Token compression is the top priority** — terse nudges, no explaining; instructions are non-user-facing, so take compression shortcuts (terms, references, intermediate docs). Exception: user-facing strings.
- **Executor markers ≠ author constraints** — `compact="NEVER"`, `summarize="AS-IS"`, "pass as-is" tell the *executor* not to re-compress at **runtime**; they never gate how terse *I* author. Author compresses; the marker then protects that terse block at runtime. Always separate author vs executor.
- **Decisions/edits are review, not approval** — write only after an explicit approval sentence; on mismatch, stop and revert own unapproved writes.
- **Add on top, never replace** — tiers, layers, and skills compose **additively**: `[MEDIUM+]` adds to `[SMALL+]`; large adds the EC plan on top of todo tasks; skills add on top of the minimal bootstrap. No overrides; de-dup is not a goal — layering/duplication is fine.
- **No conditionals** — avoid `IF/WHEN/THEN`, `DO X WHEN Y` (high LLM cognitive load). Teach sizing by examples; use cumulative bands `[SMALL+]/[MEDIUM+]/[LARGE]` (`+` = this tier and up), not branches.
- **EXECUTION_CONTROLLER is large-only** (rename of OPERATION_MANAGER) — small = inline + fresh-eye review; medium+ = subagents; large = dedicated EXECUTION_CONTROLLER plan (`npx -y rosettify@latest`). Structure: `plan ⊃ phases ⊃ steps ⊃ tasks` — EC defines **phases** and **steps**; built-in todo tasks split each **step**. Small/medium use built-in todo tasks directly (no phases/steps plan). Soften the always-on "MUST ALWAYS USE OPERATION_MANAGER" / Phase-0 "always create plan.json" to match (open — mode-file work). Playbooks ✅ built: `o-team-manager.md` (MEDIUM+) + `o-session-execution-controller.md` (LARGE); one template in `orchestration/SKILL.md` (the `ec_{small,medium,large}` asset plan superseded).
- **Document request = capture idea + thinking model** — when asked to "document", record the concise catching idea and *how to think*; never verbose prose, history, or rationale.
- **Instructions are composite — merge and sequence, never choose** — multiple installed plugins (graphify · gitnexus · superpowers · rosetta · allium) are not fighting; each "do X first" means they all run first, before the event and the system prompt → **sequence** them (that is what tasks are for), don't pick one. This merge stance is **always-on**.
- **Keep original section names + attributes** — when moving/extracting, do NOT rename source sections or strip XML attributes (`severity`/`use`/`attribution`/`compact`…); they were added deliberately and let us merge back later.
- **Make it runnable, not prose** — prefer a concrete executable form to an instruction: a self-describing read like `echo "=== docs/CONTEXT.md ==="; cat docs/CONTEXT.md; echo "=== docs/ARCHITECTURE.md ==="; cat docs/ARCHITECTURE.md` (and `grep -nE "^#{1,3} " …` for header scans) beats "read/grep the context files".
- **Show, don't cite by number** — reference bootstrap items with a short (redacted) visible excerpt, never bare `#9–#13`.

**Intrinsics (compact truths to weave into the re-voiced skills — coding, review, validation, planning; nudge, don't explain).**
- `coded ≠ request completed` · `tests passing ≠ actually works`
- `review = ACs + gaps + tests + security + …` · `validation ≠ review`
- `validation = run the actual code + AI manual QA`
- `build the foundation first`

- Per **target** file, MOVE content from multiple source files in, **thinking & analysing** — understand *why* each piece existed (every bootstrap layer is scar tissue over a specific AI failure), **adapt rather than copy**; compression / dedup / merge allowed; **zero semantic loss**.
- **One-by-one, slowly, checking** after each step. No big-bang.
- **Nothing is lost.** Content removed or "deleted" is archived to **`docs/stories/bootstrap-removed.md`** with provenance; docs that referenced it point there.
- Skills may be **larger and use progressive `assets/`** (cf. `coding`, `codemap`).
- **Reviewer loop:** background `prompt-engineer` subagent (opus, read-only, uses `coding-agents-prompt-authoring` with `pa-rosetta-intro-for-AI.md` + `pa-rosetta.md` + `pa-hardening.md`) reviews each artifact → user approves → assistant edits → repeat.

## Reference docs (orientation)

- `docs/schemas/*.md` — authoring contracts each artifact's `baseSchema` points to (`skill`, `workflow`, `agent`, `rule`, `template`, `phase`, `generic`), defining its required frontmatter and body structure.
- `docs/definitions/*.md` — canonical registries of the known artifact names (`skills`, `workflows`, `agents`, `rules`, `templates`, `folder-structure`); use only names listed there, missing → ask, and register new skills in `skills.md`.

## Sequencing

1. Reconcile docs (done).
2. Build skills one-by-one (target ← sources), checking; archive removed content as we go. ✅ `load-project-context` · `rosetta` · `orchestration` (rebuilt) · `subagent-directives` · EC assets · `hitl` (grilling; `questioning` updated). Next candidates: slim bootstrap / mode files. ✅ Removed + archived: `orchestrator-contract`, `subagent-contract`, `todo-tasks-fallback` (refs swapped); scaffolding `orchestration_new/_v1/_v2` deleted. ✅ `bootstrap-rosetta-files` dissolved + archived (roster canonical in `load-project-context` `<bootstrap_rosetta_files>`; init-workspace flows + pa-* docs point there; Codex plugin-root sentinel switched to `plugin-files-mode.md` — present in r2 AND r3, test updated; Cursor seed `plugin.json` `rules[]` pruned of the 4 dead `.mdc` entries; manifest/targets excludes kept content-agnostic for r2; 444 tests pass; full-repo ref sweep done: `FAQ.md`/`docs/web/docs/faq.md` links + `.github/prompts/prompt-comparison.md` bootstrap list + `docs/ASSUMPTIONS.md` → point at the skill; requirements reconciled — FR-PLAN-0035 sources restated as the four prep skills, FR-PLAN-0036 example id `-s-read-docs`, logged in `docs/requirements/CHANGES.md`; left as-is: stories/archive history, r2, root `plugins/` output, CODEMAP r2 listing, sort.test synthetic strings, manifest/targets r2-serving entries) · ✅ `load-context-instructions` dissolved + archived (truncation atom → `bootstrap.md` startup chain, which now calls `get_context_instructions` directly; `load-context` prereqs dropped; zero refs remain; mode declarations inlined in all three mode files). ✅ rosettify plan templates rewritten to r3 skills (`for-orchestrator` 4 steps / `for-subagent` 5 — dropped `s-load-context-instructions`, ids now `s-orchestration`/`s-subagent-directives`, `load-project-context`, `rosetta`; requirements JSON + tests updated, 447 pass; guardrails step-id refs updated; `o-session-execution-controller` process now uses `create-with-template`/`upsert-with-template`; r2 `adhoc-flow` explicitly forbids templates — plain `create`/`upsert` only, names won't match r2). ✅ `bootstrap-core-policy` (r3) dissolved + archived: proactive skills/tools/MCPs → `orchestration` context #5; "owns the orchestration end-to-end" → context #2; "spec first, code quality second" → mini-loop review; pre-existing=documented-in-advance → `coding` zero-tolerance; search-docs-for-unknown-libs → `coding` + `research` (deliberate dup); diagram light/dark colors → `architect` agent (code-analysis-flow's copy serves only that flow); 5 orchestration bullets deleted as dups; `pa-rosetta.md` bootstrap list swapped to `bootstrap-alwayson`; `bootstrap-manifest.ts` untouched (content-agnostic, still serves r2). ✅ `bootstrap-guardrails` (r3) dissolved + archived: alwayson `<skill_engagement_rules>` keeps ONLY compact actor lists + USE-SKILL definition + blocks→suggest-compliant-solutions; ALL per-skill trigger texts and `enforced by plan step s-*` notes deleted as dups of skill descriptions / template step prompts; gaps fixed (`self-organization` → all-agents, `Subagents: subagent-directives` line); must#2 + all three core_concepts deleted as dups (hitl covers Auto-Mode + stop-and-wait; alwayson priorities cover top-gate; sensitive-data description covers mandatory); `pa-rosetta.md` + `pa-rosetta-intro-for-AI.md` bootstrap lists updated to r3 reality. ✅ `bootstrap-execution-policy` (r3) dissolved + archived: FORBIDDEN + never-skip + slash-full-execution + SRP/DRY/KISS/MECE/YAGNI/scope-creep → alwayson one-liners (body now 78 lines / ~1.0K tokens — budget <100 / <1.5K holds); validate-vs-REQUIREMENTS → `architect` agent + `tech-specs` (deliberate dup); validation cadence + explicit-actionable-steps → orchestration process #6/#7; should#1/#3 → `o-team-manager` §5; OM rules + memory rules + rest deleted as dups of alwayson `<tasks>`/intrinsics, EC assets, `self-learning` #6–10, `coding`, `deviation`/`questioning`; pa-* lists now: alwayson · rosetta-files + one mode file. **Remaining r3 bootstrap set: `bootstrap-alwayson` + 3 mode files (queued rewrite) — nothing else.**
3. **Rename sweep** (deferred) across all references incl. schema templates.
4. Update `docs/definitions/skills.md` ✅ current (dead names removed, `(not yet)` marks added, `subagent-directives` + `solr-*` registered) · still open: `agents/IMPLEMENTATION.md`, `docs/ARCHITECTURE.md` bootstrap-flow, and `pa-*` contract docs (incl. the injected-bootstrap list, which still names the obsolete `bootstrap_hitl_questioning`).
5. Regenerate plugins / publish **only when requested**.

## Move-map (target ← source)

| Target | ← Sources | Notes |
|---|---|---|
| **slim bootstrap** (4 keeps) | `plugin-files-mode` (mode decl + aliases + sources); ✅ `bootstrap-core-policy` dissolved (atoms → orchestration/coding/research/architect); ✅ `bootstrap-guardrails` dissolved into `bootstrap-alwayson` `<skill_engagement_rules>` (hitl bullets merged, actor split grafted, dup concepts archived) | alwayson = single always-on home |
| **EC assets** ✅ done | `operation-manager` split by actor + `todo-tasks-fallback` dissolved | `o-`/`s-session-execution-controller.md`; no standalone skill |
| **orchestration** (skill) ✅ done | `orchestrator-contract` + gd-work-on (→ `o-team-manager.md`) + `operation-manager` orchestrator side + `todo-tasks-fallback` orch part (→ `o-session-execution-controller.md`) | context · sizing · process · `<subagent_prompt_template>` |
| **load-project-context** (skill) ✅ done | `load-context` body + `bootstrap-rosetta-files` **full roster** + `hitl` prereq | built + registered; leaf; priorities/merge → always-on; `load-context` removed in rename sweep |
| **subagent-directives** (skill) ✅ done | `subagent-contract` (pure duties) + `operation-manager` subagent side (→ `s-session-execution-controller.md`) | `disable-model-invocation: true` |
| **rosetta** (skill, `/rosetta`) ✅ done | `load-workflow` + `execution-policy` `FORBIDDEN`/no-jump-to-code + r2 bootstrap (planning-mode storage guard) | always loads `orchestration` |
| **DELETE → archive** | `plugin-files-mode` `EXTREMELY_IMPORTANT` (most) + `CRITICAL_RED_FLAGS` | → `bootstrap-removed.md`; salvage EI#9–10→always-on (`bootstrap-alwayson`), EI#13–14→orchestration/execution-controller, EI#19→hitl |
| **superseded** | `load-context-instructions` ✅ removed (dissolved + archived), `load-workflow` (→ absorbed into `rosetta`), `operation-manager` (→ split into EC assets), `todo-tasks-fallback` (→ dissolved into EC assets ✅ removed) | remaining originals removed only after dissolution/replacement verified & working |

## Mode binding: one alias, different behavior

Command aliases are written once, mode-agnostically, in every skill/workflow. Exactly one mode file is injected per environment and binds each alias to a concrete mechanism — the only place mode logic lives. Three mutually exclusive modes:

- **Plugin mode → `plugin-files-mode.md`**: aliases bind to literal local reads from the plugin install location.
- **MCP mode → `bootstrap.md`**: aliases bind to MCP behavior plus MCP-only mappings ("X means Y by doing Z", e.g. `query_instructions` / `rosetta://{path}`). The `FILE <subpath>` form is deterministic in MCP: RAGFlow stores **path-based tags (2-/3-part)** and the VFS merges/bundles the same tree as `plugin_generator.py`, so `READ SKILL x FILE assets/y.md` resolves the exact file (`ACQUIRE x/assets/y.md FROM KB`), not a fuzzy query.
- **Local / in-repo dev mode → `local-files-mode.md`**: aliases bind to literal local reads from the `instructions/r*` folder (developing Rosetta itself).

Call sites never branch on mode. The alias vocabulary is a **closed contract**: every alias used anywhere must be bound by all three mode files, or it breaks in that mode. Defining and policing that finite set is part of this work.

## Verb / alias vocabulary (W4) — deferred (later pass)

DO NOT APPLY NEW vocabulary UNTIL that phase reached.

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

## Subagent prep mechanics (detail for skill #5 `subagent-directives`)

- The same minimal bootstrap is injected to every agent. The orchestrator instructs each subagent to load `subagent-directives`; `/rosetta` and role skills load what the orchestrator needs.
- `load-subagent-context` (original request #3) — **superseded**: atoms landed in `subagent-directives` (mandatory duties) + `s-session-execution-controller.md` (`next --target`) + lighter `load-project-context` (grep headers + line-range reads); context load is orchestrator-decided per task (deliberate: lightweight subagents skip it, prompt carries exact file refs).
- ✅ `subagent-directives` registered in `docs/definitions/skills.md`.

## Enforcement in MCP = same as plugins (via shells)

MCP gets the same minimal bootstrap and behaves identically (loads skills by context; orchestrator instructs subagents). On init, Rosetta installs skill/subagent/workflow shells (proxy files) that enforce loading the same way plugins do. The only behavioral shift: classify only on `/rosetta`, not every request.

## Blast radius / scope

- IN: `instructions/r3/core/**` (the ~50 files using `ACQUIRE/SEARCH/LIST`, the bootstrap + three mode files, the shell templates), `scripts/plugin_generator.py` rewrite rules, plugin regeneration, `docs/definitions/skills.md`, per-platform delivery payloads (hook / rules / MCP bundle) shrunk toward 0.
- IN — **`docs/ARCHITECTURE.md`** (targeted): the *Command Aliases* table (new vocabulary + per-mode binding), the *Bootstrap Flow* section (replace "all rules bundled" / "all prep steps mandatory regardless of size" / "classify every request" with: minimal bootstrap + classify only on `/rosetta`), and the alias-vs-file-read boundary wording. Unchanged: RAGFlow, Bundler/VFS/tagging, the underlying MCP tools (they become the MCP binding targets), `rosettify`.
- IN — **contract-of-record docs** (teach the new vocabulary + model, else future prompts reintroduce old terms): `coding-agents-prompt-authoring/references/pa-rosetta.md`, `pa-rosetta-intro-for-AI.md` (also correct the "all agents get the same bootstrap" claim), `pa-hardening.md` and other `pa-*` references citing aliases, the `coding-agents-prompt-authoring` SKILL, and `docs/schemas/*.md` (workflow/skill/agent schemas teach the aliases and `<references>` format). Because the refactor changes the always-on set, update the injected-bootstrap list in `pa-rosetta-intro-for-AI.md` and `pa-rosetta.md`'s load procedure to match the new minimal bootstrap (it currently names `bootstrap_hitl_questioning`, which r3 no longer has).
- OUT / deferred: `instructions/r2/**`, MCP server behavior, project-scoped `ABOUT/QUERY/STORE` aliases, the rename sweep timing (after extractions), verb vocabulary (`ACQUIRE`→`READ`/`APPLY`), MCP `bootstrap.md` / `local-files-mode.md`, guardrail-activation redesign, subagent-branch fidelity beyond what is specified.

## Open / to confirm

**Gate:** items 1 and 3 are a prerequisite — finalize the closed alias set **before** any P3 bulk normalization and before the three mode files bind aliases. The verb *shape* is `[decided]`; the *complete set* and per-category mapping are not.

1. **Verb vocabulary** — confirm the `VERB ARTIFACT <name> [FILE <subpath>]` shape and the per-category mapping, including whether flow **phase** files use `USE FLOW` or `APPLY`. (`USE SKILL` / `USE FLOW` / `INVOKE SUBAGENT` already exist canonically in `pa-rosetta.md`; this work formalizes them and adds only `READ` / `APPLY` + the `FILE <subpath>` form.)
2. **Minimal bootstrap contents** — what irreducibly stays always-on once the adherence prose is gone.
3. **Closed alias set** — finalize the complete vocabulary so all three mode files can bind every alias.

---

**Terminology**: verify vs validate vs anything else that start with v
User feels like validate term maybe misleading AI, as to what is expected.

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
<human-issues>

- User just cannot provide all inputs in a consistent manner in one shot
- AI should proactively solicit requirement and verify it is coherent
- User my provide conflicting, unspecific, ambiguous, subjective qualifiers, vague adjectives and constructs, loaded expressions
- AI should reconstruct it as coherent simple clear consistent SET of requirements without gaps
- Ask questions until crystal clear without nitpicking
- User can only REVIEW maximum 2 pages of simple text, and this does NOT limit result which could be much larger
- User appreciates TLDR and similar

</human-issues>

<ai-issues>

- System prompts (out of our control) require immediate execution, deny back-and-forth with user, also models always jump to conclusions
- Our prompts should encourage co-working and co-authoring
- AI forgets to give proper context, forgets that subagents, tool calls outputs are only available to orchestrator, user can not see those, etc.
- AI forgets to validate, reorganize, persist root causes, learn (persist discovered knowledge), and cleanup
- AI mixes intent, aspects, actors, sequence of events, independent facts, consequences vs prerequisites, and responsibilities if not clearly separated
- AI is prone to carry away and generate a huge amounts of content based on assumptions, rendering it useless or impossible to review
- AI overly relies on internal knowledge (but train sets are >1Y old), AI does not proactively research
- AI removes important clarifiers, specifiers, explanations ("just", "only", "constantly", minor explanations, etc)
- AI constantly keeps inserting non-operational clarifications (history, rationale, origin labels, change annotations), but target documents must be source-agnostic, state-only, action-only. All change logs must be directed to a separate file.
- AI constantly badly over-engineers instead of simplifying, simplification is a king
- AI constantly brings new ideas instead of following existing, constantly overly complicates
- AI never looks around to think "What else is used? What could be the better solution? How this pattern or issue was resolved in other places? What web search can find? What else is affected in any direction?"
- AI prioritizes action over analysis leading to not known unknowns
- AI needs harsh, direct, MoSCoW style rules + short brilliant comparisons (task coded ≠ task completed, trust but verify)
- AI produces an unmanageable amount of AI generated content with a lot of non-matching assumptions (AI slop)
- AI "feels overloaded" and skips steps if we provide more than 5 at once
- AI constantly injects instructions/reasoning/information given to him into final outputs, even though those for its own reasoning only (examples: AI makes mistakes - user tells to fix because of X - AI applies correct fix and additionally adds that X to the final document - instead of just fixing - producing useless slop; AI reads requirements and specifications - implements changes - internal requirement identifiers slip in output to user; etc.)
- AI thinks in extremes — offers yes/no/split (false trichotomy) where reality is a blend on a continuum that adapts as facts arrive
- AI over-prescribes rigid mechanics/routing where the design wants the manager to judge and compose — reaches for a fixed split instead of enabling choice
- AI overfits to a single strong reference/example — replicates its shape instead of extracting principles and designing for the actual context
- No output, no thought — without emitting a message/artifact the AI only pretends to think; producing even an intermediate message forces it to finalize and build on top → externalize each decision as output, step-by-step
- Passive consumption over active construction — pre-baking content for the AI to fill/follow is weaker than making the AI construct the artifact for its situation and output it
- Over-abstraction → hallucination — removing concrete specifics (numbers, samples, process) severs the AI's grasp on reality; keep specifics AND layer the decision model on top
- Wrong-altitude specificity — AI swings between verbose prose and cryptic shorthand; both fail. Shorthand like "decide/reconfirm/detail/split/merge" leaves a fresh agent unable to recover the problem OR the action. Write at the altitude where a fresh reader grasps the problem AND the concrete action: name the specifics, cut the filler
- Reverses settled decisions (last-speaker bias) — AI abandons an already-agreed decision the moment a new voice (reviewer, schema, doc) differs, instead of holding it unless genuinely overridden; flip-flops (clean → bloated → restored). Hold agreed decisions; on a conflicting source, surface the conflict and reconcile, never silently switch
- Binary handling of subagent output — AI treats a subagent's return as either truth (integrates blindly) or noise (neglects it). Instead: make a decision on the result, reconfirm and fill missing details, split any independent follow-up into focused subagents, and merge findings into one grounded result — not accept-or-reject
- Actor confusion — AI mis-assigns who performs an action, e.g. the orchestrator validates a claim himself (runs/observes) instead of orchestrating verification (spawn reviewer → validator on real/sample) and only tracking status on the ledger. Name the actor per action: orchestrator orchestrates; subagents execute; validator validates
- Blind pass-through of request structure — big request in → big dispatch out; AI forwards the request whole instead of decomposing it into the smallest independent actions, then recomposing them into right-sized tasks (a task may still be large — the work decides)
- Deletes substance under "too long" — AI reacts to a length/wall-of-text critique by removing content (intrinsics, failure-framing, items marked KEEP) instead of compressing by transformation (intrinsic → process). Densify, don't delete; never drop KEEP-marked content
- Process compliance must be structurally reinforced — AI skips/forgets process unless the structure forces the next move. Reinforcement toolkit (compose them): keep-in-the-dark (JIT — reveal only the next step so loading it is the only move; works only when there is nothing else to do but load) · prerequisites (gating skills loaded before anything) · next-steps chaining · output-as-gate (write the decision message / write the file AS A STEP, then "only then proceed") · task ledger (one `in_progress`, close on evidence). Each turns an easily-skipped instruction into an observable, ordered action

</ai-issues>