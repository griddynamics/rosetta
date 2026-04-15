---
name: debugging
description: Rosetta debugging skill for errors, test failures, and unexpected behavior. Use proactively when encountering any issue. Ensures root cause investigation before attempting fixes.
baseSchema: docs/schemas/skill.md
---

<debugging>

<role>

Senior engineer specializing in systematic root cause analysis and methodical debugging.

</role>

<when_to_use_skill>
Use when encountering errors, test failures, unexpected behavior, or when a previous fix failed and the issue persists. Every fix must trace to a confirmed root cause with evidence — no symptom-only fixes survive review.
</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- ALWAYS find root cause before attempting fixes; symptom fixes are failure
- Make implicit become explicit — incorrect assumptions hide root causes
- Execute phases sequentially

For each issue provide:

- OODA
- Root cause explanation with supporting evidence
- Specific code fix
- Testing approach
- Prevention recommendations

</core_concepts>

<root_cause_investigation phase="1">

BEFORE attempting ANY fix:

1. Read error messages and stack traces completely — they often contain the answer
2. Reproduce consistently — if not reproducible, gather more data, don't guess
3. Check recent changes — git diff, new dependencies, config changes
4. In multi-component systems, add diagnostic logging at each boundary — run once to find WHERE it breaks before fixing anything
5. Trace data flow backward — where does the bad value originate? Fix at source, not symptom
6. For hard-to-fix or highly concurrent issues: create a sequence diagram of what happens — visualize actual flow before guessing
7. Temporarily enable tracing in code and logs — review actual execution vs assumed execution, then remove tracing

</root_cause_investigation>

<pattern_analysis phase="2">

1. Find similar working code in the same codebase
2. Compare working vs broken — list every difference, however small
3. If implementing a known pattern, read the reference completely — don't skim

</pattern_analysis>

<hypothesis_and_testing phase="3">

1. State one clear hypothesis: "X is the root cause because Y"
2. Make the smallest possible change to test it — one variable at a time
3. If it fails, form a new hypothesis — don't stack fixes

</hypothesis_and_testing>

<implementation phase="4">

1. Create a failing test that reproduces the bug
2. Implement a single fix targeting the root cause
3. Verify: test passes, no regressions, issue resolved
4. If 3+ fixes have failed: stop fixing and question the architecture — this likely isn't a bug, it's a design problem. Is third-party involved? Discuss before continuing.

</implementation>

<validation_checklist>

- Root cause identified with evidence before any fix attempted
- Sequence diagram created for concurrent or hard-to-fix issues
- Temporary tracing removed after investigation
- Fix targets root cause, not symptom
- Failing test reproduces the bug
- No regressions introduced
- Prevention recommendation documented

</validation_checklist>

<best_practices>

- One hypothesis, one change at a time
- Check recent changes early in investigation
- Use diagnostic logging at component boundaries

</best_practices>

<pitfalls>

- Attempting fixes before tracing the root cause
- Stacking multiple fixes without validating each
- Each fix reveals a new problem elsewhere — likely a design issue, not a bug

</pitfalls>

</debugging>
