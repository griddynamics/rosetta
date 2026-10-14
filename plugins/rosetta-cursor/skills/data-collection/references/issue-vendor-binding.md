# Vendor binding: Issue vendor

**Canonical Issue Tracker example: Jira.** The field map and worked key/URL shapes below illustrate Jira. For another Issue Tracker, preserve the role contract and adapt handles/URLs, requests/calls, fields, errors, and terminology to that system.

**Operations below are named by capability, not by a fixed tool name.** Resolve each through the configured Issue Tracker integration: **get issue** (with fields / expand / comment-limit), **search fields** (field-schema lookup), and -- write, forbidden in this read-only binding -- issue **create / update / transition / add comment**.

---

## Input parsing

The phase supplies an issue handle or URL. Apply the resolved Issue Tracker's identifier rules. Jira example:

- **Plain key** `PROJ-123` → use directly.
- **URL** `https://jira.company.com/browse/PROJ-123` or `https://*.atlassian.net/browse/PROJ-123` → parse the `PROJ-NNN` segment.
- **Other Issue Tracker** → parse its stable issue number/key according to its canonical handle/URL shape.
- **Ambiguous / missing / malformed** → stop per failure path "input-unresolvable". Do NOT guess or pick an arbitrary issue.

## Retrieval (`extract + normalize` step)

**Get issue** by its canonical key. Fetch the whole issue -- do NOT restrict the response to a fixed field list; the field map below is the minimal set to normalize, not a retrieval filter. Request rendered fields (so HTML descriptions convert to markdown).

- **Custom fields:** use **search fields** to resolve names when the issue returns cryptic IDs (`customfield_10012`). Discovery failure → list the cryptic IDs + a gap note `Custom field schema unavailable -- field names may be cryptic`. Do not stop.
- **Comment cap:** at most 10 comments; if more exist, record a gap `Comments: showing 10 most recent; <total> total exist`.

## Field map (normalize into the phase's section)

| Field | Source | Notes |
|---|---|---|
| Ticket key + URL | input | canonical key + browse URL |
| Summary | `summary` | required; empty → gap |
| Type / Status / Priority | `issuetype` / `status` / `priority` | |
| Created / Updated | `created` / `updated` | |
| Description | `description` (rendered) | required; redact before write; empty → gap |
| Labels / Components | `labels` / `components` | `None` if absent |
| Assignee / Reporter | `assignee` / `reporter` | `<restricted by permissions>` if hidden; `None -- unassigned` if empty |
| Comments (≤10) | `comment` | per-comment author + date + body; redact bodies |
| Custom fields | `customfield_*` | resolve names via **search fields**; `None -- no custom fields populated` if empty |

Per-field branch per SKILL `<collection>` step 3; restricted-gap message: `<field>: not visible to configured Issue Tracker credentials`. Continue extraction.

**Rendered example** (a normalized Jira issue block in the phase's output artifact):

```markdown
### PROJ-123 — Login returns 500 on empty username
- **Type / Status / Priority:** Bug / In Progress / High
- **Summary:** Login page throws 500 on empty username
- **Description:** submitting the login form with a blank username returns HTTP 500 instead of a 400 validation error
- **Labels / Components:** `auth`, `login` / `api-gateway`
- **Comments (≤10):** 2 shown — @dev (2026-05-01): "repro confirmed on staging"
```

## Redaction targets

Highest-risk: the **description** and each **comment body** (embed credentials/PII in stack traces and customer reports). Redact per SKILL `<collection>` step 4; structure (feature names, endpoint paths, methods, status codes, field/schema names) stays verbatim.

## Failure paths (SKILL `extract` step)

- **Input unresolvable** → stop, report `data-collection/<issue-tracker>: issue handle unresolvable from input "<input>"`, ask for a canonical handle/URL for the resolved Issue Tracker.
- **Integration transport error** → retry once, then stop + report; ask to verify the configured Issue Tracker integration.
- **Issue-not-found** → stop, report `data-collection/<issue-tracker>: issue <handle> not found -- verify the reference`. Do NOT emit a partial artifact.
- **Authorization failure** (401/403 or provider equivalent) → stop, report `data-collection/<issue-tracker>: request rejected -- issue <handle> may exist but is not visible to the configured credentials`, ask to verify access.
- **Required field empty / permission-restricted / search-fields discovery failure** → per the field-map per-field branch above (continue + gap, do not stop).

## Validation items (binding-specific, added to SKILL `<validation_checklist>`)

- **Get issue** returned a non-empty issue object, else a failure path was followed instead.
- Summary + Description present or in gaps; every empty/restricted required field in gaps.
- Comment cap ≤10 honored with the overflow gap note when more exist.
- Custom-field discovery attempted on cryptic `customfield_NNNNN` IDs.
- Read-only: none of the forbidden write operations (see Operations) was called.
