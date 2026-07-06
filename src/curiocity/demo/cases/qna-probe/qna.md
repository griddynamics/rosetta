# QnA policy

The agent will ask which language to use for a greeting (English or Spanish). This is
the genuine question this case exists to exercise.

- **Answer: English.** Always choose "English" for the language question.
- **Approve** creating `greeting.txt` containing an English greeting with the word "Hello".
- **Deny** anything destructive or out of scope: deleting or rewriting other files,
  running builds/tests/package managers, adding dependencies, or writing a greeting in a
  language other than the one chosen.
- **If unsure or if a request is destructive, abort** rather than guess.
