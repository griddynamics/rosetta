# UI-QA layout

UI/E2E QA canonical artifact paths, <test-name> slug rules, and state-file shape.

<ui-qa-layout>

UI-QA (UI / E2E) canonical paths -- `<test-name>` is the kebab slug shared across every artifact of one run:

```
agents/TEMP/<FEATURE>/ui-qa-state.md                                (workflow state file)
plans/ui-qa-<test-name>.md                    (test plan -- data-collection + requirements-clarification)
plans/ui-qa-<test-name>-code-analysis.md      (code-analysis)
plans/ui-qa-<test-name>-page-sources/         (selector-identification -- one <page-name>.html per visited page, kebab-case)
plans/ui-qa-<test-name>-failure-analysis.md   (test-report-analysis)
```

<slug_rules>

- Slug format + underivable rule: see SKILL `<core_concepts>`; underivable remedy here = restore or re-run the producing phase.
- **Authority:** when the plan file `plans/ui-qa-<test-name>.md` exists, its filename slug (segment after `ui-qa-`, before `.md`) is authoritative; if `agents/TEMP/<FEATURE>/ui-qa-state.md` disagrees, prefer the plan filename, record the mismatch, continue. If the plan file is missing, use `agents/TEMP/<FEATURE>/ui-qa-state.md` or ask once.
- **Page-sources contract:** `plans/ui-qa-<test-name>-page-sources/` must exist with kebab-case `<page-name>.html` files before any page-source analysis; never fabricate selectors when both page sources and frontend source are absent.
- **Disclosure:** if the slug is resolved with any caveat (filename-vs-state mismatch, fallback, override of a malformed slug), name the chosen slug, the rejected alternative, and the tie-break source in that phase's summary before continuing.

</slug_rules>

**State file `agents/TEMP/<FEATURE>/ui-qa-state.md`:** adds `## Key Artifacts & Facts` (resume anchor) + `## Verification-Failure Overrides` to the standard shape (per SKILL). Full skeleton → asset `qa-structure/assets/ui-qa-state-template.md`.

</ui-qa-layout>
