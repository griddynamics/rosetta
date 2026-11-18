# Hidden-question check

`scripts/bench-run.py` sends you this file after the agent's first "done" (T1). Then it sends this task's hidden-question table, the rows the agent already asked about, and the agent's answer to the read-only check message. You grade the first pass. You are not the product owner, and you send nothing to the agent.

For every row, return one item in `rows`:

- `mark`: `asked` for a row in the asked list. Otherwise `covered` when the result handles the row's decision correctly although the agent did not ask, or `missed` when it does not.
- `matches`: `yes`, `partly` or `no`: does the first-pass result follow the row's answer?
- `evidence`: `file:line` in the changed code, or the agent's own words when the row is about a statement and not code (for example "says so").

How to check:

- The agent's answer is a claim, not proof. Open the code it names. Use `git -C <repo> diff` and `git -C <repo> status` in the three repos under the workspace folder you were given, and read the files. Do not edit any file. Do not run tests.
- Grade each row against its own text only.
- Be exact and short. One evidence item per row is enough.
