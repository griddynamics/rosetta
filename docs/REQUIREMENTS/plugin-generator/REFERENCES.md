# plugin-generator — References (Authoritative IDE Configuration Docs)

Any coding agent working on, or consuming, these requirements must treat the per-IDE guides under `instructions/r3/core/skills/harness/references/configure/` as the authoritative source for each supported IDE's plugin / subagent / skill / command / rule / hook structure, conventions, and external links. Per-target behavior in these requirements is grounded in those guides; when in doubt, the guide wins for that IDE's format.

## Supported IDEs and their guides

| IDE | Guide | Documents |
|---|---|---|
| Claude Code | `instructions/r3/core/skills/harness/references/configure/claude-code.md` | Commands, subagents, skills, plugins, rules, structure |
| Cursor | `instructions/r3/core/skills/harness/references/configure/cursor.md` | Rules, subagents, skills, commands, file structure |
| GitHub Copilot | `instructions/r3/core/skills/harness/references/configure/github-copilot.md` | Agents, skills, prompts, plugins, instructions |
| Codex | `instructions/r3/core/skills/harness/references/configure/codex.md` | Subagents, skills, rules, hooks, structure |
| Antigravity | `instructions/r3/core/skills/harness/references/configure/antigravity.md` | IDE configuration conventions |
| JetBrains Junie | `instructions/r3/core/skills/harness/references/configure/jetbrains-junie.md` | IDE configuration conventions |
| OpenCode | `instructions/r3/core/skills/harness/references/configure/opencode.md` | IDE configuration conventions |
| Windsurf | `instructions/r3/core/skills/harness/references/configure/windsurf.md` | IDE configuration conventions |

The generator produces targets for a subset of these IDEs — `claude`, `cursor`, `copilot`, `codex`, their two standalones, and `antigravity`; the guides cover the broader set of IDEs Rosetta intends to support. The guides are reference material of the `harness` skill and ship inside whichever plugin set owns that skill; they are not a plugin folder of their own. They must be emitted verbatim, never reference-rewritten, because each documents another IDE's on-disk layout (FR-ARCH-0049).

## Requirements

<req id="INT-IDE-0001" type="INT" level="System" ticketId="315" classification="technical">
  <title>Consult the authoritative IDE guide before encoding target behavior</title>
  <statement>When implementing, modifying, or consuming these requirements, the agent shall consult the corresponding `instructions/r3/core/skills/harness/references/configure/<ide>.md` guide before encoding or changing a target's plugin, subagent, skill, command, rule, or hook behavior.</statement>
  <rationale>IDE conventions change and are owned by those guides; deriving target behavior from them prevents drift and incorrect formats.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a change to a target's structure or hook behavior When: proposed Then: it is traceable to the corresponding IDE guide.</criteria>
    <criteria>Given: a target whose guide is absent When: implementation is attempted Then: the agent stops and raises the missing guide rather than guessing the IDE format.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: instructions/r3/core/skills/harness/references/configure/ holds the per-IDE guides for all
  8 supported IDEs (antigravity, claude-code, codex, cursor, github-copilot, jetbrains-junie, opencode,
  windsurf), which is the structural precondition this unit depends on - a guide exists at the documented
  path and is available to be consulted. The behavioural clause is a process mandate for agent conduct
  rather than code-verifiable behaviour, consistent with verification=Inspection.</implementationNotes>
</req>

<req id="INT-IDE-0002" type="INT" level="System" ticketId="315" classification="technical">
  <title>Guides are authoritative for layout, frontmatter, and bootstrap capability</title>
  <statement>For each supported IDE, the agent shall treat its guide as the authoritative source for that IDE's required file layout, frontmatter fields, and bootstrap-delivery capability — including whether the IDE natively auto-loads rules or instructions versus requiring session-start hooks — and for relevant external links.</statement>
  <rationale>The bootstrap-delivery strategy and structural shape of each target derive directly from each IDE's documented capabilities.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a target's bootstrap-delivery strategy When: determined Then: it matches the capability documented in that IDE's guide.</criteria>
    <criteria>Given: a target's file layout or frontmatter When: produced Then: it conforms to that IDE's guide.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the same guide directory, instructions/r3/core/skills/harness/references/configure/, is
  confirmed present and is the authoritative reference this unit points at. Spot-checked that the cursor
  guide's hook documentation matches shipped behaviour, neither Cursor hook template carrying a
  bootstrap placeholder.
  Verification is Inspection; no contrary evidence found.</implementationNotes>
  <depends>INT-IDE-0001</depends>
</req>

<req id="INT-IDE-0003" type="INT" level="System" ticketId="315" classification="technical">
  <title>New IDE support starts from its guide</title>
  <statement>When adding a new IDE target, the agent shall first obtain or author that IDE's guide under `instructions/r3/core/skills/harness/references/configure/` and derive the target's descriptor from it. Adding a plugin set is a different act and requires no guide: a set changes which instruction folders compose a plugin, not the IDE format the plugin is written in, so it is a plugin-set configuration edit alone (FR-SET-0001, DATA-CFG-0007).</statement>
  <rationale>Keeps the configuration-driven design grounded: a target is defined by documented IDE conventions, not ad-hoc assumptions.</rationale>
  <source>User</source>
  <priority>Should</priority>
  <status>Approved</status>
  <approved_by>isolomatov-gd</approved_by>
  <changed>2026-09-01</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a request to add a new IDE target When: started Then: the IDE's guide exists and the descriptor traces to it.</criteria>
    <criteria>Given: a request to add a plugin set When: started Then: no IDE guide is required and the change is confined to the plugin-set configuration.</criteria>
  </acceptance>
  <implementation>Implemented</implementation>
  <implementationNotes>Implemented: the guide directory instructions/r3/core/skills/harness/references/configure/ is present
  and is the authoritative location this unit's process requires; nothing in the shipped code contradicts
  it. Verification is Inspection.</implementationNotes>
  <depends>INT-IDE-0001</depends>
</req>
