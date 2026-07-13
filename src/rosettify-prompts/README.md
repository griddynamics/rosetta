# rosettify-prompts

A/B/N testing for prompts against the Anthropic API. Define any number of prompt
variants as full conversations, run each one repeatedly and concurrently, and
compare tokens, cost, latency, and stability across variants.

This is a general-purpose prompt bench, not a fixed test suite. The bundled
`evals.json` is one example config (comparing a few instruction-wording
variants: three prompted variants plus a baseline). Replace it with whatever
you're actually benching.

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
- **Optional evals**: add `suites[].eval.assertions` when you want a judge
  pass/partial/fail score, reasons, suggestions, and confidence per assertion.

## Setup

Needs an Anthropic API key, either exported or in a `.env` file in the
directory you run the command from:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or: echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

To target an Anthropic-compatible endpoint, set `ROSETTIFY_PROMPTS_BASE_URL`.
Base URL precedence is `ROSETTIFY_PROMPTS_BASE_URL`,
`ROSETTIFY_PROMPTS_ANTHROPIC_BASE_URL`, then `ANTHROPIC_BASE_URL`.

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
| `optimize` | Rewrite prompt/skill files through a single-conversation, loss-reviewed pipeline |
| `validate [path]` | Validate a config without calling the API |

| Flag | Applies to | Description |
| --- | --- | --- |
| `-e, --evals <path>` | `bench` | Config path. Default: `./evals.json` in the current directory |
| `-o, --out <dir>` | `bench` | Report output dir. Default: `results/<timestamp>` |
| `--concurrency <n>` | `bench` | Overrides `concurrency` from the config |
| `--dry-run` | `bench` | Prints planned jobs, makes no API calls |
| `--target <file>` | `optimize` | Target file to optimize and output. Repeatable |
| `--supporting <file>` | `optimize` | Supporting context file. Repeatable, not output |
| `--additional <text>` | `optimize` | Extra optimization goal injected into optimizer context. Repeatable |
| `--out <dir>` | `optimize` | Directory for optimized target files, `trace.json`, and `report.md` |
| `--model <id>` | `optimize` | Model used for optimization |
| `--max-output-tokens <n>` | `optimize` | Maximum output tokens per optimizer call. Default: `32000` |
| `--trace-full-prompts` | `optimize` | Store full prompt bodies in `trace.json`. Default stores hashes/metadata |
| `--enable-questions` | `optimize` | Let the optimizer ask clarifying questions interactively. Requires a TTY (unless `--dry-run`) |
| `--dry-run` | `optimize` | Prints the stage plan, makes no API calls, and writes no files |

## Optimize

`optimize` rewrites one or more target files as ONE growing conversation. Each
message replays the full prior history (including the model's own thinking), so
later steps build on everything already proposed. Content steps propose surgical
changes only; the finalize-draft and final value-lost steps materialize the
accepted changes into complete files, keeping everything else verbatim.

The conversation is:

- **Run setup** (cached system prompt): optimizer purpose, line-purpose lens,
  the `STEP_CHANGES_JSON`/`FINAL_FILES_JSON` schemas, `--additional` goals, and
  read-only supporting files.
- **Session setup** (cached first user message): the original target files, the
  source of truth and start state for the whole run.
- **7 combined content steps**, each delivered just-in-time as its own message
  with only that step's exact reference text — never batched up front — so the
  model works each concern in turn: Inventory & Intent, Actors/Boundaries &
  Contracts, Execution & Delegation, Review/Validation & Failure Hardening,
  Patterns & Simulation, Compression, Consistency & Minimality.
- A **mid value-lost review** after step 3, restoring anything the proposals so
  far weakened.
- **Finalize-draft**: materialize accepted proposals into complete files.
- **Final value-lost audit**: a last pass comparing originals vs the draft.

```bash
npx -y rosettify-prompts@latest optimize \
  --target SKILL.md \
  --target references/foo.md \
  --target assets/bar.md \
  --supporting my-special-context.md \
  --additional "Prefer terse wording; keep examples concrete." \
  --out results/optimized-prompt \
  --model claude-sonnet-5 \
  --max-output-tokens 32000
```

Each call is logged as it runs (`[step n/N] <step> — …`), and calls are routed
through the SDK's streaming API so long-running calls at high
`--max-output-tokens` values don't hit the SDK's non-streaming timeout guard.
Use `--step-limit N` to run only the first N content steps before finalizing.

### Interactive questions

With `--enable-questions`, each proposal step (the 7 content steps and the mid
value-lost review) may also raise clarifying questions when genuine ambiguity
blocks a strictly better proposal. The app asks each fresh question in the
terminal (Enter to skip), then appends the answers to the conversation keyed by
the model's own question id — question text is never repeated — so every later
step and the finalize pass honor them. Within a batch you can navigate with `<`
(previous) and `>` (next) and revise earlier answers; a final summary asks for
confirmation before anything is sent, and once sent the answers are final.
Because `<` and `>` are navigation commands, they cannot be entered as literal
answer text. Questions and answers are recorded in
`trace.json` and rendered as a `## Questions & Answers` table in `report.md`.

The flag requires an interactive terminal (a TTY); it errors out early otherwise
(except under `--dry-run`, which only prints the plan). With the flag off
(the default), behavior is unchanged: no questions are requested and every
request is byte-identical to a run without the feature.

`--target` files are under edit and are output under `--out`, preserving their
relative paths. `--supporting` files are loaded as context only and are not
rewritten. `--additional` strings become extra optimizer goals in the stable
optimizer context.

The hardening and patterns references are built into the package as prompt
constants, based on the package's prompt-authoring references. They are not CLI
inputs.

Outputs:

- optimized target files, preserving relative paths under `--out`.
- `trace.json`: phase/call metadata, prompt hashes, durations, and outputs.
  Use `--trace-full-prompts` only when debugging prompt bodies.
- `report.md`: compact summary of inputs, stage sizes, and final size.

Use `--dry-run` to validate the command shape and print the exact stage plan
without creating an API client or writing files.

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
- `suites[].eval` (optional): judge assertions for a suite. Each assertion has
  `id`, `text`, and optional `rubric`; judge output is normalized to
  `{ "text": string, "passed": "pass"|"partial"|"fail", "reasons": string,
  "suggestions": string, "confidence": number }`.
- `pricingOverrides`: `{ "<model>": { "input": <$/MTok>, "output": <$/MTok> } }`,
  merged over the built-in table in `src/pricing.ts`. Use it when a model's
  price changes or isn't in the table yet.

`evals.json` in this package is a worked example: it compares three prompted
instruction-wording variants against a one-turn baseline with no priming. Use
it as a template, not as the schema.

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

`evals.smoke.json` is a cheap 3-job fixture (low effort, trivial prompt) for
checking API connectivity end to end without burning much budget:

```bash
npm run bench -- --evals evals.smoke.json --out results/smoke
```
