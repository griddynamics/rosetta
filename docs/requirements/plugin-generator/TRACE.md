# plugin-generator — Traceability: Profiles

Goal -> requirement -> acceptance criteria -> verification method, for the profiles change.

## Goals

- **G1** Ship a light Rosetta (simpler workflows, smaller models) as separate installable plugins. PRIMARY.
- **G2** Tune models per client (no Opus access; OpenAI-only in Cursor). Edge case, same mechanism.
- **G3** A profiled build never overwrites or perturbs standard plugin output.
- **G4** A profile can substitute an individual instruction document (e.g. a simpler coding-flow.md).
- **G5** A disallowed model appears nowhere in a shipped plugin — frontmatter or body text.

## Matrix

Criteria owned by units another file authors are marked `(other file)`; their `.AC#` ids live there.

| Goal | Requirement ID | Acceptance criteria | Verification |
|---|---|---|---|
| G1 | DATA-CFG-0006 | (other file — MODEL.md) | Inspection |
| G1 | FR-CLI-0032 | (other file — FR-CLI.md) | Test |
| G1 | FR-CLI-0033 | (other file — FR-CLI.md) | Test |
| G1 | FR-PROF-0001 | .AC1 | Test |
| G1 | FR-PROF-0010 | .AC1, .AC2, .AC6 | Test |
| G1 | FR-PROF-0011 | .AC1, .AC2, .AC3 | Test |
| G1 | FR-PROF-0020 | .AC1, .AC2, .AC3, .AC4 | Test |
| G1 | FR-PROF-0021 | .AC1, .AC2, .AC3 | Test |
| G1 | FR-PROF-0030 | .AC1 | Test |
| G1 | FR-ARCH-0059 | (other file — FR-ARCH.md) | Test |
| G2 | DATA-CFG-0006 | (other file — MODEL.md) | Inspection |
| G2 | FR-CLI-0032 | (other file — FR-CLI.md) | Test |
| G2 | FR-CLI-0033 | (other file — FR-CLI.md) | Test |
| G2 | FR-PROF-0001 | .AC6 | Test |
| G2 | FR-PROF-0010 | .AC1, .AC2, .AC3, .AC4, .AC5 | Test |
| G2 | FR-PROF-0011 | .AC2, .AC3, .AC4 | Test |
| G2 | FR-COPY-0083 | (other file — FR-COPY.md) | Test |
| G2 | FR-ARCH-0059 | (other file — FR-ARCH.md) | Test |
| G3 | FR-PROF-0001 | .AC2, .AC3, .AC4, .AC5, .AC6, .AC7 | Test |
| G3 | FR-PROF-0020 | .AC1, .AC2, .AC4 | Test |
| G3 | FR-PROF-0021 | .AC1, .AC2, .AC3 | Test |
| G3 | FR-PROF-0040 | .AC1, .AC2, .AC3, .AC4 | Test |
| G4 | FR-PROF-0030 | .AC1, .AC2, .AC3, .AC4, .AC5 | Test |
| G5 | FR-PROF-0001 | .AC6 | Test |
| G5 | FR-PROF-0010 | .AC1, .AC5 | Test |
| G5 | FR-PROF-0011 | .AC2, .AC4 | Test |
| G5 | FR-COPY-0083 | (other file — FR-COPY.md) | Test |
| G5 | FR-COPY-0084 | (other file — FR-COPY.md) | Test |

## Coverage

- Every goal G1–G5 traces to at least one unit.
- Every listed unit traces to at least one goal:
  DATA-CFG-0006 (G1,G2) · FR-CLI-0032 (G1,G2) · FR-CLI-0033 (G1,G2) ·
  FR-PROF-0001 (G1,G2,G3,G5) · FR-PROF-0010 (G1,G2,G5) · FR-PROF-0011 (G1,G2,G5) ·
  FR-PROF-0020 (G1,G3) · FR-PROF-0021 (G1,G3) · FR-PROF-0030 (G1,G4) · FR-PROF-0040 (G3) ·
  FR-COPY-0083 (G2,G5) · FR-COPY-0084 (G5) · FR-ARCH-0059 (G1,G2).
- No orphan goal, no orphan unit.
