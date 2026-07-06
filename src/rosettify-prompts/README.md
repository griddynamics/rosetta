# rosettify-prompts

A/B/N testing for prompts against the Anthropic API. Define any number of prompt
variants as full conversations, run each one repeatedly and concurrently, and
compare tokens, cost, latency, and stability across variants.

This is a general-purpose prompt bench, not a fixed test suite. The bundled
`evals.json` is one example config (comparing a few instruction-wording
variants). Replace it with whatever you're actually benching.

## What it does

- **Variants**: any number of prompt/conversation variants per experiment.
- **Arbitrary conversations**: each variant is an ordered list of user turns,
  any length. Different variants in the same suite can have different numbers
  of turns (a 1-turn baseline next to a 4-turn primed conversation, for
  example). The runner replays turns as a real conversation: it sends turn 1,
  waits for Claude's actual reply, appends it to history, sends turn 2, and so
  on.
- **Stability**: each variant runs `repetitions` times (isolated, independent
  conversations) so you get a distribution, not a single noisy sample.
- **Concurrency**: all `(suite, variant, repetition)` runs share no state, so
  they execute in parallel up to a configurable limit instead of one at a
  time.
- **Metrics**: input/output/thinking tokens, cost, latency, and text-shape
  metrics (char/word count, unicode-symbol density) per turn and aggregated
  per variant.

## Setup

Needs an Anthropic API key, either exported or in a `.env` file in the
directory you run the command from:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or: echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

## Quick start

```bash
# validate evals.json in the current directory without calling the API
npx -y rosettify-prompts@latest bench --dry-run

# run it (./evals.json, resolved from your current directory)
npx -y rosettify-prompts@latest bench

# point at a different config, output dir, or concurrency
npx -y rosettify-prompts@latest bench --evals path/to/my-eval.json --out results/my-run --concurrency 5
```

Each run writes `report.json` (raw per-turn data for every run) and
`report.md` (a comparison table plus one sample reply per variant) to
`results/<timestamp>/` in the current directory.

## CLI

| Command | Description |
| --- | --- |
| `bench` (default) | Run all suites and write a report |
| `validate [path]` | Validate a config without calling the API |

| Flag | Applies to | Description |
| --- | --- | --- |
| `-e, --evals <path>` | `bench` | Config path. Default: `./evals.json` in the current directory |
| `-o, --out <dir>` | `bench` | Report output dir. Default: `results/<timestamp>` |
| `--concurrency <n>` | `bench` | Overrides `concurrency` from the config |
| `--dry-run` | `bench` | Prints planned jobs, makes no API calls |

## Roadmap

- **`optimize`** (planned, not implemented yet): shrink a prompt while keeping
  or improving its behavior, with dedicated modes for skills, subagents, and
  workflows, since each has different structural conventions worth optimizing
  for differently.

## Writing a config

A config is one JSON file with global defaults plus a list of suites. A suite
is one experiment: a set of variants to compare against each other.

```jsonc
{
  "model": "claude-sonnet-5",
  "maxOutputTokens": 16384,
  "thinking": { "enabled": true, "mode": "adaptive", "effort": "high" },
  "repetitions": 5,
  "concurrency": 10,
  "suites": [
    {
      "id": "my-experiment",
      "description": "optional, shows up in report.md",
      "variants": [
        { "id": "baseline", "turns": ["single question, no priming"] },
        {
          "id": "primed",
          "systemPrompt": "optional system prompt for this variant",
          "turns": ["turn 1", "turn 2", "turn 3", "as many as you need"]
        }
      ]
    }
  ]
}
```

Fields:

- `model`, `maxOutputTokens`, `thinking`, `repetitions`, `concurrency`: global
  defaults. Any of them can be overridden per suite (`suites[].model`,
  `suites[].thinking`, etc.).
- `thinking.mode`:
  - `"adaptive"` (default): depth is controlled by `effort`
    (`low`/`medium`/`high`/`xhigh`/`max`). Required by current-gen models
    (`claude-sonnet-5`, `claude-opus-4-7`/`4-8`, and later).
  - `"manual"`: depth is controlled by `budgetTokens`. Only works on older
    models; `budget_tokens` is deprecated or rejected on newer ones.
- `suites[].variants[].turns`: the whole point. An ordered list of user
  messages, any length, independent per variant. Optionally pair with
  `systemPrompt` and/or a `label` for the report.
- `pricingOverrides`: `{ "<model>": { "input": <$/MTok>, "output": <$/MTok> } }`,
  merged over the built-in table in `src/pricing.ts`. Use it when a model's
  price changes or isn't in the table yet.

`evals.json` in this package is a worked example: it compares two
instruction-wording variants (each priming the conversation with a
compression instruction, then asking Claude to critique it) against a
one-turn baseline with no priming. Use it as a template, not as the schema.

## Metrics

- **Input/output tokens**: billed figures straight from the API's `usage`.
- **Thinking tokens**: read from `usage.output_tokens_details.thinking_tokens`
  when the API reports it, otherwise estimated via `countTokens` on the
  extracted `thinking` block (marked `"estimated"` in `report.json`). Already
  included in billed output tokens; broken out here for analysis, not added
  on top for cost.
- **Cost**: billed input/output tokens times the pricing table in
  `src/pricing.ts`, overridable via `pricingOverrides`.
- **Text metrics**: char/word count and unicode-symbol density per reply, a
  cheap proxy for "terse/compressed" style.
- **Stability**: `report.md` shows mean/min/max/stdev per metric across a
  variant's `repetitions`.

## Development

Working in this repo instead of via `npx`:

```bash
cd src/rosettify-prompts
npm install
cp env.template .env   # paste your Anthropic API key into .env
npm run typecheck
npm test
```

`.env` is covered by the repo-wide `*.env*` gitignore rule and is never
committed. Once dependencies are installed, `npm run bench` behaves exactly
like `npx -y rosettify-prompts@latest bench` (same CLI, same flags).

`evals.smoke.json` is a cheap 2-job fixture (low effort, trivial prompt) for
checking API connectivity end to end without burning much budget:

```bash
npm run bench -- --evals evals.smoke.json --out results/smoke
```
