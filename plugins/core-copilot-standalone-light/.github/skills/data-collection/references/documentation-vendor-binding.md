# Vendor binding: Documentation vendor

**Canonical Wiki example: Confluence.** Capabilities and worked URL/query shapes below illustrate Confluence. For another Wiki, preserve the role contract and adapt handles/URLs, requests/calls, query language, fields, errors, and terminology to that system.

**Operations below are named by capability, not by a fixed tool name.** Resolve each through the configured Wiki integration: **get page**, **list child pages**, **search** (structured query or free text), and -- write, forbidden in this read-only binding -- **create / update page / add comment**.

---

## Input parsing

The phase supplies one input form; validate shape BEFORE any integration call (malformed input → failure path "input-unresolvable"; host mismatch → "cross-domain URL"). Never retrieve against malformed input (it produces silent zero-result branches that look like "no pages found").

| Input form | Example shape (Confluence) | Validation |
|---|---|---|
| Page ID | numeric (Cloud) or alphanumeric (some Server) | non-empty + matches host ID format |
| Page URL (any form) | display `…/wiki/spaces/<SPACE>/pages/<ID>/<slug>`, direct `…?pageId=<ID>`, or short `…/x/<short-id>` | extract the provider's stable page handle; host MUST match the configured integration site |
| Search terms | keywords / labels / components / project key | ≥1 keyword OR ≥1 label/component/project key |

The example-shape column illustrates the canonical vendor; a different backend uses its own URL forms -- match by capability (a page reference vs. search terms), not by these literal shapes.

Store each page under a **stable canonical reference** the backend guarantees (for Confluence, `/spaces/<KEY>/pages/<numeric-id>`). When the supplied form differs (display/short), store that canonical reference AND record the original pasted form in the page entry so reviewers can trace what was pasted.

## Retrieval & harvesting discipline (`extract + normalize` step)

**Direct-URL path (preferred when URLs/IDs supplied):**
1. **Get page** for each supplied page -- convert the body to markdown and include metadata.
2. **List child pages** -- fetch up to 5 relevant child pages per parent, recursing to leaves or the phase's depth cap. Ask once for child links (or approval to continue parent-only) and record the decision (`Children fetched: yes | no (reason)`) when the API does not expose child relationships and children are still plausible.

**Search path (when no URLs supplied):**
1. Build a **scoped search query** -- combine a space/scope filter AND a label/term predicate. **Always scope to the project space when its key is known** (dominant noise reducer; unscoped search breaks deterministic ranking). Express it in the backend's query language; for Confluence that is CQL:
   - Worked (CQL): `space = PROJ AND (label = "feature-x" OR text ~ "checkout refund")`
   - Fallback (labels unknown): `space = PROJ AND text ~ "<key-term>"`
2. **Search** with that query (cap ~10 results). Zero results → jump to the fallback GATE (ask the user first); only after the user supplies nothing does the "zero-pages" failure stop apply.
3. **Deterministic ranking** -- fixed priority `title-match > label-match > body-match`; in-tier tiebreaker = provider relevance score / recency. Record the query + top-N page IDs + ranking in the artifact's `Search Provenance` section for reproducibility.
4. Retrieve top 3–5 pages via **get page** (same error branches as the direct path), then their child pages.

**Cross-system:** when this binding runs beside an Issue Tracker or TMS, derive search terms from upstream labels, components, titles, and summary keywords already present in context.

**Normalization discipline:**
- **Truncate** pages over the phase's word budget (default ~5000 words); insert a banner naming the budget, the section where truncation happened, and the omitted section headings, e.g. `<!-- truncated: 5000-word budget reached at section 'Deployment Steps'; remaining 3 sections omitted: 'Monitoring', 'Rollback', 'Appendix' -->`. Keep headings + first sections intact.
- **Deduplicate** by canonical URL; merge parents before children unless the phase overrides.

## Per-page branch (normalize into the phase's section)

- **Present + content non-empty** → include (Page header: URL / Space / Labels / Updated / Type / Status; `#### Content`; `#### Child Pages`); redact body first.
- **Permission-restricted** (body 401/403 or provider equivalent) → `<restricted by permissions> -- body not retrievable with configured Wiki credentials` + a gap entry. Restricted is NOT empty content.
- **Content empty** (retrieved but body empty) → `[empty page]` marker + gap. Do NOT fabricate.

**Rendered example** (one normalized page entry in the phase's output artifact):

```markdown
#### Checkout Refund Flow  (/spaces/PROJ/pages/12345)
- **Space / Labels / Updated / Type / Status:** PROJ / `refund`, `checkout` / 2026-04-18 / page / current
#### Content
Refunds are issued via POST /api/v1/orders/{id}/refund; a paid order transitions PAID → REFUNDED…
#### Child Pages
- Refund Edge Cases (/spaces/PROJ/pages/12346)
```

## Redaction targets

Highest-risk: **page bodies** (runbooks/ops notes embed secrets; incident write-ups embed PII). Redact per SKILL `<collection>` step 4. Verbatim structure (adds to step 4's generic list): headings, business-rule prose, in-site link targets, glossary entries.

## Failure paths (SKILL `extract` step)

- **Input unresolvable** → stop, report `data-collection/<wiki>: input unresolvable -- supply a page handle/URL or search terms`, ask. Do NOT guess.
- **Integration not configured/authenticated** → stop, report `data-collection/<wiki>: configured Wiki integration is unavailable or unauthenticated`. Do NOT call a zero-page artifact complete.
- **Transport error** → retry once, then stop + report; ask to verify the configured Wiki integration.
- **Page not found** → stop, report `data-collection/<wiki>: page <handle/url> not found -- verify the reference and access`; do not treat it as empty content.
- **Authorization failure on all pages** → stop, report `data-collection/<wiki>: request rejected -- pages may exist but are not visible to configured credentials`; ask to verify access.
- **Cross-domain URL** (host differs from the configured provider site) → the URL is still valid provider evidence; try the matching available integration once. On failure, report the host mismatch and ask for an accessible equivalent or approval to continue without that Wiki source. Do not bypass access controls.
- **Zero pages after URL + search + user-fallback exhausted** → the fallback GATE asks the user FIRST; only if the user supplies neither URLs nor approval-to-skip does this stop fire. On user "skip / proceed without docs" → record `Documentation: not available -- user approved no-docs continuation` + a gap, proceed with an empty Documentation block. Do NOT fabricate.

## Output sections (within the phase-owned artifact)

This binding emits, in order: per-page entries (per the per-page branch above); `Search Provenance` (search query + top-N IDs + ranking, or `N/A -- URL-driven retrieval`); `Gaps` (empty/restricted/cross-domain pages, or `None.`); redaction section (or `None.`). Every section present; empties use `None.`.

## Validation items (binding-specific, added to SKILL `<validation_checklist>`)

- Every stored page lists title, canonical URL, and parent/child relationship when applicable.
- Child pages checked for each parent OR waived via the ask-once GATE with the decision recorded.
- Truncated pages carry the omission banner.
- Zero-result / no-docs path ends in an explicit recorded user decision, not a silent empty.
- Permission-restricted pages recorded as `<restricted by permissions>`.
- Search Provenance populated whenever the search path ran.
- Read-only: none of the forbidden write operations (see Operations) was called.
