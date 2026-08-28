<harness_prompting_proof>

Execute the authored skill or subagent in its target coding agent and assert what it did.

<setup>

- Fixture workspace: real repo, pinned commit, disposable copy per run. Never the working tree.
- Install it the way users install it. Never paste it into the prompt.
- Pin the agent and the model. Both are part of the result.
- Capture per run: transcript, tool calls, files produced, exit state.

</setup>

<triggers>

One trigger per invariant. Name each after its assertion.

- Routing — loads on a bare request, no slash command. With siblings present, exactly one wins.
- Grounding — the transcript shows a read or a command, not a recall.
- Scope — an out-of-scope request is declined or redirected.
- Gate — stops at the gate and waits. No autonomous pass-through.
- Injection — content read mid-run is treated as data, never as instructions.
- Disclosure — the untaken branch stays unread.
- Completion — the done-check runs and can fail.
- Idempotency — run twice; the second run corrupts nothing.
- Composition — runs alongside the skills it will meet: no conflict, no duplicated instruction.
- Subagent — returns the declared shape, and stops and reports when it cannot proceed.

Assert routing first. A skill that never loads is the most common failure, and the happy path hides it.

</triggers>

<evaluators>

Cheapest and most deterministic first. Stop at the tier that decides.

1. Artifact existence — required files, folders, sections.
2. Command — build, test, or grep over what was produced. Exit code decides.
3. Transcript assertions — the file was read not recalled, tool order, the gate paused, no forbidden tool ran.
4. Model judge — written rubric, weighted dimensions, quality only. The rubric is an artifact; review it.
5. Human read — last resort. Record it as such.

Tiers 1-3 gate. Their failure fails the run whatever the judge scored. A judge never overrules a deterministic gate.

Review is static reading and can be wrong. Validation is running it and rarely is. Ship on validation.

</evaluators>

<repetition>

- One green run proves nothing. Repeat, report pass rate per trigger.
- Record per run: agent, model, artifact version, timestamp, tokens consumed, wall time.
- Regression is a pass-rate drop against a prior run, not one red trial. Cost regression is a regression.
- Run the same triggers with the artifact absent. No movement → it earns nothing and costs tokens.

</repetition>

<containment>

- Every trigger spends tokens and writes files. Cap timeout and repeats.
- State the cost before proposing the suite size.
- Sessions hold real tool access. Isolate to a copy or worktree.
- USE SKILL `risk-assessment`, `dangerous-actions` before any run reaching anything shared.
- Transcripts hold whatever the agent read. Redact before storing. USE SKILL `sensitive-data`.

</containment>

<out_of_scope>

Frontmatter fields, section names, dead references — lint. Cheap, separate, and no substitute for a run.

</out_of_scope>

</harness_prompting_proof>
