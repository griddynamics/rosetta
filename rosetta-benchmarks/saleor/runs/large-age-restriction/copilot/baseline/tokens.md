# Session usage: `22d861a0-8042-4d19-b8f8-0a254cb806c4` (GitHub Copilot CLI)

- Log: `session/22d861a0-8042-4d19-b8f8-0a254cb806c4/events.jsonl`
- First / last model call: 2026-10-28 14:31:01 / 11:31:58
- Model calls: 203; subagents launched: 0
- Tokens: input 609 · output 85 665 · cache read 44 712 097 · cache write 1 214 239
- Largest single request (context size): 348 834 tokens

Token counts are taken from the log as they are. Input excludes cached tokens, as for Claude Code; output includes 24 112 reasoning tokens. Usage from the log: premium requests 14, AI credits 1956.7 (total_nano_aiu 1956696770000). The runner's own figure: `/usage`.

## Before / after T1

| Part | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|
| Until T1 (2026-10-28T14:48:03) | 165 | 26 457 | 6 232 346 | 153 101 | 6 412 069 |
| After T1 (rework) | 444 | 59 208 | 38 479 751 | 1 061 138 | 39 600 541 |
| Total | 609 | 85 665 | 44 712 097 | 1 214 239 | 46 012 610 |

## By model

| Model | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|
| `gpt-5.6-terra` | 203 | 609 | 85 665 | 44 712 097 | 1 214 239 | 46 012 610 |

## By agent

From the session's last usage checkpoint.

| Agent | Type | Model(s) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| main | main agent | gpt-5.6-terra | 203 | 609 | 85 665 | 44 712 097 | 1 214 239 | 46 012 610 |

## By operator message

Tokens spent (main agent + subagents) after each message the operator sent, until the next one.

| # | Time | Operator message (start) | Calls | Input | Output | Cache read | Cache write | All |
|---|---|---|---|---|---|---|---|---|
| 1 | 14:30:56 | Some of our products can only be sold to customers above a c | 48 | 144 | 23 971 | 5 182 186 | 146 467 | 5 352 768 |
| 2 | 14:47:06 | Approved, continue. | 7 | 21 | 2 486 | 1 050 160 | 6 634 | 1 059 301 |
| 3 | 14:50:42 | Don't change any code, just answer: was each of these handle | 1 | 3 | 937 | 152 771 | 731 | 154 442 |
| 4 | 14:53:39 | Restricted products should stay visible everywhere (lists, s | 11 | 33 | 4 087 | 1 826 652 | 21 840 | 1 852 612 |
| 5 | 14:55:29 | Please check whether Saleor core sends any marketing emails, | 3 | 9 | 1 106 | 529 933 | 14 950 | 545 998 |
| 6 | 14:56:51 | The birthday is personal data. Only the customer (own accoun | 13 | 39 | 7 475 | 2 657 214 | 24 978 | 2 689 706 |
| 7 | 15:03:35 | The local app is broken: the API fails with "column product_ | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | 15:05:15 | The local app is broken: the API fails with "column product_ | 0 | 0 | 0 | 0 | 0 | 0 |
| 9 | 15:10:25 | The local app is broken: the API fails with "column product_ | 0 | 0 | 0 | 0 | 0 | 0 |
| 10 | 15:22:01 | The local app is broken: the API fails with "column product_ | 0 | 0 | 0 | 0 | 0 | 0 |
| 11 | 15:25:33 | The local app is broken: the API fails with "column product_ | 0 | 0 | 0 | 0 | 0 | 0 |
| 12 | 15:25:58 | The local app is broken: the API fails with "column product_ | 0 | 0 | 0 | 0 | 0 | 0 |
| 13 | 15:29:05 | The local app is broken: the API fails with "column product_ | 0 | 0 | 0 | 0 | 0 | 0 |
| 14 | 16:09:58 | The local app is broken: the API fails with "column product_ | 9 | 27 | 2 540 | 1 670 041 | 212 494 | 1 885 102 |
| 15 | 16:34:36 | Saving the birthday doesn't work: in the storefront account  | 16 | 48 | 5 855 | 3 664 226 | 27 250 | 3 697 379 |
| 16 | 16:52:53 | In the dashboard I can't open any product: every product pag | 31 | 93 | 8 444 | 8 299 980 | 45 350 | 8 353 867 |
| 17 | 17:13:54 | The product page opens now, but I still can't set a minimum  | 14 | 42 | 3 419 | 4 072 319 | 9 835 | 4 085 615 |
| 18 | 17:34:29 | A customer who is too young can still buy a restricted produ | 16 | 48 | 7 276 | 4 910 557 | 20 093 | 4 937 974 |
| 19 | 10:17:40 | In the storefront, when a customer can't buy an 18+ product, | 16 | 48 | 9 927 | 4 913 927 | 333 885 | 5 257 787 |
| 20 | 10:22:42 | A customer who turns 18 today can't buy an 18+ product: logg | 14 | 42 | 6 633 | 4 781 186 | 14 946 | 4 802 807 |
| 21 | 11:31:33 | Do not commit anything. For every repository you changed, ru | 4 | 12 | 1 509 | 1 000 945 | 334 786 | 1 337 252 |

## Tool calls

| Tool | Calls |
|---|---|
| `view` | 168 |
| `rg` | 153 |
| `bash` | 134 |
| `apply_patch` | 40 |
| `sql` | 23 |
| `glob` | 10 |
| `ask_user` | 1 |
| `exit_plan_mode` | 1 |
