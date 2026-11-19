# Answer sheet (operator only)

The agent never sees this file. The operator answers questions from it, under the same rules as the Saleor benchmark ([BENCHMARKS.md](../../BENCHMARKS.md), section 4, "Questions that are not in the tables"): answer the question that was asked, directly and in full; answer only what was asked; never hint.

## Order of sources

1. **Hidden questions** of the small task: BENCHMARKS.md, section 4, Task 1 table (rows 1–7). Unchanged.
2. **Ladder answers** below (rows A1–A4): the details that v0 states and v1–v5 removed. A question about one of them gets the v0 wording, so every version can reach the same result when the agent asks.
3. **Contradiction answers** below (rows K1–K2), v5 only.
4. **Extra answers** of the small task: BENCHMARKS.md, section 4, "Task 1 (small): extra answers". Unchanged; new rows are added there, as in the Saleor benchmark, so both benchmarks keep one decision per question.
5. Not in any table: the agent's own recommended option, as in BENCHMARKS.md section 4. Add a row to the extra answers right away.

## Ladder answers

| # | Detail (our checklist) | Removed in | Answer |
| ---: | --- | --- | --- |
| A1 | What to build (item 1) | v1 | A "storage conditions" field on the product, a short text such as "Keep refrigerated at 2–8 °C". (Extra answer 1 adds: a first-class nullable field on Product.) |
| A2 | Definition of done, tests (item 5) | v2 | The feature is fully implemented end to end, tests are in place, and everything passes locally. (Extra answer 4 adds what "locally" includes.) |
| A3 | Example value (item 6) | v3 | For example "Keep refrigerated at 2–8 °C". (Format and length: hidden 1.) |
| A4 | Where staff set it, where customers see it (items 3, 4) | v4 | Staff set it on a product in the dashboard, and customers see it in the product description on the storefront. (Hidden 4 adds: only on the product page.) |

The closing bracket note is for the operator. Send it only when the agent's question touches that row too (BENCHMARKS.md, section 4, "What you send").

## Contradiction answers (v5 only)

| # | The agent asks about | Answer |
| ---: | --- | --- |
| K1 | Customers should see it vs keep it internal | Customers should see it: on the storefront product page, in the product description area. Not in cart, checkout or order emails. |
| K2 | Translatable vs English only | It is translatable, the same way as the product name and description. The storefront shows the translation when there is one. |

If the agent does not ask and picks a side by itself, don't correct it during the first pass. The checklist check at "done" records what it did.

## Old-protocol steps that stay the same

The hidden-question check at T1, the follow-ups and the post-implementation prompt are the same as in the method file of each method ([saleor/methods/](../../saleor/methods/)). For v5, its questions 2 (translatable) and 4 (where customers see it) already cover K2 and K1, so nothing is added ([OPERATOR-GUIDE.md](../OPERATOR-GUIDE.md), step 5).
