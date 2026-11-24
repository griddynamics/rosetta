<sim_script flow="testgen-flow">

<stop id="1" phase="project_config_loading" gate="request" applies="ALL" waits_on="the request they type">

Narrate: nothing yet — the session opens on their line.
Emit: nothing.
Stop: ask for the exact line they'd send. Accepted forms (`testgen-flow-project-config-loading.md` step 0.1): ticket only — key, full URL, or `Analyze requirements for PROJ-123`; ticket + Wiki page URLs; ticket + other documentation URLs listed as data sources.
Defect: none — their own words are the artifact under review here.

- Good: names a ticket key or URL the flow can parse, and `/testgen-flow` by name; adds Wiki or other doc links if they hold them (pasted links are carried into Phase 1 verbatim).
- Good: a bare key or a URL alone — the flow accepts it.
- Wrong: describes the feature in prose with no ticket key or URL — the key is REQUIRED; the flow stops and asks for it, and no requirements trace to a source.
- Wrong: pastes credentials or tokens with the links — `initial-data.md` and the config are tracked files; redaction at intake strips them, but the habit is the risk.
- Carry: the ticket key names the whole `plans/testgen-{TICKET-KEY}/` layout; pasted links seed Phase 1 collection.

</stop>

<stop id="2" phase="project_config_loading" gate="answers" applies="testgen-project-config.md missing or empty (step 0.3)" waits_on="their reply to the data-retrieval question: YES, or NO plus details">

Narrate: the `discoverer` creates the ticket output folder and state file, finds no per-ticket config, and reads `gain.json` if it exists to prefill Issue Tracker, Wiki and TMS. A missing `gain.json` never blocks this phase.
Emit: the data-retrieval question from `testgen-flow-project-config-loading.md` step 0.4 (default setup: ticket summary and description, provided Wiki documents, keyword search of the Wiki, combine all), naming the providers prefilled from `gain.json` or recognized from their URLs, with a request for YES or NO.
Stop: `YES`, or `NO` with details on data sources, retrieval method per source, and auth assumptions (MCP configured, token in env, per-call OAuth) — any mix of `gain.json`, URLs and typed answers works; explicit user input wins for this run. Incomplete answer → the flow re-prompts naming the missing fields, up to 2 times, then blocks.
Defect: prefill names a Wiki provider that does not match the host of a Wiki URL in their request; the question presents the prefill as settled.

- Good: confirms YES only after checking the named providers match what they use; otherwise says NO and names the right one.
- Good: states auth as scheme plus source (for example a token held in an env var), never the literal value.
- Good: adds extra doc links here if they forgot them in the request.
- Wrong: YES to a default that cannot run (no integration, no auth) — the flow re-prompts, and after 2 misses blocks Phase 0.
- Wrong: NO with no source, method or auth named — same re-prompt loop.
- Wrong: insists a `gain.json` must exist first — the flow works from the ticket, URLs and typed answers alike.
- Carry: the config decides which sources Phases 1 and 6 use; a Wiki out of scope means a ticket-only run (Wiki recorded as skipped, per `testgen-flow-data-collection.md`).

</stop>

<stop id="3" phase="question_generation" gate="file" applies="Phase 2 found at least one contradiction, gap or ambiguity (otherwise Phase 3 is skipped: `testgen-flow-question-generation.md` failure_handling)" waits_on="answers typed into questions.md, then explicit approval">

Narrate: Phase 1 pulls the ticket fields, comments and Wiki pages with child pages into `raw-data.md`; Phase 2, an `architect`, finds contradictions, gaps and ambiguities into `analysis.md`. Phases 0, 1 and 2 are intentional per-phase pauses — one line each asking to continue, no gate type. Phase 3 turns findings into `questions.md`.
Emit: `questions.md` as a short excerpt — a contradiction with quotes from ticket and Wiki and options a/b/c/d, a gap, an ambiguity, grouped P0 to P3, each with `[Leave blank for user]`, built from the real ticket and pages. Direct them to fill the file; a short chat summary is fine.
Stop: they type what they would write into each answer field. Chat replies do not replace the file; flow: ask the user to fill it in, not ask yourself. P0 needs a substantive answer — UNKNOWN is rejected for P0 unless the user authorizes a downgrade, recorded as `P0 → P1 (user-authorized downgrade)`; P1 needs an answer or `UNKNOWN — need to research with [stakeholder]`; P2 and P3 may stay blank. Then explicit approval: questions or suggestions are review, not approval, and this gate is never skipped, even on instruction. No exact sentence is prescribed (`hitl`: any explicit affirmative sentence).
Defect: a gap that blocks implementation filed as P2, so it may stay blank.

- Good: answers P0 with facts, takes the ones they don't own to PO, BA or developer, and marks P1 `UNKNOWN — need to research with [stakeholder]` rather than guessing.
- Good: spots the mis-prioritized question and asks for it to be raised, or answers it anyway.
- Good: adds extra constraints or edge cases under Additional Questions or Comments.
- Wrong: asks the agent to answer for them — the answers are theirs to give; guesses become requirements.
- Wrong: UNKNOWN on a P0 with "use a default" — rejected outright; Phase 3 stays open.
- Wrong: "answers ready" or "ok" as the whole approval — validation runs, but approval is still missing.
- Carry: `answers.md` outranks ticket and Wiki in Phase 4; every UNKNOWN or blank resurfaces as an assumption in requirements.

</stop>

<stop id="4" phase="requirements_document_generation" gate="approval" applies="ALL" waits_on="explicit confirmation of the requirements summary">

Narrate: an `architect` synthesizes `raw-data.md`, `analysis.md` and `answers.md` into `requirements.md` — user stories, FR, NFR, constraints, dependencies, assumptions, risks — with source priority answers, then ticket, then Wiki, then analysis.
Emit: a summary of `requirements.md` — counts, a few real FR/NFR entries with their sources, assumptions for unresolved items, risks for contradictions the answers did not settle.
Stop: explicit confirmation (`testgen-flow.md` Phase 4: present a summary and require explicit confirmation). No exact wording prescribed → any explicit affirmative sentence per `hitl`.
Defect: one requirement stated as fact whose only source is a question they marked UNKNOWN or left blank.

- Good: traces a few requirements to a ticket quote, Wiki quote or their answer; asks which source the suspicious one has.
- Good: demands the unresolved item be listed under Assumptions or Risks, not as a requirement.
- Wrong: confirms on counts alone — "enough stories and FRs" says nothing about whether they are right.
- Wrong: "looks fine" — review, not confirmation; the flow keeps waiting.
- Carry: Phase 5 tests exactly what `requirements.md` says; a wrong requirement becomes a test case that passes against the wrong behavior.

</stop>

<stop id="5" phase="test_case_generation" gate="approval" applies="ALL" waits_on="the confirmation token for test-scenarios.md">

Narrate: an `engineer` designs scenarios from `requirements.md` into `test-scenarios.md` — positive, negative, boundary, with NFR cases — merges redundant cases into parameterized ones, and writes a coverage matrix. Default output stays under `plans/testgen-{TICKET-KEY}/`.
Emit: the Executive Summary of `test-scenarios.md` (total, merged count, priority breakdown, coverage matrix) plus two or three full TC entries named after the real feature.
Stop: the flow asks "Please review `test-scenarios.md`." and requires the exact token `yes`, `approved` or `proceed` (`testgen-flow-test-case-generation.md` step 5.9). Comments and questions are review.
Defect: one parameterized case merged from rows that need different expected results — coverage reads complete while a requirement's variant is gone.

- Good: reads past the counts to the coverage matrix and checks that each requirement has a case, including the NFRs.
- Good: questions an over-merged case and asks for it to be split.
- Good: sends one of the accepted tokens when satisfied.
- Wrong: types an approving sentence of their own — correct under `hitl`, but this phase prescribes the token, so the flow keeps waiting.
- Wrong: approves on the case count — the flow's real risk is merging cases too aggressively and losing coverage.
- Carry: Phase 6 pushes this approved set; a defect approved here is exported to the TMS.

</stop>

<stop id="6" phase="test_case_export" gate="answers" applies="the user triggers Phase 6; they may choose not to — it stays a fully-specified phase" waits_on="the target location in the TMS">

Narrate: an `engineer` resolves the TMS provider from the config, `gain.json`, their input or a recognizable TMS URL, and checks the connection with a retry. If it still fails, the flow offers manual copy, CSV or defer, and writes `export-report.md` on every path.
Emit: the request for a target location (section, folder or suite) from `testgen-flow-test-case-export.md` step 6.3, with the TMS found. Container creation may need to be done by hand in the TMS UI.
Stop: the location in any format they have; the flow parses flexible forms. They may instead decline the export.
Defect: none — the artifact here is their location.

- Good: names the exact section or suite, or creates the container first when the TMS integration cannot.
- Good: declines and stops here if not ready — the phase is user-triggered.
- Wrong: points at a location that does not exist — the export fails and the receipt records failed cases.
- Carry: the location goes into the plan shown at the next stop.

</stop>

<stop id="7" phase="test_case_export" gate="approval" applies="Phase 6 triggered and a target location given" waits_on="the exact token yes or proceed">

Narrate: the cases are parsed from `test-scenarios.md` and mapped per the resolved TMS binding, then the destructive-write gate (step 6.4b) runs before any write: a dedup pre-scan of the target.
Emit: the plan — target location plus TMS project URL, count of cases to create, likely duplicates found; if the binding cannot list cases, the line `pre-scan unavailable for this vendor binding — proceeding with manual duplicate risk acknowledged`.
Stop: exactly `yes` or `proceed` (case-insensitive), from `testgen-flow-test-case-export.md` step 6.4b; nothing else extends it, and it is never skipped on instruction. Comments, questions and suggestions are review.
Defect: the case count in the plan is not the count in the approved `test-scenarios.md`.

- Good: compares the plan's count and location with what they approved, and asks about the mismatch.
- Good: asks about duplicates before agreeing — re-running an export can create duplicates.
- Good: types `yes` or `proceed` only when the plan is right.
- Wrong: "go ahead" or "ok" — not on the closed list; no TMS write happens.
- Wrong: tells the agent to skip the gate to save time — refused with citation of the rule.
- Carry: after export the flow writes `export-report.md` (IDs, per-case status, timestamp); under 80% exported it halts for retry, accept-partial or abort. Recap on this one — gates held, gates waved through, weakest move.

</stop>

</sim_script>
