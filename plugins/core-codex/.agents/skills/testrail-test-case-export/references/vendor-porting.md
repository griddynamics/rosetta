# Vendor Porting Guide — testrail-test-case-export

Loaded on demand **only when forking this skill for a non-TestRail TMS** (Zephyr, Xray, qTest, Polarion, etc.). Not needed during runtime TestRail export — the base `SKILL.md` carries the always-loaded operational instructions; this file is the maintainer-facing portability guide consumed by a prompt-maintainer task, not by the export-runtime agent.

The runtime skill is TestRail-specific. To support a different TMS, fork the SKILL.md and replace only the items enumerated below — the rest of the structure (role / when_to_use_skill / process shape / preconditions_format / user_prompt template skeleton / validation_checklist discipline / pitfalls posture) is vendor-agnostic and should stay.

---

## Before you start (required inputs for the fork)

Gather these vendor facts **before** opening the source SKILL.md — every rebind step below depends on them. Forking with any of these unknown produces a partially-bound skill.

| Required input | What you need to know | Where to find it |
|---|---|---|
| **Source SKILL.md** | The sibling `testrail-test-case-export/SKILL.md` — open this as the fork starting point | This repo |
| **Vendor MCP tool names** | The actual `mcp_<vendor>_*` function names for: project verify, list cases, add case, (optional) container create | Vendor's MCP server docs / `mcp.json` introspection |
| **Vendor priority enum** | Numeric vs string, value count (3 / 4 / 5-tier), default ordering | Vendor admin → Priorities page; or API enum |
| **Vendor type taxonomy** | The set of available test types (Functional / Manual / Cucumber / etc.) and their IDs / labels | Vendor admin → Test Types; or API enum |
| **Container auto-create capability** | Whether the vendor's API lets you create the section/folder/module via API, or requires UI creation | Vendor API docs — look for a "create section" / "create folder" endpoint |
| **Case ID shape** | The exact format the vendor returns post-export (`C12345` / `XRAY-NNN` / `TC-NNN` / etc.) | Sample export response or a sample case URL |

If any vendor fact is undetermined when forking begins, **pause and gather it before editing** — guessing produces silent mis-mappings the runtime catches only after the destructive write.

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

## Capability-gap fallback rule (when the target vendor lacks a TestRail concept)

Not every vendor exposes every TestRail capability. When the target lacks an equivalent for one of the rebind items above, **document the gap explicitly in the forked SKILL.md and degrade safely** — do NOT silently drop the safety step.

| Missing capability | Degrade-safely rule | What MUST stay |
|---|---|---|
| **No "list cases" call for dedup** | Skip the dedup pre-scan but **keep the confirmation gate** — print the planned-count + an explicit "vendor does not expose dedup; manual check required" warning. The user still chooses `a` / `b` / `c`. | Confirmation gate; record the dedup-skip in the workflow state |
| **No step / expected split** (vendor stores test as a single body) | Concatenate Steps + Expected Results into one body field using a clear `--- EXPECTED ---` separator. Note in the forked SKILL.md's `<process>` step 5 that the split is conceptual. | Steps + Expected Results as logical content; just collapsed into one storage field |
| **No container auto-create AND no UI shortcut** | Ask the user for the container ID in `<process>` step 2 — same as TestRail's manual UI flow. Note the vendor limitation in the user prompt. | The step-2 user prompt with the vendor-specific manual-creation instructions |
| **No priority enum** (vendor has flat priority list) | Map all P0–P3 to the vendor's single priority field; document in the forked priority-mapping table that the vendor lacks per-case priority gradation. | The priority field still populated, even if degenerate |
| **No type taxonomy** (vendor has flat case list) | Drop the type mapping; document the omission in the forked SKILL.md `<process>` step 4 comment. Don't introduce a synthetic type. | The case still creates; just without type metadata |

**General rule:** removing a destructive-write safeguard (dedup pre-scan, confirmation gate, redaction) is **forbidden** even when the vendor lacks the underlying capability. Degrade the *content* (skip dedup detection); never degrade the *gate* (always confirm before write).

---

## Concrete rebind example (before / after for one item)

Worked example for the priority mapping — Xray binding. Use as a template for the structural shape every rebind takes:

**Before — TestRail SKILL.md `<process>` step 3:**

```python
priority_map = {
    "P0": 4,  # Critical
    "P1": 3,  # High
    "P2": 2,  # Medium
    "P3": 1,  # Low
}
```

**After — Xray SKILL.md `<process>` step 3 (rebound):**

```python
# Xray uses string-enum priorities (no numeric ID); priorities live on the Jira issue
priority_map = {
    "P0": "Critical",
    "P1": "High",
    "P2": "Medium",
    "P3": "Low",
}
# Note: Xray priorities are inherited from the linked Jira issue; if no Jira link, priority is N/A.
```

The shape stays the same (dict mapping P-tier to vendor-specific value); the keys (P0–P3) stay verbatim; only the **values** rebind to the vendor's actual enum. Inline comment captures the vendor-specific semantic.

Apply the same shape-preserving rebind to every other item in the list above — keep the structure, replace the TestRail-specific values.

---

## Pattern for swapping

Copy this file to `<vendor>-test-case-export/SKILL.md`, edit only the items above, keep the rest verbatim.

Do not abstract into a shared parent skill until a third vendor binding is needed (YAGNI; two bindings are not enough to validate the abstraction boundary).

---

## Self-validation grep (after the fork)

Before declaring the fork complete, run the following grep against the new `<vendor>-test-case-export/SKILL.md` to catch residual TestRail tokens that the rebind missed:

```bash
grep -nE 'mcp_testrail_|section_id|custom_steps_separated|custom_preconds|\bC[0-9]{4,}\b|TestRail' \
  <vendor>-test-case-export/SKILL.md \
  <vendor>-test-case-export/references/*.md 2>/dev/null
```

**Expected result:** zero matches. A non-zero match means a rebind step was skipped — either a TestRail tool name, the `section_id` placeholder, a TestRail-specific field name, a `C12345`-shape case ID, or a literal "TestRail" mention survived into the forked file. Fix each match before declaring the fork complete.

If a match is intentional (e.g., a comment explaining the rebind history), tag it with `# <vendor>-port: intentional retention — <reason>` so a future audit grep can distinguish accidents from history.

---

## Fork is complete when (testable conditions)

A forked `<vendor>-test-case-export` is complete only when **all of** the following hold:

- [ ] **Zero residual `mcp_testrail_*` references** in the forked SKILL.md or any of its references (verify with the self-validation grep above).
- [ ] **Zero residual `section_id` placeholder** — replaced everywhere by the vendor's container term (folder ID / module ID / category / etc.).
- [ ] **Zero residual `custom_steps_separated` / `custom_preconds`** — replaced by the vendor's field names OR explicitly noted in `<process>` if the vendor has no step/expected split (per the capability-gap fallback above).
- [ ] **Zero residual `C12345` case-ID shape** — replaced by the vendor's actual ID shape; both `<process>` step 8 + the validation_checklist line rebound.
- [ ] **Priority mapping table populated** with the vendor's actual enum (numeric ID, string label, or `N/A` per the fallback rule).
- [ ] **Type mapping table populated** with the vendor's actual type taxonomy (or omitted per the fallback rule with documentation).
- [ ] **User prompt template re-branded** — heading, container term, and any vendor-UI URLs match the target vendor.
- [ ] **Pitfalls block re-bound** to the target vendor's actual gotchas (not TestRail's section-creation / rate-limit / `custom_steps_separated` quirks).
- [ ] **Capability-gap notes inline** wherever a fallback was applied (per the rule above) — degraded behavior is documented, not silent.
- [ ] **Workflow-side coupling decision recorded** — either option (a) parameter-bound ACQUIRE OR option (b) per-vendor workflow fork is chosen + reflected in the calling workflow.

---

## Workflow-side coupling note

The calling workflow currently ACQUIREs `testrail-test-case-export` by name. When a second-vendor binding is added, either:

**(a) Rename the workflow's ACQUIRE to a parameter resolved from project config** — e.g., a `<tms_export_skill>` placeholder bound to `qa-project-config.md`'s TMS field. This is the cleaner architecture but requires the workflow to support the parameter substitution.

**(b) Keep per-vendor workflow forks** — the calling workflow has a `<vendor>-flow.md` that hardcodes the corresponding `<vendor>-test-case-export` ACQUIRE.

Option (a) is preferred but should not be implemented until at least one second-vendor binding actually exists (YAGNI — designing a parameter-resolution mechanism for one vendor is over-engineering).

---

## Default-ID rationale (referenced from SKILL.md `<process>` steps 3 + 4)

Loaded on demand when a maintainer questions why the SKILL.md ships with a specific default priority/type ID table — and what the audit implications of using those defaults on a non-default TestRail instance are.

### Why steps 3 + 4 carry a default table at all

TestRail's `priority_id` and `type_id` values are NOT enums in the API spec — they are foreign keys into per-instance lookup tables (`Administration → Customizations → Priorities` and `Administration → Customizations → Test Types`). Two different TestRail installations of the same software can have completely different ID-to-label mappings, and the API does not validate semantic correctness — it accepts any integer the user passes and stores it.

The SKILL.md defaults below are the **documented out-of-the-box values** that ship in a fresh TestRail installation:

- **Priority defaults:** P0 → `4` (Critical), P1 → `3` (High), P2 → `2` (Medium), P3 → `1` (Low)
- **Type defaults:** Happy Path → `1` (Functional), Negative → `7`, Edge Case → `6` (Boundary), Integration → `8`, Performance → `9`, Security → `10`

### Audit risk: silent mis-mapping on customized instances

When a TestRail instance has a customized priority or type table (renamed labels, reordered values, added intermediate values like "P1.5 — Urgent"), exporting against the default IDs above produces **silently mis-labeled cases** in the target project. The API call succeeds, the case appears in TestRail, but its priority/type label is wrong — and the rendered TestRail UI gives no indication that the ID came from a generic default rather than the instance's actual mapping.

### Mitigation: parent TMS config takes precedence

Steps 3 + 4 **prefer the parent workflow's TMS config** over the defaults. When a project supplies an instance-specific `priority_id` / `type_id` table via `qa-project-config.md` `Test Case Management` section (or testgen equivalent), the skill uses that mapping. The defaults are a last-resort fallback so the export still produces a valid case rather than failing — but the validation_checklist's "values match target project configuration per step 3 + 4 precedence" item is the audit anchor that catches this mismatch in review.

### For maintainers porting to non-TestRail vendors

Drop these defaults entirely from the forked skill. Other vendors (Xray, Zephyr, qTest, Polarion) use either string enums (Xray priority labels), GraphQL types (Linear), or fully customizable type taxonomies — none have a "documented default ID table" the way TestRail does. The forked skill should require the parent to supply the mapping or refuse to run; see the per-vendor rebind list above for the vendor-specific guidance.

---

## Section-ID user prompt template (referenced from SKILL.md `<process>` step 2)

Loaded on demand at step 2 when the parent workflow did not pre-supply `section_id` and the skill must collect it from the user. The base SKILL.md keeps the step-2 operational rule + flexible-parse acceptance (`section_id is XXXXX` / `group_id=XXXXX` / bare number) inline; this section holds the verbatim prompt text.

```
TestRail Section Setup Required

To export test cases, I need a section_id from TestRail.

**Option A: Use existing section**
If you already have a section, provide the section_id.
Find it in the URL when viewing a section (e.g., group_id=94686 or section_id=94686)

**Option B: Create new section**
1. Go to: [TestRail suite URL]
2. Click "Add Section"
3. Name it: [TICKET-KEY]
4. After creating, find the section_id in the URL or section details

Please provide: "section_id is XXXXX" or just the number
```

---

## Preconditions format (referenced from SKILL.md `<process>` step 6)

Loaded on demand at step 6 when actually formatting the `custom_preconds` field. The base SKILL.md keeps the field-choice + fallback rule inline; this section holds the verbatim TEST DATA / PRECONDITIONS section ordering template.

Order: TEST DATA first (tester sees execution count immediately), then preconditions.

For parameterized tests (has Test Data table):

```
=== TEST DATA ===
Execute this test case for EACH row in the table below:

| Parameter | Value 1 | Value 2 |
|-----------|---------|---------|
| [Param]   | [Val]   | [Val]   |

=== PRECONDITIONS ===
- [Precondition 1]
- [Precondition 2]
```

For non-parameterized tests: include only the `=== PRECONDITIONS ===` section.
