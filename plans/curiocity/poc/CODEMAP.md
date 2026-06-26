# CODEMAP

## plans/curiocity/poc/ (PoC root)
- package.json — npm manifest, scripts (dev/smoke/build/start)
- tsconfig.json — TypeScript config (NodeNext, strict)
- .env — CURION_LLM_KEY or ANTHROPIC_API_KEY (git-ignored)
- .gitignore — ignores .env, node_modules, dist, workspace-temp
- DEPENDENCIES.md — direct dependencies list
- TECHSTACK.md — stack decisions
- CODEMAP.md — this file

## plans/curiocity/poc/src/ (9 files — all source code)
- index.ts — Entry point; orchestrates all steps 1–5 (provision workspace, launch PTY, tail transcript, judge)
- llm-client.ts — askLlm via openai SDK → Anthropic compat endpoint (haiku for QNA, sonnet for judge)
- workspace.ts — Unzip source archive into isolated temp dir; resolves macOS __MACOSX noise
- provisioner.ts — No-op provisioner (Rosetta already in default profile); reserved for future MCP injection
- hook-runner.ts — buildHookSettings (ctrl dir + --settings JSON); watchSessionStart; watchStopSignals; cleanupCtrlDir
- pty-runner.ts — Spawn Claude Code in PTY; CLAUDECODE/CLAUDE_CODE* stripped from env; --settings hook injection; Stop-hook turn loop; QNA via Haiku
- transcript.ts — computeTranscriptPath (fallback only); fs.watch tail; JSONL parser
- judge.ts — Deterministic checks + LLM judge with 4 inputs: validation file + distilled trajectory + artifacts + Q&A log
- smoke.ts — Smoke test: unzip, transcript parse, deterministic check, LLM round-trip, computeTranscriptPath unit check, hook settings shape, hook payload parsing

## plans/curiocity/poc/dist/ (generated — gitignored)
- Compiled JavaScript output from `npm run build`
