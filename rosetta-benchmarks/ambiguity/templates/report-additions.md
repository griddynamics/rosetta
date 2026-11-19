# Report additions for POC runs

A POC run report = the Saleor template [run-report-small.md](../../saleor/templates/run-report-small.md) + the three additions below. Definitions: [METRICS.md](../METRICS.md).

## 1. Data block: add these lines at the end of the data block (before the closing `---`)

```yaml
# ── Ambiguity POC (ambiguity/METRICS.md)
poc_schema: ambiguity-poc/v2
prompt_version:            # v0 | v3 | v5 (ambiguity/prompts/)
repeat:                    # 1 | 2 | 3
t1_items:                  # 15 values, one per checklist item in the order of prompts/checklist.json: 1 = passes at "done", 0 = fails (section 9)
```

## 2. New section: add after section 8 of the report

```markdown
## 9. POC: checklist at "done"

Code saved before these checks: `t1/<repo>.diff` and `t1/<repo>.untracked.txt` (OPERATOR-GUIDE.md, step 5). Checked on the running stack right after "done", before the stop-2 question. Nothing was fixed or sent to the agent.

| # | Checklist item | Pass at "done" | Evidence (command, UI steps or test) |
| ---: | --- | --- | --- |
| 1 | One storage-conditions field on the product (not an attribute, metadata or a label) | | |
| 2 | Staff can set it and customers can read it | | |
| 3 | Staff set it on the product in the dashboard | | |
| 4 | Customers see it in the product description on the storefront | | |
| 5 | Done end to end, with tests for the new field | | |
| 6 | Takes a short free-text value such as "Keep refrigerated at 2–8 °C" | | |
| 7 | Plain text, optional, at most 250 characters, empty allowed | | |
| 8 | Translatable like the product name and description; the storefront shows the translation | | |
| 9 | Set per product, not per variant | | |
| 10 | Shown only on the storefront product page, not in cart, checkout or emails | | |
| 11 | Existing products start empty: schema migration only, no data backfill | | |
| 12 | Part of the product in the API, webhook payloads and CSV export; no filter or search | | |
| 13 | Editing needs MANAGE_PRODUCTS; anyone can read it | | |
| 14 | Existing products open and work as before | | |
| 15 | The repos' own checks pass: tests, type check, lint | | `<commands + pass/fail counts>` |
```

## 3. Appendix B: add these two blocks, word for word from the terminal

````markdown
<details><summary>Stop 1: requirements (word for word)</summary>

```text
<the agent's answer to "List the requirements you are about to implement.">
```
</details>

<details><summary>Stop 2: not done or not verified (word for word)</summary>

```text
<the agent's answer to "List anything that is not done or that you did not verify.">
```
</details>
````
