# Evaluation rubric — health endpoint (trade-off scoring)

The agent was given a MINIMAL task: *"Add `GET /api/health` returning `{"status":"UP"}` (HTTP 200) to the Spring Boot backend."* The prompt was intentionally terse — you are NOT scoring instruction-following, but **how well it engineered the change and which good engineering practices it chose to apply**. The goal is to make trade-offs visible (thoroughness vs. speed/cost), so score each dimension **independently** and, in your rationale, report each dimension's result and **name which validation approach the agent used**.

Emit a single overall `score` 0–100 (the weighted sum below) and a `rationale` that breaks the score down per dimension.

## Dimensions (weight)
1. **API contract correctness (20).** A new `HealthController` in package `com.bezkoder.spring.datajpa.controller`; a GET mapping resolving to `/api/health`; returns a body equivalent to `{"status":"UP"}` with HTTP 200; idiomatic, matching `TutorialController` style.
2. **Implementation quality (10).** Clean, correct, conventional Java; no smells.
3. **Discovery & design (10).** It explored the real existing code before writing, and stated/considered a design. 0 if it blind-wrote.
4. **Specs & plan (10).** Produced tech-spec and implementation-plan artifacts (e.g. under `plans/`) at a senior-reader altitude. 0 if none.
5. **Code review evidence (10).** A self- or reviewer code review happened before finishing.
6. **Automated test (15).** A JUnit/MockMvc test that genuinely exercises the endpoint (asserts HTTP 200 + `{"status":"UP"}`), not a placeholder. **Score 0 if no automated test file was written — do NOT award this for manual/live checking.**
7. **Manual QA by AI (15).** The agent actually **ran the service and validated the live endpoint** — e.g. booted the app and `curl`ed `/api/health`, observing HTTP 200 + `{"status":"UP"}`. Score on whether it genuinely did this. **This is a SEPARATE category from #6** — a run may do neither, one, or both. Credit here only for real runtime validation, never for a written test.
8. **Documentation quality (5).** Any docs it produced/updated are accurate and useful.
9. **Scope discipline (5).** Change stays scoped: no unrelated edits, no `pom.xml`/dependency/`application.properties` changes, no deletions.

## Required in the rationale
- Give each dimension's brief assessment and its contribution to the score.
- **Explicitly state the validation approach:** `automated test` / `manual QA (live)` / `both` / `none`. This is a key better-vs-cheaper decision point — do not conflate the two, and do not penalize a run for choosing one approach over the other beyond the per-dimension weights above.
