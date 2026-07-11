---
name: sensitive-data
description: "CRITICAL. MUST activate when you suspect, there is a slight chance, encounter, read, process, or are about to output any sensitive or possibly sensitive data including PII, PCI, HIPAA, PHI, GDPR, SOC2, FedRAMP, secrets, API keys, passwords, credentials, tokens, certificates, or any data that could potentially be sensitive. Applicable for coding too"
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<sensitive_data>

<process>

1. DO NOT read, query, store, tell, write, log, or distribute any SENSITIVE information (PII, PCI, HIPAA, PHI, GDPR, SOC2, FedRAMP, Secrets, etc)
2. IF encountered - report without exposing raw value
3. IF needed as-is - MUST ask explicit user approval first
4. User may override (mocked data)
5. NEVER output, echo, print, log, summarize, or reference the raw value of any sensitive data in chat or in any file
6. MASK immediately using `[REDACTED:<type>]` (e.g. `[REDACTED:API_KEY]`, `[REDACTED:PASSWORD]`)
7. Scan information of your output or artifacts for: `Bearer `, `Authorization:`, `password:`, `api_key=`, `client_secret`, `eyJ` (JWT), `AKIA` (AWS key), `ghp_`/`gho_`/`github_pat_` (GitHub), `xox[baprs]-` (Slack), `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`, `BEGIN OPENSSH PRIVATE KEY`, `postgresql://user:pass@`, `mongodb+srv://user:pass@`; plus emails outside `example.com`/`example.org`, phones outside the `+1-555-01xx` reserved range, card-number shapes `\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`, and real customer names alongside any of the above. This list is a **non-exhaustive floor** -- redact any secret-shaped token even if unlisted. Fail-closed -- if the scan cannot run, do not emit
8. Use IETF reserved ranges for PII placeholders: emails `test.user-1@example.com`; phones `+1-555-0100`–`+1-555-0199`; official PSP test cards (cite source)

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
