# 07 — Validation, docs, acceptance
Depends on: 05, 06. Runs alone. G2 before start.
## Do
1. Validator subagent runs SPECS §7.5 end-to-end on isolated stack (core + dashboard + storefront); evidence (screens/outputs, no birthday values in reports).
2. Re-run all three repos' full gates once more.
3. Update workspace `docs/CONTEXT.md`, `docs/ARCHITECTURE.md` (cross-repo rules), repo docs, `agents/IMPLEMENTATION.md`, `agents/MEMORY.md`.
4. Traceability table decisions D1–D16/C1–C2 → tests/evidence in `HANDOFF.md`; user acceptance (G-final).
## Subagents
- validator (long, independent of implementers); reviewer (short).
## Done when
- Every SPECS §7 row has evidence or an approved waiver; user accepts.
## Checklist
- [ ] Manual QA by non-author  - [ ] All gates green  - [ ] Traceability complete  - [ ] Docs updated  - [ ] Isolated stack stopped, temp data removed  - [ ] G-final approved
