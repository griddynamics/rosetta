# Architecture notes — plugin-generator build profiles

Design record for the five committed decisions (A–E), grounded in source read firsthand
(`file:line`). Companion: `plugin-generator-profiles-SPECS.md` (WHAT) ·
`plugin-generator-profiles-PLAN.md` (HOW). This file owns the WHY.

Requirements consumed (all `status=Draft`, `source=User`, in-scope): FR-PROF-0001/0010/0011/0020/
0021/0030/0040 · DATA-CFG-0006 · FR-CLI-0032/0033 · FR-COPY-0083/0084 · amended FR-COPY-0020/0021/
0022 · FR-ARCH-0059 · FR-ARCH-0005 (Approved) · FR-ARCH-0046 (Approved) · FR-ARCH-0057 · FR-ARCH-0058
(Approved) · NFR-0001/0002/0003/0010/0011.

Baseline note (measured by orchestrator, folded in): `npx vitest run` in `src/rosettify-plugins`
is ALREADY RED before any work — 564 passed / 8 failed, all 8 in `tests/e2e/parity.e2e.test.ts`.
Root cause is the pre-existing directive fixture
`instructions/r3/core/workflows/coding-flow~profile-lightweight-only~overwrite~.md` (verified present,
1009 B) against a directive-unaware oracle. See decision C + PLAN step S8. This is not our regression.

---

## A. Effective model map → the four normalize processors

FR-ARCH-0059 mandates: refactor `normalize{Claude,Cursor,Copilot,Codex}` IN PLACE to take the map as
a parameter; every caller updated; no parallel path; `PluginSpec.modelVocabulary` the sole live
carrier; no field beside it. FR-ARCH-0005 forbids branching on target/IDE identity or an
identity-discriminant flag (it explicitly names `ModelVocabulary.kind` as a removed violation).

Current facts:
- `modelVocabulary` populated on all 7 specs, read NOWHERE (`types.ts:94`; `targets.ts:162,191,230,
  273,362,448,576`). The 4 processors ignore their `_ctx` and call module-level maps directly
  (`file-normalize-claude-models.ts:16,21`; `-cursor-:18,23`; `-copilot-:18,23`; `-codex-:24,30`).
- Map shapes DIFFER: Claude keyed by family substrings `opus/sonnet/haiku` (`model-maps.ts:12-16,
  23-25`); Cursor/Copilot keyed by exact source token across THREE maps each — CLAUDE+GPT+GEMINI
  (`model-maps.ts:38-88,94-143`), but the vocabulary object exposes only the CLAUDE map
  (`:177-179,181-183`); Codex has NO lookup map at all — pure effort-split regex (`:155-169`),
  vocabulary `{map:{}}` (`:185-187`). CLAUDE_VOCABULARY/CODEX_VOCABULARY are `{map:{}}` today.
- No-survivor + absent-token behavior DIFFERS per IDE AND per profiled/unprofiled path (F1-RESOLVED,
  FR-COPY-0020/0021/0022 amended).

Options:
- **A1 — per-IDE `kind` discriminant on ModelVocabulary, one dispatcher.** REJECTED outright:
  literally the `ModelVocabulary.kind` FR-ARCH-0005 removed; re-introduces identity dispatch.
- **A2 — second, profile-only normalize path alongside the built-in path.** REJECTED: FR-ARCH-0059.
  AC5 makes a parallel implementation non-conforming; doubles maintenance, drifts from built-in.
- **A3 — one uniform map `Record<string,string>` on `modelVocabulary`, plus a genuine BEHAVIOR flag
  `exhaustive`; key-DERIVATION stays inside each per-vocabulary function.** COMMITTED.

Committed design (A3):
- Populate the built-in vocabularies so `modelVocabulary.map` is real for every target:
  Claude = `CLAUDE_CODE_MAP` (family-keyed); Cursor = `{...CLAUDE,...GPT,...GEMINI}` merged (keys
  disjoint → merge order irrelevant, VERIFY); Copilot = same merge; Codex = `{}` (identity /
  pass-through). `exhaustive` omitted (=false) on all built-ins.
- `ModelVocabulary` gains `exhaustive?: boolean`. A profile block placed on `modelVocabulary` sets
  `exhaustive:true` and `map = <block>`. This is a behavior flag naming an OUTCOME (exhaustive
  replacement ⇒ skip-absent + drop-on-no-survivor) that applies identically to every target — NOT an
  identity discriminant (its value-set is {profiled, unprofiled}, never an IDE/target set). Permitted
  by FR-ARCH-0005 ("a genuine behavior flag that names a capability or outcome").
- Signatures become `normalizeClaude(field, map, exhaustive?)`, `normalizeCursor(field, map,
  exhaustive?)`, `normalizeCopilot(...)`, `normalizeCodex(...)`. Each keeps its OWN selection +
  key-derivation (Claude derives family key then `map[key]`; Cursor/Copilot/Codex use the token as
  key). Selection strategy is unchanged (constraint honored). The family-vs-exact-token difference
  lives inside each separately-composed function — no runtime branch on target — so
  `claude-haiku-4-5` resolving via the `haiku` key and `gpt-5.6-terra` resolving via exact-token key
  coexist with zero identity dispatch. (Answers orchestrator's family-key check.)
- The `exhaustive` flag unifies BOTH per-path differences through one loop per function:
  `for token: if map has key → return mapped; else if !exhaustive → return <today's fallback>;
  else continue`. Terminal when the scan ends: `exhaustive ? DROP : <today's no-survivor>`. This
  reproduces today's byte-for-byte behavior when `exhaustive=false` (Cursor/Copilot = first-token
  `?? passthrough`; Claude = `inherit`; Codex = strip / no fields) and the profiled semantics when
  `true`.
- DROP signal: normalize returns a distinct sentinel (proposed `MODEL_DROP` unique symbol, or a
  discriminated result) meaning "remove the `model:` line", separate from today's `null` ("no
  qualifying token → leave unchanged"). The processors interpret it via `removeModelLine`
  (`file-normalize-models.ts:46`).

Warrant: one map shape + one behavior flag is the minimal change that makes `modelVocabulary` the
sole live carrier, keeps a single code path, and preserves both no-survivor idioms — without an
identity discriminant.

---

## B. `subagent_required_model` filtering (FR-COPY-0083, always-on, 6 non-Antigravity targets)

Facts: attribute lives in workflow/skill BODY prose inside phase tags — 19 source files under
`instructions/r3/core/` (verified: e.g. `workflows/security-flow-model-and-select.md:28`), ×7 = 133
committed occurrences (matches orchestrator baseline). Only Antigravity rewrites it, via
`pluginAntigravitySubagentModel` (a whole-plugin regex PluginProcessor, `plugin-antigravity-subagent-
model.ts:15,17-38`) composed in `extraAfterIndexes` — it REPLACES all → `inherit`, runs AFTER
`pluginGenerateIndexes` (`targets.ts:637`, pipeline slot `targets.ts:683-684`).

Options:
- **B1 — FileProcessor, per SpecEntry.** REJECTED: would need adding to every entry that can carry
  the attribute AND still miss content assembled at plugin-tier (bootstrap hook payloads read
  document bodies from `frames`, `plugin-replace-literals.ts:27-29`). Cannot guarantee G5 ("a
  disallowed model appears NOWHERE").
- **B2 — one shared PluginProcessor that switches on target for the selection rule.** REJECTED:
  FR-ARCH-0005 identity branching.
- **B3 — a PluginProcessor FACTORY `pluginNormalizeSubagentRequiredModel(tokenMapper)`, the per-IDE
  `tokenMapper` composed into each of the 6 targets; Antigravity unchanged.** COMMITTED.

Committed design (B3):
- Factory returns a named processor that, for every non-binary/non-null/non-verbatim frame, rewrites
  each `subagent_required_model="…"` list: split → for each token apply the target's `tokenMapper`
  (drop | mapped-value) → de-duplicate keeping FIRST → preserve source order → re-join `", "`;
  empty ⇒ `"inherit"`. Mirrors the Antigravity skip-set and idempotency.
- `tokenMapper` is a thin per-vocabulary function reusing the SAME low-level selection+lookup helpers
  extracted in decision A (FR-COPY-0083 "not a reimplementation"), reading the effective map from
  `p.spec.modelVocabulary` (so a profile's block flows through automatically, FR-COPY-0083.AC4).
- Pipeline slot: `extraAfterIndexes` — same slot as the Antigravity sibling, so assembled hook
  payloads inherit the filtering (before the bootstrap assembler). Order vs `pluginReplaceLiterals`
  (Codex) is irrelevant — disjoint target strings.
- Codex covered at both frontmatter call sites is decision-A's concern; this attribute is prose-only
  and single-surface, but the Codex `tokenMapper` shares the same helper so FR-COPY-0084.AC3 holds.

Warrant: the plugin-tier late pass is the only placement that provably reaches every emitted surface
(matches the Antigravity precedent that exists for exactly this reason); the factory keeps per-IDE
selection composed, not branched.

GAP-1 (Codex effort suffix in a prose list) — RESOLVED here, unit flagged for amendment. A prose list
is ONE string with no place for a separate `model_reasoning_effort`. Given
`"claude-opus-5, gpt-5.6-sol-high, gemini-3.7-flash-high, gpt-5.6-sol"` under core-codex the survivors are
`gpt-5.6-sol-high`, `gpt-5.6-sol`. DECISION: strip the effort suffix → emit the base id (`gpt-5.6-sol`,
`gpt-5.6-sol`). Warrant: FR-COPY-0084's contract is that a given Codex token resolves to the SAME
value at every Codex surface; the frontmatter `model:` resolves `gpt-5.6-sol-high`→`gpt-5.6-sol`, so keeping
`gpt-5.6-sol-high` in prose would diverge. Stripping also makes de-dup correct (two effort variants of one
base collapse). FR-COPY-0083 is genuinely UNDERSPECIFIED on this point (it says "map to its IDE-native
value" without defining IDE-native for a Codex prose token) — recommend orchestrator amend FR-COPY-0083
to state effort is stripped for the prose surface.

GAP-2 (de-dup testability) — CONFIRMED not covered by real data. Traced all 5 high-volume baseline
values through Claude, Cursor, Copilot, Codex built-in maps: none yields two source tokens collapsing
to one mapped value (Claude keeps a single family token; Cursor/Copilot/Codex survivors map to
distinct values). De-dup (keep-first) is therefore UNTESTABLE against real committed content and needs
a SYNTHETIC fixture. FR-COPY-0083.AC3 already supplies one: `"gpt-5.6-terra, claude-opus-5, gpt-5.6-terra"`
→ `"gpt-5.6-terra"` (Codex). PLAN's test plan uses it as the dedicated dedup fixture and states plainly that
real data does not exercise the rule.

---

## C. Profile selector → directive evaluation (FR-PROF-0030)

Facts: `matchesTarget(conditions, targetName)` excludes on ANY token ending `-only` whose prefix ≠
`targetName` (`directives.ts:38-45`), comparing against `spec.name` (`file-apply-overrides.ts:20,24`).
So a bare `profile-lightweight-only` token would be read as a target token → dropped from ALL targets.
`TargetContext` = `{spec, vfs, release}` (`types.ts:150-154`), built at
`plugin-process-spec-entries.ts:40-44`, carries no profile. `deterministicHooks` is the per-run
override precedent threaded via `GenerateOptions`→pipeline (`generate.ts:33-36`). Directive filtering
runs before overwrite truncation (`file-apply-overrides.ts:24 then 29-32`).

Options:
- **C1 — reuse `<name>-only` unnamespaced.** REJECTED: token-namespace collision (discovery HAZARD),
  FR-PROF-0030 rationale.
- **C2 — put active profile name on every `PluginSpec`.** Workable but redundant: profile is a
  run-level axis, not per-target data; muddies the spec.
- **C3 — add `activeProfile: string | null` to `TargetContext`, symmetric with `release`; namespace
  the token as `profile-<name>-only`; `matchesTarget` ignores `profile-`-prefixed tokens; new
  `matchesProfile(conditions, activeProfile)`; both applied in the same `fileApplyOverrides` step
  before overwrite truncation.** COMMITTED.

Committed design (C3):
- Grammar unchanged (tilde-split, `directives.ts:22-26`); token kind distinguished purely by the
  `profile-` prefix. `matchesTarget`: when a `-only` token starts with `profile-`, skip it (it is not
  a target token). `matchesProfile(conditions, activeProfile)`: for each `profile-<name>-only` token,
  include iff `<name> === activeProfile`; when `activeProfile` is null, exclude any file carrying any
  `profile-*-only` token (FR-PROF-0030.AC2 / FR-PROF-0040.AC3).
- Thread `activeProfile` from `GenerateOptions.profile` → `SpecBuildContext` → `pluginProcessSpecEntries`
  → the `TargetContext` literal → `fileApplyOverrides`, exactly as `release` is threaded.

Warrant: a `TargetContext` field mirrors the existing `release` axis and the `deterministicHooks`
per-run pattern; a prefix keeps the two `-only` namespaces disjoint with a one-line guard in each of
the two matcher functions.

---

## D. Manifest name/description suffixing (FR-PROF-0021)

Facts: for MAIN targets, `plugin.json` is copied VERBATIM to disk by `pluginCopy`'s
`copyDirRecursive` (`plugin-copy.ts:59,124-148`, raw `fs.copyFileSync`) — it never becomes a frame
(only `*.tmpl` files are framed, `:103-112`). For STANDALONES, the manifest is generated by
`emitStandaloneManifest(manifestOverride.name, version)` (`plugin-copy.ts:66-71`). So `pluginCopy` is
the SOLE manifest-emission site. `pluginReplaceLiterals` operates only on frames (`plugin-replace-
literals.ts:44-45`) and does fixed `(from,to)` pairs (`:49-51`).

Options:
- **D1 — `pluginReplaceLiterals`.** REJECTED on two independent grounds: (a) `plugin.json` is not a
  frame, so the processor never sees it; (b) suffixing must READ the existing value to append, which
  a fixed literal pair cannot express (FR-ARCH-0058 semantics are exact static substitution).
- **D2 — new post-copy PluginProcessor that re-reads on-disk `plugin.json` and rewrites it.**
  REJECTED: re-reads disk, order-fragile, awkward under dry-run, needs the manifest path (not a spec
  field today).
- **D3 — thread the two suffix strings into `pluginCopy` (data params, like `outputDir`/`dryRun`);
  when copying a `plugin.json`, parse → append `pluginNameSuffix` to `name` and
  `pluginDescriptionSuffix` to `description` → write; for standalones append `pluginNameSuffix` to the
  override name.** COMMITTED.

Committed design (D3): `pluginCopy(outputDir, dryRun, manifestSuffix?)` where `manifestSuffix =
{name, description} | null`. In `copyDirRecursive`, a file whose basename is `plugin.json` is
JSON-parsed, its `name`/`description` appended, re-serialized (preserve formatting; VERIFY serializer
matches committed style for structural/no-profile stability), and written instead of raw-copied; all
other files raw-copied unchanged. Standalone path appends to `manifestOverride.name` before
`emitStandaloneManifest`. When `manifestSuffix` is null (no profile) behavior is byte-identical to
today. `spec.name` is never touched — only manifest `name` field and `spec.destination` (decision:
destination suffix set in `buildAllSpecs`).

Warrant: `pluginCopy` already owns every manifest write (raw copy + `emitStandaloneManifest`);
read-then-append needs the existing value, which only code at the write site can supply.

---

## E. Profile loading + validation (FR-PROF-0001, V1–V5)

Facts: `spec/releases.ts` `getRelease(name)` is the descriptor-lookup precedent
(`releases.ts:18-20`). Validation must fail before ANY output write (FR-PROF-0001, G3). CLI errors
today: `generate()` returns non-zero and writes to stderr (`generate.ts:23-28`); `cli.ts` catches
fatal throws → exit 1 (`cli.ts:98-101`).

Options:
- **E1 — inline in cli.ts.** REJECTED: mixes parsing with domain validation; not unit-testable in
  isolation; V1–V5 need the 7 target names + Claude family set as data.
- **E2 — inside buildAllSpecs.** REJECTED: buildAllSpecs runs after VFS build, inside generate; and
  it constructs specs, not a validation owner. Also FR-PROF-0001 requires abort before pipeline runs.
- **E3 — new `src/spec/profiles.ts`, mirroring `releases.ts`; `loadProfile(profileSource, name)`
  reads `<profileSource>/<name>.json`, parses, validates V1–V5 + unknown-top-level-field, throws a
  typed `ProfileValidationError`; called at generate() pre-flight before `buildVfs`; caught and
  reported as non-zero with no output.** COMMITTED.

Committed design (E3):
- `ProfileDescriptor` type (SPECS §4). `loadProfile` throws `ProfileValidationError` (new, carries a
  human message listing the offending key + accepted set). Resolution `<profileSource>/<name>.json`
  exactly (FR-CLI-0032/0033).
- Call site: early in `generate()`, immediately after release validation and BEFORE `buildVfs`
  (`generate.ts:22-42`) — guarantees no output written on any violation (V-abort). `cli.ts` rejects a
  path-like `--profile` value (contains `/`, `\`, or `.json`) at arg-parse via a commander
  `InvalidArgumentError` (FR-CLI-0032.AC3), and resolves `--profileSource` default
  `<source>/src/rosettify-plugins/profiles` (FR-CLI-0033.AC1), mirroring `--pluginsSource`
  (`cli.ts:78`).
- Validation table V1–V7 owned by SPECS §4; standalone inheritance (V4) is applied at
  effective-map resolution in `buildAllSpecs`, not at load (a descriptor with no standalone block is
  valid).

Warrant: a sibling of `releases.ts` keeps profile a first-class descriptor axis, isolates fail-fast
validation as a unit-testable boundary, and the pre-`buildVfs` call site satisfies "no output on
violation" structurally.

---

## Cross-cutting: effective-map resolver (shared by A + B)

`buildAllSpecs` gains a pure helper `resolveEffectiveVocabulary(targetName, builtin, profile)`:
returns `{map: builtin.map, exhaustive:false}` when no profile / no block for the target; returns
`{map: block, exhaustive:true}` when the profile has a block (standalone inherits parent's block, V4;
antigravity never has one, V2). Assigned to `spec.modelVocabulary`. This is the SINGLE place profile
model data enters the spec set; both frontmatter normalization (A) and subagent-list filtering (B)
read it downstream. No field beside `modelVocabulary` (FR-ARCH-0059.AC3).

## Infeasible / contradictory / underspecified — for orchestrator

1. **FR-COPY-0083 underspecified — Codex effort in a prose list.** See GAP-1. Decided (strip effort);
   recommend amending FR-COPY-0083 to state it explicitly. UNIT: FR-COPY-0083.
2. **De-dup rule (FR-COPY-0083.AC5/keep-first) not exercised by real data.** See GAP-2. Not a defect —
   flagging that the acceptance evidence must be a synthetic fixture (AC3), not committed content.
3. **`exhaustive` behavior flag vs FR-ARCH-0005.** Judged conforming (outcome flag, target-independent),
   but it is the subtlest call in the design. If the orchestrator reads FR-ARCH-0005 as forbidding ANY
   added `ModelVocabulary` field, the fallback is to encode the two path-differences as a caller-passed
   options object on the normalize call — functionally identical, same flag relocated. Raising so the
   reviewer rules explicitly. UNIT: FR-ARCH-0005 / FR-ARCH-0059.
4. **NFR-0001 amended oracle is a hard prerequisite, not optional.** The suite cannot go green while any
   production instruction file carries a directive; the trap fixture already reddens 8 tests at
   baseline. The oracle must independently restate directive semantics WITHOUT importing generator code
   (its header comment forbids it). This is on the critical path. UNIT: NFR-0001.
