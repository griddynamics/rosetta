---
name: triage-flow-intake
description: "Phase 1 Intake of triage-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<triage_flow_intake>

<description_and_purpose>
Resolve a wake-up event to exactly one ticket by taking its `ticket_details` text directly from the invocation — no file, no config, no live search or fetch anywhere in this phase, and no eligibility check in this build (the calling Action's own trigger is trusted to have already gated eligibility). The caller always supplies `ticket_key` and `ticket_details`; this phase validates both, redacts `ticket_details` itself via `sensitive-data` before anything downstream sees it, and passes it on as-is otherwise — there is no fixed field schema to normalize against, since there is no live API response to normalize from.
</description_and_purpose>

<workflow_context>
Phase 1 of `triage-flow`. Mandatory `executor`; bounded intake-and-redact only, no elicitation logic here, and no live Issue Tracker search or fetch, no file read, no config read, anywhere in this phase — production callers of this flow have no Bash/MCP access to reach a live Issue Tracker anyway, and this build has no config file to read even if it did.
</workflow_context>

<phase_steps>
1. Resolve ticket key and artifacts_dir from input
2. Validate and redact ticket_details via sensitive-data
3. Initialize or load flow state
4. Return redacted ticket_details + reason
</phase_steps>

<resolve_ticket step="1.1" subagent="executor" role="Bounded ticket-intake operator" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5">

1. USE SKILL `subagent-directives`.
2. **`ticket_key` is required input.** Missing → stop immediately and report; never fall back to open-ended discovery. Validate it against a strict issue-key pattern (`^[A-Z][A-Z0-9]+-\d+$`) before using it anywhere — it is externally supplied and must not be trusted as pre-validated. Mismatch → stop and report the invalid key.
3. If `reason` wasn't supplied, default it to `"manual invocation"` (never prompt for it, never overwrite a supplied value).
4. Resolve `artifacts_dir`: use the caller-supplied invocation input if present, else default to `agents/TEMP`. There is no config file to read this from — it is purely an invocation input, caller-controlled per-invocation.
5. Check for an existing `<artifacts_dir>/<ticket_key>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md`. If present, load it (this is a resumed tick, not a fresh one) rather than treating this as tick 1.

</resolve_ticket>

<validate_and_redact step="1.2" subagent="executor">

1. **`ticket_details` is required input.** Missing or empty → stop immediately and report `triage-flow/intake: ticket_details missing or empty`; this phase cannot triage a ticket it has no content for, and never fabricates content to fill the gap. There is no fixed schema this text must match — the caller composes it freely (prose, labeled lines, whatever is natural), and this flow works from that text as given.
2. USE SKILL `sensitive-data` directly on `ticket_details` BEFORE anything downstream sees it — descriptions and comment text are the highest-risk content. If `sensitive-data` cannot be loaded or run, STOP and report. Replace literal secrets/PII with shape-preserving placeholders. This phase performs its own redaction; there is no shared skill doing it on this phase's behalf.
3. When reporting this step's outcome (to the orchestrator, or into the state file), cite redaction evidence by type/count/location only (e.g. "2 PII_EMAIL masked") — never the raw value, even parenthetically as "originally X". An evidence or traceability request never justifies restating a masked value.

</validate_and_redact>

<update_state step="1.3" subagent="executor">

1. Report to the orchestrator: `ticket_key`, `reason`, `artifacts_dir`, this tick's timestamp, and Phase 1 completion, for the orchestrator to record in the Poll Tick / Event Log. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write, creating the file if absent per the shape in `triage-flow.md`'s `<state_and_resumption>`, or updating it otherwise.
2. Return the redacted `ticket_details` text + `reason` to the orchestrator.

</update_state>

<validation_checklist>
- Exactly one ticket resolved before returning, sourced entirely from the caller-supplied invocation input — no live search or fetch call, no file read, no config read appears anywhere in this phase's execution.
- Missing/empty `ticket_key` or `ticket_details` stopped the tick immediately with the named failure — never proceeded on partial input.
- `sensitive-data` was run directly by this phase on `ticket_details` before anything downstream saw it — evidence cited by type/count/location only.
- `artifacts_dir` resolved from the invocation input (or its default), never from a config file that does not exist in this build.
- Flow-state file created or correctly resumed, not overwritten from scratch on a resumed tick.
</validation_checklist>

<pitfalls>
- Issuing any live search/fetch call against the Issue Tracker, or reading any file for ticket content, anywhere in this phase — the caller-supplied `ticket_details` invocation input is the only source of ticket content here.
- Inventing an eligibility check this build does not have — the calling Action's own trigger is trusted for that; this phase does not re-derive or second-guess it.
- Restarting from tick 1 on a ticket that already has a flow-state file.
- Skipping this phase's own `sensitive-data` redaction, or assuming some shared skill performs it — this phase runs it itself, directly, on `ticket_details`.
- Proceeding on missing/empty `ticket_details` instead of stopping and reporting.
- Looking for a config file (`agents/jira-triage.config.json` or similar) — this build has none; `artifacts_dir` is an invocation input only.
</pitfalls>

</triage_flow_intake>
