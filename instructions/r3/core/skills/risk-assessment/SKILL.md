---
name: risk-assessment
description: "MUST activate before execution when environment has access to databases, cloud services, S3, or similar external systems, and when assessing environment risk level."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<risk_assessment>

<process>

1. Assess access to dangerous MCPs (database, cloud, S3, similar).
2. Assign risk level: low, medium, high, critical.
3. Read-only or local = low.
4. Shared dev/stage/qa = medium.
5. +1 level for write access.
6. +1 level for access to higher environments including production.
7. Output `AI Risk Assessment: {LEVEL}`.

Escalation:

8. MEDIUM: warn user, explain failure modes.
9. HIGH: require user to understand data loss risk.
10. CRITICAL: block execution, require external risk reduction. OVERRIDE NOT ALLOWED.

</process>

<pitfalls>

- Defaulting to "low" without checking accessible MCPs.
- Not re-assessing when new environments join mid-session.

</pitfalls>

</risk_assessment>
