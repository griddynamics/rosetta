# Architecture — post-merge follow-up, issue #315

Design, not a defect register. Branch `feat/315-plugin-sets`, PR #340. Merge of `origin/main`
(`1513c578`) is **staged, not committed**; merge-base `785054e9`; `.git/MERGE_HEAD` present (verified).
Tracks A–E from `plans/issue-315-merge-followup/discovery-notes.md`; Track F added by the owner
mid-session.

Convention: **[F]** = fact, proven by the cited `path:line` or the quoted command output.
**[A]** = assumption / inference. Decisions D1–D25 in `plans/issue-315-plugin-sets/follow.md` are
settled and are not relitigated here.

---

## 0. Baseline measured this session

| Check | Result | How |
|---|---|---|
| `ac_structure.sh` | **ALL PASS** | run |
| `ac_crossrefs.py` | **ALL PASS** | run |
| `ac_hooks_content.py` (posture false) | **ALL PASS**, 84 assertions | run |
| `ac_equivalence.py` | **FAIL** — 31 unaccounted diffs × 14 targets = 434 | run |
| `src/hooks` regression suite | 1 suite fails to load, 230 tests pass | `npx vitest run tests/regression` |
| scratch build at `--deterministic-hooks true` | rc=0 → `agents/TEMP/315-merge-followup/scratch-true` | `npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks true --source $PWD --output …` |

`plugins/` = 49 folders, all `plugin.json` version `3.1.13` **[F]**. 882 staged plugin file changes,
**all `README.md`** **[F]** (`git status --porcelain plugins/ | awk '{print $2}' | sed 's#.*/##' | sort | uniq -c`
→ `882 README.md`), i.e. the tree is already regenerated against the merged `instructions/`.

---

## 1. Shared vocabulary (reference: `docs/CODEMAP.md:157-161`)

> "Across all five r3 sets: 42 skills, 70 workflow files, 5 rules, 10 agents (20 files). 17 of the
> workflow files are entry points (frontmatter `tags: ["workflow"]`); 15 of those are distinct
> request types…"

Counted this session **[F]**:

| Term | Value | Definition / command |
|---|---|---|
| skills | **42** | `ls -d instructions/r3/*/skills/*/ \| wc -l` → 42 |
| workflow files | **70** | `ls instructions/r3/*/workflows/*.md \| wc -l` → 71, minus 1 `~profile-lightweight-only~overwrite~` variant |
| workflows (entry points) | **17** | frontmatter `tags` **contains** `"workflow"`: 17 files match `^tags: \["workflow"\]$` **plus** `security-flow.md` (`tags: ["workflow", "security"]`), **minus** the `coding-flow~profile-…~` variant = 17 |
| request types | **15** | 17 − `aqa-flow` (router) − `coding-light-flow` (variant) |
| rules | **5** | `ls instructions/r3/*/rules/*.md` → 5, all in `core` |
| agents | **10 (20 files)** | `ls instructions/r3/workflows/agents/*.md` → 20, each with a `~profile-lightweight-only~overwrite~` twin |

**Trap [F]:** `tags:.*workflow` as a loose regex returns 26 — it also matches the 8
`tags: ["security", "workflow-phase"]` phase files. The tally must match the tag **value**, not a
substring. And the naive exact-match 17 is coincidentally right for the wrong reason (it includes the
profile variant and excludes `security-flow.md`).

Per set **[F]**:

| Set | Skills | Workflows (entry) | Workflow files | Rules | Agents |
|---|---|---|---|---|---|
| `core` | 36 | 3 | 17 | 5 | 0 |
| `workflows` | 0 | 9 | 17 | 0 | 10 |
| `qe` | 2 | 4 | 27 | 0 | 0 |
| `search` | 4 | 0 | 0 | 0 | 0 |
| `modernization` | 0 | 1 | 9 | 0 | 0 |
| **total (`rosetta`)** | **42** | **17** | **70** | **5** | **10** |

**Rule adopted:** public statements use `42 skills · 17 workflows · 10 agents · 5 rules`.
"Workflow files (70)" appears only where the file count is meant. "Request types (15)" only where
"kinds of request a user makes" is meant. Banned forms: `~17`, `14+`, `12 workflow types`,
`30 skills`, `17 workflow types` used as a synonym for workflow files.

---

## TRACK A — hooks tests

### A.1 Requirements

- **RA1** The read-once regression stays guarded: read-once registered on every IDE that can deliver
  it; read-once-reset bound to that IDE's compaction/session-boundary event **where one exists**.
- **RA2** Both install paths covered: full (`rosetta-<ide>`, `rosetta-<ide>-light`) **and** split
  (`core-<ide>` beside the domain sets). Owner: "users still can install FULL PLUGIN or they can
  install smaller plugins… test MUST TEST BOTH cases."
- **RA3** No double registration when `core` + domain plugins are installed together.
- **RA4** Antigravity: read-once **without** reset, by design — asserted positively.
- **RA5** The Copilot/Cursor two-form distinction (D25) is respected and asserted per form.
- **RA6** Deterministic sources; fail loudly rather than self-skip where the artifact exists at the
  shipped posture.

### A.2 Facts that constrain the design

1. `read-once-template-registration.test.ts:11,13` reads
   `src/rosettify-plugins/src/spec/hook-layouts.ts`, deleted by `623f5976` under D25 **[F]** —
   `ls` → `No such file or directory`; vitest → `ENOENT … hook-layouts.ts`, suite loads 0 tests.
2. The 7 templates live at `src/rosettify-plugins/plugins/template-<ide>/…/hooks.json.tmpl` **[F]**
   (`find` output). All registration is inside `{{#if deterministic_hooks}}` …`{{/if}}` **[F]**.
3. **The pre-#315 test's two Copilot labels were swapped.** `git show
   492b6a78~1:src/hooks/tests/regression/read-once-template-registration.test.ts:42-56` labels
   `core-copilot/hooks/hooks.json.tmpl` "copilot template" and `.github/plugin/…` "copilot standalone
   template". The truth **[F]**: `template-copilot/hooks/hooks.json.tmpl:9` addresses
   `node ".github/hooks/read-once-reset.js"` = **standalone form**;
   `template-copilot/.github/plugin/hooks.json.tmpl:9,29` carries the
   `$HOME/.vscode/agent-plugins … /plugins/{{destination}}` probe = **plugin form**. Confirmed by the
   gate's own comments, `ac_hooks_content.py:55-66,84-88`.
4. Cursor mirrors it with the roles swapped **[F]**: `template-cursor/hooks.json.tmpl:7`
   `node .cursor/hooks/read-once.js` = standalone form (staged to
   `rosetta-cursor-standalone/.cursor/hooks.json`); `template-cursor/hooks/hooks.json.tmpl:7`
   `node hooks/read-once.js` = plugin form. Same statement in `ac_hooks_content.py:71-78`.
5. Only mustaches in all 7 templates **[F]**: `{{{bootstrap_hooks}}}` (×1, claude/codex/copilot),
   `{{#if deterministic_hooks}}`/`{{/if}}` (×11), `{{destination}}` (×14, Copilot plugin form only —
   D25's "hardcoded `core-copilot` 14×"). No other control flow, no helpers.
6. Antigravity **[F]**: `template-antigravity/hooks.json.tmpl` registers `read-once.js` once and
   contains **no** `read-once-reset.js`. `grep -i compact docs/hooks/antigravity.md` → **zero hits**;
   `docs/hooks/antigravity.md:44` — "`SessionStart` is NOT a valid Antigravity event … Its analog is
   `PreInvocation` @ `invocationNum:0`." No compaction, no session-boundary reset event. By design.
7. At the shipped posture `--deterministic-hooks false`, `plugins/` contains **zero `*.js` bundles**
   outside `**/harness/references/hooks/**` **[F]** (`find plugins -name '*.js' -not -path '*harness*'`
   → empty). `shipsHooks` is **true** (3.1.13 ≥ 3.1.0) but `existsSync(bundlePath)` is false, so
   **every** per-hook assertion at `hooks-registered.test.ts:63-73` returns silently. Only
   `:52-57` (exists + valid JSON) fires. **The committed tree can never exercise the per-hook branch.**
8. `core-<ide>` and `rosetta-<ide>` hooks documents are byte-identical at both postures **[F]**:
   posture false, `core-claude/hooks/hooks.json` and `rosetta-claude/hooks/hooks.json` are both
   6328 B; posture true, `md5` of `core-cursor/hooks.json` = `rosetta-cursor/hooks.json` =
   `900befd8…`, and `core-cursor/hooks/hooks.json` = `rosetta-cursor/hooks/hooks.json` =
   `afbda2fd…` (and the two **forms** differ — D25 holds at posture true).
9. **Domain sets emit nothing** **[F]**: `find plugins -name hooks.json -not -path '*harness*'` lists
   only `core-*` and `rosetta-*`; in the posture-true scratch tree,
   `find workflows-* qe-* search-* modernization-* \( -name hooks.json -o -name '*.js' \) -not -path '*harness*' | wc -l`
   → **0**. That absence **is** the no-double-registration property. **Nothing asserts it today**:
   `ac_hooks_content.py:39` iterates `HOOK_SETS = ["core","rosetta","rosetta-light"]` only;
   `ac_equivalence.py:56` blanket-permits anything named `hooks.json`; AC3 skips it (`:111`).
10. **New defect found** — `hooks-registered.test.ts` is green only by accident of posture. At
    posture true (scratch tree, checked bundle-by-bundle):
    - `read-once-shared.js` ships into every hook-emitting plugin's hook folder and is **never**
      referenced in any `hooks.json` — the test's comment at `:68-69` ("ignores shared libs … that
      are never bundled") is **false**; it *is* bundled.
    - `rosetta-antigravity/hooks/read-once-reset.js` ships and is **never** referenced (correct —
      no compaction event) — a second legitimate exception the test has no vocabulary for.
    Flipping `--deterministic-hooks` to true today would fail this suite on 4 plugins × 1 hook plus
    antigravity. **[F]**
11. Antigravity has a manifest for `shipsHooks` **[F]**: `plugins/{core,rosetta}-antigravity/plugin.json`.

### A.3 Options

**A-I — source-artifact test: templates + `plugins.json` catalog.** Restore the pre-#315 shape
against the 7 `template-<ide>` files with the Copilot/Cursor labels **corrected**, assert per form and
per event, and assert the catalog (`hookSupportModules`, per-set `hooks[]`/`bootstrap`).
*Pros:* deterministic, hermetic, no build, posture-independent, fast; encodes D25's "7 literal
templates are the artifact" directly; catches a template being deleted, renamed or collapsed.
*Cons:* asserts the input, not the rendered output; a routing bug (template → wrong destination) is
invisible to it — that regression belongs to `ac_hooks_content.py`, which already owns it.

**A-II — render-and-assert inside the vitest suite.** Shell out to the generator at posture true into
a temp dir; assert the rendered per-(set × target) documents.
*Pros:* proves the end state, covers routing.
*Cons:* cross-package build dependency inside `src/hooks`; slow and non-hermetic in CI; duplicates
`ac_hooks_content.py --posture true` wholesale; a generator failure now fails the hooks suite.

**A-III — committed posture-true fixture.** Commit the ~21 rendered posture-true `hooks.json`
documents under `src/hooks/tests/fixtures/` and diff against them, with a refresh script.
*Pros:* fast, deterministic, asserts rendered semantics.
*Cons:* a third golden to keep current beside `agents/TEMP/315-golden/` and the gate's per-document
hashes; guaranteed drift; refresh-script-approves-everything failure mode.

### A.4 Chosen — A-I, plus two bounded repairs to `hooks-registered.test.ts`, plus one new isolation test

Terse:

1. **Rewrite `read-once-template-registration.test.ts`** against the 7 templates. Per-case table keyed
   by *document form*, not by IDE:

   | case | file | read-once command (substring asserted) | reset event | reset command |
   |---|---|---|---|---|
   | claude (plugin) | `template-claude/hooks/hooks.json.tmpl` | `${CLAUDE_PLUGIN_ROOT}/hooks/read-once.js` | `PostCompact` | `…/hooks/read-once-reset.js` |
   | codex (plugin) | `template-codex/.codex-plugin/hooks.json.tmpl` | `node .codex/hooks/read-once.js` | `PostCompact` | `node .codex/hooks/read-once-reset.js` |
   | copilot **plugin form** | `template-copilot/.github/plugin/hooks.json.tmpl` | `agent-plugins` probe + `$root/hooks/read-once.js` | `preCompact` | `$root/hooks/read-once-reset.js` |
   | copilot **standalone form** | `template-copilot/hooks/hooks.json.tmpl` | `node ".github/hooks/read-once.js"` | `preCompact` | `node ".github/hooks/read-once-reset.js"` |
   | cursor **plugin form** | `template-cursor/hooks/hooks.json.tmpl` | `node hooks/read-once.js` | `preCompact` | `node hooks/read-once-reset.js` |
   | cursor **standalone form** | `template-cursor/hooks.json.tmpl` | `node .cursor/hooks/read-once.js` | `preCompact` | `node .cursor/hooks/read-once-reset.js` |
   | antigravity | `template-antigravity/hooks.json.tmpl` | `node hooks/read-once.js` | **none** | **must NOT appear** |

   Additional assertions in the same file:
   - **Census:** the set of `**/hooks.json.tmpl` under `src/rosettify-plugins/plugins` equals exactly
     those 7 paths. An 8th or a missing one fails.
   - **Cross-form:** the plugin form must not carry the standalone marker and vice versa — the same
     two markers the gate uses (`ac_hooks_content.py:87-88`: `agent-plugins`, `.github/hooks/`).
     This is the assertion that would have caught the M2 collapse at source level.
   - **Structural parse:** strip **tokens, not lines** — the guard appears inline as
     `"PreInvocation": []{{#if deterministic_hooks}},{{/if}}` (antigravity) and
     `"sessionStart": []{{#if …}},{{/if}}` (copilot standalone), so deleting whole lines would delete
     the key. Rule: `{{#if deterministic_hooks}},{{/if}}` → `,`; a line that is *only* a guard token →
     removed; `{{{bootstrap_hooks}}}` → empty. Then `JSON.parse` and assert the top-level event keys
     per case. Only three token kinds exist **[F]** (fact 5), so this is closed.
     **Exception — the Copilot plugin form is parsed with a special substitution.** It carries
     `\\\{{destination}}` in the powershell probes (`:10,20,30,42,47,57,67`); a naive
     `{{destination}}`→`X` leaves `\\\X`, and `\X` is not a valid JSON escape, so `JSON.parse` throws.
     Replicate Handlebars' backslash consumption instead: substitute `\{{destination}}`
     (**including** the preceding backslash) → `X`, then `{{destination}}` → `X`. This is the exact
     quirk recorded at `agents/TEMP/315-execution-state.md:78-83`. If that substitution ever proves
     fragile, drop the parse for this one form and keep the marker + command-substring assertions —
     they alone are what catch the M2 collapse.
   - **Antigravity rationale in-code:** `expect(raw).not.toContain('read-once-reset')` with the
     comment citing `docs/hooks/antigravity.md:44` and the zero-hit `compact` grep.
   - **Catalog:** `plugins.json` `hookSupportModules['read-once'] === ['read-once-reset','read-once-shared']`;
     `rosetta` and `core` each declare the 6 modules and `bootstrap: true`; `workflows`, `qe`,
     `search`, `modernization` each declare `hooks: []` and `bootstrap: false` (D23).

2. **`hooks-registered.test.ts` — add `core-<ide>` beside `rosetta-<ide>`** (RA2). `CANONICAL_HOOKS_JSONS`
   (`:21-26`) grows from 4 to 10 entries: `core-claude`, `core-copilot`, `core-cursor`, `core-codex`
   with their own `plugin.json` manifests. Rationale: the split install is a shipped product; its
   `hooks.json` must exist and parse exactly like the combo's.
   **Correct the Copilot row while doing it (RA5).** `:23` points `rosetta-copilot` at
   `hooks/hooks.json` — which is the **standalone staging form**, not the plugin form the neighbouring
   `plugin.json` belongs to (`ac_hooks_content.py:57-66`: `hooks/hooks.json` = "the STANDALONE form,
   staging source for the copilot-standalone target"; `.github/plugin/hooks.json` = "the plugin form
   proper") **[F]**. Otherwise this test inherits exactly the form confusion corrected in A.4.1.
   Decision: assert **both** Copilot documents — `.github/plugin/hooks.json` (plugin form, beside its
   manifest) **and** `hooks/hooks.json` (standalone staging) — so 4 + 4 + 2 = 10 entries. Cursor's
   `:24` (`hooks/hooks.json`) is already the plugin form and stays as it is.

3. **`hooks-registered.test.ts` — replace the silent skip with a named, bidirectional rule** (RA6,
   fact 10). Declarative exceptions instead of absence:
   - `NEVER_REGISTERED = new Set(['read-once-shared'])` — a library imported at bundle time, never an
     entry point.
   - `UNREGISTERED_BY_IDE = { antigravity: ['read-once-reset'] }` — cited to
     `docs/hooks/antigravity.md:44`.
   - Forward: every bundle present in the hook folder, minus the exceptions, **must** be referenced.
   - Reverse: every `*.js` referenced in the document **must** have a bundle present.
   - Posture-shape test, always runs, never skips: *either* the folder has zero bundles and the
     document references zero advisory hooks (the shipped posture), *or* it has bundles and both
     directions above hold. Assert which branch was taken and print it, so "it skipped" can no longer
     masquerade as "it passed".

4. **New `src/hooks/tests/regression/hook-set-isolation.test.ts`** (RA3): for each of the 28 domain-set
   folders (`workflows|qe|search|modernization`-`<ide>`) assert **no** `hooks.json` and **no** `*.js`
   outside `**/skills/harness/references/hooks/**`. This is the no-double-registration property, and
   it must live in vitest because that is what CI runs; the gate mirror below covers the other posture.

5. **`ac_hooks_content.py` — add `NO_HOOK_SETS`** (`["workflows","qe","search","modernization"]`),
   asserted at both postures beside the existing `HOOK_SETS` loop (`:39,:197-201`).

Rejected A-II and A-III: both duplicate `ac_hooks_content.py`, which already owns rendered-output
relationships at both postures and is the artifact D25's acceptance was written against.

### A.5 Touch list

| Path | Lines | Change |
|---|---|---|
| `src/hooks/tests/regression/read-once-template-registration.test.ts` | 1-63 (whole file) | rewrite per A.4.1 |
| `src/hooks/tests/regression/hooks-registered.test.ts` | `21-26` | +4 `core-*` entries |
| same | `28-33` | replace `CLAUDE_CODE_ONLY_HOOKS` comment block with `NEVER_REGISTERED` + `UNREGISTERED_BY_IDE` |
| same | `47-76` | bidirectional rule + posture-shape test |
| `src/hooks/tests/regression/hook-set-isolation.test.ts` | new | A.4.4 |
| `scripts/verify/ac_hooks_content.py` | `38-39`, `196-201` | `NO_HOOK_SETS` |

Not touched: `bundle-isolation.test.ts` (it asserts `src/hooks/dist/bundles/`, a different artifact,
and is green), `src/hooks/tests/helpers/release.ts`, the 7 templates themselves.

### A.6 Verification

- `cd src/hooks && npx vitest run tests/regression` → 0 failed suites; the 3 (soon 4) files load.
- Mutation, on a scratch **copy** of `src/rosettify-plugins/plugins` under
  `agents/TEMP/315-merge-followup/scratch-tmpl/` with the test pointed at it via an env override
  (or by `git stash`-free local edit + `git checkout --` restore, never committed):
  1. delete `read-once.js` from the cursor plugin form → cursor plugin case fails.
  2. copy the Copilot plugin form over the standalone form (reproduce M2) → cross-form marker
     assertion fails on `hooks/hooks.json.tmpl`.
  3. add `read-once-reset.js` to the antigravity template → antigravity case fails.
  4. add an 8th `hooks.json.tmpl` → census fails.
- `ac_hooks_content.py` at both postures, including the new `NO_HOOK_SETS` block; mutate by copying a
  `hooks.json` into `workflows-claude/` in the scratch tree → must fail.
- Posture-true regression: point `hooks-registered.test.ts` at
  `agents/TEMP/315-merge-followup/scratch-true` via a `ROSETTA_PLUGINS_DIR` env override (added in the
  same change) and confirm it now passes with the exception lists — that is the proof that fact 10 is
  fixed, not hidden.

### A.7 Risks and rollback

- *Risk:* string-substring assertions are brittle if a template is reformatted. *Mitigation:* the
  structural `JSON.parse` half asserts event keys, so a pure reformat still passes; command strings
  are asserted as substrings of the parsed values, not of the raw file.
- *Risk:* adding `core-*` to `hooks-registered` doubles a suite that can't fire its main branch at the
  shipped posture — cosmetic coverage. *Mitigation:* the posture-shape test makes that explicit rather
  than implied.
- *Rollback:* every item is test-only; `git checkout -- src/hooks/tests/` restores. The
  `ac_hooks_content.py` addition is additive and revertible in one hunk.

---

## TRACK B — equivalence gate

### B.1 Requirements

- **RB1** Acceptance is **content-scoped**, not path-only.
- **RB2** The pre-#315 golden (`agents/TEMP/315-golden/`) stays the oracle; it is never mutated.
- **RB3** Owner: accept main's post-snapshot skill-README edits **only** when the diff is exactly
  main's added lines and nothing is removed. Any other edit to those files must still fail.
- **RB4** Validated in both directions: green now; red on an extra added line, a deleted line, an
  unrelated edit in the same file, **and** on the edit being absent.
- **RB5** Maintainable when main lands more edits.
- **RB6** Mutation testing must not write into `plugins/`.

### B.2 Facts

1. `ac_equivalence.py` fails with **31 unaccounted diffs per target × 14 targets = 434** **[F]** (run).
2. All 434 are `skills/<name>/README.md`; the diff shape is **(2 additions, 0 deletions)** for every
   one of the 434 — one blank line plus one sentence **[F]** (measured with `difflib` at `n=0`;
   `shapes: {(2, 0): 434}`, `any with deletions: 0`).
3. The added lines are byte-identical to main's own edit **[F]**: `git diff --name-only 785054e9
   origin/main -- instructions/r3` → **42 files, all skill READMEs**, each a single hunk of exactly
   2 added / 0 deleted lines; comparing each plugin-side addition to its source-side addition gave
   `plugin-added != source-added: 0`.
4. The 31 skills **[F]**: `backlog, codemap, coding, coding-agents-farm, dangerous-actions,
   data-collection, design, deviation, discovery, hitl, large-workspace-handling, orchestration,
   planning, post-mortem, qa-knowledge, qa-structure, questioning, requirements-use,
   reverse-engineering, risk-assessment, rosetta, self-learning, self-organization, sensitive-data,
   solr-extending, solr-query, solr-schema, solr-semantic-search, specflow-use, subagent-directives,
   tech-specs`.
5. The other 11 are already absorbed by path classes 14/18/19/21 **[F]**:
   `coding-agents-hooks-authoring, coding-agents-prompt-authoring, debugging, harness,
   load-project-context, natural-writing, reasoning, requirements-authoring, research, security,
   testing`. **9 of these also carry branch edits** (`instructions/…/{coding-agents-prompt-authoring,
   debugging,harness,load-project-context,natural-writing,reasoning,requirements-authoring,research,
   testing}/README.md` differ from `origin/main` in the worktree) **[F]** — so RB3's rule would fail
   them; they stay on their path classes, and that blind spot is declared.
6. `classify(path)` (`ac_equivalence.py:70-71`) receives only the path; `compare()` (`:73-90`) holds
   both `pathlib.Path` handles and can pass bytes to a second predicate list **[F]**.
7. `ROOT` is a hardcoded absolute path (`:14`) and `OUT` is fixed to `<repo>/plugins` (`:16`); there
   is no `--tree` **[F]**. (`ac_structure.sh:4` has the same hardcoded root.)
8. **Cross-track interaction the discovery notes missed [F]:** Track E edits
   `instructions/r3/core/skills/orchestration/README.md:28`, a plugin-shipped file, and `orchestration`
   is in the 31. After regeneration its golden→current diff is main's 2 additions **plus** our 1-line
   replacement, so a naive "exactly main's lines" rule fails it.

### B.3 Options

**B-I — git-derived oracle at gate runtime.** The gate shells out to
`git diff <merge-base>..<main-ref> -- instructions/r3/**/README.md` and builds the expected added
lines per skill.
*Pros:* literally "main's added lines"; self-updating as main moves; nothing to regenerate.
*Cons:* the gate now needs a git repo with both refs (breaks on a shallow CI clone or on a scratch
tree); the ref pair is state that has to be pinned somewhere anyway; slow (42 × 2 `git show`).

**B-II — committed delta manifest, generated by a helper.** `verify/gen_permitted_content.py` writes
`verify/permitted_content.json`: per skill name, the ordered expected added lines, the anchor line
they follow, and the originating commit range. The gate is pure-file and takes `--tree`.
*Pros:* deterministic, hermetic, works on scratch trees and shallow clones; the manifest is a
reviewable diff — a reviewer sees exactly which sentence was accepted; extends by re-running the
helper and naming the new commit, mirroring the existing class-23 discipline
(`ac_equivalence.py:49-52`); composes cleanly with branch-authored deltas (fact 8).
*Cons:* one generated artifact to keep current; a careless regeneration can rubber-stamp a bad edit
(mitigated: the helper only ever reads `git diff` between two named refs, never the working tree).

**B-III — purely structural rule, no oracle.** Accept any `skills/*/README.md` whose golden→current
diff is insertion-only, ≤ 2 lines, one hunk, and whose non-blank inserted line also appears verbatim
in the corresponding `instructions/r3/*/skills/<name>/README.md`.
*Pros:* zero maintenance; nothing to regenerate; naturally tracks future main edits of the same shape.
*Cons:* not "exactly main's added lines" — it accepts *any* 2-line insertion that the source also
carries, including one the branch authored; weaker than what the owner asked for.

### B.4 Chosen — **B-II, layered**

Terse. Two layers, evaluated in order, both content-aware:

- **Layer 1 — `MAIN_POST_GOLDEN` (generic, regenerable).** Applies to
  `(^|/)skills/<name>/README.md` for the 31 names in the manifest. Accepts only when: zero deletions;
  exactly one hunk; the ordered added lines equal the manifest's; the anchor hunk header matches. Any
  other delta fails and the gate prints the actual unified diff.
  **The anchor is safe to assert — verified [F]:** across all 434 (31 skills × 14 targets) the
  golden→current diff is exactly **one** hunk (`hunk counts: {1: 434}`), and each skill's plugin-side
  hunk header is identical across every target **and** identical to the source-side hunk header from
  `git diff 785054e9 origin/main` (`skills whose plugin anchor varies across targets OR differs from
  source: 0`). Path rewriting does not shift the insertion point.
- **Layer 2 — `BRANCH_AUTHORED` (explicit, per file, hand-written).** A short list of
  `(path-predicate, expected added lines, expected removed lines, reason, originating change)`.
  Seeded with exactly one entry: `skills/orchestration/README.md`, the Track E path correction
  (`instructions/r3/core/agents/` → `instructions/r3/workflows/agents/`). Layer 1 and Layer 2 deltas
  **compose**: for `orchestration`, the accepted delta is the union, and a third change fails.
- **Two-way contract.** Every manifest entry **must** be observed: if a file the manifest declares
  turns out identical to golden (main's sentence silently dropped from plugin output), the gate
  **fails**. Without this, a regression that reverts main's edit passes by producing no diff.
- **Path classes stay** for the 11 already-covered skills and for everything else. Their blindness is
  recorded, not silently inherited (see Open questions OQ-B1).
- **`--tree` / `--golden` arguments** added, mirroring `ac_hooks_content.py:186-191`, and `ROOT`
  derived as `pathlib.Path(__file__).resolve().parents[3]`. Without this, RB6 is impossible.

Rejected: **B-I** because a gate that needs two git refs cannot run against a scratch tree or a
shallow clone, and the ref pair has to be pinned somewhere regardless — so pin the *result*, not the
query. **B-III** because it is materially weaker than the owner's stated rule: it would accept a
branch-authored 2-line insertion as if it were main's.

Manifest shape (illustrative, not final code):

```json
{
  "source": { "from": "785054e9", "to": "1513c578",
              "commits": ["35c65a04 Update READMEs for skills"] },
  "scope": "instructions/r3/*/skills/*/README.md",
  "skills": {
    "backlog": { "anchor_after_line": 2,
                 "added": ["", "Turns a thin ticket into a buildable one: …"] }
  }
}
```

### B.5 Touch list

| Path | Lines | Change |
|---|---|---|
| `plans/issue-315-plugin-sets/verify/ac_equivalence.py` | `14-19` | `ROOT` from `__file__`; add `argparse` (`--tree`, `--golden`) |
| same | `21-59` | keep `PERMITTED` as the path layer; add `id 24` comment block explaining the split |
| same | `60-71` | new `CONTENT_PERMITTED` list + `classify_content(path, gold_path, new_path)` |
| same | `73-90` | `compare()` passes both handles; unaccounted diffs print the unified diff, not just the path |
| same | `92-108` | report "N path-permitted, M content-permitted, K unaccounted"; fail on unobserved manifest entries |
| `plans/issue-315-plugin-sets/verify/permitted_content.json` | new | the manifest |
| `plans/issue-315-plugin-sets/verify/gen_permitted_content.py` | new | regenerates the manifest from a named ref pair; read-only on the repo |

### B.6 Verification

Baseline, then four mutations on a **copy** (`cp -R plugins agents/TEMP/315-merge-followup/scratch-eq`)
with `--tree`:

| # | Mutation | Expected |
|---|---|---|
| 0 | none | `EQUIVALENCE: ALL PASS` |
| 1 | append one line to `scratch-eq/rosetta-claude/skills/backlog/README.md` | FAIL, naming that file, printing the extra line |
| 2 | delete one pre-existing line from `…/skills/coding/README.md` | FAIL (deletions forbidden) |
| 3 | change a word in `…/skills/design/README.md` outside the inserted sentence | FAIL |
| 4 | restore `…/skills/hitl/README.md` from golden (drop main's sentence) | FAIL (unobserved manifest entry) |
| 5 | revert the Track E line in `…/skills/orchestration/README.md` | FAIL (layer-2 delta unobserved) |

Then re-run unmutated against real `plugins/` → ALL PASS.

### B.7 Risks and rollback

- *Risk:* the manifest becomes a rubber stamp. *Mitigation:* the generator takes two explicit refs and
  never reads the working tree; the manifest lands as a reviewable diff; `source.commits` is required.
- *Risk:* future main edits with a different shape (edit rather than insert) fail the gate loudly and
  block. That is intended — it is a decision point, not a bug.
- *Rollback:* the gate lives under `plans/`; reverting the file restores the previous behavior. No
  product code is touched.

---

## TRACK C — count alignment

### C.1 Requirements

- **RC1** One vocabulary, §1, reference `docs/CODEMAP.md:157-161`. Owner: "edit to be aligned across
  the board." Do not revert.
- **RC2** History files are not edited.
- **RC3** Root docs are corrected before their web mirrors (Track D ordering).
- **RC4** No count statement lives under `instructions/` — verified, so Track C alone never forces a
  plugin regeneration **[F]** (census below).

### C.2 Options

**C-I — hand-edit each statement to the §1 vocabulary.** *Pros:* no new machinery; prose stays
human-written; each edit is reviewable. *Cons:* drifts again on the next content change — this is the
fourth recorded drift (`.claude/skills/merge-main/SKILL.md:150`: "Plugin counts live in three files
that drift apart… Seen at 40/40/38").

**C-II — hand-edit + a counting gate.** Add `scripts/verify/ac_counts.py`:
recompute the six numbers from `instructions/r3/`, then grep the declared statement set and fail on
any mismatch. *Pros:* the drift stops being a recurring manual chore; the vocabulary becomes
executable. *Cons:* a new gate to maintain; prose-matching is fragile if a sentence is reworded.

**C-III — generate the count sentences from a template at build time.** *Cons:* D17's precedent is
explicit — "validate that the authored description mentions each `requires` entry; do not generate the
sentence. Generated prose is worse prose." Rejected on a standing decision.

### C.3 Chosen — **C-II**

Hand-edit every statement to §1; add a small counting gate that (a) recomputes the six numbers and
(b) asserts each declared `path:pattern` carries the current number. Pattern-driven, so a reworded
sentence fails loudly at the moment of the reword rather than a release later. C-III is closed by D17.

### C.4 Touch list — every statement, was → became

**Reference, unchanged:** `docs/CODEMAP.md:157-161`, `docs/CODEMAP.md:115` ("10 agents (20 files)").

| # | File:line | was | became |
|---|---|---|---|
| C1 | `docs/ARCHITECTURE.md:215-223` | table header `\| Set \| Skills \| Workflows \| Rules \| Agents \|`; `\| core \| 36 \| 17 \| 5 \| 0 \|`, `workflows 0/17/0/10`, `qe 2/27/0/0`, `search 4/0/0/0`, `modernization 0/9/0/0` | header `\| Set \| Skills \| Workflows \| Workflow files \| Rules \| Agents \|`; `core 36/3/17/5/0`, `workflows 0/9/17/0/10`, `qe 2/4/27/0/0`, `search 4/0/0/0/0`, `modernization 0/1/9/0/0`; add a total row `42/17/70/5/10` and a one-line note that "Workflows" = entry points (`tags: ["workflow"]`) |
| C2 | `docs/ARCHITECTURE.md:313` | "(42 skills, 10 agents, 17 workflow types, and bootstrap rules)" | "(42 skills, 17 workflows, 10 agents, 5 rules)" — **the canonical sentence; C3 and C12 must be byte-identical to it** |
| C3 | `docs/web/docs/architecture.md:282` | "Each plugin contains core instructions: 42 skills, 10 agents, 17 workflow types, and bootstrap rules." | canonical sentence, with "Each plugin" corrected to "The `rosetta` plugin" (a `search-<ide>` plugin does not contain 42 skills) |
| C4 | `FAQ.md:123` | "Rosetta covers ~17 SDLC workflows" | "Rosetta covers 17 SDLC workflows (15 distinct request types)" |
| C5 | `docs/web/docs/faq.md:129` | same as C4 | mirror of C4 |
| C6 | `docs/SecurityOnePager.md:25` | "of 12 workflow types the user selects per request" | "of 17 workflows the user selects per request" |
| C7 | `docs/web/roadmap.md:104` | "14+ structured workflows covering the full SDLC" | "17 structured workflows covering the full SDLC" |
| C8 | `docs/web/roadmap.md:105` | "30 skills spanning coding, testing, planning…" | "42 skills spanning coding, testing, planning…" |
| C9 | `llms-full.txt:69` | "auto-classify each request into one of ~17 workflow types" | "auto-classify each request into one of 17 workflows (15 distinct request types)" |
| C10 | `llms-full.txt:133` | "core/ (36 skills, 17 workflows, 5 rules…) · workflows/ (10 agents, 17 workflows) · qe/ (2 skills, 27 workflows) · search/ (4 skills) · modernization/ (9 workflows)" | "core/ (36 skills, 3 workflows / 17 workflow files, 5 rules…) · workflows/ (10 agents, 9 workflows / 17 workflow files) · qe/ (2 skills, 4 workflows / 27 workflow files) · search/ (4 skills) · modernization/ (1 workflow / 9 workflow files)" |
| C11 | `llms-full.txt:245` | "10 · SKILLS (42, loaded on demand)" | **unchanged, verified [F]** — all 42 skill directory names under `instructions/r3/*/skills/` appear in the section body at `:245-258`, zero missing |
| C12 | `llms-full.txt:342` | "(42 skills, 10 agents, 17 workflow types + bootstrap rules)" | the C2 canonical sentence, byte-identical: "(42 skills, 17 workflows, 10 agents, 5 rules)" |
| C13 | `llms-full.txt:399` | "Rosetta = ~17 SDLC workflows + cross-workflow guardrails" | "Rosetta = 17 SDLC workflows + cross-workflow guardrails" |
| C14 | `agents/IMPLEMENTATION.md:159` | "`advanced` (10 agents, 17 workflows)" and the six later `advanced` occurrences in that one entry | **OPEN — see OQ-C1.** Proposed: rename `advanced`→`workflows` and restate that entry's per-set counts in §1 vocabulary, because the entry documents the delivered state of a change that has not shipped yet. Older entries untouched. |

**History — must not change:** `CHANGELOG.md` · `docs/stories/**` · `archive/**` ·
`docs/REQUIREMENTS/**/CHANGES.md` · `agents/IMPLEMENTATION.md` entries other than `:159`, including
`:98` ("17 skills, 7 agents, 12 workflow commands" — that is *this repo's own* proxy-shell state, a
different subject) · `agents/init-workspace-flow-state.md:34` (same subject) ·
`plans/issue-315-plugin-sets/**` · `instructions/r2/**` · `agents/TEMP/315-golden/**`.

**Generated — never hand-edited:** `plugins/**` (regenerate) · `docs/web/llms-full.txt` (CI copies the
root file; `.claude/skills/sync-web-site/SKILL.md:143`) · `docs/github-stats.json` ·
`docs/web/user-guide/**` (`scripts/sync_user_guide_web.py`).

**Out of scope, report only:** `docs/PATTERNS/shell-proxy-pattern.md:50` ("13 workflow-type command
shells") — the discovery notes already place this file out of scope; it describes a shell layout that
no longer exists here.

### C.5 Verification

- `ac_counts.py` green: recomputed `42/17/70/15/5/10` and every declared statement matches.
- `grep -rnE '~1[0-9]|1[0-9]\+ (structured )?workflows|30 skills|12 workflow types|17 workflow types'`
  over the non-history scope → zero hits.
- Mutation: change `docs/ARCHITECTURE.md:313` to `41 skills` → `ac_counts.py` fails naming that line.
- No `instructions/**` file touched → `git status --porcelain instructions/` unchanged by Track C.

### C.6 Risks and rollback

- *Risk:* a reworded sentence silently escapes `ac_counts.py`'s pattern. *Mitigation:* the gate also
  asserts the *number of matched sites* per pattern, so a site that stops matching fails.
- *Risk:* C14 is a judgment call on history. *Mitigation:* raised as OQ-C1, not decided here.
- *Rollback:* docs-only, per-file `git checkout --`.

---

## TRACK D — web sync and dead links

### D.1 Requirements

- **RD1** Root docs before web mirrors; the web sync runs once, at the end, so it mirrors final text.
- **RD2** Every `instructions/r*/…` reference in a live doc resolves, or is on a declared allowlist.
- **RD3** `sync-web-site` skill drives the web edits, with its own was→became HITL gate
  (`.claude/skills/sync-web-site/SKILL.md:73-76`).
- **RD4** Scope boundaries: history files, generated files and sample/placeholder paths are excluded.

### D.2 Facts, with two refutations of the discovery notes

1. **Refuted (count).** The notes say "59 links on `docs/web/docs/*-flow.md` point at
   `blob/main/instructions/r3/core/workflows/…`". Measured **[F]**: **68 occurrences** of
   `blob/main/instructions/r3/core/workflows/` across 15 `docs/web/docs/*.md` files. And 68 is not the
   dead count — `arrange-workspace-flow.md` (7) and most of `init-workspace-flow.md` (9) point at
   files that **still live** in `core/workflows/` under D3. Distinct **dead** targets: **54** workflow
   paths + **6** skill paths + 1 asset = **61**.
2. **New, not in the notes [F]:** `docs/web/docs/init-workspace-flow.md:370` →
   `instructions/r3/core/workflows/init-workspace-flow-rules.md`. That file exists only in
   `instructions/r2/`; it was **deleted** from r3. Not a move — needs deletion or retargeting.
3. **New, not in the notes [F]:** `docs/web/docs/requirements-authoring-flow.md:287` →
   `…/requirements-authoring/assets/ra-requirement-unit.**xml**`. The r3 file is
   `ra-requirement-unit.**md**` (the `.xml` exists only under r2). Extension change, pre-existing,
   unrelated to #315.
4. Main's 12 dead links confirmed **[F]**: `README.md:83,84,120-123` and
   `docs/web/docs/introduction.md:69,70,106-109` → `instructions/r3/core/skills/{qa-knowledge,
   qa-structure,solr-*}`; real homes `instructions/r3/qe/skills/` and `instructions/r3/search/skills/`
   (both verified present). `README.md` uses repo-relative links; `introduction.md` uses
   `blob/main/` URLs.
5. Stale zip names on the web **[F]**: `docs/web/docs/plugins.md:63,94,110,129`,
   `docs/web/docs/installation.md:86,118,134,153`, `docs/web/index.md:266,279,288,299` all say
   `core-<ide>…zip`; root `PLUGINS.md`, `INSTALLATION.md`, `user-guide/02-install.md` and
   `llms-full.txt:285-288` already say `rosetta-<ide>…zip`.
6. Stale package label at `docs/ARCHITECTURE.md:39` **[F]**: the ASCII diagram says
   `(core-<ide> package)` for the full plugin; `docs/ARCHITECTURE.md:313` says the full plugin is
   `rosetta-<ide>`.
7. `docs/web/user-guide/**` is generated from root `user-guide/**` by
   `scripts/sync_user_guide_web.py` and is already correct **[F]** — not hand-edited here.

### D.3 Options

Only one real choice exists: the **dead-link verification method**.

**D-I — one-shot grep report.** Reproduce `deadlinks.txt` by hand at the end.
*Pros:* zero new files. *Cons:* not repeatable; the next session redoes it; no regression guard.

**D-II — committed checker with an allowlist.** `scripts/verify/ac_links.sh`:
extract every `instructions/r[0-9]+/…` token from live docs, test existence, subtract a declared
allowlist, exit 1 on any remainder.
*Pros:* repeatable, becomes the acceptance for D and E together, catches the next move; the allowlist
documents the intentional non-paths in one place.
*Cons:* an allowlist to maintain; regex tuning for the `bootstrap-` prefix globs.

**D-III — full link checker (external tool) over rendered Jekyll.**
*Pros:* also catches `#fragment` and external 404s. *Cons:* needs `bundle install` — explicitly out of
scope for a doc sync per `sync-web-site` SKILL `:140`; slow; noisy.

### D.4 Chosen — **D-II**, run before and after, with a fixed edit ordering

Method:

```
grep -rnoE '(\]\(|blob/main/)instructions/r[0-9]+/[A-Za-z0-9/_.~-]+' \
  README.md *.md docs user-guide .github llms-full.txt \
  | sed -E 's#.*(instructions/r[0-9]+/[A-Za-z0-9/_.~-]+)#&#'
```
then per extracted path `test -e`. **Exclusions (paths):** `plugins/`, `agents/TEMP/`,
`instructions/r2/` as a *source* of docs, `archive/`, `docs/stories/`, `**/CHANGES.md`,
`agents/IMPLEMENTATION.md`, `plans/`. **Allowlist (targets), from the discovery notes, re-verified:**
`instructions/r3/core/rules/bootstrap-` (prefix glob, 4 sites) · `…/rules/example.md`,
`…/skills/example.md`, `…/rules/deleted-rule.md` (`.github/prompts/prompt-comparison.md`, samples) ·
`…/skills/my-skill/SKILL.md` (`docs/definitions/folder-structure.md:15`, sample) ·
`instructions/r3/aqa/` (`docs/REQUIREMENTS/plugin-generator/FR-SET.md:80`, an example).

Edit ordering (avoids rework):

1. **Root first.** `README.md:83,84,120-123` → `instructions/r3/qe/skills/…`,
   `instructions/r3/search/skills/…`. `docs/ARCHITECTURE.md:39` → `(rosetta-<ide> package)`.
   `docs/ARCHITECTURE.md:445` distribution paragraph reviewed against the Track F decision.
2. **Track E lands** (below) — it touches `.github/**` and one `instructions/**` file.
3. **Track F naming decision lands** — because it determines what the web zip names must say.
   Sequencing rule: *a web page is edited once, with the final zip name.*
4. **Regenerate `plugins/`.**
5. **Web last, via `sync-web-site`.** One run covering
   `docs/web/docs/{introduction,architecture,plugins,installation,developer-guide,faq}.md`,
   `docs/web/index.md`, `docs/web/roadmap.md`, and the 15 `docs/web/docs/*-flow.md` pages. The skill's
   §3 HITL produces the was→became table; §4 applies. `docs/web/llms-full.txt` and
   `docs/web/user-guide/**` are **not** edited (generated).

### D.5 Touch list

| Path | Lines | Change |
|---|---|---|
| `README.md` | `83,84,120-123` | 6 skill paths → `qe/skills/`, `search/skills/` |
| `docs/ARCHITECTURE.md` | `39` | `(core-<ide> package)` → `(rosetta-<ide> package)` |
| `docs/ARCHITECTURE.md` | `445` | distribution paragraph aligned to Track F |
| `docs/web/docs/introduction.md` | `69,70,106-109` | same 6 paths, `blob/main/` form |
| `docs/web/docs/*-flow.md` (15 files) | 54 dead targets | `core/workflows/` → the owning set's `workflows/` |
| `docs/web/docs/init-workspace-flow.md` | `370` | delete the `init-workspace-flow-rules.md` bullet (file removed in r3) |
| `docs/web/docs/requirements-authoring-flow.md` | `287` | `ra-requirement-unit.xml` → `.md` |
| `docs/web/docs/plugins.md` | `63,94,110,129` | zip names → Track F outcome |
| `docs/web/docs/installation.md` | `86,118,134,153` | same |
| `docs/web/index.md` | `266,279,288,299` | same |
| `docs/web/docs/{architecture,developer-guide}.md` | `385`, `406` | `core/agents` → `workflows/agents` (shared with Track E) |
| `docs/web/docs/architecture.md` | `282` only | Track C value. **Verified [F]:** this page carries no per-set counts table, so C1 has no web mirror — do not port one. |
| `docs/web/docs/faq.md` | `129` | Track C value |
| `docs/web/roadmap.md` | `104,105` | Track C values |
| `scripts/verify/ac_links.sh` | new | D-II |

### D.6 Verification

- `ac_links.sh` before: reproduces ~61 dead targets (record the number). After: **0** outside the
  allowlist.
- Mutation: add a link to `instructions/r3/core/skills/qa-knowledge/README.md` in a scratch copy of
  `README.md` → the checker must report it.
- Root↔web body diff per `sync-web-site` SKILL `:144`: `awk` each shared `## <heading>` out of both
  files, normalize link forms, `diff`. Headings alone are not enough.
- Static spacing re-read of every edited region (blank line before markdown tables and
  `<details markdown="1">`), per SKILL `:140` — no `bundle install`.

### D.7 Risks and rollback

- *Risk:* editing web pages before Track F settles zip names ⇒ rework. *Mitigation:* the ordering rule
  above; the web run is last.
- *Risk:* `sync-web-site` widens scope on its own (SKILL `:145` warns about exactly this).
  *Mitigation:* hand it the touch list above as the approved scope.
- *Risk:* a `*-flow.md` retarget guesses the wrong set. *Mitigation:* `ac_links.sh` proves existence;
  the set is mechanically derivable from `instructions/r3/*/workflows/<file>`.
- *Rollback:* docs-only, per-file.

---

## TRACK E — repo automation and stale comments

### E.1 Requirements

- **RE1** Every executable fallback path in `.github/prompts/**` resolves.
- **RE2** Comments naming moved paths are corrected, or left alone where they are deliberate.
- **RE3** The one `instructions/**` edit is sequenced before the plugin regeneration and is declared
  to Track B's gate.

### E.2 Facts

1. `.github/prompts/repo-implement-code.md:39` and `repo-implement-plan.md:63` both read
   "read `instructions/r3/core/workflows/coding-flow.md` from this checkout" **[F]**. That path does
   not exist; the file is `instructions/r3/workflows/workflows/coding-flow.md` **[F]** (`ls`). This is
   a **live fallback**, not a comment — highest priority in this track.
2. Six workflow YAML comments name `instructions/r3/core/agents/*.md` **[F]**:
   `e2e-testing.yml:205`, `repo-analysis.yml:143`, `repo-implement.yml:279`, `repo-plan.yml:246`,
   `repo-triage.yml:220`, `validate-prompts.yml:262`. Real home: `instructions/r3/workflows/agents/`.
3. `instructions/r3/core/skills/orchestration/README.md:28` names `instructions/r3/core/agents/` in a
   sentence whose point is that `advisor` is *deliberately absent* from that folder **[F]**. Correct
   the path; keep the sentence's meaning. **This file ships in every plugin** → regeneration + Track B
   layer 2.
4. `docs/web/docs/architecture.md:385` and `docs/web/docs/developer-guide.md:406` name
   `instructions/r3/core/agents/<name>.md` as *the place to add a new agent* **[F]** — instructions to
   a contributor, therefore wrong, not merely stale. Owned by Track D's web run.
5. Not dead, leave alone **[F]** (re-verified): the `bootstrap-` prefix globs;
   `example.md` / `deleted-rule.md` / `my-skill` samples; `instructions/r3/aqa/` in `FR-SET.md:80`;
   all history files.

### E.3 Options

No genuine architectural choice for *what* to fix — only for *where the path constant lives*.

**E-I — inline literal fixes** (edit each of the 9 sites).
*Pros:* smallest diff, zero new machinery, matches how the files read today.
*Cons:* the ninth occurrence of the same constant; drifts again on the next move.

**E-II — one shared constant + `ac_links.sh` as the guard.** Leave the literals inline (a YAML comment
cannot interpolate anyway) but let Track D's checker cover `.github/**` so the next move fails a gate.
*Pros:* same small diff, plus a permanent guard; no new indirection in prompt files that agents read
literally. *Cons:* none material.

**E-III — resolve the flow path at runtime** in the prompt files ("find the `coding-flow.md` under
`instructions/r3/*/workflows/`").
*Pros:* survives future moves. *Cons:* a prompt telling an agent to glob is weaker than a prompt
telling it a path; `.github/prompts/**` are executable instructions read by a model, and vagueness
there is a known failure mode.

### E.4 Chosen — **E-II**

Inline literal fixes; `ac_links.sh` (Track D) extended to cover `.github/**` so the class cannot
regress silently. E-III rejected: prompt files must name an exact path.

Ordering inside the track: (1) the two live fallbacks, (2) the six YAML comments, (3) the
`orchestration/README.md` path — last within E, because it is the one that forces regeneration and a
Track B layer-2 entry.

### E.5 Touch list

| Path:line | was | became |
|---|---|---|
| `.github/prompts/repo-implement-code.md:39` | `instructions/r3/core/workflows/coding-flow.md` | `instructions/r3/workflows/workflows/coding-flow.md` |
| `.github/prompts/repo-implement-plan.md:63` | same | same |
| `.github/workflows/e2e-testing.yml:205` | `instructions/r3/core/agents/*.md` | `instructions/r3/workflows/agents/*.md` |
| `.github/workflows/repo-analysis.yml:143` | same | same |
| `.github/workflows/repo-implement.yml:279` | same | same |
| `.github/workflows/repo-plan.yml:246` | same | same |
| `.github/workflows/repo-triage.yml:220` | same | same |
| `.github/workflows/validate-prompts.yml:262` | same | same |
| `instructions/r3/core/skills/orchestration/README.md:28` | `instructions/r3/core/agents/` | `instructions/r3/workflows/agents/` |
| `docs/web/docs/architecture.md:385`, `docs/web/docs/developer-guide.md:406` | `instructions/r3/core/agents/<name>.md` | `instructions/r3/workflows/agents/<name>.md` — **owned by Track D's web run** |

### E.6 Verification

- `ac_links.sh` over `.github/**` → 0 dead outside the allowlist.
- `git diff --stat instructions/` shows exactly one file → regenerate `plugins/` → `git status
  --porcelain plugins/ | grep orchestration` shows 14 changed READMEs (one per `rosetta-*` target) plus
  7 `core-*`.
- `ac_equivalence.py` with the Track B layer-2 entry → PASS; without it → FAIL naming
  `skills/orchestration/README.md`. That asymmetry is itself the proof that layer 2 is content-scoped.
- The PR check "Validate Prompts" is re-run (it failed on an OpenAI stream disconnect, not a finding).

### E.7 Risks and rollback

- *Risk:* changing a prompt file changes agent behavior on the repo's own CI. *Mitigation:* the change
  makes a dead fallback live; the "Validate Prompts" workflow is the acceptance.
- *Rollback:* per-file; the `instructions/` edit additionally requires a regeneration to undo.

---

## TRACK F — release asset listing

Owner, verbatim: *"our pipelines will publish millions of zip files now and will list them all, that
listing will look as ugly and as misleading for humans as hell. Meaning we should have plugins
structured by IDE … and first we show rosetta, then rosetta light, then rosetta standalone, then the
rest of plugins in logical order (core, workflows, qe, search, modernization). Standalone plugins must
be separated from main plugins with empty line, same for smaller plugins."*

Source discovery: `agents/TEMP/315-merge-followup/release-assets-discovery.md`. Its two load-bearing
claims were re-verified here independently.

### F.1 Requirements

- **RF1** A human scanning a release finds the right download fast: grouped by IDE, and within an IDE
  ordered rosetta → rosetta-light → rosetta standalone → core → workflows → qe → search →
  modernization.
- **RF2** Visual separation (blank line) between standalone and main plugins, and between the big
  plugins and the domain plugins.
- **RF3** Named consumers of zip names keep working, or are updated in the same change.
- **RF4** Nothing is published, tagged or pushed while this work is done. Design and dry-run only.
- **RF5** The ordering must not be a second hand-maintained list that can drift from
  `src/rosettify-plugins/plugins.json`.

### F.2 Facts

1. The zip loop is `.github/workflows/publish-instructions.yml:125-140` **[F]**:
   `for plugin_dir in plugins/*/` (bash glob ⇒ alphabetical), `zip_name="${folder}-${version}-${DATE}.zip"`,
   `DATE=$(date +'%Y-%m-%d')` set once at `:118`. The loop knows nothing about "set" or "IDE"; it only
   branches on `*-standalone` to exclude `plugin.json` (`:135-139`).
2. The release step is `:147-202`; `gh release create … --generate-notes` (`:188`) with
   `instructions.zip` and `${{ steps.plugins.outputs.archives }}` (`:191-192`), fallback
   `gh release edit` + `gh release upload --clobber` (`:193-202`) **[F]**.
3. **GitHub sorts release assets by filename, ascending, regardless of upload order — verified
   independently this session [F].**
   `gh api repos/griddynamics/rosetta/releases/tags/v3.1.13 --jq '.assets[] | "\(.id)\t\(.name)"'`
   returns ids `538559548 → 539750532 → 541781540 → 564659853 → 538559549 …` — **non-monotonic** —
   while names run strictly alphabetically. Upload/creation order therefore is not the display order.
   **Consequence: the Assets panel order can only be changed by changing filenames.**
4. The release body is exactly `**Full Changelog**: …compare/v3.1.12...v3.1.13` **[F]**
   (`gh release view v3.1.13 --json body`). Nothing writes an asset index today.
5. v3.1.13 carries **57** assets for 14 folders **[F]** (`.assets | length` → 57), because
   `zip_name` embeds `DATE` and four pushes landed on one tag; each push added a fresh dated set and
   removed nothing. At 49 folders that becomes ~200 assets per multi-push window. **This, not the
   ordering, is the dominant "ugly" driver.**
6. Every documented consumer uses a **glob** **[F]**: `rosetta-cursor-standalone-*.zip`,
   `rosetta-codex-*.zip`, `core-cursor-standalone-*.zip`, … (`PLUGINS.md:89,121,137,156`;
   `INSTALLATION.md:79,111,127,146`; `user-guide/02-install.md:42,56,66,78`;
   `docs/web/user-guide/install.md:47,61,71,83`; `docs/web/docs/plugins.md:63,94,110,129`;
   `docs/web/docs/installation.md:86,118,134,153`; `docs/web/index.md:266,279,288,299`;
   `llms-full.txt:285-288`). No script, test or CI file parses a release asset name — the only `.zip`
   hit outside docs is an unrelated test fixture.
7. The marketplace manifests already list **the owner's order** **[F]** — verified this session,
   `jq -r '[.plugins[].name]|join(", ")'` on all four (`.claude-plugin/`, `.cursor-plugin/`,
   `.github/plugin/`, `.agents/plugins/marketplace.json`) returns
   `rosetta, rosetta-light, core, workflows, qe, search, modernization` identically.
   `src/rosettify-plugins/plugins.json` `.sets[].name` = `rosetta, core, workflows, qe, search,
   modernization` **[F]** (`-light` is a `variants[]` entry, not a set). Standalone variants appear in
   no marketplace manifest — they are download-only, so the ordering problem is specific to the
   GitHub Release asset list, not the install pickers.
8. GitHub's Assets table has no grouping, custom order or blank-row mechanism **[A]** — no such
   feature found; treat as "no evidence it exists".

### F.3 Options

**F-I — generated release-body index; zip names unchanged.** Add a step that composes the body from
`plugins.json` (set order) × a declared IDE order, with `###` headings per IDE and blank lines between
the main / standalone / domain blocks, each line a direct download link. Pass it via `--notes-file`.
*Pros:* the **only** place a blank line can physically exist (fact 3, 8); zero consumer breakage;
order comes from `plugins.json`, satisfying RF5; fully reversible; no rename risk for unknown external
downloaders. *Cons:* the native Assets panel stays alphabetical and long — two lists on one page; a
reader who scrolls to Assets instead of reading the body is unhelped.

**F-II — rename zips so alphabetical sort *is* the desired order, plus the body index.**
`<ide>-<NN>-<set>[-light]-<version>.zip`, e.g. `claude-10-rosetta-3.1.14.zip`,
`cursor-30-rosetta-standalone-3.1.14.zip`, `cursor-50-workflows-3.1.14.zip`.
*Pros:* the native panel itself groups by IDE and orders correctly; the owner's ask is satisfied on
the surface he named. *Cons:* breaks **20 documented download instructions** (fact 6) in root and web
docs; ordinal digits in a product filename are noise a user must ignore; unknown external
installers/scripts that hardcode `rosetta-cursor-standalone-*` break with no deprecation window;
`rosetta-<ide>` naming was *just* established by #315 and would change again before it ever shipped.

**F-III — reduce the asset count instead of reordering.** Ship one zip per IDE containing every set,
or drop `-light` and standalone zips from the release.
*Pros:* the list shrinks from 50 to 7; nothing to order. *Cons:* changes the product — D10 makes the
split sets lightweight-only and separately installable; standalone zips are the documented
non-marketplace path (`PLUGINS.md`, `INSTALLATION.md`). Rejected on D10 and on the install contract.

### F.4 Chosen — **F-I, plus drop the `-<DATE>` suffix**

Terse:

1. **Drop `DATE` from `zip_name`** (`:118,133`): `zip_name="${folder}-${version}.zip"`. The version
   already changes per release, so nothing is lost. This is what converts `--clobber` from "add
   another dated copy" into a genuine replace, and it holds the list at **50** instead of growing by
   49 per push. Every documented consumer is a `*-*.zip` glob, so **no doc edit is required** (fact 6).
   This is the single largest reduction in "ugly and misleading" and it costs one line.
2. **Generate the release body index.** New step between "Create plugin archives" and
   "Create GitHub Release". It reads `src/rosettify-plugins/plugins.json` with `jq` (`jq` is already
   used at `:132,:154`) and emits `RELEASE_BODY.md`:
   - IDE order declared once in the step: `claude, cursor, copilot, codex, antigravity`.
     **RF5 exception, accepted deliberately:** this is a second hand-maintained list. `plugins.json`
     `.targets` is `claude, cursor, copilot, codex, cursor-standalone, copilot-standalone,
     antigravity` **[F]** — it interleaves the standalone targets between the marketplace ones, which
     is a *build* order, not a presentation order, and the owner's grouping treats standalone as a
     sub-block of its parent IDE rather than a peer. The **set** order, which is the part that drifts,
     still comes from `.sets[].name`. The guard below (fail on an unplaced folder) is what keeps the
     IDE list honest.
   - Within an IDE: `rosetta` → `rosetta-light` → *(blank)* → `rosetta-<ide>-standalone`,
     `rosetta-<ide>-standalone-light` → *(blank)* → `core`, `workflows`, `qe`, `search`,
     `modernization` (set order taken from `.sets[].name`) → *(blank)* → the same domain sets in their
     `-standalone` form, where the target exists.
   - A folder absent from `plugins/` is skipped silently; a folder present but not placed by the
     table is appended under `### Other` **and** the step fails, so a new set/IDE can never be
     silently dropped from the index.
   - Body = index + `\n\n` + the auto-generated notes fetched from
     `gh api repos/{owner}/{repo}/releases/generate-notes`, so `--notes-file` alone is passed and no
     assumption about `gh`'s `--generate-notes` + `--notes-file` precedence is needed.
3. **Keep zip names otherwise unchanged.** `rosetta-<ide>[-standalone][-light]-<version>.zip`.
4. **Record the tradeoff for the owner** (OQ-F1): the native Assets panel remains alphabetical. If he
   wants that surface itself grouped, F-II is the only mechanism, and it costs 20 doc edits plus an
   unknowable external-consumer break.

Why not F-II now: it changes a public download name for the second time in one unreleased change, for
a panel that the body index already replaces functionally, and fact 6 shows every *known* consumer is
a glob — but the unknown external ones are exactly the population a rename hurts. Cheap to adopt
later; expensive to undo.

### F.5 Touch list

| Path | Lines | Change |
|---|---|---|
| `.github/workflows/publish-instructions.yml` | `118` | drop `DATE` computation, or keep it for the step summary only |
| same | `133` | `zip_name="${folder}-${version}.zip"` |
| same | after `145` | new step `Compose release body` → `RELEASE_BODY.md` |
| same | `186-192` | `gh release create … --notes-file RELEASE_BODY.md` (drop `--generate-notes`, notes appended by the step) |
| same | `193-202` | fallback path: `gh release edit --notes-file RELEASE_BODY.md` + `upload --clobber` |
| same | `205-225` | step summary prints the grouped list, not the flat `ARCHIVES` string |
| `docs/ARCHITECTURE.md` | `445` | describe the grouped body + the `<folder>-<version>.zip` name |
| `docs/web/docs/architecture.md` | `376` | mirror, via Track D's web run |
| `docs/web/docs/{plugins,installation}.md`, `docs/web/index.md` | fact 6 line list | `core-*` → `rosetta-*` (Track D work; unaffected by the date drop) |

No change to `plugins.json`, the marketplace manifests, `scripts/bump_versions.sh`, or any
`plugins/` content.

### F.6 Verification — **without publishing, tagging or pushing**

- `actionlint .github/workflows/publish-instructions.yml` (or `gh workflow view` parse) → clean.
- Extract the two new shell blocks into
  `agents/TEMP/315-merge-followup/scratch-release/` and run them locally against the real `plugins/`
  with `GITHUB_OUTPUT=/dev/null`: assert 49 zip names produced, all matching
  `^[a-z-]+-3\.1\.13\.zip$`, no duplicates, and `RELEASE_BODY.md` rendering with the exact group order
  and blank lines. Do **not** run `gh release`/`git tag`/`git push`.
- Negative test: add a fake `plugins/newset-claude/` in a **scratch copy** of the tree → the body
  generator must exit non-zero naming it (RF5 guard).
- Negative test: remove `rosetta-codex` from the scratch copy → it is skipped, no crash, and the index
  does not list a missing asset.
- `grep -rn '\-\*\.zip' README.md *.md docs user-guide llms-full.txt` → every glob still matches at
  least one produced name (prove the date drop is safe).

### F.7 Risks and rollback

- *Risk:* `gh release create --notes-file` on the re-run path overwrites a hand-edited body.
  *Mitigation:* the body is fully generated; there is nothing hand-edited to lose.
- *Risk:* dropping `DATE` means a re-push to the same tag replaces assets in place, so the previous
  build's zip is no longer downloadable. *Assessment:* that is the intended behavior — a version is
  supposed to denote one artifact. Today's four-copies-per-version is the anomaly.
- *Risk:* older dated assets already on `v3.1.13` remain after the first date-free run. *Mitigation:*
  a one-off `gh release delete-asset` sweep, owner-approved, **after** this work; not part of it.
- *Risk:* the `generate-notes` API call needs `contents: read` — the job already has
  `contents: write` (`:41`).
- *Rollback:* one workflow file; `git checkout -- .github/workflows/publish-instructions.yml`.

---

## 2. Cross-track ordering (the single sequence)

1. **A** — tests and `ac_hooks_content.py`. Source-only; no plugin impact.
2. **C** — counts in root docs + `llms-full.txt`. Verified to touch **no** `instructions/**` file, so
   no regeneration.
3. **E** — the two live prompt fallbacks, the six YAML comments, then
   `instructions/r3/core/skills/orchestration/README.md`.
4. **D-root** — `README.md` skill links, `docs/ARCHITECTURE.md:39,445`.
5. **F** — `publish-instructions.yml`; the naming decision must exist before any web page states a
   zip name.
6. **Regenerate `plugins/`** from local source only:
   `npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks false --source $PWD`.
   Never `npx rosettify-plugins@latest`.
7. **B** — author the equivalence gate against the regenerated tree, including the layer-2
   `orchestration` entry.
8. **D-web** — one `sync-web-site` run over the full page list, mirroring final root text and final
   zip names.
9. **Full verification** (below).

Rationale for 6 before 7: layer 2's expected delta for `orchestration/README.md` is only observable
after regeneration. Rationale for 8 last: every web page it touches depends on C, D-root and F.

## 3. Verification plan — the four gates at both postures, the three suites

```
# posture false (the shipped posture, committed tree)
bash    scripts/verify/ac_structure.sh
python3 plans/issue-315-plugin-sets/verify/ac_equivalence.py
python3 scripts/verify/ac_crossrefs.py
python3 scripts/verify/ac_hooks_content.py
bash    scripts/verify/ac_links.sh
python3 scripts/verify/ac_counts.py

# posture true (scratch only, never into plugins/)
npm --prefix src/hooks run build
npm --prefix src/rosettify-plugins start -- --release r3 --deterministic-hooks true \
    --source $PWD --output $PWD/agents/TEMP/315-merge-followup/scratch-true
python3 scripts/verify/ac_hooks_content.py \
    --tree agents/TEMP/315-merge-followup/scratch-true --posture true
python3 plans/issue-315-plugin-sets/verify/ac_equivalence.py \
    --tree agents/TEMP/315-merge-followup/scratch-true   # expect hooks-family diffs only

# suites
npm --prefix src/rosettify-plugins test     # baseline 940
npm --prefix src/hooks test                 # baseline 1441
npm --prefix src/curiocity test             # baseline 432
```

Every gate change ships with its mutation proof (A.6, B.6, C.5, D.6, F.6). A gate that only goes green
is not verified; it must also be shown to go red.

## 4. Discoveries, refutations and anomalies

**Refuted from `discovery-notes.md`:**
- *"59 links on `docs/web/docs/*-flow.md`."* Measured 68 occurrences; 54 distinct dead workflow
  targets. Some of the 68 point at files that legitimately stayed in `core/workflows` (D3).
- *"verified in `rosetta-claude`"* (the 31 READMEs) — now verified across **all 14** targets:
  434 diffs, uniformly `(2 additions, 0 deletions)`, added lines byte-equal to main's.
- *The pre-#315 Copilot labels are swapped* — the notes say this; **confirmed** with the template
  bodies, and Cursor's two forms have the **opposite** root/subfolder convention to Copilot's, which
  the notes do not state.

**New, not in the notes:**
- `docs/web/docs/init-workspace-flow.md:370` → `init-workspace-flow-rules.md`, deleted in r3 (exists
  only in r2). Pre-existing dead link, needs deletion not retargeting.
- `docs/web/docs/requirements-authoring-flow.md:287` → `ra-requirement-unit.**xml**`; the r3 file is
  `.md`. Pre-existing, unrelated to #315.
- `hooks-registered.test.ts` is green only because the shipped posture ships no bundles. At posture
  true it fails on `read-once-shared.js` (bundled everywhere, registered nowhere) and on
  `rosetta-antigravity/hooks/read-once-reset.js` (bundled, deliberately unregistered). Its comment at
  `:68-69` ("shared libs … are never bundled") is factually wrong.
- `codemap-refresh.js` is built into `src/hooks/dist/bundles/antigravity/` and asserted present by
  `bundle-isolation.test.ts:62`, but is **not** shipped into `rosetta-antigravity/hooks/` and is not
  registered. Built-but-not-shipped. Not a defect under the antigravity design, but undeclared.
- **Nothing asserts that the 4 domain sets emit no `hooks.json` and no bundles.** That absence is the
  no-double-registration property and it is currently guarded by nobody.
- `ac_equivalence.py:14` and `ac_structure.sh:4` hardcode an absolute repo path; neither takes
  `--tree`. This makes RB6 (mutation testing without touching `plugins/`) impossible today.
- The Track E edit to `orchestration/README.md` collides with the Track B rule — an interaction the
  notes do not mention. Handled by layer 2.
- Release anomaly: **57 assets for 14 folders** on v3.1.13 because `DATE` is in the zip name and
  nothing is ever deleted. At 49 folders this is the dominant ugliness, larger than ordering.
- GitHub sorts release assets **by filename**, not upload order — proven by non-monotonic asset ids on
  v3.1.13. Any ordering requirement is a *naming* requirement.

**Deviations, disclosed.** The only project file written is this one. Additional side effects:
`agents/TEMP/315-merge-followup/scratch-true/` (allowed scratch; `agents/TEMP/` is gitignored,
`.gitignore:113`); `src/hooks/dist/bundles/` rebuilt by `npm --prefix src/hooks run build`, required
for the posture-true generator run (`src/*/dist/` is gitignored, `.gitignore:119`); and three throwaway
files in `/tmp` (`hooksbuild.log`, `gen-true.log`, `sk.txt`) that should have gone to the session
scratchpad. `plugins/` was **not** touched — `plugins/rosetta-antigravity/skills/backlog/README.md` and
`plugins/rosetta-claude/hooks/hooks.json` both still carry their 2026-09-28 mtimes. Git state
unchanged: `git status --porcelain | grep -vE '^(M |MM|A |D |R )' | grep -vE '^ M plugins/'` returns
only `?? plans/issue-315-merge-followup/`; `.git/MERGE_HEAD` still present; `HEAD` still `96b22545`.
No `npx rosettify-plugins@latest`; nothing committed, pushed, tagged or published; D1–D25 untouched.

## 5. Open questions (recorded, not asked)

- **OQ-C1 — `agents/IMPLEMENTATION.md:159`.** `AGENTS.md` calls this file "the only changelog", i.e.
  history, which argues for leaving it. But that one entry names the set `advanced`, a name D22
  retired inside the *same*, still-unreleased change, and states per-set counts in the old vocabulary.
  Proposal: correct that single entry (name + counts); leave every other entry alone. Needs the
  owner's call.
- **OQ-B1 — the 11 path-permitted skill READMEs.** Classes 14/18/19/21 blanket-permit any change to
  `harness/`, `coding-agents-prompt-authoring/`, `coding-agents-hooks-authoring/` and eight others.
  Main's edits landed there invisibly, and 9 of them also carry branch edits. Should they be migrated
  to content-scoped classes too, or is the blindness accepted for now?
- **OQ-B2 — class 2 (`hooks.json`) in `ac_equivalence.py:56`** still blanket-permits every hooks
  content change; `ac_hooks_content.py` compensates, but only for the 3 hook-emitting sets and only
  when someone runs it. Fold the hooks gate into the equivalence run, or leave them separate?
- **OQ-A1 — posture.** Should CI run the hooks suites against a posture-true scratch tree as well?
  Today no committed artifact can exercise the advisory branch, so the real regression surface is
  untested in CI.
- **OQ-F1 — the Assets panel.** The owner asked for the release *listing* to be grouped. Only the
  release **body** can carry grouping and blank lines; the Assets panel is filename-alphabetical and
  can be reordered only by renaming every zip (F-II, 20 doc edits, unknown external breakage).
  Body-only (chosen) or rename?
- **OQ-F2 — stale assets on `v3.1.13`.** After the date drop, the 42 superseded dated zips already
  attached to that release stay there. Sweep them with `gh release delete-asset`, or leave history?
- **OQ-F3 — `instructions.zip`.** It sorts last alphabetically and is the offline-install artifact
  (`INSTALLATION.md:553,696`). Should the body index surface it first, as its own section?
- **OQ-E1 — Copilot bootstrap event casing** (`follow.md` F7): register Pascal `SessionStart` too, or
  drop the dead camelCase registration? Pre-existing, out of #315, still open.
