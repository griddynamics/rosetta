---
name: sensitive-data
description: "Rosetta CRITICAL MUST skill. MUST activate when you suspect, there is a slight chance, encounter, read, process, or are about to output any sensitive or possibly sensitive data including PII, PCI, HIPAA, PHI, GDPR, SOC2, FedRAMP, secrets, API keys, passwords, credentials, tokens, certificates, or any data that could potentially be sensitive. Applicable for coding too"
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<sensitive_data>

<process>

1. DO NOT read, query, store, tell, write, log, or distribute any SENSITIVE information (PII, PCI, HIPAA, PHI, GDPR, SOC2, FedRAMP, Secrets, etc)
2. IF encountered — report without exposing raw value
3. IF needed as-is — MUST ask explicit user approval first
4. User may override (mocked data)
5. NEVER output, echo, print, log, summarize, or reference the raw value of any sensitive data in chat or in any file
6. MASK immediately using `[REDACTED:<type>]` (e.g. `[REDACTED:API_KEY]`, `[REDACTED:PASSWORD]`)

</process>

<coding>

- DO NOT read, query, store, tell, write, log, or distribute any SENSITIVE information
- Identify and apply respective guidance for handling data like that
- Guide user for correct implementation 

</coding>

<pitfalls>

- Echoing secrets in summaries or diffs.
- Logging sensitive data to AGENT MEMORY.md.

</pitfalls>

</sensitive_data>
