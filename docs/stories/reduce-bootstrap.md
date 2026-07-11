# Story: Shrink the Running Bootstrap & Make Plugins Primary

Status: **single plan of record for r3.** Structural decomposition ✅ · compression pass ✅ · in-branch-now batch ✅ — remaining: ONLY the publish-gated batch (own section, deferred to `on-v3-release`). Companions: `docs/stories/bootstrap-removed.md` (loss-archive — verbatim text + provenance of everything removed) · `docs/stories/reduce-bootstrap-mental-model.md` (`orchestration` grounding).
Scope: **r3 only** (`instructions/r3/core/**`; never r2 — r2 is live/published, r3 not deployed → intermediate inconsistency is an authoring concern, not runtime risk). Executors of the results: Sonnet 4.6 / GPT-5.4-class, later, on *other* repos. Validation design: deferred.

**Authority:** this story defines intent, constraints, surfaces. _[decided]_ = settled by requester; _[implementer: review & decide]_ = author judgment, propose first.

**Roles.** **User (requester)** — ultimate decision maker; work runs propose → user review → change; the author never implements unapproved changes. **Author** — the AI assistant refactoring r3 in this repo; must ground in `pa-rosetta-intro-for-AI.md` + `pa-rosetta.md` before authoring. **Reviewer** — background `prompt-engineer` subagent (opus, read-only). **Executor** — downstream models running the resulting skills ("the agent").

**Goal:** reduce the **running context** per request — always-injected bootstrap toward 0 by moving mass behind the user-invoked entry + on-demand skills. Never merge into one large core; splitting further is fine.

## The seam (why the bootstrap looked like that)

The old bootstrap was one accreted defense system — each layer scar tissue over a specific agent failure: **1) rationalized step-skipping** (`EXTREMELY_IMPORTANT`/`RED_FLAGS`/`FORBIDDEN` — always-on text has no authority; browbeating-by-volume fails) · **2) non-deterministic process-following** (OPERATION_MANAGER/Phase 0 — real capability gap, must survive) · **3) context hallucination** (prep/context-load) · **4) catastrophic safety failure** (guardrails — possible on a one-line task) · **5) false approval** (`hitl`). The seam: **safety (4, partly 5) is unconditional** — fires on every request; **rigor (1–3) is expensive and a choice.** `/rosetta` IS that seam: not typing it = legitimate lean choice; typing it = rigor *requested* → authority becomes real, not manufactured → the anti-rationalization mass **deletes** (not moves), what remains is a calm senior-engineer procedure, and always-on shrinks to the safety floor + pointer.

## Durable decisions & contracts

- **Skill description field** — GENERIC: "To <verb> <what + when/why; dense keywords>". Guardrail: "CRITICAL. MUST activate when <condition>" — no "Rosetta … MUST skill" prefix; guardrail skills are already named directly in alwayson priorities/engagement lists [decided 2026-07-11]. Budget ~25 tokens (all skills share ~1K); keyword-dense triggers best. EXCEPTION `disable-model-invocation: true` → user-friendly, uncompressed. Guardrail descriptions may exceed budget [decided] (recorded in hitl README).
- **Always-on = `bootstrap-alwayson.md` ONLY + exactly one mode file [decided].** Budget: <100 lines AND <1.5K tokens excl. frontmatter. Minimal bootstrap *plus* skills working together — descriptions (always visible) drive auto-activation; bodies load on demand; guardrails fire through skills, not rule text. The 4 keeps: entry/mode declaration · enterprise + `reasonable` · transparency + todo tasks · safe fallbacks (unsure → overdo). `<skill_engagement_rules>` = compact actor lists only, NO per-skill trigger text (descriptions already say when).
- **Tasks are the reliability gate [decided]** — todo tasks = always-present base (open → one `in_progress` → close on completion → next); EC (plan ⊃ phases ⊃ steps ⊃ tasks) adds on top for LARGE only.
- **Entry paths [decided] — `rosetta` is user-only.** Plain chat → alwayson basics + auto-engaging skills · `/rosetta <request>` → full routed flow · `/<flow> <request>` → that workflow directly. The `rosetta` skill MUST NEVER be mentioned/requested/recommended by any instruction — invoking it is exclusively the user's act. No per-request classification. MCP startup chain = `get_context_instructions` → `load-project-context` → `hitl`, nothing more.
- **EXECUTION_CONTROLLER = orchestrator-only, LARGE-only [decided]** (`npx -y rosettify@latest plan …`, CLI-only). Sole exception: `adhoc-flow` demands `MUST USE SKILL orchestration FULLY` + both EC assets — plan-driven execution is its core idea.
- **Mode binding — one alias, different behavior.** Aliases written once, mode-agnostically; exactly one injected mode file binds them: `plugin-files-mode.md` (NO mapping — typed aliases native on plugin files; mode decl + prep steps + local-files statement only; keeps the literal `RUNNING AS PLUGIN` marker verbatim) · `mcp-files-mode.md` (MCP bindings; `FILE <subpath>` deterministic via path-based tags/VFS) · `local-files-mode.md` (literal reads from `instructions/r*`). Call sites never branch on mode. The vocabulary is a **closed contract** — every alias must work in all three modes.
- **Skill-ref lists literally say `USE SKILL <name>`** — skill-tool activation needs the word "SKILL" + name together; never reword engagement lists away from this form.
- **Priorities (alwayson) design is deliberate** — named guardrail tiers + self-identified purpose ("these fix constant failure-modes of AI") = the anti-prompt-injection fix; user-explicit ranked ABOVE always-on rules is intentional (lean choice is legitimate). Do not "fix" the order.
- **Rosetta Prep Steps** = exactly 3 canonical actions (`get_context_instructions` → SKILL `load-project-context` → SKILL `hitl`), bound per mode file (plugin binds 2 — step 1 no-op); every reference says `Rosetta prep steps`, no numbering, no MUST [decided].
- **Subagent model.** Same minimal bootstrap injected to every agent; orchestrator MUST instruct every subagent to read always-on rules (unconditional) and to load `subagent-directives`; context load (`load-project-context`) is orchestrator-decided per task — lightweight subagents skip it. Subagents CAN spawn subagents. One composable `<subagent_prompt_template>` in `orchestration/SKILL.md`. Decomposition strategies (compose AND/OR): map-reduce · split by roles · delegate-to-plan (HTN-style). MCP behaves identically via installed shells.
- **Removal is last** — draft new → approve → make it work → only then remove originals.

### Verb / alias vocabulary (W4) — closed contract ✅ applied

Shape: `VERB NOUN <name>[.md] [FILE <subpath>]` — typed nouns, never raw folder paths (per-tool plugin folders differ; the noun abstracts the folder).

| Alias | Semantics | Name form |
|---|---|---|
| `USE SKILL <name>` | activate skill (load + act) | folder name, no `.md` |
| `USE FLOW <name>.md` | invoke a whole workflow from the top | full filename |
| `INVOKE SUBAGENT <name>` | spawn subagent as an actor | name only, no `.md` |
| `APPLY PHASE <file>.md` | load + FULLY execute next phase of a running workflow | full filename, never a path |
| `READ RULE <file>.md` / `APPLY RULE <file>.md` | load / load+execute a rule | full filename |
| `READ TEMPLATE <file>.md` | load a template | full filename |
| `READ CONFIGURE <tool>.md` | load an IDE/CodingAgent configure spec [decided] | full filename |
| `READ SKILL FILE <subpath>` / `APPLY SKILL FILE <subpath>` | file of **this** skill | subpath only — **never carries a skill name** |
| `READ SKILL <name>` · `READ FLOW <name>.md` · `READ SUBAGENT <name>` | raw non-executing load | per noun rule |
| `LIST <path>` | enumerate immediate children of a KB folder | `skills` · `skills/<name>` · … |

Semantics [all decided]: READ = load; APPLY = load + execute (default when in doubt); `USE`/`INVOKE` = typed activation · plural = plural noun + comma list; `APPLY PHASES` forbidden (phases one-at-a-time) · `SEARCH` dropped · `ACQUIRE … FROM KB` survives ONLY as the MCP shell mechanism (generated shells verbatim; authored instructions never use it) · **skill isolation grammar-enforced**: `SKILL FILE` never takes a name; cross-skill = intent form (`USE SKILL \`x\` to <topic>`), never another skill's file paths · whole-skill loads from flows legal via `USE SKILL` · alwayson defines NO alias (bindings + memory-does-not-satisfy clause live in mode files) · project-scoped `ABOUT/QUERY/STORE` dropped everywhere [decided] · NO meta-commentary in instruction files (exempt: `coding-agents-prompt-authoring`) [decided].
Deliberate exceptions kept: `init-workspace-flow.md` footer phase manifest (permanently-disabled phase 4's only naming site) · `load-project-context` user-facing suggestion of `init-workspace-flow.md` (names, not loads).

### `<references>` footers — _[implementer: review & decide]_ per file

Footer only repeats inline-invoked deps → **remove**; else **convert items to canonical aliases** and drop prose verb-teaching lines, e.g. `- skill \`x\` - <desc>` → `- USE SKILL \`x\` — <desc>`, `- rule \`rules/y.md\` …` → `- READ RULE \`y.md\` — …`.

## Method (durable authoring principles)

- **Tell how to think, not what to do** — hand the executor a working model (mechanism + properties + design-intent); steps stay legitimate — bare imperatives/motivational vibes *without* a model are the failure.
- **Token compression is top priority** — terse nudges, terms, references; exception: user-facing strings.
- **Executor markers ≠ author constraints** — `compact="NEVER"`/`summarize="AS-IS"` protect terse blocks at runtime; they never gate how terse the author writes.
- **Decisions/edits are review, not approval** — write only after an explicit approval sentence; on mismatch, stop and revert own unapproved writes.
- **Add on top, never replace** — tiers/layers/skills compose additively; de-dup is not a goal.
- **No conditionals** — no `IF/THEN`; teach sizing by examples; cumulative bands `[SMALL+]/[MEDIUM+]/[LARGE]`.
- **Document request = capture idea + thinking model** — never verbose prose, history, rationale.
- **Instructions are composite — merge and sequence, never choose** (multiple plugins' "do X first" all run first → sequence via tasks). Always-on stance.
- **Keep original section names + XML attributes** when moving content — they enable merge-back.
- **Make it runnable, not prose** — a self-describing `echo "=== f ==="; cat f` beats "read the context files".
- **Show, don't cite by number** — short visible excerpt, never bare `#9–#13`.
- Per target: MOVE content in, understanding why each piece existed; adapt, compress, dedup — **zero semantic loss**; one-by-one, checking; **nothing is lost** (archive to `bootstrap-removed.md`); skills may use progressive `assets/`.
- Authoring lesson (hitl probe experiment): merged gate bullets + MUST-less first clauses raise first-clause-only skim risk — keep gate lists enumerated, keep MUST on tool-facing imperatives.

**Intrinsics** (weave as nudges): `coded ≠ request completed` · `tests passing ≠ actually works` · `review = ACs + gaps + tests + security + …` · `validation ≠ review` · `validation = run the actual code + AI manual QA` · `build the foundation first`.
**Routing map (insert when next touching the skill):** `testing` — "worked when I tried" ≠ comprehensive · tests-after ≠ TDD · ad-hoc ≠ systematic · tests pass ≠ healthy design | `debugging` — symptoms ≠ root cause · TDD-simplest ≠ debug-root-cause | `research` — "didn't find" ≠ "doesn't exist" · cannot reproduce ≠ doesn't exist · package exists ≠ safe to install | `coding` — clarity over cleverness · explicit over implicit · correctness over perfection · vertical slices | `orchestration` — request size ≠ task size · completion ≠ goal achievement. (✅ `review`/`hitl` pair placed.)

## Done (nudges — details in `bootstrap-removed.md` + git history)

- ✅ Always-on target reached structurally: `bootstrap-alwayson.md` (~79 body lines / ~1.2K tokens — budget holds) + 3 slim mode files (mode decl + prep steps + bindings; root attrs `severity="CRITICAL" use="ALWAYS" compact="NEVER" summarize="AS-IS"`). All other `bootstrap-*` rules dissolved: core-policy, guardrails, execution-policy, rosetta-files, hitl-questioning (→ hitl skill, r2-era).
- ✅ Skills built/rebuilt: `load-project-context` · `orchestration` (+ `o-team-manager.md` MEDIUM+, `o-session-execution-controller.md` LARGE) · `rosetta` (smart router, absorbs `load-workflow`) · `subagent-directives` (+ `s-session-execution-controller.md`) · `hitl` (structured + compressed + probe-hardened; 41 rules post-compression; user-authors batch rule [decided, ex-`TODO(human)` markers]; dangerous-actions hook mechanics removed from ALL skills as added-in-error [decided] — live only in the hook implementation; fuller alt saved `docs/stories/hitl-skill-good-alternative.md`).
- ✅ Superseded removed + archived: `load-context-instructions`, `load-context`, `load-workflow`, `operation-manager` (+om-schema), `todo-tasks-fallback`, `subagent-contract`, `orchestrator-contract` (renames), OPERATION_MANAGER refs eliminated; EI/RED_FLAGS/Phase-0 dissolved per-atom with salvages landed.
- ✅ W4 sweep (~200 sites / 59 files, targets machine-verified) + intent-repair + full-diff audit; priorities forward-ported from r2 (named tiers, user-explicit above always-on); `reasonable-definition` compressed; prep steps bound per mode; rosettify plan templates → r3 skills; `bootstrap.md` → `mcp-files-mode.md` renamed in r3 (self-closing-tag defect fixed en route).
- ✅ README.md layer 34/34 (standard: `pa-schemas.md` `<skill_authoring>`); `<when_to_use_skill>` compressed ×14. Durable rulings: plain skill-NAME prose mentions OK, sibling file paths forbidden · multi-vendor CSV `model:`/differing per-tool ids intended (generator maps) · `coding` inline `sensitive-data` = intentional layering · `load-project-context` hitl prereq = intended enforcement · Rosetta = the MD files, agent = the actor.
- ✅ `docs/definitions/skills.md` current; tests green throughout (447 rosettify + 444 rosettify-plugins).
- ✅ In-branch-now batch (2026-07-11): prep-steps wording canonicalized — `requirements-authoring-flow.md`, `requirements-authoring/SKILL.md` + README, plus a third offender found (`coding-agents-prompting-flow.md` prerequisite "Preparation steps" → canonical). Subagent descriptions reviewed per file — no change (10–14 words, budget-compliant, `Full/Lightweight subagent` suffix kept, "etc." broadens routing deliberately). Doc syncs: `agents/IMPLEMENTATION.md` r3 entry un-staled (compression no longer "pending"); `docs/ARCHITECTURE.md:261` `bootstrap.md`→`mcp-files-mode.md` (section documents r3 — names `local-files-mode.md`/`instructions/r3`; alias table verified = closed set + shell-only `ACQUIRE`); 4 r3 READMEs verified clean — zero live `bootstrap.md` refs (only `bootstrap_rosetta_files` tag / story filenames). `<references>` footers ruled per file: REMOVED self-help-flow, coding-agents-prompting-flow (incl. Contracts block — all restated in prerequisites/checklist), code-analysis-flow (all items inline-invoked); TRIMMED coding-flow → MCPs only, requirements-authoring-flow → `READ RULE requirements-best-practices.md` only, init-workspace-flow → phase manifest only (kept exception); KEPT init-workspace-flow-discovery (unique, canonical) + 4 solr SKILL.md routing tables (core mechanism). Coupled READMEs synced: questioning (footer line refs), natural-writing (Skills-list clause), reasoning (stale "7D callers" note — callers already say 8D). `approval-gate.md:10` base-rule ownership → always-on never-assume floor; `specflow-schema.md:23` bare sibling ref → `READ SKILL FILE references/specflow-vocabulary.md`. Tests green (447 rosettify + 444 rosettify-plugins).
- ✅ Token-compression pass (2026-07-11): 7 running-context files −13% body tokens (5694→~4950 o200k) via 3 rounds, each validated by a fresh-Sonnet two-phase blind probe (new→report→old→delta; final verdict all-SAFE, minor losses restored). Measured findings: spaced separators/periods/`—`/`·` token-neutral; `≠⊃↔×` cost 2–4 tok → ASCII (`⊃` kept in EC hierarchy — meaning-bearing); real savings = stated-once prefixes (prep steps one-liner `USE SKILL \`x\`, \`y\``, `<root>/`, `plans/<FEATURE>/`), merged sections (alwayson 6→4, lpc 5→2, mode headers), phrase-style. Invariants single-sourced to alwayson floor (never-assume-approval incl. question/suggestion/edit/partial; auto-mode/full-access override + `/ similar`) — now subagent-visible; hitl 43→41 rules, `Strict approval` term (rule 11) adopted by 6 workflow gate sites, `TODO(human)` in-code markers → accumulate-and-batch (rule 38, commit risk), pitfalls deleted as duplication; `reasonable-definition` anchors guard held. Guardrail descriptions re-formatted + compressed (hitl, orchestration, self-organization ~50%, dangerous-actions; ~190 always-on tokens); self-organization context thresholds percent-only — no absolute token counts (1M-context models) [decided]; dangerous-actions stale `hard-deny tier (see below)` ref fixed; lpc `plan.json` gloss "Operation manager"→EXECUTION_CONTROLLER; requirements-authoring:370 duplicate trimmed; 5 READMEs synced.

## Open work — in-branch-now

✅ **All done (2026-07-11)** — see the Done nudge below. Remaining before merge: nothing in-branch; publish-gated batch stays deferred (own section).

**Closed decisions [decided 2026-07-11] — non-issues, do not re-raise:** requirement IDs are per-PROJECT namespaces (`docs/requirements/<project>/` are separate projects, not folders — same ID in two projects is fine by design) · `rosetta/SKILL.md:30` is the plan-mode (platform read-only) override of `planning`'s persistence table, not a conflict · MCP TEMPLATE tag is filename-only because MCP tags cannot carry a `templates/**` glob — intended · lpc `hitl` prerequisite = engagement guarantee (skills execute at any time), not load-order · CLAUDE/AGENTS/GEMINI.md are read natively by all coding agents, never via lpc roster · pa-knowledge-base's ~100K per-task budget is a GOAL, not a stale limit — do not touch.

## r3-publish batch — deferred to branch `on-v3-release` [decided]

**Solution:** all publish-gated work happens in a dedicated branch **`on-v3-release`** with a **draft PR** tracking it. The branch is created **only when we start these activities — after all other r3 work is done and merged to `main`**. Until then: do NOT touch these surfaces (they serve the live r2 product today); collect items here as found.

Batch contents:
- `docs/web/**`, `docs/PATTERNS/**`, `docs/reviews/**` — still old vocabulary deliberately (document published r2); sync to the closed alias set. (Exception already applied: `docs/web/docs/review.md` synced with root `REVIEW.md` — source/mirror must not diverge.)
- `bootstrap.md` → `mcp-files-mode.md` reference fixes in r2-serving code/config: `src/rosettify-plugins/src/spec/targets.ts`, `src/rosettify-plugins/src/plugin-processors/plugin-process-spec-entries.ts`, `bootstrap-manifest.ts` r2 entries, plus website/docs mentions.
- `src/ims-mcp-server/ims_mcp/tool_prompts.py` — MCP tool descriptions still teach `ACQUIRE/SEARCH/LIST` + `USE SKILL load-context`.
- `DEVELOPER_GUIDE.md:49` — MCP authoring one-liner (`MUST ACQUIRE coding-agents-prompting-flow.md FROM KB`).
- Plugin regeneration + publish itself (only when requested).
- `agents/TEMP/old-gen-r2/**` — generation artifacts, delete at will in the batch.

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
