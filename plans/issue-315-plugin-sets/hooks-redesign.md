# `hooks.json` generation — evidence matrix and redesign

Issue #315 · branch `feat/315-plugin-sets` · analysis + design only, no code changed.

Scope: how the Rosetta plugin generator produces `hooks.json` for every IDE and every distribution
form. Written to be executed by an implementing engineer.

Evidence convention: every claim is labelled **FACT** (read from a file, a git object, or an
empirical generation run recorded here) or **JUDGEMENT** (my inference). Git-recovered content cites
the ref. Where docs and shipped code disagree the doc says which I trust and why.

Two empirical runs were made for this analysis, both writing outside the repo:

- `RUN-T` — `npm --prefix src/rosettify-plugins start -- --source <repo> --release r3 --domain core
  --deterministic-hooks true  --output <scratch>/gen-post`
- `RUN-F` — same with `--deterministic-hooks false --output <scratch>/gen-false`

`RUN-T` is the important one: the shipped default is `false` (FR-CLI-0012), and **`false` is the
branch where the copilot plugin and standalone documents differ least**. Every gate in PR #340 ran
at `false`. That is why nothing caught this.

---

## 0. Executive summary

1. The seven pre-#315 `hooks.json.tmpl` files were collapsed into one TypeScript assembler
   (`buildHooksDocument`) driven by a lookup table (`HOOK_LAYOUTS`) and emitted through a single
   `{{{hooks_json}}}` placeholder. **FACT.**
2. I compared the assembler's output cell by cell against the seven original template literals.
   **The table is not lossy.** Every envelope, event name, event casing, matcher string, entry key
   set, path prefix, grouping mode and deliberate asymmetry is reproduced exactly. **FACT** (§4).
3. **Exactly one thing is wrong: the layout is selected per _spec_ (per IDE target), but a spec
   emits _more than one_ `hooks.json`, in different forms.** `HOOK_LAYOUTS[name]` where `name` is a
   `TargetName` (`src/spec/targets.ts:662`) yields one document per spec; `collectTmplFrames`
   (`src/plugin-processors/plugin-copy.ts:128`) hands every `.tmpl` in the shared
   `template-<family>` folder to that one document. **FACT.**
4. Consequence at `--deterministic-hooks true` (RUN-T, md5): all three copilot documents are
   byte-identical (`b13704be…`, 29090 B) when `hooks/hooks.json` must be the standalone form
   (`d7d81125…`, 1524 B); and `core-cursor/hooks.json` (root) is byte-identical to
   `core-cursor/hooks/hooks.json` (`afbda2fd…`) when it must be the `.cursor/hooks/`-prefixed
   standalone form (`900befd8…`). **FACT.**
5. **My design recommendation is NOT the one recorded as agreed in `follow.md`.** `follow.md`
   proposes reverting to literal per-IDE templates with `{{#each}}`. That reintroduces a failure
   class (§7.1) and contradicts a requirement approved on 2026-09-02 (`DATA-CFG-0008`). I recommend
   keying the layout by **output document** instead of by target, plus committed golden documents as
   the artifact a maintainer reads. This is a tradeoff above my authority — presented in §7 with
   alternatives costed and a stated default, for the owner to decide.
6. Four claims in `follow.md`'s "GROUND TRUTH" table are wrong, because they read the
   `docs/hooks/<ide>/hooks.json` **verification probe** configs as if they were shipping shapes.
   Corrected with citations in §2.
7. The dual-casing question has a definite answer and it is **containment, not sameness** (§3.2).
   It also exposes a live functional defect — VS Code Copilot has never fired the Rosetta bootstrap
   hook — which I recommend fixing **separately and under HITL**, not folded into this refactor.

---

## 1. Sources, and which of them is authoritative for what

There are four kinds of "hooks.json" in this repo and conflating them is how the earlier errors
happened. **FACT** for every row (paths verified on disk).

| Kind | Path | What it is | Authoritative for |
|---|---|---|---|
| **Contract doc** | `docs/hooks/<ide>.md` | Empirically-verified manufacturer contract; the output of the `docs/hooks-verify.md` protocol | Event names, casings, payloads, exit codes, registration format, per-runtime behavior |
| **Probe config** | `docs/hooks/<ide>/hooks.json` | The harness wired to `docs/hooks/tester.js` that *produced* the contract | **Nothing about shipping shape.** It deliberately over-registers to measure behavior |
| **Shipped template / generated output** | `src/rosettify-plugins/plugins/template-*/**/hooks.json.tmpl`, `plugins/<set>-<ide>/**/hooks.json` | What users actually get | Current behavior only; must be reconciled *to* the contract doc |
| **Verbatim reference copy** | `plugins/<set>-<ide>/**/skills/harness/references/hooks/<ide>/hooks.json` | A verbatim copy of the probe config, shipped as harness reference material | Nothing. **Must be excluded from every hooks.json assertion** — it is 6 extra files per plugin folder and will false-positive any glob-based test |

`docs/hooks-verify.md:1` — *"the per-IDE configure guides are authoritative for hook output format
in *generated plugins*"* (INT-IDE-0002), and *"the `docs/hooks/<ide>.md` spec is the verification
reference those guides are reconciled against"*. **FACT.**

`docs/hooks-verify.md:16` — *"Verified facts (the `Observed` columns) are the source of truth. Code,
requirements, and configure guides are reconciled TO that truth — never the reverse."* **FACT.**

**Trust order used throughout this document:** `docs/hooks/<ide>.md` Practical Conclusions and
Observed columns > `instructions/r3/core/skills/harness/references/configure/<ide>.md` >
pre-#315 template literals (what demonstrably worked) > probe configs (harnesses, not shapes).

### 1.1 Correcting the probe-config misreadings in `follow.md`

`follow.md` ("GROUND TRUTH — the five IDEs are different on every axis") sourced its table from
`docs/hooks/<ide>/hooks.json`. Four cells are wrong as a result. **FACT** for each correction.

| `follow.md` claim | Correction | Evidence |
|---|---|---|
| copilot: *"both camel AND Pascal — every event registered twice"* | The **probe** registers both, deliberately, to measure double-fire. The **contract** says register PascalCase only. The **shipped** templates register neither pair twice — they use camel `sessionStart`/`preCompact` and Pascal `PreToolUse`/`PostToolUse` | `docs/hooks/copilot.md:13`: *"Copilot CLI fires BOTH conventions if both are registered ⇒ **double-fire** per event… PascalCase-only serves both and avoids the double-fire."* vs `docs/hooks/copilot/hooks.json` (16 keys, 6 events × 2 casings) vs `492b6a78~1:src/rosettify-plugins/plugins/core-copilot/.github/plugin/hooks.json.tmpl` |
| copilot: *"`type`, `bash`, `powershell`, `cwd`, `timeoutSec` — no `command` key at all"* | `cwd`/`timeoutSec` appear **only** in the probe and have never shipped. The copilot **standalone** form uses `command`, not `bash`/`powershell` | Probe: `"cwd": ".", "timeoutSec": 30`. Shipped plugin form: `{type, bash, powershell}` only. Shipped standalone form: `{"type":"command","command":"node \".github/hooks/dangerous-actions.js\""}` (RUN-T `core-copilot-standalone/.github/hooks/hooks.json`). Also `FR-HOOK-0005` AC: *"each entry = `{\"type\":\"command\",\"bash\":…,\"powershell\":…}`"* |
| antigravity: *"root envelope `{rosetta-probe}`"* | `rosetta-probe` is the **probe's** arbitrary hook-group name. Shipped is `rosetta`. The key is a group name, not part of the envelope grammar | `docs/hooks/antigravity.md:73`: `<name>.enabled` — *"Group-level; `false` disables."* Shipped: `{"rosetta":{"enabled":true,…}}` (RUN-T `core-antigravity/hooks.json`) |
| cursor: *"entry keys `type`, `command`"* | Shipped cursor entries carry **only** `command` (and `matcher` where bound). `type` is optional with default `"command"` | `docs/hooks/cursor.md:128`: *"`type` … default `\"command\"`"*. RUN-T `core-cursor/hooks/hooks.json`: `{"command": "node hooks/read-once.js"}` |

**JUDGEMENT:** none of these corrections weaken `follow.md`'s conclusion that the IDEs differ on
every axis. They differ *more* than the table said, and along partly different axes.

---

## 2. Evidence matrix

Distribution forms in play. **FACT** — from `src/rosettify-plugins/plugins.json` `targets`,
`src/spec/target-names.ts:16`, and `src/spec/targets.ts` `standaloneTemplates`:

| Form | Meaning | Targets |
|---|---|---|
| **marketplace plugin** | Installed by the IDE's plugin manager into an install dir; scripts reached from the plugin root | `claude`, `codex`, `copilot`, `cursor`, `antigravity` |
| **standalone** | Extracted into the user's own repo under `.cursor/` or `.github/`; scripts reached repo-relative | `cursor-standalone`, `copilot-standalone` |

### 2.1 Root envelope

| Document | Envelope | Evidence |
|---|---|---|
| claude (plugin) | `{ "hooks": { … } }` | `docs/hooks/claude-code.md` *"`settings.json` registration format (R1)"* — `{"hooks":{"PreToolUse":[…]}}`; `Plugin-bundled → plugin hooks/hooks.json` |
| codex (plugin) | `{ "hooks": { … } }` | `docs/hooks/codex.md` *"`hooks.json` registration format (R1)"* — `{"hooks":{"PreToolUse":[…]}}` |
| cursor (both forms) | `{ "version": 1, "hooks": { … } }` | `docs/hooks/cursor.md:108-122` — `{"version":1,"hooks":{"<hookName>":[…]}}` |
| copilot (both forms) | `{ "version": 1, "hooks": { … } }` | `492b6a78~1:…/core-copilot/.github/plugin/hooks.json.tmpl` and `…/core-copilot/hooks/hooks.json.tmpl`, both open `{"version":1,"hooks":{`. **Not stated in `docs/hooks/copilot.md`** — that doc has a "Hook Locations" section but **no registration-format section**. See OQ-8 |
| antigravity | `{ "<group>": { "enabled": true, "<Event>": … } }` | `docs/hooks/antigravity.md:59-69` — *"Registration — two shapes"*, `{ "<name>": { "enabled": true, "PreToolUse": [ … ] } }` |
| devin CLI (not a target) | **the event map itself, no `hooks` wrapper** | `docs/hooks/devin-cli.md`: *"`.devin/hooks.v1.json` has **NO** top-level `\"hooks\"` wrapper (R1)… Wrap `hooks.v1.json` and it won't load."* Confirmed by `docs/hooks/devin/hooks.v1.json`, whose top level is `{"SessionStart":[…], …}` |
| windsurf / Devin Desktop (not a target) | `{ "hooks": { "<event>": [ … ] } }` | `docs/hooks/windsurf.md:93-106` |

**Not shared.** Five distinct envelopes across seven documents; antigravity's is not even a `hooks`
map, and devin-CLI's has no wrapper at all.

### 2.2 Event names, casings, and which runtime consumes each

This is the axis where the earlier work went wrong. Per IDE, with the consuming runtime named.

**Claude Code — PascalCase, one runtime family.** `docs/hooks/claude-code.md`: *"Target agent:
Claude Code (Anthropic) — CLI + IDE extensions + claude.ai/code (**shared** `settings.json` hook
config)"*, and the Hook Events table lists `SessionStart`, `PreToolUse`, `PostToolUse`,
`SubagentStop`, `Stop`, `PreCompact`, `PostCompact` — PascalCase, no aliases. **FACT.**
Shipped events: `SessionStart` (matcher `startup`), `PostCompact` (matcher `""`), `PreToolUse`,
`PostToolUse`.

**Codex — PascalCase, one runtime family.** `docs/hooks/codex.md`: *"Codex CLI + IDE extension
(shared `.codex/config.toml`)"*; Hook Events table is PascalCase, no aliases. **FACT.**
Shipped: `SessionStart` (matcher `startup|resume`), `PostCompact`, `PreToolUse`, `PostToolUse`.

**Cursor — camelCase only, no aliases exist.** `docs/hooks/cursor.md:161`: *"All event names are
**camelCase** (R1). No PascalCase aliases documented."* **FACT.**
Shipped: `beforeReadFile`, `beforeTabFileRead`, `preCompact`, `preToolUse`, `postToolUse`.

**Antigravity — PascalCase, and `SessionStart` does not exist.** `docs/hooks/antigravity.md:44`:
*"`SessionStart` is NOT a valid Antigravity event (absent from R1–R3; CLI rewrites a registered
`SessionStart` to `null`). Its analog is `PreInvocation` @ `invocationNum:0`."* **FACT.**
Shipped: `PreInvocation` (always present, always empty — §2.6), `PreToolUse`.

**Copilot — TWO runtimes, TWO documented event vocabularies, overlapping not disjoint.**
This is the case that must not be dismissed as style. From `docs/hooks/copilot.md`:

| Registered key | Documented by | VS Code Copilot | Copilot CLI |
|---|---|---|---|
| `SessionStart` | R4 (VS Code extension reference) | ✓ fires (snake_case payload) | ✓ fires (snake_case payload) |
| `sessionStart` | R1 (Copilot CLI hooks reference) | ✗ does **not** fire | ✓ fires (camelCase payload) |
| `PreToolUse` / `preToolUse` | R4 / R1 | ✓ / ✗ | ✓ / ✓ |
| `PostToolUse` / `postToolUse` | R4 / R1 | ✓ / ✗ | ✓ / ✓ |
| `Stop` / `agentStop` | R4 / R1 | ✓ / ✗ | ✓ / ✓ |
| `SubagentStop` / `subagentStop` | R4 / R1 | ✓ / ✗ | ✓ / ✓ |
| `PreCompact` / `preCompact` | R4 | ✗ **no compaction hook at all in VS Code** | ✓ both casings |
| `sessionEnd` | R1 | ✗ | ✓ (camelCase only; no PascalCase form observed) |

**FACT**, from `docs/hooks/copilot.md` "Hook Events" table (Observed column) and Practical
Conclusion 1: *"VS Code fires ONLY PascalCase (single-fire). Copilot CLI fires BOTH conventions if
both are registered ⇒ **double-fire** per event; its PascalCase fire works fine. PascalCase-only
serves both and avoids the double-fire. Use `Stop`, not `agentStop`."*

Interpretation, spelled out because this is the question that was got wrong:

- The two casings are **not** two disjoint runtime channels. The relation is **containment**:
  `{VS Code} ⊂ {CLI}` on PascalCase, and camelCase serves **only** the CLI, which already answers
  to PascalCase.
- Therefore **no runtime is served exclusively by a camelCase key.** PascalCase-only is strictly
  dominant: it reaches both runtimes and fires once each. Registering both casings costs a
  double-fire in the CLI (every hook runs twice per event) and buys nothing.
- **`preCompact` is the one partial exception, and only in the weak sense** that VS Code fires *no*
  compaction hook whatever you register (`docs/hooks/copilot.md:22,35`), so for `preCompact` the two
  casings are behaviourally interchangeable — camel-only is single-fire and correct for the only
  runtime that has the event. `sessionStart` is **not** in that position: VS Code has the event and
  will not fire the camel key.

**What is shipped, and the defect that follows.** Both pre-#315 copilot templates and the current
`COPILOT_BINDINGS` + copilot `bootstrap` slot register camel `sessionStart` and camel `preCompact`
alongside Pascal `PreToolUse` / `PostToolUse`. **FACT** —
`492b6a78~1:…/core-copilot/.github/plugin/hooks.json.tmpl` line 4 `"sessionStart": [{{{bootstrap_hooks}}}]`;
`src/spec/hook-layouts.ts` `bootstrap: { event: 'sessionStart', flat: true, payload: 'inject' }`
and `{ event: 'preCompact', … }`; RUN-T `core-copilot/.github/plugin/hooks.json` top-level key
`sessionStart`.

**JUDGEMENT (high confidence, from the FACTs above): VS Code Copilot has never fired the Rosetta
bootstrap hook.** The entire `plugin_files_mode` bootstrap injection is dead in that runtime. Note
the plugin-form probe searches `$HOME/.vscode/agent-plugins` and
`$HOME/.local/share/Code/agentPlugins` — VS Code install locations — so this defect sits precisely
where it matters most.

This is **not** the same thing as `FR-HOOK-0006`. That unit described a Copilot-side bug where *a
single registered hook was invoked twice per real event*, fixed upstream and the workaround removed
(`docs/requirements/plugin-generator/CHANGES.md:502-508`, *"RECONCILIATION-12 — FR-HOOK-0006
retired"*). **FACT.** The casing double-fire is caused by our own registration and is entirely under
our control; the two are independent.

**Recommendation:** fix it, but **as a separate, HITL-gated contract-conformance change** (§8.4).
The refactor in §7 must be byte-preserving apart from the two document-routing corrections; folding
a behaviour change into a structural fix is how the current state was reached.

### 2.3 Entry object keys

| Document | Entry keys emitted | Keys the contract allows | Evidence |
|---|---|---|---|
| claude (plugin) | `type`, `command` | `type`, `command`, `args`, `if`, `timeout`, `statusMessage`, `once`, `async`, `asyncRewake`, `shell` | `docs/hooks/claude-code.md` handler-field table |
| codex (plugin) | `type`, `command` | `type`, `command`, `commandWindows`, `timeout` (default 600), `statusMessage` | `docs/hooks/codex.md` handler-field table |
| cursor (both) | `command`; `matcher`+`command` where bound | `command` (required), `type`, `timeout`, `loop_limit`, `failClosed`, `matcher` | `docs/hooks/cursor.md:125-132` |
| copilot **plugin form** | `type`, `bash`, `powershell` | not documented in `docs/hooks/copilot.md` (OQ-8); `FR-HOOK-0005` AC fixes the bootstrap entry as exactly `{type,bash,powershell}` | `492b6a78~1:…/.github/plugin/hooks.json.tmpl`; `src/spec/hook-layouts.ts` `copilotPluginEntry` |
| copilot **standalone form** | `type`, `command` | as above | `492b6a78~1:…/core-copilot/hooks/hooks.json.tmpl`; RUN-T `core-copilot-standalone/.github/hooks/hooks.json` |
| antigravity | `type`, `command`, `timeout` | `type` (default `"command"`), `command` (required), `timeout` (default 30) | `docs/hooks/antigravity.md:71-78` |
| windsurf (not a target) | — | `command`, `powershell`, `show_output`, `working_directory`. **No `type`. No `matcher`.** | `docs/hooks/windsurf.md:108-115` |

**Not shared.** Copilot's plugin form is the only one with no `command` key; its standalone form is
the only place where the *same IDE* switches to `command`. Cursor is the only one with no `type`.
Antigravity is the only one carrying a `timeout` in shipped output.

**Cross-platform is per-IDE, not universal.** Copilot's plugin form carries `bash`+`powershell`;
Codex's equivalent is a `commandWindows` sibling of `command` (`docs/hooks/codex.md`); Windsurf's is
`command`+`powershell` with documented resolution rules including *"macOS/Linux, `command` ✗,
`powershell` ✓ → **hook silently skipped**"* (`docs/hooks/windsurf.md:117-126`). Three different
spellings of the same idea; not interchangeable. **FACT.**

### 2.4 Grouping

| Document | Grouping | Evidence |
|---|---|---|
| claude | `{ matcher, hooks: [ … ] }` group per binding, always | `docs/hooks/claude-code.md` registration format |
| codex | `{ matcher, hooks: [ … ] }` group per binding, always | `docs/hooks/codex.md` registration format |
| cursor | **flat throughout** — entries sit directly in the event array, `matcher` inline on the entry | `docs/hooks/cursor.md:108-122` |
| copilot | **mixed within one document**: `sessionStart` flat, `preCompact` flat, `PreToolUse`/`PostToolUse` grouped | `492b6a78~1:…/.github/plugin/hooks.json.tmpl` — `"preCompact": [ { "type": "command", "bash": … } ]` vs `"PreToolUse": [ { "matcher": …, "hooks": [ … ] } ]` |
| antigravity | **two shapes by event class**: tool events grouped, non-tool events flat | `docs/hooks/antigravity.md:18` Practical Conclusion 6 — *"Config uses two shapes — tool events wrap handlers in `{matcher, hooks:[…]}`; non-tool events list handlers flat."* |
| devin CLI | grouped, `matcher` regex on `tool_name`, only for `PreToolUse`/`PostToolUse`/`PermissionRequest` | `docs/hooks/devin-cli.md` |
| windsurf | flat, and **there is no matcher field at all** | `docs/hooks/windsurf.md:115` — *"**(!) No `matcher` field exists (R1).**… Gate inside the script."* |

**This kills any uniform entry shape.** The orchestrator's proposed
`{ "matcher": …, "hooks": [ { "type":"command", "command": … } ] }` fits claude, codex, devin-CLI
and antigravity's *tool* events, and fits none of cursor, copilot (either form, mixed within one
document), antigravity's *non-tool* events, or windsurf. Grouping is **per binding**, not per IDE —
copilot and antigravity both prove it. **FACT.**

### 2.5 Command path addressing — varies by distribution FORM, not only by IDE

**FACT** for every row; plugin-form/standalone-form literals recovered from `492b6a78~1`,
current values from `src/spec/hook-layouts.ts` and confirmed byte-for-byte in RUN-T.

| Document | Addressing | Literal |
|---|---|---|
| claude (plugin) | env-var placeholder resolved by the runtime | `node "${CLAUDE_PLUGIN_ROOT}/hooks/<m>.js"` |
| codex (plugin) | fixed repo-relative runtime dir | `node .codex/hooks/<m>.js` |
| cursor (plugin) | plugin-root-relative | `node hooks/<m>.js` |
| cursor (standalone) | repo-relative under `.cursor/` | `node .cursor/hooks/<m>.js` |
| copilot (plugin) | **install-dir probe loop over two bases, then guarded exec** | bash: `for base in "$HOME/.vscode/agent-plugins" "$HOME/.local/share/Code/agentPlugins"; do root="$base/github.com/griddynamics/rosetta/plugins/<destination>"; if [ -f "$root/hooks/<m>.js" ]; then node "$root/hooks/<m>.js"; break; fi; done` · powershell: `$root = "$env:LOCALAPPDATA\Code\agentPlugins\github.com\griddynamics\rosetta\plugins\<destination>"; if (Test-Path "$root\hooks\<m>.js") { node "$root\hooks\<m>.js" }` |
| copilot (standalone) | repo-relative under `.github/` | `node ".github/hooks/<m>.js"` |
| antigravity (plugin) | plugin-root-relative | `node hooks/<m>.js` |

**This is the load-bearing distinction that was destroyed.** Claude gets a runtime placeholder;
Codex gets a fixed path; Cursor and Antigravity get plugin-relative paths; Copilot alone cannot
report its own plugin root and must probe a hardcoded install location — and that probe is
**set-aware**, embedding `spec.destination` so `qe-copilot` probes its own folder
(`src/spec/hook-layouts.ts` `COPILOT_PLUGIN_PATH`, verified by the existing test
*"Copilot probes are set-aware"*). **FACT.**

The generator's own comment records the product fact behind the two copilot forms:
*"Copilot cannot report its own plugin path, so its hook commands probe a FIXED install location.
That path is deliberately hardcoded rather than derived at runtime (confirmed product behavior:
hooks fire in either standalone or plugin mode, only one per case)."* **FACT**
(`src/spec/hook-layouts.ts`).

### 2.6 Bootstrap / session-start payload — injected, deliberately empty, or absent

Three distinct states. Collapsing them is what `payload: 'empty'` exists to prevent.

| Document | State | Event + matcher | Evidence |
|---|---|---|---|
| claude (plugin) | **injected** | `SessionStart`, matcher `"startup"` | `492b6a78~1:…/core-claude/hooks/hooks.json.tmpl` — `"SessionStart":[{"matcher":"startup","hooks":[{{{bootstrap_hooks}}}]}]` |
| codex (plugin) | **injected** | `SessionStart`, matcher `"startup|resume"` | `492b6a78~1:…/core-codex/.codex-plugin/hooks.json.tmpl` — matcher differs from claude's |
| copilot (plugin) | **injected**, flat (no matcher, no group) | `sessionStart` | `492b6a78~1:…/.github/plugin/hooks.json.tmpl` — `"sessionStart": [{{{bootstrap_hooks}}}]` |
| copilot (standalone) | **deliberately empty** — key present, array always `[]` | `sessionStart` | `492b6a78~1:…/core-copilot/hooks/hooks.json.tmpl` — literal `"sessionStart": []`. Codified: `FR-VAR-0030` AC4, `ASSUMPTIONS.md` AC-14. `DATA-CFG-0008` rationale: *"omitting the key and emitting an empty array are different documents to that IDE"* |
| cursor (both forms) | **absent** — no session-start key at all; the payload is generated and discarded | — | Neither cursor template carries a placeholder (`492b6a78~1`, both files). `plugin-assemble-cursor-bootstrap.ts`: *"Cursor template has no `{{{bootstrap_hooks}}}` placeholder — payload generated but not injected."* `FR-VAR-0020` implementationNotes confirm |
| antigravity | **absent by design**, but the key is present and empty for a different reason | `PreInvocation: []` | `FR-VAR-0082` (Approved): *"shall deliver the bootstrap context through the source's natively auto-loaded bootstrap rule… and shall not deliver bootstrap through a session-start hook… omit the bootstrap placeholder from the Antigravity hook template."* `docs/hooks/antigravity.md:44`: `SessionStart` is not a valid event |

**Three of the five session-start dispositions are different for different reasons**, and
`sessionStart: []` (copilot-standalone) and `PreInvocation: []` (antigravity) are *not* the same
construct: the first is an event key the IDE requires to be present-and-empty in that distribution
form; the second is a valid Antigravity event that Rosetta simply binds nothing to, because
bootstrap arrives via an always-on rule. **JUDGEMENT**, grounded in the two cited requirements.

Bootstrap **entry** shapes also differ per IDE (`FR-HOOK-0005`, Approved AC list) — **FACT**:

| IDE | Bootstrap entry |
|---|---|
| claude | `{"type":"command","command":"printf '%s' '<json>'","once":true}` |
| codex | `{"type":"command","command":"printf '%s' '<json>'","statusMessage":"Loading Rosetta bootstrap","timeout":30}` — **no `once`** |
| copilot | `{"type":"command","bash":"printf '%s' '<json>'","powershell":"Write-Output '<json>'"}` |
| cursor | `{"type":"command","command":"printf '%s' '{\"additional_context\":\"<body>\"}'"}` — **`additional_context`, not `hookSpecificOutput`** |

And the copilot payload alone is dual-placement — `FR-HOOK-0005` AC:
*"`{\"additionalContext\":\"<body>\",\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"<body>\"}}` — additionalContext at BOTH top-level (honored by Copilot CLI) AND nested in hookSpecificOutput (honored by VS Code); neither placement alone reaches both runtimes"*, matching
`docs/hooks/copilot.md:127`: *"**Empirically required:** VC honors nested only, CLI honors top-level
only — emit BOTH."* **FACT.** Contrast Claude, where the doc says the opposite:
*"There is **no** top-level `additionalContext` for Claude Code (unlike Copilot CLI) — do NOT emit
one."* **FACT** (`docs/hooks/claude-code.md`, SessionStart section).

### 2.7 Which events each IDE supports at all

| Rosetta purpose | claude | codex | cursor | copilot | antigravity | windsurf |
|---|---|---|---|---|---|---|
| session context injection | `SessionStart` ✅ | `SessionStart` ✅ | `sessionStart` ✅ | `SessionStart`/`sessionStart` ✅ | **none** — analog `PreInvocation`@0 | **none documented** |
| pre-tool guard | `PreToolUse` (all tools) | `PreToolUse` — **`Bash`/`apply_patch`/MCP only** | `preToolUse` **+ granular `beforeShellExecution`/`beforeReadFile`/`beforeMCPExecution`** | `PreToolUse` | `PreToolUse` | **split per operation**: `pre_read_code`/`pre_write_code`/`pre_run_command`/`pre_mcp_tool_use` |
| post-tool advisory | `PostToolUse` ✅ | `PostToolUse` ✅ | `postToolUse` ✅ | `PostToolUse` ✅ | `PostToolUse` — **output ignored, unusable** | `post_*` — **cannot pass anything to the model** |
| pre/post compaction | `PreCompact` + `PostCompact` | `PreCompact` + `PostCompact` | `preCompact` only | `PreCompact` **CLI only**, no `PostCompact` anywhere | none | none |
| turn stop | `Stop` | `Stop` | `stop` | `Stop`/`agentStop` | `Stop` | none (`post_cascade_response` is per-turn, not a stop event) |
| subagent stop | `SubagentStop` | `SubagentStop` | `subagentStop` | `SubagentStop` | **none** | none |

**FACT** — assembled from the six contract docs' event tables. Key citations for the surprising
cells: `docs/hooks/codex.md` *"**(!) Partial tool interception (R1):** `PreToolUse`/`PostToolUse`
intercept **only** `Bash`, `apply_patch` (`Edit`/`Write`), and MCP tools"*;
`docs/hooks/cursor.md:16` two-layer hooks, *"wiring a Bash guard on `beforeShellExecution` AND
`preToolUse` double-fires it"*; `docs/hooks/antigravity.md:15` *"**(!) `PostToolUse` cannot drive
per-tool logic.** Its output is `{}` (ignored — no channel)"*; `docs/hooks/windsurf.md:32-33` no
session lifecycle events, no generic tool events.

**Rosetta's shipped selection reflects these limits.** Cursor is the only target binding the
granular `beforeReadFile`/`beforeTabFileRead` layer (because `read-once` needs a file path that the
generic layer does not reliably give it); Antigravity binds **no** advisory hooks at all.

### 2.8 Matcher vocabularies — per IDE, and each one non-transferable

**FACT** — from the pre-#315 templates, reproduced exactly in `src/spec/hook-layouts.ts` and
confirmed in RUN-T.

| Binding | claude | codex | copilot (both forms) | cursor (both forms) | antigravity |
|---|---|---|---|---|---|
| `dangerous-actions` | `PreToolUse` / `Bash\|mcp__.*` | `PreToolUse` / `Bash\|mcp__.*` | `PreToolUse` / `Bash\|mcp__.*` | `preToolUse` / `Bash\|Shell\|mcp__.*` | `PreToolUse` / `run_command\|mcp__.*` |
| `read-once` | `PreToolUse` / `Read\|Bash` | `PreToolUse` / `Bash\|shell` | `PreToolUse` / `view\|Read\|bash\|powershell` | `preToolUse` / `Read\|Bash\|Shell` **+ `beforeReadFile` + `beforeTabFileRead`** | `PreToolUse` / `view_file\|run_command` |
| `read-once-reset` | `PostCompact` / `""` | `PostCompact` / `""` | `preCompact` (flat) | `preCompact` (flat) | **not bound** |
| `loose-files` + `md-file-advisory` | `PostToolUse` / `Write` | `PostToolUse` / `Write\|apply_patch\|functions.apply_patch` | `PostToolUse` / `Write\|create_file` | `postToolUse` / `Write` and `Write\|Edit` — **split into two bindings** | **not bound** |
| `codemap-refresh` | `PostToolUse` / `Edit\|Write\|MultiEdit` | `PostToolUse` / `Write\|Edit\|apply_patch\|functions.apply_patch` | `PostToolUse` / `Write\|Edit\|create_file\|replace_string_in_file\|multi_replace_string_in_file` | `postToolUse` / `Write\|Edit` | **not bound** |
| `lint-format-advisory` | `PostToolUse` / `Write\|Edit\|MultiEdit` — **note the order differs from codemap-refresh's** | as codemap-refresh | as codemap-refresh | `postToolUse` / `Write\|Edit` | **not bound** |

Two details worth preserving verbatim rather than tidying:

- Claude's `codemap-refresh` matcher is `Edit|Write|MultiEdit` while `lint-format-advisory`'s is
  `Write|Edit|MultiEdit` — the same set, different order, in two adjacent bindings. **FACT**
  (`492b6a78~1:…/core-claude/hooks/hooks.json.tmpl`). Claude's matcher rules
  (`docs/hooks/claude-code.md`, "Matcher pattern rules") make a `|`-list an alternation, so the
  order is semantically inert — but it is a byte difference and I recommend keeping it (§8) so the
  migration can assert byte-equality against the pre-#315 golden. Tidy it in a later, separate
  commit if desired.
- Cursor splits `loose-files` (`Write`) from `md-file-advisory` (`Write|Edit`) into two entries,
  where claude/codex/copilot put both modules in one `Write`-ish group. That is a real matcher
  difference, not just a grouping artefact. **FACT.**

**Matcher semantics also differ, which is why the strings cannot be shared:**
claude — `|`/`,` alternation, else JS regex (`docs/hooks/claude-code.md`); codex — regex on
`tool_name` (`docs/hooks/codex.md`); copilot — `^(?:PATTERN)$` on `toolName`, and *"**(!) R2: VS
Code IGNORES matcher values** — hooks fire on ALL tool invocations; gate inside the hook"*
(`docs/hooks/copilot.md:254`); cursor — per-hook basis, tool type for `preToolUse` but **the command
text** for `beforeShellExecution` and **subagent type** for `subagentStart`
(`docs/hooks/cursor.md:134-147`); antigravity — tool events only, ignored elsewhere
(`docs/hooks/antigravity.md:74`); windsurf — **no matcher field exists**.

### 2.9 Antigravity's probe-key nesting and its exclusion of advisory hooks

`{"rosetta": {"enabled": true, "PreInvocation": [], "PreToolUse": [ {matcher, hooks:[…]} ]}}`.
**FACT** (RUN-T `core-antigravity/hooks.json`; matches `492b6a78~1:…/core-antigravity/hooks.json.tmpl`).

- The outer key is a **hook-group name** with a group-level `enabled` switch
  (`docs/hooks/antigravity.md:73`). The probe config names it `rosetta-probe`; shipped names it
  `rosetta`. Not part of the envelope grammar — a name we choose.
- **Two registration shapes inside one document** (§2.4).
- **No advisory hooks, by requirement.** `FR-VAR-0083` rationale: *"Antigravity ignores hook output
  on PostToolUse (its protocol discards it), so an advisory hook such as `lint-format`, `md-file` or
  `loose-files` would consume runtime with no effect there."* Grounded in
  `docs/hooks/antigravity.md:15`. **FACT.**
- `read-once-reset` is not bound either (no compaction event exists in Antigravity's five events),
  yet `read-once-reset.js` is still synced into the bundle because it is a declared support module
  of `read-once`. **FACT** — harmless dead file; noted, not a defect.
- Antigravity tool `args` field names are PascalCase (`TargetFile`, `CodeContent`, `CommandLine`) —
  *"unique to Antigravity; unmapped names silently no-op every hook"* (`docs/hooks/antigravity.md:19`).
  That is a `src/hooks` runtime concern, not a `hooks.json` concern, but it is the reason
  Antigravity's matcher vocabulary (`run_command`, `view_file`) shares no token with any other IDE.

### 2.10 Per-IDE facts that apply to exactly one IDE

Collected because each is a reason a shared abstraction would be wrong. All **FACT**.

| IDE | Unique fact | Citation |
|---|---|---|
| claude | Lenient validation — unknown/extra fields silently ignored, valid parts still honored | `claude-code.md` Practical Conclusion 6 |
| claude | Two block mechanisms (exit-0+JSON, exit-2+stderr); *"You must choose one approach per hook, not both"* | `claude-code.md` PC 2 |
| codex | **Strict** validation — any extra or misplaced field invalidates the WHOLE output and the hook runs unhooked | `codex.md` PC 1 |
| codex | Reads files through the shell, no read tool — a read arrives only as an opaque `Bash` command string | `codex.md` PC 3 |
| codex | Requires `[features] hooks = true` in `config.toml`; hooks trusted per content hash via `/hooks` | `codex.md` "Hook Configuration & Locations" |
| cursor | Output is **flat snake_case**, no `hookSpecificOutput` wrapper — *"Emitting a `hookSpecificOutput` wrapper does NOT work on Cursor"* | `cursor.md` PC 1 |
| cursor | **Fail-OPEN by default**; `failClosed:true` is a per-entry config field — and a `failClosed` handler must emit an explicit decision on **every** invocation or it blocks everything | `cursor.md` PC 3, PC 12 |
| cursor | Deny reason reaches the model via `user_message` (as `postToolUseFailure.error_message`), **not** `agent_message` — contradicting the manufacturer doc, confirmed across two independent mechanisms | `cursor.md` PC 4 |
| copilot | **Fail-CLOSED** on `preToolUse`: *"crash / non-zero exit / timeout = deny"* (R1) | `copilot.md:250` |
| copilot | VS Code ignores matcher values entirely | `copilot.md:254` |
| copilot | `PostToolUse` `additionalContext` capped at *"max 10 KB across all hooks joined"* | `copilot.md:286` |
| antigravity | Strict per-event schema; `additionalContext` is **not honored at any placement** | `antigravity.md` PC 1, PC 2 |
| antigravity | Only injection channel is `injectSteps[].userMessage`; `ephemeralMessage` is transient | `antigravity.md` PC 2 |
| windsurf | **stdout is never parsed.** Output is exit code + stderr only | `windsurf.md` PC 1 |
| devin CLI | No `hooks` wrapper in `hooks.v1.json`; and Devin **Desktop** verifiably does not read it (0 invocations) | `devin-cli.md` PC 2 and Verification status |

**Nothing here is common to all six.** The nearest thing to a universal is "hooks are registered in
a JSON file keyed by event name, with an array of handlers per event" — and even that is false for
Antigravity (group-nested) and devin-CLI (no wrapper).

---

## 3. What is genuinely shared vs what only appears shared

### 3.1 Genuinely shared — proven, and short

I was asked not to invent sameness, and equally not to pretend difference. These are real:

| Shared property | Holds for | Proof |
|---|---|---|
| Handlers are an **array** under an event key, so multiple handlers per event are allowed | claude, codex, cursor, copilot, antigravity, windsurf, devin-CLI | Every registration-format block in all six contract docs shows `"<event>": [ … ]`. Cursor exercised it empirically: *"Two `beforeShellExecution` handlers registered (multiple handlers per event array IS supported — both fired independently in parallel)"* (`cursor.md` Run 4) |
| A handler's command is a **string executed by a shell**, not an argv array | claude (`command`; `args` optional and unused), codex, cursor, copilot (both `bash` and `powershell` are command strings), antigravity, windsurf | Handler-field tables in all six docs |
| Registration is **static JSON on disk**, read at session/workspace load — no runtime registration API | all seven documents | "Hook Configuration & Locations" in each doc |
| `deterministic_hooks=false` ⇒ **no advisory/guardrail bindings**, bootstrap slot unaffected | all targets | `FR-CLI-0012`; `buildHooksDocument` gates `shipped` on `deterministicHooks` while the bootstrap slot is evaluated before that gate; verified by comparing RUN-T and RUN-F |
| The **module list** a set ships is IDE-independent | all targets | `plugins.json` declares `hooks` once per set; `modulesForTarget` then intersects it with what the target's bindings actually bind |

That is the complete list. Everything below the third row is Rosetta's own invariant, not an IDE
contract.

### 3.2 Appears shared but is not — each with the evidence that separates them

| Apparent sameness | Reality | Evidence |
|---|---|---|
| "copilot `sessionStart` and `SessionStart` are the same event, inconsistently cased" | **Containment, not sameness.** VS Code consumes only `SessionStart`; the CLI consumes both. No runtime is served exclusively by camel. Camel-only ⇒ VS Code never fires | `copilot.md:13`, Hook Events table Observed column (§2.2) |
| "copilot's two templates differ only in command strings" | They differ in **four** things: entry keys (`bash`+`powershell` vs `command`), addressing model (install-dir probe vs repo-relative), bootstrap disposition (`inject` vs `empty`), and which distribution reads them | `492b6a78~1` both templates, side by side (§2.3, §2.5, §2.6) |
| "cursor's two templates differ only in a path prefix" | On the evidence, **that is true** — `.cursor/hooks/` vs `hooks/`, and nothing else. Stated as a positive finding, not an assumption | `git diff` of the two `492b6a78~1` cursor templates is exactly the prefix; confirmed by RUN-T (`core-cursor/hooks/hooks.json` 982 B vs `core-cursor-standalone/.cursor/hooks.json` 1054 B, identical modulo prefix) |
| "`sessionStart: []` and `PreInvocation: []` are both 'empty bootstrap'" | Different constructs. The first is an event key that must be **present and empty** in one distribution form of one IDE; the second is a valid event Rosetta binds nothing to because bootstrap arrives by an always-on rule | `FR-VAR-0030` AC4 + `DATA-CFG-0008` rationale vs `FR-VAR-0082` |
| "claude and codex have the same `SessionStart` binding" | Same event name, **different matcher**: `"startup"` vs `"startup|resume"`; and different bootstrap entry shape (`once:true` vs `statusMessage`+`timeout`) | The two `492b6a78~1` templates; `FR-HOOK-0005` ACs |
| "`{matcher, hooks:[…]}` is the common grouping" | Fits 4 of 7 documents *partially*. Copilot and Antigravity **mix both shapes inside one document**; cursor uses neither | §2.4 |
| "all IDEs' `PostToolUse` can carry an advisory" | Antigravity's output is `{}` — ignored; Windsurf's post-hooks pass nothing to the model at all | `antigravity.md` PC 3; `windsurf.md` PC 2, PC 3 |
| "`docs/hooks/<ide>/hooks.json` shows the shipping shape" | They are **verification harnesses**. Dual casing there was deliberate instrumentation; `cwd`/`timeoutSec` never shipped; `rosetta-probe` is an arbitrary group name | §1.1 |
| "`hooks.json` files under `plugins/**` are all generated" | Six per plugin folder are **verbatim copies of the probe configs**, shipped as harness reference material | `plugins/<set>-<ide>/**/skills/harness/references/hooks/<ide>/hooks.json` |

---

## 4. What the current code got right — established before proposing changes

I compared `HOOK_LAYOUTS` + `buildHooksDocument` output against the seven `492b6a78~1` template
literals, at `deterministic_hooks=true` (RUN-T) and `false` (RUN-F). **FACT:**

| Preserved distinction | Where it lives now | Verdict |
|---|---|---|
| Five envelopes | `plainHooks`, `versionedHooks`, antigravity's inline `envelope` | correct |
| Per-IDE matcher vocabularies (all 6 bindings × 5 IDEs) | `CLAUDE_BINDINGS`, `CODEX_BINDINGS`, `COPILOT_BINDINGS`, `cursorBindings()`, antigravity's inline list | correct, including claude's `Edit|Write|MultiEdit` vs `Write|Edit|MultiEdit` order quirk |
| `flat` per **binding**, not per layout | `HookBinding.flat` | correct — copilot's mixed document proves it must be per binding |
| Bootstrap `inject` / `empty` / `null` three-way | `BootstrapBinding.payload` + nullable `bootstrap` | correct, and `'empty'` is explicitly justified in `DATA-CFG-0008`'s rationale |
| claude `"startup"` vs codex `"startup|resume"` | the two `bootstrap.matcher` values | correct |
| Copilot's dual-interpreter probe, set-aware | `copilotProbeBash` / `copilotProbePowershell` / `COPILOT_PLUGIN_PATH(destination)` | correct, and an **improvement** on pre-#315, which hardcoded `core-copilot` for every set |
| Antigravity's advisory exclusion | 2-binding list | correct |
| Cursor's granular `beforeReadFile` + `beforeTabFileRead` | `cursorBindings()` | correct |
| Per-set module filtering | `binding.modules.filter(m => shipped.has(m))`, drop empty bindings | correct — this is the #315 requirement, and it works |
| JSON validity by construction | `JSON.stringify` replaces the `]{{#if deterministic_hooks}},{{/if}}` idiom | a genuine improvement; do not throw it away |

Byte-level confirmation from RUN-T (event key, matcher, and command prefix per binding compared to
the template source): `core-claude/hooks/hooks.json`, `core-codex/.codex-plugin/hooks.json`,
`core-antigravity/hooks.json`, `core-cursor/hooks/hooks.json`,
`core-cursor-standalone/.cursor/hooks.json`,
`core-copilot-standalone/.github/hooks/hooks.json`,
`core-copilot/.github/plugin/hooks.json` — **seven for seven, faithful.**

**JUDGEMENT:** the table is not the bug. Calling it "an over-generalization" is imprecise. The bug is
that a **one-layout-per-target** key cannot address a **many-documents-per-target** output.

---

## 5. The defect, precisely

### 5.1 Mechanism

1. `src/spec/targets.ts:662` — `const layout = HOOK_LAYOUTS[name] ?? null;` where `name` is a
   `TargetName`. One layout per spec. **FACT.**
2. `src/plugin-processors/plugin-copy.ts` — for a **main** (marketplace) target,
   `collectTmplFrames(sourceDir, '', tmplFrames)` registers **every** `.tmpl` under the shared
   `preservedSource` folder, which is `<pluginsRoot>/<set.template>-<family>` (`base()` in
   `targets.ts`). `template-copilot` and `template-cursor` each hold **two** `hooks.json.tmpl`
   files. **FACT.**
3. `plugin-assemble-hooks-json.ts` writes **one** value into `templateContext.hooks_json`. **FACT.**
4. Every template is the single line `{{{hooks_json}}}`. **FACT** (all seven verified).

⇒ Both copilot templates, and both cursor templates, render the same document inside a marketplace
plugin.

Pre-#315 this could not happen: each `.tmpl` carried its own literal body, so the standalone-form
template rendered the standalone form even when collected by the marketplace spec.

### 5.2 Damage, measured (RUN-T, `--deterministic-hooks true`, md5 / bytes)

```
b13704be4c2ddb9bd1c3ec7ad144588d  29090  core-copilot/.github/plugin/hooks.json
b13704be4c2ddb9bd1c3ec7ad144588d  29090  core-copilot/hooks.json                   ← correct: FR-VAR-0031 mirror
b13704be4c2ddb9bd1c3ec7ad144588d  29090  core-copilot/hooks/hooks.json             ← WRONG: must be standalone form
d7d81125df09900f02475bbaf9c202ac   1524  core-copilot-standalone/.github/hooks/hooks.json  ← the shape it must have

afbda2fd0f2718ff8d0cee8a3e548583    982  core-cursor/hooks.json                    ← WRONG: must be `.cursor/hooks/`-prefixed
afbda2fd0f2718ff8d0cee8a3e548583    982  core-cursor/hooks/hooks.json              ← correct
900befd890be8ba79182aa0c740c6f34   1054  core-cursor-standalone/.cursor/hooks.json ← the shape the root file must have

e4a6f03eb8cbea649474a3321c209f34   8023  core-claude/hooks/hooks.json              ← correct
14383f5f75e3a6312c26d8e560e64005   8467  core-codex/.codex-plugin/hooks.json       ← correct
14383f5f75e3a6312c26d8e560e64005   8467  core-codex/.codex/hooks.json              ← correct mirror
dd8ca7e0566d77272d79b68c28393a6c    542  core-antigravity/hooks.json               ← correct
```

Corroborated at the shipped default (`--deterministic-hooks false`), against the committed pre-#315
tree — `git show 492b6a78~1:<path> | md5`:

```
                                    PRE-#315                        CURRENT (committed plugins/)
core-copilot/hooks/hooks.json       5c484f41…   60 B  (standalone)  e0f3df0c…  24437 B  (plugin form)
core-copilot-standalone/.github/…   5c484f41…   60 B                5c484f41…     60 B  (unchanged ✔)
core-cursor/hooks.json              330f99f9…   37 B                359d6779…     34 B
core-cursor-standalone/.cursor/…    330f99f9…   37 B                359d6779…     34 B
```

**FACT.** Note the pre-#315 identity `core-copilot/hooks/hooks.json == core-copilot-standalone/.github/hooks/hooks.json`
(`5c484f41…`) — that is the invariant to restore, and it is directly assertable (§9, T3).

**`follow.md` is right that no user-facing hook is currently broken**: the file Copilot actually
reads in standalone mode (`<set>-copilot-standalone/.github/hooks/hooks.json`) is byte-identical to
pre-#315. **FACT, verified.** But see §5.4 — "no user-facing hook is broken" is contingent on a
question nobody has answered.

### 5.3 Requirement violated

`FR-VAR-0030` (Draft, `ticketId=315`) statement:
> *"It shall produce exactly three `hooks.json` files at distinct paths: (1) `.github/plugin/hooks.json` — the plugin-form hooks…; (2) `hooks.json` at the plugin root — an alternate-name copy…; (3) `hooks/hooks.json` — the standalone-form hooks, rendered from `hooks/hooks.json.tmpl` (standalone-form template). Files (1) and (2) shall be byte-identical."*

AC4: *"Given: `hooks/hooks.json` When: inspected Then: it contains the standalone-form hooks with
`\"sessionStart\": []` (empty, no bootstrap payload for standalone use)."*

Its own `implementationNotes` already diagnose the exact cause:
> *"Criterion 4 fails… `HOOK_LAYOUTS` … keys the assembled document by TARGET, not by template path, so every `hooks.json.tmpl` under the copilot target shares that target's one assembled document."*

`ASSUMPTIONS.md` AC-14 records the intent as **CONFIRMED INTENDED**. `STRUCTURES.md:33-42` documents
the same three files with provenance. **FACT** for all three.

The cursor case has **no** matching requirement — `STRUCTURES.md` (cursor section) lists
`hooks/hooks.json.tmpl [P] plugin-form template`, `hooks.json.tmpl [P] standalone-form template
(root; consumed by cursor-standalone)` and `hooks/hooks.json [G]`, but does **not** list a generated
root `hooks.json` even though one is produced in both the pre-#315 and current trees. **FACT** —
a documentation gap (§10, INC-3).

### 5.4 A hazard nobody has resolved — the copilot staging copy may not be inert

`<set>-copilot/.github/plugin/plugin.json` (RUN-T) declares `skills` and `commands` but **no
`hooks` field**. **FACT.**

`instructions/r3/core/skills/harness/references/configure/github-copilot.md:391` — plugin manifest
field table: `hooks` | default **`hooks.json` or `hooks/hooks.json`** | *"Path to hooks config file,
or inline hooks object"*. **FACT.**

So the copilot marketplace plugin ships **two** files at the two documented auto-discovery
locations, and declares neither. Two bad outcomes are possible and neither has been ruled out:

- **Today:** `hooks/hooks.json` holds the plugin-form document whose probe paths *do* resolve. If
  both files are loaded, every hook is registered twice ⇒ double execution of `dangerous-actions`,
  `read-once`, and every advisory.
- **After the fix (and pre-#315):** `hooks/hooks.json` holds the standalone form referencing
  `.github/hooks/<m>.js`, which **does not exist** in a marketplace install (bundles go to
  `hooks/*.js` there — confirmed in RUN-T). A `node` on a missing file exits non-zero, and
  `docs/hooks/copilot.md:250` records **`Fail-closed (R1): crash / non-zero exit / timeout = deny`**
  for `preToolUse`. If that file is loaded, Copilot could deny **every tool call**.

**JUDGEMENT: this is the highest-severity item in this document, and it is orthogonal to the
refactor.** Restoring FR-VAR-0030's letter restores the second hazard. Raised as **OQ-1**; the
implementing engineer must not close #315 without a resolution.

By contrast the cursor stray root file **is** inert: `<set>-cursor/.cursor-plugin/plugin.json`
declares `"hooks": "./hooks/hooks.json"` explicitly, and Cursor's project hooks path is
`.cursor/hooks.json`, never a plugin root (`docs/hooks/cursor.md:99-103`). **FACT.**

---

## 6. Requirements conflict that must be surfaced before any code is written

`DATA-CFG-0008` (`docs/requirements/plugin-generator/MODEL.md:246`) is
`status="Approved" approved_by="isolomatov-gd" changed="2026-09-02"` — approved **today**. It
specifies the current design as the target state, names the file and the symbols
(`hook-layouts.ts`, `HookBinding`, `BootstrapBinding`, `HookLayout`, `HOOK_LAYOUTS`,
`buildHooksDocument`), and its **AC1** reads:

> *"hold exactly one layout per IDE target identity — seven in total, keyed `claude`, `codex`, `copilot`, `copilot-standalone`, `cursor`, `cursor-standalone` and `antigravity`"*

**AC1 is the defect, written down and approved.** It fixes the granularity at *target identity*,
which is exactly the granularity that cannot express "one target, two document forms".

`FR-GEN-0011` and `FR-VAR-0083` also now name `HOOK_LAYOUTS` (`FR-VAR-0083` rationale: *"this
target's `HOOK_LAYOUTS` entry declares a null bootstrap slot"*), and `FR-HOOK-0005` explicitly
delegates *"where that entry is placed — the event key, any matcher, the grouping and the file
envelope"* to DATA-CFG-0008. **FACT.**

Consequences, stated plainly:

- **Any** fix amends `DATA-CFG-0008` AC1 (granularity: document form, not target identity).
- The `follow.md` plan (revert to literal templates) additionally **retires** `DATA-CFG-0008`,
  `FR-GEN-0011`, and the `HOOK_LAYOUTS` references in `FR-VAR-0083` and `FR-HOOK-0005` — four
  approved or Draft units, one approved the same day.
- `CHANGES.md:13` already lists `FR-GEN-0011` and `FR-VAR-0083` as `ToBeModified` *because*
  *"templates no longer iterate a hook list — every `hooks.json.tmpl` is the single line
  `{{{hooks_json}}}`"*. Reverting flips them back. **FACT.**

This is above my authority. §7 gives the decision with a default.

---

## 7. The design

### 7.0 What is being decided

**Decided here:** where each kind of knowledge lives, and what keys the per-document shape.
**Already settled, not re-decided:** the per-set hook list must be data (#315); `JSON.stringify`
guarantees validity; Antigravity's bootstrap rides an always-on rule (`FR-VAR-0082`); Cursor's
bootstrap is generated and not injected (`FR-VAR-0070`, D20); the copilot probe is set-aware.

### 7.1 Alternatives, each pushed until its failure mode shows

**Alternative A — literal per-IDE/per-form templates with `{{#each}}` (`follow.md`'s plan).**

Failure mode: **comma placement becomes combinatorial once module lists are per-set.**

Pre-#315 there was exactly **one** optional region per template, so exactly one hand-written
`]{{#if deterministic_hooks}},{{/if}}` sufficed. With per-set lists the optionality moves inside:
Claude's `PostToolUse` has three matcher groups; if a set ships only `codemap-refresh`, two groups
must disappear **and** the separating commas with them; if a set ships neither `loose-files` nor
`md-file-advisory`, the whole `Write` group must vanish, comma included; if it ships one of the two,
the group survives with one entry and no inner comma. Handlebars cannot express "comma unless I am
the last *present* heterogeneous block". `{{#unless @last}},{{/unless}}` solves it **within** one
`{{#each}}` and not **between** optional sibling blocks.

`follow.md`'s own snippet quietly concedes this: `{{#each postToolUse}}` iterates a pre-grouped,
per-event array — which means the module→event→matcher binding has **already** been computed in
TypeScript. So A does not remove the table; it splits it, leaving bindings in code and entry shape
in the template, and still faces the inter-group comma problem. That is Alternative C.

Rescuing A requires a post-render normalizer (tolerant parse → strict re-emit). That works, but:
templates stop being valid JSON (no editor validation, no schema); a tolerant parser or a
dependency must be added; and each of the 7 templates grows a per-module `{{#if}}` for each of 6
modules. Adding a hook module then means 7 template edits — the same count as B, but as prose
blocks rather than one-line rows.

**Cost of A:** reverts `buildHooksDocument` and most of `hook-layouts.ts`; retires 1 approved and
3 Draft requirement units; adds a normalizer step; reintroduces malformed-JSON-by-editing as a
possible failure. **Benefit:** the template is readable JSON-ish.

**Alternative C — hybrid (template owns envelope + event keys + bootstrap slot; entries from a
per-(IDE, form) helper).** Inherits A's inter-group comma problem, and splits one concern across two
files so a maintainer must read both. Strictly worse than either A or B. **Rejected.**

**Alternative B — keep the table and the assembler; change the key from _target_ to _output
document_.** The layout stops being "the copilot layout" and becomes "the copilot **plugin-form**
document" and "the copilot **standalone-form** document". Selection moves from
`HOOK_LAYOUTS[targetName]` to an explicit, per-spec map from output template path → layout id.

Failure mode: the readable artifact stays TypeScript. **Mitigated** by committing one golden JSON
document per (layout × module-set) — see 7.3, R4. A maintainer reads the golden file; CI diffs it.

**JUDGEMENT / recommended default: B.** Reasons, in order:

1. It is the **only** option whose diff is proportional to the defect. §4 establishes empirically
   that the table reproduces all seven original documents byte-faithfully; the key is wrong, the
   contents are not. A fix should change the wrong thing.
2. A reintroduces a failure class (hand-maintained JSON punctuation across optional blocks) that
   #315 removed for a real reason.
3. `follow.md`'s stated goal is *"the artifact a maintainer reads"*. A committed golden JSON
   document per form delivers that **better** than a Handlebars template: it is the real output, in
   real JSON, diffed on every change — a template shows what you *hope* renders.
4. B keeps `DATA-CFG-0008` largely intact (one AC amended) instead of retiring four units.

**I am flagging this as a reversal of `follow.md`'s recorded decision and therefore an owner call.**
If the owner's priority is "structure must live in a readable template" as a principle rather than
as a proxy for reviewability, choose A-with-normalizer and accept the punctuation risk; §8 gives its
migration too.

### 7.2 Where each kind of knowledge lives (under B)

| Knowledge | Home | Why |
|---|---|---|
| Which modules a **set** ships | `plugins.json` → `sets[].hooks` | Set-level, IDE-independent. The #315 requirement. Already there |
| Support-module closure (`read-once` → `read-once-reset`, `read-once-shared`) | `plugins.json` → `hookSupportModules` | Module-level fact, IDE-independent. Already there |
| Whether advisories ship at all | `--deterministic-hooks` (default `false`, FR-CLI-0012) | Run-level switch |
| **Which document forms a target emits, and which layout each takes** | `src/spec/targets.ts`, per target — **the one thing being added** | This is target×form knowledge and belongs beside `standaloneTemplates`, which already declares the sibling relationship |
| Envelope, event names + casings, matcher strings, grouping mode, entry keys, path addressing, bootstrap disposition | `src/spec/hook-layouts.ts`, keyed by **document form** | Per-IDE-per-form contract knowledge. Non-transferable by construction (§2) |
| Bootstrap **entry** shape + escaping | `src/bootstrap/payload.ts` + per-IDE assemblers | `FR-HOOK-0005`; unchanged |
| Serialization + validity | `buildHooksDocument` + `JSON.stringify` | Unchanged; the one thing that must not regress |
| **The reviewable artifact** | committed golden documents, one per (layout × module-set) | New. Replaces "read the template" with "read the output" |
| Template files | one line, `{{{hooks_json}}}` | Unchanged. Their *location* is the contract; their content is not |

### 7.3 Concrete changes

**R1 — layout ids become document forms.** In `src/spec/hook-layouts.ts`, rekey `HOOK_LAYOUTS`:

| Old key | New key | Note |
|---|---|---|
| `claude` | `claude-plugin` | |
| `codex` | `codex-plugin` | |
| `antigravity` | `antigravity-plugin` | |
| `cursor` | `cursor-plugin` | entry prefix `hooks/` |
| `cursor-standalone` | `cursor-standalone` | entry prefix `.cursor/hooks/` |
| `copilot` | `copilot-plugin` | `{type,bash,powershell}` probe; `bootstrap: inject` |
| `copilot-standalone` | `copilot-standalone` | `{type,command}` `.github/hooks/`; `bootstrap: empty` |

Values are unchanged. The rename is the point: a key is now a *document*, and
`copilot-standalone` legibly serves two specs.

Add a `HookLayoutId` union type so a bad id is a compile error, not a silent `undefined`.

**R2 — the spec declares one layout per output document.** Replace
`PluginSpec.hookLayout: HookLayout | null` (`src/types.ts:173`) with:

```ts
/** Output-relative path of each hooks.json.tmpl this spec renders → the layout it takes. */
hookDocuments: Readonly<Record<string, HookLayoutId>>;
```

Declared in `TARGET_BUILDERS` (`src/spec/targets.ts`):

| Target | `hookDocuments` |
|---|---|
| `claude` | `{ 'hooks/hooks.json.tmpl': 'claude-plugin' }` |
| `codex` | `{ '.codex-plugin/hooks.json.tmpl': 'codex-plugin' }` |
| `antigravity` | `{ 'hooks.json.tmpl': 'antigravity-plugin' }` |
| `cursor` | `{ 'hooks/hooks.json.tmpl': 'cursor-plugin', 'hooks.json.tmpl': 'cursor-standalone' }` |
| `cursor-standalone` | `{ '.cursor/hooks.json.tmpl': 'cursor-standalone' }` |
| `copilot` | `{ '.github/plugin/hooks.json.tmpl': 'copilot-plugin', 'hooks/hooks.json.tmpl': 'copilot-standalone' }` |
| `copilot-standalone` | `{ '.github/hooks/hooks.json.tmpl': 'copilot-standalone' }` |

The key is the frame's **output-relative `.tmpl` path**, which is uniform: `plugin-copy` already
remaps standalone frames via `standaloneTemplates` before they reach the assembler, so
`copilot-standalone`'s key is the post-remap `.github/hooks/hooks.json.tmpl`.

Sets with no hooks keep the same declarations — emission is decided per document by `emitsHooksJson`,
not by omitting the declaration.

**`spec.hookModules` must become a union — and there is an ordering trap.** `base()`
(`src/spec/targets.ts:672`) currently computes `hookModules: modulesForTarget(layout, c.hookModules,
c.hookSupportModules)` from the **single** layout, and `base()` runs *before* the target builder's
object spread adds any builder-declared field. So `hookDocuments` is not visible to `base()` as
written. Two ways out: pass the target's `hookDocuments` into `base()` as a parameter (preferred —
it keeps one construction site), or compute `hookModules` after the spread in `buildSpecsForSet`.
Either way the value becomes the **union** of `modulesForTarget` over every declared layout, because
`hookModules` feeds both `plugin-sync-bundles` (which `.js` files ship) and the per-document
`emitsHooksJson`.

Today that union is a no-op: both copilot layouts share `COPILOT_BINDINGS` and both cursor layouts
share `cursorBindings()`, so every member set is equal. **FACT.** It stops being a no-op the moment
two forms of one IDE bind different modules — so write the union now, not the first member.

**No cross-contamination between documents in one spec.** Each document is built from its own layout
against the same `spec` inputs, and the bootstrap payload in `templateContext.bootstrap_hooks` is the
**plugin-form** payload for that IDE. The standalone-form layout rendered inside a marketplace spec
never reads it: `copilot-standalone` declares `payload: 'empty'` (the payload argument is not
consulted) and `cursor-standalone` declares `bootstrap: null`. Follows from the table, stated here so
it need not be re-derived.

**R3 — the assembler emits one document per frame, and fails loudly on an unmapped frame.**
In `plugin-assemble-hooks-json.ts`:

- Iterate the spec's hooks-template frames (`f.target.endsWith('hooks.json.tmpl')`).
- For each, look up `spec.hookDocuments[f.target]`. **A hooks frame with no declaration is a hard
  error naming the file** — this single assertion is the structural guard that makes the whole class
  of defect impossible: a new template cannot be added without declaring its form.
- Build that frame's document with its own layout; drop only the frames whose own
  `emitsHooksJson(layout, …)` is false.
- Write a **per-frame** context value rather than one shared `hooks_json`.

**Plumbing — decided: B-i.** Keep `{{{hooks_json}}}` in every template; give `FileProcessingFrame` an
optional per-frame context overlay that `pluginRenderTemplates` merges over `templateContext` for
that frame. Templates stay uniform, and the template→form mapping lives in exactly one typed place
(`targets.ts`).

Rejected: **B-ii** — one context key per layout id (`{{{hooks_json_copilot_plugin}}}` etc.), each
template naming its own form. It needs no renderer change and makes the template self-describing,
but it puts the mapping in two places that must stay aligned (the template's placeholder name and
the layout table), and a mismatch degrades to an unrendered placeholder rather than a compile error.
The typed `Record<string, HookLayoutId>` is the stronger guard. Choose B-ii only if extending
`FileProcessingFrame` turns out to ripple further than expected.

`buildHooksDocument` itself is **unchanged**. `emitsHooksJson` is unchanged but called per document.

**R4 — golden documents, committed, as the reviewable artifact.** New folder, e.g.
`src/rosettify-plugins/tests/golden/hooks/`, holding for each of the 7 layouts:
`<layout-id>.full.json` (all 8 modules, deterministic true, bootstrap payload present) and
`<layout-id>.none.json` (no modules, deterministic false). 14 small files, regenerated by a test
(§9 T1) and reviewed as ordinary JSON in a PR.

**R5 — `plugin-copy.ts` unchanged.** Collecting both templates into the marketplace plugin is
required by `FR-VAR-0030`/`STRUCTURES.md`; the fix is that each now renders its own form. (Unless
OQ-1 resolves to "don't ship the staging copy" — §8.5.)

**R6 — requirements.** Amend `DATA-CFG-0008` AC1 to *"one layout per emitted document form"* and add
an AC for the per-document mapping + the unmapped-frame error. Move `FR-VAR-0030` to `Implemented`
once T3 passes. Add the missing `core-cursor/hooks.json` row to `STRUCTURES.md`.

### 7.4 How a maintainer adds…

**(a) A new hook module** — e.g. `secret-scan`:
1. Build the bundle in `src/hooks` (out of scope here).
2. Add `"secret-scan"` to each set's `hooks` list in `plugins.json`. If it needs helpers, add
   `"secret-scan": [...]` to `hookSupportModules`.
3. In `hook-layouts.ts`, add one `HookBinding` row per layout that should carry it, each with that
   IDE's event, casing, matcher and grouping — **read `docs/hooks/<ide>.md` for each**. Omitting a
   layout is a valid decision (Antigravity omits all four advisories); the module is then silently
   filtered out for that layout by `modulesForTarget`, no error.
4. Regenerate goldens; review the 14 diffs; run T1–T7.

Irreducible cost: **one deliberate decision per IDE**. No design removes that — it is per-IDE
contract knowledge. Under B it is one row each; under A, one `{{#if}}` block each.

**(b) A new set** — e.g. `security`:
1. One block in `plugins.json` with `hooks: [...]` (possibly `[]`) and `bootstrap: true|false`.
2. **Nothing else.** Every target already declares its `hookDocuments`; `modulesForTarget` intersects
   the set's list with each layout's bindings; `emitsHooksJson` drops documents that would be empty.
   The parity gate is already parameterized over the catalog.

**(c) A new IDE** — e.g. `windsurf` (contract COMPLETE at `docs/hooks/windsurf.md`, no target today):
1. Read `docs/hooks/<ide>.md` end to end. Fill the §2 matrix rows for it — envelope, event names and
   casings *with the consuming runtime named*, entry keys, grouping per binding, path addressing per
   distribution form, bootstrap disposition, matcher semantics (or their absence).
2. Add the target id to `TARGET_NAMES` and to `plugins.json` `targets`.
3. Add **one `HOOK_LAYOUTS` entry per document form** the IDE needs — not per IDE. Windsurf would
   need: `envelope: plainHooks`; entries `{command, powershell?, show_output?}` with **no `type`**;
   bindings on `pre_read_code` / `pre_run_command` / `post_write_code` / … because **there is no
   generic tool event**; **no matcher on any binding** (`docs/hooks/windsurf.md:115`); and
   `bootstrap: null`, because Windsurf has no session event and no context-injection channel at all
   (`windsurf.md` PC 1, 2, 4) — so `dangerous-actions`'s deny reason must travel by
   exit-2+stderr, which is a `src/hooks` adapter concern, not a `hooks.json` one.
4. Add a `template-<ide>/` folder with one one-line `.tmpl` per document form.
5. Declare `hookDocuments` in the target builder.
6. Add the layout's goldens; extend the parity oracle's `TARGETS` and the contract-conformance
   allowlist (T5) from the new contract doc.

Step 3's shape is discovered by **reading the contract doc**, never by copying a neighbour. Windsurf
is the proof: copying any existing layout would produce a file Cascade silently ignores.

### 7.5 Blast radius, compatibility, reversibility

- **Output changes, at `--deterministic-hooks true`:** exactly two files per copilot set-variant and
  per cursor set-variant (`<set>-copilot/hooks/hooks.json`, `<set>-cursor/hooks.json`), both
  reverting to their pre-#315 shape. All other `hooks.json` bytes unchanged.
- **Output changes, at the shipped default `false` — i.e. what the committed `plugins/` tree will
  show in M7:** **only** `<set>-copilot/hooks/hooks.json`, and only for the bootstrap-bearing
  set-variants (`core-copilot`, `rosetta-copilot`, `rosetta-copilot-light`), each going
  `24437 B` → `60 B` (`5c484f41…`, matching `<set>-copilot-standalone/.github/hooks/hooks.json`).
  **The cursor files will not move**: at `false` both cursor documents reduce to
  `{"version":1,"hooks":{}}` and are identical under either layout. **FACT** (RUN-F; committed-tree
  hashes in §5.2). An M7 reviewer seeing no cursor diff has **not** found a failed fix — assert the
  cursor correction with T3.7/T3.8 at `deterministic true`, which is the only branch that shows it.
- Path set unchanged ⇒ the existing paths-only parity gate stays green (which is precisely why it
  must be extended, §9 T6).
- **User-facing hook behavior:** unchanged, *unless* OQ-1 resolves badly (§5.4).
- **Requirements:** `DATA-CFG-0008` AC1 amended; `FR-VAR-0030` closable.
- **Reversibility:** high. The change is a key and a lookup; `git revert` restores current behavior.
- **What would invalidate this design:** an IDE that needs two documents at the *same* output path
  (impossible), or a document whose shape depends on the *set* rather than the target×form (none
  exists today — sets vary only the module list, verified across all six sets in `plugins.json`).

---

## 8. Migration — order, files, symbols

Each step compiles and its tests pass before the next.

**M0 — record the oracle.** Regenerate the pre-fix tree at `--deterministic-hooks` **both** true and
false into a scratch dir; store md5 per `hooks.json` (excluding
`**/skills/harness/references/hooks/**`). Recover the pre-#315 expected values with
`git show 492b6a78~1:plugins/<path>`. The two values that must **change** are named in §5.2; every
other hash must be **identical** before and after. Without this, the refactor is unverifiable.

**M1 — rekey the layouts (no behavior change).** `src/spec/hook-layouts.ts`: rename the 7 keys per
R1; add `export type HookLayoutId`. Update `src/spec/targets.ts:662` and
`tests/unit/plugin-processors/plugin-assemble-hooks-json.test.ts` (`LAYOUT_IDS`, and the string
literals `'cursor'`, `'cursor-standalone'`, `'copilot'`, `'copilot-standalone'`, `'claude'`,
`'antigravity'` in the "three preserved asymmetries", "Copilot probes are set-aware" and
`emitsHooksJson` blocks). Output byte-identical to M0.

**M2 — add `hookDocuments`.** `src/types.ts`: add the field, keep `hookLayout` temporarily. Populate
all 7 entries in `TARGET_BUILDERS`. Change `hookModules` to the **union** of `modulesForTarget` over
the declared layouts, resolving the `base()`-runs-before-the-spread ordering issue described in R2
(pass `hookDocuments` into `base()`, or compute after the spread). Add a load-time consistency check
(a unit test is enough) that every declared key ends in `hooks.json.tmpl`. Output unchanged — the
union is currently equal to each member.

**M3 — per-document assembly.** Rewrite `pluginAssembleHooksJson` per R3, including the
**unmapped-hooks-frame hard error**. Choose B-i or B-ii; if B-i, extend `FileProcessingFrame` and
`pluginRenderTemplates`. `buildHooksDocument` and `emitsHooksJson` keep their signatures.
**This is the step where the two files change.** Diff against M0: exactly two paths per affected
set-variant, and each must now equal its standalone sibling.

**M4 — retire `hookLayout`.** Remove `PluginSpec.hookLayout`. Update
`plugin-copy.ts:39-40` `buildManifestOverlay` — the `@hooks` pseudo-folder test becomes *"any
declared document emits"*, i.e. `Object.values(spec.hookDocuments).some(id => emitsHooksJson(HOOK_LAYOUTS[id], …))`.
Update `tests/unit/plugin-processors/plugin-copy.test.ts` (~20 `hookLayout: null` literals) and
`tests/helpers/build-specs.ts`.

**M5 — goldens.** Add `tests/golden/hooks/*.json` (R4) and the generator test (T1).

**M6 — tests.** Land T2–T7 (§9). T3 is the regression lock; **write it before M3 and watch it fail.**

**M7 — regenerate `plugins/`.** Per `follow.md` B3, use local source
(`npm --prefix src/rosettify-plugins start -- …`), **not** `npx rosettify-plugins@latest`, until the
generator is published — the published build knows nothing about `plugins.json` and would destroy
the 49 folders.

**M8 — requirements + docs.** `DATA-CFG-0008` AC1 (§6); `FR-VAR-0030` → `Implemented` with
implementationNotes replaced; `STRUCTURES.md` cursor section gains the root `hooks.json` row;
`CHANGES.md` reconciliation entry. Correct the four `follow.md` GROUND TRUTH cells (§1.1) so the
next reader is not misled by it.

### 8.1 Salvage verdict on the current code

| Symbol / file | Verdict |
|---|---|
| `HookBinding`, `BootstrapBinding`, `HookLayout` (`hook-layouts.ts`) | **Keep as-is.** Every member is load-bearing and evidenced (§4) |
| `HOOK_LAYOUTS` (7 entries, all values) | **Keep values; rekey only** |
| `COPILOT_PLUGIN_PATH`, `copilotProbeBash`, `copilotProbePowershell` | **Keep.** Set-awareness is an improvement over pre-#315 |
| `CLAUDE_BINDINGS` / `CODEX_BINDINGS` / `COPILOT_BINDINGS` / `cursorBindings()` / antigravity's inline list | **Keep.** Verified faithful to the originals |
| `buildHooksDocument` | **Keep unchanged.** It is correct given a correct layout |
| `parsePayloadEntries` | **Keep.** Its throw-on-unparseable is right |
| `emitsHooksJson` | **Keep**; call per document |
| `pluginAssembleHooksJson` | **Rewrite** (the one broken function) |
| `PluginSpec.hookLayout` | **Delete**, replaced by `hookDocuments` |
| `HOOKS_PSEUDO_FOLDER` + its use in `plugin-copy.ts` | **Keep**; predicate becomes per-document |
| `plugins/template-*/**/hooks.json.tmpl` (7 one-liners) | **Keep** (B-i) or **rename the placeholder** (B-ii) |
| `plugin-assemble-*-bootstrap.ts` (4 files) | **Untouched.** `FR-HOOK-0005`, orthogonal |
| `plugin-copy.ts` `collectTmplFrames` / `standaloneTemplates` | **Untouched** (subject to OQ-1) |

### 8.2 If the owner chooses Alternative A instead

M0 unchanged. Then: restore the 7 template bodies from `492b6a78~1` into `plugins/template-*/`;
replace the single `{{#if deterministic_hooks}}` fence with per-module `{{#if module.<name>}}`
fences (6 per template × 7 templates ≈ 42 blocks); build the per-spec Handlebars context
(`{ module: { 'read-once': true, … }, prefix, destination }`); add a **post-render JSON normalizer**
processor (tolerant parse → `JSON.stringify`, throwing on unparseable) and run it on every
`hooks.json` frame; keep the copilot probe strings as helpers (they cannot be inlined readably);
delete `hook-layouts.ts` and `buildHooksDocument`; retire `DATA-CFG-0008`, `FR-GEN-0011`, and the
`HOOK_LAYOUTS` references in `FR-VAR-0083`/`FR-HOOK-0005`. **All of §9's tests still apply and
still catch the defect** — the test design is deliberately design-independent.

### 8.3 Not in this change

Cursor's generated-but-never-injected bootstrap (D20, `FR-VAR-0070`); Antigravity's rule-based
bootstrap (`FR-VAR-0082`); the `hooks/hooks.json` staging-copy question (OQ-1); the copilot casing
fix (§8.4).

### 8.4 The copilot casing fix — separate, HITL-gated

Evidence: §2.2. Proposed change: in the `copilot-plugin` and `copilot-standalone` layouts, register
`SessionStart` instead of `sessionStart`. Leave `preCompact` camel (VS Code has no compaction hook
at all, so camel is single-fire and correct for the only runtime that fires it) — or change it too
for consistency, at the cost of a CLI double-fire if any other config registers the Pascal form.

Why separate: it changes runtime behavior in a way this refactor must not (M0's byte-equality oracle
would go red for a reason unrelated to the defect being fixed); it warrants its own live-hook
verification per `docs/hooks-verify.md` step 3; and the payload placement it would newly activate in
VS Code (nested `hookSpecificOutput.additionalContext`) is already emitted, so the change is
one-line but its blast radius is "bootstrap starts arriving in a runtime where it never has".

### 8.5 If OQ-1 resolves to "the staging copy is loaded"

Then `FR-VAR-0030` is wrong and `<set>-copilot/hooks/hooks.json` must not be emitted at all: give the
copilot spec a template-exclusion (the standalone template is *source* for `copilot-standalone`, not
*output* for `copilot`), amend `FR-VAR-0030` to two files, amend `ASSUMPTIONS.md` AC-14, and update
the parity oracle's expected path set. That is a **larger** change than the fix in §7 and must not be
guessed at.

---

## 9. How it is tested so this cannot regress

The paths-only oracle could not see this: the file's **path** never changed, only its **content**;
and the gate runs only at `--deterministic-hooks false`, the branch where the two copilot forms
differ least. Both gaps must close.

**Global exclusion for every test below:** ignore `**/skills/harness/references/hooks/**` — those are
verbatim probe-config copies (6 per plugin folder) and will false-positive any glob assertion.

**T1 — golden documents (unit).** For each of the 7 layouts × {full modules + bootstrap +
deterministic true, empty modules + no bootstrap + deterministic false}, assert
`buildHooksDocument(...)` deep-equals the committed
`tests/golden/hooks/<layout-id>.<variant>.json`. *Catches:* any change to any envelope, event name,
casing, matcher, entry key, path prefix or grouping, in a diff a human reads as JSON.

**T2 — routing (unit).** For each of the 7 target builders, assert `spec.hookDocuments` equals the
expected map (§7.3 R2) — in particular that `copilot` maps `.github/plugin/hooks.json.tmpl` →
`copilot-plugin` and `hooks/hooks.json.tmpl` → `copilot-standalone`, and `cursor` maps
`hooks/hooks.json.tmpl` → `cursor-plugin` and `hooks.json.tmpl` → `cursor-standalone`.
Plus: **a hooks-template frame with no `hookDocuments` entry throws**, naming the file.
**Mutation check:** swap copilot's two values; T2 **and** T3 must both fail. If only T2 fails, T3 is
too weak.

**T3 — the regression lock (e2e, `--deterministic-hooks true`).** *This is the test that was
missing.* Generate `r3`/`core` to a temp dir with `deterministicHooks: true`, then assert:

| # | Assertion | Guards |
|---|---|---|
| 3.1 | `md5(<set>-copilot/hooks.json) == md5(<set>-copilot/.github/plugin/hooks.json)` | FR-VAR-0031 |
| 3.2 | `md5(<set>-copilot/hooks/hooks.json) != md5(<set>-copilot/.github/plugin/hooks.json)` | the defect, directly |
| 3.3 | `md5(<set>-copilot/hooks/hooks.json) == md5(<set>-copilot-standalone/.github/hooks/hooks.json)` | pre-#315 invariant `5c484f41…` |
| 3.4 | `<set>-copilot/hooks/hooks.json` parses; `.hooks.sessionStart` deep-equals `[]` | FR-VAR-0030 AC4 |
| 3.5 | `<set>-copilot/hooks/hooks.json` contains `.github/hooks/` and contains **none** of `$root`, `agentPlugins`, `printf`, `LOCALAPPDATA` | addressing form |
| 3.6 | `<set>-copilot/.github/plugin/hooks.json` contains `agentPlugins` **and** `LOCALAPPDATA`; every module entry has keys exactly `{type,bash,powershell}` and **no** `command` | addressing + entry keys |
| 3.7 | `md5(<set>-cursor/hooks.json) == md5(<set>-cursor-standalone/.cursor/hooks.json)` | cursor standalone form at the root |
| 3.8 | `<set>-cursor/hooks/hooks.json` commands all start `node hooks/`; `<set>-cursor/hooks.json` commands all start `node .cursor/hooks/` | prefix per form |
| 3.9 | `md5(<set>-codex/.codex/hooks.json) == md5(<set>-codex/.codex-plugin/hooks.json)` | codex mirror |
| 3.10 | Every non-reference `hooks.json` `JSON.parse`s | validity |

Run for at least one hook-bearing set (`core`) and one hookless set (`workflows` — assert **no**
`hooks.json` and no `hooks/` folder).

**T4 — path-prefix oracle (e2e).** A table mapping output path → required command-prefix regex,
**restated independently** of `hook-layouts.ts`:

| Output path | Every `command`/`bash`/`powershell` must match |
|---|---|
| `<set>-claude/hooks/hooks.json` | `\$\{CLAUDE_PLUGIN_ROOT\}/hooks/` |
| `<set>-codex/.codex-plugin/hooks.json`, `<set>-codex/.codex/hooks.json` | `\.codex/hooks/` |
| `<set>-cursor/hooks/hooks.json` | `^node hooks/` |
| `<set>-cursor/hooks.json`, `<set>-cursor-standalone/.cursor/hooks.json` | `^node \.cursor/hooks/` |
| `<set>-copilot/.github/plugin/hooks.json`, `<set>-copilot/hooks.json` | `agentPlugins\|\.vscode/agent-plugins\|LOCALAPPDATA` |
| `<set>-copilot/hooks/hooks.json`, `<set>-copilot-standalone/.github/hooks/hooks.json` | `^node "\.github/hooks/` |
| `<set>-antigravity/hooks.json` | `^node hooks/` |

Bootstrap `printf`/`Write-Output` entries are exempt (they carry a payload, not a script path).

**T5 — contract-conformance oracle (e2e).** The one test that survives any redesign. Restate, from
`docs/hooks/<ide>.md` registration-format sections and **not** imported from `hook-layouts.ts`, per
document: allowed envelope keys, allowed event names (exact casing), allowed entry keys, and whether
each event's entries are grouped or flat. Then walk every generated non-reference `hooks.json` and
assert conformance. Concretely: cursor entries ⊆ `{command,type,timeout,loop_limit,failClosed,matcher}`;
copilot-plugin module entries ⊆ `{type,bash,powershell}`; antigravity tool events grouped and
non-tool events flat with entries ⊆ `{type,command,timeout}`; claude/codex every event array element
has exactly `{matcher,hooks}`. *Catches:* shape drift, a stray `cwd` copied from a probe config, a
casing typo — regardless of which design won.

**T6 — extend the parity gate (`tests/e2e/parity.e2e.test.ts`, NFR-0001).** (a) Parameterize over
`deterministicHooks ∈ {false, true}`; the derivation already knows that `true` adds `hooks/*.js`.
(b) Add a **content hash per (set × target) over the `hooks.json` family** — `follow.md` B2, approved
— as a committed snapshot regenerated deliberately, so any content change surfaces in review even
when the path set is unchanged.

**T7 — referenced-script existence (e2e, scoped).** For every document that is actually **loaded**
in its own distribution, assert each referenced `<module>.js` exists at the referenced path within
that distribution. **Scope carefully:** `<set>-copilot/hooks/hooks.json` is a *staging copy* whose
`.github/hooks/*.js` targets do not exist in a marketplace plugin (bundles live at `hooks/*.js`) —
so it must be explicitly excluded **and the exclusion must carry a comment pointing at OQ-1**, since
that exclusion is exactly the hazard in §5.4.

**T8 — no unrendered placeholders (e2e).** No generated file contains `{{` or `}}`. Cheap; catches a
B-ii typo, and catches a dropped context key generally.

---

## 10. Anomalies, discoveries, inconsistencies

| # | Finding | Type | Evidence |
|---|---|---|---|
| **INC-1** | `follow.md`'s GROUND TRUTH table has 4 wrong cells, all from reading probe configs as shipping shapes | doc defect | §1.1 |
| **INC-2** | `DATA-CFG-0008` AC1 (Approved 2026-09-02) mandates the defective granularity — "one layout per IDE target identity" | requirement defect | §6 |
| **INC-3** | `STRUCTURES.md` cursor section omits the generated root `<set>-cursor/hooks.json`, which exists pre- and post-#315 | doc gap | §5.3 |
| **INC-4** | Shipped copilot registers camel `sessionStart` while the contract says PascalCase-only; **VS Code Copilot has never fired the Rosetta bootstrap** | **functional defect** | §2.2 |
| **INC-5** | `<set>-copilot` ships files at **both** documented auto-discovery locations (`hooks.json`, `hooks/hooks.json`) and declares neither in its manifest | **hazard** | §5.4 |
| **INC-6** | `docs/hooks/copilot.md` has "Hook Locations" but **no registration-format section** — the `{version:1, hooks:{}}` envelope and the `bash`/`powershell` entry keys are attested only by the pre-#315 templates and `FR-HOOK-0005` | contract-doc gap | §2.1, §2.3 |
| **INC-7** | Cursor's bootstrap payload is fully assembled every run and discarded; the contract confirms `sessionStart` → `additional_context` **does** reach the model (✅ Run 2) | deliberate (D20, FR-VAR-0070), flagged | `plugin-assemble-cursor-bootstrap.ts`; `docs/hooks/cursor.md:211` |
| **INC-8** | Antigravity ships `read-once-reset.js` although no binding references it (no compaction event exists); support-module closure pulls it in | harmless dead file | §2.9 |
| **INC-9** | Claude's two advisory bindings use `Edit\|Write\|MultiEdit` and `Write\|Edit\|MultiEdit` — same set, different order | cosmetic; **preserve** for byte-equality | §2.8 |
| **INC-10** | `CHANGES.md:415` still describes copilot bootstrap entries as carrying *"a per-entry 0-based lock index"*; that workaround was removed with `FR-HOOK-0006` | stale doc | `CHANGES.md:502-508` |
| **INC-11** | The copilot bootstrap payload changed 5 entries → 3 in `6b2b2097` ("sweep the refuted bootstrap-delivery mechanism"); pre/post byte comparison of copilot documents must account for it | analysis hazard | pre `35977 B`/5 entries vs post `24437 B`/3 entries |
| **DISC-1** | `HOOK_LAYOUTS` is **byte-faithful** to all seven original templates. The collapse lost no per-IDE knowledge; it lost the ability to address two documents in one target | key discovery | §4 |
| **DISC-2** | The `copilot-standalone` and `cursor-standalone` layouts are **already correct and already used** — by the standalone specs. The defect is only that the marketplace specs cannot reach them | key discovery | §5.1 |
| **DISC-3** | The pre-#315 identity `core-copilot/hooks/hooks.json == core-copilot-standalone/.github/hooks/hooks.json` (`5c484f41…`) is a directly assertable invariant | test lever | §5.2, T3.3 |
| **DISC-4** | The parity gate runs at `deterministic false` only — the branch where the copilot forms differ least. This alone explains why a green PR shipped the defect | test-design defect | `parity.e2e.test.ts` header |
| **DISC-5** | `follow.md`'s `{{#each}}` sketch presupposes a pre-grouped per-event context, i.e. the bindings table still exists in TypeScript. Alternative A does not eliminate the table; it splits it | design finding | §7.1 |
| **DISC-6** | Windsurf/Devin Desktop has a COMPLETE verified contract and **no** plugin target; an orphan `core-windsurf` bundle was removed (`follow.md` F7) | scope gap | `docs/hooks/windsurf.md`; `git ls-tree 492b6a78~1` shows no windsurf plugin |
| **DISC-7** | Devin CLI's `hooks.v1.json` has **no `hooks` wrapper** — a fifth envelope, and a trap for anyone who later adds it as a target | contract detail | `docs/hooks/devin-cli.md` PC 2 |

---

## 11. Open questions

| # | Question | Why it matters | What resolves it |
|---|---|---|---|
| **OQ-1** | Does Copilot auto-discover `<plugin>/hooks/hooks.json` when the manifest declares no `hooks` field, and does it load it *in addition to* root `hooks.json` or *instead of* it? | Determines whether `<set>-copilot/hooks/hooks.json` is inert staging or a live config. If live: today ⇒ every hook double-registers; after the fix ⇒ missing `.github/hooks/*.js` ⇒ non-zero exit ⇒ `preToolUse` **fail-closed** ⇒ potentially every tool denied. **Highest severity in this document** | Empirical, per `docs/hooks-verify.md`: install a generated `<set>-copilot` in Copilot CLI **and** VS Code with `tester.js` wired at each candidate path; count invocations in `~/.rosetta/hooks.log`. Alternatively declare `hooks` explicitly in the manifest and re-test |
| **OQ-2** | Approve the casing fix (`sessionStart` → `SessionStart`) for copilot? And `preCompact` → `PreCompact` or leave camel? | Fixes a dead bootstrap in VS Code Copilot (§2.2) | Owner decision, then a live-hook run in VS Code Copilot confirming the bootstrap marker reaches the model |
| **OQ-3** | Design B (rekey) or A (literal templates + normalizer)? | Reverses a decision recorded as agreed in `follow.md` and decides the fate of 4 requirement units | Owner decision. My default: **B**, for the reasons in §7.1 |
| **OQ-4** | Should `<set>-cursor/hooks.json` (root) be emitted at all? | It is undeclared, unread by Cursor, and absent from `STRUCTURES.md`. Either delete it or document it | Owner decision; then `STRUCTURES.md` + parity-oracle path set |
| **OQ-5** | Amend `DATA-CFG-0008` AC1, or supersede the unit? | Any fix contradicts an AC approved 2026-09-02 | Owner / requirements engineer |
| **OQ-6** | Reconsider Cursor's discarded bootstrap (INC-7)? | The contract confirms the channel works (✅ Run 2); D20 says "no problem, no action", which predates that confirmation being applied to this question | Owner; then a live Cursor run. **Do not relitigate without owner input** |
| **OQ-7** | Should Windsurf/Devin Desktop become a target? | Contract COMPLETE, no plugin. Its shape (no matcher, no `type`, split per-operation events, exit-2+stderr only) would exercise the "add an IDE" path hardest | Owner; out of #315 scope |
| **OQ-8** | Add a registration-format section to `docs/hooks/copilot.md` (INC-6) | Copilot's envelope and entry keys are currently attested only by templates and one FR — the weakest evidence of the seven documents. T5's copilot row cannot cite a contract doc until this exists | Extract from R1/R4 per the `hooks-verify.md` spec-authoring protocol; ideally confirm in the OQ-1 run |
| **OQ-9** | Should the two copilot forms diverge further — e.g. `timeout`/`timeoutSec` on hook entries? | Copilot's `preToolUse` is fail-closed on timeout (`copilot.md:250`), and no shipped entry sets a timeout | Contract review; low priority; note only |

---

## 12. Checklist

| Item | Status |
|---|---|
| All six `docs/hooks/*.md` read in full | ✔ claude-code, codex, copilot, cursor, windsurf, antigravity — plus devin-cli and `docs/hooks-verify.md` |
| All reference configs read | ✔ claude, codex, cursor, copilot, windsurf, antigravity `hooks.json` + `devin/hooks.v1.json` — and reclassified as probe harnesses (§1) |
| All pre-#315 templates read | ✔ all 7 at `492b6a78~1` (listed via `git ls-tree -r 492b6a78~1 --name-only \| grep tmpl`; the 7 under `tests/fixtures/sample-plugins/` are fixture copies) |
| Evidence matrix complete, every cell cited | ✔ §2, ten axes |
| Zero unproven claims of sameness | ✔ §3.1 lists the 5 genuinely shared properties with proof; §3.2 separates 9 apparent ones |
| Dual-casing answered by per-runtime purpose | ✔ §2.2 — containment, with the Observed column per key per runtime, and the functional defect it exposes |
| Marketplace vs standalone addressing preserved per IDE | ✔ §2.5, enforced by T4 |
| Design states all three "add a new X" cases | ✔ §7.4 |
| Contract docs read before any opinion; current TypeScript read last | ✔ in that order |
| One file written | ✔ this file only |
