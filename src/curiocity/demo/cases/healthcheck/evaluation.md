# Evaluation rubric — health-check endpoint

You are scoring a coding-agent run that was asked to add a `GET /api/health`
endpoint to an existing Spring Boot backend and to document it in `HEALTHCHECK.md`.
Score 0–100 and decide pass/fail. **Pass requires a score of at least 60.**

Judge these three categories from the produced artifacts (the workspace diff and the
attached files):

## 1. Endpoint correctness (most important, ~50 pts)
- A new `HealthController` class exists in package
  `com.bezkoder.spring.datajpa.controller`, annotated as a REST controller.
- It defines a `GET` mapping resolving to the path `/api/health` (typically
  `@RequestMapping("/api")` on the class plus `@GetMapping("/health")`, or an
  equivalent full path).
- The handler returns a body equivalent to the JSON object `{"status":"UP"}`
  (a `Map`, record, DTO, or literal string all count) with an HTTP 200 status.
- The code is syntactically plausible Java that follows the existing
  `TutorialController` style (correct package, imports, annotations). It need not be
  compiled — judge by reading.

## 2. Documentation quality (~30 pts)
- `HEALTHCHECK.md` exists at the repository root.
- It accurately documents the endpoint: the HTTP method (GET), the path
  (`/api/health`), and the exact response body `{"status":"UP"}`.
- It includes a short, correct usage example (e.g. a `curl` command). The doc must
  match what the code actually does — penalize inaccuracies (wrong path, wrong body).

## 3. Scope discipline (~20 pts)
- The change is tightly scoped: essentially only the new controller file and
  `HEALTHCHECK.md` were added.
- No unrelated files were modified or deleted; no builds/tests were run; no
  dependencies added. Penalize scope creep or destructive edits.

Give a brief rationale grounded in the actual artifacts. If the endpoint is missing
or clearly wrong, that is a fail regardless of documentation.
