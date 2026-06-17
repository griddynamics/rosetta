# Vendor binding: Jira (issue / TMS)

Loaded on demand by `discovery` SKILL.md `<data_collection>` step 2 when the phase resolves the `jira` binding. Holds the Jira-specific MCP call shapes, input parsing, field map, redaction targets, failure paths, and validation items. The base SKILL.md owns the general method (extract → normalize → redact → write) and the phase-is-SSoT rule — not restated here.

**MCP method names below (`jira_get_issue`, `jira_search_fields`, and the create/update/transition/comment write calls) are illustrative of one common Jira MCP server — not a hardcoded contract.** Resolve the actual tool from the configured Jira MCP binding; if it names operations differently, map by capability: get-issue (with fields/expand/comment-limit), field-schema lookup, and (write — forbidden in this read-only binding) issue create/update/transition/comment.

---

## Input parsing (SKILL step 1)

The phase supplies a ticket key or URL. Resolve the canonical key:

- **Plain key** `PROJ-123` → use directly.
- **URL** `https://jira.company.com/browse/PROJ-123` or `https://*.atlassian.net/browse/PROJ-123` → parse the `PROJ-NNN` segment.
- **Ambiguous / missing / malformed** → stop per failure path "input-unresolvable". Do NOT guess or pick an arbitrary key.

## Retrieval (SKILL step 3)

```
# illustrative — call the configured Jira MCP's get-issue tool; this literal name is not a contract
jira_get_issue(
    issue_key="PROJ-123",
    fields="summary,description,status,issuetype,assignee,priority,reporter,labels,components,created,updated",
    expand="renderedFields",
    comment_limit=10
)
```

- `expand="renderedFields"` so rendered-HTML descriptions can be converted to markdown.
- **Custom fields:** if the issue returns cryptic IDs (`customfield_10012`), call `jira_search_fields()` to resolve names. Discovery failure → list the cryptic IDs + a gap note `Custom field schema unavailable — field names may be cryptic`. Do not stop.
- **Comment cap:** at most 10 comments; if more exist, record a gap `Comments: showing 10 most recent; <total> total exist in Jira`.

## Field map (normalize into the phase's section)

| Field | Source | Notes |
|---|---|---|
| Ticket key + URL | input | canonical key + browse URL |
| Summary | `summary` | required; empty → gap |
| Type / Status / Priority | `issuetype` / `status` / `priority` | |
| Created / Updated | `created` / `updated` | |
| Description | `description` (rendered) | required; redact before write; empty → gap |
| Labels / Components | `labels` / `components` | `None` if absent |
| Assignee / Reporter | `assignee` / `reporter` | `<restricted by permissions>` if hidden; `None — unassigned` if empty |
| Comments (≤10) | `comment` | per-comment author + date + body; redact bodies |
| Custom fields | `customfield_*` | resolve names via `jira_search_fields`; `None — no custom fields populated` if empty |

Per-field branch: present + non-empty → include; empty/null → `None` + gap; permission-restricted → `<restricted by permissions>` + gap `<field>: not visible to configured Jira credentials`. Continue extraction.

**Rendered example** (a normalized Jira issue block in `raw-data.md`):

```markdown
### PROJ-123 — Login returns 500 on empty username
- **Type / Status / Priority:** Bug / In Progress / High
- **Summary:** Login page throws 500 on empty username
- **Description:** submitting the login form with a blank username returns HTTP 500 instead of a 400 validation error
- **Labels / Components:** `auth`, `login` / `api-gateway`
- **Comments (≤10):** 2 shown — @dev (2026-05-01): "repro confirmed on staging"
```

## Redaction targets (SKILL step 4 → `sensitive-data`)

Highest-risk Jira fields: the **description** and each **comment body** (tickets routinely embed credentials + PII in stack-trace dumps and customer reports). Scan every captured value and redact per the canonical scope — `qa-knowledge/references/redaction-scope.md` (sensitive values, shape-preserving placeholders, and the pre-emit re-scan list) — applied via `sensitive-data`. Structural content (feature names, endpoint paths, methods, status codes, field names, schema shapes) stays verbatim. Record each redaction in the artifact's redaction section.

## Failure paths (SKILL step 3)

- **Input unresolvable** (no/malformed key, URL not a recognizable Jira pattern) → stop, report `discovery/jira: ticket key unresolvable from input "<input>"`, ask the phase/user for a canonical `PROJ-NNN` or URL. Do NOT guess.
- **MCP transport error** (timeout / 5xx / connection drop) → retry once; second failure → stop, report the error, ask to verify Jira MCP configuration.
- **Ticket-not-found** (404 / empty / "issue does not exist") → stop, report `discovery/jira: ticket <KEY> not found — verify the key`. Do NOT emit a partial artifact.
- **Authorization failure** (401/403) → stop, report `discovery/jira: request rejected — ticket <KEY> may exist but is not visible to the configured credentials`, ask to verify credentials / project access.
- **Required field empty / permission-restricted / `jira_search_fields` discovery failure** → per the field-map per-field branch above (continue + gap, do not stop).

## Validation items (binding-specific, added to SKILL `<validation_checklist>`)

- `jira_get_issue` returned a non-empty issue object, else a failure path was followed instead.
- Summary + Description present or in gaps; every empty/restricted required field in gaps.
- Comment cap ≤10 honored with the overflow gap note when more exist.
- Custom-field discovery attempted on cryptic `customfield_NNNNN` IDs.
- Read-only: no `jira_create_issue` / `jira_update_issue` / `jira_transition_issue` / `jira_add_comment` or equivalent write call was made.
