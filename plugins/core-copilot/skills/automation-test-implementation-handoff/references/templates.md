# Output Templates — automation-test-implementation-handoff

Loaded on demand from SKILL.md `<output_format>` when actively emitting the two deliverables. The base SKILL.md keeps the GATEs + contract tables + process flow inline (decision-time content the agent needs every call); this file holds the verbatim markdown templates + per-stack command examples that only fire at write time.

---

## User-facing handoff message (referenced from SKILL.md step 5)

Emit this as the user-facing message when implementation completes and you're handing off to manual test execution:

```markdown
Implementation complete for <phase or feature name>.

**Files created/changed:**
- <path/to/test/file>
- <path/to/helper/file>

**To run the tests:**

```
<exact copy-pasteable command — examples by stack below>
```

If the run is flaky on this infra: <one-line note, or "no known flakiness">.

When the run completes, paste the result (report path or pass/fail summary) so the next phase can begin.
```

### Per-stack command examples

Use the literal stack-appropriate command — **never** the generic framework name alone:

| Stack | Example command |
|---|---|
| Playwright TS | `npx playwright test tests/checkout/payment.spec.ts` |
| pytest | `uv run pytest tests/api/users_test.py -v` |
| Jest | `npm test -- tests/api/users.test.ts` |
| Java / JUnit + Maven | `mvn -Dtest=UserEndpointsTest test` |
| Karate | `mvn test -Dkarate.options="--tags @smoke"` |

**Do NOT emit a generic framework name only** (e.g. just "run Playwright" or "use pytest"). The command MUST be the literal string the user can copy.

---

## State-update template (referenced from SKILL.md step 8)

Write this block to the workflow state file at the path the parent workflow supplied:

```markdown
## <phase name> (Implementation)
- **Status:** Ready for execution
- **Timestamp:** <YYYY-MM-DD HH:MM>
- **Files created:** <count>
- **Files modified:** <count>
- **Paths:**
  - <path/to/test/file>
  - <path/to/helper/file>
- **Utilities added:** <list, or `None`>
- **Domain authoring skill applied:** <skill name>
- **Execution command provided to user:** `<the literal command from the handoff message>`
- **Parent workflow status:** in progress (do NOT mark COMPLETE here — only this phase)
```

The parent workflow may override this state-update template; this is the default.
