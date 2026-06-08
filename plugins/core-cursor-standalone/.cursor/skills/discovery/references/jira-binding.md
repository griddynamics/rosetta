# Vendor binding: Jira (issue / TMS)

Loaded on demand by `discovery` SKILL.md `<data_collection>` step 2 when the phase resolves the `jira` binding. Holds the Jira-specific MCP call shapes, input parsing, field map, redaction targets, failure paths, and validation items. The base SKILL.md owns the general method (extract → normalize → redact → write) and the phase-is-SSoT rule — not restated here.

---

## Input parsing (SKILL step 1)

The phase supplies a ticket key or URL. Resolve the canonical key:

- **Plain key** `PROJ-123` → use directly.
- **URL** `https://jira.company.com/browse/PROJ-123` or `https://*.atlassian.net/browse/PROJ-123` → parse the `PROJ-NNN` segment.
- **Ambiguous / missing / malformed** → stop per failure path "input-unresolvable". Do NOT guess or pick an arbitrary key.

## Retrieval (SKILL step 3)

```
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

## Redaction targets (SKILL step 4 → `sensitive-data`)

Description and each comment body are highest-risk (Jira tickets routinely embed credentials + PII in stack-trace dumps and customer reports). Scan every captured value:

- **Credentials / tokens / keys / passwords / OAuth secrets** — grep `Bearer `, `Authorization:`, `password:`, `api_key=`, `access_token=`, `client_secret=`, JWT `eyJ...`, `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY` → `<redacted: bearer token>` / `<redacted: API key>` / `<redacted: password>` / `<redacted: client secret>`.
- **Credentialed / signed URLs** — `https://user:pass@host/...`, `?X-Amz-Signature=`, `?sig=`, `?token=` → redact the `user:pass@` segment or secret query param; host + path stay verbatim.
- **DB connection strings** — `postgresql://user:pass@host/db`, `mongodb+srv://user:pass@...` → redact the credential portion only.
- **PII** — real emails (non-`example.com`/`example.org`), phones (outside `+1-555-0100`–`0199`), card shapes `\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`, real names/account/government IDs in customer-report tickets → `<redacted: PII — <category>>`.
- **Structural content stays verbatim** — feature names, endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes. Redaction targets sensitive VALUES, not the structural ticket description.

Record each redaction in the artifact's redaction section; if a real production value would be the natural example, substitute a clearly-fake placeholder of the same shape.

## Failure paths (SKILL step 3)

- **Input unresolvable** (no/malformed key, URL not a recognizable Jira pattern) → stop, report `discovery/jira: ticket key unresolvable from input "<input>"`, ask the phase/user for a canonical `PROJ-NNN` or URL. Do NOT guess.
- **MCP transport error** (timeout / 5xx / connection drop) → retry once; second failure → stop, report the error, ask to verify Jira MCP configuration.
- **Ticket-not-found** (404 / empty / "issue does not exist") → stop, report `discovery/jira: ticket <KEY> not found — verify the key`. Do NOT emit a partial artifact.
- **Authorization failure** (401/403) → stop, report `discovery/jira: Jira rejected the request — ticket <KEY> may exist but is not visible to the configured credentials`, ask to verify credentials / project access.
- **Required field empty / permission-restricted / `jira_search_fields` discovery failure** → per the field-map per-field branch above (continue + gap, do not stop).

## Validation items (binding-specific, added to SKILL `<validation_checklist>`)

- `jira_get_issue` returned a non-empty issue object, else a failure path was followed instead.
- Summary + Description present or in gaps; every empty/restricted required field in gaps.
- Comment cap ≤10 honored with the overflow gap note when more exist.
- Custom-field discovery attempted on cryptic `customfield_NNNNN` IDs.
- Read-only: no `jira_create_issue` / `jira_update_issue` / `jira_transition_issue` / `jira_add_comment` or equivalent write call was made.
</content>
