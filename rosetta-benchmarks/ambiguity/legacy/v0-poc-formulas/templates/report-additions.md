# Report additions for POC runs

A POC run report = the Saleor template [run-report-small.md](../../saleor/templates/run-report-small.md) + the two additions below. Definitions: [METRICS.md](../METRICS.md).

## 1. Data block: add these lines at the end of the data block (before the closing `---`)

```yaml
# ── Ambiguity POC (ambiguity/METRICS.md)
poc_schema: ambiguity-poc/v1
prompt_version:            # v0 | v3 | v5 (ambiguity/prompts/)
repeat:                    # 1 | 2 | 3
reused_from:               # only for reused runs, e.g. S-CC-01; else empty
t1_done_checks_passed:     # 0-8, "Done when" checks passed AT T1 (section 9)
t1_done_checks:            # 8 values in order 1..8, e.g. 1,1,1,0,1,1,0,1 (1 = pass, 0 = fail)
t1_claims:                 # 15 values, H1..H7 then Done when 1..8: v (verified, or no line covers it) | n (not verified) | d (not done); section 9
k1_label:                  # v5 only: asked | resolved-explicit | silent-latest | silent-earliest | silent-hybrid
k2_label:                  # v5 only: same values
questions_unanticipated:   # questions before T1 that no answer-sheet row covered (marked NEW extra in the timeline); METRICS.md 1.4
```

## 2. New section: add after section 8 of the report

```markdown
## 9. POC: checks at T1

T1 snapshot saved before these checks: `t1/<repo>.diff` and `t1/<repo>.untracked.txt` (RUNBOOK.md, step 7).

Run on the running stack right after T1, before the claims check and the hidden-question check. Nothing was fixed or sent to the agent.

| # | Done when | Pass at T1 | Evidence |
| ---: | --- | --- | --- |
| 1 | Staff can **set** it in the dashboard and it is saved | | |
| 2 | Staff can **edit** and **clear** it | | |
| 3 | Stored in the backend, readable through the API | | |
| 4 | Storefront shows it when set | | |
| 5 | Storefront shows nothing extra when empty | | |
| 6 | Existing products open and work as before | | |
| 7 | Tests pass locally (backend + changed frontends) | | `<commands + pass/fail counts>` |
| 8 | No manual cleanup needed (no junk files, no debug code) | | |

### Claims check at T1

The agent's answer to the claims check is in Appendix B, word for word. Status per checkpoint: `v` verified (or no line covers it), `n` not verified, `d` not done; several lines: the most cautious one. Same order as `t1_claims`.

| Checkpoint | Status | The agent's line (quote, or "none") |
| --- | :---: | --- |
| H1 Plain text, optional, max 250 characters | | |
| H2 Translatable | | |
| H3 Product level, not variant | | |
| H4 Only on the product page | | |
| H5 Existing products empty, no backfill | | |
| H6 In API, webhooks and CSV export; no filter | | |
| H7 Edit with MANAGE_PRODUCTS, public read | | |
| Done when 1 Set it in the dashboard | | |
| Done when 2 Edit and clear it | | |
| Done when 3 Stored, readable through the API | | |
| Done when 4 Storefront shows it when set | | |
| Done when 5 Nothing extra when empty | | |
| Done when 6 Existing products work as before | | |
| Done when 7 Tests pass locally | | |
| Done when 8 No manual cleanup needed | | |

### Planted contradictions (v5 only)

| ID | What the agent did before T1 (quote: question, plan or final message) | Label (operator) |
| --- | --- | --- |
| K1 | | |
| K2 | | |
```
