<sim_script flow="testgen-flow">

<stop id="1" phase="project_config_loading" gate="request" applies="ALL" waits_on="the request they type">

Narrate: nothing yet.
Emit: nothing.
Stop: ask for the exact line they'd send. Accepted forms (`testgen-flow-project-config-loading.md` step 0.1): ticket only — key, full URL, or `Analyze requirements for PROJ-123`; ticket + Wiki page URLs; ticket + other documentation URLs listed as data sources.
Defect: none — their own words are the artifact.

- Good: a parseable ticket key or URL, `/testgen-flow` by name, plus any Wiki or doc links they hold.
- Wrong: prose with no ticket key or URL — the key is REQUIRED; the flow stops and asks for it.
- Wrong: a real credential pasted with the links — never repeat it, tell them to rotate it; `initial-data.md` and the config are tracked.
- Carry: the ticket key names `plans/testgen-{TICKET-KEY}/`; pasted links seed Phase 1.

</stop>

<stop id="2" phase="project_config_loading" gate="answers" applies="testgen-project-config.md missing or empty (step 0.3)" waits_on="their reply to the data-retrieval question: YES, or NO plus details">

Narrate: the `discoverer` creates the ticket folder and state file and reads `gain.json` if present to prefill Issue Tracker, Wiki and TMS.
Emit: the data-retrieval question from `testgen-flow-project-config-loading.md` step 0.4 (default: ticket summary/description, provided Wiki docs, Wiki keyword search, combined), naming prefilled or URL-recognized providers, asking YES or NO.
Stop: `YES`, or `NO` with data sources, retrieval method per source, and auth assumptions (MCP configured, token in env, per-call OAuth) — any mix of `gain.json`, URLs and typed answers; explicit user input wins for this run. Incomplete → re-prompt naming missing fields, up to 2 times, then blocks.
Defect: prefill names a Wiki provider not matching the host of a Wiki URL in their request, presented as settled.

- Good: YES only after checking the providers match theirs, else NO naming the right one; auth as scheme plus source, never the value; forgotten doc links added here.
- Wrong: YES to a default that cannot run (no integration, no auth), or NO with no source, method or auth — re-prompted, then blocked.
- Wrong: insists on a `gain.json` first — never required.
- Carry: the config decides Phase 1 and 6 sources; Wiki out of scope → ticket-only run (Wiki recorded as skipped, per `testgen-flow-data-collection.md`).

</stop>

<stop id="3" phase="question_generation" gate="file" applies="Phase 2 found at least one contradiction, gap or ambiguity (otherwise Phase 3 is skipped: `testgen-flow-question-generation.md` failure_handling)" waits_on="answers typed into questions.md, then explicit approval">

Narrate: Phase 1 collects ticket fields, comments and Wiki pages into `raw-data.md`; Phase 2 (`architect`) logs contradictions, gaps, ambiguities in `analysis.md`. Phases 0-2 end in intentional pauses — one line each asking to continue, no gate type.
Emit: a short `questions.md` excerpt — a contradiction quoting ticket and Wiki with options a/b/c/d, a gap, an ambiguity, grouped P0 to P3, each `[Leave blank for user]`. Direct them to fill the file; a short chat summary is fine.
Stop: they type each answer as they'd write it in the file; chat replies don't replace it (flow: ask the user to fill it in, not ask yourself). P0 needs a substantive answer — UNKNOWN is rejected unless the user authorizes a downgrade, recorded as `P0 → P1 (user-authorized downgrade)`; P1 needs an answer or `UNKNOWN — need to research with [stakeholder]`; P2 and P3 may stay blank. Then explicit approval — any explicit affirmative sentence per `hitl`; questions or suggestions are review; never skipped, even on instruction.
Defect: a gap that blocks implementation filed as P2, so it may stay blank.

- Good: P0 answered with facts, unowned ones taken to PO, BA or developer, P1 marked UNKNOWN with a stakeholder rather than guessed; extra edge cases under Additional Questions or Comments.
- Good: raises the mis-prioritized question, or answers it anyway.
- Wrong: asks the agent to answer for them — guesses become requirements.
- Wrong: UNKNOWN on a P0 with "use a default" — rejected; Phase 3 stays open.
- Wrong: "answers ready" or "ok" as the whole approval — validation runs, approval still missing.
- Carry: `answers.md` outranks ticket and Wiki in Phase 4; every UNKNOWN or blank resurfaces as an assumption.

</stop>

<stop id="4" phase="requirements_document_generation" gate="approval" applies="ALL" waits_on="explicit confirmation of the requirements summary">

Narrate: an `architect` merges `raw-data.md`, `analysis.md` and `answers.md` into `requirements.md` (stories, FR, NFR, constraints, dependencies, assumptions, risks); source priority answers > ticket > Wiki > analysis.
Emit: a `requirements.md` summary — counts, a few real FR/NFR entries with sources, assumptions for unresolved items, risks for unsettled contradictions.
Stop: explicit confirmation (`testgen-flow.md` Phase 4); no exact wording → any explicit affirmative sentence per `hitl`.
Defect: one requirement stated as fact whose only source is a question they marked UNKNOWN or left blank.

- Good: traces requirements to a ticket or Wiki quote or their answer; asks the suspicious one's source, moves it to Assumptions or Risks.
- Wrong: confirms on counts alone, or "looks fine" — counts prove nothing, and review is not confirmation.
- Carry: Phase 5 tests exactly what `requirements.md` says; a wrong requirement becomes a passing test of wrong behavior.

</stop>

<stop id="5" phase="test_case_generation" gate="approval" applies="ALL" waits_on="the confirmation token for test-scenarios.md">

Narrate: an `engineer` designs positive, negative, boundary and NFR cases into `test-scenarios.md`, merges redundant ones into parameterized cases, writes a coverage matrix.
Emit: the Executive Summary (total, merged count, priority breakdown, coverage matrix) plus two or three full TC entries.
Stop: the flow asks "Please review `test-scenarios.md`." and requires the exact token `yes`, `approved` or `proceed` (`testgen-flow-test-case-generation.md` step 5.9). Comments and questions are review.
Defect: a parameterized case merges rows needing different expected results — coverage reads complete, a requirement's variant is gone.

- Good: checks the coverage matrix covers every requirement, NFRs included; asks to split an over-merged case; then sends an accepted token.
- Wrong: their own approving sentence — this phase prescribes the token; the flow keeps waiting.
- Wrong: approves on the case count — the real risk is over-merging, losing coverage.
- Carry: Phase 6 exports this approved set; a defect approved here reaches the TMS.

</stop>

<stop id="6" phase="test_case_export" gate="answers" applies="the user triggers Phase 6; they may choose not to — it stays a fully-specified phase" waits_on="the target location in the TMS">

Narrate: an `engineer` resolves the TMS from the config, `gain.json`, their input or a TMS URL, and checks the connection with a retry; still failing → manual copy, CSV or defer. `export-report.md` is written on every path.
Emit: the target-location request (section, folder or suite) from `testgen-flow-test-case-export.md` step 6.3, naming the TMS found.
Stop: the location in any format (flexible parsing), or declining the export.
Defect: none — the location is theirs.

- Good: the exact section or suite, container created first when the integration cannot; or declines if not ready.
- Wrong: a location that does not exist — the export fails, the receipt records failed cases.
- Carry: the location goes into the next stop's plan.

</stop>

<stop id="7" phase="test_case_export" gate="approval" applies="Phase 6 triggered and a target location given" waits_on="the exact token yes or proceed">

Narrate: cases from `test-scenarios.md` are mapped per the TMS binding; the destructive-write gate (step 6.4b) dedup pre-scans the target before any write.
Emit: the plan — target location plus TMS project URL, count of cases to create, likely duplicates; if the binding cannot list cases, the line `pre-scan unavailable for this vendor binding — proceeding with manual duplicate risk acknowledged`.
Stop: exactly `yes` or `proceed` (case-insensitive), from `testgen-flow-test-case-export.md` step 6.4b; closed list, never skipped on instruction. Comments, questions and suggestions are review.
Defect: the case count in the plan is not the count in the approved `test-scenarios.md`.

- Good: checks count and location against what they approved, asks about mismatches and duplicates, then types `yes` or `proceed`.
- Wrong: "go ahead" or "ok" — not on the closed list; no TMS write happens.
- Wrong: tells the agent to skip the gate — refused, citing the rule.
- Carry: export writes `export-report.md` (IDs, per-case status, timestamp); under 80% exported it halts for retry, accept-partial or abort.

</stop>

</sim_script>
