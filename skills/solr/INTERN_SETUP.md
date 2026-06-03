# Setup Guide: Solr Skills on macOS

This guide sets up the three Solr skills so you can write and debug Apache Solr 9.x queries with AI assistance. Two paths:

- **Claude Code** (cloud, paid) — the primary, most reliable path. Do this first.
- **OpenCode + a local model via LM Studio** (free, private) — optional, for cost/privacy or offline use.

Both read skills from the same location (`~/.claude/skills/`), so once installed the skills work in either tool.

---

## Section 0: What's in this directory

These skills live in the repo under `skills/solr/`. Clone (or pull) the repo, then `cd` into this directory:

```bash
cd <repo>/skills/solr
ls
# You should see: solr-query/  solr-extending/  solr-semantic-search/  evals/
```

- **`solr-query/`**, **`solr-extending/`**, **`solr-semantic-search/`** — the three skills. Each is a folder with a `SKILL.md` plus `references/` files. This is what gets loaded into the AI assistant to make it good at Solr.
- **`evals/`** — a test harness (~244 cases) for tuning the skills. You won't run it in normal work.

For everyday use, the three `solr-*/` skill folders are what matter.

---

## Section 1: Claude Code (primary)

### 1.1 Install

```bash
brew install node                       # if you don't have node/npm (needs Homebrew: https://brew.sh)
npm install -g @anthropic-ai/claude-code
claude --version                        # verify
```

If you get "command not found", make sure npm's global bin is on your PATH:

```bash
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

### 1.2 Authenticate

Run `claude` and follow the first-run prompt (Anthropic API key from https://console.anthropic.com → Settings → API Keys, or your Claude subscription). Each skill is loaded only when relevant; a Solr question with a skill loaded is roughly $0.10–0.30/turn on Sonnet.

### 1.3 Install the skills

```bash
mkdir -p ~/.claude/skills
cp -r solr-query solr-extending solr-semantic-search ~/.claude/skills/

# verify
./check-setup.sh
```

`check-setup.sh` checks all three skills (and your CLIs). Address any ✗ before continuing.

### 1.4 Test it

Run `claude` in any directory and ask something Solr-specific:

```
I have a Solr 9.x index with products as parent docs and SKUs as children (block join,
type_s field). Find products where at least one SKU has color_s=red AND stock_i > 0.
What's the correct query syntax, and the most common mistake to avoid?
```

You should see Claude load the `solr-query` skill (possibly opening `04-block-join.md`), return a query like `{!parent which="type_s:product"}+color_s:red +stock_i:[1 TO *]`, and warn about the Block Mask trap. If it gives a generic answer with no skill use, see **Troubleshooting**.

---

## Section 2: Local model via OpenCode + LM Studio (optional)

Everything runs on your machine — no API cost, nothing leaves the laptop. Needs Apple Silicon and ≥24GB RAM (32GB+ recommended for larger quants).

1. **LM Studio** (https://lmstudio.ai) — install, then download a **tool-calling-capable** GGUF/MLX model (a recent Qwen or Llama instruct model). Pick a quant that fits your RAM (Q4_K_M ≈ 17GB is a safe floor).
2. **Load it** with **context length ≥ 65536** (the skills need ~27k tokens plus your project context; 32k is too tight), then start the **OpenAI-compatible server** (Developer tab → Status: Running) on port **1234**.
3. **Verify** the server and note the model `id`:
   ```bash
   curl -s http://127.0.0.1:1234/v1/models | python3 -m json.tool
   ```
4. **OpenCode** (https://opencode.ai):
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   mkdir -p ~/.config/opencode
   ```
   Create `~/.config/opencode/opencode.json` pointing at LM Studio, replacing the model id with the exact `id` from step 3:
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "provider": {
       "lmstudio": {
         "npm": "@ai-sdk/openai-compatible",
         "name": "LM Studio (local)",
         "options": { "baseURL": "http://127.0.0.1:1234/v1" },
         "models": { "PASTE_MODEL_ID_HERE": { "name": "Local model" } }
       }
     }
   }
   ```
5. **Skills** load from the same `~/.claude/skills/` path — if you did Section 1, you're done. In OpenCode, `/models` to pick the local model and `/skills` to confirm `solr-query` (and the others) are listed, then ask a Solr question.

A local model is slower and occasionally needs a nudge ("use the solr-query skill to answer this"). For complex multi-step debugging, Claude is more reliable; for simple lookups or anything privacy-sensitive, local is fine.

---

## Section 3: Using this for real Solr work

With a skill loaded, the AI behaves like a senior Solr engineer who has the gotchas memorized. It's good at query syntax, catching anti-patterns, and explaining wrong results — but it can't see your schema, data, or business rules, and it needs `debug=true` output to diagnose ranking. So:

- **Describe the situation in detail.** Not "how do I do faceting?" but your doc structure, fields, and exact behavior you want (e.g. multi-select facets where the brand facet stays full but color narrows to the selected brand). You'll get a near-complete `{!tag=}`/`excludeTags` answer.
- **Iterate with explain.** Run the query, and if results are wrong paste the `debug=true` parsed query + explain sections back in.
- **Ask for design rationale.** Lay out the alternatives you're weighing (block join vs denormalized vs `{!join}`) and your scale/update constraints; you'll get a real tradeoff comparison.

**Works well:** pasting your schema fragment, verbatim error messages, a sample document, the Solr version, and whether it's SolrCloud or standalone. **Doesn't work:** "make my Solr faster" or "what's wrong with my query?" without the query.

For a from-scratch project, a sequence that works: domain modeling → schema design → indexing strategy → eDisMax query → faceting → performance review → debugging as issues arise.

---

## Section 4: Troubleshooting

**Skill not loading (Claude Code or OpenCode).** Confirm the files exist and the frontmatter is intact:

```bash
ls -la ~/.claude/skills/solr-query/SKILL.md
head -4 ~/.claude/skills/solr-query/SKILL.md   # must show ---, name:, description:, ---
```

If missing/corrupted, re-copy from the repo (Section 1.3). In Claude Code you can force it: *"Use the solr-query skill to answer: …"*. OpenCode is stricter — the directory name must match the `name:` in frontmatter and match `^[a-z0-9]+(-[a-z0-9]+)*$` (the shipped skills already do).

**Local model not in OpenCode `/models`.** The LM Studio server must be running and the model `id` in `opencode.json` must match `curl /v1/models` character-for-character.

**Local model gives repetitive output or won't call tools.** Usually context length too low (set ≥65536) or sampling off (temperature ~0.6, top_p 0.95). If it still won't call tools, update LM Studio. Out of memory → drop to a smaller quant or lower the context length.

**Claude burning credits.** The skills add input tokens per call. For simple questions, a cheaper model helps:

```bash
claude --model claude-haiku-4-5
```

---

## Section 5: Quick command reference

```bash
# Claude Code
claude                              # interactive
claude -p "your question"           # one-shot
claude --model claude-haiku-4-5     # cheaper model

# OpenCode (local): /models to switch, /skills to see what's loaded

# LM Studio server check
curl http://127.0.0.1:1234/v1/models

# Verify / re-install skills from the repo
cd <repo>/skills/solr && ./check-setup.sh
rm -rf ~/.claude/skills/solr-query && cp -r solr-query ~/.claude/skills/
```

---

## When to escalate

Tell your manager if a skill gives an answer that's actually wrong (e.g. recommends a parser that doesn't exist), there's a pattern it handles poorly, or you hit a Solr 9.x feature it doesn't cover — ideally with a proposed eval case. Don't escalate setup issues you haven't checked against Section 4, or one-off odd answers (retry once, then move on).
