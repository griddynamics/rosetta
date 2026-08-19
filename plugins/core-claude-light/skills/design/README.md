# design

Decides architecture: what is actually being decided, real alternatives weighted by how hard they are to unwind, a committed decision with rationale, boundaries, and the domain's non-obvious concerns.

## Why it exists
Targets decision failures a capable model still makes unprompted: converging on the first plausible answer, equal ceremony for one-way and reversible choices, re-deciding what the running system already settled, resolving tradeoffs the user owns, and missing the concern the domain makes expensive. Domain assets carry only what a model does not raise on its own.

## When to engage
- Trigger: an architecture or approach decision — new system, delta on something running, integration, re-architecture, technology/pattern choice.
- Actor: `architect` (decides), `planner` (consumes). Standalone; no workflow required.
- Downstream boundary: decision granularity only — no signatures, no task breakdown, no code.

## How it works
`role` → `when_to_use_skill` → `core_concepts` (what design is not; premises grounded narrowly on demand; delta-not-greenfield; greenfield = conventions are the decisions; effort follows reversibility) → `aspects_to_weigh` (register, adapted per task — not a pipeline) → `domain_specifics` (one asset by dominant risk dimension; regulated outranks; derive-it-yourself fallback) → `output` (content shape only) → `validation_checklist` → `pitfalls`.

`assets/` — loaded when the dimension carries real risk on this task; several may load. Each: aspects to weigh · default priorities · standards worth naming · easy to miss.
`distributed-systems` · `migration-cutover` · `multi-tenancy` · `identity-access` · `payments` · `regulated-data` · `data-platform` · `ai-features` · `classic-ml` · `mobile` · `iac` · `ecommerce` · `web-app`

## Mental hooks
- Depth follows stakes, not a template — this is the whole size-adaptation mechanism; no scaling tables.
- Assets are mostly risk dimensions; a vertical (`ecommerce`) or a default shape (`web-app`) earns a file only when it carries non-obvious content that does not decompose into the dimensions (oversell races, IDOR, expand/contract migrations). Healthcare deliberately has no file — it IS `regulated-data`. The fallback derives what no file covers, to the depth the files demonstrate.
- Assets state aspects, priorities, standards — never solutions; "Default priorities" is a starting point the agent adapts.
- A missing premise is checked or asked about and resolved — not assumed, and not a full discovery sweep.

## Invariants — do not change
- No file paths, artifact names, or destinations — output shape only; the caller sets destination. Never add a phrase saying so either: silence is the mechanism.
- No references to other skills; fully independent, composable unit. Boundaries stated as capabilities.
- Aspects register, not imperative steps; rewriting aspects as DO-X sequences breaks small tasks.
- Assets load by risk relevance — several when several carry it; conflicts resolve toward the stricter obligation, never a hardcoded ranking; the derive-it-yourself fallback stays last.
- Assets carry no frontmatter. Frontmatter `name` equals folder name.

## Editing guide
Safe: role prose, asset content, pitfalls. Care: the reversibility-weighted depth rule, the aspects register, the dispatch list — a new asset must answer "what would an unaided model miss here", and domain knowledge goes in assets, never SKILL.md. Not yet wired: registry (`docs/definitions/skills.md` reads `design (not yet)`), no agent/workflow invokes it. Superseded drafts parked in `agents/TEMP/ToRemove/design-assets/`. `plugins/**` is generated — regenerate, never hand-edit.
