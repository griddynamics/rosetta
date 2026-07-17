# Refactor (FUTURE / not now): the QnA controller becomes a *true agent driver*

> **Status:** deferred. This is a large, deliberate refactor to do **later**. It is
> recorded here so the design intent is not lost. Nothing in this document is
> implemented yet; the current interaction engine (`src/interaction/engine.ts`,
> `classify.ts`, `change-monitor.ts`) stays as-is until we schedule this work.

## The problem with today's model

Today the harness component that answers the coding agent's questions is a **passive
helper**, not an agent:

- A deterministic loop (`ChangeMonitor` + freeze/stall watchdog) detects a *settled
  screen* or a *pending structured question* (`detectStructuredQuestion` /
  `detectScreenQuestion`).
- On each detection it makes **one** stateless `workhorse` call
  (`composeStructuredAnswer` / `composeFreeTextAnswer`) that maps *this one question* →
  *one answer*, then types it.
- It has **no memory across questions**, no ability to *read* a screen it wasn't
  triggered to read, no ability to take multi-step UI actions (navigate previews, add
  notes, switch question tabs) beyond the one hardcoded `submitStructuredAnswer`
  keystroke recipe per adapter.

Every new interaction affordance in the target CLI (tabs, option previews, per-answer
notes, free-form-plus-select) forces another hardcoded detector/keystroke path in the
adapter. That does not scale, and it is exactly the class of bug that made a single
`AskUserQuestion` gate turn into an `agent-hung` (a one-shot latch closing detection).

## The v1 vision: *it* drives, not us

Invert control. Instead of the harness driving the coding agent through fixed detectors,
we spawn a **driver agent** (an LLM given tools) and hand it:

- **context** — the case prompt, the task fixture, what's being tested;
- **QnA policy** — the `qna.md` target context (how to answer, what to approve/deny,
  "if unsure, abort");
- **the overall goal** — e.g. "let the coding agent complete the task; answer its
  genuine questions from the policy; approve gates when the presented work matches the
  contract; never approve destructive/out-of-scope actions; terminate when delivered."

The driver then **observes and acts in a loop**, maintaining conversation context across
the *entire* run, using low-level tools instead of hardcoded recipes:

- `wait_for_question_or_screen_freeze()` — block until the screen settles / a question
  surfaces (the current `ChangeMonitor` freeze/stall logic becomes *a tool the agent
  calls*, not the top-level driver).
- `read_screen()` — return the current ANSI-free snapshot (so the agent can *look*
  whenever it wants, e.g. to read an option's preview, not only when triggered).
- `send_text(text)` — type text (free-form answers).
- `send_enter()` — confirm.
- `send_key(key)` — special actions: `up`/`down`/`left`/`right`, a digit `1`..`9`,
  `n` (add note), `esc`, `ctrl-c`, `tab`.
- `terminate()` — end the session (task delivered / must abort).

The engine's job shrinks to: PTY plumbing, the tool implementations, transcript/usage
collection, and the audit log. **What to press and when is the agent's decision**, made
with full context — not a deterministic detector guessing from screen regexes.

### Why this is better

- No per-affordance hardcoding: previews, notes, tabs, and future TUI features are just
  "things the agent reads on screen and acts on."
- Real cross-question memory: the agent knows it already approved the design when it
  reaches the final gate; it can read a multi-option preview across several `read_screen`
  loops while keeping context.
- The deterministic watchdog survives as a *safety tool / backstop* (and as the
  `agent-hung` fail-safe), not as the thing making interaction decisions.

## Interaction nudges for the driver (general — NOT tied to exact screens)

Hints, not a script. Question UIs vary; the driver *reads the screen and decides*. Keep
these in its system prompt as capabilities + caveats — nudges on what it can do and what
will bite it. Do not hardcode any specific screen layout.

**Confirming**
- Prefer **↑/↓ to highlight, then Enter to confirm** — unambiguous everywhere.
- Highlighting an option does **not** decide it; Enter is what commits (highlight without
  Enter = undecided).
- Avoid number shortcuts as a habit: inside a free-form field a digit is *typed as text*,
  not a selection.
- Free-form ("type your own"): highlight it, type the text, Enter confirms.

**Multi-part questions (several questions in one prompt, one shown at a time)**
- Move between them with **←/→**; confirming one advances to the next; a final **Submit**
  step commits them all.
- **Caveat:** Esc / Cancel discards the **entire** multi-part prompt and **all** answers
  already given — never Esc to navigate; use arrows.

**Preview / "design" questions (each option has a preview pane)**
- Move option-by-option to **read each preview** before choosing.
- Press **`n`** to attach a note to the selected option.
- **Caveat:** while editing a note, arrows don't navigate — **Esc persists the note** and
  returns you to the options; Enter there confirms the whole selection and closes the
  dialog.

**General**
- After any action, **wait for the screen to settle** before the next step.
- If unsure what a screen wants, **read it again** rather than guessing keystrokes.

## Relationship to the current codebase (what gets absorbed)

- `interaction/engine.ts` run-loop → becomes the driver-agent host + tool implementations.
- `interaction/change-monitor.ts` (freeze/stall) → becomes `wait_for_question_or_screen_freeze`.
- `interaction/classify.ts` (`classifyScreen`, `compose*Answer`) → folded into the driver
  agent's own reasoning (it *is* the classifier/answerer, with memory).
- adapter `detectStructuredQuestion` / `detectScreenQuestion` / `submitStructuredAnswer`
  → largely unnecessary; the driver reads the screen and sends keys directly. Adapters
  keep only genuinely agent-specific plumbing (launch, transcript location, hook wire
  formats, usage extraction).

## Until then

The near-term fix (screen-change is the sole detector; per-episode dedup; no one-shot
latch; per-tab answering via the existing loop) is the *bridge* that makes the passive
helper correct for multi-gate and multi-question flows without this refactor. This
document is the target we converge on afterward.
