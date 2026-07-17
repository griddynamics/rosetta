Add a health-check API endpoint to the Spring Boot backend: `GET /api/health` returning JSON `{"status":"UP"}` with HTTP 200.

Work thoroughly:
- **Discover** the existing backend structure and conventions before writing any code.
- **Build** the module after implementing the change.
- **Run the service and validate the live endpoint** — actually start the app and confirm `GET /api/health` returns HTTP 200 with `{"status":"UP"}`.
- Keep the change tightly scoped to the endpoint.
