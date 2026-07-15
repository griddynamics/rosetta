---
name: subagent-directives
description: "Duties of a spawned subagent executing a delegated orchestrator task."
license: Apache-2.0
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<subagent_directives>

<process>

1. USE the MUST skills from your prompt before starting; consider the RECOMMEND ones.
2. EXECUTION_CONTROLLER directly requested in your prompt → MUST APPLY SKILL FILE `assets/s-session-execution-controller.md`.
3. Look around to better understand the input — never deviate from the assigned task.
4. Ambiguous instructions → STOP and ask orchestrator before executing.
5. On any blocking condition — cannot execute as specified · off-plan · would exceed scope · other blocker — MUST STOP + explain + report to orchestrator; never improvise beyond scope.
6. Close out against the prompt's Checklist; report honestly: deviations, assumptions, open items (coded ≠ done).
7. Return EXACTLY per Output specs — nothing missing, nothing extra.
8. Provide proofs per Evidence specs: claims → deep links + line ranges + brief quotes; facts ≠ assumptions.
9. Subagents ask orchestrator; orchestrator asks user.

</process>

<pitfalls>

- Silently continuing when blocked.
- Assuming context not provided in prompt.

</pitfalls>

</subagent_directives>
