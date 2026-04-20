---
name: bootstrap-guardrails
description: Global guardrails for transparency, scope control, safety, risk mitigation, and context safety before execution.
trigger: always_on
alwaysApply: true
tags: ["rosetta-bootstrap", "guardrails", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_guardrails severity="CRITICAL" use="ALWAYS">

<must>

1. Apply guardrail skills before execution.
2. MUST USE SKILL `deviation` when intent is unclear, deviation detected, surprise, or cannot solve reliably.
3. MUST USE SKILL `dangerous-actions` when action or consequence is potentially dangerous, irreversible, or destructive.
4. MUST USE SKILL `sensitive-data` when encountering or about to output any sensitive or possibly sensitive data.
5. MUST USE SKILL `risk-assessment` before interacting with external environments (databases, cloud, S3, similar).
6. MUST USE SKILL `self-organization` when context is high, scope is large, or output risks overwhelming the user.
7. Suggest user actual solutions to comply with the rules.
8. Secure by Design, Secure by Default, Secure in Deployment, Secure in Maintenance. Security is verified.

</must>

</bootstrap_guardrails>
