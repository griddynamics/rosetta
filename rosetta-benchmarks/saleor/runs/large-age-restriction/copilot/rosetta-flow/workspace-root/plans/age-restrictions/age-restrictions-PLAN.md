# Age restrictions — execution plan

**Status:** H0 specifications/plan/test contracts approved; H1 implementation and isolated local validation authorized by user on 2026-11-08. Backend implementation may start within the authorized scope; later review/validation gates remain.  
**Contract:** [SPECS](age-restrictions-SPECS.md) owns WHAT; this file owns batch dependencies, ownership and completion gates.  
**Packaging:** One master plan with embedded batch sessions and [HANDOFF](HANDOFF.md), because only these files are authorized. No additional session/state files are created.

## Read first and governing rules

- Read [SPECS](age-restrictions-SPECS.md) entirely, [architecture](architecture-notes.md#L149-L240), and [HANDOFF](HANDOFF.md). Root/service context already loaded; execution agents load relevant repo rules/context before touching owned files.
- Spec AR01–AR24 and T01–T24 govern outcomes; this plan does not restate algorithms/API payloads. H0 approved by user: “Yes, I reviewed the plan”.
- H1 authorized by user: “Yes, I authorize implementation and isolated local validation”. Authorized resources: application working trees; disposable/test-local database resources only when isolation is proven; synthetic data only. Forbidden: external, staging, pre-production, production, real customer data, and environment/key/log/seed reads. No existing resource is assumed isolated or authorized merely because it is local.
- Only listed owner may write a file in a batch. Generated files are single-owner; schema/codegen phase always runs alone. Unlisted parallel pairs are sequential.
- No commits/pushes, unsafe rollback, scope expansion, skipped guards, hand-edited generated artifacts or new external verification dependency. Existing import/draft/guest asymmetries are contract, not cleanup opportunities.
- Outcomes/findings/decisions: authorized `HANDOFF.md` batch rows with commands/status, safe test evidence and blockers; no dates/credentials/raw requests. Spec/plan/architecture changes require new approval, not autonomous edits.
- This approval-state synchronization edits only PLAN and HANDOFF. H1 permits backend implementation in the listed application working-tree scopes; database validation requires proven isolation. Client work still depends on B03a generated API contract. No additional per-session/state files are authorized by this update.
- Review update 2026-11-08: UD1 underage recovery and F2 rendered WCAG/enabled-locale acceptance are defined in SPECS §§6/8/10. This plan adds ownership/gate evidence for them; no implementation approval is implied.

## Dependency graph and approval gates

| # | Batch/session | Depends on | Parallel with | Owner |
| --- | --- | --- | --- | --- |
| B00 | Specification/plan/test acceptance + resource scope | Architecture approval (received) | None | Parent + human reviewer |
| B01 | Backend foundation, migration and API | B00/H0/H1 | None | Backend-foundation |
| B02 | Protected-operation enforcement | B01 | None | Backend-enforcement |
| B03a | Generated-contract bootstrap (first pass of B03) | B01, B02, H2 | None; **alone** | Contract-generator |
| B04 | Dashboard source batch | B03a | **B05 only** | Dashboard |
| B05 | Paper source batch | B03a | **B04 only** | Storefront |
| B03b | Generated-contract finalization (second pass of B03) | B04, B05 | None; **alone** | Same Contract-generator |
| B06 | Focused test completion across repositories | B03b, H3 | None | Focused-tests (sequential repo slices) |
| B07 | Independent code/security/privacy/test review | B06 | None; read-only | Reviewer, not implementing owner |
| B08 | Final local validation and E2E | B07 findings resolved, H4 | None | Validator |
| B09 | Final acceptance / handoff | B08, H5 | None | Parent + human reviewer |

Only B04/B05 are genuinely parallel: different repository source/test files, separate runtime ports if separately approved, no shared outputs or schemas, no shared DB mutation during parallel work. No tests requiring shared mutable fixture data/services run concurrently. Backend enforcement stays sequential after foundation because it consumes helper/model/API contracts.

B03 is one serialized cross-repo generated-schema/codegen batch with two explicit passes, **not two concurrent owners**. B03a publishes complete backend types/error enums and bootstrap generated clients; B03b generates updated operation results after client documents land. Client source batches may have temporary generated-type mismatch before B03b; they must not claim build/typecheck completion or generate independently.

| Gate | Reviewer / exact review object | Explicit acceptance | Skipping consequence |
| --- | --- | --- | --- |
| H0, before B01 — **Approved 2026-11-08** | User approved specifications, plan and test contracts | “Yes, I reviewed the plan” | Received; substantive contract changes still require renewed approval. |
| H1 — **Authorized 2026-11-08** | Application working trees; isolated local validation with disposable/test-local database resources only when isolation is proven; synthetic data only | “Yes, I authorize implementation and isolated local validation” | Received; unproven isolation or forbidden resources remain blocked. |
| H2, after B02 | Human + independent review: foundation/migrations/API, operation matrix, exception/legacy/recovery correctness and initial backend tests | “I approve the backend integration for client work.” | Clients may not proceed on an unreviewed contract. |
| H3, before B06 | Human: generated alignment, UD1 recovery cases and §8 four-surface keyboard/label/status/AA enabled-locale test matrix, including both Dashboard schema modes | “I approve the client integration and validation cases.” | No acceptance claim or broader test execution. |
| H4, before B08 | Human: review findings disposition, UD1/F2 focused evidence completeness and final local validation/resource scope | “I approve final local validation.” | No final execution/DoD pass. |
| H5, after B08 | Human: AR→T evidence, local passes, privacy/concurrency proofs, remaining failures | “I approve the completed implementation and coverage.” | Status remains unaccepted; no “fully done.” |

Approvals are explicit, not inferred from “ok,” a question, or earlier architecture approval. A substantive contract/scope change returns to H0; execution/resource changes return to H1/H4. Reviewer implementation fixes are assigned to their original owner in a serialized reopening, with B03b rerun if schema/documents change.

### Requirement-to-batch traceability

Source R/O labels and acceptance clauses remain in SPECS §1; this table maps implementation/verification ownership only. Every row also passes B07 independent review, B08 final local validation and B09/H5 acceptance.

| Spec unit | Implementation / integration batches | Focused proof |
| --- | --- | --- |
| AR01 | B01, B04, B03a/B03b | B06/T01 |
| AR02 | B01, B04, B03a/B03b | B06/T02 |
| AR03 | B01, B05, B03a/B03b | B06/T03 |
| AR04 | B01 | B06/T04 |
| AR05 | B01, B05 | B06/T05 |
| AR06 | B01, B02 | B06/T06 |
| AR07 | B01, B02, B05 | B06/T07 |
| AR08 | B02 | B06/T08 |
| AR09 | B02, B05 | B06/T09, T09.UNDERAGE; initial-add/completion links T08.UNDERAGE/T11.UNDERAGE |
| AR10 | B02, B05 | B06/T10, T10.UNDERAGE |
| AR11 | B02, B05 | B06/T11 |
| AR12 | B02, B05 | B06/T12 |
| AR13 | B02 | B06/T13 |
| AR14 | B02 | B06/T14 |
| AR15 | B02 exemption regression only | B06/T15 |
| AR16 | B01, B02, B05 | B06/T16 |
| AR17 | B04, B03b | B06/T17 incl. T17.A11Y/T17.LOCALE |
| AR18 | B01, B05, B03b | B06/T18 incl. T18.A11Y/T18.LOCALE |
| AR19 | B05 | B06/T19 incl. T19.NOTICE.A11Y, T19.NOTICE.LOCALE, T19.RECOVERY.A11Y, T19.RECOVERY.LOCALE |
| AR20 | B01, B02, B04, B05, B03a/B03b | B06/T20 |
| AR21 | B02, B05 | B06/T21 |
| AR22 | B03a/B03b, B06, B08 | T22 |
| AR23 | B01, B02, B04, B05 | B06/T23 |
| AR24 | B01, B02, B04, B05 | B06/T24 |

## File ownership and collision prevention

All paths below are **repo-relative**, prefixed by repository column. New internal filenames are recommendations from SPECS, not existence claims. Unlisted needed file: stop, report bounded addition and obtain owner/scope approval before writing.

| Repository / owner | Exclusive write scope | Consumers / exclusions |
| --- | --- | --- |
| Saleor / B01 | `saleor/{account,product,site}/models.py`; their migration directories; recommended `saleor/core/age_restrictions.py`; account/product/shop GraphQL source identified by architecture B4–B15; birthday validation/permission/tracking helpers; error enums under `saleor/{account,checkout,order,core}` and corresponding `graphql/{account,checkout,order}/enums.py`, `graphql/core/types/common.py`; privacy-safe birthday Date coercion/error adapter if needed after scoped approval. | B02 consumes frozen policy/types/errors; no generated `graphql/schema.graphql`. Any newly needed shared formatter requires explicit narrow ownership extension, not blind request-logger refactor. |
| Saleor / B02 | `saleor/checkout/{utils.py,complete_checkout.py,fetch.py,tasks.py}`; `graphql/checkout/mutations/{checkout_lines_add.py,checkout_lines_update.py,checkout_create.py,checkout_create_from_order.py,order_create_from_checkout.py,checkout_complete.py,checkout_lines_delete.py,checkout_line_delete.py}` as needed; `graphql/order/mutations/{draft_order_create.py,draft_order_update.py,draft_order_complete.py,order_lines_create.py,order_line_update.py}`; `saleor/order/actions.py` reissue entry. | No B01 shared helper/API/model edits without reopening B01. `order_bulk_create.py` functionally unchanged; test exemption instead. No unrelated placed-order rule edits. |
| Saleor / test scopes | B01 foundation tests under core/account/product/shop tests; B02 enforcement tests under checkout/order/domain/task tests. B06 may complete these **after** B01/B02 writers are inactive. | Existing fixtures used synthetically; no shared `conftest.py` or raw customer fixture edits without added ownership. Test filenames follow existing suites in architecture. |
| Dashboard / B04 | `src/products/components/{ProductDetailsForm,ProductCreatePage,ProductUpdatePage}/**`; `src/products/utils/data.ts`; product create/edit view serialization and `ProductUpdate/handlers/**`; `src/fragments/{products,shop}.ts`; product/site-settings query/mutation sources; `src/siteSettings/**`; relevant customer query/form regression tests (birthday-free); new messages/co-located tests/stories; non-generated schema-lock/UI gating source if necessary. | No schema pins or generated `src/graphql/*`; locale generated artifacts owned by B03. No standalone birthday customer UI. |
| Paper / B05 | Account actions/get-current-user/settings/editor; PDP dynamic buy-box/notice/cart UI; `src/app/actions.ts`, `src/app/(checkout)/actions.ts`; `src/lib/{checkout.ts,cart-checkout.ts}`; storefront product contract/mapper and necessary catalog view types; affected `src/graphql/*.graphql`, `src/checkout/graphql/{checkout,user}.graphql`; public minimum-age loader/document/registry additions; `messages/*.json`, focused action/mapper/contract/E2E tests. | No timeZone query/display, no tokens/browser transport, no schema/generated directories. Core/data lock baseline/override changes require explicit approval; never update lock files simply to hide failures. |
| All three / B03 single owner | Backend `saleor/graphql/schema.graphql`; Dashboard `schema-main.graphql`, `schema-staging.graphql`, existing schema pointer as needed, `src/graphql/*.generated.ts` and other actual codegen outputs, generated/extracted locale artifacts; Paper `src/gql/**`, `src/checkout/graphql/generated/**`. | All other writers frozen; source docs and application code unchanged by generator unless defect is returned to owner. Both passes use same reviewed contract. |
| All three / B06 | Focused test files in previously assigned test scopes; synthetic E2E scenarios. Production fixes returned to B01/B02/B04/B05, not silently mixed into test work. | Writers sequential/inactive; shared fixture/schema outputs frozen. |
| All three / B07–B08 | Read-only review/validation; report to approved HANDOFF. B08 commands with mutation side effects restricted to explicitly approved generated/test/runtime resources. | No test weakening; automatic lint/codegen writes only by owning batch, not validator. |
| Plan folder / coordinator | HANDOFF factual status/evidence under approved execution scope. | Architecture/spec/plan remain frozen unless human approves revision. |

Latent collisions resolved: shared backend helper/error enums B01 only; checkout/draft actions B02 only; both Dashboard schema generations B03 only; Paper dual generators B03 only; locale extraction B03; shared fixture changes require sequential ownership. Test writers only reopen after implementation writers finish.

Automatic generation traps: Paper `predev`, `prebuild`, `pretypecheck` generate both clients; Dashboard generate writes both schema outputs. B04/B05/B06/B08 must not trigger these scripts outside B03 ownership. During source work use no-generating focused commands when possible; defer full generation-dependent verification until B03b. If validation inevitably runs generation, reopen B03 alone first.

## Batch sessions

### B00 — Acceptance boundary

**Do**
1. H0 received: user approved specifications, plan and test contracts with “Yes, I reviewed the plan”; retain architecture/spec files unchanged in this synchronization.
2. H1 received: “Yes, I authorize implementation and isolated local validation”; enforce the authorized resource restrictions above, with isolation proof before any database use.
3. Freeze approved technical names/error/null/snapshot contracts and owner scopes.

**Done when / checklist**
- [x] H0/H1 explicit approvals and authorized resource restrictions recorded, 2026-11-08.
- [ ] Every AR has corresponding T group and owner; no unresolved contract ambiguity.
- [ ] No implementation/resource command before approvals.

### B01 — Backend foundation, migrations and API

Depends on B00. **Do:** deliver SPECS §§3–5 and AR01–AR07/AR20/AR23/AR24 foundation within B01 scope; durable defaults, pure date policy, actor guard/resolver privacy, tracked partial updates, complete error enums and migration compatibility tests. No public enforcement bypass or birthday export/index additions.

**Traps:** CustomerInput inheritance reaches customerCreate; app impersonation resolves target but not authority; explicit false/null/omission distinct; safe Date coercion must not echo input; ordinary name edits and unrestricted catalog remain compatible.

**Done when / checklist**
- [ ] T01–T07 foundational cases pass; pure date decision branches fully covered.
- [ ] Old-row/old-code insert defaults and no birthday/cart/order backfill proven.
- [ ] All needed enums/types available to B02; migration leaves exact, no guessed numbers.
- [ ] Birthday cannot be read/written by staff/apps through any covered projection.
- [ ] API source ready for generation; drift gate deferred explicitly to B03, not falsely reported passing.

### B02 — Protected-operation enforcement

Depends on B01. **Do:** deliver SPECS §§6–7 with B02-owned adapters; all AR08–AR16/AR21 paths, initial/reorder lines, delegated app/background, legacy pre/post-payment, draft/reissue and removal semantics. Wire shared policy without changing B01 contracts.

**Traps:** orderCreateFromCheckout ≠ bulk exemption; legacy final insert distinct; guest decreases/unchanged positive quantities still blocked; draft email may resolve customer; reissue is new draft; placed-order retries return existing result.

**Done when / checklist**
- [ ] T08–T16 and transactional T21 initial cases pass across direct API/domain paths.
- [ ] Guest retained cart/removal and customerless draft exception demonstrated.
- [ ] UD1 backend cases T08.UNDERAGE–T11.UNDERAGE prepared/passing: authenticated-underage decrease/removal allowed, initial add/increase/completion denied; guest non-removal updates remain denied.
- [ ] Bulk import exemption verified, no exemption flag propagates to new operations.
- [ ] Final decision L after aggregate locking, fresh policy/profile/products; no stale pre-payment eligibility.
- [ ] Failure leaves no age-caused partial lines/order/voucher/stock/event state; no duplicate charge.
- [ ] H2 review/approval received before contract bootstrap/client work.

### B03 — Cross-repo schema/codegen owner (two serialized passes)

**B03a depends on B02/H2; B03b depends on B04+B05. Runs alone.**

**Do**
1. B03a: generate backend code-first schema; prepare matching supported Dashboard stable/staging contract snapshots and both generated clients; bootstrap Paper storefront/checkout generated outputs.
2. B03b: regenerate after Dashboard/Paper source documents are complete; extract Dashboard messages; validate both schemas, both Paper outputs and no timeZone Paper operation.
3. Use only H1-approved local resources/offline schema sources. If the staging contract cannot be obtained locally, stop and request a specific approved source; do not silently substitute stable or use network.

Existing commands: backend `uv run poe build-schema`; Dashboard `pnpm run generate`; Paper `pnpm run generate:all`; Dashboard message extraction follows existing scripts. Schema refresh/introspection requires approved local API; no network fetch-schema script. Refer to architecture D8/P11 and SPECS §8, not raw external schemas.

**Done when / checklist**
- [ ] Generated backend schema equals code; migration/schema checks and enum mappings valid.
- [ ] Stable/staging Dashboard operations valid against their respective reviewed schemas.
- [ ] Both Paper codegens complete from matching API contract; Date remains string.
- [ ] Second pass reproducible/no additional generated diff; no manual generated edits.
- [ ] Generator recorded schema provenance/commands safely; no other owner wrote generated outputs.
- [ ] Client typecheck/build gates can now run without independent generation.

### B04 — Dashboard source integration

Depends on B03a; may run only alongside B05. **Do:** deliver SPECS §8 Dashboard / AR17, B04-owned product Boolean create/edit and minimumAge/timeZone Site Settings; false serialization, inline errors, permissions, messages and tests. Add schema-mode gates only where reviewed schema requires them.

**Done when / checklist**
- [ ] T17 source/test cases prepared; both field true/false roundtrip and saved settings mapping.
- [ ] T17.A11Y/T17.LOCALE rendered Site Settings cases prepared per SPECS §8; full enabled-locale inventory and both schema modes assigned to B06.
- [ ] timeZone shown only in Site Settings; ordinary customer birthday queries remain absent.
- [ ] No schema/generated/locale extraction writes; no generation-triggering scripts run.
- [ ] Source declared complete for B03b; compile acceptance explicitly pending B03b/B06.

### B05 — Paper source integration

Depends on B03a; may run only alongside B04. **Do:** deliver SPECS §8 Paper / AR18–AR19 within B05 scope; self date editor, public restriction view model, notices/sign-in/removal, structured add/update/complete errors, session and payment recovery, localization.

**Traps:** no timeZone selection/display; no birthday in broad fragments/cached product shells; no Date(timestamp) coercion; rejected add emits no success; guest restricted positive updates disabled but removal available; auth-unavailable ≠ guest.

**Done when / checklist**
- [ ] T18/T19/T23 client cases prepared; actual UI coverage includes profile/cart/checkout.
- [ ] UD1 customer decrease/removal controls distinguished from guest removal-only controls; authoritative completion errors unchanged.
- [ ] T18.A11Y, T18.LOCALE, T19.NOTICE.A11Y, T19.NOTICE.LOCALE, T19.RECOVERY.A11Y and T19.RECOVERY.LOCALE rendered cases prepared per SPECS §8 for every enabled Paper locale.
- [ ] Signed-in pre-attach and retained guest-cookie cart behavior preserved.
- [ ] Authorized-payment/free-order recovery never charges again solely on AGE_RESTRICTED.
- [ ] GraphQL operations registered with correct session/live mode; templates plain.
- [ ] No generated/kernel-lock baseline edits or automatic generator invocation.
- [ ] Source declared complete for B03b; compile acceptance pending B03b/B06.

### B06 — Focused test completion

Depends on B03b/H3; sequential backend, Dashboard, Paper test slices. **Do:** complete SPECS §10 T01–T24 and cross-repo contract tests; fill edge/privacy/concurrency/UI cases not covered in implementation batches; record per-subcase evidence. Use existing suites and approved synthetic fixtures.

**Done when / checklist**
- [ ] Every AR/T subcase accounted for; no group-level “pass” hiding skips.
- [ ] Focused backend tests, query/coverage budgets, migration compatibility and privacy tests pass.
- [ ] T08.UNDERAGE/T09.UNDERAGE/T10.UNDERAGE/T11.UNDERAGE prove the complete authenticated-underage recovery sequence; guest stricter behavior remains covered.
- [ ] Dashboard both-schema tests/typecheck and Paper dual-output tests/typecheck pass.
- [ ] F2: all eight named accessibility/locale subcases in SPECS §10 pass with rendered keyboard/focus, labels/error association, pending/error/success announcements and AA presentation evidence.
- [ ] Surface×enabled-locale matrix complete for Site Settings/birthday editor/notice/guest recovery; Dashboard both schema modes included. No skipped locale, raw-key or status-announcement failure; key-presence checks alone insufficient.
- [ ] Guest removal, no-customer drafts, app/legacy/reissue/bulk and history/retry asymmetries proven.
- [ ] STRIDE/PII/coercion/observability, current-state concurrency and payment recovery tested.
- [ ] Source fixes assigned original owner; generated changes routed through serialized B03b.

### B07 — Independent review

Depends on B06. **Do:** reviewer other than implementer inspects AR/T traceability, code, migrations, API contracts, privacy/auth, operation inventory, transaction snapshot/payment recovery and generated provenance. Read-only security review; not a claim based on static scans alone.

**Done when / checklist**
- [ ] All findings severity/evidence/disposition recorded without sensitive data.
- [ ] No unresolved correctness/privacy/security/schema blocker; reopen owners sequentially for fixes.
- [ ] Reviewer F2 disposition records specification/plan remediation and actual T17/T18/T19 subcase execution separately; no “implemented” inference from document edits.
- [ ] Retests and any required B03 rerun complete; no self-rubber-stamp.
- [ ] H4 obtained for final validation.

### B08 — Final local validation

Depends on B07/H4. **Do:** run SPECS §10 repository quality gates and approved disposable E2E against aligned backend/Dashboard/Paper; record exact local commands/status and contract coverage. Verify no sensitive sources/production resources used.

**Done when / checklist**
- [ ] Full applicable backend tests/linters/migration/schema gates pass locally.
- [ ] Dashboard tests/typecheck/lint/format/i18n/story and both supported schema contracts pass.
- [ ] Paper unit/contract/lint/typecheck/data/core/PPR/template checks and synthetic E2E pass.
- [ ] Staff flag/settings → customer birthday → allowed/denied API/cart/order scenarios run E2E.
- [ ] Guest retained restricted cart → blocked update/complete → sign-in or removal recovery demonstrated.
- [ ] Authenticated-underage retained cart → allowed decrease/removal, blocked initial add/increase/completion demonstrated under UD1.
- [ ] Final local acceptance includes all SPECS §10 named F2 subcases on the four rendered surfaces and every enabled locale (both Dashboard schema modes); focused results alone do not waive final acceptance checks.
- [ ] No failing/omitted required gate, false-green retry, disabled guard or duplicate payment.
- [ ] Disposable runtime cleanup/remaining services reported; no commits/pushes.

### B09 — Final acceptance and handoff

Depends on B08/H5. **Do:** parent presents full source→AR→T→batch evidence, exceptions, remaining risks and local results for explicit acceptance; record factual completed status only after H5.

**Done when / checklist**
- [ ] H5 received; DoD below all checked with evidence.
- [ ] HANDOFF records accepted outcome, reproducible commands/schema provenance and any residual limitations.
- [ ] No claim of legal age verification or certification; no unapproved deployment/rollback.

## Final definition of done

- [ ] AR01–AR24 implemented end to end, T01–T24 subcases covered and all required local checks pass.
- [ ] Product flag, minimumAge 18 and timeZone UTC durable defaults/migrations verified.
- [ ] Customer-self/superuser birthday writes/reads only; malformed/future/unauthorized inputs safe.
- [ ] Date-only/local-today equality and 29 February→1 March proven.
- [ ] Direct/indirect guest restricted additions/non-removal updates/completion blocked; browsing/retention/removal preserved.
- [ ] UD1 authenticated-underage decreases/removal allowed; initial adds/increases/authoritative completion denied, with persisted/API and UI evidence.
- [ ] Completion authoritative, current policy used, names products without DOB/age/account-existence disclosure.
- [ ] Draft customerless allowance, linked eligibility, reissue/new order coverage, app/automatic/legacy paths and bulk exemption pass.
- [ ] Existing placed orders unchanged; idempotency, concurrent deltas, voucher/fund/stock recovery verified.
- [ ] Dashboard + Paper UX complete; no Paper timeZone field; no false analytics/shared birthday cache.
- [ ] F2 WCAG 2.2 AA keyboard/focus/labels/errors/pending-status/presentation assertions pass for Site Settings, birthday editor, notice and guest recovery in every enabled locale; named subcases and complete matrix accepted.
- [ ] Backend schema, Dashboard dual schema/client outputs and Paper dual outputs regenerated/reproducible.
- [ ] Independent review findings resolved; H0–H5 approvals and final evidence recorded.
- [ ] No secrets/customer data/unsafe resource/commit/push side effects; accepted by human, not merely “coded.”

## Executability and reporting

No known design/dependency cycle or ownership collision. H0/H1 received: backend implementation may start. Disposable/test-local database validation requires proven isolation and synthetic data; forbidden resources/reads remain prohibited. Client work remains sequenced after B03a generated API contract and H2; H3–H5 remain applicable. No implementation/runtime activity is performed by this approval-state update.

Readiness checks: exact current migration leaves; installed IANA zone data; disposable local database/API/cache and payment mocks; locally available schema contracts for Dashboard both modes; matching API for Paper dual codegen; existing repo tools/test browsers. None is assumed available or passing. If missing, block the smallest dependent batch and report; do not use production/cloud/network or private dumps as fallback.

The only anticipated conditional blocker is unavailable local staging schema provenance/resource prerequisites. Resolve via existing schema locks where genuinely applicable or specifically approved local artifacts/resources; no silent contract substitution. Parent keeps pending batch IDs/approval status and evidence in HANDOFF; no extra state file required.
