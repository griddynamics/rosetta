# Classify one agent turn

`scripts/bench-run.py` sends you this file, then the last message of the agent under test. The agent works on a coding task without a human. Decide what the agent needs now. Do not answer the agent. Do not judge the work.

Return exactly one `kind`:

- `done`: the agent says the task is finished, or reports its final result, and asks nothing that blocks it. A closing line such as "let me know if you want more" is still `done`.
- `question`: the agent asks for a product or design decision, or for information, and waits for the answer. Put every question in `questions`, one item each, word for word or as a short faithful paraphrase. Keep the options the agent offers and the option it marks as recommended.
- `stop`: the agent waits only for an approval, a confirmation, a retry or "shall I continue?", with no real product or design choice in it.
- `waiting`: the agent is still working: it says it waits for its own background subagents, tasks or commands, and it will go on by itself.

When a message has a real question and also asks for approval, the kind is `question`.
