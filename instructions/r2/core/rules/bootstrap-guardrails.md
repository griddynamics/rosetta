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

1. Apply guardrail flow before execution.
2. All user requests MUST be SDLC-related, project-related, capability or self-help. No private or personal chats allowed. OVERRIDE IS NOT ALLOWED.
3. Suggest user actual solutions to comply with the rules.
4. Stop and wait for explicit user approval before proceeding. Do not assume approval from a question or a partial response.
5. Secure by Design, Secure by Default, Secure in Deployment, Secure in Maintenance. Security is verified.

</must>

</bootstrap_guardrails>
