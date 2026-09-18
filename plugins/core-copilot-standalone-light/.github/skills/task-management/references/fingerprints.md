---
name: fingerprints
description: "Compute normative-content fingerprints without treating execution metadata as requirement changes."
baseSchema: docs/schemas/generic.md
---

<fingerprints>

<common>

Compute SHA-256 over the selected UTF-8 bytes using local tools; persist selector name and digest.
Never change selector semantics in place; a new algorithm needs a new selector name and new approval.
Unreadable, malformed, duplicate, unsupported, or ambiguously selected content -> invalid binding, not an empty digest.
Do not silently fall back to another selector or refresh an old receipt when content changes.
`file`: exact bytes; use for architecture/specification text, source, tests, configuration, and delivered evidence.
`absent`: delivery deletion only; digest null and path must remain absent.

</common>

<sections>

For inline architecture/specification, selector is the exact unique level-two heading, including `## `.
Select bytes after its heading line through before the next level-two heading (or end-of-file), excluding the heading line.
Preserve newlines and all whitespace; parse Markdown headings outside code fences. Duplicate heading -> invalid.
Never hash passport frontmatter or history as a normative section. Inline Requirements is intake/links, never an approved requirement source.
For inline Plan use selector `plan-normative-v1:## Plan`: select that unique section, then apply plan normalization below.

</sections>

<requirements>

`requirements-normative-v2` handles XML-like `<req>` records in Markdown; never parse their prose as XML.
Canonical metadata is the opener's `implementation` attribute plus direct `implementationNotes` content.

Algorithm (all offsets and replacements refer to original bytes):
1. Validate UTF-8; preserve original bytes. A record opener is `<req` preceded on its line only by spaces/tabs,
   followed by ASCII whitespace. Ignore inline mentions such as backticked `<req>` in prose.
2. Scan its opener quote-aware: attribute names match `[A-Za-z_][A-Za-z0-9_.:-]*`, separated by ASCII whitespace;
   each has `=` and a single/double-quoted value. Terminate at the first unquoted `>`.
   Reject duplicate attributes, missing/duplicate IDs, or incomplete quotes; do not decode entities or rewrite spacing.
3. The record terminator is exact `</req>`, preceded on its line only by spaces/tabs and followed only by spaces/tabs then newline/EOF.
   Require one matching terminator before another record opener; nested/overlapping or missing record boundaries are ambiguous -> invalid.
4. Read direct fields sequentially between those boundaries, skipping only ASCII whitespace between fields.
   Parse each field opener with the same quote-aware attribute grammar. A field may self-close as `/>`.
   Otherwise locate its exact `</FIELDNAME>`; require exactly one such closing delimiter in the remaining record.
   Treat the entire enclosed content as opaque bytes: do not tokenize paths, angle-bracket placeholders, Markdown, or nested children.
   Reject non-whitespace between fields, repeated direct field names, or ambiguous/missing closing delimiters.
5. Schedule replacement of ONLY the `implementation` attribute value bytes in the record opener (excluding its quotes)
   and ONLY content between a direct, attribute-free `<implementationNotes>` and its `</implementationNotes>` with empty bytes.
   Reject attributed/self-closing implementationNotes forms as unsupported; absent metadata requires no replacement.
   A literal implementationNotes example inside statement/acceptance/another field is opaque normative content, never selected.
6. Apply these nonoverlapping replacements from highest offset to lowest and hash the resulting file bytes.
   Keep delimiters, attribute names/quotes, field ordering, whitespace/newlines, outer Markdown, and every other byte unchanged.
   Require at least one record; never use a broad regex over the body or normalize/repair the source to make it parse.

Only current-format implementation values and implementationNotes contents can change without revoking approval.
Statements, criteria, dependencies, status/approval/date fields, and surrounding prose remain bound.
A reserved delimiter used literally where it makes field boundaries ambiguous requires clarification, not guessed exclusion.
A normative change hidden inside implementationNotes is still a scope violation; continue normal in-place metadata updates.
Legacy `<implementation>...</implementation>` is deliberately bound: changing it is drift, not a silently supported exclusion.
Before delivery using legacy metadata, resolve its update/approval handling explicitly; do not rewrite legacy requirements automatically.
For artifacts without these records, use `file`; do not invent YAML exclusions. Index/rationale prose stays normative unless
explicitly classified as execution-only history before approval.

</requirements>

<plans>

`plan-normative-v1` selects an entire Markdown plan. `plan-normative-v1:## Plan` selects the inline section above.
1. Decode UTF-8 strictly; parse Markdown with GitHub-style task-list recognition and original source positions.
2. Identify only actual task-list checkboxes at list-item starts, outside fenced or indented code and raw HTML blocks.
3. In the original selected bytes, replace exactly the single character inside each `[ ]`, `[x]`, or `[X]` marker with a space.
4. Preserve every other byte, including item wording, dependencies, order, indentation, headings, and code examples; hash the result.

Checkbox completion alone preserves plan approval; changing/deleting/adding a step or criterion changes its digest.
Keep prose progress, reviewer outcomes, phase status, and next-session pointers in execution-only handoff/state documents.
If a normative plan also tracks prose progress, separate it before approval; never erase arbitrary status lines during hashing.
`plan.json` execution state is not an alternative authority for approved normative plan content.

</plans>

<proof_cases>

- Requirement implementation state/notes only change -> same normative digest.
- Requirement statement, acceptance condition, approval state, dependency, or outside prose changes -> different digest.
- Task-list checkbox toggles -> same plan digest; its text/order changes -> different digest.
- Checkbox-looking code sample changes -> different digest.
- Fingerprint matching establishes content equality only; genuine approval and current upstream receipts remain mandatory.

</proof_cases>

</fingerprints>
