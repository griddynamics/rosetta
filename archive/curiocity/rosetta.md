# 🗝️ Rosetta / Decipherment — Metaphor World

> The **Rosetta Stone** carried the same decree in three scripts, letting scholars **decipher** a lost language. As a metaphor for an agent-evals harness: each run is an inscription to be **deciphered** (interpreted), then **attested** (certified) against the criteria. Exported here as a standalone, reusable world spec (an alternative to the selected *Tribunal/Curiocity* world).

**Theme:** translation, decipherment, inscription, certification.
**Character:** scholarly, archival, on-brand with the existing *Rosetta* product line.

## Name candidates

- **Rosettify** — verb-form; the npm package is **already owned by us** (zero collision).
- **Rosetta-bench** — npm-free; explicit "benchmark" framing.
- **Stele** — an inscribed stone slab; short and evocative (npm-taken as bare `stele`; use scoped or a variant).
- **Glyphos / Glyphify** — glyph-centric coinages (verify availability before use).

## Command lexicon (core action → allegorical verb)

| Core action | Verb | Meaning in-world |
|---|---|---|
| scaffold a new case | `inscribe` | carve a fresh inscription (the task) |
| discover / load cases | `unearth` | dig up the tablets under `--source` |
| run an agent through a case | `decipher` | work out what the agent's run actually says/does |
| answer interactive prompts | `transcribe` | write down the reply the script calls for |
| judge the result | `attest` | certify the reading against the criteria |
| emit a verdict | `seal` | stamp the certified result |
| a single case | `glyph` / `cartouche` | one inscription / a named cartouche |
| the result / report | `stele` / `tablet` | the finished inscribed slab |
| the case suite | `corpus` | the body of inscriptions |
| clean artifacts | `efface` | wipe the slate |

## Sample CLI (illustrative)

```
rosettify unearth --source ./cases       # discover & validate cases
rosettify decipher --agent claude-code    # run the agent through a case
rosettify attest                          # judge against evaluation criteria
rosettify stele --format md               # emit the report
```

## Worker / orchestrator split (mirrors Curiocity ↔ Curion)

- **Rosetta** (or *Rosettify*) — the orchestrator: unearths the `corpus`, dispatches one worker per `(agent × case × repeat)`, aggregates the `stelae`.
- **Scribe** (or *Glyph*) — the per-trial worker: deciphers one inscription (one case × one CLI) and attests a single verdict.

## Notes

- Strongest argument for this world: **name continuity** with the existing Rosetta theme, and `rosettify` is already ours.
- Argument against (per project owner): too close to the current theme; the goal was a *distinct* identity — hence *Tribunal/Curiocity* was selected for the tool itself.
- Kept here as a ready-to-adopt fallback or for a Rosetta-branded variant.
