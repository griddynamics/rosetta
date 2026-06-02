---
name: confluence-source-harvesting
description: "Rosetta playbook for pulling Confluence content reliably: direct URLs vs search, child pages, truncation, URL shapes, and permission fallbacks — pair with TMS/Jira collection per workflow."
license: Apache-2.0
tags: ["workflow", "confluence", "mcp", "documentation"]
baseSchema: docs/schemas/skill.md
---

<confluence_source_harvesting>

<role>

Documentation miner who respects Confluence hierarchy, size limits, and MCP boundaries.

</role>

<when_to_use_skill>

Use whenever a workflow enriches tickets or tests with Confluence pages (alone or beside Jira/TestRail). Reduces missed child pages and silent truncation surprises.

</when_to_use_skill>

<core_concepts>

- Run only after Rosetta prep is complete (`load-context` included)
- Parent workflow selects MCP skills (e.g. `mcp-confluence-data-collection`); this skill defines cross-workflow harvesting discipline
- Jira/TestRail ticket extraction stays in workflow-specific steps; combine outputs after both sides run

</core_concepts>

<input_contract>

All inputs are supplied by the parent workflow phase file. This skill does not infer them — missing required values trigger `<failure_handling>` stops.

| Input | Required? | Source | Used by |
|---|---|---|---|
| Confluence MCP skill name | **required** | Parent workflow phase file (e.g. `mcp-confluence-data-collection`) | Step 1 (fetch by URL/ID) + step 4 (search) — the underlying MCP transport |
| Output artifact path | **required** | Parent workflow phase file | Step 10 summary write + every page-entry embedding (see `<templates>`) |
| Configured Confluence site / base URL | **required** | The MCP skill's configuration | Step 8 (domain-match gate) |
| User-supplied Confluence URLs / page IDs | optional | User prompt OR parent-supplied artifact | Step 1 (direct fetch); when present, search path is secondary |
| Ticket fields (labels, components, summary, keywords) | optional but **required if no URLs supplied** | Upstream Jira / TestRail extraction OR user prompt | Step 4 (derive search terms) |
| Word / depth budget | optional (default `~5000 words per page`, depth = follow children to leaves) | Parent workflow phase file | Step 6 truncation + step 2 recursion cap |
| Permission to proceed without documentation | required if step 5 returns zero pages | User answer to the step 5 ask-once GATE | Records ticket-only continuation in the artifact |

**Note on the configured site/base URL:** the value lives in the MCP skill's own configuration, not in this skill. Step 8's domain-match gate consults whatever the MCP exposes for its target site.

**Required-input failure rule.** If the parent did not name a Confluence MCP skill, or did not supply an output path, this skill cannot run — apply `<failure_handling>` "missing required input". Do NOT pick a default MCP name and do NOT write to a guessed path.

**Optional-input branching.** When neither user URLs nor ticket fields are available, the skill cannot start step 1 OR step 4 — stop and ask the parent workflow to supply at least one. No silent zero-page emit.

</input_contract>

<process>

1. If the user supplied Confluence URLs or page IDs, fetch those pages first with the configured Confluence MCP.
2. Fetch child pages recursively when exposed by the API, stopping at leaves or the parent workflow depth cap.
3. GATE: if the API does not expose child relationships for a parent page and children are still plausible, ask once for child-page links (or approval to continue parent-only), then record that decision in the artifact.
4. If no URLs were supplied, derive search terms from the ticket (labels, components, summary keywords) and run search; record terms used in the raw artifact.
5. GATE: if search returns zero pages, ask once for explicit URLs or permission to proceed ticket-only; document the user choice.
6. Apply truncation: if a page exceeds the parent workflow's word budget (default ~5000 words unless overridden), truncate with a clear banner and keep headings + first sections intact when possible. **Banner example + required fields** in [references/redaction-and-normalization.md](references/redaction-and-normalization.md#truncation-banner-example-referenced-from-step-6) — load on demand.
7. Normalize links: accept display URLs, direct `/wiki/` URLs, and short links; log the canonical URL stored. The canonical form is `/spaces/<KEY>/pages/<numeric-id>`. **Worked example pair** (display URL + tinyurl → canonical form) in [references/redaction-and-normalization.md](references/redaction-and-normalization.md#canonical-vs-display-url-normalization-example-pair-referenced-from-step-7) — load on demand.
8. GATE: if a URL domain does not match the configured MCP site, warn and try once; on failure, ask for an accessible link or export.
9. Deduplicate by canonical URL; merge parents before children unless the parent workflow overrides.
10. Summarize in the raw artifact: page count, children discovered, truncation flags, search terms, failures.

</process>

<safety_boundaries>

Harvested Confluence content lands in a **tracked artifact** the parent workflow feeds to downstream phases (requirements synthesis, test design, gap analysis). Treat the artifact as **PUBLIC by default** — may end up in version control, shared with reviewers, or re-emitted into requirements.md / test-scenarios.md.

**Operational rules** (kept inline — these are decision-time rules an agent needs without lazy-loading):

- **Redact credentials, tokens, DB connection strings, and PII before storing.** Confluence pages routinely embed real secrets (pasted runbooks, ops notes, onboarding docs) and customer PII (incident write-ups, customer reports). Apply redaction at fetch time, not after.
- **Permission errors are not "empty content".** A 401/403 from the MCP means the configured credential lacks access — the page may exist with content this skill should NOT silently treat as missing. Apply `<failure_handling>` "MCP authorization failure".
- **Do not fetch outside the configured MCP site** (reinforces step 8 GATE). Cross-site URLs the user supplies are not authorized to be fetched by this skill — ask the user for an export or an in-site equivalent.
- **Structural content is safe** — page titles, headings, business-rule prose, screenshots descriptions, link targets to other in-site pages, ticket references, and glossary entries are recorded verbatim. Redaction targets sensitive **values**, not the structural documentation.

**Detail moved to references** (load on demand when actively applying redaction): the **canonical credential + PII grep pattern list**, the **placeholder vocabulary table**, the **structural-content rule with shape-preserving placeholder guidance**, and the **credentialed-URL + signed-URL parameter redaction patterns** all live in [references/redaction-and-normalization.md](references/redaction-and-normalization.md#credential--pii-grep-pattern-list-referenced-from-safety_boundaries) — the single source of truth for which patterns to grep and which placeholders to use.

</safety_boundaries>

<failure_handling>

Single source of truth for stop / ask behaviors. The process-step GATEs (3, 5, 8) point here; this block names all branches. Redaction is owned by `<safety_boundaries>` — not restated here.

- **MCP not configured / not authenticated** (the MCP skill the parent named cannot connect, returns an unauthenticated error, or is absent from the loaded skill set): stop, report `confluence-source-harvesting: Confluence MCP not configured or not authenticated — verify parent's named MCP skill (<name>) is loaded and authenticated` to the parent workflow, ask the user to fix MCP configuration. Do NOT emit a zero-page artifact and call the phase done.
- **MCP authorization failure on a specific page** (401/403 mid-harvest): record the failure in the artifact for that page as `Permission denied: <URL> — credential lacks access; page MAY exist with content this skill could not retrieve` (per the `<safety_boundaries>` "permission errors are not empty content" rule). Continue with the remaining pages. If ALL fetches fail with auth errors, treat as the "MCP not authenticated" case above.
- **Parent did not name a Confluence MCP skill:** stop, report `confluence-source-harvesting: parent workflow did not bind a Confluence MCP skill — see <input_contract>`, ask the user / parent to specify. Do NOT pick a default like `mcp-confluence-data-collection` silently.
- **Output artifact path missing** from parent inputs: stop, report `confluence-source-harvesting: output artifact path not supplied — see <input_contract>`. Do NOT pick a default path; downstream phases will read this from the location the parent named.
- **Step 3 GATE — children plausible but API doesn't expose them:** apply the inline ask-once rule; record the user's decision (waive children vs supply explicit child links) in the artifact's `Children fetched: yes | no (reason)` field.
- **Step 5 GATE — search returns zero pages:** apply the inline ask-once rule. Acceptable outcomes: user supplies explicit URLs (resume step 1 with those), or user approves ticket-only continuation (record `Documentation: not available — user approved ticket-only continuation` in the artifact summary). If neither user URLs nor ticket fields are available, this branch cannot run at all — apply `<input_contract>` optional-input branching rule.
- **Step 8 GATE — URL domain doesn't match configured MCP site:** apply the inline warn-and-retry-once rule. On retry failure, ask the user for an accessible in-site link or an export. Do NOT bypass to a cross-site fetch.
- **Truncation budget exceeded for every retrieved page:** the parent's word budget was set unreasonably low (every page is being truncated to near-zero). Continue with truncation but record a summary note: `Truncation budget warning: <N>/<total> pages truncated — parent budget may be too restrictive`.

</failure_handling>

<success_criteria>

High-level done-condition. Item-level checks live in `<validation_checklist>` (canonical).

**Complete when:** every user-supplied URL / derived page was fetched and embedded as a `<templates>` page entry (or, if no URLs were supplied, the step 4 search ran and its results were fetched), children were checked for each parent OR waived via the step 3 GATE with the user's decision recorded, truncation per step 6 was applied with the banner when budgets were exceeded, redaction per `<safety_boundaries>` ran against every stored page body, the step 10 summary (page count, children discovered, truncation flags, search terms, failures) was written to the parent-supplied artifact path — OR a `<failure_handling>` stop path was followed (missing required input, MCP not configured / not authenticated, step 5 zero-results with neither URLs nor ticket fields available, step 8 cross-site URL the user declined to replace) and the parent workflow was notified.

**NOT complete** if any of the following — each is a regression the `<validation_checklist>` catches at end-of-run, but this block names them as completion-gate failures so a partial harvest is not silently accepted as done:

- **Silent zero-page emit** — the artifact lists zero pages without an explicit user decision recorded (ticket-only continuation OR step-5 GATE outcome OR auth-failure path).
- **Children skipped without an approval record** — parents were stored but step 3's `Children fetched: yes | no (reason)` field is blank or missing on any parent entry.
- **Permission errors hidden as empty content** — any 401/403 surfaced as "no content" rather than `Permission denied: <URL>` per `<safety_boundaries>` "permission errors are not empty content".
- **Required `<input_contract>` input missing yet artifact was written** — MCP skill name or output artifact path was not supplied by the parent and the phase still emitted a result instead of stopping per `<failure_handling>`.
- **Redaction scan skipped** — credential / PII patterns from the `<safety_boundaries>` policy were not grepped against stored page bodies before write.

</success_criteria>

<validation_checklist>

- Every stored page lists title, canonical URL, and parent/child relationship when applicable
- Child pages were checked for each retrieved parent unless user waived with explicit approval
- Truncated pages are labeled with what was omitted
- Zero-result/no-documentation paths end in explicit user decision (ticket-only continuation) recorded in the artifact
- **Required `<input_contract>` inputs verified:** MCP skill name + output artifact path were both supplied by the parent and resolved before step 1 ran. Either of them missing means the phase should have stopped per `<failure_handling>`, not produced this artifact.
- **`<safety_boundaries>` redaction scan ran** against every stored page body; applied redactions noted inline.
- **Permission errors recorded, not hidden** per `<safety_boundaries>` "permission errors are not empty content" — any 401/403 page appears with `Permission denied: ...` rather than empty content.

</validation_checklist>

<best_practices>

- Prefer user-provided canonical links when search noise is high
- Capture space key and last-updated metadata when available for traceability

</best_practices>

<pitfalls>

- Assuming Confluence HTML renders identically to markdown — note rendering gaps
- Stopping at the first parent when children hold acceptance criteria

</pitfalls>

<resources>

- skill `questioning` — targeted follow-ups when discovery is ambiguous
- skill `hitl` — explicit approval for proceeding without documentation
- Parent workflow — which MCP Confluence skill name to invoke and output file path

</resources>

<templates>

- Page entry (embed in parent artifact):

```markdown
### [Page title]
- URL: [canonical]
- Parent: [title or none]
- Retrieved: [ISO-8601]
- Children fetched: yes | no (reason)
- Truncated: yes | no (word count / limit)
#### Content
[markdown body]
```

</templates>

</confluence_source_harvesting>
