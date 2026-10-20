# Grill-with-docs: quick guide

How to install Grill-with-docs, keep every other method out, and do one run. General rules are in [BENCHMARKS.md](../../BENCHMARKS.md); this page only adds what is specific to this method.

Runs: `S-CC-02`, `S-CP-02`, `L-CC-02`, `L-CP-02` (see [EXPERIMENTS.md](../EXPERIMENTS.md)).

## What gets installed

Three skills from [mattpocock/skills](https://github.com/mattpocock/skills) at commit `447ca70872026d5b79d6073a546dac082117fed7`. Nothing else.

| Skill | Path in that repo | Why |
| --- | --- | --- |
| `grill-with-docs` | `skills/engineering/grill-with-docs/` | The entry command. Its `SKILL.md` is one line: it calls the two skills below. |
| `grilling` | `skills/productivity/grilling/` | The interview: rounds of numbered questions, each with a recommended answer. |
| `domain-modeling` | `skills/engineering/domain-modeling/` | Writes the glossary (`CONTEXT.md`) and ADRs (`docs/adr/`) during the interview. |

`grill-with-docs` alone does not work, so all three are installed. Don't install the whole `mattpocock-skills` plugin: it adds 15+ other skills (`to-spec`, `implement`, `tdd`, …), which would be a different method.

## One-time setup

Do this once, after `bench.sh setup` (BENCHMARKS.md, section 3).

```bash
export BENCH_DIR="$HOME/saleor-benchmark"
export GRILL="$BENCH_DIR/envs/grill-with-docs"

# 1. Get the three skills at the pinned commit
mkdir -p "$GRILL/src" && cd "$GRILL/src"
git init -q && git remote add origin https://github.com/mattpocock/skills.git
git fetch --depth 1 origin 447ca70872026d5b79d6073a546dac082117fed7 && git checkout -q FETCH_HEAD

# 2. Claude Code: a separate config dir with only these skills
mkdir -p "$GRILL/claude/skills"
for s in engineering/grill-with-docs productivity/grilling engineering/domain-modeling; do
  cp -R "$GRILL/src/skills/$s" "$GRILL/claude/skills/"
done

# 3. Settings: the common settings from BENCHMARKS.md, section 3.5 (same for every method)
cat > "$GRILL/claude/settings.json" <<'JSON'
{
  "model": "claude-sonnet-5-5",
  "effortLevel": "medium",
  "disableClaudeAiConnectors": true,
  "syncClaudeAiSkills": false,
  "syncClaudeAiPlugins": false,
  "autoMemoryEnabled": false,
  "disableAllHooks": true,
  "enabledPlugins": {
    "cc-plugin-plugin-authoring@builtin": false,
    "cc-plugin-sec-default@builtin": false,
    "cc-plugin-telemetry@builtin": false
  },
  "env": { "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_CLAUDEAI_MCP_SERVERS": "false" }
}
JSON

# 4. Tag grill-v1 (the skills live outside the repos, so it's the same commit as baseline-v1)
for r in saleor saleor-dashboard react-storefront; do git -C "$BENCH_DIR/$r" tag grill-v1 baseline-v1; done
```

**Claude Code login (once).** The new config dir has no login yet:

```bash
cd "$BENCH_DIR" && CLAUDE_CONFIG_DIR="$GRILL/claude" claude
```

Run `/login` with your work account. Then check, in the same session:

- `/plugin` → **Installed**: only the skills `grill-with-docs`, `grilling`, `domain-modeling`. No "claude.ai sync" skills, no project skills, no MCP, built-in plugins switched off;
- `/mcp`: no MCP servers (no claude.ai connectors).

Anything else in these lists means the environment isn't clean: fix it before any run.

**Copilot (VS Code), once:**

1. Create a VS Code profile `bench-grill-with-docs` (Profiles → New Profile → Empty). In it, install only GitHub Copilot and GitHub Copilot Chat. No other AI extensions.
2. Settings in this profile: `chat.tools.autoApprove: true`, `chat.useAgentSkills: true`, Copilot memory off, no user-level instructions or prompt files.
3. In the chat, choose model **GPT-6.1 Sol**, effort medium, auto model selection off.
4. Optional: to use `code --profile …` from the terminal, run "Shell Command: Install 'code' command in PATH" in VS Code.

VS Code doesn't have a separate config dir like Claude Code, so the skills go into the workspace: `$BENCH_DIR/.github/skills/`. Because `bench.sh reset` removes everything in the workspace root, you copy them again after every reset (step 2 below). This is the "manual port" from BENCHMARKS.md, section 3.5. Record it as `manual port` in the protocol.

## Every run

1. **Reset.**
   ```bash
   nvm use 24
   B=<rosetta-repo>/rosetta-benchmarks/saleor/scripts/bench.sh
   $B reset grill-v1 && $B start && $B health
   ```
2. **Copilot runs only**, put the skills in the workspace:
   ```bash
   mkdir -p "$BENCH_DIR/.github/skills"
   for s in engineering/grill-with-docs productivity/grilling engineering/domain-modeling; do
     cp -R "$GRILL/src/skills/$s" "$BENCH_DIR/.github/skills/"
   done
   ```
3. **Start a new session** in the workspace root `$BENCH_DIR`, in a terminal where `node -v` shows v24 (run `nvm use 24` first; the agent inherits this Node):
   - Claude Code:
     ```bash
     rm -rf "$GRILL/claude/projects/"*saleor-benchmark*
     cd "$BENCH_DIR" && CLAUDE_CONFIG_DIR="$GRILL/claude" claude --dangerously-skip-permissions --model claude-sonnet-5-5
     ```
     Check `/model`: Sonnet 5.5, effort medium. Check `/skills`, `/plugin`, `/mcp` as in the one-time setup, and save the output in the protocol.
   - Copilot: open `$BENCH_DIR` in VS Code with the `bench-grill-with-docs` profile, new chat, Agent mode. Type `/` and check that `grill-with-docs` is in the list.
4. **Send the task prompt** with the entry command in front. The prompt text is exactly the one from BENCHMARKS.md, section 4:
   ```text
   /grill-with-docs <task prompt>
   ```
5. **Answer the interview.** The agent asks rounds of questions (`❓ Q1 … ➡️ recommended answer`).
   - If a question matches a hidden question, give the answer from that task's table in BENCHMARKS.md, section 4, and mark it **asked**.
   - Other questions: take the answer from the extra answers in BENCHMARKS.md, section 4. If it isn't there, decide as the product owner, answer, and add a row there right away. Don't answer "use your recommendation": recommendations differ between runs, so the answers would too.
   - Write every question and answer in the protocol.
6. **Go to implementation.** When the interview ends and the agent waits for your confirmation, send only **`Approved, continue.`**. Count it as a method step, not a follow-up. Send the same phrase if it stops again only to ask for permission to start.
7. **Continue with BENCHMARKS.md, section 5, steps 5–11**: T1, hidden-question check, follow-ups, T2, post-implementation prompt, usage, protocol.
8. **Save the token breakdown and session logs** (Claude Code runs). Before the next reset:
   ```bash
   python3 <rosetta-repo>/rosetta-benchmarks/saleor/scripts/session-usage.py \
     "$GRILL/claude/projects/$(echo "$BENCH_DIR" | tr / -)" --t1 <T1> --copy-to <RUN_DIR> --out <RUN_DIR>/tokens.md
   ```
   Check its "Skills loaded" table: `grilling` and `domain-modeling` must be there. If one is missing, note it (see "What to watch for").
9. **Save the workspace-root files before the next reset.** Grill writes `CONTEXT.md` and `docs/adr/` into the workspace root, which is not in any repo diff:
   ```bash
   mkdir -p <RUN_DIR>/workspace-root
   cd "$BENCH_DIR" && cp -R CONTEXT.md CONTEXT-MAP.md docs <RUN_DIR>/workspace-root/ 2>/dev/null; ls <RUN_DIR>/workspace-root
   ```
   `<RUN_DIR>` is e.g. `rosetta-benchmarks/saleor/runs/small-storage-conditions/claude-code/grill-with-docs/`.

## What to watch for

- **Skills didn't load.** If the answer to `/grill-with-docs …` is not an interview at all, the method isn't active: reset and retry (not a scored failure).
- **Skills loaded only partly.** This is a known problem of this skill. All questions come at once with no recommended answers, so `grilling` didn't load. Or there is a good interview but no `CONTEXT.md` appears, so `domain-modeling` didn't load. Don't fix it: it is the method's result. Write it in the protocol.
- **Nothing in `CONTEXT.md` or `docs/adr/`** can also be normal: ADRs are written only for hard-to-reverse decisions.

## Turning it off

Nothing is installed globally. The method exists only in `$GRILL/claude` (used only when `CLAUDE_CONFIG_DIR` points to it), in the `bench-grill-with-docs` VS Code profile, and in the workspace root until the next `bench.sh reset`. Other methods use their own config dir and profile, so they never see these skills.
