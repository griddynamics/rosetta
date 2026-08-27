<harness_automations>

Work that happens without a human driving it. Prevention, or autonomous execution.
Resolve the substrate, design the state model, then build.
APPLY SKILL FILE `assets/automations-security.md` before any of it.

<purposes>

- Prevention — runs on a proposed change or action. Decides allow, flag, or block.
  - Never authors what it judges.
  - Reuses the project's existing skills; the automation supplies the trigger, not the method.
  - Blast radius is the false block. Fast and explainable beats thorough.
- Autonomous execution — advances a work item: triage, document, plan, implement small
  items, validate, reconcile, sync.
  - Moves state, and stops where a human must decide.
  - Blast radius is the wrong change landing. Narrow the write surface, not the ambition.

One automation serves one purpose. One that both judges and authors has no safe permission set.

</purposes>

<substrate>

Resolve before designing. Each fits a different shape of work.

- CI pipeline — the work is about the repository and rides its events and identity.
- Scheduled job — no event exists. Sweeps, reconciliation, drift detection on a clock.
- Workflow automation — the work spans systems the repository does not own.
- Workflow or process engine — the process outlives a job, needs durable state and
  explicit human tasks.
- Bot or webhook service — always on, reacts inside the conversation it watches.
- Hook or policy controller — prevention at a boundary, before anything reaches the server.

Choose on: where state lives · how long the work runs · whose identity it uses ·
what it must reach · who approves. Record the answer and why.

</substrate>

<state_model>

Substrate-neutral. The store is a choice: labels, board field, tracker field, case state,
execution record, a table, a file.

- Three states per automation: one it loads from, one it claims into, one it ends in.
- Terminal state is never the input state. Re-processing becomes impossible, not discouraged.
- The claim into the working state is the concurrency lock.
  - It is also the only visible signal that a run is in flight.
- No automation loads from a working state.
  - A crashed run parks there and waits for a human. Nothing loops.
- Every input state is one a human moves into deliberately. Moving there is the authorization.
- Every flow has at least one human task.
  - The agent may advance state to state. It never makes the authorizing move.
  - A flow whose only visible output is the end result has nothing to intervene in.
- Durable artifacts replace in place. Conversation appends.

</state_model>

<triggers>

- Trigger is a doorbell. Ignore the payload; load the whole state and take everything eligible.
  - A dropped event strands nothing. The next trigger of any kind drains the queue.
- Debounce before claiming. Edits arrive as a stream.
  - An agent started on a half-written item works from a draft. Cap the wait, then proceed loudly.
- Overlap → exit early. Never cancel-in-progress; it strands claimed work mid-flight.
- One control surface for scoping. A second bypasses the first and diverges from what people see.
- Unbounded triggers are unbounded spend. Gate eligibility explicitly.

</triggers>

<runtime>

- Hosted agent action — fastest to adopt; you inherit its defaults and its bugs.
- Cloud agent — work survives the job; the session boundary moves off the runner.
- Self-hosted — full control, and full responsibility for isolation.

Headless runtimes break interactive-agent assumptions. Verify empirically, never from docs:
- backgrounded work whose result arrives on a later turn is lost when there is no later turn
- waiting primitives may be silent no-ops
- tool allowlists are shell-tokenized; a pattern containing a space can allowlist nothing

A silently unallowlisted tool disables the automation without failing it.

</runtime>

<reuse>

- The automation supplies trigger, state, and permissions. Project skills supply the method.
- A capability that lives only in the automation is one the developer cannot run locally.
- Split a long procedure across runs at the points where a human decides.

</reuse>

<failure>

- The runtime's own success signal is not enough. It reports the process exited, not that
  work happened.
- Assert structurally on the trace, never by grepping text — the prompt is echoed inside it.
- Treat a no-op as failure wherever state guaranteed work existed. Allow it only for
  event-driven runs that may legitimately have nothing to say.
- Scrub every published transcript. It sits outside log masking and holds whatever the
  agent read.
- Guardrails must live outside the agent's write reach.
  - Branch protection, or the equivalent in the substrate, is the mitigation.
  - The prompt asking nicely is not.

</failure>

<proof>

- Run a fixture item through every state, including the human task.
- Prove the lock: start a second run against a claimed item; it must exit, not queue.
- Prove the crash path: kill a run mid-work; the item parks visibly and nothing picks it up.
- Prove the gate: the agent stops at the human task with a full permission set available.
- Prove the boundary: a crafted item carrying instructions produces a refusal, not execution.
- Prevention only: prove the block fires, and prove a legitimate change is not blocked.
- Grep the published transcript and every posted message for a live credential.
- Written but never triggered = not delivered.

</proof>

</harness_automations>
