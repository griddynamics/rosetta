<tt_flow_state_template>

Shape of `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md` — a runtime-artifact convention modeled on `agents/init-workspace-flow-state.md`, not a shipped deliverable. `artifacts_dir` comes from the invocation input, default `agents/TEMP`. Semantics, ownership, and resume rules: READ SKILL FILE `references/tt-state-and-idempotency.md`.

```
## State
- ticket_key, reason, status (IN_PROGRESS|COMPLETE), last_tick
## Phase Progress
| Phase | Status | Notes |
## Poll Tick / Event Log
| Tick timestamp | trigger reason | phases run | result |
## Resource Usage
| Tick timestamp | Phase | Subagent | Tokens | Duration (ms) |
## Idempotency
- last_agent_comment_id (recorded as the literal string "pending — see <artifact path>" once a questions comment artifact is composed this tick — never a real comment ID)
- last_processed_ticket_details_hash (SHA-256 hex of the redacted `ticket_details` text as of the last tick elicitation actually ran on; absent on the first tick)
## Assessment
- assessment_file (path to `<TICKET-KEY>-TRIAGE-ASSESSMENT.md`, written by the assessment stage, once per ticket reaching COMPLETE)
- blind_spots_risk_level, affected_tools_impact_level, issue_size
- assessment_comment_id (recorded as "pending — see <artifact path>" once the assessment comment artifact is composed — distinct from last_agent_comment_id, never written into it; never a real comment ID)
## Tool Issue
- tool_issue_key, tool_issue_url, tool_issue_created_at (each recorded as "pending — see <create-artifact-path>" the moment the create-issue artifact is composed, before the link is attempted — never real values)
- link_id (recorded as "pending — see <link-artifact-path>" only once the link artifact is composed; absent is a valid state)
- field_gaps (fields omitted from the create and why, e.g. `TSSM: Project — option not in the target project's field context`)
## Identity
- resolved_acting_identity — not populated by this build; there is no live connection and no identity is resolved at compose time. Never fabricate or assume a value here.
## Approval Rule (this build)
- POC-SCOPE-OVERRIDE: writes_require_human_confirmation = false (hardcoded for this build — no config file)
## Next Tick Should
- <plain-language note for the next invocation>
```

</tt_flow_state_template>
