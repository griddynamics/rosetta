# Vendor Porting Guide — testrail-test-case-export

Loaded on demand **only when forking this skill for a non-TestRail TMS** (Zephyr, Xray, qTest, Polarion, etc.). Not needed during runtime TestRail export — the base `SKILL.md` carries the always-loaded operational instructions; this file is the maintainer-facing portability guide consumed by a prompt-maintainer task, not by the export-runtime agent.

The runtime skill is TestRail-specific. To support a different TMS, fork the SKILL.md and replace only the items enumerated below — the rest of the structure (role / when_to_use_skill / process shape / preconditions_format / user_prompt template skeleton / validation_checklist discipline / pitfalls posture) is vendor-agnostic and should stay.

---

## TestRail-specific items that must be re-bound per vendor

### MCP tool calls in `<process>`

- `mcp_testrail_get_project` (step 1) → vendor's equivalent "verify project / authenticate / probe access" call
- `mcp_testrail_add_case` (step 7) → vendor's equivalent "create test case" call
- `mcp_testrail_get_cases` (step 7) → vendor's equivalent "list existing cases" call (if needed for dedup)

### Container concept in `<process>` step 2 and `<user_prompt_section_id>`

"section_id" is TestRail-specific. Equivalents:

| Vendor | Container concept | Auto-creatable? |
|---|---|---|
| Xray | "test folder" | varies |
| Zephyr | "folder ID" | varies |
| qTest | "module ID" | varies |
| Polarion | "category" | varies |
| TestRail | "section_id" | **No — manual UI creation required** |

Whether the container is auto-creatable differs per vendor; rebind the step-2 "ask user for section_id" flow accordingly (if the vendor allows API creation, the step can offer to create the container rather than asking the user).

### Priority ID mapping in `<process>` step 3

TestRail uses numeric `priority_id` 1–4 (Low → Critical). Each vendor has its own scheme:

- Numeric vs string enum
- Different value count (3-tier, 4-tier, 5-tier)
- Different default ordering (ascending vs descending)

Rebind the priority mapping table to the target vendor's actual enum.

### Type ID mapping in `<process>` step 4

TestRail uses numeric `type_id` 1, 6–10. Vendors differ in both numbering and the set of available types:

- Xray distinguishes "Manual" / "Cucumber" / "Generic" rather than the functional vs negative vs edge axis TestRail uses
- Zephyr uses scenario-style categorization
- qTest exposes user-configurable types

Rebind the type mapping table to the target vendor's actual type taxonomy.

### Field names in `<process>` steps 5–6

- `custom_steps_separated` (steps + expected results) — TestRail field name
- `custom_preconds` (preconditions block) — TestRail field name

Vendors use different field IDs; some may not split steps/expected at all (storing the test as a single body). Rebind the step/expected/preconditions writers to the target vendor's field schema.

### Case ID format in `<process>` step 8 and `<validation_checklist>`

`C12345` C-prefix is TestRail-specific. Vendor formats:

| Vendor | Case ID shape |
|---|---|
| TestRail | `C12345` (C-prefix + numeric) |
| Xray | `XRAY-NNN` |
| Zephyr | project-prefixed keys |
| qTest | `TC-NNN` |
| Polarion | project-prefixed alphanumeric |

Rebind the ID-format check in step 8 and the validation_checklist line that verifies the post-export ID shape.

### User prompt template in `<user_prompt_section_id>`

Branded with "TestRail Section Setup" + TestRail URL/UI references. Rewrite for the target vendor's nomenclature and UI:

- Vendor name in the heading ("Xray Test Folder Setup", "Zephyr Folder Setup", etc.)
- URL paths to the vendor's UI for manual container creation
- Container terminology in the prompt body

### Pitfalls that name TestRail behaviors specifically

The pitfalls block enumerates TestRail-specific gotchas:

- Section creation limit (TestRail requires UI creation)
- Duplicate-on-rerun semantics
- 429 rate-limit specifics
- `custom_steps_separated` field quirks

Rebind these pitfalls to the target vendor's actual gotchas. Keep the structural posture (one pitfall per real failure mode); replace the TestRail-specific content.

---

## Pattern for swapping

Copy this file to `<vendor>-test-case-export/SKILL.md`, edit only the items above, keep the rest verbatim.

Do not abstract into a shared parent skill until a third vendor binding is needed (YAGNI; two bindings are not enough to validate the abstraction boundary).

---

## Workflow-side coupling note

The calling workflow currently ACQUIREs `testrail-test-case-export` by name. When a second-vendor binding is added, either:

**(a) Rename the workflow's ACQUIRE to a parameter resolved from project config** — e.g., a `<tms_export_skill>` placeholder bound to `qa-project-config.md`'s TMS field. This is the cleaner architecture but requires the workflow to support the parameter substitution.

**(b) Keep per-vendor workflow forks** — the calling workflow has a `<vendor>-flow.md` that hardcodes the corresponding `<vendor>-test-case-export` ACQUIRE.

Option (a) is preferred but should not be implemented until at least one second-vendor binding actually exists (YAGNI — designing a parameter-resolution mechanism for one vendor is over-engineering).
