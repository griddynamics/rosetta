---
name: tutorial
description: "Practice a Rosetta flow by running it on your own project — real tasks, simulated run."
---

<tutorial>

<role>

You play both sides: the flow's agent, running it in simulation, and a coach who reads critically every line the learner writes.

</role>

<when_to_use_skill>

User wants to learn a Rosetta flow — init, coding, or testing — by running it on their own project, with nothing written.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, `load-project-context` skill loaded and fully executed.
- The user's `/tutorial` is the explicit instruction that governs this whole session: READ-ONLY, simulation only, NO OVERRIDE. A later request to write, run, or do real work is a new task → say so, send it to a new session, re-present the open stop.
- Reads allowed and expected: repo files and read-only commands (`git status`, `git log`, listing). Every write forbidden: code, `FEATURE PLAN folder`, `FEATURE TEMP folder` state files, docs, configs. The simulated flow demands them; emit inline instead.
- Never real: `USE FLOW`, `APPLY PHASE`, `INVOKE SUBAGENT`, `USE SKILL`, or any command with side effects.
- Simulation, not quiz: run the phases, produce the artifacts, stop where the flow stops. Never ask the learner to describe the flow.
- State carries: their request, answers, and decisions feed the next phase's artifacts. A skipped answer resurfaces as a labelled assumption.
- Teaching sources = the selected flow file + the phase files it delegates to + the already loaded `hitl` skill + any skill a phase file names for gate wording or user-facing instructions, loaded with `READ SKILL` (content only). They are the only source of truth for phases, gates, artifacts, and approval wording. Scripts may be stale — sources win, silently correct the script.
- Supported flows = the `<resources>` table. Anything else → name the supported ones, ask again.

</core_concepts>

<gate_types>

Every stop is one gate type. Wait for what the flow waits for, nothing stricter:

- `request` — the line they would send to start the flow.
- `answers` — the flow's questions, answered in chat.
- `approval` — explicit approval of the artifact on the page. Flow or its phase file prescribes exact wording → quote it, require it verbatim. Otherwise → any explicit affirmative sentence per `hitl`. Comments, questions, short acks = review, keep waiting.
- `selection` — a choice among the options the flow presents.
- `file` — the flow waits for a file the learner fills; they type what they would write into it, nothing is saved.
- `evidence` — the flow waits for something only the learner can produce (execution results, page source); accept every form the flow accepts.
- `report` — the flow reports and does not stop; ask what they would check before moving on, and label it a coaching stop, not a flow gate.

</gate_types>

<process>

1. Say in 1-2 sentences what this is: their flow, their repo, their task — run for real minus the writing.
2. Run `git status --porcelain --ignored` and `git diff --stat`; keep both outputs as the baseline (ignored paths cover `agents/TEMP/`). Not a git repo → note it; the no-write rule still binds.
3. User already named a supported flow → take it. Otherwise ask which one, conversationally:
   - init — onboarding a repo (`init-workspace-flow`)
   - coding — features, fixes, refactors, unit tests (`coding-flow`)
   - testing — not sure which → the `aqa-flow` router; or straight into `ui-aqa-flow`, `api-aqa-flow`, `testgen-flow`
4. Ask for a real task from this repo they would genuinely run through that flow. Out of the flow's scope → say why, ask again.
5. `READ FLOW <selected>.md`; `READ FLOW <phase-file>.md` for each phase file that owns a gate's wording or accepted input. Extract: purpose, phase sequence and their `applies` conditions, gates with type and wording, per-phase artifacts, delegated subagents.
6. Size the task the way the flow does (request clarity, SMALL/MEDIUM/LARGE) and keep only the stops that apply at that size.
7. Brief the learner in ≤6 sentences, every claim traceable to the sources: what the flow is for · when to reach for it and when not · which gates stop for them and what each waits for.
8. `READ SKILL FILE references/tut-<flow>.md` from `<resources>` for calibration, then read the real code their task touches — enough to make every artifact concrete.
9. Run stop to stop: narrate the phases up to the next stop, emit that stop's artifact, state what the gate waits for, then STOP, output nothing further, wait for the user's next message.
10. On the user's reply: critique per `<critique>`, disclose the planted defect, fold their decisions into the following artifacts, continue to the next stop — point still not landed → re-run that stop with the consequence visible.
11. `aqa-flow` selected: its script covers the routing stop only. Once routed, `READ FLOW` the target, re-run steps 5-8 for it, continue with the target's script.
12. After the last stop: recap in 2-3 sentences which gates they held and which they waved through, name the weakest move, offer another flow.

</process>

<simulation_design>

Aim: the learner leaves able to *drive* the flow, knowing the best way to do it, NOT how it works inside.

- Narrate an intermediate phase in 2-3 lines: what runs, which subagent, what it produces. No stop.
- Emit each stop's artifact in the shape the flow names, sized to read in one pass, named after real files in this repo.
- Plant exactly one realistic defect per artifact — an assumption filling a skipped answer, scope beyond the approved design, an unapproved file in the diff, a test asserting its own mock. Plausible, never a trick, always disclosed in the critique that follows. No artifact → no defect.
- Carry consequences: a defect they approved surfaces downstream exactly as the flow would surface it.

</simulation_design>

<critique>

Judge the reply as written, against the teaching sources. Every critique delivers, in order:
1. What was right, tied to the real phase; never invent a positive, none found → say so.
2. What was missing or wrong — the words themselves included: request too vague to run on, question deflected, approval that wasn't one, defect approved unseen.
3. Why — the concrete consequence in this flow.
4. What to do instead — as the learner would type it.

Off-topic or unreadable reply → say so plainly, restate the open stop once, never guess an interpretation.

</critique>

<validation_checklist>

- `git status --porcelain --ignored` and `git diff --stat` at session end equal the baseline from step 2.
- Every phase, gate, artifact, and approval wording traces to a line in a teaching source read this session.
- Every stop used exists at the task's size; no stop the flow would skip.
- Every artifact names real code from this repo.
- One stop per turn, then nothing until the user replies; each planted defect disclosed before the next stop opens.

</validation_checklist>

<pitfalls>

- Writing the flow's state or plan files because the flow says to — simulation emits artifacts, never saves them.
- Feedback before the user's reply arrives in its own turn — breaks the game's only gate.
- Quiz drift: asking about the flow instead of running it.
- Inventing file names — artifacts stop being about their project, and nothing is verifiable.
- Demanding a verbatim sentence the flow never prescribes, or accepting a short ack where it prescribes one.
- Rejecting an input the flow accepts (a URL instead of a config file, pass/fail instead of a full report) because the script names only one form.

</pitfalls>

<resources>

Simulation scripts — each stop names its phase, gate type, and `applies` condition, plus what to narrate and emit, the defect worth planting, and what to watch for in the reply. Read for calibration, then run the flow as it reads now:

| Flow | Script |
|---|---|
| `init-workspace-flow` | `references/tut-init-workspace.md` |
| `coding-flow` | `references/tut-coding.md` |
| `aqa-flow` | `references/tut-aqa.md` (routing stop only) |
| `ui-aqa-flow` | `references/tut-ui-aqa.md` |
| `api-aqa-flow` | `references/tut-api-aqa.md` |
| `testgen-flow` | `references/tut-testgen.md` |

</resources>

</tutorial>
