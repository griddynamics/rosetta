# Sensitive-Data Redaction Policy — automation-test-execution-analysis

Loaded on demand from `SKILL.md` `<safety_boundaries>` when the artifact's redaction scan runs (only invocations whose inputs embed secrets actually need this detail in active context). The base `SKILL.md` keeps the one-line contract: *the analysis artifact is tracked, downstream-fed, and PUBLIC by default — redact before writing into the artifact, not after.* This file holds the targets table, the canonical grep-pattern list, the structural-content rule, and the re-scan rule that `<validation_checklist>`'s redaction item invokes.

---

## Targets to redact

Replace literal values with `<redacted: <kind>>` placeholders + a one-line presence/mechanism note. Patterns are grepped across every Failure entry's Evidence references and any inline log/stack/body snippets:

| Target | Where it surfaces | Placeholder | Mechanism / kept verbatim |
|---|---|---|---|
| Auth headers | HTTP captures (`Authorization`, `X-Api-Key`, `Cookie`, `Set-Cookie`) | `<redacted: bearer token>` / `<redacted: basic credentials>` / `<redacted: api key>` / `<redacted: session cookie>` | One-line origin (e.g. *"Bearer from `AuthHelper.get_token('admin')`"*) |
| JWTs | Stack frames + log lines (`eyJ...` shape) | `<redacted: JWT>` | Claims/audience/expiry described if relevant to the root cause |
| Credentialed URLs | CI logs, stack frames (`https://user:pass@host/...`) | Redact `user:pass@` only | Host + path remain |
| Query-string secrets | Request URLs (`?api_key=`, `?token=`, `?access_token=`, `?X-Amz-Signature=`, `?sig=`) | Redact secret-bearing param values | Param names + non-secret params remain |
| Request bodies | HTTP-capture evidence | Redact credential / token / password / payment fields | Field names + non-sensitive values + schema shape verbatim (so contract mismatches can still be reasoned about) |
| Response bodies | HTTP-capture evidence | Redact `access_token` / `refresh_token` / `id_token` / session IDs / PII (real emails / names / phones / account IDs / payment data) | Structural fields verbatim |
| Stack traces / error messages | Logged HTTP request lines in connection-error stacks; DB connection strings in `psycopg2.OperationalError` frames | Scan + redact before pasting into Evidence references / Root cause | Framework symbols (function names, repo file paths) verbatim |
| Environment Info | Report header (base URL, auth method) | Mechanism only — `auth method = OAuth2 client-credentials` / `JWT Bearer` / `Basic Auth via env var <NAME>` | Base URLs usually safe; credentialed base URLs are not |

---

## Canonical grep pattern list

The single source of truth for the redaction sweep (referenced from `<validation_checklist>`):

`Bearer `, `Authorization:`, `password:`, `api_key=`, `access_token=`, `client_secret`, JWT shape `eyJ...`, `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`, `postgres://user:pass@`, `mongodb+srv://user:pass@`, plus PII-shaped patterns (real-looking emails outside `example.com`/`example.org`, real phone numbers outside `+1-555-0100`–`+1-555-0199`, card-number shapes).

---

## Structural-content rule

Endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes, response status text, framework stack frame symbols are **functional** and recorded as-is. Redaction targets sensitive **values**, not the structural failure spec.

---

## Re-scan before emit

`<validation_checklist>`'s redaction item re-greps the assembled artifact against the canonical grep list above; any hits are replaced + the redaction recorded inline (e.g., next to the Evidence reference: `log.txt:142 — Bearer token redacted; origin: AuthHelper.get_token('admin')`).

The boundary is artifact-agnostic — applies to any parent-supplied output path.
