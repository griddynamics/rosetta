---
name: redaction-scope
description: Shared QA redaction scope — sensitive vs structural content, shape-preserving placeholders, and the pre-emit re-scan list.
---

<redaction-scope>

Applies to any QA artifact that is tracked + downstream-fed (treat as **PUBLIC by default**). Redact sensitive **values** before writing, then re-scan before emit; record each redaction where the consuming phase specifies. The act of redacting is performed by the phase's redaction skill — this reference defines only WHAT is in scope.

**Structural content stays verbatim** — endpoint paths, methods, status codes, field/schema names, validation rules, framework names, directory paths, MCP names, base/spec URLs without embedded credentials, TestRail/Jira project keys, citations. Redaction targets sensitive **values** only.

**Targets to redact → shape-preserving placeholder (keep the structural shape):**
1. **Auth credentials / tokens / keys / passwords / OAuth secrets** (in `Authorization`/`X-Api-Key`/`Cookie` examples, OAuth token-endpoint bodies, Bearer examples) → `<redacted: bearer token>` / `<redacted: api key>` / `<redacted: oauth client secret>` / `<redacted: password>`. Keep the mechanism name (`Bearer JWT`, `OAuth2 client-credentials`) verbatim.
2. **Credentialed URLs** — `https://user:pass@host` → `https://<redacted: credentialed URL>` (host/path verbatim); `?sig=<sig>` → `?sig=<redacted: signed URL signature>`.
3. **Connection strings / service-account JSONs / private keys / certs** — never embed the literal; describe the source (env var / secret-manager path) + format, e.g. `from env DATABASE_URL — credential redacted; format postgresql://user:pass@host/db`.
4. **Real PII in example bodies** — replace with synthetic on IETF reserved ranges: emails `test.user-1@example.com`; phones `+1-555-0100`–`+1-555-0199`; official PSP test cards (cite source). Field names/schema shapes stay verbatim.
5. **JWT example values** (`eyJ...`) → `<redacted: JWT>`; describe carried claims in prose if they affect documented authorization.

**Re-scan grep list (before emit):** `Bearer `, `Authorization:`, `password:`, `api_key=`, `client_secret`, `eyJ` (JWT), `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`, `postgresql://user:pass@`, `mongodb+srv://user:pass@`; plus emails outside `example.com`/`example.org`, phones outside the `+1-555-01xx` reserved range, card-number shapes `\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`, and real customer names alongside any of the above.

</redaction-scope>
