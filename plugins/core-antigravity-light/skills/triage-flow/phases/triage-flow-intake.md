<triage_flow_intake>

<description_and_purpose>
Resolve a wake-up event to exactly one ticket and fetch its normalized content. The caller always supplies `ticket_key`; this phase validates it, scopes the configured `jql` to it as an eligibility/authorization check, and fetches the ticket's content.
</description_and_purpose>

<workflow_context>
Phase 1 of `triage-flow`. Mandatory `executor`; bounded fetch/eligibility only, no elicitation logic here.
</workflow_context>

<phase_steps>
1. Resolve ticket key from input or JQL
2. Fetch ticket via data-collection
3. Initialize or load flow state
4. Return normalized snapshot + reason
</phase_steps>

<resolve_ticket step="1.1" subagent="executor" role="Bounded ticket-intake and JQL-eligibility operator" subagent_required_model="inherit">

1. USE SKILL `subagent-directives`.
2. **`ticket_key` is required input.** Missing → stop immediately and report; never fall back to open-ended discovery. Validate it against a strict issue-key pattern (`^[A-Z][A-Z0-9]+-\d+$`) before using it anywhere — it is externally supplied and must not be trusted as pre-validated. Mismatch → stop and report the invalid key; do not attempt to interpolate it into the jql.
3. Read `jql` from `agents/jira-triage.config.json` and append a key filter scoped to the validated `ticket_key` (e.g. `AND key = "<ticket_key>"`), then run the resulting query via the configured Issue Tracker's search capability — this turns `jql`'s existing status/assignee/project clauses into a pure eligibility/authorization check against that one ticket, not a discovery mechanism. If `reason` wasn't supplied, default it to `"manual invocation"` (never prompt for it, never overwrite a supplied value).
4. Exactly one match → proceed with that ticket. **Zero matches → stop immediately, report that `<ticket_key>` does not match the configured jql's other clauses (status/assignee/project mismatch — distinguish this from a misconfigured jql if the mismatch looks structural), and end the tick there.** Multiple matches → stop and report all matching keys; never pick automatically (defensive guard — should not occur when filtering by key).
5. **This step runs the scoped `jql` exactly once and acts only on its result.** It is not a diagnostic tool: on zero matches, do NOT narrow, broaden, or vary the query (dropping clauses, trying other statuses, querying the project alone, etc.) to investigate why nothing matched, and do NOT browse other tickets/statuses "just to check." If the `jql` itself looks misconfigured, say so in the stop-report as a suggestion — do not go verify that suspicion with more queries.
6. Check for an existing `<artifacts_dir>/<ticket_key>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md` (`artifacts_dir` from `agents/jira-triage.config.json`, default `agents/TEMP`). If present, load it (this is a resumed tick, not a fresh one) rather than treating this as tick 1.

</resolve_ticket>

<fetch_ticket step="1.2" subagent="executor">

1. USE SKILL `data-collection` (issue role) to fetch the ticket — description, status, all comments, up to the binding's cap.
2. Follow `issue-vendor-binding.md`'s failure paths verbatim on transport/not-found/auth errors; never emit a partial snapshot.
3. `data-collection`'s own step 4 (`<collection>`) always redacts via `sensitive-data` before returning its output — this phase does not run a separate screening step; the snapshot handed to phase 2 (`elicitation`) is already redacted.
4. When reporting this step's outcome (to the orchestrator, or into the state file), cite redaction evidence by type/count/location only (e.g. "2 PII_EMAIL masked in Assignee/Reporter") — never the raw value, even parenthetically as "originally X". An evidence or traceability request never justifies restating a masked value.

</fetch_ticket>

<update_state step="1.3" subagent="executor">

1. Report to the orchestrator: `ticket_key`, `reason`, this tick's timestamp, and Phase 1 completion, for the orchestrator to record in the Poll Tick / Event Log. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write, creating the file if absent per the shape in `triage-flow.md`'s `<state_and_resumption>`, or updating it otherwise.
2. Return the normalized issue snapshot + `reason` to the orchestrator.

</update_state>

<validation_checklist>
- Exactly one ticket resolved before returning (never zero, never ambiguous multiple).
- `data-collection`'s failure paths were followed on any fetch error, not bypassed.
- Flow-state file created or correctly resumed, not overwritten from scratch on a resumed tick.
</validation_checklist>

<pitfalls>
- Interpolating `ticket_key` into the jql string before validating it against the strict issue-key pattern — it is externally supplied and untrusted.
- Falling back to an unscoped/open-ended `jql` evaluation when `ticket_key` is missing instead of stopping — there is no discovery mode in this build.
- Auto-picking one ticket among multiple JQL matches instead of stopping to report.
- **Treating a zero-match result as an invitation to investigate** — running follow-up queries (dropped clauses, alternate statuses, broader scope) instead of stopping immediately. This flow runs the scoped `jql`, it does not troubleshoot it.
- Restarting from tick 1 on a ticket that already has a flow-state file.
- Running sensitive-data screening here instead of relying on `data-collection`'s own redaction step.
</pitfalls>

</triage_flow_intake>
