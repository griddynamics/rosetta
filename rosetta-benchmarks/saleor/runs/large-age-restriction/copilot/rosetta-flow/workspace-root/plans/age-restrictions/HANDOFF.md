# Age restrictions — handoff

## Status and next session

- Architecture approval reported explicitly by caller, 2026-11-08; architecture note remains untouched despite its Draft banner.
- H0 approved by user, 2026-11-08: specifications, plan and test contracts — “Yes, I reviewed the plan”.
- H1 authorized by user, 2026-11-08: implementation and isolated local validation — “Yes, I authorize implementation and isolated local validation”.
- Authorized resources: application working trees; disposable/test-local database resources only when isolation is proven; synthetic data only. Forbidden: external, staging, pre-production, production, real customer data, and environment/key/log/seed reads.
- Implementation, migrations, schemas/codegen, tests and local runtime validation: **not performed by this approval-state update**.
- Review revision 2026-11-08: UD1 recovery contract and reviewer F2 acceptance remediation recorded in SPECS/PLAN; document revision is not implementation approval.
- Next: B01 backend foundation/migration/API implementation may start within H1 scope; database use waits for isolation proof. Client work remains sequenced after B03a generated API contract and H2 review.
- H0/H1 are received; later implementation-review/validation gates H2–H5 remain applicable. No existing local database/service is assumed isolated merely because it is running.

## Required references

- [SPECS](age-restrictions-SPECS.md): sole target-state/API/operation/security/testing authority; AR01–AR24 and T01–T24.
- [PLAN](age-restrictions-PLAN.md): dependencies, owners, gates and observable completion criteria.
- [Architecture](architecture-notes.md#L17-L32): confirmed R1–R10; [evidence](architecture-notes.md#L38-L107); [operation/client decisions](architecture-notes.md#L149-L205).
- Root/service context and repo engineering rules were loaded during discovery; execution agents use the relevant repo's rules/context without reading secrets/logs/seed/customer data.

## Batch index and reporting

| Batch | Scope pointer | Current status |
| --- | --- | --- |
| B00 | H0/H1 spec, test and resource acceptance | Approvals received; resource restrictions recorded |
| B01 | Backend foundation/migration/API | Authorized to start; not started by this update |
| B02 | Protected checkout/order enforcement | Not started |
| B03a | Single-owner generated-contract bootstrap | Not started |
| B04 / B05 | Dashboard / Paper sources; sole allowed parallel pair | Not started |
| B03b | Same-owner final generation after client docs | Not started |
| B06 | Focused test completion | Not started |
| B07 | Independent review | Not started |
| B08 | Final local validation/E2E | Not started |
| B09 | H5 final acceptance | Not started |

Under later approved execution scope, update these factual rows with outcome, safe command/exit-status references, AR/T subcase evidence and blockers. Original source→AR mapping lives in SPECS §1; do not duplicate it here. No additional handoff/state files are needed.

## Blockers, decisions and common traps

- **Approval state:** H0/H1 received; no pending initial approval blocks backend source implementation. Database isolation/tooling/schema availability remain unverified; H2–H5 review/validation gates remain.
- **H0-approved technical contracts:** API names, typed error mapping, explicit-null rejection, Int bounds, snapshot L and query/coverage budgets in SPECS; substantive changes require renewed approval.
- **Current synchronization write boundary:** PLAN and HANDOFF only; specs, architecture, application code, generated artifacts, migrations/tests/docs and state/memory files unchanged by this update. Implementation is separately authorized under H1 restrictions; no resource access occurred during synchronization.
- **timeZone:** confirmed shopSettingsUpdate IANA field/default UTC; Dashboard Site Settings only. Paper never selects/displays it; backend determines today.
- **Guest asymmetry:** retained restricted cart is readable; all positive non-removal quantity updates denied (even decrease/unchanged); explicit removal/zero deletion allowed; named completion failure authoritative.
- **UD1 confirmed:** authenticated-underage customer with existing restricted lines may decrease/remove; initial adds/increases and authoritative completion blocked. T08.UNDERAGE/T09.UNDERAGE/T10.UNDERAGE/T11.UNDERAGE cover this sequence; guest rule stays stricter.
- **F2 remediation:** explicit rendered WCAG 2.2 AA/enabled-locale assertions for Site Settings, birthday editor, restricted notice and guest sign-in/recovery. T17.A11Y/LOCALE, T18.A11Y/LOCALE, T19.NOTICE.A11Y/LOCALE and T19.RECOVERY.A11Y/LOCALE are required in B06 focused and B08 final acceptance; no implementation/accessibility pass claimed.
- **Actor asymmetry:** staff/app permissions are not birthday authority or age exemption. Guest email matching is not sign-in; automatic/delegated flows use legitimate durable customer linkage.
- **Order asymmetry:** customerless restricted drafts allowed; linked drafts/reissue checked; only bulk order import exempt; placed orders/idempotent retries not retroactively rejected.
- **Generation collision:** B03a/B03b alone, same owner. Paper predev/prebuild/pretypecheck auto-generate; source/test/validator batches must not invoke them outside generator ownership.
- **Recovery:** legacy post-payment policy failure requires fresh final decision and existing fund/voucher cleanup, not a second charge.
- **Tooling:** use python3 rather than unavailable python. No network schema fetch fallback; inspect only necessary authorized code facts, not sensitive runtime sources.
- **Current verification:** artifact consistency/traceability/link/privacy checks only. No claim that implementation, codegen, migrations or tests pass.
