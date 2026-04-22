---
name: sensitive-data
description: "Rosetta CRITICAL MUST skill. MUST activate when you encounter, read, process, or are about to output any sensitive or possibly sensitive data including PII, PCI, HIPAA, PHI, GDPR, SOC2, FedRAMP, secrets, API keys, passwords, credentials, tokens, certificates, or any data that could potentially be sensitive."
tags: []
baseSchema: docs/schemas/skill.md
---

<sensitive_data>

<process>

1. DO NOT read, query, store, write, log, or distribute sensitive information.
2. IF encountered — report without exposing raw value.
3. IF needed as-is — MUST ask explicit user approval first.
4. User may override (mocked data).
5. MASK immediately using `[REDACTED:<type>]` (e.g. `[REDACTED:API_KEY]`).

</process>

<pitfalls>

- Echoing secrets in summaries or diffs.
- Logging sensitive data to AGENT MEMORY.md.

</pitfalls>

</sensitive_data>
