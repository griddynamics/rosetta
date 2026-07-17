# Conversation

**IN (task):**

> Add a health-check API endpoint to the Spring Boot backend: `GET /api/health` returning JSON `{"status":"UP"}` with HTTP 200.


**OUT (agent):**

Now I'll create the health check controller following the same style.

**OUT (agent):**

Added `HealthController` with `GET /api/health` returning `{"status":"UP"}` at HTTP 200, matching the existing controller conventions (CORS, `@RequestMapping("/api")`).
