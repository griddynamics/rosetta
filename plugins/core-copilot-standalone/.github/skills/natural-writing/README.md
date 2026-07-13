# natural-writing

Rewrites or drafts text so it reads as human, not model-generated — strips AI-tell phrasing, hype, and stiff constructs from user-facing prose.

## Why it exists

Without it, a model defaults to its own house style: hedging filler, "dive into"/"unleash"/"game-changing" hype words, em-dashes, colon-led lists, rhetorical-question hooks ("Have you ever wondered…?"), and stock engagement phrases ("Let's take a look," "buckle up"). That prose technically communicates but reads as machine-generated and erodes trust in anything user-facing (docs, emails, blog posts, social copy). The skill exists to catch and remove those markers, and to provide an intent-confirmation template so meaning isn't silently altered by the rewrite.

## When to engage

Actor: any agent producing or revising text meant to sound authentically human — emails, blog posts, docs, social content — where AI phrasing or robotic tone would undermine trust (`<when_to_use_skill>`, SKILL.md:20-22). No stated prerequisite beyond having the source text and its intended audience/content type in hand; the skill's own template is how that context gets gathered if missing.

## How it works

Single-file skill: `SKILL.md` only, no `assets/` or `references/` subfolders.

- `<role>` — casts the executor as a senior writing specialist producing human-sounding prose.
- `<core_concepts>` — "Writing principles" (plain language, cut filler, honest tone) plus a separate "Constraints (strict no-use rules)" block that is the actual enforcement surface.
- `<validation_checklist>` — read-aloud and native-speaker bot-detection tests, intent-preservation check, and an explicit gate: user must approve the version before it counts as done.
- `<best_practices>` — audience-first drafting, MoSCoW for scope, distinguishing what the user said from what was inferred.
- `<pitfalls>` — traps specific to over-applying the constraints (see below).
- `<resources>` — points to `docs/schemas/skill.md` (schema reference only, not a functional dependency).
- `<templates>` — the "Input intent confirmation format," the mechanism for capturing original text, content type, audience, and must-keep terms before rewriting.

There is no `<process>` section: execution order is implied, not phased — confirm intent via the template, apply core_concepts/constraints, self-check against validation_checklist, get explicit user sign-off.

## Mental hooks & unexpected rules

- "Do not use dashes ( - ) in writing. MUST NOT use em-dashes ( — )." — bans both, and pitfalls separately flags "Removing em-dashes but introducing hyphens as a substitute — both are banned," anticipating the obvious workaround.
- "Do not use colons ( : ) unless part of input formatting." — colons are banned in prose but pitfalls clarify formatting sections (e.g. the input-confirmation template) are exempt; conflating the two is a named pitfall.
- "Has the user explicitly approved this version before it is considered done?" — completion is gated on user sign-off, not on passing the other checklist items alone.
- "Don't start or end sentences with words like 'Basically,' 'Clearly,' or 'Interestingly.'" — position-specific ban, not a blanket word ban.
- "Hook user with interesting ideas" / "Provide TLDR or similar hooks for articles" in `<best_practices>` sits in tension with the anti-hype constraints — engagement is still wanted, just not via banned phrasing.

## Invariants — do not change

- `name: natural-writing` must equal the folder name and matches the registration at `docs/definitions/skills.md:40` — renaming either breaks discovery.
- `disable-model-invocation: false` and `user-invocable: true` are both explicitly set (schema requires these two always set, never left implicit).
- `description` is the GENERIC form ("To rewrite text in a clear, natural, honest human tone — no AI slop, hype, or robotic phrasing.") and must stay within the shared ~25-token budget across skills.
- XML section names (`<natural_writing>`, `<role>`, `<when_to_use_skill>`, `<core_concepts>`, `<validation_checklist>`, `<best_practices>`, `<pitfalls>`, `<resources>`, `<templates>`) follow `docs/schemas/skill.md` exactly; the outer wrapper tag must match `name`.
- Inbound coupling: `instructions/r3/core/prompts/self-help-flow.prompt.md` invokes it by name — phase 3 ("guide") says "USE SKILL `natural-writing` for final user-facing output," and its invocation-guidance section uses `/natural-writing Rewrite the executive summary in docs/CONTEXT.md — ...` as the canonical GOOD example of a valid direct-skill slash invocation (specific artifact + explicit method + explicit scope). Changing the skill's name, invocation form, or removing it would break that workflow's guidance text and example.
- `docs/stories/reduce-bootstrap.md` also quotes the same `USE SKILL natural-writing` line from self-help-flow.md as a worked example in its own narrative — not a functional coupling, just an illustration that reuses the same text.

## Editing guide

Safe to edit: wording within `<core_concepts>`, `<best_practices>`, `<pitfalls>`, and the confirmation template in `<templates>` — these are self-contained and not referenced elsewhere by exact text.

Handle with care: the strict no-use rules in `<core_concepts>` (dashes, colons, rhetorical questions, banned openers/closers) are the skill's core value; loosening them silently changes behavior for every caller. The user-approval gate in `<validation_checklist>` is a deliberate HITL checkpoint — removing it would let the skill self-certify "done."

New content (e.g. worked before/after examples, a domain-specific style guide) belongs as a new `references/` file plus a pointer in `<resources>`; nothing currently justifies an `assets/` file since output is inline prose, not a document template beyond the existing confirmation format.

Only known referencer: `instructions/r3/core/prompts/self-help-flow.prompt.md` (functional invocation + example). Any rename or interface change must be reflected there and in `docs/definitions/skills.md`.
