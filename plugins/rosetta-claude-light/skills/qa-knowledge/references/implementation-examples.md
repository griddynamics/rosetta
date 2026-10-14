# QA test-implementation examples & templates (`<implementation_modes>`)

Verbose per-language test code, the 4-tier selector table, and output templates for UI / API / selector implementation - shape references only.

---

## API impl mode -- shared utilities + test files (Python / TypeScript / Java)

### Auth helper (Python / pytest)

```python
class AuthHelper:
    @staticmethod
    def get_token(role="user") -> str:
        """Acquire auth token for test user with given role."""
        ...

    @staticmethod
    def auth_headers(role="user") -> dict:
        return {"Authorization": f"Bearer {AuthHelper.get_token(role)}"}
```

### Test data factory (Python / pytest)

```python
class TestDataFactory:
    @staticmethod
    def create_user(api_client, overrides=None) -> dict:
        data = {"name": "Test User", "email": "test@example.com"}
        if overrides:
            data.update(overrides)
        return api_client.post("/api/v1/users", json=data).json()
```

### Test file -- canonical ATC-001 entry (Python / pytest)

```python
import os, pytest, requests
from helpers.auth import AuthHelper

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8080")

class TestUserEndpoints:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = requests.Session()
        self.client.headers.update(AuthHelper.auth_headers())
        self.base_url = f"{BASE_URL}/api/v1/users"
        yield

    def test_atc_001_create_user_with_valid_data(self):
        """ATC-001: Create user with all required fields returns 201."""
        response = self.client.post(self.base_url, json={"name": "John Doe", "email": "john@example.com"})
        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "John Doe"
        assert "id" in body and isinstance(body["id"], int)
```

### TypeScript / Jest -- auth helper + ATC test

```typescript
// src/test-helpers/auth.ts
export class AuthHelper {
  static async getToken(role = "user"): Promise<string> { /* call auth endpoint */ }
  static async authHeaders(role = "user"): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await AuthHelper.getToken(role)}` };
  }
}
```

```typescript
// tests/api/users.test.ts
import axios, { AxiosInstance } from "axios";
import { AuthHelper } from "../../src/test-helpers/auth";
const BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

describe("User Endpoints — /api/v1/users", () => {
  let client: AxiosInstance;
  beforeAll(async () => { client = axios.create({ baseURL: BASE_URL, headers: await AuthHelper.authHeaders() }); });

  test("ATC-001: Create user with valid data returns 201", async () => {
    const response = await client.post("/api/v1/users", { name: "John Doe", email: "john@example.com" });
    expect(response.status).toBe(201);
    expect(response.data.name).toBe("John Doe");
    expect(response.data.id).toBeDefined();
  });
});
```

### Java / JUnit 5 + RestAssured -- ATC test

```java
import io.restassured.RestAssured;
import org.junit.jupiter.api.*;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

class UserEndpointsTest {
  @BeforeAll static void setup() {
    RestAssured.baseURI = System.getenv().getOrDefault("API_BASE_URL", "http://localhost:8080");
  }
  @Test @DisplayName("ATC-001: Create user with valid data returns 201")
  void createUserWithValidData() {
    given().header("Authorization", "Bearer " + AuthHelper.getToken())
        .contentType("application/json").body("{\"name\":\"John Doe\",\"email\":\"john@example.com\"}")
    .when().post("/api/v1/users")
    .then().statusCode(201).body("name", equalTo("John Doe")).body("id", notNullValue());
  }
}
```

**Other languages** (C# / Go / Ruby): same shape -- Auth helper → Test data factory → ATC test. Adapt fixture, assertion library, and naming to the project's patterns.

### API impl rules (language-agnostic)

- **Isolation:** each test independent; no shared mutable state; no test-order dependence; clean up created data.
- **Idempotency:** same result on repeated runs; use unique identifiers (timestamps, UUIDs).
- **Assertion order:** status code → body structure → values → headers → response time. Use schema validation when available.
- **Error responses:** verify error status codes (400/401/403/404/409/422/500), body format, and messages.
- **Auth coverage:** valid auth (success), no auth (401), invalid auth (401), insufficient permission (403).
- **No hardcoded sleeps:** use the framework's wait/retry primitives tied to an observable condition.
- **Priority order:** P0 happy-path CRUD → P1 auth/negative → P2 edge/boundary → P3 rare. A spec's priority field overrides this.
- **Traceability:** every test function name or docstring carries its ATC-NNN id. Losing ATC↔test traceability is a regression.

---

## UI impl mode -- test authoring shape (page objects + assertions)

UI test code matches the project's patterns exactly: import order (framework → pages → utilities → types), describe/suite organization, hooks (`beforeEach`/`afterEach`), shared fixtures.

- **Setup** -- initialize page objects, reuse login/navigation helpers, navigate to start point.
- **Actions** -- use page-object methods (never raw selectors in test code); proper waits (visibility, network idle); no hardcoded sleeps.
- **Assertions** -- project assertion style (expect / custom matchers); specific and measurable; assertion messages if the project uses them.
- **Cleanup** -- only if the test creates/modifies state; `try/finally` or `afterEach`, matching similar tests.
- **Docs** -- case reference (e.g. TestRail) as a comment; inline comments only for non-obvious logic.

**Implemented vs uncovered worked example:**

- Implemented: plan assertion `"After submit: error banner shows 'Invalid email'"` → page object exposes `LoginPage.errorBanner.textContent()` → `expect(await loginPage.errorBanner.textContent()).toBe('Invalid email')`.
- Uncovered (record, never silently drop): plan assertion `"Audit log records the failed login attempt"` → no UI surface, no helper to query the backend log → record as `Audit log records the failed login attempt — reason: no UI signal; needs backend log query or separate audit-log test`.

---

## Selector mode -- strategy and page-object mechanics

### Part A (identify) -- 4-tier selector strategy (preference order)

| Tier | Strategy | Example (good) | Example (flag/avoid) |
|---|---|---|---|
| 1. Preferred | `data-testid` / `data-test` | `[data-testid="checkout-submit"]` | — |
| 2. Good | unique non-dynamic `id` | `#search-input` | `#user-42-row-7-cell` (per-record dynamic id) |
| 3. Acceptable | stable class / ARIA | `.checkout-summary__total`, `[aria-label="Close dialog"]` | `.btn.btn-primary` (non-unique utility class) |
| 4. Last resort | structural CSS / XPath | `nav > ul > li:nth-child(3) > a` (target has no stable hook AND DOM is stable) | `/html/body/div[3]/div[2]/section/div/button` (deep absolute XPath) |

**Good vs fragile pair:**

- Good: `[data-testid="logout-button"]` -- stable hook added by frontend; survives copy changes, restyling, DOM reorder.
- Fragile (must flag): `body > div.app-shell > header > nav > div:nth-child(2) > button.MuiButton-root` -- depends on framework-generated classes AND exact nesting. Flag as `fragile: structural + MUI-generated class — request data-testid from frontend team`.

**Flag any selector matching:** dynamic ids (`user-42-row-7`), non-unique classes (`.btn-primary` matching many elements), deep structural paths (>3 levels of `>` / `nth-child`), framework-generated class names (`MuiButton-root`, `css-1a2b3c4`).

### Part B (implement) -- selectors in page objects

- **Extend existing:** read the file, match its exact patterns (access modifiers, data types, formatting, naming case). Add selectors in logical grouping; add helper methods (text getters, click/action, visibility checks) if the page object uses them.
- **Create new:** use an existing page object as the structural template; copy constructor/import/class patterns exactly; follow project naming; add to barrel/index exports if used.
- **Fragile-selector gate (Part B safety rule):** any selector Part A flagged as fragile MUST either be replaced with a stable alternative agreed with the user, OR surfaced for explicit approval before commit -- never silently implemented.

### `## Selector Management` output template (written into the phase artifact)

```markdown
## Selector Management

### Interaction Map
[Step → required interactions]

### Selector Availability
✅ [PageObject.selector] — EXISTS
❌ [PageObject.selector] — MISSING
❌ [PageObject.selector] — UNRESOLVABLE: <reason>

### Identified Selectors
**[PageName] - [ElementName]**
- Selector: [value]
- Type: data-testid / id / class / ARIA / XPath
- Source: Frontend code @ <file:line> | Page source @ <file>
- Usage: Click / Verify / Type
- Stability: stable | **fragile: <reason>**

### Fragile Selectors Flagged (require approval before Part B implements)
- [PageName.selector] — <reason> — recommendation: <e.g. request data-testid from frontend team>

### Implementation (Part B only)
- Page Objects Modified: [list with paths]
- Page Objects Created: [list with paths]
- Selectors Added: [count]
- Methods Added: [count]
- Fragile selectors implemented after explicit approval: [list with approval evidence, or `None`]
```
