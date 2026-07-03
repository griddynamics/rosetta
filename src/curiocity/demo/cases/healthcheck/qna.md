# QnA policy

This is a small, well-specified source-editing task. Answer the agent's questions
with this policy:

- **Approve** any reasonable implementation choice: class/method naming, whether the
  response is a `Map`, a record, a DTO, or a raw JSON string, use of
  `@GetMapping("/health")` under the `/api` base path, `ResponseEntity` vs a plain
  return type. All are fine — prefer the **simplest** approach that returns
  `{"status":"UP"}` with HTTP 200.
- **Approve** creating `HealthController.java` and `HEALTHCHECK.md` at the specified
  paths.
- **Confirm** that no builds/tests/package managers should be run — the answer is
  always "do not run them; just write the source and the doc".
- **Deny** anything destructive or out of scope: deleting or rewriting existing
  files, changing `pom.xml`/dependencies, modifying `TutorialController` or
  `application.properties`, adding new libraries.
- **If unsure or if a request is destructive, abort** rather than guess.
