# GitNexus usage reference

<gitnexus>

<role>
Pattern-match user intent to the appropriate GitNexus MCP tool or resource. Provides a quick-reference map of tools, resources, parameters, and worked examples.
</role>

<when_to_use>
Use whenever a GitNexus MCP tool call is needed: debugging errors, exploring code, analyzing impact, or refactoring. Consult this reference to select the right tool or resource before calling it.
</when_to_use>

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

**`query({query, repo?, limit?, max_symbols?, task_context?, goal?})`** — search by error text, symptom, concept, or feature area; use to find related execution flows when debugging, exploring, or identifying a refactoring scope; or to locate string/dynamic references that are not graph-tracked; narrow with `repo` when multiple repos are indexed, `limit` to cap the number of processes returned, or `max_symbols` to cap symbols per process; add `task_context` and `goal` to improve ranking.

**`context({name})`** — 360° view of a symbol: callers, callees, processes it participates in; use before modifying, extracting, or tracing data flow through a function; for performance issues, find symbols with many callers (hot paths); if multiple symbols share the same name, the tool returns candidates — rerun with `uid` from the candidate list for a zero-ambiguity lookup, or pass `file_path` to narrow the match.

**`impact({target, direction: "upstream|downstream"})`** — blast radius: what depends on X (upstream), what X depends on (downstream); use before any non-trivial change to assess risk; default `maxDepth` is 3 — increase it for deeper transitive analysis on large codebases.

**`detect_changes()`** — map current git diff to affected execution flows; use pre-commit to understand scope, post-refactor to verify only expected files changed, or when a change touches cross-area references; `scope` values: `"unstaged"` (default — working tree), `"staged"` (git index only), `"all"` (staged + unstaged), `"compare"` (diff against a branch/commit via `base_ref`).

**`rename({symbol_name: "old", new_name: "new", dry_run: true})`** — graph-aware multi-file rename; preferred whenever a symbol appears across more than one file; always run with `dry_run: true` first; `text_search` edits are string matches the graph cannot verify — inspect each one: if it is a dynamic reference (config key, string literal, reflection), apply manually or skip; if it is a genuine code reference missed by the graph, apply it; then set `dry_run: false` to apply all confirmed edits.

**`cypher({query: "MATCH ..."})`** — raw Cypher graph queries; use when tools above are insufficient (read `gitnexus://repo/{name}/schema` first).

</core_concepts>

</gitnexus>
