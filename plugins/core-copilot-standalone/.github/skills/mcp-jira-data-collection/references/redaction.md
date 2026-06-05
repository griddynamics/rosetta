# Redaction Targets + Grep Patterns — mcp-jira-data-collection

Loaded on demand from SKILL.md `<safety_boundaries>` when actively applying redaction during extraction. The base SKILL.md keeps the extraction-only contract + the public-by-default framing + the shape-placeholder rule inline; this file holds the per-category targets-to-placeholder catalog and the grep-pattern enumeration so a runtime extraction that finds zero sensitive values doesn't carry the maintainer-grade regex detail in active context.

Mirrors the same lazy-loading pattern the sibling `mcp-confluence-data-collection` skill uses via `references/cql-and-redaction.md` and the same pattern `<vendor_replacement>` uses for the porting guide.

---

## Targets to redact (referenced from `<safety_boundaries>`)

The chain downstream (`raw-data.md` → `requirements.md` / `test-scenarios.md`) re-emits this skill's output into version-controlled artifacts. Therefore description and each comment MUST be redacted before writing.

### 1. Credentials / API keys / tokens / passwords / OAuth secrets

Embedded anywhere (description, comment body, custom-field value, stack-trace paste):

- Replace with `<redacted: bearer token>` / `<redacted: API key>` / `<redacted: password>` / `<redacted: client secret>` placeholders
- Record in the Sensitive-content redactions section
- **Patterns to grep:** `Bearer `, `Authorization:`, `password:`, `api_key=`, `access_token=`, JWT shape (`eyJ...`), `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`

### 2. PII

Real customer names, real emails, real phone numbers, real account IDs, real payment data, government IDs embedded in customer-report tickets or QA reproduction notes:

- Replace with `<redacted: PII — <category>>`
- Record in redactions section
- **Patterns to grep:**
  - Email shapes: `*@*.*` for non-`example.com` / non-`example.org` domains
  - Phone shapes: `\+?\d{1,3}[\s\-]?\d{3,4}[\s\-]?\d{3,4}`
  - Card-number shapes: `\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`

### 3. Internal URLs that embed credentials

`https://user:pass@host/...`, signed/presigned URLs with `?X-Amz-Signature=`, `?sig=`, `?token=`:

- Redact the `user:pass@` portion or the secret-bearing query parameter
- Record in redactions section

### 4. Database connection strings

`postgresql://user:pass@host/db`, `mongodb+srv://user:pass@...`, etc.:

- Redact the credential portion
- Record in redactions section

### 5. Pure functional content (safe verbatim)

Feature names, endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes — recorded as-is. **Redaction targets sensitive values, not the structural ticket description.**
