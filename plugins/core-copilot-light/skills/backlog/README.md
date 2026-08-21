# backlog
Two-mode backlog skill: decide whether an existing story is honestly ready for development, and break approved work into a human WBS.

## Why it exists
Left to plain judgment, an agent handed a story either declares it fine and starts coding, or declares it blocked and stops. Both are wrong. This skill forces a code-grounded readiness verdict on two independent axes, and makes an unready story *partially actionable* instead of blocked. The failure modes it targets are named in the technical-analysis prompt: nobody should discover mid-sprint that an external contract was never read, a package was never used here, or a field does not exist.

## When to engage
- Actor: orchestrator or top agent. Story level, one context. Subagents only when a story is too big to fit, or for focused concerns; write-back never.
- `story-validator` — a story, ticket, or epic exists and readiness is unclear. Run it repeatedly, well before implementation, until nothing is left open.
- `work-breakdown` — readiness-cleared work needs a human WBS. Consumes mode-1 output: confirmed answers, `BA-nn` / `TA-nn` findings, verbatim contracts.
- Prereqs: Rosetta prep steps complete, `load-project-context` executed. `story-validator` additionally needs a readable Issue Tracker integration; write-back needs write access or it degrades to ready-to-paste text.
- Not for: authoring requirements from scratch (`requirements-authoring`), AI session graphs (`planning`), implementation (`coding`).

## How it works
`SKILL.md` is a router and holds nothing but routing, orchestration, and the cross-mode grounding/audience rules. All method lives in `assets/`:

| Load | Purpose |
|---|---|
| `assets/story-validator.md` | mode-1 method: 8 steps, delta handling, verdict rules, toolbox, report contract |
| `assets/story-validator-business-analysis.md` | step 2 dispatch prompt |
| `assets/story-validator-technical-analysis.md` | step 4 dispatch prompt |
| `assets/story-validator-backlog-writeback.md` | step 8 write-back method + tracker write binding; applied in the orchestrator's context |
| `assets/work-breakdown.md` | mode-2 method: mandatory WBS, step shape, estimates, handoff from validation |
| `assets/work-breakdown-templates.md` | LARGE only: EARS FR + risk-register templates |

Mode-1 runs repeatedly on the same story over weeks: each run classifies prior `Q-nn` questions answered / open / void, works only the delta, promotes settled facts onto the story, and posts what is still open as comments.

Mode-1 flow: intake via `data-collection` (read-only) → delta against prior runs → business analysis → user Q&A → technical analysis → parallel focused concerns → user Q&A → persist report → gated write-back. The two analysis prompts return XML, so findings carry stable `BA-nn` / `TA-nn` ids the write-back references.

## Mental hooks & unexpected rules
- `"Readiness is a claim about information, not about effort"` — the verdict comes from the enough-information test, never from how polished the story reads.
- `"Two verdicts, independent, never merged"` — technical feasibility can be sound while business intent is ambiguous. Neither axis colours the other.
- `"Blocking is the last resort"` — the toolbox exists so the answer is a split, a spike, or a labelled assumption plus follow-up, not a refusal.
- `"Each run leaves the story closer to buildable than it was"` — comments are the durable question channel, and `Q-nn` ids stay stable across runs so a stakeholder's answer remains matchable.
- `"A step that is both wide and deep is not a step"` — the WBS sizes work by shape because the people doing it work with AI agents: wide-shallow is sized by surface, deep-narrow by judgement.
- The WBS names no person and no agent, only the skills a step needs.
- `"Ungrounded output is worse than no output"` — no citation means it is not a finding; it becomes an unknown.
- `"Verbatim means copied. A paraphrased contract is a defect."` — paraphrasing a field list is precisely what stalls implementation later.
- `"Enumerate options; never choose one"` — the technical pass reasons from the implementer's seat but hands the decision to them.
- `"You make sure they never have to ask what"` — tasks carry contracts, paths, and precedents; they carry no chosen approach.
- `"Delete is not available"` — the write binding has no delete op by design; irreversible removal of other people's history is proposed, never performed.
- Concerns are split so they fail independently: one unresolved external dependency must not drag every other concern to not-ready.

## Invariants — do not change
- `name: backlog` equals the folder name and the entry in [docs/definitions/skills.md](../../../../../docs/definitions/skills.md).
- `description` drives auto-activation and is budgeted at roughly 25 tokens. It must keep naming story readiness, sprint intake, and WBS.
- The four verdict labels are external contract, written into a live tracker: `ready-for-development`, `not-ready-for-development`, `tech-ready`, `not-tech-ready`. Renaming them breaks every saved filter and board query using them.
- `Q-nn` question ids and the `## Established technical facts` story block are cross-run contract: ids must stay stable so an answer still matches, and the block is the only place technical content may enter a story body.
- The analysis prompts run in the mode's own context by default; the `dispatch` names exist only for the too-big-to-fit case. A subagent reaches one by using this skill with a `dispatch` name, never by an `APPLY SKILL FILE` written into a dispatch line: `SKILL FILE` resolves against the *current* skill, and a freshly spawned subagent has none. The `<dispatch>` branch in `SKILL.md` is what anchors `assets/` in the subagent's context, and it must stay ahead of `<core_concepts>` — a subagent never runs the Rosetta prep steps, so it must reach the branch before it reaches that gate. The two names `business-analysis` and `technical-analysis` are load-bearing and must match the asset filenames. Write-back is deliberately absent: it holds the user approval gate, which a subagent cannot, and by step 8 there is nothing left to discover — so it is applied in the orchestrator's context.
- Every analysis dispatch carries `subagent_required_model="Claude Opus 5, GPT-5.6 Sol, Gemini 3.7 Flash"`. The `engineer` agent defaults to a workhorse tier; without the override the deep passes run under-powered.
- The write binding names operations by capability, not by vendor tool name, and has no delete operation. Preview-then-approve, and per-operation confirmation for overwrites and closes, are the safety contract.
- `assets/work-breakdown-templates.md` stays behind the `applies="LARGE"` gate. Inlining it loads template text into every SMALL run.
- Assets carry no frontmatter; the publisher tags them by path and filename. The two analysis dispatches return the XML shapes defined in their `<output>` blocks. Element and attribute names are contract: the write-back prompt and the report reference findings by their `BA-nn` / `TA-nn` ids.
- Workspace locations are TERM references (FEATURE PLAN folder), never literal paths; `load-project-context` owns the actual paths.
- `skills/planning/SKILL.md` redirects human-work-breakdown requests here. That redirect is the compatibility path for existing `planning` callers.

## Editing guide
Safe: `role` wording, pitfall and best-practice bullets, report section ordering, toolbox phrasing. Handle with care: the verdict label strings, the XML output element names, the `Q-nn` id stability rule, the eight-step sequence and its two user gates, the 2-4 hour band and the no-merging-disjoint rule, the write binding's approval and no-delete rules, the task contract's forbidden list, the size-scaling table, and the `applies="LARGE"` gate. New capability → a new mode asset plus one row in the `SKILL.md` trigger table; never grow `SKILL.md` with method detail. New per-concern analysis depth → the relevant dispatch prompt, not the router. `plugins/**` is generated; edit here and regenerate. Referenced by `docs/definitions/skills.md` and `skills/planning/SKILL.md`.
