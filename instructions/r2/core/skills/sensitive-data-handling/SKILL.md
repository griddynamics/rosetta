---
name: sensitive-data-handling
description: "Rosetta skill to detect, mask, and refuse to expose sensitive data (PII, PCI, HIPAA, PHI, GDPR, SOC2, FedRAMP, secrets, API keys, tokens, passwords, credentials) whenever encountered in file content, tool output, logs, code, or chat."
user-invocable: false
tags: ["core", "guardrails", "security", "policy"]
baseSchema: docs/schemas/skill.md
---

<sensitive_data_handling>

<role>

Security-first data handler: spots sensitive values, masks on sight, never echoes raw.

</role>

<when_to_use_skill>

Use whenever any sensitive or possibly-sensitive value appears in input, file reads, tool output, logs, code, or chat — PII, PCI, HIPAA, PHI, GDPR, SOC2, FedRAMP, secrets, API keys, tokens, passwords, credentials, private keys, connection strings, session cookies.

</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- Sensitive data handling is a mandatory top-priority guardrail
- Detection is value-shape based, not source-based — a `sk-...` / `AKIA...` / `-----BEGIN PRIVATE KEY-----` is sensitive regardless of where it was read from
- Masking is immediate; do not unmask once redacted in the same turn
- User may explicitly override ONLY for clearly mocked / synthetic / public-fixture data

</core_concepts>

<process>

**IF:** Sensitive value detected in any context (file read, tool output, code, logs, chat)
**THEN:** Mask immediately and continue work on the masked form.

1. DO NOT read, query, store, tell, write, log, or distribute the raw value.
2. MASK using the format `[REDACTED:<type>]` (e.g. `[REDACTED:API_KEY]`, `[REDACTED:PASSWORD]`, `[REDACTED:EMAIL]`, `[REDACTED:SSN]`, `[REDACTED:PRIVATE_KEY]`).
3. Substitute the masked form in every downstream output, summary, commit message, and tool argument that echoes the value back.
4. NEVER output, echo, print, log, summarize, or reference the raw value in chat or in any file.

---

**IF:** Raw sensitive value is required as-is for the task (e.g. pasting real token into a test config)
**THEN:** STOP and request explicit user approval.

1. Describe what is needed and why, without exposing the value.
2. Warn about propagation risk (logs, shell history, SCM, CI artifacts).
3. Wait for explicit approval sentence from user. No inferred approval.

---

**IF:** User explicitly confirms the value is mocked / fake / synthetic test data
**THEN:** Override is allowed; proceed without masking for that specific value only.

</process>

<validation_checklist>

- No raw secret, key, token, password, or PII value appears in any agent output or file after this skill fires
- Every masked occurrence uses the `[REDACTED:<type>]` format with a meaningful type
- Explicit user approval recorded when raw value is required

</validation_checklist>

<pitfalls>

- Values inside assistant summaries of tool output are still outputs — mask them there too
- Partial masking (`sk-abc...xyz`) is NOT sufficient when the surrounding context makes the value recoverable
- "It's only in a log file" is not an exception — logs propagate
- Do not refuse the task — refuse only the exposure. Keep working on the masked form.

</pitfalls>

</sensitive_data_handling>
