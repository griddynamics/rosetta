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
  - `review` / `hitl` — reviewer ≠ implementer (no self-rubber-stamp) · reading ≠ using — ✅ placed in `hitl` core_concepts
  - `coding` — clarity over cleverness · explicit over implicit · correctness over perfection · vertical slices over horizontal
  - `orchestration` — request size ≠ task size · completion ≠ goal achievement
  - Already placed (no action): `review=static vs validate`, `trust but verify`, `if anything could go wrong it will`, `current paths ≠ deployed`, `accuracy over speed`.
- **Merge XML sections further** — went 7→5; could consolidate more to cut section noise.
- ✅ **Priorities forward-ported from R2 [decided]** — old r3 `Rosetta > Guardrails > User explicit` read as prompt injection (unnamed authority above the user). Now: guardrails named (sensitive-data/dangerous-actions/risk-assessment, no hitl) > user explicit > always-on rules "(these fix constant failure-modes of AI)" > CLAUDE/AGENTS/GEMINI.md > skills/workflows > generic system prompt; "Merge all; priority resolves only true conflicts." Composite bullet: "ALL instructions … there is no conflict." Named tiers + self-identified purpose = the anti-injection fix; user-explicit above always-on is deliberate (lean choice is legitimate). Old line archived.
- ✅ **Mode-file hardening [decided]** — all 3 mode files carry root-tag attrs `severity="CRITICAL" use="ALWAYS" compact="NEVER" summarize="AS-IS"` (replacing verbose `attribution=`; local gained a root tag). Memory clause broadened: "reconstructing **or assuming** behavior does NOT satisfy". Plugin decl: "Rosetta appends context via hooks." replaces "Always-on rules already loaded" (archived). Open: `bootstrap.md` closes with self-closing `<rosetta:bootstrap/>` instead of `</rosetta:bootstrap>` — pre-existing, fix pending user say-so.
- ✅ **Compress `reasonable-definition`** — paragraph → chain-of-thought checklist (~half tokens). Kept anchors as name+gloss (Toulmin/ALARP/Bayesian/Simon — load-bearing knowledge-pulls; gloss makes them fire). Burden-inversion folded in as a tag (`by default unreasonable — earn it; else just ASK`); audit-survives kept as closing `Test`. Full original still in `bootstrap-removed.md`.

## The skills

`load-context-instructions` ✅ dissolved + removed (archived; mode-detection superseded by one-mode-file-per-environment; `get_context_instructions` (MCP only) loads always-on rules from `bootstrap-alwayson.md`). `load-workflow` ✅ absorbed into `rosetta`, removed + archived.

1. **hitl** ✅ done — grilling woven into `hitl` (post-discovery relentless interview; since the 2026-07-10 compression it heads the Questioning group, compressed [decided]); `questioning` updated with the technique (loop-until-clear, few independent Qs, impact + enterprise safe defaults).
2. **load-project-context** ✅ *(done)* — built + registered (`skills.md`); reviewer-passed. `load-context` body + full roster (`<bootstrap_rosetta_files>` kept verbatim) + `hitl` prereq + todo-ledger `<tasks>`; leaf (no next-steps); priorities/merge stay always-on. Absorbs `load-context` ✅ (original removed + archived, refs swapped).
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
- **Removal is last** (process I must not skip) — draft the new (AI) → approve → make it work → **only then remove originals**. ✅ `load-context`, `load-workflow`, `operation-manager` removed after replacements verified (refs swapped, zero live refs, tests pass).
- **Todo enforcement is the always-on base**; skills add on top, never restate it (no duplication). Clarify: the **getting-ready/prep** process also MUST use todo tasks.
- **One composable subagent-delegation template** — not three separate templates. ✅ lives as `<subagent_prompt_template>` inside `orchestration/SKILL.md` (the `assets/o-subagent-delegation.md` plan superseded).
- **Orchestrator decomposition strategies** (compose AND/OR; distinct from sizing): **map-reduce** · **split by roles** (different engineers) · **delegate-to-plan** (HTN-style progressive planning, orchestrator re-reviews as new facts arrive).
- **`todo-tasks-fallback` splits** into always-on + `load-project-context` (reinforced but trimmed — not the current large form).
- **Lightweight subagent** = small/easy task + fewer skills loaded (differs across many skills, mostly by task size); orchestrator decides whether to add `load-project-context` (skip if the task doesn't need it or already references the files).
- **Orchestrator MUST instruct every subagent to read always-on bootstrap rules** — this is unconditional regardless of task size.
- Priorities live in **always-on only** (the diagram's in-skill placement is stale).

## Renames — deferred sweep, NOT now

✅ `load-context`→`load-project-context` swept (all r3 sites incl. shell-schema templates; skill removed). ✅ `orchestrator-contract`→`orchestration`, `subagent-contract`→`subagent-directives`, `operation-manager` skill dissolved. Remaining sweep items:
- ✅ `OPERATION_MANAGER` eliminated from r3: 8 workflow prereq lines → `MUST use todo tasks for reliability`; `adhoc-flow` → `MUST USE SKILL orchestration FULLY` + both assets, and its stale `plan-manager` names → EXECUTION_CONTROLLER; template step `ph-prep-s-load-workflow` deleted with its `rosetta` mention (FR-PLAN-0035 + asset + src + tests updated, 447 pass).
- **Queued: token-compression pass** — `bootstrap-alwayson`, the 3 mode files, `orchestration/SKILL.md`: terse phrases, unicode chars, terms, abbreviations (compression subagent; zero semantic loss). ✅ `hitl/SKILL.md` compressed + restructured + probe-hardened 2026-07-10 (description was already fixed earlier): group order kept (Questioning first [decided]), grilling compressed into Questioning head [decided], root-tag attrs + 9 ancestor atoms restored from `bootstrap-hitl-questioning.md` (lost at rule→skill conversion; list in archive), `TODO(human)` rule added unconditional [decided], `reviewer ≠ implementer · reading ≠ using` woven. Validated by clean Sonnet-5 experiment (blind old/new understanding probes + semantic-diff comparator, zero tools; comprehension preserved) → hardening applied [user: "make this skill right", provenance irrelevant]: gates one-trigger-per-line, negative approval list, tiered dangerous-actions, defined mismatch/confidence, opt-out operationalized (HITL only, guardrails stay), MUST restored on question-tools, packed rules split; round-2 fixes (opt-out relocated+session-scoped, negative-ack/tiering own rules, brief-first unconditional) → 43 rules; final word-level dense pass (terms/unicode/filler; locked strings verbatim), fuller version saved as `docs/stories/hitl-skill-good-alternative.md`; original body archived. Durable authoring lesson: merged gate bullets + MUST-less first clauses raise skim risk — keep gate lists enumerated.
- **Rename `bootstrap.md` → `mcp-files-mode.md`** — and fix all references (docs, website, `.github/prompts`, pa-* contract docs, bootstrap-manifest/targets when r3 regen lands) — by the end.
- ✅ Verb vocabulary applied (see W4 section — finalized + swept).

## Method (how we work)

**Authoring principles (durable, apply to every artifact here).**
- **Tell how to think, not what to do** — nudge the executor's reasoning; don't dictate steps. *Clarify (real meaning):* hand the agent a **working model** — the mechanism + properties + design-intent it reasons from and exploits, e.g. *"files load in context → optimize for progressive disclosure; docs SRP/DRY/MECE/terse; md headers ⇒ grep + load line-ranges = Auto-TOC."* **Steps and process guidance stay legitimate — that IS what Rosetta does**; "not what to do" forbids bare imperatives and motivational vibes *without* a model (*"reason from this project, not your priors"* = brainfart), not steps themselves.
- **Token compression is the top priority** — terse nudges, no explaining; instructions are non-user-facing, so take compression shortcuts (terms, references, intermediate docs). Exception: user-facing strings.
- **Executor markers ≠ author constraints** — `compact="NEVER"`, `summarize="AS-IS"`, "pass as-is" tell the *executor* not to re-compress at **runtime**; they never gate how terse *I* author. Author compresses; the marker then protects that terse block at runtime. Always separate author vs executor.
- **Decisions/edits are review, not approval** — write only after an explicit approval sentence; on mismatch, stop and revert own unapproved writes.
- **Add on top, never replace** — tiers, layers, and skills compose **additively**: `[MEDIUM+]` adds to `[SMALL+]`; large adds the EC plan on top of todo tasks; skills add on top of the minimal bootstrap. No overrides; de-dup is not a goal — layering/duplication is fine.
- **No conditionals** — avoid `IF/WHEN/THEN`, `DO X WHEN Y` (high LLM cognitive load). Teach sizing by examples; use cumulative bands `[SMALL+]/[MEDIUM+]/[LARGE]` (`+` = this tier and up), not branches.
- **EXECUTION_CONTROLLER is large-only** (rename of OPERATION_MANAGER) — small = inline + fresh-eye review; medium+ = subagents; large = dedicated EXECUTION_CONTROLLER plan (`npx -y rosettify@latest`). Structure: `plan ⊃ phases ⊃ steps ⊃ tasks` — EC defines **phases** and **steps**; built-in todo tasks split each **step**. Small/medium use built-in todo tasks directly (no phases/steps plan). ✅ Always-on "MUST ALWAYS USE OPERATION_MANAGER" / Phase-0 "always create plan.json" removed — mode files carry no EC/plan references at all. Playbooks ✅ built: `o-team-manager.md` (MEDIUM+) + `o-session-execution-controller.md` (LARGE); one template in `orchestration/SKILL.md` (the `ec_{small,medium,large}` asset plan superseded).
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
2. Build skills one-by-one (target ← sources), checking; archive removed content as we go. ✅ `load-project-context` · `rosetta` · `orchestration` (rebuilt) · `subagent-directives` · EC assets · `hitl` (grilling; `questioning` updated) · slim bootstrap + mode files (below). ✅ Removed + archived: `orchestrator-contract`, `subagent-contract`, `todo-tasks-fallback` (refs swapped); scaffolding `orchestration_new/_v1/_v2` deleted. ✅ `bootstrap-rosetta-files` dissolved + archived (roster canonical in `load-project-context` `<bootstrap_rosetta_files>`; init-workspace flows + pa-* docs point there; Codex plugin-root sentinel switched to `plugin-files-mode.md` — present in r2 AND r3, test updated; Cursor seed `plugin.json` `rules[]` pruned of the 4 dead `.mdc` entries; manifest/targets excludes kept content-agnostic for r2; 444 tests pass; full-repo ref sweep done: `FAQ.md`/`docs/web/docs/faq.md` links + `.github/prompts/prompt-comparison.md` bootstrap list + `docs/ASSUMPTIONS.md` → point at the skill; requirements reconciled — FR-PLAN-0035 sources restated as the four prep skills, FR-PLAN-0036 example id `-s-read-docs`, logged in `docs/requirements/CHANGES.md`; left as-is: stories/archive history, r2, root `plugins/` output, CODEMAP r2 listing, sort.test synthetic strings, manifest/targets r2-serving entries) · ✅ `load-context-instructions` dissolved + archived (truncation atom → `bootstrap.md` startup chain, which now calls `get_context_instructions` directly; `load-context` prereqs dropped; zero refs remain; mode declarations inlined in all three mode files). ✅ rosettify plan templates rewritten to r3 skills (`for-orchestrator` 4 steps / `for-subagent` 5 — dropped `s-load-context-instructions`, ids now `s-orchestration`/`s-subagent-directives`, `load-project-context`, `rosetta`; requirements JSON + tests updated, 447 pass; guardrails step-id refs updated; `o-session-execution-controller` process now uses `create-with-template`/`upsert-with-template`; r2 `adhoc-flow` explicitly forbids templates — plain `create`/`upsert` only, names won't match r2). ✅ `bootstrap-core-policy` (r3) dissolved + archived: proactive skills/tools/MCPs → `orchestration` context #5; "owns the orchestration end-to-end" → context #2; "spec first, code quality second" → mini-loop review; pre-existing=documented-in-advance → `coding` zero-tolerance; search-docs-for-unknown-libs → `coding` + `research` (deliberate dup); diagram light/dark colors → `architect` agent (code-analysis-flow's copy serves only that flow); 5 orchestration bullets deleted as dups; `pa-rosetta.md` bootstrap list swapped to `bootstrap-alwayson`; `bootstrap-manifest.ts` untouched (content-agnostic, still serves r2). ✅ `bootstrap-guardrails` (r3) dissolved + archived: alwayson `<skill_engagement_rules>` keeps ONLY compact actor lists + USE-SKILL definition + blocks→suggest-compliant-solutions; ALL per-skill trigger texts and `enforced by plan step s-*` notes deleted as dups of skill descriptions / template step prompts; gaps fixed (`self-organization` → all-agents, `Subagents: subagent-directives` line); must#2 + all three core_concepts deleted as dups (hitl covers Auto-Mode + stop-and-wait; alwayson priorities cover top-gate; sensitive-data description covers mandatory); `pa-rosetta.md` + `pa-rosetta-intro-for-AI.md` bootstrap lists updated to r3 reality. ✅ `bootstrap-execution-policy` (r3) dissolved + archived: FORBIDDEN + never-skip + slash-full-execution + SRP/DRY/KISS/MECE/YAGNI/scope-creep → alwayson one-liners (body now 78 lines / ~1.0K tokens — budget <100 / <1.5K holds); validate-vs-REQUIREMENTS → `architect` agent + `tech-specs` (deliberate dup); validation cadence + explicit-actionable-steps → orchestration process #6/#7; should#1/#3 → `o-team-manager` §5; OM rules + memory rules + rest deleted as dups of alwayson `<tasks>`/intrinsics, EC assets, `self-learning` #6–10, `coding`, `deviation`/`questioning`; pa-* lists now: alwayson · rosetta-files + one mode file. ✅ **3 mode files rewritten** to mode-decl + alias bindings only (38/51/34 lines, from 130/139/132): intros + `EXTREMELY_IMPORTANT` + `CRITICAL_RED_FLAGS` + `OPERATION_MANAGER` + Phase 0 dissolved per-atom (archived); salvages landed — alwayson +4 atoms (do-more into accuracy bullet · 1%-skill-check hook · tasks "as one of your very first tool calls" · approval-covers-exact-action), `orchestration` LARGE band `not "planning": execution control`, `subagent-directives` look-around line, `rosetta` #5 `Context loaded using Rosetta: […]` handoff message, EC assets +RFC 7396 semantics / fresh-`next` / `Plan has been changed: [summary]` / loop-until-`complete`+`count:0` / ph-prep-never-delegated (both o- and s-); MCP startup = `get_context_instructions` (blocking) → `load-project-context` → `hitl`; local `get_context_instructions` rebound to `bootstrap-alwayson.md` (old `bootstrap-*.md` glob would wrongly pull the MCP mode file); `GET PREP STEPS` alias (zero callers) + local Available-Workflows list dropped; frontmatter descriptions = "Rosetta {MCP|Plugin|Local Files} Mode Bootstrap". ✅ EI#17 → `orchestration` "Plan mode" process item (rephrased + merged: reads execute now; the presented plan carries `MUST USE SKILL` entries, specs, mini-loops/phases/steps/subagent+model in MoSCoW + directive language). ✅ **3 superseded skills removed + archived** (`load-context`, `load-workflow`, `operation-manager` + om-schema verbatim); all r3 refs swapped `load-context`→`load-project-context` (~40 sites incl. shell-schema templates — that slice of the rename sweep is done early); zero live refs verified; typecheck + 444 tests pass. **Remaining r3 bootstrap set: `bootstrap-alwayson` (79 body lines / ~1.2K tokens — budget holds) + 3 slim mode files — target shape reached.**
3. **Rename sweep** (deferred) across all references incl. schema templates.
4. Update `docs/definitions/skills.md` ✅ current (dead names removed, `(not yet)` marks added, `subagent-directives` + `solr-*` registered) · still open: `agents/IMPLEMENTATION.md`, `docs/ARCHITECTURE.md` bootstrap-flow, and `pa-*` contract docs (incl. the injected-bootstrap list, which still names the obsolete `bootstrap_hitl_questioning`).
5. Regenerate plugins / publish **only when requested**.

## Move-map (target ← source)

| Target | ← Sources | Notes |
|---|---|---|
| **slim bootstrap** ✅ done | mode files reduced to mode decl + alias bindings; ✅ `bootstrap-core-policy`, `bootstrap-guardrails`, `bootstrap-execution-policy`, `bootstrap-rosetta-files` dissolved | alwayson = single always-on home + 3 slim mode files |
| **EC assets** ✅ done | `operation-manager` split by actor + `todo-tasks-fallback` dissolved | `o-`/`s-session-execution-controller.md`; no standalone skill |
| **orchestration** (skill) ✅ done | `orchestrator-contract` + gd-work-on (→ `o-team-manager.md`) + `operation-manager` orchestrator side + `todo-tasks-fallback` orch part (→ `o-session-execution-controller.md`) | context · sizing · process · `<subagent_prompt_template>` |
| **load-project-context** (skill) ✅ done | `load-context` body + `bootstrap-rosetta-files` **full roster** + `hitl` prereq | built + registered; leaf; priorities/merge → always-on; `load-context` removed in rename sweep |
| **subagent-directives** (skill) ✅ done | `subagent-contract` (pure duties) + `operation-manager` subagent side (→ `s-session-execution-controller.md`) | `disable-model-invocation: true` |
| **rosetta** (skill, `/rosetta`) ✅ done | `load-workflow` + `execution-policy` `FORBIDDEN`/no-jump-to-code + r2 bootstrap (planning-mode storage guard) | always loads `orchestration` |
| **DELETE → archive** ✅ done | all 3 mode files' intros + `EXTREMELY_IMPORTANT` + `CRITICAL_RED_FLAGS` + `OPERATION_MANAGER` + Phase 0 | archived per-atom; salvages: EI#8/#12/#14/#19→alwayson · EI#13 phrase→orchestration · EI#18→EC assets · look-around→subagent-directives · "Context loaded"→rosetta · RFC/fresh-`next`/"Plan has been changed"→EC assets · EI#17→orchestration plan-mode ✅ |
| **superseded** ✅ all removed | `load-context-instructions`, `load-context`, `load-workflow`, `operation-manager` (+om-schema), `todo-tasks-fallback` | all dissolved + archived; refs swapped; zero live r3 refs |

## Mode binding: one alias, different behavior

**[decided] Entry paths — `rosetta` is user-only.** Three explicit entries, all legitimate: **plain chat** → minimal Rosetta only (alwayson basics: guardrails, context, tasks; skills auto-engage per descriptions) · **`/rosetta <request>`** → the full routed flow (old style) · **`/<flow> <request>`** → that workflow directly, bypassing `rosetta`. The `rosetta` skill MUST NEVER be mentioned, requested, or recommended by any instruction, template, workflow, prep step, or prompt — invoking it is exclusively the user's act; the old always-route protocol is dead. MCP startup chain = `get_context_instructions` → `load-project-context` → `hitl`, nothing more.

**[decided] EXECUTION_CONTROLLER is used only by the orchestrator and only for LARGE.** `MUST USE OPERATION_MANAGER` lines disappear or become `MUST use todo tasks for reliability`. Sole exception: `adhoc-flow` demands `MUST USE SKILL orchestration FULLY` + both assets (team manager + session execution controller) — plan-driven execution is that workflow's core idea.

Command aliases are written once, mode-agnostically, in every skill/workflow. Exactly one mode file is injected per environment and binds each alias to a concrete mechanism — the only place mode logic lives. Three mutually exclusive modes:

- **Plugin mode → `plugin-files-mode.md`**: NO alias mapping — typed aliases work natively on plugin files; the file carries only mode declaration, prep steps, and the local-plugin-files statement (sources merged in) — nothing else. `get_context_instructions` is MCP-only (its prep prerequisite).
- **MCP mode → `bootstrap.md`**: aliases bind to MCP behavior plus MCP-only mappings ("X means Y by doing Z", e.g. `query_instructions` / `rosetta://{path}`). The `FILE <subpath>` form is deterministic in MCP: RAGFlow stores **path-based tags (2-/3-part)** and the VFS merges/bundles the same tree as `plugin_generator.py`, so `READ SKILL FILE assets/y.md` (nameless — resolves against the current skill `x`) maps to the exact file via tags `x/assets/y.md`, not a fuzzy query.
- **Local / in-repo dev mode → `local-files-mode.md`**: aliases bind to literal local reads from the `instructions/r*` folder (developing Rosetta itself).

Call sites never branch on mode. The alias vocabulary is a **closed contract**: every alias used anywhere must work in all three modes — natively in plugin mode, via the mapping in MCP/local mode files — or it breaks in that mode. Defining and policing that finite set is part of this work.

## Skill README.md layer — ✅ done [decided]

Every r3 skill folder (34/34) carries `README.md` — maintainer doc, plain markdown, NO XML, never loaded at runtime; answers WHY/WHEN/HOW/value-over-model-judgment + mental hooks + invariants (external contracts, locked wording) + editing guide, written from "if I execute this skill, what hooks me, what is unexpected?". Standard lives in `coding-agents-prompt-authoring/references/pa-schemas.md` `<skill_authoring>`; SKILL.md core_concepts requires creating/updating it when authoring skills. `<when_to_use_skill>` compressed in 14 SKILL.md files (zero semantic loss; cross-skill routing sentences + thresholds kept; `testing` left as-is — already dense). QA'd: no raw XML, no task leakage, no emojis, ≤80 lines, tests pass.

**Findings from the README pass — rulings applied:**
- ✅ [decided] `load-project-context` hitl `<prerequisites>` = intended enforcement (guarantees hitl even when the skill is invoked alone) — documented in its README.
- ✅ solr cross-skill FILENAME pins fixed → intent form (6 sites: solr-extending refs ×4, solr-query `11-doc-transformers.md`, solr-semantic-search `06-query-building.md`). [decided] plain skill-NAME prose mentions are accepted; only sibling file paths are forbidden — documented in the solr READMEs.
- ✅ duplicate top-level `tags:` keys merged (requirements-authoring, requirements-use) · `baseSchema` added (planning, reasoning, questioning) · `risk-assessment` description now carries the canonical guardrail prefix.
- ✅ [decided] multi-vendor CSV `model:` is intended — plugin generator selects per target agent; `agent:` with `context: default` kept as affinity metadata — documented in the READMEs.
- ✅ orphan `planning/assets/pl-validation-rubric.md` deleted (archived verbatim) · phantom `USE FLOW requirements-use-flow` dropped from `rules/requirements-use-best-practices.md` (list renumbered).

**Second ruling round — applied:**
- ✅ 7D→8D (adhoc-flow, code-analysis-flow, planning scaling table).
- ✅ [decided] `hitl` description rewritten: canonical guardrail form, prep refs removed (no value), compressed but triggerable+actionable; KEPT verbatim: opt-out exception (`fully autonomous`/`No HITL`) + auto-mode/full-access override ("ONLY auto-approve tool permission prompts — HITL stays"). `self-organization` description → guardrail form, all numeric thresholds kept. Budget exception for guardrail descriptions recorded in hitl README.
- ✅ [decided] requirement-unit master = `requirements-authoring/SKILL.md` inline XML. `ra-requirement-unit.xml` aligned (implementation enum + separate implementationNotes). `docs/requirements/rosetta-cli/*` records mechanically conformed (ticketId attr, classification, approved_by empty = Draft, changed dates derived from CHANGES.md batches). NOT retrofitted: per-record `implementation` status (needs validation against `src/rosetta-cli`, not authoring) and ID scheme (plain `FR-00NN` kept: `FR-CLI-` would collide with plugin-generator's set; cross-product NFR ids already collide — folder-namespacing is the de-facto convention; rename = user decision).
- ✅ `pa-patterns.md` stale ref → `USE SKILL \`questioning\``. [decided] `rules/coding-iac-best-practices.md` overlap: ignore.
- ✅ [decided] `model:` frontmatter ids intentionally DIFFER per target tool; plugin generator maps them — coding-agents-farm README corrected (was flagged as typo/inconsistency).
- ✅ [decided] `coding/SKILL.md` inline `sensitive-data` section is intentional (additive layering) — documented in its README.
- ✅ Rosetta-as-actor check: one README (specflow-use) anthropomorphized "Rosetta" as the acting client — fixed to "the agent" (Rosetta = the MD files); all other READMEs clean.

**Still open (decide):** `planning` `plans/` persistence vs `rosetta` planning-mode never-`plans/` override — accepted as intended (mode-specific exception) unless overruled · rosetta-cli requirement-ID scheme migration (see above).

## Queued checks & small inconsistencies (document ALL of them, however small)

- **Prep-steps canonicalization check** — prep = exactly the **3 canonical actions** (`get_context_instructions` → SKILL `load-project-context` → SKILL `hitl`), bound per mode file (plugin binds 2 — its step 1 is a no-op, rules already loaded). Every reference must say **`Rosetta Prep Steps`** — no step numbering, no variants. Known offenders:
  - ✅ `hitl` description: stale prep-step numbering + workflow-loading assumption — already gone (rewritten in the README ruling round; verified 2026-07-10).
  - `pa-rosetta.md` §2–3: "PREP steps to complete" + "Prep steps include steps:" — verify the list names exactly the 3 canonical actions and the current always-on set.
  - Non-canonical phrasings: `requirements-authoring-flow.md` "PREP steps completed before discovery" · `requirements-authoring/SKILL.md` "Prep steps completed".
  - 39 files already use the canonical `Rosetta prep steps` phrase — the sweep is wording-only, no behavior change.
- **Subagent descriptions token-compression check** — review `agents/*.md` frontmatter descriptions and LLM-compress if useful (terse phrases, terms, abbreviations). They are already ~10–14 words each; gain may be marginal — decide per file; keep the `Full/Lightweight subagent` suffix (orchestrator routing signal).

✅ **`Rosetta prep steps` bound per mode** — the ~25 `All Rosetta prep steps MUST be FULLY completed` callers are now actionable everywhere: each mode file carries a `# Rosetta Prep Steps` section (execute in order, once per session). MCP = `get_context_instructions` (blocking) → SKILL `load-project-context` → SKILL `hitl` · plugin = SKILL `load-project-context` → SKILL `hitl` (always-on rules auto-loaded) · local = exact file refs (`rules/bootstrap-alwayson.md`, `skills/load-project-context/SKILL.md`, `skills/hitl/SKILL.md`); local `execute prep steps` alias rebound to this section. Part of the closed alias contract.

## Verb / alias vocabulary (W4) — ✅ FINALIZED + ✅ APPLIED (P3 sweep executed 2026-07-10)

The set below is **closed** — it supersedes the earlier `READ SKILL the-skill FILE …` anchor (skill-name form overruled by the isolation ruling) and all candidate tables. **P3 sweep done:** ~200 sites across 59 files migrated (6 parallel lanes + mode-file bindings + templates + coding-agents-prompt-authoring + docs/ARCHITECTURE.md + docs/schemas boilerplate); zero old-vocabulary remnants in r3 core (project-scoped ABOUT/QUERY/STORE kept, out of scope); all alias targets machine-verified to resolve; 444+447 tests pass.

**Shape: `VERB NOUN <name>[.md] [FILE <subpath>]` — typed nouns, never raw folder paths.** Rationale [user]: per-tool plugin folders differ (some tools have no `rules/` and call them prompts; workflows land in `commands/`/`.codex/`…) — the noun abstracts the folder; each mode file binds noun→location/mechanism. Plugin mode needs **NO mapping** — typed aliases operate natively on plugin files (the whole point of the vocabulary); ONLY the MCP/local mode files map the nouns to KB queries / `instructions/r3` paths.

### The closed set

| Alias | Semantics | Name form |
|---|---|---|
| `USE SKILL <name>` | activate skill (load + act) | folder name, no `.md` |
| `USE FLOW <name>.md` | invoke a whole workflow from the top | full filename |
| `INVOKE SUBAGENT <name>` | spawn subagent as an actor | name only, no `.md` |
| `APPLY PHASE <file>.md` | load + FULLY execute the next phase body of a running workflow (~35 sites) | full filename, path never included |
| `READ RULE <file>.md` / `APPLY RULE <file>.md` | load / load+execute a rule | full filename |
| `READ TEMPLATE <file>.md` | load a template (shell-schemas etc.) | full filename |
| `READ CONFIGURE <tool>.md` | load an IDE/CodingAgent configure spec [decided] | full filename |
| `READ SKILL FILE <subpath>` / `APPLY SKILL FILE <subpath>` | file of **this** skill (`assets/…`, `references/…`) | subpath only — **never carries a skill name** |
| `READ SKILL <name>` · `READ FLOW <name>.md` · `READ SUBAGENT <name>` | raw non-executing load (installer copies, self-help browsing) | per noun rule above |
| `LIST <path>` | enumerate immediate children of a KB folder | `skills` · `skills/<name>` · `configure` … |

**Semantics rules [all decided]:**
- **READ = load into context; APPLY = load + execute. Default to APPLY when in doubt.** `USE`/`INVOKE` = typed activation.
- **Plural = plural noun + comma list**: `READ RULES a.md, b.md` · `APPLY SKILL FILES assets/x.md, assets/y.md`. **`APPLY PHASES` is forbidden** — phases are strictly one-at-a-time.
- **`SEARCH` is dropped** from the contract entirely (zero real callers) — remove bindings from all 3 mode files + pa-docs.
- **`ACQUIRE <path> FROM KB` survives ONLY as the MCP shell mechanism [decided]** — generated shell files (skill/agent/workflow proxies) are copy-paste from `templates/shell-schemas/*` and keep verbatim `MUST ACQUIRE … FROM KB and FULLY EXECUTE`; shells exist ONLY in MCP-mode workspaces; `bootstrap.md` binds `ACQUIRE` for them. Authored instructions never use it. init-workspace is the special consumer: in MCP mode it starts when NOTHING except MCP + `bootstrap.md` exists — its own steps use typed aliases (all bound by `bootstrap.md`), while everything DESCRIBING generated shell content says ACQUIRE.
- **Skill isolation is grammar-enforced**: `SKILL FILE` never takes a name → no artifact *can* reference another skill's internals. **Strict**: only a skill's own files may use `SKILL FILE`; workflows/agents express intent instead ("run validation using the `requirements-authoring` skill's validation rubric") and the skill routes to its own asset. The 2 offenders in `requirements-authoring-flow.md` get reworded this way. Audit fact: all ~28 existing skill-file ACQUIREs are already self-references — the rule costs nothing.
- Whole-skill loads from flows stay legal via `USE SKILL <name>` (init-workspace, large-workspace-handling → `reverse-engineering`).
- **alwayson must not define `USE SKILL` or any alias at all** — alias definitions/bindings live in mode files only. `bootstrap-alwayson.md` line "USE SKILL `X` = …, fallback ACQUIRE …" → relocate carefully, do NOT blindly delete (the "reconstructing behavior from memory does NOT satisfy" semantics must survive in the binding). MCP binding: `USE SKILL <name>` => acquire `<name>/SKILL.md` from KB, then FULLY EXECUTE.
- Dynamic/tag sites (`ACQUIRE <selected TAG> FROM KB` in self-help/init-workspace): agent selects via `LIST`, then uses the typed verb (`READ FLOW/SKILL/SUBAGENT …` to browse; `USE`/`APPLY`/`INVOKE` to act).
- Project-scoped `ABOUT/QUERY/STORE` — **dropped from the contract everywhere [decided]** (plugins exist to NOT install MCP; security/privacy; separate plugin planned); archived verbatim.

### P3 sweep — ✅ done · audited · intent-repaired

~200 sites / 59 files; zero old-vocab remnants; every alias target machine-verified; tests pass; dropped atoms archived verbatim → `bootstrap-removed.md` §"W4 vocabulary sweep". Durable rulings beyond the table: testgen `testgen-phaseN-md` tags resolve via the declared phase ordering · installer raw loads = READ · footer verb-teaching prose deleted, items canonicalized · `questions.md` dangler → `USE SKILL \`questioning\`` [decided] · prep steps carry no MUST [decided] · NO meta-commentary in instruction files, exempt: `coding-agents-prompt-authoring` [decided] · alwayson defines NO alias (the reconstructing/assuming-does-not-satisfy clause lives in mode files) · plugin mode file = mode decl + prep steps + merged local-files/sources statement + project verbs, nothing else; `get_context_instructions` exists ONLY in MCP prep [decided] · mode-file mappings compressed to noun→path form; plural + `APPLY PHASES` authoring rules live ONLY in `pa-rosetta.md`.

**Cross-skill resolution — [decided] + ✅ applied:** a skill must NEVER name another skill's internal files or paths (file names change) — express intent with the typed alias + topic keywords the target routes on: `USE SKILL \`solr-extending\` to apply plugin wiring`. All ~11 solr cross-skill sites reworded to this form; documented in `pa-rosetta.md` §Command Aliases item 8; `pa-hardening.md` now instructs reviewers to actively hunt cross-skill refs and require the intent form.

**[decided] `requirements-use/SKILL.md` refers to NO workflows at all** — `READ FLOW requirements-use-flow.md` footer line deleted; "use questions flow" → `USE SKILL \`questioning\``.

**Full-diff audit ✅ done** (line-by-line git diff of all 59 files + repo-wide scan). Fixed en route: codemap script assets APPLY→READ (scripts are saved/chmod'd, executed in the NEXT step) · `READ CONFIGURE <selected configs using TAG>` → `<each selected tool>.md` (stale tag jargon, 2 files) · `USE WORKFLOW`→`USE FLOW` (`modernization-flow-implement.md`) + example prompt in `init-workspace-flow-verification.md` · `REVIEW.md` alias examples → typed set · `llms-full.txt` COMMAND ALIASES block → closed set. Left alone deliberately: `init-workspace-flow.md` `<references>` phase-file manifest (phase 4 is permanently-disabled — footer is the only place naming its file); `load-project-context` "suggest workflow `init-workspace-flow.md`" (user-facing suggestion, names not loads).

**Intent-repair pass ✅** (violations of original intent found on user challenge): `plugin-files-mode.md` had gained a typed-noun binding table — REMOVED; plugin mode carries NO alias mapping (one declarative line + `get_context_instructions` no-op + project verbs + ADDITIONAL SOURCES only), and the "one mode file binds each alias" phrasing corrected everywhere (pa-rosetta, ARCHITECTURE, llms-full, story). Meta-commentary stripped from instruction files ("(the skill routes to it)" ×3, ACQUIRE-binding provenance note); `pa-meta-prompt.md` brief step re-voiced to intent with no internal file name (generated prompts obey isolation). alwayson now defines NO alias at all (memory-does-not-satisfy clause lives in the 3 mode files); local `USE SKILL` binding regained "all relative references in skill are relative to skill folder itself". All dropped atoms archived verbatim → `bootstrap-removed.md` §"W4 vocabulary sweep — dropped atoms" (alwayson USE-SKILL line incl. ToolSearch hint, SEARCH bindings ×3, old ACQUIRE/LIST bindings, questions.md dangler, requirements-use workflow ref, footer verb-teaching prose, pa-rosetta old alias items, the 2 cross-context ACQUIRE originals).

**Open after sweep:**
- `specflow-use/references/specflow-schema.md:23` bare same-dir self-ref (`see specflow-vocabulary.md`) — cosmetic, out of grep patterns.
- `docs/web/**`, `docs/PATTERNS/**`, `docs/reviews/**` still use old vocabulary **deliberately** — they document the published r2 product; sync when r3 publishes (same batch as the `bootstrap.md`→`mcp-files-mode.md` rename). Exception: `docs/web/docs/review.md` alias examples synced with root `REVIEW.md` (source/mirror must not diverge).
- **r3-publish batch additions** (found by repo-wide scan; all serve the live r2 KB today — do NOT touch before publish): `src/ims-mcp-server/ims_mcp/tool_prompts.py` (MCP tool descriptions teach ACQUIRE/SEARCH/LIST + `USE SKILL load-context`) · `DEVELOPER_GUIDE.md:49` MCP authoring one-liner (`MUST ACQUIRE coding-agents-prompting-flow.md FROM KB`).
- `agents/TEMP/old-gen-r2/**` carries old vocabulary — generation artifacts in TEMP, ignore/delete at will.

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
- READ RULE `requirements-best-practices.md` — requirements quality and process rules

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
- OUT / deferred: `instructions/r2/**`, MCP server behavior, the rename sweep timing (after extractions), guardrail-activation redesign, subagent-branch fidelity beyond what is specified. (Verb vocabulary + all three mode-file bindings: ✅ done. Project-scoped `ABOUT/QUERY/STORE`: ✅ dropped everywhere [decided] — plugins exist to NOT install MCP; security/privacy risk; separate plugin will own project datasets; archived.)

## Open / to confirm

1. ~~Verb vocabulary~~ ✅ decided — see the finalized W4 section (shape, per-category mapping, `APPLY PHASE` for phase files).
2. **Minimal bootstrap contents** — what irreducibly stays always-on once the adherence prose is gone.
3. ~~Closed alias set~~ ✅ decided — W4 table is the complete contract; remaining work is *binding* it in the three mode files + P3 normalization (still gated behind the sweep phase).

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