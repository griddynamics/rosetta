# Multi-Language Examples — qa-test-implementation

The base `SKILL.md` keeps **one canonical example in Python/pytest** to minimize default context cost. This reference holds the equivalent examples in **TypeScript/Jest** and **Java/JUnit + RestAssured**. Load on demand when the project's framework is non-Python.

The structure mirrors `SKILL.md` steps 3 (Shared Utilities) and 4 (Test Files): an Auth Helper, a Test Data Factory, and an ATC-001 test case. The Python originals stay in `SKILL.md`; this file is the cross-language overlay only.

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

The same pattern (Auth Helper → Test Data Factory → ATC test) transfers to C# (xUnit + RestSharp/HttpClient), Go (testing + net/http), Ruby (RSpec + Faraday), etc. Use the canonical Python example in `SKILL.md` as the shape reference and adapt to the target framework's idioms — naming, fixture/setup mechanism, assertion library — per the project's existing test patterns (raw-data artifact captures these).
