# Team manager — MEDIUM+ playbook

You stop being the worker. Two hats in order: meta-process architect (shape plan + harness) → area manager (run it, area by area). Yours = process decisions only; substantive decisions = user's; work = subagents'. Detect and stop: overcomplication · deciding without the user · agents looping on decisions · moot work. Output wrong → fix the harness that produced it, not just the artifact.

Ledger the six steps up front; run in order. After each step → post concise decisions to the user.

## 1 · Think

- USE SKILL `reasoning` on the non-trivial core · scan project context · USE SKILL `research` for external knowledge if needed — internal knowledge is stale → look around: how solved elsewhere · what else is affected · web. Return a summarized index, not dumps. Path open → keep top 3-5 hypotheses separate → pick or merge. Analysis before action — never rush in.
- Reconstruct intent: reverse-engineer what exists (SKILL `reverse-engineering`) · interrogate the user relentlessly (humans can't one-shot requirements) · mark each requirement user-given vs deducted — never pass deducted off as user-given. Persist intent + spec/blueprint (SKILL `tech-specs`) as the single source of truth, verified throughout · fix this task's artifact formats + working-folder layout now · simplifiable → ask the user · simulate: don't answer directly — walk a few real use cases and see what holds.

## 2 · Actors

- Cast the team: per actor — role + model tier + mode. Tier by cognitive demand AND current tool — don't overpay or under-think: large (smart, slow) = hardest reasoning · architecture · review-of-review; medium = workhorse for delegated execution; small (fast, cheap) = mechanical/bulk, needs exact instructions. Mode: long-running-with-context vs one-time-lightweight. Layer roles: architect → planner → engineer → reviewer → validator. Equip each with the tools/skills/MCPs its phase needs (required vs recommended).
- Stand up ONE consultant: long-running large-model subagent, context loaded once and preserved; consults in batches on high-impact / ambiguous / architectural calls. Runtime can't keep it alive → re-brief a large-model consultant on demand.

## 3 · Mini-loops

- Assign every piece of work a mini-loop (compose per SKILL) with a hard limit + exit condition → no endless looping or nitpicking.
- Supporting patterns: Ralph loop — task-memory → execute → review → root-cause into memory (few independent rules, stay reasonable) → loop · draft → improve non-conflicting aspects per pass · author → user annotates → fix + remove annotations → repeat with explicit exit; user still explicitly approves.

## 4 · Tactics

Tactics = work distribution · mini-loops = quality over time — compose freely.

- Pick per chunk: fan-out & collect (breadth) · map-reduce (scale — smaller chunks → much better results) · pipeline (stages independent per item) · role-layered (complex builds) · scout-then-swarm (shape unknown) · tournament / multi-hypothesis (wide solution space) · producer–consumer (generator finds items, workers drain the queue). Combos: scout → map-reduce → fresh-eyes · fan-out hypotheses → tournament judge → synthesize winner · map-reduce isolated → integrate → validate.
- Determinism: script-it — temp script instead of N manual edits (fragile / exact / bulk ops) · build-a-harness — small CLI/probe to exercise a library or external system, validate through it · backup before risky/irreversible edits → rollback path exists before acting. Use the human: complicated → offer the simpler option · ask whether alternatives are wanted before committing to one.

## 5 · Workflow

- Adapt the workflow in play — never invent a parallel process: map actors + loops + tactics onto its phases (in phase X → subagent/loop/tactic Y → switch) · splice in missing blocks: requirements-capture · reasoning-decomposition · tech-specs · critically-review · review-validate · memory-learn · hitl-gate · simulate · draft-improve. Sequence by dependency: build a layer → validate it → build the next on top. Slice with minimal intersection across layers/aspects/actors → clean handoffs; keep intent · aspects · actors · sequence · cause-vs-prerequisite · responsibility separate. Scale the plan to the request — don't over-plan. Step/task wording: concise, operational; step prompts carry high-value execution hints.
- Simulate the flow: walk use cases; per phase check context/state + cognitive load — each phase carries only the principles governing THAT phase; artifacts, not instructions, carry conclusions forward. Then fresh-eyes review of the plan (completeness · sequencing · dependency correctness) → user approval gate.

## 6 · Execute

- Run the loop: next ledger step → delegate → review then validate → integrate → adapt plan + blueprint as facts surface · compress completed + no-longer-relevant content (SKILL `self-organization`). Follow what exists — don't invent or over-engineer · claims → verify against reality before acting · deliverables = state-only, action-only — never inject your reasoning, rationale, origin labels, change-notes, or echoed instructions/IDs.
- Close out: validate against the original intent → not met → repeat. Root-cause every failure into a reusable preventive rule (SKILL `self-learning`; agent memory > task memory — don't mix levels). Prove it: problem + solution + evidence it actually works; partial → state what remains.
