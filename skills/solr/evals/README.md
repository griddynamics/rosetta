# Solr Skill Evals

Automated test cases that measure how well an LLM applies the Solr skills.
Used for skill regression tests, A/B comparing skill formulations, and benchmarking
how much a skill helps different models on the same tasks.

## What an eval is

An **eval** is an automated test for an LLM response, structurally similar to a unit
test. Each case is a prompt + a set of assertions on the model's text output.

```json
{
  "id": "term-special-chars",
  "category": "parsers",
  "difficulty": "easy",
  "prompt": "Write a Solr fq filter to match the exact value 'ABC-123/XL' on sku_id...",
  "asserts": {
    "must_contain": ["{!term", "f=sku_id", "ABC-123/XL"],
    "must_not_contain": ["\\-", "\\/"],
    "max_length_chars": 80
  }
}
```

The runner loads the relevant skill (`SKILL.md` + `references/`) as the system prompt,
sends `prompt` as the user message, then grades the response against `asserts`.

## Why these evals exist

1. **Skill regression tests.** After editing a skill, run the evals and confirm
   pass-rate doesn't drop. Specific failures tell you which sections of the skill
   stopped triggering.
2. **A/B test skill formulations.** Reword a section, re-run, see if pass-rate improves.
3. **Cross-model benchmarking.** Same evals, different models — Qwen 7B vs 14B vs
   Claude Sonnet, with and without the skill (`--compare`).
4. **Skill quality signal.** A model failing an eval that the skill clearly addresses
   means the skill section is unclear; the eval is acting as a clarity probe.

## Structure

```
evals/
├── README.md                  ← this file
├── cases/
│   ├── query/                 ← evals for the solr-query skill (115 cases)
│   │   ├── 01-parsers.json
│   │   ├── 02-block-join.json
│   │   ├── 03-json-facets.json
│   │   ├── 04-tag-exclude.json
│   │   ├── 05-edismax.json
│   │   ├── 06-knn.json
│   │   ├── 07-explain.json
│   │   ├── 08-validation.json
│   │   └── 09-common-errors.json
│   ├── extending/             ← evals for the solr-extending skill (40 cases)
│   ├── semantic-search/       ← evals for the solr-semantic-search skill (58 cases)
│   └── schema/                ← evals for the solr-schema skill (40 cases)
└── runner/
    ├── run_evals.py           ← CLI runner
    ├── grader.py              ← assertion grading
    └── requirements.txt       ← just `requests`
```

There are **~284 cases across the four skills**: `solr-query` (146), `solr-extending`
(40), `solr-semantic-search` (58), and `solr-schema` (40).

## Case file schema

Each `*.json` file in `cases/<skill>/` is an array of case objects:

```json
[
  {
    "id": "unique-id-within-the-suite",
    "category": "parsers | block-join | edismax | ... | parsers-anti | ...",
    "difficulty": "easy | medium | hard",
    "prompt": "What gets sent as the user message",
    "asserts": { ... },
    "notes": "Internal commentary; not used by the runner"
  }
]
```

### Assertion keys (all optional, all AND-combined)

| Key | Type | Semantics |
|---|---|---|
| `must_contain` | `[str, ...]` | All strings must appear in the response (case-sensitive substring) |
| `must_contain_any` | `[str, ...]` | At least one of the strings must appear |
| `must_not_contain` | `[str, ...]` | None of the strings may appear |
| `must_match_regex` | `[str, ...]` | All regexes must match (`re.search`, full Python regex flavor) |
| `must_not_match_regex` | `[str, ...]` | No regex may match |
| `max_length_chars` | `int` | Response length cap (use for terse-answer cases) |
| `min_length_chars` | `int` | Response length floor |

**Important — JSON gotcha.** A JSON object with two keys of the same name keeps
only the last one. So this is wrong:

```json
"asserts": {
  "must_match_regex": ["pattern A"],
  "must_match_regex": ["pattern B"]
}
```

Combine into one list — the grader requires ALL patterns to match, so this is
equivalent and works:

```json
"asserts": {
  "must_match_regex": ["pattern A", "pattern B"]
}
```

The `--lint-only` pass does not catch this; the runner-level `load_cases` uses
the JSON parser directly. If you write many new cases, audit with
`object_pairs_hook` (see grader source).

## Running

```bash
pip install -r runner/requirements.txt
```

### Lint cases without calling any model

```bash
python runner/run_evals.py --skill query --provider lmstudio --model dummy --lint-only
```

Reports JSON parse errors, unknown assertion keys, malformed regexes, duplicate
case IDs.

### Against local LM Studio

```bash
python runner/run_evals.py --skill query --provider lmstudio --model qwen2.5-coder-32b
```

Default base-url is `http://localhost:1234/v1`. Override with `--base-url`.

### Against any OpenAI-compatible endpoint

```bash
python runner/run_evals.py --skill query \
  --provider openai \
  --base-url http://localhost:8000/v1 \
  --api-key YOUR_KEY \
  --model your-model
```

### Against Claude (Anthropic API)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python runner/run_evals.py --skill query \
  --provider anthropic \
  --model claude-sonnet-4-6
```

Token usage and cost (in USD) are reported per run, computed from the pricing
table in `run_evals.py`. Update the `ANTHROPIC_PRICING` dict if Anthropic rates
change.

### Compare with-skill vs without-skill

```bash
python runner/run_evals.py --skill query --provider anthropic \
  --model claude-sonnet-4-6 \
  --compare
```

Each case runs twice — once with the skill loaded as system prompt, once with an
empty system prompt. Output shows per-category lift, "helped" (FAIL→PASS) count,
and "hurt" (PASS→FAIL) count. This is the primary signal for whether a skill is
actually doing useful work.

### Filtering

```bash
# Single category
python runner/run_evals.py --skill query --filter category=block-join ...

# By difficulty
python runner/run_evals.py --skill query --filter difficulty=hard ...

# By file (glob)
python runner/run_evals.py --skill query --filter file=04-tag-exclude ...

# By id (glob)
python runner/run_evals.py --skill query --filter "id=knn-*" ...

# Combine (comma-separated; AND)
python runner/run_evals.py --skill query --filter "category=edismax,difficulty=hard" ...
```

### Other useful flags

```
--skill-only     Load just SKILL.md, skip references (test how much references help)
--limit N        Stop after N cases (smoke testing)
--verbose        Print full model response for every case
--output X.json  Save full results as JSON for later analysis
--temperature T  Default 0.0
--max-tokens N   Default 1024
--timeout SEC    HTTP timeout per request, default 180
```

## The `--skill` argument

```
--skill query           → solr-query/ + cases/query/
--skill extending       → solr-extending/ + cases/extending/
--skill semantic-search → solr-semantic-search/ + cases/semantic-search/
--skill schema          → solr-schema/ + cases/schema/
--skill all             → all SKILL.md concatenated, all cases
```

Without `--skill`, the runner uses the legacy single-skill layout (`solr/` +
`cases/`). Explicit `--skill-dir` and `--cases-dir` always override.

`--skill all` is mostly for cross-skill testing — does the model pick the right
section when multiple skills are loaded? Most runs use a single named skill.

## Adding new cases

1. Pick the right file under `cases/<skill>/` (or create a new one).
2. Append a case object with a unique `id`.
3. Run `--lint-only` to verify.
4. Run with `--filter id=<your-id>` against any model to sanity-check the assertions.

For the assertions: prefer specific `must_contain` strings over loose
`must_match_regex` when possible. Regexes catch synonym phrasings but also let
through more wrong answers. Set `max_length_chars` for cases asking for terse
answers — many models pad responses.

## Interpretation notes

- **Pass rate is a lower bound on real model competence.** A model can give a
  correct answer that the assertions don't accept (synonym phrasing, alternative
  valid syntax). When pass rates are surprisingly low, spot-check a few responses
  with `--verbose`.
- **Failures group by category for a reason.** If `block-join` is at 30% but
  `parsers` is at 90%, that's actionable signal about which part of the skill
  needs more clarity, examples, or stronger anti-pattern callouts.
- **`--compare` lift is the most honest metric.** A skill that has 90% pass rate
  on its own but +0pp lift over baseline doesn't help; the model already knew. A
  skill with +30pp lift on hard cases is doing real work.
