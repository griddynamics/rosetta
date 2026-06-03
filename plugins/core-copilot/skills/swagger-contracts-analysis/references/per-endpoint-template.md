# Per-Endpoint Contract Template — swagger-contracts-analysis

Loaded on demand from SKILL.md `<output_format>` when actively writing a contract entry. The base SKILL.md keeps the field-name list + section-presence rule inline (decision-time content the agent needs every call); this file holds the verbatim markdown template the agent fills in at write time.

Mirrors the same lazy-loading pattern `references/canonical-example.md`, `references/failure-handling-edge-cases.md`, and `references/redaction-catalog.md` already use.

---

## Per-endpoint markdown template (referenced from SKILL.md `<output_format>`)

One contract entry per target endpoint. The calling workflow supplies the destination file path (commonly `agents/qa/{IDENTIFIER}/api-analysis.md`).

````markdown
## Endpoint Contract: <METHOD> <path>

**Source:** swagger | code | hybrid (both used)
**Summary:** [one-line summary from spec / docstring / N/A]
**Tags / Groups:** [functional grouping or N/A]

### Parameters

**Path parameters:**
| Name | Type | Required | Constraints |
|------|------|----------|-------------|
| ...  | ...  | ...      | ...         |

(or `None` if endpoint has no path parameters)

**Query parameters:** (same table shape, or `None`)

**Header parameters:** (same table shape, or `None`)

### Request Body

**Content-Type:** [e.g. `application/json`, `multipart/form-data`, or `N/A — no body`]

**Schema:**
```json
{ ... }
```

**Example:**
```json
{ ... }
```

### Responses

| Status | Content-Type | Schema | Example |
|--------|-------------|--------|---------|
| ...    | ...         | ...    | ...     |

### Auth

- **Mechanism:** [Bearer JWT / OAuth2 / API Key / Basic / Session-Cookie / None]
- **Required scopes / permissions:** [list or N/A]
- **Public endpoint:** [yes / no]

### Data Dependencies

- **Preconditions:** [required DB state, entity relationships, ordering]
- **Side effects:** [what is created / modified / deleted]
- **Idempotent:** [yes / no, with rationale if non-obvious]

### Source Citations

- Swagger: [json/yaml path expression, e.g. `paths./api/v1/orders/{orderId}.get`] or `N/A`
- Code: [file paths + line numbers for handler + DTO/models] or `N/A`

### Notes / Discrepancies

[Spec-vs-code mismatches, deprecated markers, missing field schemas, auth differences between spec and code. If none: `None.`]
````

The example file (`references/canonical-example.md`) shows one complete worked entry — covers the `Source: hybrid` path with a real spec-vs-code discrepancy. Use it when authoring the first contract entry of a new project, or when this template leaves field-shape questions ambiguous.
