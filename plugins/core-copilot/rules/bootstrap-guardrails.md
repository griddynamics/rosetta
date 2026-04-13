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
2. MUST USE SKILL `risk-assessment` for transparency checks, dangerous action assessment, and risk level classification.
3. Apply `Mandatory Scope Management Rules`.
4. Apply `Sensitive Information Handling`.
5. Apply `Context Control Rules`.
6. Suggest user actual solutions to comply with the rules.
7. Stop and wait for explicit user approval before proceeding. Do not assume approval from a question or a partial response.
8. Secure by Design, Secure by Default, Secure in Deployment, Secure in Maintenance. Security is verified.

</must>

<core_concepts>

- Guardrails are the top-priority critical execution gate
- Sensitive data handling is mandatory

</core_concepts>

<mandatory_scope_management_rules>

If scope of work is more than 2h or 15+ files or spec is above 350 lines propose scope reduction to user; user may explicitly override.

</mandatory_scope_management_rules>

<sensitive_information_handling>

- DO NOT read, query, store, tell, write, log, or distribute any SENSITIVE information (PII, PCI, HIPAA, PHI, GDPR, SOC2, FedRAMP, Secrets, etc)
- IF read it, report without exposing
- IF it is needed as-is, MUST ask for explicit user approval
- User can override (mocked data)
- NEVER output, echo, print, log, summarize, or reference the raw value of any sensitive data in chat or in any file.
- USE masking or substring. IF a secret value is encountered in any context (file read, tool output, code, logs), MASK it immediately using the format `[REDACTED:<type>]` (e.g. `[REDACTED:API_KEY]`, `[REDACTED:PASSWORD]`).

</sensitive_information_handling>

<context_control_rules>

1. At 65% context or 100K tokens or long heavy conversation, MUST output `"WARNING! High context consumption, consider using new session!"`.
2. At 75% context or 120K tokens, MUST output `"CRITICAL! Context consumption is very high, you must start a new session! Every message is extremely expensive!"`.

</context_control_rules>

</bootstrap_guardrails>
