# Redaction Patterns + URL Normalization + Truncation Banner — confluence-source-harvesting

Loaded on demand from SKILL.md. Contains:

- The full credential/PII grep pattern list + placeholder vocabulary (referenced from `<safety_boundaries>`)
- The canonical-vs-display URL normalization example pair (referenced from step 7)
- The truncation banner example (referenced from step 6)

The base SKILL.md keeps the operational rules + GATEs + `<failure_handling>` branches that an agent needs at decision time; this file holds the per-pattern/per-example detail that's only consulted when actively applying redaction or normalization.

---

## Credential + PII Grep Pattern List (referenced from `<safety_boundaries>`)

### Credential and token patterns

Scan each fetched page body for any of:

- `Bearer `
- `Authorization:`
- `password:`
- `api_key=`
- `access_token=`
- JWT shape (`eyJ...`)
- `BEGIN PRIVATE KEY`
- `BEGIN RSA PRIVATE KEY`
- `postgres://user:pass@`
- `mongodb+srv://user:pass@`

### PII patterns

Real customer data found in incident write-ups or customer-report pages:

- Real email shapes outside `example.com` / `example.org` (IETF reserved)
- Real phone numbers outside `+1-555-0100`–`+1-555-0199` (IETF reserved)
- Real account IDs, customer IDs, government IDs
- Payment card number shapes (`\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`)
- Real customer names appearing alongside any of the above

### Placeholder vocabulary

Replace literal values with shape-preserving placeholders + a one-line inline note describing what was hidden so downstream phases know the redaction happened:

| Credential / PII type | Placeholder | Inline note example |
|---|---|---|
| Bearer token / JWT | `<redacted: bearer token>` | `Bearer from runbook 'Auth setup' — see env var API_TOKEN` |
| API key | `<redacted: api key>` | `API key from runbook — secret-manager path projects/foo/keys/runbook-api-key` |
| Password | `<redacted: password>` | `Service-account password — secret-manager only` |
| OAuth client secret | `<redacted: client secret>` | `Client secret — env var OAUTH_CLIENT_SECRET` |
| DB connection string | `<redacted: connection string>` | `Postgres connection — env var DATABASE_URL` |
| Private key (RSA / general) | `<redacted: private key>` | `Service-account private key — secret-manager path projects/foo/keys/svc-account` |
| Credentialed URL | `https://<redacted: user:pass>@<host>/...` OR redact signed-URL params | Credential portion of URL hidden; host + path kept verbatim |
| PII (email / name / phone / ID / card) | `<redacted: PII — <category>>` | If a shape is needed downstream, substitute a synthetic placeholder on IETF reserved domain/number range |

### Structural-content rule (canonical)

Page titles, headings, business-rule prose, screenshots descriptions, link targets to other in-site pages, ticket references, and glossary entries are **functional content** and recorded verbatim. Redaction targets sensitive **values**, not the structural documentation.

If a real production value would be the natural example, replace it with a clearly-fake placeholder of the same shape — better an obviously-fake placeholder in the artifact than a leaked real one committed alongside the requirements doc.

---

## Truncation Banner Example (referenced from step 6)

Inserted at the truncation point as a single HTML comment line so downstream readers know what was omitted:

```
<!-- truncated: 5000-word budget reached at section 'Deployment Steps'; remaining 3 sections omitted: 'Monitoring', 'Rollback', 'Appendix' -->
```

Required fields in the banner: the word budget, the section name where truncation happened, and an enumeration of the omitted section headings (so a reviewer can re-request specific sections if needed).

---

## Canonical-vs-Display URL Normalization Example Pair (referenced from step 7)

Confluence accepts several URL shapes; the canonical form for storage is `/spaces/<KEY>/pages/<numeric-id>`. Examples:

- **Display URL** (received from user prompts): `https://acme.atlassian.net/wiki/display/PROJ/Checkout+Flow`
- **Short URL / tinyurl** (received from page-share links): `https://acme.atlassian.net/wiki/x/AwAB`
- **Canonical form** (stored in the artifact): `https://acme.atlassian.net/wiki/spaces/PROJ/pages/12345678`

Store the canonical form in the artifact. If the original received form differs from the canonical (i.e., the user supplied a display or short URL), record the original-form in the page entry's metadata so downstream reviewers can trace what the user actually pasted.
