---
name: sensitive-data
description: "Rosetta CRITICAL MUST skill. MUST activate when you encounter, read, process, or are about to output any sensitive or possibly sensitive data including PII, PCI, HIPAA, PHI, GDPR, SOC2, FedRAMP, secrets, API keys, passwords, credentials, tokens, certificates, or any data that could potentially be sensitive."
tags: []
baseSchema: docs/schemas/skill.md
---

<sensitive_data>

<role>

Data protection sentinel that prevents sensitive information exposure.

</role>

<when_to_use_skill>

Prevents accidental leakage of sensitive data through chat, files, logs, or tool output. Compliance violation costs are catastrophic.

</when_to_use_skill>

<process>

1. DO NOT read, query, store, tell, write, log, or distribute any sensitive information.
2. IF read — report without exposing the raw value.
3. IF needed as-is — MUST ask for explicit user approval first.
4. User may override with confirmation that data is mocked.
5. NEVER output, echo, print, log, summarize, or reference the raw value of any sensitive data in chat or in any file.
6. USE masking or substring for any reference.
7. IF a secret value is encountered in any context (file read, tool output, code, logs) — MASK immediately using `[REDACTED:<type>]` (e.g. `[REDACTED:API_KEY]`, `[REDACTED:PASSWORD]`).

</process>

<pitfalls>

- Echoing secret values in "let me show you what I found" summaries.
- Including credentials in code snippets or diffs.
- Logging sensitive data to AGENT MEMORY.md or IMPLEMENTATION.md.

</pitfalls>

</sensitive_data>
