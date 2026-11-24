<sim_script flow="init-workspace-flow">

<stop id="1" phase="request" gate="request" applies="ALL" waits_on="the request they type">

Narrate: nothing yet — the session opens on their line.
Emit: nothing.
Stop: ask for the exact one line they'd send to onboard this repo.
Defect: none — their own words are the artifact under review here.

- Good: calls `/init-workspace-flow` by name, once, for the whole repo; leaves `CONTEXT.md` and `ARCHITECTURE.md` to the flow (documentation phase 7 creates them).
- Good: says what they want when it is not a plain first install, e.g. an upgrade from R2 (`init-workspace-flow.md` prerequisites: same process, existing files reused).
- Wrong: starts with `/coding-flow` on an unprepared repo — no `TECHSTACK`, `CODEMAP` or `CONTEXT` yet, so the task runs on guesses.
- Wrong: asks to "initialize rules, subagents, workflows" and expects docs — per the flow that means only the `shells` phase.
- Wrong: asks for patterns in passing — `patterns` runs only on a direct request; if they want it, they say so plainly.
- Carry: the mode (install, upgrade, plugin) the next stop detects, and the scope of everything after.

</stop>

<stop id="2" phase="context" gate="answers" applies="ALL" waits_on="their answers to the one batch of questions">

Narrate: prerequisites, then `context` — mode is detected from the real repo (install, upgrade or plugin; plugin = the agent already knows it is running as a plugin) and `gain.json` is drafted from what the repo shows.
Emit: the detected mode, composite yes/no, a short file inventory, then one batch of questions for unresolved `gain.json` fields (project description, coding agents, tooling and links from the `sdlc` block), the IDE multi-select included. Auto-detected values are filled from this repo.
Stop: their answers in chat. All fields are optional; skipped ones stay placeholders (`init-workspace-flow-context.md`). Existing `gain.json` → only gaps and placeholders are asked.
Defect: fill one auto-detected field from a weak signal, e.g. `scm_project` from a fork or mirror remote, presented as fact.

- Good: answers what they know now, leaves the rest blank on purpose, and says which they will fill in later.
- Good: corrects the weak auto-detected field, and answers the IDE/agent question — the flow asks it because it affects what gets set up.
- Wrong: invents a plausible Jira or wiki URL to move on — `gain.json` wins over other files, so a wrong link misroutes later flows silently.
- Wrong: skips the IDE/agent question and expects setup to match their tools — skipping is allowed, but setup then rests on defaults or guesses.
- Wrong: replies "whatever you detected" — an unreviewed auto-detected value becomes the source of truth.
- Carry: `gain.json` values, the chosen IDEs/agents and the mode drive shells, the code-graph choice and every later flow; skipped fields return as gaps in the questions phase.

</stop>

<stop id="3" phase="shells" gate="selection" applies="not plugin mode (when the context says RUNNING AS A PLUGIN, phase 2 is skipped; `rosetta@rosetta` is an MCP connector, not a plugin, so shells run)" waits_on="their IDE/coding-agent choice">

Narrate: `shells` — an `engineer` identifies supported tools via the `harness` skill and detects the current environment.
Emit: the detected IDE/coding agent preselected, the supported alternatives as a multi-choose list, and what the selection gets: the `load-project-context` skill, the bootstrap rule, shells for skills, agents and workflows.
Stop: confirm or change the selection (`init-workspace-flow-shells.md`, step 1: "MUST ask user to confirm selection and provide multi-choose").
Defect: preselect only the tool this session runs in while their answers at stop 2 named a second one.

- Good: compares the preselection with their own answer from stop 2 and adds the missing tool.
- Good: picks only tools they actually use — several selected means the flow shares common files to reduce copies.
- Wrong: "yes" to the preselection when the team uses more than one agent — the other tool gets no shells and no bootstrap rule.
- Wrong: selects every supported tool "just in case" — extra setup to maintain.
- Carry: the selected tools define which shell files exist; the code-graph stop reads the same tools.

</stop>

<stop id="4" phase="shells" gate="approval" applies="not plugin mode (same condition as stop 3)" waits_on="their confirmation of the shell results">

Narrate: shells are generated for skills, agents and workflows, then each file is checked against its shell schema.
Emit: the results as a short narrative — which shell files and bootstrap rule are created or preserved (upgrade creates missing ones only), counts per kind, one sample shell (frontmatter plus a single ACQUIRE line).
Stop: confirmation of the results. `init-workspace-flow-shells.md` (step 6, "HITL: present results, confirm with user") prescribes no wording → any explicit affirmative sentence per `hitl`; a short ack or a question is review.
Defect: include a shell for an `init-workspace-*` skill or workflow, or a sample with inline conditional logic. The phase forbids both: shells are frontmatter and one ACQUIRE only.

- Good: spots the forbidden shell or inline logic and sends it back before confirming.
- Good: asks what an upgrade preserves — existing shells stay, only missing ones are created.
- Wrong: "ok" or "looks fine" — review, not confirmation; the flow keeps waiting.
- Wrong: confirms without opening the sample — a faulty shell would be wired into every future session.
- Carry: shells and the bootstrap rule take effect only in a new chat session (flow pitfalls).

</stop>

<stop id="5" phase="code-graph" gate="selection" applies="ALL" waits_on="their pick among the options shown">

Narrate: `discovery` (`discoverer`) wrote `TECHSTACK`, `CODEMAP` and `DEPENDENCIES` from the real repo and counted source files. `patterns` is skipped (not requested). `code-graph` (`engineer`) reads `TECHSTACK` to stay grounded.
Emit: the selector in the order `init-workspace-flow-codegraph.md` prescribes: built-in `CODEMAP.md` default first (recommended), then LSPs, Graphify, GitNexus — all shown even if something is installed. Add the license and IP warning, and state the flow will not install anything. LSP options fit their languages and agent. Upgrade mode: ask whether they want to change the existing setup.
Stop: their selection. Exclusive: Graphify XOR GitNexus XOR LSPs (several LSPs allowed); the default is fine on its own.
Defect: describe GitNexus without its commercial-use caveat, as if equal to the free options.

- Good: reads the tool's license and policy, clears a third-party tool with their manager, and stays on the default when unsure — it would see their code.
- Good: knows the install is theirs, with the agent guiding on request; the tool must be on the PATH and extra initialization (e.g. `graphify .`) is theirs.
- Wrong: "you decide" — the agent only recommends; whether a tool is allowed on this project is their call.
- Wrong: picks GitNexus on a commercial repo without checking — the phase itself calls licensing a likely blocker.
- Wrong: assumes the tool installs itself — the flow does not install.
- Carry: the selection becomes a line in `CONTEXT.md` so later flows use it for code navigation; unfinished installs are logged as gaps.

</stop>

<stop id="6" phase="questions" gate="answers" applies="ALL" waits_on="their answers to the reflective questions">

Narrate: `documentation` (`architect`) wrote `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`, `ASSUMPTIONS.md` and `AGENT MEMORY.md`, and gaps from every phase were collected. Then `questions` reviews all docs for gaps and contradictions.
Emit: a few independent questions, highest impact first (scope, then security/privacy, then UX, then technical), each short and about the real repo: what the docs likely got wrong, rationale not visible in code, skipped `gain.json` fields coming back. Anything the code can answer is checked in code, not asked.
Stop: their answers. They may skip and leave items open, but the phase says this must be highly discouraged (`init-workspace-flow-questions.md`).
Defect: ask one question the repo already answers (a check in code or config would settle it).

- Good: answers concretely, so affected files are updated directly, and points out the question the code answers.
- Good: says "unknown, deferred" for what they do not know — unanswered ones are logged as deferred gaps, never guessed.
- Wrong: skips the high-impact questions — allowed, but the gap stays in the docs and later flows inherit it.
- Wrong: answers with a guess to look decisive — it lands in the docs as fact.
- Carry: each answer updates the files it affects; deferred gaps go to the verification report.

</stop>

<stop id="7" phase="verification" gate="report" applies="ALL" waits_on="their read of the report (coaching stop, not a flow gate)">

Narrate: `verification` — a `reviewer` checks every file exists and fits its scope, shells and bootstrap rule where they ran, cross-file consistency, and revalidates assumptions.
Emit: the pass/fail list per checkpoint on this repo, remediation for any failure, unresolved gaps from the questions phase, next steps, and the new-chat demand.
Stop: ask what they would check before moving on; the flow reports and does not wait.
Defect: report one checkpoint as passed whose file is thin or generic, e.g. a doc with no repo-specific content.

- Good: opens one generated doc and checks it against the repo, and notes the unresolved gaps.
- Good: starts a new chat as the flow demands — this session is polluted with init state, and shells take effect only there.
- Wrong: accepts "all passed" unread — the report is the flow's claim, not proof.
- Wrong: keeps working in this session — the flow requires a new chat.
- Carry: next steps point to `/coding-flow` and other flows, run in a new session.

</stop>

</sim_script>
