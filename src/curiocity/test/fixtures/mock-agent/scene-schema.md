# Mock-agent scene script (§10.3)

A scene is a JSON file: an ordered list of steps the mock TUI executes. It is a
plain Node script (`index.mjs`) with **no dependencies** so it runs from the repo
under a real PTY exactly like a registered agent.

The mock TUI itself writes the ctrl files the canonical hooks would (§5.2):
`session-start.json` (once, at start) and appends to `stop.jsonl` per `stop` step —
paths come from `MOCK_SESSION_START` / `MOCK_STOP` env (set by `MockAdapter.renderHooks`).
It writes its own transcript dialect (JSONL) to `MOCK_TRANSCRIPT`.

```jsonc
{
  "banner": "MOCK READY",              // printed first; the readiness bannerPattern
  "steps": [
    { "type": "print", "text": "..." },              // emit output to the screen + transcript(assistant)
    { "type": "tool", "name": "Bash", "text": "..." },// emit a tool_call event (trajectory only)
    { "type": "file", "path": "out.txt", "text": "hello world" }, // create a workspace file
    { "type": "structured-question",                  // pending structured question (no Stop)
      "question": "Which framework?", "options": ["a","b"] },
    { "type": "await-input", "record": "free-text" }, // block on stdin (the harness's typed reply)
    { "type": "stop", "message": "Done.", "kind": "done" },  // append stop.jsonl (turn signal)
    { "type": "spin", "ms": 3000 },                   // repaint a changing spinner (never freezes)
    { "type": "freeze", "ms": 3000 },                 // emit nothing, grow nothing (freeze watchdog)
    { "type": "sleep", "ms": 100 },
    { "type": "exit", "code": 0 }                     // exit with a code (0 clean, non-0 crash)
  ]
}
```

`stop.kind`: `done` → turn is final; `working` → continuation (carries `working:true`
so the adapter classifies it deterministically); omitted → free-text (the harness's
fast model classifies the message).
