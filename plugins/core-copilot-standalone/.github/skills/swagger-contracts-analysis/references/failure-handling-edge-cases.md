# Failure Handling — Edge-Case Branches — swagger-contracts-analysis

Loaded on demand from SKILL.md `<failure_handling>` when one of these three lower-frequency conditions actually applies. The base SKILL.md keeps the common stops (endpoint-not-found, ambiguous routing, parsing failure) inline; this file holds the rarer branches that don't fire on most invocations.

Mirrors the same lazy-loading pattern already used by `references/redaction-catalog.md`.

---

## Spec-vs-code reconciliation conflict beyond Notes

**Trigger.** When the routine "spec vs code cross-check" step (step 1.5 / step 2.4 equivalent in the calling workflow's process) finds discrepancies that the per-entry `Notes / Discrepancies` field can no longer reasonably hold:

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
