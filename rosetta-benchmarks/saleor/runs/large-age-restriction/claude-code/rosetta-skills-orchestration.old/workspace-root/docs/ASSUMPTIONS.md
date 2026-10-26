# ASSUMPTIONS (workspace registry)

Purpose: cross-repo unknowns and unverified beliefs that affect more than one service; each points to the doc that must change once resolved.
Content: only items spanning repos or the local runtime. Repo-level assumptions stay in each repo's `docs/ASSUMPTIONS.md` (indexed below, not copied).
Style: one `###` per entry `WA-NN <title> [OPEN|RESOLVED <date>]`; bullets: Assumption, Confidence (high|medium|low), Evidence, Resolve in. Grep `\[OPEN\]`. Revalidate after other docs change.

## Template
### WA-NN <short title> [OPEN|RESOLVED YYYY-MM-DD]
- Assumption: <what is believed>
- Confidence: <high|medium|low>
- Evidence: <workspace-relative path / observation, or "none">
- Resolve in: <target file + section>

## API contract and schema
### WA-01 Storefront webhook revalidation needs deprecated `secretKey` or a Bearer header [OPEN]
- Assumption: core signs with JWS unless the webhook has `secretKey` (deprecated since 3.5); storefront verifies HMAC hex only, so a default webhook passes only via custom header `Authorization: Bearer <REVALIDATE_SECRET>`.
- Confidence: high (code), deployment intent unknown.
- Evidence: `saleor/saleor/webhook/transport/__init__.py` `signature_for_payload`; `react-storefront/src/lib/api-auth.ts` `verifyWebhookSignature`; `react-storefront/src/app/api/revalidate/route.ts` POST.
- Resolve in: `ARCHITECTURE.md` `## Webhooks and apps`; repo item `../react-storefront/docs/ASSUMPTIONS.md` A12.

### WA-02 Dashboard 3.23.39 is compatible with core 3.23.41 [OPEN]
- Assumption: same release line, no client-breaking change between the pins.
- Confidence: high for schema declarations (type/input/enum names identical), medium for field arguments and behavior (not diffed field by field).
- Evidence: declaration diff `saleor/saleor/graphql/schema.graphql` vs `saleor-dashboard/schema-main.graphql` empty on 2026-10-21; `saleor-dashboard/package.json` `config.saleor.schemaVersion` 3.23.
- Resolve in: `ARCHITECTURE.md` `## Schema and codegen coupling`.

### WA-03 Storefront has no recorded API version [OPEN]
- Assumption: storefront types reflect whatever API answered at last `generate:all`; its CI uses the latest Saleor release schema, possibly newer than local 3.23.x.
- Confidence: high (no committed schema), impact unknown.
- Evidence: `react-storefront/.graphqlrc.ts`, `react-storefront/.github/workflows/update_types.yml`.
- Resolve in: `ARCHITECTURE.md` `## Schema and codegen coupling`; `TODO.md`.

### WA-04 Dashboard staging schema = some snapshot of core `main` [OPEN]
- Assumption: `schema-staging.graphql` came from core `main` (per `fetch-schema:staging`); fetch date unknown, so it may lag or lead local core.
- Confidence: medium.
- Evidence: `saleor-dashboard/package.json` scripts; 20 removed / 3 added declarations vs core 3.23.41.
- Resolve in: `ARCHITECTURE.md` `## Schema and codegen coupling`.

## Local runtime
### WA-05 No Celery worker locally; tasks and async webhooks run inline [OPEN]
- Assumption: no broker configured for the local API, so async webhooks (incl. storefront revalidation) deliver inside the request. Unverified; the unexplained container `saleor-benchmark-saleor-1` (no published ports) might run workers.
- Confidence: low (env files not read; only absence of a separate Celery container observed).
- Evidence: `docker ps` 2026-10-21 (no Celery container); `../saleor/docs/ARCHITECTURE.md` `## Process model`.
- Resolve in: `ARCHITECTURE.md` `## Local runtime`.

### WA-06 Local stack recipe is not recorded [OPEN]
- Observed 2026-10-21: containers `saleor-benchmark-api` :8000, postgres 15 :5432, valkey :6379, mailpit :1025/:8025, `saleor-benchmark-saleor-1` (no ports, role unknown); Node servers :9000 (dashboard dev), :3000 (storefront dev).
- Assumption (unverified): API container started ad hoc from the devcontainer image. Start commands and dashboard `API_URL` unknown. `seed.dump` is sample data, reference only; no restore rule.
- Confidence: medium (container labels, `logs/storefront.log` shows `http://localhost:8000/graphql/`); dashboard target unverified.
- Evidence: compose labels -> `saleor/.devcontainer/docker-compose.yml`; `logs/*.log`.
- Resolve in: `ARCHITECTURE.md` `## Local runtime`; `../README.md`.

### WA-07 Local core is provisioned for the storefront [OPEN]
- Assumption: local data has the storefront's default channel, an App + token for `SALEOR_APP_TOKEN`, payment apps (Stripe/Dummy) and a webhook to `http://localhost:3000/api/revalidate`.
- Confidence: low (only channel queries observed succeeding in the log).
- Evidence: none beyond `logs/storefront.log` 200 responses.
- Resolve in: `ARCHITECTURE.md` `## Local runtime`.

### WA-08 Local emails go to Mailpit [OPEN]
- Assumption: core `EMAIL_URL` points to Mailpit SMTP :1025, so account/order emails are viewable at :8025.
- Confidence: low (env not read).
- Evidence: Mailpit container in `saleor/.devcontainer/docker-compose.yml`; `saleor/saleor/settings.py` `EMAIL_URL`.
- Resolve in: `ARCHITECTURE.md` `## Local runtime`.

## Documentation
### WA-09 Shared domain terms are owned by core [OPEN]
- Assumption: `../saleor/docs/CONTEXT.md` glossary is canonical for shared concepts; repo glossaries only add local terms. Dashboard keeps a human-owned root glossary (`saleor-dashboard/CONTEXT.md`).
- Confidence: medium (workspace decision, not confirmed by owners).
- Evidence: `saleor-dashboard/CONTEXT.md` (human-owned, dashboard-canonical); saleor A-01.
- Resolve in: `CONTEXT.md` `## Term owners`.

## Repo-level items with cross-repo impact (links only)
- saleor A-12 staff channel restriction scope, A-13 "Models" vs Page, A-16 storefront guard and inactive apps: `../saleor/docs/ASSUMPTIONS.md`.
- dashboard "UI permission gates mirror the API's enforcement", "No shipped image builds the staging schema": `../saleor-dashboard/docs/ASSUMPTIONS.md`.
- storefront A3 network to a Saleor API for codegen/lint, A11 single-channel listing busting, A12 webhook signature: `../react-storefront/docs/ASSUMPTIONS.md`.
