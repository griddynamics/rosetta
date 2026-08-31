<tt_assessment_template>

Shape of `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-ASSESSMENT.md`. Three clearly headed sections, in this order, each restating its rubric once at the top rather than re-deriving it per read. Rubric definitions and level semantics: APPLY SKILL FILE `references/tt-assessment-rubrics.md`. Every section is written even when its answer is thin.

```
# <TICKET-KEY> — Triage Assessment

## Blind Spots
Rubric: Critical = huge gaps/contradictions · High = major gaps that could trouble planning or coding agents · Medium = one or two non-minor gaps an agent with project + codebase access can handle · Low = only minor gaps, or none.

- <specific gap a planning/coding agent could hit>
- ...

**Overall Risk Level: <Critical|High|Medium|Low>** — <one-line justification>

## Potentially Affected Tools
Rubric: Critical = huge impact on an existing integration point, or an unpredictable new one · High = high impact on an existing point, or a new point predictable but with major uncertainties · Medium = some medium effect, or a minor new point; any nonzero risk lands here at minimum · Low = no integration effect detected, reserved strictly for that case.

- <tool> — <one line of reason>
- ...

**Overall Impact Level: <Critical|High|Medium|Low>** — <one-line justification>

## Issue Size
Rubric: one t-shirt size grounded in the requirements' scope — unit count, dependency depth, new integration points.

**Size: <XL|L|M|S>** — <1-2 sentence justification>
```

</tt_assessment_template>
