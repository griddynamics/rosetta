# Mental Model — Rebuilding the `orchestration` Skill

Companion to `reduce-bootstrap.md`. Captures **what `orchestration` is and WHY**, as the shared grounding for its rebuild. This is a *thinking model* for author + executor — the one place the "why" lives; it is **not** an instruction file, so WHY is content here, not slop.

> Method note: built via relentless HITL interview (propose → user review → change). Decisions and AI-failure findings below are user-confirmed, not inferred.

---

## TLDR

`reduce-bootstrap` shrinks always-on context by making rigor a *choice* behind a user invitation. **`orchestration` is the manager brain that every workflow requires** (entry-agnostic). We are rebuilding it. Its job is to make even a cheap model **think and act like a senior manager**: take one of our **existing** workflows, *understand why each step exists* (scar tissue over a real AI failure), **read the true size of the work by judgment** (not appearance), and **build this request's process from what we already have** — continuously re-adapting as reality arrives. The rebuild **keeps v2's concrete specifics** (numbers, process, samples — the AI's grasp on reality) and layers an **active/proactive decision model** on top, gating each decision with an **externalized output message**. It is **thin SKILL + JIT assets** ("in the dark"). It mines gd-work-on for principles but **does not copy its shape**.

---

## 1. Why — the seam

The bootstrap is one accreted **defense system**; each layer is scar tissue over a specific way coding agents fail. Two kinds were conflated:

- **Safety** (leak / delete / dangerous command) — *unconditional*; a typo fix can still leak → stays always-on.
- **Rigor** (anti-rationalization, deterministic process, grounding) — *"how to do good work," a choice*.

The user invitation **is** that seam. Not choosing rigor is legitimate lean work. The old bootstrap's defect was not size — it was **fighting the lean choice with volume** (browbeating). An invited rigorous flow carries *user authority*, which the model obeys natively → the anti-rationalization mass **dissolves rather than moves**. Goal: running context → 0 for lean requests; rigor loaded on demand.

## 2. The map — entry-agnostic

**`orchestration` is a universal workflow competence — every workflow requires it, regardless of how execution started.** Three entry paths, same manager underneath:

- invited rigorous entry (or a plain routed request) → the router picks a workflow and hands off;
- `/<workflow>` called directly → **bypasses the router entirely**;
- `/<skill>` called directly.

In all three, **the workflow itself pulls in `orchestration`** as a prerequisite. The router "always loads" it on *one* path — it is not the source of it. Orchestration sits **beneath every workflow**, not behind one command.

**Small/trivial → don't invoke orchestration at all.** The manager overhead isn't warranted for a typo, a one-liner, or a direct question — those run as a plain agent (or straight down the workflow). Orchestration loads only when the work actually needs coordination. And if it *is* loaded yet the task turns out **extremely trivial**, it shortcuts at the top: just execute the workflow, skip the manager machinery.

| Layer | Role |
|---|---|
| **always-on bootstrap** | safety floor + `reasonable` + tasks-as-reliability-gate + pointer to the rigorous entry |
| **router skill** (user-invoked) | detect best-matching workflow, forbid code-before-handoff, hand off |
| **`orchestration`** ← *rebuild target* | the manager competence: adaptive loop, sizing-as-judgment, decomposition tactics, delegation, verification |
| **workflows (MANY)** | concrete phase sequences: `coding-flow`, `aqa-*`, `modernization-*`, `testgen-*`, `research-flow`, … |
| **`adhoc-flow`** | meta-workflow — build a bespoke plan from building blocks when no fixed flow fits |
| **EXECUTION_CONTROLLER** (OPERATION_MANAGER) | determinism engine for large work; `plan ⊃ phases ⊃ steps ⊃ tasks`. **Dissolves into `orchestration` as an add-on asset** (loaded forced-conditional at LARGE), not a sibling skill |
| **`subagent-directives`, `hitl`, `load-project-context`, `reasoning`, `questioning`** | subagent contract, gates, grounding, thinking |

*Palette availability:* the skills/workflows the manager reaches for live in **R3, with fallback to R2 if missing**.

## 3. gd-work-on is a monolith Rosetta decomposes

gd-work-on bundles four concerns in one skill. Rosetta splits them into siblings:

| gd-work-on slice | Rosetta home |
|---|---|
| orchestration / manager | **`orchestration` skill** (rebuild target) |
| guardrails | **always-on bootstrap** (safety floor) |
| thinking | **`reasoning`** (7D) + **`questioning`** skills |
| build-a-workflow-from-blocks | **`adhoc-flow`** workflow (+ the many fixed workflows) |

So orchestration does **not own** guardrails, thinking, or the building blocks — those are siblings. It **equips the manager to reach for them**.

> **DO NOT OVERFIT gd-work-on.** It is a *source of principles* (manager mindset, JIT, failure-mode framing, active construction, the tricks), **not a template to replicate**. Do not import its 6-step structure, section names, bundling, or its "invent-a-workflow" machinery. Design from **Rosetta's** constraints; gd-work-on is one input among `orchestrator-contract`, the `OPERATION_MANAGER` block, `execution-policy`, `bootstrap-core-policy`, `coding-flow`/`adhoc-flow`, and the `reduce-bootstrap` intent.

## 4. What orchestration IS — the continuous adaptive manager

**Not a pipeline** (think → then execute) with a boundary against the workflow. A **continuous adaptive manager loop that takes all information in and adapts along the way.** There is no gate between designing the process and running it — understanding, sizing, process-design, delegation, verification are held *simultaneously* and **re-adapted as reality arrives** (discovery reveals scope; a subagent returns a surprise; the user clarifies; the target turns out already done).

The manager continuously:

- **comprehends *why*** the chosen workflow/steps exist (scar tissue) — that WHY is the bar for "may I adapt/skip this?"; it **bends the workflow to fit**, composing other workflows / building blocks / tactics as the picture sharpens. *Takes this workflow → understands why → builds this request's process from what we have → keeps re-adapting.*
- keeps a **running read of true size/complexity** (never a one-time label) that drives *externalization depth* (todo ledger → phased EC plan) and *delegation breadth*.
- **externalizes state** so compaction can't erase decisions; the plan/ledger is a living artifact.
- **delegates → verifies** (review ≠ validate; fresh eyes), escalates (subagent → orchestrator → user), loops until intent is met; **re-plans** when reality diverges (HTN / delegate-to-plan).
- **lets the AI choose** what to pull from the palette *right now* — enablement of judgment, not prescribed routing.

## 5. The rebuild method (the crux)

The transformation is **not** "replace v2's concrete steps/numbers with abstract thinking." It is:

> **Keep the v2 specifics that work + go active/proactive + externalize each decision as output.**

Three moves, applied to every retained piece:

1. **Keep the concrete anchor** — numbers, process, samples. They are the AI's *grasp on reality*; strip them and it hallucinates (F3). Thinner comes from moving the *heavy* to JIT assets, **not** from deleting the *concrete*.
2. **Flip passive → active** — the AI *uses the sample to decide for itself* and *constructs its own artifact for the situation*, rather than passively consuming a pre-baked one. (E.g. don't bake a template in to be filled — make the manager **define and finalize the template for its task**.)
3. **Externalize to think** — gate each decision with an output message. Without emitting an artifact the AI only *pretends* to think (F1); producing even an intermediate message forces it to finalize and build on top → step-by-step.

Re-voicing shape: *"here is how we read size / what each read changes — now **you** read it and **decide**, and write your decision."* — v2 process retained, made active, output-gated.

## 6. Sizing — the worked example of the method

Sizing is **one instance** of §5, not a special case.

- **Keep v2's anchors** (they worked): ~1–2 files, one area · up to ~10, one area · >10 or multiple areas.
- **Go active** — the manager does not *label* "MEDIUM"; it **reads** volume + breadth + uncertainty and lets that **drive concrete choices**. Taught via *effect*, so even a cheap model decides: each read changes externalization depth (ledger → phased plan), delegation breadth (do-it-yourself + review → delegate most → coordinate + verify), and gate depth. The model infers size **backwards from the work**, not forwards from a label.
- **Surface ≠ truth** — show the anchors *beside counter-examples*: a long request that's trivial; a one-line request that's large because **discovery uncovers scope, the target may already be done, or the user doesn't understand it yet.**
- **Re-scored continuously** — a "small" that grows re-triggers the adaptive loop; size is never frozen.

## 7. The tricks we keep

Manager identity · **JIT progressive disclosure** ("in the dark" — each asset carries only the failures that bite *there*) · **failure-mode framing** (recognize → solve; "sufficient for X, breaks when Y") · compressed operating beliefs/intrinsics · **ledger** as execution spine · **mini-loops** (review ≠ validate; grill-me; author → fresh-eyes → consult) · **tactics** (fan-out, map-reduce, tournament, scout-then-swarm, isolation, adversarial red-team) · **persistent consultant** · **co-working** (human + AI together → result, separately → waste) · ≤2-page reviews + TLDR.

## 8. Boundaries — what orchestration must NOT do

Anti-duplication (single-source + point, don't restate):

- not restate workflow phases (workflows own their sequence);
- not restate OPERATION_MANAGER syntax inline (→ orchestration's own add-on asset `assets/o-operation-manager-commands.md`, loaded forced-conditional at LARGE; EXECUTION_CONTROLLER dissolves into orchestration, not a sibling skill);
- not restate always-on rules or guardrails;
- not restate the subagent contract (→ `subagent-directives`);
- not restate building blocks (→ `adhoc-flow` vocabulary) — *point*, don't copy;
- not classify mechanically; not prescribe rigid routing where the manager should judge.

## 9. Shape — thin SKILL + JIT assets

`SKILL.md` = manager identity + operating beliefs + sizing-as-judgment (with our anchors + effect) + the adaptive-loop driver + the "define/finalize your artifact and write it" gates + pointers. The **heavy** content (tactics, delegation template as a *constructor*, decomposition, mini-loops, execution-integrity detail) moves to `assets/` loaded **JIT** when that concern is reached. Strip authoring scaffolding (`RAW SOURCE` / `META` comments) from the target — provenance → `bootstrap-removed.md` / git.

## 10. AI failure modes this design counters

Driving the design (user-confirmed during this interview marked ★-new):

- ★ **Thinks in extremes** — offers yes/no/split (false trichotomy) where reality is a blend on a continuum that adapts as facts arrive.
- ★ **Over-prescribes rigid mechanics/routing** — reaches for a fixed content split instead of enabling the manager to judge and compose.
- ★ **Overfits to one strong reference** — replicates an example's *shape* instead of extracting principles and designing for the actual context.
- ★ **F1 — No output, no thought** — without emitting a message/artifact the AI only pretends to think; an intermediate message forces it to finalize and build on top. (This is the WHY behind v2's per-step "write your decisions" exits — not ceremony.)
- ★ **F2 — Passive consumption over active construction** — pre-baking content to fill/follow is weaker than making the AI construct the artifact for its situation and output it.
- ★ **F3 — Over-abstraction → hallucination** — removing concrete specifics severs the grasp on reality. Keep specifics **and** layer the decision model (blend, pairs with "thinks in extremes").
- ★ **Wrong-altitude specificity** — swings between verbose prose and cryptic shorthand (e.g. "decide/reconfirm/detail/split/merge"); target the altitude where a fresh reader grasps problem + concrete action.
- ★ **Reverses settled decisions (last-speaker bias)** — abandons an agreed decision when a new voice (reviewer/schema/doc) differs; hold it unless genuinely overridden, surface + reconcile conflicts.
- ★ **Binary subagent-output handling** — takes a return as truth or noise; instead decide → reconfirm gaps → split independent follow-ups to focused subagents → merge into one grounded result.
- ★ **Actor confusion** — orchestrator does the work (validates himself) instead of orchestrating it (spawn reviewer → validator; track status). Name the actor per action.
- ★ **Blind pass-through of request structure** — big request in → big dispatch out; decompose into smallest independent actions, recompose into right-sized tasks.
- Classic (already in `reduce-bootstrap.md` `<ai-issues>`): jumps to action; request size ≠ task size; coded ≠ done; self-review is blind (reviewer ≠ implementer); forgets channel boundaries (user can't see subagent/tool channel); over-engineers; drops clarifiers; injects reasoning/IDs into deliverables; overloaded past ~5 items.

## 11. Decisions locked (the ledger)

- **D1** Rebuild `orchestration` right; this file is the shared grounding. Decisions/issues also recorded in `reduce-bootstrap.md`.
- **D2** Orchestration = **entry-agnostic universal workflow competence**; a **continuous adaptive manager** (§4) grounded in our **many** workflows + `adhoc-flow` fallback; **understands WHY, does not re-derive**.
- **D3** **Method** (§5): keep v2 specifics + go active/proactive + externalize-to-think. Applies to everything, sizing included.
- **D4** Keep gd-work-on **tricks** + "in the dark" JIT — **without overfitting** its shape.
- **D5** Shape = **thin `SKILL.md` + JIT `assets/`**; strip authoring scaffolding.
- **D6** gd-work-on is a **decomposed monolith** (§3); guardrails/thinking/building-blocks are **siblings** orchestration points to, not owns.
- **D7** Persistence: this file (mental model) + `reduce-bootstrap.md` (`[decided]` markers, shrink per its maintenance principle; cuts → `bootstrap-removed.md`).

## Open — detail-level, before drafting the skill

1. **JIT asset inventory** — exact split of what leaves `SKILL.md` for `assets/` (tactics? delegation-template constructor? mini-loops? execution-integrity?).
2. **Delegation template** — confirm it stays as a *constructor scaffold the manager fills + outputs* (active), vs a leaner "define your own" prompt.
3. **Models table** — one canonical home (currently duplicated across `adhoc-flow`, `coding-flow`, gd-work-on) vs referenced per-workflow.
4. **Verify vs validate vs v-words** — standing terminology concern from `reduce-bootstrap.md`; may mislead the executor.
