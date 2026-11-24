# UI-AQA page-source capture instructions

Verbatim user-facing message for capturing page-source HTML for UI-AQA selector identification.

<page-source-capture-instructions>

Send the message below **verbatim** when selectors are missing and page-source capture is needed -- do NOT paraphrase (non-technical users rely on the literal F12/right-click steps). Save to `plans/ui-aqa-<test-name>/page-sources/<page-name>.html` (kebab-case), one per visited page.

```text
I need the HTML source of the page(s) under test to verify selectors. Please capture them as follows:

⚠️ **Before sharing:** do not paste or save pages that contain passwords, personal data, or anything secret. If the page shows such data, blank it out in the saved file first.

**For each page involved in the test:**

1. Open the page in your browser (Chrome / Edge / Firefox / Safari -- any modern browser works).
2. Open Developer Tools:
   - **Keyboard:** press F12 (Windows / Linux) or Cmd+Opt+I (macOS).
   - **OR menu:** right-click anywhere on the page → "Inspect" / "Inspect Element".
3. In Developer Tools, switch to the **Elements** (Chrome / Edge) or **Inspector** (Firefox / Safari) tab.
4. **Find the test target element** -- the element your test interacts with (button, input, link, etc.). Use the element-picker icon (⌖) and click on the element in the rendered page; Developer Tools highlights it in the tree.
5. **Include 2–3 parent levels for context.** In the Elements tree, walk up the tree 2–3 levels above the target (so the surrounding container, form, or section is captured along with the target) -- selectors often depend on parent structure, not just the target node.
6. **Right-click the chosen parent node** → "Copy" → **"Copy outerHTML"** (Chrome / Edge / Firefox) or "Copy HTML" (Safari). This copies the parent + the target + all descendants as one HTML fragment.
7. **Save the HTML into a new file** using this naming convention:

   `plans/ui-aqa-<test-name>/page-sources/<page-name>.html`

   where `<page-name>` is a **kebab-case** short name for the page (e.g. `login.html`, `checkout-payment.html`, `order-confirmation.html`). Save **one file per page** the test visits.

8. Paste the URL of each captured page into the conversation when you confirm the files are saved, so I can cross-reference page → file.

**When you've saved all the page-source files, reply with "captured" + the list of `<page-name>.html` filenames you created.** I will then verify the directory and continue selector identification.
```

After capture (agent-facing -- outside the verbatim message):

- Authenticated page HTML routinely embeds session/CSRF tokens and PII. Apply the `sensitive-data` pre-emit re-scan gate to every saved page-source file before reading/referencing it -- treat as a tracked artifact (fail-closed: no scan, do not proceed).
- Not-captured branch: if the user cannot capture (no app access, login wall, incomplete SPA outerHTML) or files are missing/empty/garbled -- do NOT guess selectors. Stop, re-run the selector-identification phase or escalate (mirrors the taxonomy's `page sources not available` branch).

</page-source-capture-instructions>
