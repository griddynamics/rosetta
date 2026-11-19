
## session 5a25c055-9098-45e3-8ae3-ae49cb83f496

```text
# Session usage: `5a25c055-9098-45e3-8ae3-ae49cb83f496` (GitHub Copilot CLI)

- Log: `events.jsonl`
- First / last model call: 2026-10-28 13:56:57 / 14:40:29
- Model calls: 50; subagents launched: 0
- Tokens: input 150 · output 11 045 · cache read 5 786 327 · cache write 127 294
- Largest single request (context size): 137 736 tokens

Token counts are taken from the log as they are. Input excludes cached tokens, as for Claude Code; output includes 2 869 reasoning tokens. Usage from the log: premium requests 10, AI credits 160.834 (total_nano_aiu 160834040000). The runner's own figure: `/usage`.

## By model

| Model | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|
| `gpt-5.6-terra` | 50 | 150 | 11 045 | 5 786 327 | 127 294 | 5 924 816 |

## By agent

From the session's last usage checkpoint.

| Agent | Type | Model(s) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| main | main agent | gpt-5.6-terra | 50 | 150 | 11 045 | 5 786 327 | 127 294 | 5 924 816 |

## By operator message

Tokens spent (main agent + subagents) after each message the operator sent, until the next one.

| # | Time | Operator message (start) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| 1 | 13:56:53 | /aidlc feature Products need a "storage conditions" field (e | 16 | 48 | 4 178 | 1 291 365 | 116 386 | 1 411 977 |
| 2 | 13:58:59 | 1 | 2 | 6 | 441 | 253 806 | 265 | 254 518 |
| 3 | 14:05:20 | 3, 3, 1, 5 | 3 | 9 | 681 | 382 386 | 834 | 383 910 |
| 4 | 14:32:14 | 1, 1, 5, 1 | 5 | 15 | 1 048 | 643 369 | 1 531 | 645 963 |
| 5 | 14:33:01 | 1 | 6 | 18 | 1 490 | 783 695 | 3 145 | 788 348 |
| 6 | 14:33:59 | 1 | 4 | 12 | 695 | 532 013 | 984 | 533 704 |
| 7 | 14:34:32 | 1 | 6 | 18 | 1 016 | 806 718 | 2 153 | 809 905 |
| 8 | 14:35:55 | 1 | 3 | 9 | 616 | 408 164 | 876 | 409 665 |
| 9 | 14:39:49 | approve | 1 | 3 | 114 | 136 613 | 105 | 136 835 |
| 10 | 14:40:13 | 1 | 4 | 12 | 766 | 548 198 | 1 015 | 549 991 |

## Tool calls

| Tool | Calls |
|---|---|
| `view` | 37 |
| `bash` | 21 |
| `apply_patch` | 11 |
| `rg` | 4 |
| `skill` | 1 |

### Skills loaded

| Skill | Calls |
|---|---|
| `aidlc` | 1 |

```

## session c9ccac9e-dfab-471c-886b-652c3d886ef2

```text
# Session usage: `c9ccac9e-dfab-471c-886b-652c3d886ef2` (GitHub Copilot CLI)

- Log: `events.jsonl`
- First / last model call: 2026-10-28 14:53:07 / 14:54:40
- Model calls: 21; subagents launched: 0
- Tokens: input 63 · output 5 533 · cache read 2 213 030 · cache write 141 952
- Largest single request (context size): 152 394 tokens

Token counts are taken from the log as they are. Input excludes cached tokens, as for Claude Code; output includes 1 762 reasoning tokens. Usage from the log: premium requests 1, AI credits 86.4008 (total_nano_aiu 86400800000). The runner's own figure: `/usage`.

## By model

| Model | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|
| `gpt-5.6-terra` | 21 | 63 | 5 533 | 2 213 030 | 141 952 | 2 360 578 |

## By agent

From the session's last usage checkpoint.

| Agent | Type | Model(s) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| main | main agent | gpt-5.6-terra | 21 | 63 | 5 533 | 2 213 030 | 141 952 | 2 360 578 |

## By operator message

Tokens spent (main agent + subagents) after each message the operator sent, until the next one.

| # | Time | Operator message (start) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| 1 | 14:53:04 | /aidlc | 21 | 63 | 5 533 | 2 213 030 | 141 952 | 2 360 578 |

## Tool calls

| Tool | Calls |
|---|---|
| `view` | 45 |
| `bash` | 7 |
| `rg` | 3 |
| `skill` | 1 |
| `apply_patch` | 1 |
| `glob` | 1 |

### Skills loaded

| Skill | Calls |
|---|---|
| `aidlc` | 1 |

```
