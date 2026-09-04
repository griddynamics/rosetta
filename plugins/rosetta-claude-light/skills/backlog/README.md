# backlog
Two-mode backlog skill: decide whether an existing story is honestly ready for development, and break approved work into a human WBS.

## Why it exists
Left to plain judgment, an agent handed a story either declares it fine and starts coding, or declares it blocked and stops. Both are wrong. This skill forces a code-grounded readiness verdict on two independent axes, and makes an unready story *partially actionable* instead of blocked. The failure modes it targets are named in the technical-analysis prompt: nobody should discover mid-sprint that an external contract was never read, a package was never used here, or a field does not exist.

## When to engage
- Actor: orchestrator or top agent. Story level, one context. `engineer` subagents only when a story is too big to fit; write-back never.
- `story-validator` — a story, ticket, or epic exists and readiness is unclear. Run it repeatedly, well before implementation, until nothing is left open.
- `work-breakdown` — readiness-cleared work needs a human WBS. Consumes mode-1 output: confirmed answers, `BA-nn` / `TA-nn` findings, verbatim contracts.
- Prereqs: Rosetta prep steps complete, `load-project-context` executed. `story-validator` additionally needs a readable Issue Tracker integration; write-back needs write access or it degrades to ready-to-paste text.
- Not for: authoring requirements from scratch (`requirements-authoring`), AI session graphs (`planning`), implementation (`coding`).

## How it works
`SKILL.md` is a router and holds nothing but routing, orchestration, and the cross-mode grounding/audience rules. All method lives in `assets/`:

| Load | Purpose |
|---|---|
| `assets/story-validator.md` | mode-1 method: 9 steps, delta handling, severity classes, verdict rules, toolbox, report contract |
| `assets/story-validator-business-analysis.md` | step 3 dispatch prompt |
| `assets/story-validator-technical-analysis.md` | step 5 dispatch prompt |
| `assets/story-validator-backlog-writeback.md` | step 9 write-back method + write scope, capture test, idempotency, tracker write binding; applied in the orchestrator's context |
| `assets/work-breakdown.md` | mode-2 method: mandatory WBS, step shape, estimates, handoff from validation |
| `assets/work-breakdown-templates.md` | LARGE only: EARS FR + risk-register templates |

Mode-1 runs repeatedly on the same story over weeks: each run classifies prior `Q-nn` questions answered / open / void, works only the delta, promotes settled facts onto the story, and posts what is still open as comments.

Mode-1 flow: intake via `data-collection` (read-only) → delta against prior runs → business analysis → user Q&A → technical analysis → parallel focused concerns → severity classification → user Q&A → persist report → gated write-back. The two analysis prompts return XML, so findings carry stable `BA-nn` / `TA-nn` ids that the severity classes, the report, and the write-back all reference.

Severity classification lives in the orchestrator, not in a dispatch. The dispatches supply evidence and are forbidden from grading; deciding whether a useful slice can still start needs the whole finding set across both lenses, which only the orchestrator holds.

## Mental hooks & unexpected rules
- `"Readiness is a claim about information, not about effort"` — the verdict comes from the enough-information test, never from how polished the story reads.
- `"Two verdicts, independent, never merged"` — technical feasibility can be sound while business intent is ambiguous. Neither axis colours the other.
- `"Blocking is the last resort"` — the toolbox exists so the answer is a split, a spike, or a labelled assumption plus follow-up, not a refusal. The severity classes are the mechanism that makes this more than an intention: a gap confined to one separable part is a hold, not a blocker.
- `"A conditional verdict with no named slice is a blocked verdict written politely"` — `conditional` must name the startable scope and the held scope, or it is dishonest.
- `"Cannot tell a blocker from a hold → it is a blocker"` — and the finding states the evidence that would reclassify it. The unsafe direction is the one that lets work start on an invented contract.
- `"Capturing is not resolving"` — raising a task, a comment, or a follow-up never moves a verdict. Only resolving the underlying finding does. This is what stops a run from grading itself ready by writing things down.
- `"A finding does not earn an item by failing"` — the analysis comment is the default home. A small coherent story defaults to zero created items.
- `"Each run leaves the story closer to buildable than it was"` — comments are the durable question channel, and `Q-nn` ids stay stable across runs so a stakeholder's answer remains matchable.
- `"A step that is both wide and deep is not a step"` — the WBS sizes work by shape because the people doing it work with AI agents: wide-shallow is sized by surface, deep-narrow by judgement.
- The WBS names no person and no agent, only the skills a step needs.
- `"Ungrounded output is worse than no output"` — no citation means it is not a finding; it becomes an unknown.
- `"Verbatim means copied. A paraphrased contract is a defect."` — paraphrasing a field list is precisely what stalls implementation later.
- `"Enumerate options; never choose one"` — the technical pass reasons from the implementer's seat but hands the decision to them.
- `"You make sure they never have to ask what"` — tasks carry contracts, paths, and precedents; they carry no chosen approach.
- `"Delete is not available"` — the write binding has no delete op by design; irreversible removal of other people's history is proposed, never performed.
- Concerns are split so they fail independently: one unresolved external dependency must not drag every other concern to blocked.

## Invariants — do not change
- `name: backlog` equals the folder name and the entry in [docs/definitions/skills.md](../../../../../docs/definitions/skills.md).
- `description` drives auto-activation and is budgeted at roughly 25 tokens. It must keep naming story readiness, sprint intake, and WBS.
- The six verdict labels are one namespace with one grammar, `readiness-<axis>-<state>`: axis `business` | `technical`, state `ready` | `conditional` | `blocked`. They are written into a live tracker and drive board queries, so renaming them breaks every saved filter built on them. Four rules hold the scheme together and each is load-bearing: at most one label per axis prefix (which is what makes exclusion mechanical instead of hand-maintained); no axis label means never assessed, so absence stays distinguishable from negative; no negative label, ever; and no label for the overall grade — it is derived as the worse of the two axes, and a stored derivative drifts from its inputs on any partial write. Hyphen-lowercase is deliberate: it is the only form valid in every tracker Rosetta targets.
- `readiness-generated` marks every item the skill creates and is never removed. It plus the `BA-nn` / `TA-nn` concern key in the title is what makes a re-run idempotent. The write binding has no delete, so losing that marker produces permanent duplicates on a story groomed over weeks.
- The three severity classes — start blocker, completion hold, advisory — and their derivation rules are the mechanism behind partial actionability. The classification is not a summary of the findings; it is what the verdicts are computed from. Removing it turns the two verdicts back into unaided judgement.
- The `<capture>` restraint rules bound how much backlog one run may create: comment by default, combine on shared owner and resolution, zero items for a small coherent story, and explicit approval for a split above three items.
- `Q-nn` question ids, `BA-nn` / `TA-nn` finding ids, and the `## Established technical facts` story block are cross-run contract. Ids stay stable and are never reused: an answer must still match its question, and a finding id is the concern key the write-back matches a created item on — renumber one and a re-run attaches work to the wrong finding. The delta step carries surviving ids into both dispatches, and focused passes get assigned id ranges because they reuse the `technical-analysis` prompt and would otherwise collide. The block is the only place technical content may enter a story body.
- The analysis prompts run in the mode's own context by default; the `dispatch` names exist only for the too-big-to-fit case. A subagent reaches one by using this skill with a `dispatch` name, never by an `APPLY SKILL FILE` written into a dispatch line: `SKILL FILE` resolves against the *current* skill, and a freshly spawned subagent has none. The `<dispatch>` branch in `SKILL.md` is what anchors `assets/` in the subagent's context, and it must stay ahead of `<core_concepts>` — a subagent never runs the Rosetta prep steps, so it must reach the branch before it reaches that gate. The two names `business-analysis` and `technical-analysis` are load-bearing and must match the asset filenames. Write-back is deliberately absent: it holds the user approval gate, which a subagent cannot. A focused concern that must be delegated reuses `technical-analysis` scoped to one concern, so it still inherits `<grounding>`.
- The write binding names operations by capability, not by vendor tool name, and has no delete operation. Preview-then-approve, and per-operation confirmation for overwrites and closes, are the safety contract.
- `<write_scope>` bounds the blast radius: modify the validated item and what this run created, create linked follow-ups, touch nothing else. Anything needed on another item is a recommendation in the report addressed to its owner, never an operation.
- `assets/work-breakdown-templates.md` stays behind the `applies="LARGE"` gate. Inlining it loads template text into every SMALL run.
- Assets carry no frontmatter; the publisher tags them by path and filename. The two analysis dispatches return the XML shapes defined in their `<output>` blocks. Element and attribute names are contract: the write-back prompt and the report reference findings by their `BA-nn` / `TA-nn` ids.
- Workspace locations are TERM references (FEATURE PLAN folder), never literal paths; `load-project-context` owns the actual paths.
- `skills/planning/SKILL.md` routes human-work-breakdown requests here. That route is how existing `planning` callers reach this method.

## Editing guide
Safe: `role` wording, pitfall and best-practice bullets, report section ordering, toolbox phrasing. Handle with care: the verdict label strings and their four scheme rules, the three severity classes and the derivation table, the `readiness-generated` marker and the concern-key format, the `<capture>` thresholds, the `<write_scope>` fence, the XML output element names, the `Q-nn` id stability rule, the nine-step sequence and its two user gates, the 2-4 hour band and the no-merging-disjoint rule, the write binding's approval and no-delete rules, the task contract's forbidden list, the size-scaling table, and the `applies="LARGE"` gate. New capability → a new mode asset plus one row in the `SKILL.md` trigger table; never grow `SKILL.md` with method detail. New per-concern analysis depth → the relevant dispatch prompt, not the router. `plugins/**` is generated; edit here and regenerate. Referenced by `docs/definitions/skills.md` and `skills/planning/SKILL.md`.
