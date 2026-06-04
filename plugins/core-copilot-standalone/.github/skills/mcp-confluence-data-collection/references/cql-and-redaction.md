# CQL Query Recipe + Redaction Catalog — mcp-confluence-data-collection

Loaded on demand from SKILL.md when actively building a CQL query (step 2) or applying redaction (step 8 / `<safety_boundaries>`). The base SKILL.md keeps the operational rules + GATEs + decision-time content; this file holds the detailed pattern catalogs that the agent consults at fill-in time.

Sibling reference file `mcp-confluence-data-collection/references/vendor-swap.md` already uses the same lazy-loading pattern for maintainer-only content.

---

## CQL Query Recipe (referenced from step 2.1)

### Deterministic shape

Combine the project key (space filter) AND a label/term predicate. The two parts together give reproducible search behavior; the `space =` filter is the dominant noise reducer.

**Worked example:**

```
space = PROJ AND (label = "feature-x" OR text ~ "checkout refund")
```

**Fallback when labels are unknown:**

```
space = PROJ AND text ~ "<key-term>"
```

**Always include the `space =` filter when the project key is known.** Unscoped searches surface noise across unrelated spaces and break the deterministic-ranking guarantee downstream.

### Deterministic ranking rule (referenced from step 2.3)

Same inputs MUST produce the same top-N across runs. Apply this fixed priority order:

1. **Title-match** — query term appears in the page title (highest priority)
2. **Label-match** — query label is set on the page
3. **Body-match** — query term appears in page body only (lowest priority)

Within each tier, use the MCP's relevance score / recency as the tiebreaker. Record the chosen ranking + the top-N page IDs in the artifact under `### Search Provenance` so the search run is reproducible.

---

## Redaction Catalog (referenced from `<safety_boundaries>`)

### Credentials, tokens, API keys, passwords, OAuth secrets

Embedded anywhere — page body, code blocks, runbook examples, customer-report pastes.

**Patterns to grep** (canonical list):

- `Bearer `
- `Authorization:`
- `password:`
- `api_key=`
- `access_token=`
- `client_secret=`
- JWT shape `eyJ...`
- `BEGIN PRIVATE KEY`
- `BEGIN RSA PRIVATE KEY`

**Placeholders:** `<redacted: bearer token>` / `<redacted: API key>` / `<redacted: password>` / `<redacted: client secret>`. Record each in the page entry's `### Sensitive-content redactions` section.

### Database connection strings

Patterns:

- `postgresql://user:pass@host/db`
- `mongodb+srv://user:pass@...`
- `redis://user:pass@...`

**Redaction:** redact the credential portion only (`user:pass@`); the protocol + host + database name remain verbatim. Record in Sensitive-content redactions.

### Signed / credentialed URLs

Patterns:

- `https://user:pass@host/...` (basic-auth in URL)
- Signed-URL query params: `?X-Amz-Signature=`, `?sig=`, `?token=`

**Redaction:** redact the credential or signature portion only (the `user:pass@` segment, or the secret-bearing query param value). The host + path + non-secret query params remain verbatim. Record in Sensitive-content redactions.

### Internal URLs that embed credentials

Pattern: `https://admin:pw@internal.example.com/...`

**Redaction:** redact the credential portion (same as above); the host + path remain verbatim.

### PII

Real customer names, real emails, real phone numbers, real account IDs, real payment data, government IDs found in incident write-ups, customer reports, or QA reproduction notes.

**Patterns:**

- Email shapes for non-`example.com` / non-`example.org` domains (IETF reserved)
- Phone shapes outside `+1-555-0100`–`+1-555-0199` (IETF reserved)
- Card-number shapes (`\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`)

**Placeholders:** `<redacted: PII — <category>>` (e.g. `<redacted: PII — customer email>`, `<redacted: PII — phone number>`). Use synthetic equivalents on IETF reserved domains/numbers if a shape is needed for downstream use. Record in Sensitive-content redactions.

### Pure functional content — stays verbatim

Page titles, headings, business-rule prose, schema field names, endpoint paths, HTTP methods, status codes, error message templates, screenshots descriptions, link targets to other in-site pages — recorded verbatim. **Redaction targets sensitive values, not the structural documentation.**

If a real production value would be the natural example, replace it with a clearly-fake placeholder of the same shape — better an obviously-fake placeholder than a leaked real one committed alongside the raw-data artifact.

---

## Output template (referenced from SKILL.md `<output_format>`)

Loaded on demand at process step 8 when assembling the artifact. The base SKILL.md keeps the section list inline (decision-time — agents need section names to verify completeness); this file holds the verbatim markdown template.

```markdown
## Confluence Documentation

### Page: [Page Title]
**URL**: [URL]
**Space**: [Space Key]
**Labels**: [Labels]
**Updated**: [Date]
**Type**: Parent / Child of [Parent Title]
**Status**: retrieved | `<restricted by permissions>` | `[empty page]`

#### Content
[Full page content in markdown, with `<safety_boundaries>` redactions applied. Truncated pages are marked with `[truncated at ~5000 words; <description of what was omitted>]`. Restricted pages show `<restricted by permissions> — body not retrievable with configured Confluence MCP credentials`.]

#### Child Pages
- [Child Title] — [URL]
(or `None — no children exposed by API`)

---
[Repeat for each page]

### Search Provenance (when no URL was supplied)
- **CQL query**: [exact CQL string used in step 2.2, or `N/A — URL-driven retrieval`]
- **Top-N page IDs**: [comma-separated IDs in ranked order]
- **Ranking applied**: title-match > label-match > body-match (with MCP relevance + recency as in-tier tiebreaker)

### Gaps
[List of empty / restricted / unresolvable pages. Format: `- <page URL or title>: <reason — empty / restricted / not-accessible / cross-domain>`. If none, write: `None.`]

### Sensitive-content redactions
[List of any pages where `<safety_boundaries>` redaction was applied. Format: `- <page title>: <redaction marker> (reason: credential / PII / credentialed URL / connection string / etc.)`. If none, write: `None.`]
```

---

## Malformed-input triggers (referenced from `<input_contract>`)

Loaded on demand when an input shape needs validation. The base SKILL.md keeps the operational rule + accepted-input table inline (decision-time); this section holds the per-trigger enumeration the agent grep-checks at validation time.

The malformed-input check runs **BEFORE any MCP call**. Failure routes to `<failure_handling>` ("Input unresolvable" for parse/shape failures, "Cross-domain URL" for host mismatch):

- **No inputs supplied** (no URL, no ID, no search terms) → unresolvable.
- **URL provided but unparseable** (no host, no `pageId` / `/pages/<ID>` / `/x/<short-id>` segment) → unresolvable.
- **URL host does NOT match the configured MCP's site** → routes to "Cross-domain URL" (distinct from unresolvable).
- **Page ID supplied but does not match the host's expected ID shape** (digits-only on Cloud, alphanumeric on some Server installs) → unresolvable.

The skill MUST NOT attempt retrieval against malformed input — that produces silent zero-result branches downstream that look like "no pages found" when the real cause is bad input parsing.
