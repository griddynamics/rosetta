<harness_pipelines>

Agent running in CI on the project's own events. Guards on changes, automations on work items.
Design it, then build it. APPLY SKILL FILE `assets/pipelines-security.md` before any of it.

<purposes>

- Guard — reacts to a proposed change. Reads, reports, never authors the change it reviews.
  Reuses the project's existing skills; the pipeline supplies the trigger, not the method.
- Automation — advances a work item: triage, document, plan, implement small items, validate.
  Moves state, and stops where a human must decide.

One pipeline serves one purpose. A guard that also implements has no safe permission set.

</purposes>

<decide>

Every project answers these differently. Record each answer; none has a default.

- Status substrate — labels, board field, issue field, external tracker, build state.
- Which transitions belong to the human, and which the agent may make.
- Trigger — event, schedule, manual dispatch, comment command.
- Compute — hosted agent action, cloud agent, self-hosted runner.
- Eligibility — what makes an item in scope at all.
- Write surface per lane — what may be mutated while in this state.

</decide>

<lanes>

- Three lanes per pipeline: one it loads from, one it claims into, one it ends in.
- Terminal lane is never the input lane. Re-processing becomes impossible, not merely discouraged.
- The claim into the working lane is the concurrency lock.
  - It is also the only visible signal that a run is in flight.
- No pipeline loads from a working lane.
  - A crashed run parks there and waits for a human. Nothing loops.
- Every input lane is one a human moves into deliberately. Moving there is the authorization.
- Every flow has at least one lane that waits for a human.
  - The agent may advance lane to lane. It never makes the authorizing move.
  - A flow whose only visible output is the end result has no lane to intervene in.
- Artifacts go in the item description, replaced in place. Conversation goes in comments.

</lanes>

<triggers>

- Event is a doorbell. Ignore the payload; load the whole state and take everything eligible.
  - A dropped event strands nothing. The next one of any kind drains the queue.
- Debounce before claiming. Edits arrive as a stream.
  - An agent started on a half-written item works from a draft. Cap the wait, then proceed loudly.
- Overlap → exit early. Never cancel-in-progress; it strands claimed work mid-flight.
- One control surface for scoping. A second bypasses the first and diverges from what people see.
- Unbounded triggers are unbounded spend. Gate eligibility on membership, label, or board presence.

</triggers>

<compute>

- Hosted agent action — fastest to adopt; you inherit its defaults and its bugs.
- Cloud agent — work survives the job; the session boundary moves off the runner.
- Self-hosted runner — full control, and full responsibility for isolation.

Headless runners break interactive-agent assumptions. Verify empirically, never from the docs:
- backgrounded work whose result arrives on a later turn is lost when there is no later turn
- waiting primitives may be silent no-ops
- tool allowlists are shell-tokenized; a pattern containing a space can silently allowlist nothing

A silently unallowlisted tool disables the pipeline without failing it.

</compute>

<reuse>

- The pipeline supplies trigger, state, and permissions. Project skills supply the method.
- A capability that belongs in the pipeline alone is a capability the developer cannot run locally.
- Split a long procedure across runs at the lanes where a human decides.

</reuse>

<failure>

- The runner's own success signal is not enough. It reports the process exited, not that work happened.
- Assert structurally on the trace, never by grepping text — the prompt is echoed inside the trace.
- Treat a no-op as failure wherever state guaranteed work existed. Allow it only for event-driven runs.
- Scrub every published transcript. It sits outside log masking and holds whatever the agent read.
- Guardrails must live outside the agent's write reach.
  - Branch protection is the mitigation. The prompt asking nicely is not.

</failure>

<proof>

- Run it on a fixture item through every lane, including the one that waits.
- Prove the lock: start a second run against a claimed item; it must exit, not queue.
- Prove the crash path: kill a run mid-work; the item parks visibly and no pipeline picks it up.
- Prove the gate: the agent stops at the human lane with a full permission set available.
- Prove the boundary: a crafted item carrying instructions produces a refusal, not an execution.
- Grep the published transcript and every comment for a live credential.
- Written but never triggered = not delivered.

</proof>

</harness_pipelines>
