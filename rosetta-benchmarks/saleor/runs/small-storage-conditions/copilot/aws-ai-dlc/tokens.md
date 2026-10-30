# Token usage: S-CP-05 (small, AWS AI-DLC, Copilot CLI), all attempts

Failed run, no T1 or T2. Produced by `scripts/session-usage.py` on each attempt's session logs (raw logs in `_attempts/<attempt>/session/`, git-ignored). Attempt 1's logs were flattened when copied, so its figures are less reliable.

Setup session before the run (`/aidlc --doctor`, `/hooks`, `/usage`): AI credits 17.17.

---

# S-CP-05-attempt1


## session session-state

```text
# Session usage: `session-state` (GitHub Copilot CLI)

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

---

# S-CP-05-attempt2


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

---

# S-CP-05-attempt3


## session 3343c659-e09a-465e-9aad-f3a9c904b477

```text
# Session usage: `3343c659-e09a-465e-9aad-f3a9c904b477` (GitHub Copilot CLI)

- Log: `events.jsonl`
- First / last model call: 2026-10-28 15:40:58 / 15:58:05
- Model calls: 65; subagents launched: 0
- Tokens: input 195 · output 14 678 · cache read 9 174 361 · cache write 170 023
- Largest single request (context size): 170 026 tokens

Token counts are taken from the log as they are. Input excludes cached tokens, as for Claude Code; output includes 3 962 reasoning tokens. Usage from the log: premium requests 12, AI credits 243.646 (total_nano_aiu 243645570000). The runner's own figure: `/usage`.

## By model

| Model | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|
| `gpt-5.6-terra` | 65 | 195 | 14 678 | 9 174 361 | 170 023 | 9 359 257 |

## By agent

From the session's last usage checkpoint.

| Agent | Type | Model(s) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| main | main agent | gpt-5.6-terra | 65 | 195 | 14 678 | 9 174 361 | 170 023 | 9 359 257 |

## By operator message

Tokens spent (main agent + subagents) after each message the operator sent, until the next one.

| # | Time | Operator message (start) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| 1 | 15:40:54 | /aidlc feature Products need a "storage conditions" field (e | 18 | 54 | 5 498 | 1 516 720 | 156 565 | 1 678 837 |
| 2 | 15:42:55 | 1 | 3 | 9 | 904 | 470 430 | 866 | 472 209 |
| 3 | 15:44:17 | 1, 1, 4, 2 | 4 | 12 | 615 | 631 425 | 847 | 632 899 |
| 4 | 15:45:29 | 2, 3, 1 | 4 | 12 | 588 | 635 038 | 974 | 636 612 |
| 5 | 15:49:04 | 1 | 4 | 12 | 524 | 637 957 | 619 | 639 112 |
| 6 | 15:50:01 | Please improve: (1) Editing: MANAGE_PRODUCTS, same as other  | 3 | 9 | 441 | 480 495 | 775 | 481 720 |
| 7 | 15:50:49 | Please improve: (1) Editing: MANAGE_PRODUCTS, same as other  | 7 | 21 | 1 905 | 1 133 662 | 2 761 | 1 138 349 |
| 8 | 15:52:33 | Please improve: (4) Customers see it only on the storefront  | 3 | 9 | 221 | 490 917 | 572 | 491 719 |
| 9 | 15:53:31 | Please improve: (1) Editing: MANAGE_PRODUCTS, same as other  | 6 | 18 | 1 338 | 989 970 | 2 393 | 993 719 |
| 10 | 15:54:28 | 1 | 6 | 18 | 1 741 | 1 003 452 | 2 247 | 1 007 458 |
| 11 | 15:56:17 | 1 | 4 | 12 | 467 | 675 334 | 821 | 676 634 |
| 12 | 15:57:57 | 1 | 3 | 9 | 436 | 508 961 | 583 | 509 989 |

## Tool calls

| Tool | Calls |
|---|---|
| `view` | 42 |
| `bash` | 32 |
| `apply_patch` | 14 |
| `rg` | 3 |
| `skill` | 1 |

### Skills loaded

| Skill | Calls |
|---|---|
| `aidlc` | 1 |

```
