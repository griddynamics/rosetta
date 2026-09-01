# plugin-generator — Traceability

Goal -> requirement -> acceptance criteria -> verification method. Covers the profiles change (G1-G5) and the plugin-set change (G6-G12, ticket #315).

## Goals

- **G1** Ship a light Rosetta (simpler workflows, smaller models) as separate installable plugins. PRIMARY.
- **G2** Tune models per client (no Opus access; OpenAI-only in Cursor). Edge case, same mechanism.
- **G3** A profiled build never overwrites or perturbs standard plugin output.
- **G4** A profile can substitute an individual instruction document (e.g. a simpler coding-flow.md).
- **G5** A disallowed model appears nowhere in a shipped plugin — frontmatter or body text.
- **G6** Ship each subject area as its own installable plugin, so a user takes only what they need. PRIMARY for #315.
- **G7** Keep shipping one combined Rosetta plugin, content-equivalent to today's, for users who want everything.
- **G8** One generator invocation produces every plugin set and variant; no second call for the lightweight build.
- **G9** Adding, removing, or recomposing a plugin set is a configuration edit, never a generator code change.
- **G10** Hand-maintained preserved configuration does not grow with the plugin-set inventory.
- **G11** Each plugin ships exactly the hooks and hook bundles it declares, and nothing it does not.
- **G12** No plugin ships an index that misrepresents a multi-plugin install.
- **G13** IDE target identity is the bare IDE name and every scoping directive carries its own namespace, so plugin identity can be two-dimensional without ambiguity.
- **G14** `configure/` and `templates/` leave the plugin output; the per-IDE guides ship as `harness` skill references and keep verbatim treatment.

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
| G6 | FR-SET-0001 | .AC3, .AC5 | Test |
| G6 | FR-SET-0020 | .AC1, .AC2, .AC5 | Test |
| G6 | FR-SET-0040 | .AC1, .AC2, .AC3, .AC4, .AC6 | Test |
| G6 | FR-SET-0050 | .AC1, .AC2, .AC3, .AC4 | Test |
| G6 | DATA-CFG-0007 | (other file — MODEL.md) | Inspection |
| G6 | DATA-CFG-0003 | (other file — MODEL.md) | Inspection |
| G6 | FR-ARCH-0025 | (other file — FR-ARCH.md) | Test |
| G6 | FR-ARCH-0023 | (other file — FR-ARCH.md) | Test |
| G6 | FR-STRUCT-0010 | (other file — STRUCTURES.md) | Inspection |
| G6 | FR-STRUCT-0020 | (other file — STRUCTURES.md) | Inspection |
| G6 | FR-STRUCT-0030 | (other file — STRUCTURES.md) | Inspection |
| G6 | INT-IDE-0003 | (other file — REFERENCES.md) | Inspection |
| G7 | FR-SET-0030 | .AC1, .AC3, .AC4 | Test |
| G7 | FR-SET-0020 | .AC1, .AC4 | Test |
| G7 | FR-PROF-0020 | (other file — FR-PROF.md) | Test |
| G7 | FR-PROF-0021 | (other file — FR-PROF.md) | Test |
| G7 | FR-PROF-0040 | (other file — FR-PROF.md) | Test |
| G7 | NFR-0001 | (other file — NFR.md) | Test |
| G8 | FR-SET-0060 | .AC1, .AC2, .AC3, .AC4, .AC5 | Test |
| G8 | FR-SET-0030 | .AC1, .AC2, .AC5 | Test |
| G8 | FR-CLI-0030 | (other file — FR-CLI.md) | Test |
| G8 | FR-CLI-0031 | (other file — FR-CLI.md) | Test |
| G8 | FR-CLI-0032 | (other file — FR-CLI.md) | Test |
| G8 | FR-CLI-0040 | (other file — FR-CLI.md) | Analysis |
| G8 | FR-CLI-0041 | (other file — FR-CLI.md) | Test |
| G8 | FR-CLI-0042 | (other file — FR-CLI.md) | Inspection |
| G9 | FR-SET-0001 | .AC1, .AC2, .AC4, .AC5 | Test |
| G9 | FR-SET-0010 | .AC1, .AC2, .AC3, .AC4, .AC6, .AC7, .AC8, .AC9, .AC10 | Test |
| G9 | FR-CLI-0001 | (other file — FR-CLI.md) | Test |
| G9 | FR-CLI-0034 | (other file — FR-CLI.md) | Test |
| G9 | FR-CLI-0060 | (other file — FR-CLI.md) | Inspection |
| G9 | DATA-CFG-0007 | (other file — MODEL.md) | Inspection |
| G9 | DATA-CFG-0002 | (other file — MODEL.md) | Inspection |
| G9 | DATA-CFG-0006 | (other file — MODEL.md) | Inspection |
| G9 | FR-PROF-0001 | (other file — FR-PROF.md) | Test |
| G10 | FR-SET-0010 | .AC5, .AC11 | Test |
| G10 | DATA-CFG-0005 | (other file — MODEL.md) | Inspection |
| G10 | FR-SEED-0001 | (other file — FR-COPY.md) | Test |
| G10 | FR-SEED-0002 | (other file — FR-COPY.md) | Test |
| G11 | FR-SET-0070 | .AC1, .AC2, .AC3, .AC4, .AC5, .AC6 | Test |
| G11 | FR-HOOK-0001 | (other file — FR-HOOK.md) | Test |
| G11 | FR-HOOK-0020 | (other file — FR-HOOK.md) | Test |
| G11 | FR-HOOK-0022 | (other file — FR-HOOK.md) | Test |
| G11 | FR-GEN-0010 | (other file — FR-GEN.md) | Test |
| G11 | FR-GEN-0011 | (other file — FR-GEN.md) | Test |
| G11 | FR-VAR-0083 | (other file — FR-VAR.md) | Inspection |
| G12 | FR-HOOK-0004 | (other file — FR-HOOK.md) | Test |
| G12 | FR-HOOK-0007 | (other file — FR-HOOK.md) | Test |
| G12 | FR-HOOK-0009 | (other file — FR-HOOK.md) | Test |
| G12 | FR-GEN-0001 | (other file — FR-GEN.md) | Test |
| G12 | FR-GEN-0002 | (other file — FR-GEN.md) | Test |
| G12 | FR-GEN-0003 | (other file — FR-GEN.md) | Test |
| G12 | FR-GEN-0004 | (other file — FR-GEN.md) | Test |
| G12 | FR-VAR-0010 | (other file — FR-VAR.md) | Test |
| G12 | FR-VAR-0020 | (other file — FR-VAR.md) | Test |
| G12 | FR-VAR-0030 | (other file — FR-VAR.md) | Test |
| G12 | FR-VAR-0041 | (other file — FR-VAR.md) | Test |
| G12 | FR-VAR-0072 | (other file — FR-VAR.md) | Test |
| G12 | FR-VAR-0080 | (other file — FR-VAR.md) | Test |
| G13 | FR-ARCH-0020 | (other file — FR-ARCH.md) | Test |
| G13 | FR-ARCH-0021 | (other file — FR-ARCH.md) | Test |
| G13 | FR-ARCH-0023 | (other file — FR-ARCH.md) | Test |
| G13 | FR-ARCH-0025 | (other file — FR-ARCH.md) | Test |
| G13 | FR-ARCH-0060 | (other file — FR-ARCH.md) | Test |
| G13 | FR-COPY-0020 | (other file — FR-COPY.md) | Test |
| G13 | FR-COPY-0021 | (other file — FR-COPY.md) | Test |
| G13 | FR-COPY-0022 | (other file — FR-COPY.md) | Test |
| G13 | FR-COPY-0080 | (other file — FR-COPY.md) | Test |
| G13 | FR-COPY-0081 | (other file — FR-COPY.md) | Test |
| G13 | FR-COPY-0082 | (other file — FR-COPY.md) | Test |
| G13 | FR-COPY-0083 | (other file — FR-COPY.md) | Test |
| G13 | FR-COPY-0084 | (other file — FR-COPY.md) | Test |
| G13 | FR-PROF-0010 | (other file — FR-PROF.md) | Test |
| G13 | FR-PROF-0030 | (other file — FR-PROF.md) | Test |
| G14 | FR-VAR-0081 | (other file — FR-VAR.md) | Test |
| G14 | FR-COPY-0011 | (other file — FR-COPY.md) | Test |
| G14 | INT-IDE-0001 | (other file — REFERENCES.md) | Inspection |
| G14 | INT-IDE-0002 | (other file — REFERENCES.md) | Inspection |
| G14 | INT-IDE-0003 | (other file — REFERENCES.md) | Inspection |
| G14 | FR-ARCH-0049 | (other file — FR-ARCH.md) | Test |
| G14 | DATA-CFG-0002 | (other file — MODEL.md) | Inspection |
| G13 | FR-ARCH-0001 | (other file — FR-ARCH.md) | Inspection |
| G13 | FR-ARCH-0057 | (other file — FR-ARCH.md) | Test |
| G13 | FR-ARCH-0058 | (other file — FR-ARCH.md) | Test |
| G13 | FR-VAR-0042 | (other file — FR-VAR.md) | Test |
| G13 | FR-VAR-0050 | (other file — FR-VAR.md) | Test |
| G13 | FR-VAR-0051 | (other file — FR-VAR.md) | Test |

## Coverage

- Every goal G1–G14 traces to at least one unit.
- Every listed unit traces to at least one goal:
  DATA-CFG-0002 (G9,G14) · DATA-CFG-0003 (G6) · DATA-CFG-0005 (G10) ·
  DATA-CFG-0006 (G1,G2,G9) · DATA-CFG-0007 (G6,G9) · FR-ARCH-0001 (G13) ·
  FR-ARCH-0020 (G13) · FR-ARCH-0021 (G13) · FR-ARCH-0023 (G6,G13) ·
  FR-ARCH-0025 (G6,G13) · FR-ARCH-0049 (G14) · FR-ARCH-0057 (G13) ·
  FR-ARCH-0058 (G13) · FR-ARCH-0059 (G1,G2) · FR-ARCH-0060 (G13) ·
  FR-CLI-0001 (G9) · FR-CLI-0030 (G8) · FR-CLI-0031 (G8) ·
  FR-CLI-0032 (G1,G2,G8) · FR-CLI-0033 (G1,G2) · FR-CLI-0034 (G9) ·
  FR-CLI-0040 (G8) · FR-CLI-0041 (G8) · FR-CLI-0042 (G8) ·
  FR-CLI-0060 (G9) · FR-COPY-0011 (G14) · FR-COPY-0020 (G13) ·
  FR-COPY-0021 (G13) · FR-COPY-0022 (G13) · FR-COPY-0080 (G13) ·
  FR-COPY-0081 (G13) · FR-COPY-0082 (G13) · FR-COPY-0083 (G2,G5,G13) ·
  FR-COPY-0084 (G5,G13) · FR-GEN-0001 (G12) · FR-GEN-0002 (G12) ·
  FR-GEN-0003 (G12) · FR-GEN-0004 (G12) · FR-GEN-0010 (G11) ·
  FR-GEN-0011 (G11) · FR-HOOK-0001 (G11) · FR-HOOK-0004 (G12) ·
  FR-HOOK-0007 (G12) · FR-HOOK-0009 (G12) · FR-HOOK-0020 (G11) ·
  FR-HOOK-0022 (G11) · FR-PROF-0001 (G1,G2,G3,G5,G9) · FR-PROF-0010 (G1,G2,G5,G13) ·
  FR-PROF-0011 (G1,G2,G5) · FR-PROF-0020 (G1,G3,G7) · FR-PROF-0021 (G1,G3,G7) ·
  FR-PROF-0030 (G1,G4,G13) · FR-PROF-0040 (G3,G7) · FR-SEED-0001 (G10) ·
  FR-SEED-0002 (G10) · FR-SET-0001 (G6,G9) · FR-SET-0010 (G9,G10) ·
  FR-SET-0020 (G6,G7) · FR-SET-0030 (G7,G8) · FR-SET-0040 (G6) ·
  FR-SET-0050 (G6) · FR-SET-0060 (G8) · FR-SET-0070 (G11) ·
  FR-STRUCT-0010 (G6) · FR-STRUCT-0020 (G6) · FR-STRUCT-0030 (G6) ·
  FR-VAR-0010 (G12) · FR-VAR-0020 (G12) · FR-VAR-0030 (G12) ·
  FR-VAR-0041 (G12) · FR-VAR-0042 (G13) · FR-VAR-0050 (G13) ·
  FR-VAR-0051 (G13) · FR-VAR-0072 (G12) · FR-VAR-0080 (G12) ·
  FR-VAR-0081 (G14) · FR-VAR-0083 (G11) · INT-IDE-0001 (G14) ·
  INT-IDE-0002 (G14) · INT-IDE-0003 (G6,G14) · NFR-0001 (G7).
- No orphan goal, no orphan unit. 14 goals, 81 distinct units, 115 goal-to-unit links.
