# Redaction Targets — qa-test-debugging

Loaded on demand from SKILL.md `<safety_boundaries>` when actively writing entries into `execution-report.md` (step 2 Environment Info, step 3 per-failure entries, step 5 emit) or when debug-logging during Part B corrections.

The base SKILL.md keeps the operational rule + PUBLIC-by-default declaration + 5-bucket category list + structural-content rule + Part A/B applicability inline (decision-time content the agent needs every call); this file holds the **per-target enumeration with placeholder vocabulary and shape examples** the agent fills in at write time.

Same lazy-loading pattern `failure-catalog.md` and `part-b-mechanics.md` already use.

---

## Per-target redaction targets + placeholder vocabulary (referenced from SKILL.md `<safety_boundaries>`)

Replace literal values with the placeholders below + describe presence/mechanism in prose. Never paste the literal value.

- **Auth headers** — `Authorization: Bearer <jwt>`, `Authorization: Basic <base64>`, `X-Api-Key: <key>`, `Cookie: session=<id>`, `Set-Cookie` response headers. Replace with `<redacted: bearer token>` / `<redacted: basic credentials>` / `<redacted: api key>` / `<redacted: session cookie>` and add a one-line description (e.g., "Bearer token from `AuthHelper.get_token('admin')`").
- **Credentialed URLs** (`https://user:pass@host/...`) — redact the `user:pass@` portion before recording.
- **Query-string secrets** — `?api_key=...`, `?token=...`, `?access_token=...`, signed-URL signatures (`?X-Amz-Signature=...`, `?sig=...`) — redact the secret-bearing parameter values.
- **Request bodies** containing credentials, tokens, password fields, payment data — redact those fields specifically; keep structural fields (field names, non-sensitive values, schema shape) verbatim.
- **Response bodies** containing tokens (`access_token`, `refresh_token`, `id_token`), session identifiers, PII (real customer emails / names / phone numbers / account IDs / payment data) — redact the sensitive values; keep structural fields verbatim.
- **Stack traces / error messages** sometimes embed credentials (e.g., a logged HTTP request line in a connection-error stack). Scan and redact before pasting.
- **Environment Info** (step 2) — record `auth method = OAuth2 client-credentials` / `JWT Bearer` / `Basic Auth via env var BASIC_AUTH_USER:BASIC_AUTH_PASS` — never the literal token or password. Base URLs are usually safe (e.g., `https://api.staging.example.com`); credentialed base URLs are not.

**Re-scan grep patterns** (used by `<validation_checklist>` Safety re-scan): `Authorization: `, `Bearer `, `Basic `, `X-Api-Key:`, `Cookie: session=`, `Set-Cookie:`, `://[^@]+:[^@]+@`, `\?(api_key|token|access_token|X-Amz-Signature|sig)=`, `access_token`, `refresh_token`, `id_token`, `BEGIN PRIVATE KEY`, real-PII shapes (email + phone + payment-card regexes per project convention).

If a real production value would be the natural example, use a clearly-fake placeholder of the same shape — better an obviously-fake example than a leaked real value committed to the repo.
