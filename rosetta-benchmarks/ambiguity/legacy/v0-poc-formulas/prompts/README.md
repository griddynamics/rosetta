# Prompt versions (the ambiguity ladder)

Six versions of the small task's prompt, from the original prompt (v0) to the most ambiguous one (v5). The ladder is **cumulative**: each version keeps everything that was made unclear in the version before it, and makes one more dimension unclear. So the expected order of ambiguity is known in advance: v0 < v1 < v2 < v3 < v4 < v5.

| Version | File | Dimension made unclear | What changed against the version before |
| --- | --- | --- | --- |
| v0 | [v0.txt](./v0.txt) | none (reference) | The original small-task prompt, word for word ([BENCHMARKS.md](../../BENCHMARKS.md), section 4). It is not perfectly clear: the 7 hidden questions are left out on purpose. |
| v1 | [v1.txt](./v1.txt) | Goals | "a "storage conditions" field" → "something for storage conditions as appropriate": what to build is open (field, attribute, metadata, label …). |
| v2 | [v2.txt](./v2.txt) | + Constraints | The definition of done (end to end, tests, passes locally) → "Do whatever is needed." |
| v3 | [v3.txt](./v3.txt) | + Inputs | The example value ("Keep refrigerated at 2–8 °C") is removed: the kind and size of the value are open. |
| v4 | [v4.txt](./v4.txt) | + Context | "on a product in the dashboard" and "in the product description on the storefront" → "where relevant": where staff set it and where customers see it are open. |
| v5 | [v5.txt](./v5.txt) | + Contradiction | Two planted contradictions: K1 (customers see it / customers must never see it) and K2 (translatable / no translations). |

**Runs use v0, v3 and v5 only** (clear, medium, high). All six are scored offline (AS + judge), so Task 1 uses the whole ladder.

## Rules

- The text is fixed. Never change a version after its first scored run; a change is a new version (v6, …) and is rescored.
- The prompt goes into the method's own command exactly as in its method file ([saleor/methods/](../../saleor/methods/)): only the task text is replaced. Example for Superpowers v3: `/superpowers:brainstorming ` + the text of `v3.txt`. Rosetta Skills keeps its last line `MUST USE SKILLS hitl, tech-specs.` after the text.
- The detail checklist with priorities is [checklist.json](./checklist.json); the vague-term list is [vague-terms.txt](./vague-terms.txt); the operator's answers are [answer-sheet.md](./answer-sheet.md).

## Planted contradictions (v5)

| ID | Side A | Side B | Declared resolution | Check per side |
| --- | --- | --- | --- | --- |
| K1 | "customers should see it where relevant" | "Keep it internal: customers must never see it" | A wins: customers see it on the storefront product page (hidden 4) | A: the storefront product page shows it · B: no storefront change |
| K2 | "It must be translatable" | "Only English is needed, no translations" | A wins: translatable like name and description (hidden 2) | A: translation in the API and dashboard · B: none |

The correct behavior for a conflict inside one prompt is to **ask** (or to name the conflict and say which side it chose). The operator gives the declared resolution only when asked. Labels and scores: [METRICS.md](../METRICS.md), section 3.
