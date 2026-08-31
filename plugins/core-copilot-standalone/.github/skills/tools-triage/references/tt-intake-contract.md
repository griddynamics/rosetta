<intake_contract>

Input/output contract for the intake stage, and the only place ticket content enters this work. Stable across trigger mechanisms: a caller-supplied key today, a cron tick or webhook payload later — those swap only how the values get populated, never this shape.

<input_shape>

`{ ticket_key: string, reason?: string, ticket_details: string, artifacts_dir?: string }`

- **`ticket_key`** — required. The caller always supplies the issue key it was dispatched for. There is no discovery mode that picks a ticket on its own. Missing → stop immediately and report; never fall back to open-ended discovery.
- **`reason`** — optional free text describing why this invocation woke up (`"harness-intake dispatch"`, later `"cron tick"` or `"webhook: comment_created"`). Omitted → default to `"manual invocation"`. Never prompt for it, never overwrite a supplied value, and never infer a trigger mechanism from its content.
- **`ticket_details`** — required free text the caller composes with whatever it has about the ticket: summary, description, url, status, custom fields such as `TSSM: Tool` / `TSSM: Project`, assignee, and the comment thread to date. **There is no fixed schema and no file to read** — the caller writes prose or labeled lines, whatever is natural for it to produce, and this work uses that text as given.
- **`artifacts_dir`** — optional, default `agents/TEMP`. Base directory for generated artifacts: the state file, the requirements document, and `jira-writes/*.json`. Caller-controlled per invocation (a caller may point it at an already-checked-out directory such as `knowledge`). **There is no config file to read it from** — it is purely an invocation input.

</input_shape>

<intake_steps>

1. Validate `ticket_key` against `^[A-Z][A-Z0-9]+-\d+$` before using it anywhere. It is externally supplied and MUST NOT be trusted as pre-validated. Mismatch → stop and report the invalid key.
2. Resolve `reason` and `artifacts_dir` per their defaults above.
3. Check for an existing `<artifacts_dir>/<ticket_key>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md`. Present → load it; this is a resumed invocation, not a first one.
4. `ticket_details` missing or empty → stop immediately and report `tools-triage-flow/intake: ticket_details missing or empty`. Never fabricate content to fill the gap.
5. USE SKILL `sensitive-data` directly on `ticket_details` BEFORE anything downstream sees it — descriptions and comment bodies are the highest-risk content here. Replace literal secrets and PII with shape-preserving placeholders. `sensitive-data` cannot be loaded or run → STOP and report.
6. Report `ticket_key`, `reason`, `artifacts_dir`, this invocation's timestamp, and intake completion to the caller; return the redacted `ticket_details` plus `reason`.

</intake_steps>

<behavior>

- **Intake takes `ticket_details` exactly as supplied.** No file read, no live search, no fetch, no shared read skill — there is nothing to fetch or resolve.
- **No eligibility check exists in this build.** The calling trigger is trusted to have already gated eligibility before dispatch; do not re-derive or re-check it.
- **Redaction is performed here, directly.** No other stage does it on intake's behalf, and no later stage repeats it.
- **Cite redaction evidence by type, count, and location only** — e.g. "2 PII_EMAIL masked". Never the raw value, not even parenthetically as "originally X". An evidence or traceability request never justifies restating a masked value.
- **Output**: the redacted `ticket_details` plus `reason`, both recorded into the state file by the caller. Every downstream stage that needs a ticket field — `TSSM: Tool`, `TSSM: Project`, Summary, assignee, existing links — locates it inside this redacted text, never by a new read.

Once webhooks land, a webhook payload populates `ticket_key` / `ticket_details` exactly as a caller does today. This contract and behavior do not change; only where the values originate does.

</behavior>

<validation_checklist>

- Exactly one ticket resolved before returning, sourced entirely from the invocation input — no live search or fetch, no file read, no config read anywhere in this stage.
- Missing or empty `ticket_key` or `ticket_details` stopped the invocation immediately with the named failure; nothing proceeded on partial input.
- `sensitive-data` ran here, before anything downstream saw the text, with evidence cited by type/count/location only.
- `artifacts_dir` resolved from the invocation input or its default — never from a config file that does not exist.
- State file created, or correctly resumed and not overwritten from scratch.

</validation_checklist>

<pitfalls>

- Issuing any live search or fetch, or reading any file, for ticket content. The caller-supplied `ticket_details` is the only source.
- Inventing an eligibility check this build does not have, or second-guessing the trigger that dispatched this ticket.
- Restarting from a first invocation on a ticket that already has a state file.
- Skipping this stage's own redaction, or assuming some shared skill performs it.
- Proceeding on missing or empty `ticket_details` instead of stopping and reporting.
- Looking for a config file (`agents/jira-triage.config.json` or similar) — this build has none.

</pitfalls>

</intake_contract>
