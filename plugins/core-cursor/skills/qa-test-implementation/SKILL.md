---
name: qa-test-implementation
description: Implement approved API test specifications as executable automated tests following project standards, with shared utilities for auth, data factories, and response validation.
tags: ["qa"]
baseSchema: docs/schemas/skill.md
---

<qa-test-implementation>

<role>Backend API test automation implementation specialist</role>

<when_to_use_skill>
Create automated API test code integrating all approved test specifications, shared utilities, and patterns established in previous analysis phases.
</when_to_use_skill>

<prerequisites>
- Complete and approved test specifications (`test-specs.md`)
- Existing test patterns identified (framework, structure, helpers)
- Project coding standards understood
- User approval from Phase 4 received
</prerequisites>

<process>

## 1. Review Implementation Plan

Consolidate from previous phases:
- Test steps and expected results from `test-specs.md`
- Existing test patterns from `raw-data.md`
- Endpoint details from `api-analysis.md`
- Test file mapping and shared utilities plan

Create outline:
```markdown
### Implementation Plan

**Test Framework**: [pytest / Jest / JUnit / RestAssured / etc.]
**HTTP Client**: [requests / axios / RestAssured / SuperTest / HttpClient / etc.]
**Test Files to Create/Modify**: [List]
**Shared Utilities to Create/Modify**: [List]
**Implementation Order**: [By priority: P0 -> P1 -> P2 -> P3]
```

## 2. Implement Shared Utilities (if needed)

Before writing tests, create shared utilities identified in Phase 4:

### Auth Helper

```python
# Python/pytest example
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

```typescript
// TypeScript/Jest example
export class AuthHelper {
  static async getToken(role = "user"): Promise<string> { /* ... */ }
  static async authHeaders(role = "user"): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await AuthHelper.getToken(role)}` };
  }
}
```

### Test Data Factory

```python
# Python/pytest example
class TestDataFactory:
    @staticmethod
    def create_user(api_client, overrides=None) -> dict:
        data = {"name": "Test User", "email": "test@example.com"}
        if overrides:
            data.update(overrides)
        response = api_client.post("/api/v1/users", json=data)
        return response.json()
```

```typescript
// TypeScript/Jest example
export class TestDataFactory {
  static async createUser(client: AxiosInstance, overrides?: Partial<User>): Promise<User> {
    const data = { name: "Test User", email: "test@example.com", ...overrides };
    const response = await client.post("/api/v1/users", data);
    return response.data;
  }
}
```

Follow existing patterns: if the project already has helper classes/modules, extend those instead of creating new ones.

## 3. Implement Test Files

For each test file from the file mapping in test-specs.md, follow existing project patterns:

```python
# Python/pytest example
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

```typescript
// TypeScript/Jest + axios example
import axios, { AxiosInstance } from "axios";
import { AuthHelper } from "../helpers/auth";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

describe("User Endpoints - /api/v1/users", () => {
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

```java
// Java/JUnit + RestAssured example
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

## 4. Apply Implementation Rules

**Test Isolation**: Each test independent, no shared mutable state, use setup/teardown, no test order dependencies, clean up created data.

**Idempotency**: Tests produce same result on repeated runs, use unique identifiers (timestamps, UUIDs), reset state between tests.

**Assertions**: Assert status code first, then response body structure, then values, then headers, then response time (if required). Use schema validation when available.

**Error Response Testing**: Verify error status codes (400, 401, 403, 404, 409, 422, 500), error response body format, and error messages.

**Auth Testing**: Test with valid auth (expect success), without auth (expect 401), with invalid auth (expect 401), with insufficient permissions (expect 403).

## 5. Implement by Priority

1. **P0 (Critical)**: Happy path CRUD operations
2. **P1 (High)**: Auth scenarios, validation/negative cases
3. **P2 (Medium)**: Edge cases, boundary values
4. **P3 (Low)**: Rare scenarios, optional coverage

## 6. Validate Implementation

Review checklist:
- All imports correct
- Test names descriptive and include ATC reference
- Setup follows project patterns
- All test steps from specs implemented
- All assertions from Phase 4 included
- Auth setup follows project patterns
- Test data creation/cleanup handled
- Uses existing helpers and utilities
- Follows project coding standards
- No hardcoded URLs or credentials (use env vars or config)
- Error handling for setup/teardown failures
- Check for linting errors

</process>

<pitfalls>
- Bypassing existing helpers to write raw HTTP calls when utilities exist
- Missing assertions from the test specification
- Not matching existing test patterns (imports, structure, naming)
- Hardcoding URLs, credentials, or test data that should be configurable
- Skipping test data cleanup — causes cascading failures in test suite
- Not referencing ATC spec IDs in test names/comments — loses traceability
- Adding hardcoded waits/sleeps instead of proper retry strategies
</pitfalls>

</qa-test-implementation>
