Add a health-check API endpoint to the existing Spring Boot backend.

Requirements:
1. Add a `GET /api/health` endpoint that returns the JSON body `{"status":"UP"}` with HTTP 200. Create a new controller class `HealthController` at `spring-boot-server/src/main/java/com/bezkoder/spring/datajpa/controller/HealthController.java`, following the style of the existing `TutorialController` (same package, `@RestController`, `@RequestMapping("/api")`).
2. Create a file `HEALTHCHECK.md` at the repository root documenting the new endpoint: its HTTP method and path, the exact response body, and a short usage example (e.g. a `curl` command).

Constraints:
- Do NOT run any builds, tests, or package managers (no `mvn`, `npm`, etc.) — none are available in this workspace.
- Do NOT modify unrelated files. Keep the change tightly scoped to the two files above.
- Do NOT ask clarifying questions unless you are truly blocked; make reasonable, idiomatic choices and proceed.
- When both files are written, you are done.
