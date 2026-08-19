<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Tech Specs — plugin-generator build profiles

TLDR: Add a `--profile <name>` build axis (orthogonal to release/domain) to `src/rosettify-plugins`.
A profile JSON descriptor supplies a `destinationSuffix`, `pluginNameSuffix`, `pluginDescriptionSuffix`
and per-target `modelOverrides`. Model normalization is refactored so `PluginSpec.modelVocabulary`
becomes the sole live carrier of an effective map threaded into the 4 `normalize*` fns (FR-ARCH-0059);
a profile block replaces a target's built-in map exhaustively. `subagent_required_model` prose lists
are normalized always-on for the 6 non-Antigravity targets (FR-COPY-0083). A namespaced
`profile-<name>-only` filename directive scopes files to a profile. A no-profile run stays structurally
identical to today except the one intended content change (subagent list filtering). SPECS owns WHAT;
`-PLAN.md` owns HOW; `architecture-notes.md` owns WHY (decisions A–E).

Scope: `src/rosettify-plugins` only. NO source/test/docs edits are described here as steps — see PLAN.
Design principles applied: SRP, DRY, KISS, YAGNI, MECE, FR-ARCH-0005 composition (no identity branch).

## 1. Non-functional / architecture-significant

| id | contract |
|---|---|
| NFR-0001 | Structural (path-set) parity per profile-AND-target combo. Oracle extended to restate directive + profile-suffix semantics independently. No-profile path set == today (2229 paths, vfsSize 320). |
| NFR-0002 | Profile is an input dimension: identical inputs+profile ⇒ identical output. |
| NFR-0003 | Idempotent into clean/empty dir; profile reuses the same preserved tree. |
| NFR-0010/0011 | No new runtime dependency. All work uses existing `commander`, `gray-matter`, node `fs`/`path`, `micromatch`. JSON.parse for descriptors. |
| FR-ARCH-0005 | No processor branches on target/IDE identity. Per-case variation by composition; `exhaustive` is an outcome flag, not identity. |
| FR-ARCH-0059 | `modelVocabulary` sole carrier; 4 `normalize*` refactored in place to take the map; every caller updated; no parallel path. |

## 2. Component map (target state)

New:
- `src/spec/profiles.ts` — `ProfileDescriptor`, `loadProfile`, `ProfileValidationError`,
  `resolveEffectiveVocabulary`.
- `src/plugin-processors/plugin-normalize-subagent-model.ts` — factory
  `pluginNormalizeSubagentRequiredModel(tokenMapper)` + 4 per-vocabulary token mappers.
- `src/rosettify-plugins/profiles/lightweight.json` — reference descriptor (dir does not exist yet).

Modified (contracts in §3–§7): `types.ts`, `cli.ts`, `generate.ts`, `spec/model-maps.ts`,
`spec/targets.ts`, `vfs/directives.ts`, `file-processors/file-apply-overrides.ts`,
`file-processors/file-normalize-{claude,cursor,copilot,codex}-models.ts`,
`file-processors/file-codex-agent.ts`, `plugin-processors/plugin-copy.ts`,
`plugin-processors/plugin-process-spec-entries.ts`, `tests/e2e/parity-derive-structure.ts`.

Decision refs (see architecture-notes): A=model-map threading · B=subagent filtering ·
C=profile directive · D=manifest suffix · E=profile load/validate.

## 3. Model normalization — refactored contracts (Decision A, FR-ARCH-0059, FR-COPY-0020/21/22)

```ts
interface ModelVocabulary { map: Record<string,string>; exhaustive?: boolean } // exhaustive omitted = false
const MODEL_DROP: unique symbol // "remove the model: line" (profiled no-survivor)

normalizeClaude(field: string, map: Record<string,string>, exhaustive?: boolean): string | null | typeof MODEL_DROP
normalizeCursor(field: string, map: Record<string,string>, exhaustive?: boolean): string | null | typeof MODEL_DROP
normalizeCopilot(field: string, map: Record<string,string>, exhaustive?: boolean): string | null | typeof MODEL_DROP
normalizeCodex(field: string, map: Record<string,string>, exhaustive?: boolean): CodexModelResult | null | typeof MODEL_DROP
```

Selection strategy UNCHANGED (constraint). Return semantics (single loop per fn):

- Claude: scan tokens for first claude-compatible (`startsWith('claude-')` or contains
  opus/sonnet/haiku). Derive family key ∈{opus,sonnet,haiku} from substring. `map[key]` present ⇒
  return it. Key absent ⇒ if `exhaustive` continue-scan else the token is claude-`inherit`-eligible
  (a claude token with a tier key absent from a NON-exhaustive built-in map cannot occur — built-in
  is complete). claude-prefixed but no tier substring ⇒ `inherit` (non-exhaustive) / skip
  (exhaustive). Scan end: `exhaustive ? MODEL_DROP : (foundClaudeToken ? 'inherit' : null)`.
  Non-exhaustive result is byte-identical to today (`model-maps.ts:18-30`).
- Cursor/Copilot: scan tokens. `map[token]` present ⇒ return mapped. Absent ⇒ `exhaustive` continue,
  else return token verbatim (passthrough) — because a non-exhaustive first-token passthrough always
  resolves on the first token, this reproduces today's strict-first `map[first] ?? first`
  (`model-maps.ts:84-88,139-143`). Scan end (exhaustive only): `MODEL_DROP`.
- Codex: scan tokens for first `gpt-`. `map[token]` present ⇒ use mapped token; absent ⇒ `exhaustive`
  continue, else use token as-is (built-in map `{}` ⇒ always as-is = today). Then effort-split the
  chosen token (`-high|-medium|-low`) into `{model, effort}` (`model-maps.ts:155-169`). No `gpt-`
  token ⇒ `null` (non-exhaustive, today) ; all `gpt-` candidates absent under exhaustive ⇒
  `MODEL_DROP`.

Built-in vocabulary maps become the live effective maps:
- `CLAUDE_VOCABULARY.map = CLAUDE_CODE_MAP` (keys opus/sonnet/haiku).
- `CURSOR_VOCABULARY.map = {...CURSOR_CLAUDE_MAP, ...CURSOR_GPT_MAP, ...CURSOR_GEMINI_MAP}`.
- `COPILOT_VOCABULARY.map = {...COPILOT_CLAUDE_MAP, ...COPILOT_GPT_MAP, ...COPILOT_GEMINI_MAP}`.
- `CODEX_VOCABULARY.map = {}` (identity/pass-through), `exhaustive:false`.
- `ANTIGRAVITY_VOCABULARY` unchanged (never normalized).
Keys across the three merged maps are disjoint (claude-*/gpt-*/gemini-*) ⇒ merge order immaterial.

Processor contracts (`file-normalize-*-models.ts`): stop ignoring `ctx`; pass
`ctx.spec.modelVocabulary.map` and `.exhaustive`. Interpret `MODEL_DROP` via `removeModelLine`
(`file-normalize-models.ts:46`). Non-`MODEL_DROP` behavior unchanged. FR-ARCH-0057 built-in-map
GPT-5.3+ restriction stays on the built-in constants; a profile block may name any id (no restriction).

Codex both call sites (FR-COPY-0084): `fileNormalizeCodexModels` (markdown, `file-normalize-codex-
models.ts:30`) AND `fileCodexAgentFormat` (agents TOML, `file-codex-agent.ts:31`) call the SAME
`normalizeCodex(field, ctx.spec.modelVocabulary.map, exhaustive)`. `file-codex-agent.ts` currently
already receives `ctx` (`:16-18`) — wire the map through.

## 4. Profile descriptor + validation (Decision E, DATA-CFG-0006, FR-PROF-0001)

```ts
interface ProfileDescriptor {
  destinationSuffix: string;
  pluginNameSuffix: string;
  pluginDescriptionSuffix: string;
  modelOverrides: Record<TargetName, Record<string,string>>; // outer=spec.name, inner per §4.1
}
class ProfileValidationError extends Error {}  // message names offending key + accepted set
loadProfile(profileSource: string, name: string): ProfileDescriptor  // reads <profileSource>/<name>.json; throws on any V-violation
```

Validation (fail-fast, BEFORE any output — call site = generate() pre-flight, before buildVfs):
| id | rule | AC |
|---|---|---|
| V-exist | file at `<profileSource>/<name>.json` exists | FR-PROF-0001.AC2 |
| V-parse | parses as JSON | FR-PROF-0001.AC3 |
| V1 | every `modelOverrides` outer key ∈ the 7 `spec.name` values | .AC4 / DATA-CFG-0006.AC7 |
| V2 | no `core-antigravity` block | .AC5 / DATA-CFG-0006.AC6 |
| V3 | `core-claude` inner keys ⊆ {opus,sonnet,haiku} | .AC6 / DATA-CFG-0006.AC8 |
| V7 | no top-level field beyond the 4 named | .AC7 / DATA-CFG-0006.AC9 |
| V4 | standalone with no block inherits parent block (resolution-time, not load) | DATA-CFG-0006.AC5 |
| V5 | dead inner entry (matches no source token) ignored silently (resolution-time) | FR-PROF-0010.AC5 |

`--profile` value rejected at CLI parse if it contains `/`, `\`, or `.json` (FR-CLI-0032.AC3).
`--profileSource` default `<source>/src/rosettify-plugins/profiles`; overridable; derives from
`--source` exactly as `--pluginsSource` (FR-CLI-0033).

### 4.1 Inner key-space (mirrors built-in keying)
core-claude → {opus,sonnet,haiku}; core-cursor/core-copilot → exact source model tokens;
core-codex → exact `gpt-` source tokens; standalones inherit parent; core-antigravity → none.

### 4.2 Effective-vocabulary resolution (Decision A/B shared)
`resolveEffectiveVocabulary(targetName, builtinVocab, profile|null): ModelVocabulary` —
no profile OR no block ⇒ `{map: builtinVocab.map, exhaustive:false}`; block present ⇒
`{map: block, exhaustive:true}`. Standalone with no own block uses the parent's block (V4). Assigned
to `spec.modelVocabulary` in `buildAllSpecs`. Sole entry point for profile model data.

## 5. subagent_required_model normalization (Decision B, FR-COPY-0083/0084)

```ts
pluginNormalizeSubagentRequiredModel(tokenMapper: (token: string, map: Record<string,string>) => string | null): PluginProcessor
```
Per non-binary/non-null/non-verbatim frame, rewrite each `subagent_required_model="<list>"`:
split on `,` (trim) → map each token via `tokenMapper(token, spec.modelVocabulary.map)`
(null = drop) → de-duplicate keeping FIRST → preserve source order → re-emit `join(", ")`;
zero survivors ⇒ value `"inherit"`. Idempotent; skip-set matches `pluginAntigravitySubagentModel`.
`tokenMapper` reuses decision-A low-level selection+lookup helpers (no reimplementation):
- claude mapper: keep tokens with opus/sonnet/haiku family; map via family key.
- cursor/copilot mapper: keep tokens present in effective map; map to IDE value.
- codex mapper: keep `gpt-` tokens; map via effective map; STRIP effort suffix (GAP-1 decision —
  base id only, no place for effort in a single-string list; recommend FR-COPY-0083 amendment).
Composed into `extraAfterIndexes` for the 6 non-Antigravity specs. Antigravity keeps
`pluginAntigravitySubagentModel` unchanged (FR-COPY-0083.AC6). Effective map = profile block when
active (FR-COPY-0083.AC4), else built-in.

## 6. Profile-scoped filename directive (Decision C, FR-PROF-0030)

Grammar unchanged (tilde-split, opening+closing fence, empty trailing token inert). New token kind
`profile-<name>-only`, distinguished by the `profile-` prefix.
```ts
matchesTarget(conditions, targetName): boolean   // MODIFIED: ignore any -only token starting with "profile-"
matchesProfile(conditions, activeProfile: string | null): boolean  // NEW
interface TargetContext { spec; vfs; release; activeProfile: string | null }  // field ADDED
```
`matchesProfile`: for each `profile-<name>-only` token, include iff `name === activeProfile`; if
`activeProfile===null`, exclude any file bearing any `profile-*-only` token. `fileApplyOverrides`
applies target-only + profile-only filters in the SAME step, BEFORE overwrite truncation
(`file-apply-overrides.ts:24,29`); `overwrite` does not bypass profile exclusion (FR-PROF-0030.AC4).
`activeProfile` threaded `GenerateOptions.profile` → `SpecBuildContext` → `pluginProcessSpecEntries` →
`TargetContext` literal (`plugin-process-spec-entries.ts:40-44`).

## 7. Destination + manifest suffixing (Decisions D, FR-PROF-0020/0021)

- `spec.destination = 'core-<x>' + (profile?.destinationSuffix ?? '')`; `spec.name` NEVER suffixed
  (`targets.ts:158-159` etc). All 7 build; outputs land in the same output dir (FR-PROF-0020).
- `pluginCopy(outputDir, dryRun, manifestSuffix?: {name,description}|null)`: when copying a
  `plugin.json`, parse → append `name`/`description` suffixes → write; else raw copy. Standalone:
  append `pluginNameSuffix` to `manifestOverride.name` before `emitStandaloneManifest`. `manifestSuffix`
  null (no profile) ⇒ byte-identical to today. Suffixes global across all 7 (FR-PROF-0021.AC3).

## 8. No-profile invariance (FR-PROF-0040, NFR-0001)

`--profile` absent ⇒ `activeProfile=null`, `destinationSuffix=''`, `manifestSuffix=null`, all built-in
maps (`exhaustive:false`), all `profile-*-only` files excluded. Repo-wide the ONLY intended content
delta vs today is `subagent_required_model` filtering (FR-COPY-0083, always-on).

## 9. Parity oracle extension (NFR-0001, INDEPENDENT restatement — do NOT import generator code)

`tests/e2e/parity-derive-structure.ts` `deriveExpectedPaths` MUST restate directive semantics itself:
(1) strip the directive segment — clean stem = filename-stem split on `~` take `[0]`; (2) exclude a
file whose `<target>-only` token (non-`profile-`) ≠ target under derivation; (3) exclude a file whose
`profile-<name>-only` token ≠ active profile (null ⇒ exclude all profile-scoped); (4) collapse a
directive-stripped stem onto its base document (dedupe) so a profile override yields the SAME derived
path — this also keeps Codex/Antigravity workflow-root grouping correct (light file clean stem =
`coding-flow`). Applies to `rules/`, `workflows/`, `agents/` enumeration (`parity-derive-
structure.ts:108-114`). Optional `activeProfile`+`destinationSuffix` params for profile-combo parity.

## 10. Test data (real baseline fixtures + required synthetics)

Real `subagent_required_model` values (orchestrator measurement, 11 distinct; top 5):
```
A: claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol
B: claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.6, gpt-5.6-terra
C: claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.6, gpt-5.6-terra
D: gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-5, grok-4.6, gpt-5.6-terra
E: claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna
```
Expected (built-in maps, always-on): A→claude: `claude-opus-4-8`; A→codex: `gpt-5.5, gpt-5.6-sol`
(effort stripped, GAP-1); A→cursor: `claude-opus-4-8, gpt-5.5`; B→claude: `claude-sonnet-5`;
E→claude: `claude-haiku-4-5` (via `haiku` family key — family-lookup proof); B→codex:
`gpt-5.4, gpt-5.6-terra`. No-survivor: a claude-only-empty value ⇒ `inherit`.
DE-DUP not exercised by ANY real value (traced all 5) ⇒ dedicated SYNTHETIC fixture from
FR-COPY-0083.AC3: codex `gpt-5.4, claude-opus-4-8, gpt-5.4` → `gpt-5.4`.

Frontmatter model cases (FR-COPY-0020/21/22 amended ACs are the source of truth; representative):
- Cursor built-in `claude-4.8-opus-high, gpt-5.5-high` → `claude-opus-4-8`.
- Cursor profile block `{claude-opus-4-8: gpt-5.4}`, field `claude-opus-4-8` → `gpt-5.4`.
- Cursor profile exhaustive, field `claude-opus-4-8, gpt-5.4`, block has `gpt-5.4` only → `gpt-5.4`.
- Cursor profile exhaustive, no survivor → `model:` line dropped.
- Claude profile `{sonnet: claude-sonnet-5}` (no opus), field `claude-4.8-opus-high, claude-5-sonnet`
  → skip opus, `claude-sonnet-5`.
- Codex profile `{gpt-5.5-high: gpt-5.4-medium}`, field `gpt-5.5-high` → model `gpt-5.4` effort
  `medium`, at BOTH call sites.

Validation negatives (V1–V7): outer key `core-windsurf` ⇒ abort naming key + 7 names; `core-antigravity`
block ⇒ abort; claude inner `claude-opus-4-8` ⇒ abort naming accepted set; unknown top-level field ⇒
abort; missing file ⇒ abort; unparseable JSON ⇒ abort; `--profile foo/bar` or `x.json` ⇒ usage exit≠0.
All abort BEFORE any file written (assert clean output dir).

## 11. Dependencies / assumptions

- No new npm dependency (NFR-0010/0011). JSON.parse for descriptors.
- Trap: `instructions/r3/core/workflows/coding-flow~profile-lightweight-only~overwrite~.md` is INERT
  today (excluded from all 7) and MUST stay excluded on a no-profile run (FR-PROF-0040 regression
  guard); becomes live for `--profile lightweight` only.
- `spec.name` is the directive-match identity — never suffix it.
- Baseline suite is already RED (8 parity failures from the trap fixture); §9 makes it green.

</CRITICAL>
