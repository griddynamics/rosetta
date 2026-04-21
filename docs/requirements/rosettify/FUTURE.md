# Future Commands — Starting Requirements

Requirements TBD. Starting points from user input for future batches.

## FR-INST-0001 install (Placeholder)

<req id="FR-INST-0001" type="FR" level="System">
  <title>Install Rosetta for specified coding agents</title>
  <statement>rosettify install SHALL accept one or more coding agent names (comma-separated or space-separated) and install Rosetta configuration in the current repository for those agents. Example: rosettify install windsurf,claudecode. This is a human-friendly command (not AI-first).</statement>
  <rationale>User request</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Draft</status>
  <notes>Full requirements in future batch. Human-friendly (not AI-first).</notes>
</req>

## FR-INST-0002 uninstall (Placeholder)

<req id="FR-INST-0002" type="FR" level="System">
  <title>Uninstall Rosetta from current repository</title>
  <statement>rosettify uninstall SHALL remove Rosetta configuration from the current repository for specified coding agents. This is a dangerous command — requires --force flag (FR-ARCH-0015). This is a human-friendly command.</statement>
  <rationale>Counterpart to install. Destructive action requires explicit confirmation.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Draft</status>
  <notes>Full requirements in future batch. Human-friendly (not AI-first).</notes>
</req>

## FR-INST-0003 upgrade (Placeholder)

<req id="FR-INST-0003" type="FR" level="System">
  <title>Upgrade Rosetta in current repository</title>
  <statement>rosettify upgrade SHALL upgrade Rosetta configuration in the current repository to the latest version. This is a human-friendly command.</statement>
  <rationale>User request</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Draft</status>
  <notes>Full requirements in future batch. Human-friendly (not AI-first).</notes>
</req>

## FR-GEN-0001 generate plugin (Placeholder)

<req id="FR-GEN-0001" type="FR" level="System">
  <title>Generate Rosetta plugin artifacts</title>
  <statement>rosettify generate plugin SHALL generate special artifacts (hooks, rules, skills, subagents, commands, workflows) for coding agents. Related to existing plugin_generator.py (in a different branch).</statement>
  <rationale>User request</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Draft</status>
  <notes>Full requirements in future batch. plugin_generator.py exists in separate branch as reference.</notes>
</req>

## FR-UX-0001 Human Progress Feedback (Placeholder)

<req id="FR-UX-0001" type="FR" level="System">
  <title>Identify if human-friendly commands need progress feedback</title>
  <statement>Evaluate whether human-friendly commands (install, uninstall, upgrade) need progress feedback (e.g., to stderr). Currently all commands produce no intermediate output (FR-ARCH-0009). If progress is needed, define the mechanism in a future batch.</statement>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Could</priority>
  <status>Draft</status>
  <notes>AI-first is primary. Human usage is secondary. Evaluate during implementation of install/uninstall/upgrade.</notes>
</req>

## FR-HOOK-0001 handle hook (Placeholder)

<req id="FR-HOOK-0001" type="FR" level="System">
  <title>Handle IDE hook events</title>
  <statement>rosettify handle hook SHALL process IDE hook events (SessionStart, before tool call, after tool call, after file edit, etc.) to integrate Rosetta into coding agent lifecycle. Example: rosettify handle hook SessionStart. Today only plan and help commands are handled.</statement>
  <rationale>User request</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Draft</status>
  <notes>Full requirements in future batch. Initially only plan and help commands handled via hooks.</notes>
</req>
