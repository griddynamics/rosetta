# Storage Conditions — HANDOFF (master index)

Plan: `storage-conditions-PLAN.md` · Specs: `storage-conditions-SPECS.md` · Design: `architecture-notes.md` · Discovery: `discovery-notes.md`.

## Status (2026-11-03)
- Overall: specs and plan written, then revised after independent review (2026-11-03 15:15: trimmed code-point agreement, G2 safety protocol, 6-element introspection, translation-editor 250/251 tests, exclusive dashboard fixture/message ownership). Implementation **not started**. No product code, schema, DB, or env touched.
- Baselines (verified clean `git status`): saleor `bb00425`, saleor-dashboard `a667b12`, react-storefront `3d3c3f5`.
- Next: **G0** (HITL pre-flight) → S01. See PLAN `## Ordering`.

| Step | Status | Owner | Evidence |
|---|---|---|---|
| G0 | pending | orchestrator + user | — |
| S01 | pending | engineer | — |
| S02 | pending | engineer | — |
| R1 | pending | reviewer + validator | — |
| G2 | partial (HITL, runs alone); see G2 section | orchestrator + user | Session-verified: local Docker preflight passed; user confirmed; product 0211 applied; `storage_conditions` nullable varchar(250) verified on both tables; local API introspection confirmed six elements |
| S03 | pending | engineer | — |
| S04 | pending | engineer | — |
| S05 | pending (∥ S03/S04) | engineer | — |
| R2 | pending | reviewer | — |
| S06 | pending (alone, G4 HITL) | validator | — |

## Session handoffs
Each session fills its own section only: result, commands run + outcome, files changed, deviations, open items. Keep it terse.
### G0
### S01
### S02
### R1
### G2
- **Factual status (2026-11-03, session-verified):** G2 is partially executed. Verified in this session: local Docker preflight passed; user explicitly confirmed; migration `product` 0211 applied; `storage_conditions` nullable varchar(250) verified on both `product_product` and `product_producttranslation`; local API GraphQL introspection confirmed the six elements in step 7. Not evidenced in this handoff (left unchecked or blank, not claimed): step 2 M-mode and probe values, step 3 `showmigrations` before-state, step 4 `sqlmigrate` review, the verbatim-confirmation and migrate timestamps, and the step 7 API restart/approval reference. Saleor/dashboard tests since added ran against the pytest test DB and jest only, not the shared local DB; they are not G2 evidence. Note: the status line above ("Implementation not started") predates working-tree changes in saleor and saleor-dashboard and is stale.
- Authorization on record (user, 2026-11-03): "Yes, I confirm the API and migration command use the same local database." Scope: local Docker dev DB only (compose `saleor-benchmark`, service `db`). Non-local or ambiguous target = prohibited → ABORT.
- Record per PLAN `### G2 — Local rollout protocol`, all required (sanitized; no user/password/URL/env):
  - [x] 1 local identity: compose project `saleor-benchmark`, `db` :5432, exactly one API container A on :8000 (local Docker preflight passed; per-item values not recorded here)
  - [ ] 2 M mode: `A itself` (0211 file present in A) / `host-uv`. Local-target probe in M:

    | Probe | cfg_host | cfg_port | cfg_name | db | srv_port |
    |---|---|---|---|---|---|
    | M (step 2) | | | | | |

    - Port rule: `cfg_port` = 5432, or empty/default **only if** `srv_port` = 5432 on the approved local Docker `db` server (step 1). Any other port or target → ABORT.
    - Verdict: PASS (local, unambiguous) / ABORT (reason):
  - [ ] 3 `showmigrations product` in M before: 0210 `[X]`, 0211 `[ ]`
  - [ ] 4 `sqlmigrate product 0211` reviewed: 2 nullable `ADD COLUMN`, nothing else
  - [ ] 5 verbatim confirmation given immediately before migrating, after steps 1–4 were shown: "Yes, I confirm the API and migration command use the same local database." + timestamp; migrate timestamp (user explicit confirmation and product 0211 applied are verified; confirmation/migrate timestamps and the steps 1–4 ordering are not recorded here)
  - [x] 6 after, in M: 0211 applied; `storage_conditions` varchar(250) NULL verified on `product_product` + `product_producttranslation`
  - [ ] 7 API restart (if any, approval ref — not recorded); [x] introspection confirmed six elements: Product / ProductTranslation / ProductTranslatableContent / ProductInput / TranslationInput `storageConditions` + ProductFieldEnum `STORAGE_CONDITIONS`
  - Abort reason (if aborted):
### S03
- Record: schema diff by declaration names (added / removed / changed). Translation fixtures handed to S04 (read-only from here). `defaultMessages.json` not touched.
### S04
- Record: `extract-messages` run (S03 + S04 strings). T-D7/T-D8 results.
### S05
### R2
### S06
- Record: AC-1…AC-14 evidence; G4 webhook created/removed.

## Active blockers
- None. The G2 same-database decision is resolved by user authorization (2026-11-03, local Docker dev DB only). The exact confirmation is still required immediately before migrating.

## Deferred decisions / non-blocking caveats
- Release coupling: dashboard `schema-main.graphql` and storefront typegen are ahead of released 3.23 until core ships (SPECS §10, arch R1/R2).
- CSV formula injection is pre-existing and out of scope (SPECS §11).
- `ADDED_IN_323` label is a release-line assumption (SPECS §14 I-3).
- Bulk-translate raw Django codes for other fields: pre-existing, not changed (SPECS §1).
- After the AC-13 run: keep or remove the G4 webhook (the user decides at G4).
- Rollback: a destructive backward migration needs G-RB approval. The `0211` file must outlive the core code revert (PLAN `## Rollback order`).

## Shared-resource writes log (shared local DB / runtime)
| When | What | Approved by | Undo |
|---|---|---|---|
| — | — | — | — |

## Common issues / solutions
- Local API code reload/restart mechanics are unknown (`docs/ASSUMPTIONS.md` WA-06). Resolve at G2 and record here.
- Async webhook delivery may run inline with no Celery worker (WA-05). This affects AC-13 timing only.
- Dashboard `schema.graphql` is a symlink. Verify there is no typechange after `fetch-local-schema`.
