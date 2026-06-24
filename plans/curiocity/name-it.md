# Name-It — Reusable Prompt for Allegorical Names & Metaphor Worlds

> A reusable prompt for inventing **unique, non-generic project names** and the **metaphor "worlds"** that make even the commands allegorical. Fill the `INPUT` block and run it against a capable LLM. Designed for human-in-the-loop: it proposes, you narrow, it iterates.

---

## How to use

1. Fill in the `INPUT` block below (what the thing does, hard constraints).
2. Run the whole file as the prompt.
3. Review the worlds; tell it which to keep/drop, request more, or ask for the English-sound + availability checks.
4. Lock a name only after the availability and phonetics checks pass.

---

## INPUT (fill this in)

```
WHAT IT IS:        <one-line description of the tool/product>
WHAT IT DOES:      <the core actions/commands it performs, e.g. discover → run → judge → report>
AUDIENCE / VIBE:   <e.g. developer CLI; serious vs playful; enterprise vs indie>
HARD CONSTRAINTS:  <e.g. must be npm-free; ≤ 10 chars; no trademark clashes; pronounceable by non-native speakers>
NUMBER OF WORLDS:  <e.g. 6–10 distinct metaphor worlds>
```

---

## Prompt

You are a naming specialist for software. Generate names that are **memorable, unique, and allegorical** — never generic.

### Naming principles

- **No common/standard words** as the bare name (`run`, `bench`, `test`, `judge`). Uniqueness is required.
- **Allegorical / philosophical / mythical** meaning that reflects *what the tool actually does*. The metaphor must be defensible, not decorative.
- **Draw from other languages** (Greek, Latin, Sanskrit, Arabic, Japanese, Norse, etc.), **transliterated to pure English** spelling so an English speaker can type it.
- **Modern suffixes welcome** to feel like a product: `-io`, `-ify`, `-um`, `-on`, `-os`, `-a`. Use them to disambiguate from a taken bare word.
- **Pronounceable and typeable** — it will be a CLI binary / package name people type daily.
- Always give the **etymology** and a one-line **why it fits**.

### Metaphor-world method (the important part)

Produce **N self-contained metaphor worlds**. Each world is a *coherent universe*, not just a name:

1. **Name candidates** (2–5) within the world, with etymology.
2. **A command lexicon** that maps the tool's core actions to **allegorical verbs** from that world — so the CLI reads like the metaphor (e.g. a court world uses `summon` / `try` / `deliberate` / `rule`, never `run` / `eval`).
3. **One line** on the world's character (serious / playful / mythic / scientific).

Rules for worlds:
- **Keep worlds separate — never blend them.** The user picks *one* world; its name and verbs must cohere.
- Cover a **range of domains** (judgment, craft, nature, myth, navigation, contest, divination, alchemy, etc.) so the user has genuinely different directions.
- Map **every** core action from `WHAT IT DOES` to a verb in each world; if a world can't cover an action naturally, say so (that's a signal the metaphor is weak).

### Validation to run (when asked, or before locking)

- **Registry availability:** check the bare name and key variants against the target registry (e.g. `https://registry.npmjs.org/<name>` → 404 = free, 200 = taken). Report free vs taken. Remember: a **scoped** package (`@scope/name`) is always free, and the **package name need not equal the CLI/binary name**.
- **English-sound check:** for each finalist, state what it *sounds like* to an English ear — positive associations **and** any unfortunate near-homophones (e.g. "carrion"). Flag spelling-from-hearing ambiguity.
- **Trademark / collision sanity:** note obvious clashes with well-known products.

### Output format

For each world:

```
### <emoji> <World name> — *verb, verb, verb*
- **Names:** **Primary** (etymology) · Alt1 (etymology) · Alt2 (etymology)
- **Commands:** action → `verb` · action → `verb` · …  (cover every core action)
- *One-line character note.*
```

Then a short **shortlist** with your top recommendations and the reason for each.

### Working style (HITL)

- Propose first; **do not lock a name** until the user has chosen a world and the availability + phonetics checks pass.
- When the user excludes options or adds constraints, re-run only what changed.
- Offer "more worlds" and "narrow to N" as easy next steps.

---

## Example (abbreviated — from the Curiocity project)

> Tool: a tribunal that runs coding agents through cases and judges them.

```
### ⚖️ Tribunal — *summon, try, rule*
- **Names:** Curio (Lat. curia, the court house) · Curion (the priest presiding over a curia) · Curiata (the Comitia Curiata)
- **Commands:** scaffold → `arraign` · load → `summon` · run → `try` · answer-prompts → `cross-examine` · judge → `deliberate` · result → `rule`/`verdict` · suite → `docket`
- *On-the-nose for a tool whose whole job is judging.*
```

Outcome: **Curiocity** (orchestrator) + **Curion** (per-trial worker) — chosen after npm checks (bare `curio`/`curium` taken; `curion`/`curiocity` free) and an English-sound pass.
