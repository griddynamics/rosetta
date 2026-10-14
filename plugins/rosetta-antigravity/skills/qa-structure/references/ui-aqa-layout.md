# UI-AQA layout

UI/E2E QA canonical artifact paths, <test-name> slug rules, and state-file shape.

<ui-aqa-layout>

UI-AQA (UI / E2E) canonical paths -- `<test-name>` is the kebab slug shared by the run folder and every artifact inside it; all artifacts of one run live under the single `plans/ui-aqa-<test-name>/` directory:

```
agents/TEMP/<FEATURE>/ui-aqa-state.md                       (workflow state file -- shared singleton, resume anchor)
plans/ui-aqa-<test-name>/                      (per-run session directory -- all artifacts of one run live here)
plans/ui-aqa-<test-name>/test-plan.md          (test plan -- data-collection + requirements-clarification)
plans/ui-aqa-<test-name>/code-analysis.md      (code-analysis)
plans/ui-aqa-<test-name>/page-sources/         (selector-identification -- one <page-name>.html per visited page, kebab-case)
plans/ui-aqa-<test-name>/failure-analysis.md   (test-report-analysis)
```

<slug_rules>

- Slug format + underivable rule: see SKILL `<core_concepts>`; underivable remedy here = restore or re-run the producing phase.
- **Authority:** when the run folder `plans/ui-aqa-<test-name>/` exists, its directory slug (segment after `ui-aqa-`) is authoritative; if `agents/TEMP/<FEATURE>/ui-aqa-state.md` disagrees, prefer the folder name, record the mismatch, continue. If the folder is missing, use `agents/TEMP/<FEATURE>/ui-aqa-state.md` or ask once.
- **Page-sources contract:** `plans/ui-aqa-<test-name>/page-sources/` must exist with kebab-case `<page-name>.html` files before any page-source analysis; never fabricate selectors when both page sources and frontend source are absent.
- **Disclosure:** slug resolved with any caveat (filename-vs-state mismatch, fallback, override of a malformed slug) → name chosen slug, rejected alternative, and tie-break source in that phase's summary before continuing.

</slug_rules>

**State file `agents/TEMP/<FEATURE>/ui-aqa-state.md`:** adds `## Key Artifacts & Facts` (resume anchor) + `## Verification-Failure Overrides` to the standard shape (per SKILL). Full skeleton → READ SKILL FILE `assets/ui-aqa-state-template.md`.

</ui-aqa-layout>
