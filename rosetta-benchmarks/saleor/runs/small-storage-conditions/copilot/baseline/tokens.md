# Session usage: `fb31ab72-89fe-4f27-877d-4810a2fa7842` (GitHub Copilot CLI)

- Log: `session/fb31ab72-89fe-4f27-877d-4810a2fa7842/events.jsonl`
- First / last model call: 2026-10-27 08:58:48 / 10:35:06
- Model calls: 114; subagents launched: 0
- Tokens: input 342 · output 43 695 · cache read 13 760 111 · cache write 237 277
- Largest single request (context size): 210 490 tokens

Token counts are taken from the log as they are. Input excludes cached tokens, as for Claude Code; output includes 10 737 reasoning tokens. Usage from the log: premium requests 8, AI credits 395.654 (total_nano_aiu 395654230000). The runner's own figure: `/usage`.

## Before / after T1

| Part | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|
| Until T1 (2026-10-27T09:18) | 183 | 25 547 | 6 425 475 | 155 219 | 6 606 424 |
| After T1 (rework) | 159 | 18 148 | 7 334 636 | 82 058 | 7 435 001 |
| Total | 342 | 43 695 | 13 760 111 | 237 277 | 14 041 425 |

## By model

| Model | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|
| `gpt-5.6-terra` | 114 | 342 | 43 695 | 13 760 111 | 237 277 | 14 041 425 |

## By agent

From the session's last usage checkpoint.

| Agent | Type | Model(s) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| main | main agent | gpt-5.6-terra | 114 | 342 | 43 695 | 13 760 111 | 237 277 | 14 041 425 |

## By operator message

Tokens spent (main agent + subagents) after each message the operator sent, until the next one.

| # | Time | Operator message (start) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| 1 | 08:58:44 | Products need a "storage conditions" field (e.g. "Keep refri | 64 | 192 | 26 266 | 6 893 910 | 157 350 | 7 077 718 |
| 2 | 09:21:00 | Don't change any code, just answer: was each of these handle | 1 | 3 | 628 | 157 350 | 397 | 158 378 |
| 3 | 09:25:15 | The storage conditions field must be limited to 250 characte | 8 | 24 | 2 508 | 1 285 542 | 6 529 | 1 294 603 |
| 4 | 09:29:00 | Storage conditions must appear in product webhook payloads a | 16 | 48 | 6 181 | 2 969 276 | 33 426 | 3 008 931 |
| 5 | 09:49:01 | The local app is broken: the API fails with "column product_ | 4 | 12 | 1 105 | 794 580 | 2 976 | 798 673 |
| 6 | 09:58:59 | The dashboard is broken: changing only the storage condition | 6 | 18 | 2 320 | 1 236 550 | 9 809 | 1 248 697 |
| 7 | 10:26:54 | The dashboard tests are broken: src/graphql/lockSchema.test. | 11 | 33 | 2 310 | 285 888 | 22 945 | 311 176 |
| 8 | 10:34:39 | Do not commit anything. For every repository you changed, ru | 4 | 12 | 2 377 | 137 015 | 3 845 | 143 249 |

## Tool calls

| Tool | Calls |
|---|---|
| `view` | 124 |
| `bash` | 72 |
| `rg` | 59 |
| `apply_patch` | 22 |
| `sql` | 16 |
| `glob` | 8 |
| `task_complete` | 2 |
| `ask_user` | 1 |
| `exit_plan_mode` | 1 |
| `read_bash` | 1 |
