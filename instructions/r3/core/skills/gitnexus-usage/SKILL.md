---
name: gitnexus-usage
description: Pattern-match user intent to GitNexus tool calls.
tags: ["gitnexus", "pattern-matching", "code-intelligence"]
baseSchema: docs/schemas/skill.md
---

<gitnexus-usage>

<role>
Pattern-match user intent to the appropriate GitNexus MCP tool or resource. Provides a quick-reference map of tools, resources, parameters, and worked examples.
</role>

<when_to_use_skill>
Use whenever a GitNexus MCP tool call is needed: debugging errors, exploring code, analyzing impact, or refactoring. Consult this skill to select the right tool or resource before calling it.
</when_to_use_skill>

<core_concepts>

**Resources**:

- Discover what repos are indexed → `READ gitnexus://repos`
- Get repo overview or check if index is stale → `READ gitnexus://repo/{name}/context`
- Browse functional areas with cohesion scores → `READ gitnexus://repo/{name}/clusters`
- List members of a functional area → `READ gitnexus://repo/{name}/cluster/{name}`
- List all execution flows → `READ gitnexus://repo/{name}/processes`
- Trace a specific flow step-by-step → `READ gitnexus://repo/{name}/process/{name}`
- Inspect graph schema before writing Cypher → `READ gitnexus://repo/{name}/schema`

**Tools:**

**`gitnexus_query({query, repo?, limit?, max_symbols?, task_context?, goal?})`** — search by error text, symptom, concept, or feature area; use to find related execution flows when debugging, exploring, or identifying a refactoring scope; or to locate string/dynamic references that are not graph-tracked; narrow with `repo` when multiple repos are indexed, `limit` to cap the number of processes returned, or `max_symbols` to cap symbols per process; add `task_context` and `goal` to improve ranking:

```
gitnexus_query({query: "token expiry error", goal: "find where tokens expire"})
→ Processes: TokenRefreshFlow, SessionHandling
→ Symbols: refreshToken, handleExpiredToken, TokenException
```

**`gitnexus_context({name})`** — 360° view of a symbol: callers, callees, processes it participates in; use before modifying, extracting, or tracing data flow through a function; for performance issues, find symbols with many callers (hot paths); if multiple symbols share the same name, the tool returns candidates — rerun with `uid` from the candidate list for a zero-ambiguity lookup, or pass `file_path` to narrow the match:

```
gitnexus_context({name: "refreshToken"})
→ Incoming: authMiddleware, sessionGuard
→ Outgoing: verifySignature, db.tokens.update
→ Processes: TokenRefreshFlow (step 2/4)
```

**`gitnexus_impact({target, direction: "upstream|downstream"})`** — blast radius: what depends on X (upstream), what X depends on (downstream); use before any non-trivial change to assess risk; default `maxDepth` is 3 — increase it for deeper transitive analysis on large codebases:

```
gitnexus_impact({target: "parseConfig", direction: "upstream", minConfidence: 0.8, maxDepth: 3})
→ d=1 (WILL BREAK): appBootstrap [100%], testSetup [100%]
→ d=2 (LIKELY AFFECTED): featureFlags [92%]
→ d=3 (MAY NEED TESTING): metricsCollector [80%]

gitnexus_impact({target: "parseConfig", direction: "downstream", maxDepth: 2})
→ d=1: fs.readFileSync, JSON.parse
→ d=2: (no further graph-tracked dependencies)
```

**`gitnexus_detect_changes()`** — map current git diff to affected execution flows; use pre-commit to understand scope, post-refactor to verify only expected files changed, or when a change touches cross-area references; `scope` values: `"unstaged"` (default — working tree), `"staged"` (git index only), `"all"` (staged + unstaged), `"compare"` (diff against a branch/commit via `base_ref`):

```
gitnexus_detect_changes({scope: "staged"})
→ Changed: 3 symbols in 2 files
→ Affected: CheckoutFlow, RefundFlow
→ Risk: HIGH
```

**`gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})`** — graph-aware multi-file rename; preferred whenever a symbol appears across more than one file; always run with `dry_run: true` first; `text_search` edits are string matches the graph cannot verify — inspect each one: if it is a dynamic reference (config key, string literal, reflection), apply manually or skip; if it is a genuine code reference missed by the graph, apply it; then set `dry_run: false` to apply all confirmed edits:

```
gitnexus_rename({symbol_name: "sendEmail", new_name: "dispatchEmail", dry_run: true})
→ 7 edits across 4 files
→ 6 graph (high confidence), 1 text_search (review: "sendEmail" in email-templates/config.json)
```

**`gitnexus_cypher({query: "MATCH ..."})`** — raw Cypher graph queries; use when tools above are insufficient (read `gitnexus://repo/{name}/schema` first):

```cypher
MATCH path = (a)-[:CodeRelation {type: 'CALLS'}*1..2]->(b:Function {name: "validatePayment"})
RETURN [n IN nodes(path) | n.name] AS chain
```

</core_concepts>

<templates applies="examples">

### "Payment endpoint returns 500 intermittently"

```
1. gitnexus_query({query: "payment error handling"})
   → Processes: CheckoutFlow, ErrorHandling
   → Symbols: validatePayment, handlePaymentError

2. gitnexus_context({name: "validatePayment"})
   → Outgoing calls: verifyCard, fetchRates (external API!)

3. READ gitnexus://repo/my-app/process/CheckoutFlow
   → Step 3: validatePayment → calls fetchRates (external)

4. Root cause: fetchRates calls external API without proper timeout
```

### "How does payment processing work?"

```
1. READ gitnexus://repo/my-app/context       → 918 symbols, 45 processes
2. gitnexus_query({query: "payment processing"})
   → CheckoutFlow: processPayment → validateCard → chargeStripe
   → RefundFlow: initiateRefund → calculateRefund → processRefund
3. gitnexus_context({name: "processPayment"})
   → Incoming: checkoutHandler, webhookHandler
   → Outgoing: validateCard, chargeStripe, saveTransaction
4. Read src/payments/processor.ts for implementation details
```

### "What breaks if I change validateUser?"

```
1. gitnexus_impact({target: "validateUser", direction: "upstream"})
   → d=1: loginHandler, apiMiddleware (WILL BREAK)
   → d=2: authRouter, sessionManager (LIKELY AFFECTED)

2. READ gitnexus://repo/my-app/processes
   → LoginFlow and TokenRefresh touch validateUser

3. Risk: 2 direct callers, 2 processes = MEDIUM
```

### Rename `validateUser` to `authenticateUser`

```
1. gitnexus_rename({symbol_name: "validateUser", new_name: "authenticateUser", dry_run: true})
   → 12 edits: 10 graph (safe), 2 ast_search (review)
   → Files: validator.ts, login.ts, middleware.ts, config.json...

2. Review ast_search edits (config.json: dynamic reference!)

3. gitnexus_rename({symbol_name: "validateUser", new_name: "authenticateUser", dry_run: false})
   → Applied 12 edits across 8 files

4. gitnexus_detect_changes({scope: "all"})
   → Affected: LoginFlow, TokenRefresh
   → Risk: MEDIUM — run tests for these flows
```

</templates>


</gitnexus-usage>
