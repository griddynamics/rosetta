# Phase 3: Specialist Docs (When Needed)

These are valid document ideas but should only be created when there's active demand. Creating them now adds maintenance burden without clear readers.

Each entry states what's valuable about the idea and the trigger for when to create it.

---

## `INSTALLATION.md` — Full setup reference

**Good point:** Useful when setup complexity exceeds what QUICKSTART covers (multiple OS, compatibility matrix, environment variables).
**Premature because:** Current install is `uvx` + MCP config. The website already has comprehensive IDE-specific setup tabs. Creating a separate INSTALLATION.md now risks duplicating the website and QUICKSTART.
**Create when:** Setup genuinely fragments across environments.

---

## `docs/DEVELOPERS-QUICKSTART.md` — Contributor setup

**Good point:** Separating "user setup" from "contributor setup" is conceptually clean.
**Premature because:** Creates a duplication trap with QUICKSTART.md. A "Development Setup" section in `DEVELOPER_GUIDE.md` handles this until contributor setup is complex enough to warrant its own doc.
**Create when:** Contributor setup diverges significantly from user setup.

---

## `PLUGINS.md` — Extension surface

**Good point:** Plugin model, lifecycle, testing, compatibility.
**Premature because:** Plugin surface is early. A section in `docs/TOOLS.md` or `DEVELOPER_GUIDE.md` suffices until the plugin API stabilizes.
**Create when:** External plugin authors exist.

---

## `docs/PERFORMANCE.md` — Performance model

**Good point:** Performance goals, benchmarks, profiling guidance.
**Premature because:** No contributors are asking for this yet. The reference material in `refsrc/tools/PERFORMANCE.md` covers operational benchmarks, not contributor guidance.
**Create when:** Performance becomes a contributor concern.

---

## `docs/RAGFLOW.md` — RAG design and operations

**Good point:** Retrieval/indexing is core to Rosetta's value.
**Premature because:** This is infrastructure-internal. Most contributors don't need to understand RAG internals to contribute.
**Create when:** RAG contributions become a documented workflow.

---

## `docs/IMS-MCP-V2-INFRASTRUCTURE.md` — Infrastructure reference

**Good point:** Important for operators and infrastructure contributors.
**Premature because:** Very deep, very narrow audience. Keep deep-linked from ARCHITECTURE.md, not surfaced in main doc tree.
**Create when:** External infrastructure contributors exist.

---

## `docs/r1-destination-mapping.md` — Mapping design doc

**Good point:** Useful as a specialist design reference.
**Premature because:** One-time design doc. If needed, create as a design doc in a `docs/design/` folder, not as a primary doc.
**Create when:** Mapping design needs external contributor input.

---

## `docs/baseline.md` — Baseline behavior reference

**Good point:** Useful for understanding expected outputs.
**Premature because:** Name and concept are vague even in the reference material. Needs clearer framing before creating an audience-facing version.
**Create when:** Baseline testing becomes a contributor workflow.

---

## `docs/core.md` — Core module internals

**Good point:** Implementation-centric guide for core contributors.
**Premature because:** Reference source (`refsrc/patterns/core.md`) is more of a prioritized roadmap than a module guide. Needs reframing.
**Create when:** Core module has stable enough internals to document.
