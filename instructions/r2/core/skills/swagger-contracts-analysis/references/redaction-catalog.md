# Redaction Catalog — swagger-contracts-analysis

Loaded on demand from SKILL.md `<safety_boundaries>` when actively applying redaction at write time or re-scanning the assembled artifact. The base SKILL.md keeps the operational rule (redact-before-writing) + the structural-content exception + the re-scan validation gate; this file holds the verbatim **targets to redact + placeholder vocabulary + grep pattern list** that the agent consults at fill-in time.

Mirrors the same lazy-loading pattern used by the sibling `api-test-spec-authoring` skill (whose redaction catalog lives at `api-test-spec-authoring/references/templates-and-redaction.md`).

---

## Targets to redact

Replace concrete secret values with shape-preserving placeholders; keep the structural shape verbatim. The catalog covers five target categories:

### 1. Auth credentials / tokens / API keys / passwords / OAuth client secrets

Surfaces:
- In the `Auth` block's `Required scopes / permissions`
- In example `Authorization` / `X-Api-Key` / `Cookie` header values
- In OAuth token-endpoint example bodies (`client_id`, `client_secret`, `refresh_token`)
- In Bearer example values

Placeholders:
- `<redacted: bearer token>` (Bearer)
- `<redacted: api key>` (API key)
- `<redacted: oauth client secret>` (client_secret / client_id when sensitive)
- `<redacted: password>` (Basic Auth password component)

Keep verbatim: the mechanism name (`Bearer JWT`, `OAuth2 client-credentials`, `API Key in header`) — that's structural, not sensitive.

### 2. Credentialed URLs

Surfaces:
- `https://user:pass@host/...`
- Signed/presigned URLs with `?X-Amz-Signature=`, `?sig=`, `?token=` query parameters

Redact the credential portion only:
- `https://user:pass@host` → `https://<redacted: credentialed URL>` (the host + path remain verbatim)
- `?sig=<long-signature>` → `?sig=<redacted: signed URL signature>` (the param name + non-secret params remain)

### 3. Database connection strings, signed service URLs, service-account JSONs, private keys, certificates

In code citations or spec examples:

- **Never embed the literal value.**
- Describe the **source** (env var name, secret-manager path) and **mechanism** instead.
- Example: `DB connection string from env var DATABASE_URL — credential portion redacted; format: postgresql://user:pass@host/db`

### 4. Real PII in example request/response bodies

Real customer names, real emails, real phone numbers, real account IDs, real payment data, government IDs:

- Replace with synthetic equivalents on IETF reserved domains: `test.user-1@example.com`
- Use the IETF reserved phone range: `+1-555-0100`–`+1-555-0199`
- Use official PSP test card numbers (document the source — Stripe / Adyen / etc.)
- Keep the schema shape and field names verbatim so the contract analysis can still reason about field structure

### 5. JWT example values

`eyJ...` patterns in spec examples or stack-snippet citations:

- Redact to `<redacted: JWT>`
- Describe what the JWT carries (claims / audience / expiry) in prose if relevant to the contract analysis (e.g., when JWT claim structure affects authorization decisions documented in the spec)

---

## Grep pattern list (canonical)

The single source of truth for what `<validation_checklist>`'s redaction scan looks for. Re-scan the assembled artifact against this list before emit:

- `Bearer `
- `Authorization:`
- `password:`
- `api_key=`
- `client_secret`
- JWT shape `eyJ...`
- `BEGIN PRIVATE KEY`
- `BEGIN RSA PRIVATE KEY`
- `postgres://user:pass@`
- `mongodb+srv://user:pass@`

Plus PII-shaped patterns:

- Real-looking emails outside `example.com` / `example.org` (IETF reserved)
- Real phone numbers outside `+1-555-0100`–`+1-555-0199` (IETF reserved)
- Card-number shapes (`\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`)
- Real customer names appearing alongside any of the above

---

## Structural-content rule

Endpoint paths, HTTP methods, status codes, content types, field names, schema shapes, validation rules (min/max/pattern/enum), header names, response codes, JSONPath citations, code `file:line` citations, and auth-mechanism names are functional content and recorded verbatim. **Redaction targets sensitive values, not the structural contract spec.**

If a real production value would be the natural example in the contract, replace it with a clearly-fake placeholder of the same shape — better an obviously-fake placeholder than a leaked real one committed alongside the api-analysis artifact and propagated to test-spec, test-implementation, and debug phases.

---

## Re-scan recording rule

After redaction, record each applied redaction inline in the entry's `Notes / Discrepancies` section so reviewers know what was hidden — e.g., `Spec example for /auth/token redacted: Bearer token → <redacted: bearer token>; spec source: paths./auth/token.post.requestBody`.
