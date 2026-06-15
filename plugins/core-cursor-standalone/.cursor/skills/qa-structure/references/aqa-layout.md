---
name: aqa-layout
description: AQA (UI/E2E) canonical artifact paths, <test-name> slug rules, and state-file shape.
---

<aqa-layout>

AQA (UI / E2E) canonical paths — `<test-name>` is the kebab slug shared across every artifact of one run:

```
agents/aqa-state.md                                (workflow state file)
plans/aqa-<test-name>.md                    (test plan — Phases 1-2)
plans/aqa-<test-name>-code-analysis.md      (Phase 3)
plans/aqa-<test-name>-page-sources/         (Phase 4 — one <page-name>.html per visited page, kebab-case)
plans/aqa-<test-name>-failure-analysis.md   (Phase 7)
```

<slug_rules>

- **Slug format (`<test-name>` and any user-supplied slug):** lowercase ASCII kebab-case — letters, digits, hyphens only; no spaces or paths; max 80 chars. Reserved names rejected: `state`, `index`, `aqa-state`.
- **Authority:** when the Phase 1 plan file `plans/aqa-<test-name>.md` exists, its filename slug (the segment after `aqa-`, before `.md`) is authoritative; if `agents/aqa-state.md` disagrees, prefer the plan filename, record the mismatch, continue. If the plan file is missing, use `agents/aqa-state.md` or ask the user once.
- **Page-sources contract:** `plans/aqa-<test-name>-page-sources/` must exist with kebab-case `<page-name>.html` files before any page-source analysis runs; never fabricate selectors when both page sources and frontend source are absent.
- **Guards:** if the slug cannot be resolved to a valid format (even after one user attempt), stop the phase, record the gap in `agents/aqa-state.md`, ask the user to restore or re-run the producing phase — never guess.
- **Disclosure:** if the slug is resolved with any caveat (filename-vs-state mismatch, ambiguity resolved via fallback, user override of a malformed slug), name the chosen slug, the rejected alternative, and the tie-break source in that phase's user-facing summary before continuing.

</slug_rules>

**State file `agents/aqa-state.md`:** `## Phase Completion Status` (8 rows) + `## Key Artifacts & Facts` (resume anchor — only what resume-after-compaction needs; full per-phase detail lives in each phase's own artifacts) + `## Verification-Failure Overrides`. Full skeleton → asset `qa-structure/assets/aqa-state-template.md`. Each phase appends only its own delta.

</aqa-layout>
