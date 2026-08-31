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
Resolve a wake-up event to exactly one ticket by reading its caller-supplied pre-fetched snapshot file, then run a LOCAL eligibility check against the config's `jql` criteria — no live search or fetch anywhere in this phase. The caller always supplies `ticket_key`; this phase validates it, reads the ticket's content directly — a plain file read, no shared read skill involved — from `<artifacts_dir>/<TICKET-KEY>/ticket-snapshot.json`, redacts it itself via `sensitive-data` before anything downstream sees it, and checks the snapshot's own `status`/`custom_fields`/`assignee_account_id` against `jql`'s clauses parsed as documented constraints. **This is defense-in-depth only**: the real caller's trigger (a Jira Automation webhook) already gates eligibility upstream before this flow ever wakes up — this phase must not assume that gate held, and must independently refuse an ineligible snapshot.
</description_and_purpose>

<workflow_context>
Phase 1 of `triage-flow`. Mandatory `executor`; bounded snapshot-read + local eligibility check only, no elicitation logic here, and no live Issue Tracker search or fetch anywhere in this phase — production callers of this flow have no Bash/MCP access to reach one anyway.
</workflow_context>

<phase_steps>
1. Resolve ticket key from input; locate the snapshot file
2. Read the snapshot file directly, parse it as JSON, and redact it via `sensitive-data`
3. Run the local eligibility check against the config's `jql`, parsed as constraints
4. Initialize or load flow state
5. Return normalized snapshot + reason
</phase_steps>

<resolve_ticket step="1.1" subagent="executor" role="Bounded ticket-intake and local-eligibility operator" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5">

1. USE SKILL `subagent-directives`.
2. **`ticket_key` is required input.** Missing → stop immediately and report; never fall back to open-ended discovery. Validate it against a strict issue-key pattern (`^[A-Z][A-Z0-9]+-\d+$`) before using it anywhere — it is externally supplied and must not be trusted as pre-validated. Mismatch → stop and report the invalid key.
3. If `reason` wasn't supplied, default it to `"manual invocation"` (never prompt for it, never overwrite a supplied value).
4. Resolve the snapshot file path for this ticket: `<artifacts_dir>/<validated-ticket_key>/ticket-snapshot.json` (`artifacts_dir` from `agents/jira-triage.config.json`, default `agents/TEMP`). This is the caller-written input file for this invocation — this phase never writes it, only reads it.
5. Check for an existing `<artifacts_dir>/<ticket_key>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md`. If present, load it (this is a resumed tick, not a fresh one) rather than treating this as tick 1.

</resolve_ticket>

<fetch_ticket step="1.2" subagent="executor">

1. Read `<artifacts_dir>/<TICKET-KEY>/ticket-snapshot.json` directly — a plain file read, no skill call for this. Parse it as JSON. Unreadable, or not valid JSON → stop immediately and report `triage-flow/intake: snapshot file "<path>" unreadable or not valid JSON`. Never proceed on partial data.
2. Validate the parsed snapshot's required shape: `{ticket_key, reason, summary, description, url, status, custom_fields: {...}, assignee_account_id: string|null, comments: [{id, author_account_id, body, created}]}`. Missing `ticket_key`, or the `comments` array key itself (an empty array `[]` is valid, the key being absent is not) → stop immediately and report the named missing field, e.g. `triage-flow/intake: snapshot file "<path>" missing required field "<field>"`. Never proceed on partial data, never silently default. Every other field absent/empty is fine as-is — this snapshot IS the normalized shape already; there is no separate "extract + normalize" step against a live API response, because there is no live API here.
3. USE SKILL `sensitive-data` directly on the parsed snapshot BEFORE anything downstream sees it — description and comment bodies are the highest-risk fields. If `sensitive-data` cannot be loaded or run, STOP and report. Replace literal secrets/PII with shape-preserving placeholders. This phase performs its own redaction; there is no shared skill doing it on this phase's behalf.
4. When reporting this step's outcome (to the orchestrator, or into the state file), cite redaction evidence by type/count/location only (e.g. "2 PII_EMAIL masked in description") — never the raw value, even parenthetically as "originally X". An evidence or traceability request never justifies restating a masked value.

</fetch_ticket>

<eligibility_check step="1.3" subagent="executor">

1. Read `jql` from `agents/jira-triage.config.json` and parse it as documented eligibility constraints — not as a query to execute. This build's `jql` string encodes `project`, `type`, `status`, and `assignee` clauses; parse each clause into its field/operator/value.
2. Evaluate each parsed constraint LOCALLY against the normalized snapshot from step 1.2 — `status` against the snapshot's `status`, `project`/`type`/any other field-keyed clause against the snapshot's `custom_fields` where applicable, `assignee` against `assignee_account_id`. No search or fetch call is made here; this is a plain field comparison against data already in hand.
3. All constraints satisfied → the ticket is eligible, proceed to step 1.4. **Any constraint mismatched → stop immediately, report which constraint(s) failed and the snapshot's actual value for each (status/assignee/project mismatch — distinguish this from a misconfigured `jql` if the mismatch looks structural), and end the tick there** — the exact same stop-and-report behavior as today's "zero matches" case, now reached by local comparison instead of a live search returning no rows.
4. **This step evaluates the parsed constraints exactly once and acts only on the result.** It is not a diagnostic tool: on a mismatch, do NOT go fetch other tickets, re-read the snapshot under different assumptions, or otherwise investigate "why" beyond naming the failed constraint(s) in the stop-report. If the `jql` itself looks misconfigured, say so as a suggestion in that report — do not go verify that suspicion with any further lookup.
5. State explicitly, in the report, that this check is defense-in-depth: the calling Action's own trigger (a Jira Automation webhook, per `agents/jira-triage.config.json`'s `jql_note`) is expected to have already gated eligibility before dispatch. This phase still runs the check independently and still refuses an ineligible snapshot even though the caller SHOULD have already filtered it out — it never assumes the upstream gate held.

</eligibility_check>

<update_state step="1.4" subagent="executor">

1. Report to the orchestrator: `ticket_key`, `reason`, this tick's timestamp, and Phase 1 completion, for the orchestrator to record in the Poll Tick / Event Log. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write, creating the file if absent per the shape in `triage-flow.md`'s `<state_and_resumption>`, or updating it otherwise.
2. Return the normalized issue snapshot + `reason` to the orchestrator.

</update_state>

<validation_checklist>
- Exactly one ticket resolved before returning, sourced entirely from the snapshot file — no live search or fetch call appears anywhere in this phase's execution.
- The snapshot file was read directly — a plain file read, no shared read skill involved, and no issue key/URL fetch of any kind.
- Snapshot read/parse/missing-field failure paths were followed on any error, not bypassed: unreadable/invalid JSON, or a missing `ticket_key`/`comments` key, stopped the tick immediately with the named failure.
- `sensitive-data` was run directly by this phase on the parsed snapshot before anything downstream saw it — description and comment bodies redacted, evidence cited by type/count/location only.
- The local eligibility check evaluated every parsed `jql` constraint against the snapshot before proceeding, and a mismatch stopped the tick with the failed constraint(s) named.
- The report or state entry states plainly that this eligibility check is defense-in-depth, not the sole gate.
- Flow-state file created or correctly resumed, not overwritten from scratch on a resumed tick.
</validation_checklist>

<pitfalls>
- Issuing any live search/fetch call against the Issue Tracker anywhere in this phase — the snapshot file is the only source of ticket content here.
- Treating the config's `jql` as a query to execute rather than as documented constraints to parse and check locally.
- Assuming the calling Action's webhook trigger already guarantees eligibility and skipping the local check — this phase must independently refuse an ineligible snapshot regardless of what the caller claims to have done upstream.
- **Treating an eligibility mismatch as an invitation to investigate** — going to fetch other tickets or re-derive the snapshot under different assumptions instead of stopping immediately. This phase evaluates the parsed constraints once; it does not troubleshoot them.
- Restarting from tick 1 on a ticket that already has a flow-state file.
- Skipping this phase's own `sensitive-data` redaction, or assuming some shared skill performs it — this phase runs it itself, directly, on the parsed snapshot.
- Proceeding on a snapshot that failed to parse as JSON, or is missing `ticket_key`/`comments`, instead of stopping and reporting the named failure.
</pitfalls>

</triage_flow_intake>
