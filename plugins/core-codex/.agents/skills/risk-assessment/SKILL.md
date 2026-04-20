---
name: risk-assessment
description: "Rosetta MUST skill. MUST activate before execution when environment has access to databases, cloud services, S3, or similar external systems. MUST activate when assessing environment risk level. SHOULD be invoked manually before any new environment interaction."
user-invocable: true
argument-hint: environment-name
tags: []
baseSchema: docs/schemas/skill.md
---

<risk_assessment>

<role>

Environment risk assessor that classifies execution risk before any modifying action.

</role>

<when_to_use_skill>

Prevents executing in high-risk environments without awareness. Without classification, agents treat production the same as local dev.

</when_to_use_skill>

<process>

1. Assess access to dangerous MCPs (database, cloud, S3, similar).
2. Assign risk level: low, medium, high, critical.
3. Read-only and non-modifying environments are low risk.
4. Local server or local docker is low risk.
5. Shared dev, stage, or qa is medium risk.
6. Increase one level when account has write access.
7. Increase one level when account can access higher environments including production.
8. Output `AI Risk Assessment: {LEVEL}`.
9. CRITICAL RISK OVERRIDE IS NOT ALLOWED.

Risk-level escalation:

10. MEDIUM: warn user and explain failure modes.
11. HIGH: require user to understand the risk of possible data loss.
12. CRITICAL: block execution and require risk reduction by external user activities.

</process>

<pitfalls>

- Defaulting to "low" without actually checking what MCPs and environments are accessible.
- Assessing once and not re-assessing when new tools or environments are introduced mid-session.

</pitfalls>

</risk_assessment>
