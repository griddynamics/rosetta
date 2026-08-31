<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# S0 Invariant Inventory + S6 Verification Trace

One row per normative statement in the 7 source files (`triage-flow.md` + 6 `triage-flow-*.md`), per PLAN §S0. `landed` is filled by S6 by locating each statement in its destination file. **A row that cannot be located is a behavior change — fix it, never annotate it away.**

Destination keys: `WF` = `workflows/tools-triage-flow.md` · `SKILL` = `skills/tools-triage/SKILL.md` · `INTAKE`/`ELIC`/`WRITE`/`ASSESS`/`TOOLISSUE`/`STATE` = the six `references/tt-*.md` · `A-STATE`/`A-ASSESS`/`A-ARTIFACT` = the three `assets/tt-*`.

Sources are recoverable after S5's deletion via `git show HEAD:instructions/r3/core/workflows/<file>`.

</CRITICAL>

## `triage-flow.md` — prerequisites, policy, contracts

| id | statement | source section | dest | landed |
|---|---|---|---|---|
| W-01 | All Rosetta prep steps MUST be FULLY completed | prerequisites 1 | WF | located |
| W-02 | MUST USE SKILL `load-project-context`, `orchestration`, `hitl` | prerequisites 2 | WF | located |
| W-03 | No deployment config file — this flow has no external config to read | prerequisites 3 | WF + INTAKE | located |
| W-04 | `artifacts_dir` from caller invocation input, default `agents/TEMP`, caller-controlled per-invocation (e.g. `knowledge`) | prerequisites 3 | INTAKE | located |
| W-05 | Phase 6's target-project settings are fixed constants for this build, hardcoded, not read from anywhere | prerequisites 3 | TOOLISSUE | located |
| W-06 | Orchestrator model MUST be `sonnet`-tier — deliberate narrowing of `requirements-authoring-flow.md`'s broader Fable/Opus/GPT-5.5+ rule, matching `--model sonnet` unattended CI | prerequisites 4 | WF + SKILL | located |
| W-07 | Not `sonnet`-tier → STOP_AND_REPORT (no human present in unattended CI); never silently proceed or downgrade | prerequisites 4 | WF + SKILL | located |
| W-08 | MUST ALWAYS use todo tasks ledger; phases sequential per invocation; re-invocation resumes from state, does not unconditionally restart phase 1 | prerequisites 5 | WF | located |
| W-09 | State at `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md`; Requirements.md alongside in same ticket-scoped folder; keeps artifacts out of the target repo's real `docs/` tree; every phase updates state before the next starts; runtime convention, not a shipped template | prerequisites 6 | STATE | located |
| W-10 | Orchestrator owns phase transitions, dispatch, and the flow-state file | subagent_policy | WF | located |
| W-11 | No subagent writes the state file directly, regardless of any phase file's own wording; every report step hands values to the orchestrator, which performs the read-full-file-then-append write; this overrides contrary phrasing anywhere | subagent_policy | STATE | located |
| W-12 | Phase instructions are assigned-subagent-only; orchestrator MUST NOT load, read, or execute them directly | subagent_policy | WF | located |
| W-13 | `executor` is never a gateway for full agents | subagent_policy | WF | located |
| W-14 | Required subagent invocation unavailable → stop and report the unmet prerequisite | subagent_policy | WF | located |
| W-15 | After every `INVOKE SUBAGENT`, before dispatching the next phase, append one Resource Usage row: timestamp, phase, subagent, `subagent_tokens`/`duration_ms` verbatim — never estimated or omitted, even when skipped or errored (`n/a — phase skipped`) | subagent_policy | STATE | located |
| W-16 | Input shape `{ ticket_key: string, reason?: string, ticket_details: string, artifacts_dir?: string }`, stable across trigger stages | intake_contract | INTAKE | located |
| W-17 | `ticket_key` required; caller always supplies it; there is no discovery mode where this flow picks a ticket | intake_contract | INTAKE | located |
| W-18 | `reason` free text; caller omits → intake MUST default to `"manual invocation"`, never prompt | intake_contract | INTAKE | located |
| W-19 | Intake MUST NOT infer a trigger mechanism from `reason`'s content | intake_contract | INTAKE | located |
| W-20 | `ticket_details` required, free text, no fixed schema, no file read; flow works from the text as given | intake_contract | INTAKE | located |
| W-21 | Intake takes `ticket_details` exactly as supplied — no file read, no live search or fetch, no shared read skill | intake_contract | INTAKE | located |
| W-22 | Empty/missing `ticket_details` → stop and report | intake_contract | INTAKE | located |
| W-23 | No local eligibility check in this build — calling Action's trigger is trusted; flow does not re-derive or re-check it | intake_contract | INTAKE | located |
| W-24 | Output: `ticket_details` redacted by this phase via `sensitive-data` before it goes anywhere else; plus `reason`; both written into flow state | intake_contract | INTAKE | located |
| W-25 | Future webhook supplies `ticket_key`/`ticket_details` exactly as a caller does today — contract and behavior unchanged, only origin | intake_contract | INTAKE | located |
| W-26 | No live write, ever; every write composed to `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-<op>.json`, `op ∈ {add_comment, create_issue, link_issues}`; never transitions or reassigns | write_artifact_contract | WRITE | located |
| W-27 | `NNN` = next unused three-digit sequence, zero-padded, from `001`; list the directory, take the highest, use the next; never reuse or guess | write_artifact_contract | WRITE | located |
| W-28 | Every artifact contains exactly `op`, `target_issue_key`, `payload`, `composed_at` (ISO8601) | write_artifact_contract | WRITE + A-ARTIFACT | located |
| W-29 | Gate before compose, every time: `dangerous-actions` — blast radius, consider the opposite, safer alternatives; gate asks "safe to hand to a future executor", not "safe to make" | write_artifact_contract | WRITE | located |
| W-30 | POC-SCOPE-OVERRIDE: skips `dangerous-actions` step 5 and `hitl`'s always-approve rule for all three composes — unattended at compose time by design | write_artifact_contract | WRITE | located |
| W-31 | The override governs only whether an artifact gets composed; it says nothing about whether executing it later is safe or reversible | write_artifact_contract | WRITE | located |
| W-32 | To restore confirmation: remove the override paragraph and re-enable `dangerous-actions` step 5 — no config flag, the override is the prose | write_artifact_contract | WRITE | located |
| W-33 | `create_issue` is the exception the override does not touch — no delete; a wrongly-created issue keeps its key forever once executed | write_artifact_contract | WRITE | located |
| W-34 | Phase 6 MUST state which duplicate-prevention check it ran and what it found, at compose time, not deferrable; a compose without that evidence is refused | write_artifact_contract | WRITE + TOOLISSUE | located |
| W-35 | Gate cadence: once per composed artifact — create then link runs it twice, never a shared pass; link's pass bounded to "does this edge connect the two keys named, in the direction named"; outcomes are compose or stop-and-report, never a silent skip | write_artifact_contract | WRITE | located |
| W-36 | No identity resolution, ever; never fabricate, guess, or assume an identity in an artifact or in `## Identity` | write_artifact_contract | WRITE + STATE | located |
| W-37 | Report the artifact path, never a live result; orchestrator records `"pending — see <artifact path>"` | write_artifact_contract | WRITE + STATE | located |
| W-38 | Documented regression, not solved here: no live pre-validation of custom-field option values or link-type names; invalid values compose successfully; the execution step MUST re-validate before sending | write_artifact_contract | WRITE | located |

## `triage-flow.md` — phase blocks, idempotency, state, scope, checklist

| id | statement | source section | dest | landed |
|---|---|---|---|---|
| W-39 | Six phase blocks keep `subagent` / `role` / `subagent_required_model` / `must-be-subagent` token-for-token | phases 1-6 | WF | located |
| W-40 | Phase purpose / input / output / control lines per phase | phases 1-6 | WF | located |
| W-41 | Phase 2 control: skip entirely per idempotency when nothing new; proceed straight to phase 3 with current Requirements.md | phase 2 | WF + ELIC | located |
| W-42 | Phase 3 POC-SCOPE-OVERRIDE: Open Questions empty is sufficient to flip `<req>` to Approved — no rubric-pass requirement, no separate explicit-approval-sentence gate; the rubric still runs and is recorded, it no longer gates | phase 3 | WF + ELIC | located |
| W-43 | Phase 4 compose is the tick's terminal action — nothing runs after it | phase 4 | WF + WRITE | located |
| W-44 | Phase 5 reports the three blocks as-is; none gates a different action or branch; no risk-based branching in this build | phase 5 | WF + ASSESS | located |
| W-45 | No ticket reassignment, no status transition, ever | phase 5 | WF + ASSESS | located |
| W-46 | The HITL gate for this flow lives entirely in the downstream consumer of its artifacts (e.g. harness-intake's PR review), not in Jira ticket state | phase 5 | WF | located |
| W-47 | Phase 6 composes create then attempts link — two separate composes, never one combined operation; neither performs a live write | phase 6 | WF + TOOLISSUE | located |
| W-48 | Phase 6's incomplete report is state-bearing: orchestrator MUST append the pending `tool_issue_key` before ending the tick; dropping it strands a composed create artifact nothing in this build can recover | phase 6 | STATE + TOOLISSUE | located |
| W-49 | Flow status `COMPLETE` only once both `tool_issue_key` and `link_id` are recorded as pending sentinels | phase 6 | STATE | located |
| W-50 | Idempotency checked at phase 2 entry: SHA-256 hex of this tick's redacted `ticket_details` vs `last_processed_ticket_details_hash` | idempotency | STATE | located |
| W-51 | Equal and present → skip to phase 3, do NOT invoke `requirements-authoring` this tick | idempotency | STATE + ELIC | located |
| W-52 | Different or absent → run elicitation; after it runs, report this tick's hash for the orchestrator to store | idempotency | STATE + ELIC | located |
| W-53 | Deliberately coarser than a comment-ID comparison; whole-text comparison; identical re-send triggers no re-run; any real change does | idempotency | STATE | located |
| W-54 | Worst case is an unnecessary re-run on a no-op text change, never a missed genuine update; acceptable because this flow cannot execute a live write and observe its own post | idempotency | STATE | located |
| W-55 | Replaces the POC's author-based-detection bug fix; that failure mode does not apply — free text has no author concept at all | idempotency | STATE | located |
| W-56 | `last_processed_ticket_details_hash` absent before phase 2 has ever run is an EXPECTED, VALID state, not corruption | idempotency | STATE | located |
| W-57 | `last_agent_comment_id` is a separate field and never participates in the hash comparison | idempotency | STATE | located |
| W-58 | The 10 state sections and their fields, modeled on `agents/init-workspace-flow-state.md` | state_and_resumption | A-STATE | located |
| W-59 | The five ID/key/URL/link fields are recorded as the literal `"pending — see <artifact path>"` at tick-end, never a real value | state_and_resumption | STATE | located |
| W-60 | Each invocation re-reads the state file if it exists (same `ticket_key`) and resumes at the implied phase rather than restarting phase 1 | state_and_resumption | STATE | located |
| W-61 | `## Tool Issue` is the one validly half-written section; written twice by phase 6; key-present-with-link-absent is not corruption and MUST NOT be repaired by clearing | state_and_resumption | STATE | located |
| W-62 | Clearing it — or letting an incomplete phase-6 report through — causes a second create artifact and a second permanently undeletable issue | state_and_resumption | STATE | located |
| W-63 | Resume routing: `assessment_file` recorded + `tool_issue_key`/`link_id` missing → resume directly at phase 6; orchestrator skips phases 2-5 rather than relying on their own guards | state_and_resumption | STATE | located |
| W-64 | Rationale: phase 5 deliberately does not update the hash, so without this rule cosmetic caller drift could re-open elicitation on a finalized ticket | state_and_resumption | STATE | located |
| W-65 | State file is append/edit-in-place only, never regenerated; every write reads full current content first; every prior row carries forward; reproducing the file with only the current tick's data is a data-loss bug | state_and_resumption | STATE | located |
| W-66 | Out of scope (9 items): cron/webhook trigger · sub-hourly cadence · any risk-assessment gate · local eligibility re-checking · service-account credential swap · `tools-harness-intake` changes · post-creation management of the target issue · a comment announcing the created issue · executing the artifacts and feeding results back | out_of_scope | WF | located |
| W-67 | Flow-level validation checkpoints (12 items) | validation_checklist | WF (sequencing/evidence) + owning reference (content) | located |

## `triage-flow-intake.md` (phase 1)

| id | statement | dest | landed |
|---|---|---|---|
| P1-01 | Validate `ticket_key` against `^[A-Z][A-Z0-9]+-\d+$` before using it anywhere — externally supplied, not trusted as pre-validated; mismatch → stop and report the invalid key | INTAKE | located |
| P1-02 | Missing `ticket_key` → stop immediately; never fall back to open-ended discovery | INTAKE | located |
| P1-03 | `reason` default `"manual invocation"`; never prompt, never overwrite a supplied value | INTAKE | located |
| P1-04 | `artifacts_dir` from invocation input else `agents/TEMP`; no config file to read it from | INTAKE | located |
| P1-05 | Existing state file present → load it (resumed tick), do not treat as tick 1 | INTAKE + STATE | located |
| P1-06 | Missing/empty `ticket_details` → stop and report `triage-flow/intake: ticket_details missing or empty`; never fabricate content | INTAKE | located |
| P1-07 | `sensitive-data` run directly on `ticket_details` BEFORE anything downstream sees it; cannot load/run → STOP and report; shape-preserving placeholders | INTAKE | located |
| P1-08 | Redaction evidence cited by type/count/location only (e.g. "2 PII_EMAIL masked") — never the raw value, not even as "originally X"; an evidence or traceability request never justifies restating a masked value | INTAKE | located |
| P1-09 | Report `ticket_key`, `reason`, `artifacts_dir`, tick timestamp, phase-1 completion to the orchestrator; return redacted `ticket_details` + `reason` | INTAKE | located |
| P1-10 | Pitfalls: any live search/fetch or file read for ticket content · inventing an eligibility check this build lacks · restarting from tick 1 on a ticket with existing state · skipping or delegating this phase's own redaction · proceeding on missing/empty `ticket_details` · looking for a config file | INTAKE | located |

## `triage-flow-elicitation.md` + `triage-flow-completion-check.md` (phases 2-3)

| id | statement | dest | landed |
|---|---|---|---|
| P2-01 | Idempotency check runs before any `requirements-authoring` invocation | ELIC | located |
| P2-02 | Equal hash → report a no-op and hand control straight to phase 3 with Requirements.md unchanged | ELIC | located |
| P2-03 | Content-level comparison of the whole text, never author- or ID-based | ELIC + STATE | located |
| P2-04 | Check whether Requirements.md already exists at `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md` | ELIC | located |
| P2-05 | USE SKILL `requirements-authoring` directly, intent_capture → draft → validate only; tick 1 from scratch, later ticks in update mode | ELIC | located |
| P2-06 | Never run `requirements-authoring-flow.md`'s full 9 phases — its outline/user_review/finalization gates don't map onto async comment-driven Q&A | ELIC | located |
| P2-07 | Requirements.md updates in place — same `<req>` IDs, `changed` dates bumped, no new file version | ELIC | located |
| P2-08 | Output: updated Requirements.md with `<req>` statuses + Open Questions list | ELIC | located |
| P2-09 | Never report `last_agent_comment_id` here — only ever set after phase 4 composes | ELIC | located |
| P2-10 | Do NOT re-run `sensitive-data` in phase 2 — phase 1 already redacted; no duplicate screening | ELIC | located |
| P3-01 | Read Open Questions and each `<req>` status; non-empty → IN_PROGRESS, report the "Next Tick Should" note, route to phase 4, do not proceed | ELIC | located |
| P3-02 | Empty → POC-SCOPE-OVERRIDE flip both `<req>` units Draft → Approved; "Open Questions empty" alone is sufficient in place of `hitl`'s explicit affirmative sentence — a deliberate, flagged POC simplification, not a rediscovered Rosetta rule | ELIC | located |
| P3-03 | The rubric is not a gate in this build; it still runs inside the skill and stays recorded as reporting | ELIC | located |
| P3-04 | Route to phase 5 on the empty branch, nowhere else; phase 6 follows on the same tick | ELIC | located |
| P3-05 | Both `<req>` units carry the same status — never a mixed state | ELIC | located |
| P3-06 | Flip only after confirming Open Questions is empty on the current tick's data, not a stale cached count | ELIC | located |
| P3-07 | The `POC-SCOPE-OVERRIDE:` marker stays intact and legible for future removal; never silently treated as permanent production behavior | ELIC | located |

## `triage-flow-publish-questions.md` (phase 4)

| id | statement | dest | landed |
|---|---|---|---|
| P4-01 | Open Questions is non-empty by construction; this phase never re-checks emptiness itself | WRITE | located |
| P4-02 | List only questions still open this tick; never re-ask questions already resolved in a prior iteration | WRITE | located |
| P4-03 | `dangerous-actions` directly, immediately before composing, with the full framing; POC-SCOPE-OVERRIDE per the write contract | WRITE | located |
| P4-04 | `NNN` determination, directory creation, no reuse or guessing | WRITE | located |
| P4-05 | Compose exactly `{"op": "add_comment", "target_issue_key", "payload": {"body"}, "composed_at"}` to `<NNN>-add_comment.json`; capture the path | WRITE + A-ARTIFACT | located |
| P4-06 | `last_agent_comment_id` = `"pending — see <artifact path>"`, never a real, guessed, reused, or fabricated comment ID | WRITE + STATE | located |
| P4-07 | Never report or assume a `resolved_acting_identity` from this compose | WRITE | located |
| P4-08 | Compose is the tick's terminal action — no further phase runs afterward | WRITE | located |

## `triage-flow-assess.md` (phase 5)

| id | statement | dest | landed |
|---|---|---|---|
| P5-01 | Runs only immediately after phase 3's empty branch; never on an IN_PROGRESS tick; never re-run for a ticket already recording `assessment_file` | ASSESS | located |
| P5-02 | Locate `TSSM: Tool`/`TSSM: Project` within phase 1's redacted `ticket_details`; not stated clearly → gap, do not guess | ASSESS | located |
| P5-03 | The two fields name the tool and project the feature is built for/in — the anchor for the affected-tools reasoning, not incidental metadata | ASSESS | located |
| P5-04 | Three independently scannable blocks, in order: blind spots, potentially affected tools, issue size | ASSESS + A-ASSESS | located |
| P5-05 | Blind spots: bullet the specific gaps a planning/coding agent could hit; requirements are complete and business-confirmed but not planning-ready; do not over-dramatize — most tickets carry ordinary, easily-absorbed gaps | ASSESS | located |
| P5-06 | Overall Risk Level: `Critical` huge gaps/contradictions · `High` major gaps that could trouble planning or coding agents · `Medium` one or two non-minor gaps an agent with project + codebase access can still handle · `Low` only minor gaps, or none; state with a one-line justification | ASSESS | located |
| P5-07 | Affected tools: start from the `TSSM` target, reason from completed requirements, name other Grid Dynamics tools with plausible integration exposure, one line of reason each | ASSESS | located |
| P5-08 | Overall Impact Level: `Critical` huge impact on an existing integration point or an unpredictable new one · `High` high impact on an existing point, or a new point predictable but with major uncertainties · `Medium` some medium effect, or a minor new point — any nonzero risk lands here at minimum · `Low` no integration effect detected, reserved strictly for that case, never a catch-all for "didn't look" | ASSESS | located |
| P5-09 | Issue size: one t-shirt size `XL`/`L`/`M`/`S` with a 1-2 sentence justification grounded in the requirements' scope (unit count, dependency depth, new integration points) | ASSESS | located |
| P5-10 | Write the three blocks to `<ticket_key>-TRIAGE-ASSESSMENT.md` alongside Requirements.md, three clearly headed sections in the order above, each restating its rubric once at the top rather than re-deriving it per read | ASSESS + A-ASSESS | located |
| P5-11 | Comment body states the three levels/size plainly — no framing implying escalation, urgency, or a required next action tied to the levels found | ASSESS | located |
| P5-12 | State plainly that this is the flow's last write on the source ticket, with the artifacts' path for downstream review | ASSESS | located |
| P5-13 | Do not name or promise the target-project issue phase 6 creates — it does not exist yet, and citing a key that may never be created is worse than saying nothing | ASSESS | located |
| P5-14 | A thin result is still a written result — never an omitted section, even for "no gaps found" / "no integration effect" / a small size | ASSESS | located |
| P5-15 | `assessment_comment_id` = pending sentinel; distinct from `last_agent_comment_id`, never overwriting it; flow status stays IN_PROGRESS until phase 6 records both fields | ASSESS + STATE | located |
| P5-16 | Pitfalls: reintroducing a risk-based branch · defaulting to `Low` out of uncertainty (uncertainty is `Medium` or above) · reading `TSSM` fields as arbitrary metadata · composing before the assessment file is fully written · omitting a section instead of writing a thin one · reporting a real comment ID | ASSESS | located |

## `triage-flow-create-tool-issue.md` (phase 6)

| id | statement | dest | landed |
|---|---|---|---|
| P6-01 | Everything in the new issue is copied or lightly restated from phases 1-5's artifacts; this phase decides no content | TOOLISSUE | located |
| P6-02 | It is its own phase, not a step of phase 5, because it composes the flow's only irreversible write and needs its own idempotency check | TOOLISSUE | located |
| P6-03 | Resume cases: `tool_issue_key` absent → **A** (compose create, then attempt link) · present with `link_id` absent → **B** (skip create entirely, resume at the link attempt) · both present → **C** (no-op, read nothing else, compose nothing) | TOOLISSUE | located |
| P6-04 | Absent means missing or empty; a field carrying any value — including the pending sentinel — is trusted and never re-derived or re-verified, because recomposing risks a second permanent issue and verifying is not this phase's job | TOOLISSUE | located |
| P6-05 | Link probe (case A only): check phase 1's redacted `ticket_details` for existing links; no new read, no live connection | TOOLISSUE | located |
| P6-06 | Free text carries no guaranteed issue-links content, so the probe typically finds nothing — a known limitation of the current input, not a bug; requiring callers to always state existing links is out of scope | TOOLISSUE | located |
| P6-07 | Existing link of the configured type to an issue in the target project → adopt it: record key, URL, link ID, skip to the report step | TOOLISSUE | located |
| P6-08 | The probe is a backstop for a lost state file, not the primary check; it detects only a fully-completed, already-executed prior run | TOOLISSUE | located |
| P6-09 | Probe read fails → stop and report; never compose a create on an unverified probe. A failed probe is unknown, not clear; the next tick can retry, a duplicate create cannot be undone | TOOLISSUE | located |
| P6-10 | Description is exactly three parts: one or two plain-language sentences from Summary + `<req>` titles · a flat list of requirement statements, one line per unit, verbatim · one back-reference line `Source ticket: <ticket_key>` | TOOLISSUE | located |
| P6-11 | No new facts, no scope the requirements don't carry, no assessment levels, no acceptance criteria, no rationale, no per-unit commentary; a long statement is copied, not summarized | TOOLISSUE | located |
| P6-12 | The back-reference line is what a human uses to trace the pair if the link write never lands | TOOLISSUE | located |
| P6-13 | Carry the description as plain text, one item per line; never hand-author ADF or equivalent rich markup — format conversion belongs to the execution step | TOOLISSUE | located |
| P6-14 | A description that comes through empty or mangled is a formatting defect on an already-existing issue, undetectable at compose time; never compose a second create over it | TOOLISSUE | located |
| P6-15 | Target constants: `project_key: TOOL` · `issue_type: Story` · `carry_fields: TSSM: Tool, TSSM: Project` · `link_type: Action item` · `link_inward = new_issue` (renders "`<new TOOL ticket>` is action item from `<source ticket>`"); constants for this deployment, do not invent or vary | TOOLISSUE | located |
| P6-16 | Payload: Summary verbatim (missing/empty → stop and report, never synthesize a title) · `TSSM: Tool` cascading — carry parent and child when present, never invent a child, never drop one that exists · `TSSM: Project` as-is · Assignee exact account ID only (display name, masked value, and `None -- unassigned` all count as absent; never resolve a name to an ID, never fall back to the connected write identity) · Description from the description step | TOOLISSUE | located |
| P6-17 | Degradation rule: Summary missing → stop, compose nothing. Any other field missing → omit that one field, compose anyway, record the omission in `field_gaps`. Never substitute a nearby option value | TOOLISSUE | located |
| P6-18 | Reason, stated once: none of those fields is required by the target project, each is a one-click human fix, and blocking the flow's only durable deliverable on a metadata classification is worse than shipping with a named gap. Summary is the exception because it is the issue's identity and a mis-titled issue cannot be deleted | TOOLISSUE | located |
| P6-19 | `create_issue` gate: blast radius includes a brand-new cross-project issue that keeps its key forever; duplicate-prevention evidence (the case that fired + the probe result) is REQUIRED at compose time; refuse to compose without it | TOOLISSUE | located |
| P6-20 | Compose exactly `{"op": "create_issue", "target_issue_key": "<source key>", "payload": {project, issue_type, summary, description, custom_fields, assignee_account_id?}, "composed_at"}` to `<NNN>-create_issue.json` | TOOLISSUE + A-ARTIFACT | located |
| P6-21 | Report-on-receipt: the artifact path goes into the report ahead of anything else, even if the link step finds nothing, the subagent runs short of room, or anything else goes wrong. An unreported artifact path is a composed create nobody can find or resume from | TOOLISSUE | located |
| P6-22 | Link cannot be composed until a real target-project key is known; `inward_key` must be an exact key; no real key exists until a future execution step runs the create and the result reaches a later tick's `ticket_details`. In this build no feedback path is wired, so the check never finds one — expected, not an error | TOOLISSUE | located |
| P6-23 | Real key found → a SEPARATE `dangerous-actions` pass, never shared with the create's; then next `NNN` (the create already claimed one this tick, the link takes the next consecutive one) | TOOLISSUE | located |
| P6-24 | Compose exactly `{"op": "link_issues", "target_issue_key": "<source key>", "payload": {link_type_name, inward_key: <confirmed target key>, outward_key: <source key>}, "composed_at"}` in that order; never re-order to make a phrase scan better — direction gives the relationship its meaning | TOOLISSUE + A-ARTIFACT | located |
| P6-25 | Real key not found → stop this step, report the create artifact's path plus a note that the link is uncomposable pending a confirmed key; an expected resumable state, not a hard failure; the next tick re-enters case B without recomposing create | TOOLISSUE | located |
| P6-26 | Never answer an uncomposable link by composing a second create artifact | TOOLISSUE | located |
| P6-27 | A partial report is a valid report — the one report in this flow whose incomplete outcome carries state the orchestrator MUST persist | TOOLISSUE + STATE | located |
| P6-28 | Case C → report a no-op so the orchestrator logs the tick without rewriting `## Tool Issue` | TOOLISSUE | located |
| P6-29 | `COMPLETE` means both artifacts are composed and awaiting execution, never that Jira was actually updated | TOOLISSUE + STATE | located |
| P6-30 | The description's requirement lines match the finalized Requirements.md statements word for word — a reader can diff them | TOOLISSUE | located |
| P6-31 | Every omitted field is named in `field_gaps`; an omission with no gap entry is indistinguishable from a field nobody meant to set | TOOLISSUE | located |
| P6-32 | The reported or attempted link names both endpoints so the direction is checkable, not merely asserted by an artifact path | TOOLISSUE | located |
| P6-33 | Pitfalls: re-running the phase or recomposing create over an uncomposable link · recomposing because a sentinel "looks stale" · filling an unresolvable assignee with the connected write identity · writing acceptance criteria/rationale/risk levels into the description · commenting on either ticket · running on a tick where phase 5 did not run because the requirements "look done" · fabricating a target key to unblock the link · treating the missing live validation as closable by extra care · composing without duplicate-prevention evidence | TOOLISSUE | located |

## S6 verification result

- **Automated needle sweep**: 108 distinctive strings checked across the 11 destination files (`SKILL.md`, 6 references, 3 assets, the workflow). One miss on first run — W-47's "two separate composes, never one combined operation" was present in the workflow but not restated in `tt-tool-issue-binding.md`; fixed by adding it to that file's opening paragraph, then re-verified. All other rows located on the first pass.
- **`POC-SCOPE-OVERRIDE` accounting** (the one check SPECS §FR-4 stated as a count match, and the honest result differs): HEAD carried 14 occurrences across 12 lines in 5 files; the instruction files now carry 8 (plus 3 in `README.md`, a maintainer doc never loaded at runtime). **Both distinct overrides survive with full framing** — the completion rule substituting for `hitl`'s explicit approval sentence (`tt-elicitation-and-completion.md`, plus the workflow's phase-3 control line and the "marker remains intact and legible" checkpoint), and the compose gate skipping `dangerous-actions` step 5 (`tt-write-artifacts.md`'s `<gate>`, stated once as the contract of record, plus the workflow's phase-4 and phase-6 control lines), together with the state file's `writes_require_human_confirmation = false` record. The six dropped occurrences were per-phase restatements of the compose override in the four now-deleted phase files. This is a deliberate DRY consolidation, not a rule change: `tt-assessment-rubrics.md` and `tt-tool-issue-binding.md` each route their compose through `APPLY SKILL FILE references/tt-write-artifacts.md` (`APPLY` = load + fully execute), so the framing still reaches whoever composes. Recorded here rather than smoothed over, because the count check as written in SPECS fails.
- **Deliberate deviation from PLAN §S5 item 1**: the plan had each workflow phase block carry a `READ SKILL FILE` pointer to its reference. That violates the closed alias grammar — `READ|APPLY SKILL FILE` never carries a skill name, and only a skill's own files may use it; any other artifact expresses intent and lets the skill route (`references/pa-rosetta.md` rule 8, and the skill-folder isolation rule in `coding-agents-prompt-authoring`'s `<core_concepts>`). The workflow therefore names the skill and the topic per phase, and `SKILL.md`'s routing list dispatches to the right reference. Verified: zero `SKILL FILE`, `references/`, or `assets/` strings in `workflows/triage-flow.md`.
- **Boundary exception, kept deliberately**: `tt-intake-contract.md` contains the literal error string `triage-flow/intake: ticket_details missing or empty`. It names the flow, but as an externally-observable error identifier carried verbatim from the source — rewording it would be a behavior change, which this refactor forbids.
- **Registry gap found and closed**: `triage-flow` was never registered in `docs/definitions/workflows.md` (a pre-existing omission on this branch). Added, alongside `ticket-triage` in `docs/definitions/skills.md`.

## Unassigned / escalated
None. Every normative statement above has exactly one destination assigned by SPECS §FR-2.
