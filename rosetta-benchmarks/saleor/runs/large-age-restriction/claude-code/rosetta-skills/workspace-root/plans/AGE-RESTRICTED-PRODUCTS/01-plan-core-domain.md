# 01 — Core data + domain
Depends on: 00. SPECS §3.1–3.4 (domain/audit signatures), §5, §4 error enums.
## Do
1. Model fields + 4 migrations exactly per SPECS §5; `CustomerEvents` consts/`CHOICES`; error-code members (Checkout, Order).
2. `account/age.py` pure helpers; `account/age_audit.py`; `checkout/age_restriction.py`; `order/age_restriction.py` per SPECS §3.2–3.4.
3. Domain unit tests (SPECS §7.1) incl. injected clock.
## Subagents
- engineer (long): implement + tests. reviewer (short): independent review vs SPECS.
## Rules
- No GraphQL here. Fixtures for new fields go in existing fixture modules.
- Birthday absent from `search_document` and `generate_customer_payload` (do not touch them).
## Done when
- `makemigrations --check` clean; domain tests green; ruff/mypy clean on touched files.
## Checklist
- [ ] Implemented  - [ ] Unit coverage >85% on new modules  - [ ] Edge cases (Feb 29, tz boundary) tested  - [ ] Migrations additive/db_default  - [ ] Security (no PII in messages/logs)  - [ ] Reviewed by non-author  - [ ] Handoff written
