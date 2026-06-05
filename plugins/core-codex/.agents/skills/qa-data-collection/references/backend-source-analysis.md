# Backend Source Analysis — Framework Markers and Route Patterns

Detailed framework-detection logic loaded on demand by `qa-data-collection` step 4 (and referenced from the output template's "Backend Source Code Analysis" + "API Endpoints Identified" sections). The base `SKILL.md` keeps step 4 to a thin orchestration entry; this file holds the per-framework enumerations.

The same enumerations are reused by:

- **Step 4 (backend source analysis)** — for identifying the framework + locating route definitions
- **Output template "Backend Framework" and "Route Definition Pattern" fields** — single source of truth for the dropdown values

When the output template asks for a value from these lists, refer back to the tables below rather than re-listing options inline.

---

## Framework Markers

| Framework family | Marker files | Language |
|---|---|---|
| Spring (Boot / MVC) | `pom.xml`, `build.gradle`, `build.gradle.kts`, `application.properties`, `application.yml` | Java / Kotlin |
| Express / Koa / NestJS | `package.json` (with `express`, `koa`, `@nestjs/core` deps) | TypeScript / JavaScript |
| FastAPI | `requirements.txt` / `pyproject.toml` (with `fastapi`) | Python |
| Flask | `requirements.txt` / `pyproject.toml` (with `flask`) | Python |
| Django | `requirements.txt` / `pyproject.toml` (with `django`), `manage.py`, `settings.py` | Python |
| .NET (ASP.NET Core / Web API) | `*.csproj`, `Program.cs`, `Startup.cs` | C# |
| Go (gin / echo / net/http) | `go.mod` (with `gin-gonic/gin`, `labstack/echo`) | Go |
| Ruby on Rails | `Gemfile` (with `rails`), `config/routes.rb` | Ruby |
| Other / Unknown | none of the above detected | record as `Other` and note the detection evidence (or `N/A` if no source path) |

If multiple markers are detected (e.g., a monorepo with both Spring and Express subprojects), record each in a separate "Backend Source Code Analysis" subsection — do not collapse.

---

## Route Definition Patterns

| Framework | Patterns to grep for | Notes |
|---|---|---|
| Express / Koa | `router.get(`, `router.post(`, `router.put(`, `router.patch(`, `router.delete(`, `app.get(`, `app.post(`, `app.put(`, `app.patch(`, `app.delete(` | Routes typically in `routes/`, `src/routes/`, or `src/controllers/` |
| NestJS | `@Get(`, `@Post(`, `@Put(`, `@Patch(`, `@Delete(`, `@Controller(` | Decorators on controller classes |
| Spring | `@GetMapping(`, `@PostMapping(`, `@PutMapping(`, `@PatchMapping(`, `@DeleteMapping(`, `@RequestMapping(` | Methods on `@RestController` / `@Controller` classes |
| FastAPI | `@app.get(`, `@app.post(`, `@app.put(`, `@app.patch(`, `@app.delete(`, `@router.get(`, `@router.post(` | Decorators on path operation functions |
| Flask | `@app.route(`, `@blueprint.route(`, `methods=[`  | Route methods supplied via the `methods` kwarg |
| Django (DRF) | `path(`, `re_path(`, `router.register(`, `@api_view([`, `@action(` | Route registration in `urls.py` + viewsets |
| .NET | `[HttpGet]`, `[HttpPost]`, `[HttpPut]`, `[HttpPatch]`, `[HttpDelete]`, `[Route(`, `MapGet(`, `MapPost(` | Attributes on controller actions; minimal-API `Map*` calls in `Program.cs` |
| Go (gin) | `.GET(`, `.POST(`, `.PUT(`, `.PATCH(`, `.DELETE(`, `.Group(` | Methods on `*gin.Engine` or `*gin.RouterGroup` |
| Go (echo) | `e.GET(`, `e.POST(`, `e.PUT(`, `e.PATCH(`, `e.DELETE(` | Methods on `*echo.Echo` |
| Ruby on Rails | `get '`, `post '`, `put '`, `patch '`, `delete '`, `resources :`, `resource :` | `config/routes.rb` |

---

## Swagger / OpenAPI in Source

For each framework, look for spec files in addition to inline route definitions:

- `swagger.json`, `swagger.yaml`, `openapi.json`, `openapi.yaml`
- Spring: `springdoc-openapi` (`application.properties`'s `springdoc.*` keys), or Swashbuckle for .NET
- FastAPI: auto-generated `/openapi.json` endpoint — note that the spec is code-derived
- NestJS: `@nestjs/swagger` decorators (`@ApiTags`, `@ApiResponse`, `@ApiOperation`)

If the source path contains a Repomix XML file (`RefSrc/{project-name}.xml`), grep within that file for the patterns above rather than walking the source tree.

---

## Key Directory Layout (per framework)

| Framework | Controllers / routes | Models / DTOs | Validators | Middleware |
|---|---|---|---|---|
| Spring | `src/main/java/**/controller/`, `src/main/java/**/web/` | `src/main/java/**/dto/`, `**/model/`, `**/entity/` | Bean Validation annotations on DTOs | `src/main/java/**/filter/`, `**/interceptor/` |
| Express / NestJS | `routes/`, `controllers/`, `src/modules/<feature>/<feature>.controller.ts` | `src/dto/`, `src/models/`, `src/entities/` | `class-validator` decorators, Joi/Zod schemas | `middleware/`, `src/guards/`, `src/interceptors/` |
| FastAPI | `routers/`, `app/api/v1/endpoints/` | `app/schemas/`, `app/models/` | Pydantic models | `app/middleware/`, `app/dependencies/` |
| Django (DRF) | `views.py`, `viewsets.py`, `app/api/` | `serializers.py`, `models.py` | DRF serializers, `clean_*` methods | `middleware.py` |
| .NET | `Controllers/` | `Models/`, `DTOs/` | DataAnnotations attributes, FluentValidation | `Middleware/`, `Filters/` |

If the project doesn't match the expected layout, record the actual layout in the output instead of forcing it into the table's vocabulary.
