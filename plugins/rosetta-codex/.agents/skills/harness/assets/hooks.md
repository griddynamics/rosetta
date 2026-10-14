<harness_hooks>

Lifecycle hooks for AI coding agents — Claude Code, Codex, Cursor, Copilot, Windsurf,
Antigravity, Devin. Code the agent runtime executes at fixed events, whatever the model decides.

Prompts persuade. Hooks enforce. Reach for a hook when the behavior must happen every time.

<capabilities>

- Intercept — inspect an action before it runs; allow, ask, or deny it with a reason.
- Rewrite input — replace the tool arguments before execution.
- Rewrite output — replace what the tool returned before the model sees it.
- Inject context — add text the model reads at session start, or after a tool runs.
- Observe — log invocations, arguments, timing, environment. No behavior change.

</capabilities>

<hook_or_prompt>

- Must happen every time, regardless of the model → hook.
- Needs judgment about the situation → prompt.
- Deterministic and cheap to compute → hook.
- The model keeps forgetting an instruction → hook, not a louder instruction.
- Blocking something dangerous → hook. A rule is advice; a hook is a gate.
- Guardrails a prompt cannot enforce on itself belong here.

</hook_or_prompt>

<contracts>

Every agent's wire contract differs, and the differences bite silently.

- Read the target agent's contract before writing anything:
  APPLY SKILL FILE `references/hooks/<agent>.md`.
  Available: `claude-code`, `codex`, `cursor`, `copilot`, `windsurf`, `antigravity`, `devin-cli`.
- Working configuration per agent, every event wired: `references/hooks/<agent>/hooks.json`.
- Each contract opens with a Practical Conclusions section — the non-obvious findings first,
  then a capability matrix marking what was verified against what is only documented.

Differences that cost the most time:
- Two independent block mechanisms per agent. Pick one per hook, never both.
- A post-execution event cannot block. The tool already ran.
- User-facing text and model-facing text are different fields. The wrong one reaches nobody.
- Structured output may be parsed only on one specific exit code.
- Validation strictness varies: one agent silently ignores stray fields, another fails the
  whole hook on a misplaced one.
- One agent has no structured-output channel at all and blocks by writing to stderr and exiting 2.

</contracts>

<evidence>

Raw invocation logs from live runs ship alongside each contract:
`references/hooks/<agent>-logs.txt`.

Never read one whole — they are megabytes. Grep for what you need:
- `hook_event_name` — every invocation and its event
- `INVOCATION:` — the full command line the runtime used
- `RAW` / `PARSED` — stdin as received, and as interpreted
- `RESULT:` — what the hook returned and its exit code
- `PROCESSOR:` — which branch of the test hook ran
- `ENV:` / `CWD:` / `ARGV:` — what the runtime supplied

Use them to settle a question the contract leaves open, never as a first read.

</evidence>

<testing>

`scripts/tester.js` is a universal dump-first hook. Wire it to any event on any agent and it
records the full invocation before parsing anything, then emits the shape you asked for.

- `--mode <agent>` emits that agent's exact output shape.
- `--deny-on-match`, `--rewrite-command`, `--exit-code`, `--block-stop-once` exercise one
  behavior at a time.
- `--tag` labels the invocation so it is greppable in the log.

Discover an undocumented contract by wiring it and reading what arrives.
It writes to `~/.rosetta/hooks.log` and dumps every environment variable — that log will
contain any secret present in the hook environment. USE SKILL `sensitive-data` before
sharing, storing, or committing it.

</testing>

<safety>

- A hook runs on every matching event. Slow means slow for the whole session.
- A crashing or hanging hook can block all work. Set a timeout; fail open unless the hook
  exists to block.
- A hook receives file contents and command arguments. Treat that as untrusted input.
- A hook that blocks silently is indistinguishable from a broken agent. Always return a reason.
- Hook config is executable configuration. It runs with the developer's own privileges.

</safety>

<proof>

- Wire it, trigger the event, and read the log for the invocation.
- Prove the deny: attempt the blocked action; the agent must report the block and the reason.
- Prove the allow: the unmatched case still runs.
- Prove the rewrite: the executed command differs from the requested one.
- Prove injected context reaches the model — ask the model to repeat a planted marker.
- Prove it on every agent claimed as supported. The contract differs per agent.
- Configured but never fired = not delivered.

</proof>

</harness_hooks>
