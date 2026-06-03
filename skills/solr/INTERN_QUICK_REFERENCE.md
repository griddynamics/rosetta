# Solr Skill Quick Reference

After you've completed `INTERN_SETUP.md`, this is your daily-use cheat sheet.
Print it out, pin it to your wall, whatever helps.

## Starting a session

```bash
# Cloud — Claude (paid, fast, smart)
claude

# Local — Qwen3.6 via OpenCode (free, private, slower)
#   First make sure LM Studio is running with Qwen3.6 loaded:
#   1. Open LM Studio
#   2. Developer tab → Status: Running
#   3. Confirm Qwen3.6 is the loaded model
opencode
```

## Inside Claude Code / OpenCode

| Command | What it does |
|---|---|
| `/skills` | List available skills (you should see `solr-query`) |
| `/models` | Switch model |
| `/undo` | Revert last AI-made changes to files |
| `/redo` | Reapply undone changes |
| `/share` | Share conversation as a link (Claude Code only) |
| `Tab` | Toggle Plan / Build mode (OpenCode) |
| `@filename` | Reference a file in your project |
| `Ctrl+C` then Enter | Cancel the AI mid-response |
| `/exit` or `Ctrl+D` | Quit |

## Sanity check before working

If something feels off, run:

```bash
~/work/check-setup.sh
```

If everything's green, you're good. Anything red — fix that first.

## Forcing skill use

Sometimes the AI doesn't trigger the skill on its own. Nudge it:

```
Use the solr-query skill to answer this:
[your question]
```

## Asking good Solr questions

**Bad:**
> How do I do faceting in Solr?

**Good:**
> Solr 9.6, e-commerce setup. Products as parents (type_s:product), SKUs as children (type_s:sku) via block join. Each product has brand_s, category_s. Each SKU has color_s, size_s, stock_i, price_f.
>
> Users see filters for brand, category, color, price range — multi-select. The user picks brand=Nike. The brand facet should still show all brands (so they can switch); color facet should show only colors available in Nike products. How do I structure the JSON Facets?

The difference: schema, version, business rules, exact ask. AI gives a complete answer instead of a generic one.

## Common Solr asks where the skill helps

These are scenarios the skill explicitly covers — high success rate:

- **eDisMax with mm formula:** "Write me a production eDisMax config with mm that doesn't kill short queries"
- **Block join correctness:** "Find products with red SKUs in stock, return parents with their matching children"
- **JSON Facets with sub-facets:** "Top 10 brands, for each show top 5 colors, sort by avg rating"
- **Multi-select faceting:** "Add tag/exclude pattern for brand and color filters"
- **kNN hybrid search:** "Combine BM25 lexical with kNN vector similarity, three approaches"
- **Reading explain output:** "Here's the explain section, why is doc B above doc A?"
- **Catching anti-patterns:** "Review this query for common mistakes"
- **Common errors:** Lowercase booleans, restrictive Block Mask, post-filter starvation, leading wildcards, etc.

## Common Solr asks where the AI might struggle

- Anything specific to your team's custom plugins or schema not described in the prompt
- Performance tuning without you sharing actual metrics / index sizes
- Solr 8.x or 10.x specifics (skill targets 9.x)
- Operational concerns (replication, recovery, JVM tuning)

For these, paste relevant context: schema fragments, error logs, JVM args, version info.

## When to use which AI

| Situation | Use |
|---|---|
| Quick syntax lookup | Either |
| Designing a search system from scratch | Claude (more reliable across long conversations) |
| Single-query debugging with explain output | Either |
| Anything you can't paste to a cloud service | Local Qwen |
| Working offline (plane, etc.) | Local Qwen |
| Iterating on schema design over hours | Claude (Sonnet); cheaper than Opus, smarter than Haiku |
| Fast questions, cost-conscious | Haiku: `claude --model claude-haiku-4-5` |

## Cost awareness (Claude only)

The skill loads ~27k tokens of input each turn. Approximate cost per question:

| Model | Input cost (~27k tok) | Output cost (typical 1k tok) | Total per turn |
|---|---|---|---|
| Claude Opus | ~$0.40 | ~$0.08 | ~$0.50 |
| Claude Sonnet | ~$0.08 | ~$0.015 | ~$0.10 |
| Claude Haiku | ~$0.03 | ~$0.005 | ~$0.04 |

Check your usage at https://console.anthropic.com/settings/usage.

If a long iteration session hits $5+, switch to Haiku for the remaining work, or fall back to Qwen locally for the simpler questions.

## Workflow patterns

### "Start with a plan"

In OpenCode, hit `Tab` to enter Plan mode before making changes. Describe what you want, get a plan, iterate, then Tab back to Build mode to execute.

In Claude Code, the equivalent is just asking:

```
Don't make any changes yet. Walk me through how you'd approach this, and let me push back on anything I disagree with.
```

### "Iterate with explain"

When a query gives wrong results:

```
Here's my query: [paste]
Here's debug=true output: [paste parsedquery + explain for top result]
Expected top: doc-X, actual top: doc-Y. Compare scores and explain why.
```

### "Schema-first design"

```
I'm building search for [domain]. Users search by [fields]. They filter by [facets]. They sort by [order].

Step 1: design my schema. What field types, analyzers, and copyField directives?

(Don't write queries yet. We'll do that after we agree on the schema.)
```

### "Code review for query"

```
Review this Solr request for correctness and performance issues. Don't rewrite — just list issues:

[paste full URL or JSON request]
```

You'll get a list of anti-patterns the skill knows: lowercase boolean, missing `cache=false` on per-request frange, OR-chains that should be `{!terms}`, etc.

## When the AI gets it wrong

It happens. Two scenarios:

**Wrong because the AI hallucinated.** "Use the `{!phrase}` parser" or "set `mm=auto`" — neither exists. If you spot this, ignore the suggestion. Mention it to your manager so the skill can be tightened.

**Wrong because of missing context.** The AI guessed at your schema, your Solr version, your business rules. The fix is yours: add the missing context to the prompt and re-ask.

In neither case should you trust the AI blindly. Treat it like a smart colleague who's seen a lot of Solr but never seen your specific system. Verify outputs by running them.

## Asking for help

Document your problem:
- The exact prompt you sent
- The exact response you got
- What was wrong with it
- What Solr version, mode (Cloud / standalone), version of the AI you used

Then ping your manager. Don't escalate "the AI was weird once" — try at least twice with different phrasings, then escalate.
