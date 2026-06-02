# Existing Test Pattern Discovery — qa-data-collection

Loaded on demand from SKILL.md step 5 ("Discover Existing Test Patterns") when actively scanning a codebase for API test conventions. The base SKILL.md keeps step 5 as a thin orchestration entry (find test files → identify framework + patterns → identify project conventions); this file holds the framework / import / HTTP-client / test-structure / directory-glob enumerations the agent consults when the orchestration runs.

Mirrors the same lazy-loading pattern step 4 ("Analyze Backend Source Code") already uses via `references/backend-source-analysis.md`.

---

## Step 5 sub-step 1 — Search globs for existing test files

Search the codebase for test files using these directory + filename patterns:

### Directory patterns (where tests live)

| Glob | Typical use |
|---|---|
| `tests/` | Generic top-level tests directory |
| `test/` | Single-tests convention (Java/Maven, some Node projects) |
| `__tests__/` | Jest / React convention |
| `spec/` | Ruby / RSpec / BDD convention |
| `tests/api/` | Dedicated API/integration test subdirectory |
| `tests/integration/` | Integration test subdirectory |
| `src/test/java/` | Maven Java convention |
| `src/test/kotlin/` | Maven Kotlin convention |
| `e2e/` or `tests/e2e/` | End-to-end test subdirectory (less relevant for API focus) |

Focus on API / integration test directories; deprioritize unit-test-only directories unless the project has no separate API tests.

### Filename patterns

| Glob | Typical framework |
|---|---|
| `*.test.*` | Jest / Mocha (`*.test.ts`, `*.test.js`) |
| `*.spec.*` | Mocha / Jasmine / Angular (`*.spec.ts`) |
| `*_test.*` | Go / Python convention (`api_test.py`, `*_test.go`) |
| `test_*.*` | Python pytest convention (`test_users.py`) |
| `*Test.java` / `*Tests.java` | JUnit convention |
| `*IT.java` | Integration-test convention (Spring) |

---

## Step 5 sub-step 2 — Framework + import + HTTP client enumeration

### Test framework markers (in import statements / dependency files)

| Framework | Language | Typical import marker | Dependency-file signature |
|---|---|---|---|
| pytest | Python | `import pytest` / `@pytest.fixture` | `pytest` in `requirements.txt` / `pyproject.toml` |
| Jest | TypeScript / JavaScript | `describe(...)`, `test(...)`, `expect(...)` | `jest` in `package.json` |
| Mocha + Chai | TypeScript / JavaScript | `describe(...)`, `it(...)`, `chai.expect` | `mocha`, `chai` in `package.json` |
| JUnit 4 / 5 | Java | `import org.junit.Test` / `import org.junit.jupiter.api.Test` | `junit` / `junit-jupiter-engine` in `pom.xml` / `build.gradle` |
| RestAssured | Java | `import io.restassured.RestAssured` | `rest-assured` dep |
| SuperTest | TypeScript / JavaScript | `import request from 'supertest'` | `supertest` in `package.json` |
| Karate | Java + Gherkin | `*.feature` files + `karate-junit5` runner | `karate-junit5` dep |
| pytest + requests | Python | `import pytest` + `import requests` | both deps |
| xUnit | C# / .NET | `[Fact]` / `[Theory]` attributes | `xunit` NuGet package |
| RSpec | Ruby | `describe ... do` / `it ... do` | `rspec` in Gemfile |

### HTTP client libraries

| Client | Language | Import marker |
|---|---|---|
| `requests` | Python | `import requests` |
| `httpx` | Python | `import httpx` |
| `axios` | TypeScript / JavaScript | `import axios` / `require('axios')` |
| `fetch` (built-in) | TypeScript / JavaScript | `fetch(url, ...)` calls (no import) |
| `node-fetch` | Node.js | `import fetch from 'node-fetch'` |
| `RestAssured` | Java | `given().when().then()` chain |
| `OkHttp` | Java | `import okhttp3.OkHttpClient` |
| `HttpClient` | .NET | `using System.Net.Http; new HttpClient()` |
| `Faraday` | Ruby | `Faraday.new(...)` |
| `net/http` | Go | `import "net/http"` |

### Test structure patterns

| Pattern | Typical framework |
|---|---|
| `describe(...)` / `it(...)` / `beforeEach(...)` | Jest, Mocha, RSpec |
| Class-based with `@pytest.fixture` | pytest |
| Class extends `BaseTest` / annotated `@Test` methods | JUnit, xUnit |
| Function-level `test_*` with module-scoped fixtures | pytest |
| Feature files + step definitions | Cucumber, Karate, behave |

### Assertion patterns

| Pattern | Typical framework |
|---|---|
| `assert <expr>` / `assert <expr>, "message"` | pytest |
| `expect(actual).toBe(expected)` / `.toEqual(...)` / `.toContain(...)` | Jest |
| `chai.expect(actual).to.equal(...)` | Chai |
| `assertEquals(expected, actual)` / `assertThat(...)` | JUnit |
| `.then().statusCode(200).body("field", equalTo(...))` | RestAssured |
| `response.status.toBe(200)` / `response.body.field` | SuperTest |

### Auth setup patterns

| Pattern | Typical placement |
|---|---|
| pytest fixture with `@pytest.fixture(scope="module")` returning a token | pytest API tests |
| Jest `beforeAll(async () => { token = await getToken(); })` | Jest API tests |
| `@BeforeAll` static method acquiring token | JUnit |
| Karate `Background` block | Karate |
| `setup()` method on test class | xUnit / Mocha |

### Base URL configuration

| Pattern | Where it lives |
|---|---|
| Env var read at module scope (`BASE_URL = os.getenv("API_BASE_URL")`) | pytest |
| `process.env.API_BASE_URL` / `dotenv` | Jest, Mocha |
| `application.properties` / `application.yml` | Spring + RestAssured |
| `Gemfile` test group + `ENV['API_BASE_URL']` | RSpec |
| Hardcoded constant in a `config.ts` file | Common anti-pattern; record as a finding |

### Test data management

| Pattern | Where it lives |
|---|---|
| Factories (e.g. `UserFactory`, `OrderFactory`) | `tests/factories/` or `tests/helpers/` |
| Fixtures (e.g. `conftest.py`, fixture files) | pytest convention |
| JSON / YAML seed data | `tests/fixtures/*.json` / `tests/data/` |
| In-test inline data | Common anti-pattern for large data; record as a finding |

---

## Step 5 sub-step 3 — Project convention enumeration

When extracting project-specific conventions, look for:

### Test file naming conventions

| Convention | Example |
|---|---|
| Mirror source module | `src/users.py` → `tests/test_users.py` |
| Feature-grouped | `tests/api/users.test.ts` (one file per feature) |
| Verb-suffixed | `tests/CreateUserTest.java` (one file per scenario) |

### Test directory structure

| Pattern | Convention |
|---|---|
| Mirror-source | `tests/` mirrors `src/` structure |
| Feature-grouped | `tests/api/<feature>/<test files>` |
| Type-grouped | `tests/unit/`, `tests/integration/`, `tests/e2e/` |

### Shared utilities and helpers

| Location | Typical content |
|---|---|
| `tests/helpers/` | Auth helpers, factories, common assertions |
| `tests/utils/` | Pure utility functions |
| `tests/conftest.py` | pytest fixtures shared across tests |
| `tests/setup.ts` / `tests/jest.setup.ts` | Jest global setup |

### Environment configuration

| File | Convention |
|---|---|
| `.env.test` | Test-specific env vars |
| `tests/config.ts` | TypeScript test config |
| `application-test.yml` | Spring test config |

**Safety note for environment configuration capture** — record **path and variable names only, NEVER copy literal values** (per the SKILL's `<safety_boundaries>` — env files routinely embed real tokens, passwords, signing keys, and DB credentials).

### Mock / stub patterns

| Tool | Language | Typical use |
|---|---|---|
| `unittest.mock` | Python | `@patch('module.func')` decorators |
| `pytest-mock` | Python | `mocker.patch(...)` fixture |
| `jest.mock(...)` | TypeScript / JavaScript | Module-level mocking |
| `nock` | Node.js | HTTP request interception |
| `WireMock` | Java | HTTP stubbing server |
| `MockServer` | Java / Node | HTTP test double |

When the project uses none of these and instead has live-call tests, record as a finding — live calls in integration tests are operational fragility and the calling workflow may want to flag this.
