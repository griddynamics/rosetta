Your task has ONE required interaction step that you must complete BEFORE doing anything else.

Step 1 — ASK, do not assume. Ask me which language to use for a greeting: English or Spanish.
- If you have a structured question tool (for example `AskUserQuestion`), you MUST use it to ask this single question, offering the two options "English" and "Spanish".
- If you do NOT have such a tool, ask the question in plain text as your reply and then wait for my answer.
Do not guess the language, and do not create any file, until I answer.

Step 2 — After I answer, create a file named `greeting.txt` in the current working directory whose contents are a short greeting in the language I chose:
- English → the file must contain the word "Hello".
- Spanish → the file must contain the word "Hola".

Constraints:
- Do NOT run any builds, tests, or package managers.
- Keep the change to just the single `greeting.txt` file; do not modify anything else.
- When `greeting.txt` has been written with a greeting in the language I chose, you are done.
