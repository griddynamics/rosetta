# Implementation Examples + Rules — qa-test-implementation

The base `SKILL.md` keeps decision-time content only — input GATE (step 1), plan outline (step 2), assumptions discipline (step 7), validation checklist. This reference holds:

1. **Canonical code examples** in Python/pytest, TypeScript/Jest, and Java/JUnit+RestAssured (covering SKILL.md steps 3–4: Shared Utilities + Test Files)
2. **Implementation rules** (SKILL.md step 5: Test Isolation / Idempotency / Assertions / Error Response Testing / Auth Testing)
3. **Priority order** (SKILL.md step 6: P0 → P1 → P2 → P3)

Loaded on demand when writing code or applying rules; not needed at the input-validation GATE.

---

## Python / pytest (canonical)

### Auth Helper

```python
class AuthHelper:
    @staticmethod
    def get_token(role="user") -> str:
        """Acquire auth token for test user with given role."""
        pass

    @staticmethod
    def auth_headers(role="user") -> dict:
        """Return headers with valid auth token."""
        return {"Authorization": f"Bearer {AuthHelper.get_token(role)}"}
```

### Test Data Factory

```python
class TestDataFactory:
    @staticmethod
    def create_user(api_client, overrides=None) -> dict:
        data = {"name": "Test User", "email": "test@example.com"}
        if overrides:
            data.update(overrides)
        response = api_client.post("/api/v1/users", json=data)
        return response.json()
```

### Test File — canonical ATC-001 entry

```python
import pytest
import requests
from helpers.auth import AuthHelper
from helpers.factories import TestDataFactory

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
        payload = {"name": "John Doe", "email": "john@example.com"}
        response = self.client.post(self.base_url, json=payload)
        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "John Doe"
        assert body["email"] == "john@example.com"
        assert "id" in body
        assert isinstance(body["id"], int)
```

---

## TypeScript / Jest

### Auth Helper

```typescript
// src/test-helpers/auth.ts
export class AuthHelper {
  static async getToken(role = "user"): Promise<string> {
    /* call the project's auth endpoint and return the token */
  }

  static async authHeaders(role = "user"): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await AuthHelper.getToken(role)}` };
  }
}
```

### Test Data Factory

```typescript
// src/test-helpers/factories.ts
export class TestDataFactory {
  static async createUser(client: AxiosInstance, overrides?: Partial<User>): Promise<User> {
    const data = { name: "Test User", email: "test@example.com", ...overrides };
    const response = await client.post("/api/v1/users", data);
    return response.data;
  }
}
```

### Test File — canonical ATC-001 entry

```typescript
// tests/api/users.test.ts
import axios, { AxiosInstance } from "axios";
import { AuthHelper } from "../../src/test-helpers/auth";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

describe("User Endpoints — /api/v1/users", () => {
  let client: AxiosInstance;

  beforeAll(async () => {
    const headers = await AuthHelper.authHeaders();
    client = axios.create({ baseURL: BASE_URL, headers });
  });

  test("ATC-001: Create user with valid data returns 201", async () => {
    const payload = { name: "John Doe", email: "john@example.com" };
    const response = await client.post("/api/v1/users", payload);
    expect(response.status).toBe(201);
    expect(response.data.name).toBe("John Doe");
    expect(response.data.id).toBeDefined();
  });
});
```

---

## Java / JUnit 5 + RestAssured

### Auth Helper

```java
public final class AuthHelper {
  public static String getToken(String role) { /* call auth endpoint */ }
  public static String getToken() { return getToken("user"); }
}
```

### Test File — canonical ATC-001 entry

```java
import io.restassured.RestAssured;
import org.junit.jupiter.api.*;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

class UserEndpointsTest {
  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getenv().getOrDefault("API_BASE_URL", "http://localhost:8080");
  }

  @Test
  @DisplayName("ATC-001: Create user with valid data returns 201")
  void createUserWithValidData() {
    String payload = """
        {"name": "John Doe", "email": "john@example.com"}
        """;
    given()
        .header("Authorization", "Bearer " + AuthHelper.getToken())
        .contentType("application/json")
        .body(payload)
    .when()
        .post("/api/v1/users")
    .then()
        .statusCode(201)
        .body("name", equalTo("John Doe"))
        .body("id", notNullValue());
  }
}
```

---

## Other languages

The same pattern (Auth Helper → Test Data Factory → ATC test) transfers to C# (xUnit + RestSharp/HttpClient), Go (testing + net/http), Ruby (RSpec + Faraday), etc. Use the Python example above as the shape reference and adapt to the target framework's idioms — naming, fixture/setup mechanism, assertion library — per the project's existing test patterns (raw-data artifact captures these).

---

## Implementation rules (SKILL.md step 5)

Apply these to every test file authored at SKILL.md step 4. Language-agnostic.

- **Test Isolation:** each test independent, no shared mutable state, use setup/teardown, no test-order dependencies, clean up created data.
- **Idempotency:** tests produce the same result on repeated runs. Use unique identifiers (timestamps, UUIDs); reset state between tests.
- **Assertion order:** status code first, then response body structure, then values, then headers, then response time (if required). Use schema validation when available.
- **Error response testing:** verify error status codes (400, 401, 403, 404, 409, 422, 500), error response body format, and error messages.
- **Auth testing:** test with valid auth (expect success), without auth (expect 401), with invalid auth (expect 401), with insufficient permissions (expect 403). Mirrors `<validation_checklist>` "Auth coverage matches spec" item — the spec's auth-failure ATCs (401 no-token, 401 bad-token, 403 insufficient-perm when applicable) are the canonical source; this rule restates them as a per-test discipline.

---

## Priority order (SKILL.md step 6)

Implement test cases in the order the approved specs prioritize:

1. **P0 (Critical)** — happy-path CRUD operations.
2. **P1 (High)** — auth scenarios, validation / negative cases.
3. **P2 (Medium)** — edge cases, boundary values.
4. **P3 (Low)** — rare scenarios, optional coverage.

A spec's priority field overrides this default when present.
