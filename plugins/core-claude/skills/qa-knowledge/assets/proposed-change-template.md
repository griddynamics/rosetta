---
name: proposed-change-template
description: Shared QA/AQA proposed-change approval block, presented before any correction write.
---

<proposed-change-template>

One block per change, presented BEFORE any write; empty fields use `None`. The calling phase supplies the flow-specific **change-type enum**, the **root-cause reference**, the **state-file path**, and the **loop-back phase**; this asset owns the shape plus the approval / iteration-cap rules.

```markdown
### Proposed Change <N>: <one-line title>
- **Source root cause:** <root-cause entry id — e.g. execution-report ERR-3 (QA) / failure-analysis F3 (AQA)>
- **File:** <path>
- **In-scope:** yes | no   (if `no`, STOP — escalate; outside the in-scope file set)
- **Change type:** <one value from the flow's change-type enum below>

**Before:**
~~~diff
- <removed line(s)>
~~~
**After:**
~~~diff
+ <added line(s)>
~~~

- **Reason:** <one-line — how this fix addresses the root cause>
- **Impact:** <only the cited test? other tests sharing the helper/factory? page-object consumers?>
- **Risk:** Low | Medium | High
- **Approval status:** pending | approved (token: `<exact user token>`) | rejected | partial (hunks <list>)
```

**Change-type enum (the phase supplies one):**
- QA / backend API: `assertion-fix | auth-fix | data-setup | request-shape | wait-strategy | other`
- AQA / UI-E2E: `selector-update | wait-strategy | assertion-fix | data-setup | other`

**Iteration cap + escalation (both flows):** cap in-phase apply retries at **3 cycles per failing change**. After 3 failed cycles on the same change, stop, record `Phase <N> blocked: in-phase apply retry cap reached` in the flow's state file, and escalate to the user. If tests still fail after corrections, return to the flow's execution/report phase — do not auto-loop.

**Worked example — QA / API (approved state):**

```markdown
### Proposed Change 1: Use status-matcher instead of raw .code compare
- **Source root cause:** execution-report.md ERR-3 (response-assertion, Confirmed)
- **File:** tests/api/orders_spec.rb
- **In-scope:** yes
- **Change type:** assertion-fix

**Before:**
~~~diff
-    expect(response.code).to eq("200")
~~~
**After:**
~~~diff
+    expect(response).to have_http_status(:ok)
~~~

- **Reason:** response is a Rack::Response; comparing `.code` to string "200" failed per ERR-3.
- **Impact:** orders_spec.rb only.
- **Risk:** Low
- **Approval status:** approved (token: `approved`)
```

**Worked example — AQA / UI (approved state):**

```markdown
### Proposed Change 1: Update logout-button selector
- **Source root cause:** failure-analysis.md F3 (selector-locator, Confirmed)
- **File:** tests/auth/logout.spec.ts
- **In-scope:** yes
- **Change type:** selector-update

**Before:**
~~~diff
- await page.locator('[data-testid="logout-btn"]').click();
~~~
**After:**
~~~diff
+ await page.locator('[data-testid="logout-button"]').click();
~~~

- **Reason:** Frontend renamed the data-testid; page-source confirms the new value.
- **Impact:** logout.spec.ts only — no other test references the old selector.
- **Risk:** Low
- **Approval status:** approved (token: `approved`)
```

</proposed-change-template>
