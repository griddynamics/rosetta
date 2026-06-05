# Vendor Swap Guide — mcp-testrail-data-collection

Loaded on demand by maintainers forking this skill for a different TMS (Zephyr, Xray, qTest, Polarion, etc.) — **not at runtime**. The base SKILL.md `<vendor_replacement>` block carries only a one-line pointer here; the full rebind list lives in this file so runtime extractions don't pay the maintainer-only cognitive cost.

Mirrors the same pattern the sibling `mcp-jira-data-collection` skill uses (`references/vendor-swap.md`).

---

## Scope

This skill is TestRail-specific. To support a different TMS, fork this SKILL.md and replace **only** the items below — the rest of the structure (`<role>` / `<when_to_use_skill>` / `<prerequisites>` shape / `<output_format>` / `<pitfalls>` discipline / `<safety_boundaries>` redaction policy / `<validation_checklist>` discipline) is vendor-agnostic and should stay.

## TestRail-specific items that must be re-bound per vendor

### 1. MCP tool calls in `<process>`

- `get_case` (step 2) → vendor's equivalent "fetch single test case by ID" operation
- `get_case_fields` (mentioned in pitfalls) → vendor's equivalent "discover custom-field schema" operation

### 2. Identifier format in `<prerequisites>` and `<process>`

TestRail accepts numeric case IDs and `https://*.testrail.io/index.php?/cases/view/N` URL form. Other vendors use different ID schemes — for example:

- **Xray:** `XRAY-NNN` prefixed keys
- **Zephyr:** prefixed keys (varies by Zephyr Squad / Scale / Standalone)
- **qTest:** numeric IDs with project namespace
- **Polarion:** Work Item ID format

### 3. Field semantics in `<process>` step 3

- **"Section path"** is TestRail-specific terminology. Other vendors call this **Folder** / **Suite** / **Component** / **Module** depending on the system. Rename to the target vendor's nomenclature.
- **"Priority / test type" enum values** map to TestRail's `priority_id` / `type_id` numeric tables. Other vendors use string enums or different ID ranges. Verify the mapping against the target vendor's API documentation.

### 4. Output template label in `<output_format>`

- `## TestRail Test Case` heading and `**Case ID**:` field naming. Rename to the target vendor's nomenclature so downstream phases can route by vendor.

## Pattern for swapping

1. Copy this file to `mcp-<vendor>-data-collection/SKILL.md`
2. Edit only the items listed above
3. Keep the rest verbatim

**Do not abstract into a shared parent skill until a third vendor binding is needed** (YAGNI — two bindings are not enough to validate the abstraction boundary).
