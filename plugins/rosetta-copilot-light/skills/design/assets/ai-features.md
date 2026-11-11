# AI-features design reference (asset of the `design` skill)

Applies to LLM or agent capability inside the product: generation, RAG, agents, tool use.

## Aspects to weigh

- Evals before features: a graded set with a regression gate; non-determinism means statistical thresholds, not exact-match tests; no prompt or model change ships blind
- Everything entering the model is untrusted — user text, retrieved documents, tool outputs; retrieved content is data, never instructions
- Model output never executes privileged operations directly: permission boundary, tool allowlists, human gate on the irreversible, sandboxed execution
- Structured output with schema validation and a repair/retry path; the malformed case is the normal case
- Degradation ladder decided upfront: primary model → fallback model → cached/static answer → honest failure; provider outage is a design input
- Cost and latency as architecture: model tiering per task, prompt/context caching, context budgets, hard caps on loops and token spend — agent runaway is bounded by construction
- Prompts as versioned artifacts: reviewed, diffed, rolled back; every request traced with prompt version, tokens, latency
- RAG: retrieval quality measured separately from generation; citations to sources; staleness and re-index policy
- Anything personal entering prompts, logs, traces, or fine-tune sets inherits the regulated-data dimension; provider data-use terms are a design constraint
- Where the human stays in the loop: confidence thresholds, escalation paths, and what the user is told about AI involvement
- Lock-in surface: provider-specific features used knowingly, an exit sketch existing before the second provider is needed

## Default priorities

Safety before capability · evals before demos · bounded spend before throughput · designed degradation before assumed uptime.

## Standards worth naming

OWASP LLM Top 10 · NIST AI RMF · EU AI Act risk classification · provider data-use and retention terms · model/prompt versioning conventions.

## Easy to miss

Indirect injection via retrieved docs or tool results · eval set leaking into few-shot examples · unbounded agent loops spending tokens for nothing · latency budget ignoring validation-repair retries · secrets or PII in prompt logs · fallback model silently worse on the cases that matter · caching serving a stale answer after the source changed.
