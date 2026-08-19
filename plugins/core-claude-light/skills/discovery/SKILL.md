---
name: discovery
description: "To establish what exists — affected areas, behavior, prior attempts, dependencies, data."
license: Apache-2.0
baseSchema: docs/schemas/skill.md
---

<discovery>

<role>

Senior engineer establishing what actually exists — evidence first, guesses never.

</role>

<when_to_use_skill>
What exists is unknown or unclear: affected areas, current behavior, prior attempts, dependencies, integration points, or the request itself has gaps.
Output: what exists, cited; what remains unknown; whether that is enough to act on.
</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed
- Discovery establishes facts. It does not decide, spec, break down, or change anything
- Cite or drop: `path:line-range`, command output, or source. Unverified is an unknown, not a finding
- Not-examined and examined-and-absent read identically in a report — always say which; for absent, the search that came back empty
- The request may have been attempted before, and wrongly. A wrong existing solution is the most expensive thing to miss
- Internal knowledge of libraries and versions is stale; verify externally (web, DeepWiki, Context7)

</core_concepts>

<where_to_look>

First name what the request turns on — that sets which areas carry the answer, and in what order; say what was left alone:

- Behavior as it runs today, and where it is actually defined — not where it appears to be
- Entry points: APIs, CLIs, jobs, events, schedules, UI routes
- Callers and consumers a change would reach, including other repos and teams — named, never "may affect others"
- Prior attempts at the same thing: related commits, reverts, TODO/FIXME, tickets — with a verdict: absent, partial, or present-but-incorrect
- Dependencies direct and transitive: versions, conflicts, EOL, known vulnerabilities
- Patterns and conventions established here; the nearest analog to the request
- Configuration and per-environment divergence: flags, settings, where secrets come from
- Runtime signal: logs, traces, metrics, error rates, actual usage
- Data: schemas, stores, volumes, retention, where sensitive fields live — presence and location, never values
- Tests and what they actually cover; contracts, fixtures
- Requirements and specs in force, and where the code contradicts them
- History: churn, incidents, dead code, why it ended up this way
- Nothing built yet: the substrate is the ecosystem — libraries, versions, adjacent systems, conventions to adopt — same discipline

</where_to_look>

<depth>

- Follow to where things are defined AND used — both directions; the first match is rarely the answer
- grep and header-scan before bulk reads; line ranges over whole files
- Enough: what the request turns on is established or named unknown, and another pass would change nothing
- Confidence honest, weakest link named. Low confidence is a finding, not a failure
- Blocking unknowns: batched questions, each with what it blocks and a safe default
- No scope given: ask; sweeping everything is not a substitute

</depth>

<output>

Compressed, terse, terms over prose.
Carries: what the request turns on · what exists, cited · prior-attempt verdict · examined vs left alone · unknowns and what each blocks · patterns in use · confidence and its weakest link.
Written so the consumer needs no second sweep.

</output>

<validation_checklist>

- Every finding carries its basis: cited evidence, marked inference, or named unknown
- Prior-attempt verdict present, even when "absent"
- Not-examined areas stated, not silently omitted
- Claims the request turns on: established or named unknown

</validation_checklist>

<pitfalls>

- Restating the request as a finding
- First matching file taken for the answer
- Silent gaps: an area dropped without saying so
- Reading broadly, reporting thinly
- Sweeping the codebase instead of asking for scope
- History unavailable (shallow clone, squashed): mark the evidence degraded, not silently skipped

</pitfalls>

</discovery>
