# Vendor binding: Documentation vendor

Loaded on demand by `data-collection` SKILL.md `<collection>` when the phase resolves the documentation vendor binding. **Canonical example: Confluence** -- capabilities (page fetch / CQL search / child pages) and harvesting discipline below use Confluence; for another backend (Notion, SharePoint, wiki) map by capability, same method. Base SKILL.md owns the general method -- not restated here.

**Operations below are named by capability, not by a fixed tool name.** Resolve each to the actual tool exposed by the configured documentation MCP binding: **get page**, **list child pages**, **search** (CQL/text), and -- write, forbidden in this read-only binding -- **create / update page / add comment**.

---

## Input parsing

The phase supplies one input form; validate shape BEFORE any MCP call (malformed input → failure path "input-unresolvable"; host mismatch → "cross-domain URL"). Never retrieve against malformed input (it produces silent zero-result branches that look like "no pages found").

| Input form | Accepted shape | Validation |
|---|---|---|
| Page ID | numeric (Cloud) or alphanumeric (some Server) | non-empty + matches host ID format |
| URL -- display | `https://<host>.atlassian.net/wiki/spaces/<SPACE>/pages/<ID>/<slug>` | parse host+space+ID; host MUST match configured MCP site |
| URL -- direct | `https://<host>/wiki/pages/viewpage.action?pageId=<ID>` | parse `pageId`; host MUST match |
| URL -- short | `https://<host>/x/<short-id>` | resolve via MCP; host MUST match |
| Search terms | keywords / labels / components / project key | ≥1 keyword OR ≥1 label/component/project key |

Canonical storage form for any URL is `/spaces/<KEY>/pages/<numeric-id>`. When the supplied form differs (display/short), store the canonical form AND record the original-form in the page entry so reviewers can trace what was pasted.

## Retrieval & harvesting discipline (SKILL `extract` step)

**Direct-URL path (preferred when URLs/IDs supplied):**
1. **Get page** for each supplied page -- convert the body to markdown and include metadata.
2. **List child pages** -- fetch up to 5 relevant child pages per parent, recursing to leaves or the phase's depth cap. If the API does not expose child relationships and children are still plausible, ask once for child links (or approval to continue parent-only) and record the decision (`Children fetched: yes | no (reason)`).

**Search path (when no URLs supplied):**
1. Build a CQL query -- combine the space filter AND a label/term predicate. **Always include `space =` when the project key is known** (dominant noise reducer; unscoped search breaks deterministic ranking).
   - Worked: `space = PROJ AND (label = "feature-x" OR text ~ "checkout refund")`
   - Fallback (labels unknown): `space = PROJ AND text ~ "<key-term>"`
2. **Search** with the CQL query (cap ~10 results). Zero results → jump to the fallback GATE (ask the user first); only after the user supplies nothing does the "zero-pages" failure stop apply.
3. **Deterministic ranking** -- fixed priority `title-match > label-match > body-match`; in-tier tiebreaker = MCP relevance score / recency. Record the CQL + top-N page IDs + ranking in the artifact's `Search Provenance` section for reproducibility.
4. Retrieve top 3–5 pages via **get page** (same error branches as the direct path), then their child pages.

**Cross-vendor:** when this binding runs beside Jira/TestRail, derive search terms from the upstream ticket (labels, components, summary keywords) the phase passes in; the phase owns merging the documentation section with the ticket section.

**Normalization discipline:**
- **Truncate** pages over the phase's word budget (default ~5000 words); insert a banner naming the budget, the section where truncation happened, and the omitted section headings, e.g. `<!-- truncated: 5000-word budget reached at section 'Deployment Steps'; remaining 3 sections omitted: 'Monitoring', 'Rollback', 'Appendix' -->`. Keep headings + first sections intact.
- **Deduplicate** by canonical URL; merge parents before children unless the phase overrides.

## Per-page branch (normalize into the phase's section)

- **Present + content non-empty** → include (Page header: URL / Space / Labels / Updated / Type / Status; `#### Content`; `#### Child Pages`); redact body first.
- **Permission-restricted** (body 401/403 OR MCP indicates restriction) → `<restricted by permissions> -- body not retrievable with configured Confluence MCP credentials` + a gap entry. A 401/403 is NOT empty content; never silently treat as missing.
- **Content empty** (retrieved but body empty) → `[empty page]` marker + gap.

**Rendered example** (one normalized page entry in `raw-data.md`):

```markdown
#### Checkout Refund Flow  (/spaces/PROJ/pages/12345)
- **Space / Labels / Updated / Type / Status:** PROJ / `refund`, `checkout` / 2026-04-18 / page / current
#### Content
Refunds are issued via POST /api/v1/orders/{id}/refund; a paid order transitions PAID → REFUNDED…
#### Child Pages
- Refund Edge Cases (/spaces/PROJ/pages/12346)
```

## Redaction targets (SKILL `redact` step → `sensitive-data`)

Highest-risk: **page bodies** (runbooks/ops notes embed secrets; incident write-ups embed PII). Redact per SKILL `<collection>` step 4. Verbatim structure (adds to step 4's generic list): headings, business-rule prose, in-site link targets, glossary entries.

## Failure paths (SKILL `extract` step)

- **Input unresolvable** (no URL/ID/terms, or URL unparseable) → stop, report `data-collection/confluence: input unresolvable -- supply page URL/ID or search terms`, ask. Do NOT guess.
- **MCP not configured / not authenticated** → stop, report `data-collection/confluence: Confluence MCP not configured or not authenticated -- verify MCP setup`. Do NOT emit a zero-page artifact and call it done.
- **MCP transport error** → per SKILL `<collection>` step 3 (retry once, then stop + report); ask to verify MCP connectivity.
- **Page not found** (404 / deleted, for a supplied page ID or URL) → stop, report `data-collection/confluence: page <id/url> not found -- verify the ID/URL is correct and accessible`, ask. Do NOT treat as an empty page or silently gap it. (Applies to direct URL/ID retrieval; missing search hits use the zero-pages GATE below.)
- **Authorization failure** (401/403 on ALL pages) → stop, report `data-collection/confluence: request rejected -- page(s) may exist but not visible to configured credentials`, ask to verify credentials / space access. (Per-page 401/403 with others succeeding → per-page branch above, not a global stop.)
- **Cross-domain URL** (host ≠ configured MCP site) → warn + try once; on failure stop the fetch, report `URL <url> belongs to a different Confluence host (<domain>) than the configured MCP -- ask user for an in-site equivalent or accept ticket-only continuation`. Do NOT bypass to a cross-site fetch.
- **Zero pages after URL + search + user-fallback exhausted** → the fallback GATE asks the user FIRST; only if the user supplies neither URLs nor approval-to-skip does this stop fire. On user "skip / proceed without docs" → record `Documentation: not available -- user approved no-docs continuation` + a gap, proceed with an empty Documentation block. Do NOT fabricate.
- **Get page returns empty body** → `[empty page]` marker + gap. Do NOT fabricate.

## Output sections (within the phase-owned artifact)

The phase owns the artifact path + heading; this binding emits, in order: per-page entries (header + `#### Content` + `#### Child Pages`); `Search Provenance` (CQL + top-N IDs + ranking, or `N/A -- URL-driven retrieval`); `Gaps` (empty/restricted/cross-domain pages, or `None.`); redaction section (or `None.`). Every section present; empties use `None.`.

## Validation items (binding-specific, added to SKILL `<validation_checklist>`)

- Every stored page lists title, canonical URL, and parent/child relationship when applicable.
- Child pages checked for each parent OR waived via the ask-once GATE with the decision recorded.
- Truncated pages labeled with the banner naming what was omitted.
- Zero-result / no-docs path ends in an explicit recorded user decision, not a silent empty.
- Permission errors recorded as `<restricted by permissions>`, never masked as empty content.
- Search Provenance populated (CQL + top-N IDs + ranking) whenever the search path ran.
- Read-only: no **create / update page / add comment** (or equivalent) write call was made.
