<arrangement_workspace_choose_workspace_layout>

<description_and_purpose>
Show the workspace layout options verbatim, help the user pick one, and guide its setup actions.
</description_and_purpose>

<workflow_context>
Phase 1 of 6 in `arrangement-workspace-flow`. Decision + guided setup. Option 1's `refsrc/` onboarding happens next, in the Reference Source Code phase.
</workflow_context>

<phase_steps>
1. Show layout options
2. Ask the user to pick one
3. Guide the picked option's setup actions
4. Record the choice
</phase_steps>

<present_layouts step="1.1">
1. Show the user the content in `layout_guidance` EXACTLY as written.
</present_layouts>

<layout_guidance compact="NEVER" summarize="AS-IS">

### Choose a Workspace Layout

Pick the layout that fits your project. These options apply to any multi-repository project — regular development, microservices, or modernization:

1. Single Repo Workspace is the most useful when changes are implemented independently on each repository: single code change, single PR.
2. Composite Workspace is the most useful when changes are spread across multiple repositories (feature implementation end-to-end): multiple code changes, multiple PRs.

**Option 1 — Single Repo Workspace.** The workspace is a single, writable repository. AI agents can only write to this repository. All other codebases the agent needs to read are brought in via `refsrc/` as read-only references. This is the simplest option and the recommended starting point.

```
<new git repo root>
├── docs/
│   ├── ARCHITECTURE.md   # main service architecture and goals
│   └── CONTEXT.md        # main service business context
├── refsrc/
│   ├── <old code>/       # read-only: legacy codebase
│   ├── microservice2/    # read-only: peer service API reference
│   ├── shared-lib/       # read-only: corporate shared library
│   └── frontend/         # read-only: UI codebase for reference
└── <new code>
```

Setup actions:

- Open the repository in your IDE.
- Clone any read-only reference codebases into `refsrc/` as subfolders.
- Initialize Rosetta.

---

**Option 2 — Composite Workspace with Submodules.** A top-level envelope repository holds each sub-repository as a git submodule. This integrates cleanly with standard git tooling and avoids manual gitignore maintenance. This layout needs the `large-workspace-handling` skill.

```
<workspace git repo>
├── docs/
│   ├── ARCHITECTURE.md   # index: technical purpose of each sub-repo
│   └── CONTEXT.md        # index: business purpose of each sub-repo
├── <old repo>/            # git submodule — e.g. old-app
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── <new repo>/            # git submodule — e.g. new-app
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── microservice1/         # git submodule
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── frontend/              # git submodule
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
└── shared-lib/            # git submodule
    ├── docs/ARCHITECTURE.md
    ├── docs/CONTEXT.md
    └── <source files>
```

Setup actions:

- Create a new empty git repository to serve as the composite workspace envelope.
- Request AI to add each sub-repository (code, infra, QA, frontend, shared libraries, etc.) as a git submodule and clone them into the envelope.
- Initialize Rosetta in the envelope workspace, telling it this is a composite workspace and that `ARCHITECTURE.md` must record that submodules are used for dynamic and optionally sparse-checkout.
- Development teams can then use sparse-checkout on modules and/or they can select submodules they need.
- AI can dynamically check out a missing submodule at any point: `git submodule update --init <name>`.

---

**Option 3 — Composite Workspace with gitignore.** A top-level folder holds all repositories as plain directories. Each sub-repo folder is excluded from the envelope's git tracking via `.gitignore`. The downsides: the workspace must be tracked in git, and `.gitignore` and doc routing need ongoing care. This layout needs the `large-workspace-handling` skill.

```
<workspace git repo>
├── docs/
│   ├── ARCHITECTURE.md   # index: technical purpose of each sub-repo
│   └── CONTEXT.md        # index: business purpose of each sub-repo
├── <old repo 1>/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── <old repo 2>/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── <new repo>/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── microservice1/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── frontend/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
└── .gitignore             # excludes the cloned repo folders
```

Setup actions:

- Create a new empty git repository to serve as the composite workspace envelope.
- Clone each sub-repository (code, infra, QA, frontend, shared libraries, etc.) into the envelope as a plain folder.
- Add each cloned folder to `.gitignore` so it is excluded from the envelope's git tracking.
- Initialize Rosetta in the envelope workspace, telling it this is a composite workspace.

</layout_guidance>

<choose_and_setup step="1.2">
1. USE SKILL `hitl`.
2. Ask the user which option fits.
3. If the project already has evidence of a chosen layout (existing submodules, existing `refsrc/`), confirm it rather than re-asking.
4. If Option 2 or 3 is chosen: USE SKILL `large-workspace-handling`.
</choose_and_setup>

<apply_setup step="1.3">
1. Guide the user through the chosen option's `Setup actions` from `layout_guidance`, exactly.
2. If Option 1 was chosen: tell the user `refsrc/` reference code is onboarded next, in the Reference Source Code phase — do not clone into `refsrc/` here.
3. Record the chosen layout (option number and name, for example `Option 1 - Single Repo Workspace`) in `arrangement-state.md`.
</apply_setup>

<validation_checklist>
- Layout options shown to the user verbatim, unabridged.
- That option's setup actions were completed, or explicitly deferred with a reason.
- `arrangement-state.md` records the chosen layout.
</validation_checklist>

<pitfalls>
- Rephrasing or summarizing `layout_guidance` instead of showing it verbatim.
- Skipping `large-workspace-handling` skill for Option 2/3.
- Cloning into `refsrc/` here — that's the Reference Source Code phase's job.
</pitfalls>

</arrangement_workspace_choose_workspace_layout>
