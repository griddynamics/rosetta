<sample_task_set flow="testgen-flow">

<sample_task id="1" ties="what has to be in place before the first run">

Scenario: you've never used Rosetta to generate test cases before. You have the ticket for the next feature, it opens fine in your browser, the detail behind it is written up in your team's wiki, and finished cases live in your test management tool.
Task: say what you check is in place before you send anything.

Rubric:
- Good if: checks the agent can reach those systems itself — it reads the ticket through a configured integration, not through your logged-in browser; same question for the wiki, and for the TMS if you want the cases exported at the end.
- Good if: knows the systems are named once in `gain.json` at the repo root — written by `/init-workspace-flow` — so every run starts from them instead of you re-describing your tooling each time.
- Wrong/missing if: assumes that because you can open the ticket, so can the agent; with no tracker connection the run stops early, and re-pasting the key doesn't fix a missing integration.
- Wrong/missing if: plans to paste the ticket text into chat instead — you become the integration, and the comments and linked pages the flow would have pulled stay invisible to it.

</sample_task>

<sample_task id="2" ties="giving it the documentation it needs">

Scenario: the ticket is thin — two sentences. The real detail, the discount matrix and what happens with a coupon on top, sits on three Confluence pages nobody linked from the ticket.
Task: say what you do about those pages — both in your setup and in the request you send.

Rubric:
- Good if: records the wiki as a source in `gain.json` (which wiki, and its URL) so it's in scope for this run and every later one.
- Good if: pastes the three page URLs into the request next to the ticket key — links you supply are read directly, which beats the keyword search it otherwise falls back on.
- Wrong/missing if: sends the ticket key alone and trusts it to find them; with no wiki in scope it notes the gap and continues on the ticket alone, and the cases inherit exactly the detail the ticket was missing.
- Wrong/missing if: ignores the page count it reports back — if it found one page where you know there are three, that's your moment to hand over the URLs, not after the cases are written.

</sample_task>

<sample_task id="3" ties="the clarification questions gate">

Scenario: it comes back with a file of questions — a contradiction between the ticket and an older wiki page, plus two things nobody ever wrote down, like what happens when a discount and a coupon both apply. It's waiting on you. To save you time it offers to fill in its own best answers so things keep moving.
Task: say what you do with that offer, and with the questions you can't answer yourself.

Rubric:
- Good if: declines and writes the answers into the questions file personally — the stop exists precisely because these can't be derived from the ticket or the wiki.
- Good if: takes the ones you don't own to whoever does — PO, BA, the developer — instead of leaving them blank or approximating.
- Wrong/missing if: accepts the guesses "and reviews them later"; they become requirements, then test cases, and they read exactly as confident as the answers you gave.
- Wrong/missing if: tries to wave the gate through to save a day — this one doesn't move, even on your say-so.

</sample_task>

</sample_task_set>
