# API-AQA config interview

Verbatim user-prompt interview asked when the project config does not yet exist.

<api-aqa-config-interview>

Adapt and ask (via the structured-questioning step) only when the project config does not exist, and only for keys still unresolved after the `gain.json` `sdlc.*` + user-evidence prefill — drop questions the prefill already answered, but confirm inferred providers in one line. Confirm the answers + prefill cover at minimum: Wiki/document storage (or docs are in-repo), Swagger/OpenAPI availability, and where test cases come from (TMS). If a required field is missing, ask ONE follow-up naming the missing fields (cap: 2 rounds). Covers every **required** key in the config schema -- to verify coverage if unsure, READ SKILL FILE `references/config-schema.md`. Named vendors below are canonical examples; accept any equivalent system for the role.

```
To automate backend API tests effectively, I need the following project details:

1. **Wiki / Document Storage**: Where is your project documentation?
   - A Wiki such as Confluence (provide space key or page URLs)
   - Google Drive (provide links)
   - Local docs in repository (provide paths)
   - Other (please specify)

2. **API Specification**: Do you have a Swagger/OpenAPI spec?
   - If yes, provide the URL (e.g., https://api.example.com/swagger.json)
   - If yes, also specify the **format**: OpenAPI 3.x, Swagger 2.0, or Other
   - If no, I will work from documentation and code analysis

3. **Test Case Management (TMS)**: Where are your test cases stored?
   - TestRail (provide project/suite IDs)
   - Jira (test cases as tickets or in description)
   - Confluence (test case pages)
   - Provided directly in this conversation
   - Other TMS (please specify)

4. **Test Framework** (optional — I can discover from codebase):
   - What test framework does the project use? (e.g., pytest, Jest, JUnit, RestAssured, SuperTest)
   - Where are existing API tests located? (e.g., tests/api/, src/test/)

5. **Authentication** (optional — I can discover from Swagger/code):
   - What auth mechanism does the API use? (OAuth2, JWT, API Key, Basic, None)
   - How should tests authenticate? (test credentials, mock auth, service account)
   - ⚠️ Do NOT paste literal credential values (tokens, passwords, API keys) — describe the **mechanism + source** only (e.g. "Bearer JWT from AuthHelper; credentials in env var `AUTH_TOKEN`").

6. **Backend Source Code** (optional — helps me analyze API routes and validation; I can also discover from ARCHITECTURE.md RefSrc references):
   - In RefSrc/ folder (provide project name, e.g., RefSrc/my-backend/)
   - In the current workspace (provide path, e.g., src/, backend/)
   - Not available (I will work from Swagger/docs only)

Please answer what you know — I can discover the rest from code and docs.
```

**After the interview (agent-facing):**
- **Output:** READ SKILL FILE `assets/api-aqa-project-config-template.md`, populate it with the answers (apply its redaction note), then write to `plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md`.

</api-aqa-config-interview>
