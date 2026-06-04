# Failure Handling — Edge-Case Branches — swagger-contracts-analysis

Loaded on demand from SKILL.md `<failure_handling>` when one of these three lower-frequency conditions actually applies. The base SKILL.md keeps the common stops (endpoint-not-found, ambiguous routing, parsing failure) inline; this file holds the rarer branches that don't fire on most invocations.

Mirrors the same lazy-loading pattern already used by `references/redaction-catalog.md`.

---

## Spec-vs-code reconciliation conflict beyond Notes

**Trigger.** When SKILL.md `<process>` step 5.1 (Spec-vs-code cross-check, inside step 5 "Reconcile and Validate") finds discrepancies that the per-entry `Notes / Discrepancies` field can no longer reasonably hold:

- HTTP method differs between spec and code
- Required-field set differs by more than ~50%
- Status-code list disagrees on **success semantics** (not just edge cases — e.g., spec says 200, code returns 204 with a body)
- Schema shapes are structurally incompatible (e.g., spec declares a flat object, code returns nested envelope)

**Resolution rule.** Do NOT pick the documented side or the coded side as definitive. Instead:

1. Record both sides in `Notes / Discrepancies` with the verbatim discrepancies (don't paraphrase; include the JSONPath / file:line for each side).
2. Mark the entry's source as `Source: hybrid` with `Reconciliation: unresolved — see Notes`.
3. Surface to the calling workflow as a **Critical follow-up** so the workflow's downstream phases know this contract is contested. The workflow / user decides which side wins — this skill does NOT.

**Forbidden:** silently preferring one source. The Notes field MUST record both sides verbatim; the `Reconciliation: unresolved` marker is the explicit handoff signal.

---

## GraphQL API

**Trigger.** The target endpoint set is a GraphQL schema (introspection-discoverable or SDL-shipped), not REST. The REST-shaped per-endpoint output template does not fit one-to-one.

**Adaptation rules.**

1. **Discovery.** Use schema introspection — query the `__schema` introspection field via the GraphQL endpoint, OR read the SDL file if the project ships one. If introspection is disabled in production AND no SDL is shipped, apply the `<failure_handling>` "endpoint not found" branch (the contract is unobservable from this skill's perspective).
2. **Per operation, write one contract entry.** Each query / mutation / subscription becomes a contract entry. Include:
   - Operation name (e.g., `query getOrder`, `mutation createOrder`)
   - Arguments + types (the variables block)
   - Return type shape (the full nested type, expanded to the depth the spec/SDL provides)
   - Auth / directives (`@auth`, `@requireRole(...)`, etc.)
   - Citation (SDL file:line, OR introspection query that produced this entry)
3. **Reuse the per-endpoint template's structural fields** (no separate GraphQL template):
   - **Method** = `POST` to `/graphql` (always; GraphQL is single-endpoint over HTTP)
   - **Path** = the operation name (e.g., `getOrder`, `createOrder`)
   - **Request Body** = the operation's variables block
   - **Response** = the operation's return type shape
4. **Notes / Discrepancies** — record `Entry is GraphQL-shaped: operation type = query | mutation | subscription`. Subscription entries additionally note the transport (WebSocket / SSE / HTTP-streaming) because that affects how downstream test phases connect.

**Forbidden:** trying to invent REST-shaped paths from GraphQL operation names. GraphQL has one endpoint; the operation is the path-equivalent.

---

## Citation source unavailable

**Trigger.** An entry would otherwise be `Source: hybrid` (both spec and code consulted) but the second source is **intentionally not consulted** — e.g., the code is closed-source / out-of-scope for this skill's read access, or the user explicitly scoped the analysis to spec-only / code-only.

**Resolution rule.**

1. Mark the entry's source as the single source that was consulted:
   - `Source: swagger` if only the spec was read
   - `Source: code` if only the code was read
2. **Do NOT mark as `hybrid`** — the hybrid label implies both sources were consulted, which is the misleading-claim mode this rule guards against.
3. **Do NOT leave `Notes / Discrepancies` empty** when the partial-source scope was a recorded user / workflow decision. Note the scope decision in the entry's Notes field so reviewers can trace why only one source informed the contract — e.g., `Scope: spec-only per calling workflow request (code is closed-source for this audit); spec-vs-code reconciliation not run for this entry.`

The Notes field is the audit trail; an empty Notes on a single-source entry is acceptable only when there was no explicit scope decision (e.g., the user simply didn't ask for hybrid reconciliation).

---

## Pitfalls catalog (referenced from SKILL.md `<pitfalls>`)

Loaded on demand when the agent is reviewing why an authored entry might be incomplete or wrong. The base SKILL.md keeps the canonical rules in `<process>` + `<safety_boundaries>` + `<success_criteria>` + `<failure_handling>`; this list points at those canonical homes.

- **Trusting Swagger blindly without cross-referencing code** → `<process>` step 5.1 reconciliation.
- **Skipping code-based analysis when Swagger is available** → `<process>` step 2 hybrid branch.
- **Missing per-endpoint auth requirements** → `<process>` step 3.
- **Ignoring data dependencies / creation order** → `<process>` step 4.
- **Treating GraphQL APIs as REST** → SKILL.md `<failure_handling>` "GraphQL API" edge-case pointer + the GraphQL section above.
- **Silent endpoint drop** → SKILL.md `<process>` step 5.2 (canonical coverage rule) + `<failure_handling>` "Endpoint not found" pointer.
- **Fabricated schema fields / status codes** → SKILL.md `<success_criteria>` no-fabrication rule (every field traces to spec/code or is marked `N/A — <reason>`).
- **Empty `Notes / Discrepancies` on hybrid entries** → SKILL.md `<success_criteria>` hybrid-Notes rule (explicit `None.` required when no mismatch).
- **Literal credentials / PII in artifact** → SKILL.md `<safety_boundaries>` redact-before-writing rule + `references/redaction-catalog.md` target list.

---

## Process step 5 expanded prose (referenced from SKILL.md `<process>` step 5)

The base SKILL.md keeps step 5 as four short numbered actions (5.1 cross-check, 5.2 coverage, 5.3 checklist, 5.4 emit). This section holds the per-action prose for grounding when the brief inline directives are not enough.

### 5.1 Spec-vs-code cross-check (when both are available)

For each endpoint, compare the Swagger spec against the code: are the same fields / types / required-flags / status codes / auth requirements present in both? Record every mismatch (additional validation in code not in spec, deprecated markers, missing response shapes, auth differences) in the **Notes / Discrepancies** section of that endpoint's contract entry.

Do NOT silently prefer one source over the other — declare the discrepancy explicitly so the calling workflow / reviewer can decide. When a discrepancy exceeds what Notes can hold (method differs, required-field set differs >50%, status-code success semantics disagree, schemas structurally incompatible), escalate per the `Spec-vs-code reconciliation conflict beyond Notes` edge-case section above.

### 5.2 Coverage check (canonical — single source of truth for the no-silent-drop rule)

Every endpoint in the target list supplied by the calling workflow MUST have a contract entry. Endpoints that could not be analyzed (not found in spec/code, ambiguous routing, parsing failure) are flagged back to the calling workflow with the specific reason — **NEVER silently dropped**.

Other sections reference this rule by name: `<input_contract>` step 1.0 GATE, `<success_criteria>`, `<failure_handling>` "Endpoint not found" branch, `<pitfalls>` "Silent endpoint drop". The full rule is stated here; pointers elsewhere do not restate it.

### 5.3 Run the validation checklist

Load [references/validation-checklist.md](validation-checklist.md) and verify every item before emit. Fix any failing item.

### 5.4 Emit per output_format

Emit the per-endpoint markdown (template in `references/per-endpoint-template.md`) to the destination supplied by the calling workflow. This skill does NOT decide the destination path — the calling workflow names it.
