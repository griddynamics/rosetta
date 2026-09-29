# Title

Rules of power and one loop to rule them all

## Parts

1. The Fellowship of the Rules
2. The Two Principles
3. The Return of the Loop








Content to have:
1. What should have as rule lines
2. How to make AI to think
3. How to teach AI to manage

Key Principles:
1. Sequential - Single "Minded"
   - One layer and area of thinking/action (decomposition of thinking itself; high level: requirements>DDD-model>discover>design>specs>sessions>implementation>review>validation; low-level: decompose, actors, roles, boundaries, recompose, etc - like in https://miro.medium.com/v2/resize:fit:2000/format:webp/1*4ITg3Y27JfVlnKPPA9pJlA.png)
   - Lay the path to go over multiple areas/layers (guided CoT on top of built-in CoT)
   - Enforce output of messages (even short) => "Finalizes" thinking => Makes built-in reasoning to commence => Otherwise mix of thoughts
   - Clear separation of actors, models, inputs, outputs, responsibilities, policies, control (IDEF0, IDEF3)
2. Progressive Disclosure
   - Enforcement of the work
   - Saving Context
   - TLDR to screen, full output to file directly, in batches
3. Start with just key points and steps - all as terse phrases - not even sentences. Nothing else. Exclude anything obvious. Use nudges, phrases, terminology, abbreviations, terse, dense wording
4. Evaluation
   - Do not test in pure context, give them "You've been task to implement unit tests, and you loaded skill below, explain what you will do with it?"
   - Do not ask to estimate quality just by giving one current prompt, give old and new, draft and final, etc.
   - Spawn fresh eye and smaller model subagent and ask for how it understood, what came as surprise, what was clear already, etc.
   - If explanation of what it will do is even slightly deviate => tune the source of deviation
   - If suggests next right things => it understood, we might want to cut something, maybe useful to include
   - If suggest wrong things => critical issue
   - What was clear => Be careful => May not be biased => Will forget
   - Ignore => "I don't need MoSCoW", "too harsh", etc. => Likely without those it will not EVEN DO it
   - Spawn fresh eye subagent and simpler model to compare and tell: what was clear already, what was lost, what needs to be back, what needs to be improved, what needs to be added
5. Avoid:
   - Conditions: IF/THEN/ELSE, UNLESS, WHEN
   - Time-dependency: Before/After/On
   - Meta commentary, Logic => README.md
   - "Each time do X" => Will do => Then will not
6. Ensure:
   - Actionable
   - Intrinsics
   - Process reminders (write state in each phase)
   - Prerequisites and Next steps (incl. overlapping)
   - Specific (always think about side effects - where it will apply this NOT in original thinking: "do not re-read files" => "spawns subagent and gives entire file content as prompt" / "compacts context => does not read the file")
   - Conflict resolution, Fallbacks (to stay in the instruction => not to fall out it)
   - User Invocable? Model Invocable?
   - Description: < 30 tokens, Call to action (!), Not what it contains, Not what it does, Basically when to call it
7. Hints/Tricks:
   - Follow up with "Honestly ..."
   - Use background agents => cost nothing
   - Use long-running agents per area (backend, frontend, one part of the backend, another part of the backend)
   - Introspection, Retrospection - Mostly Do NOT Work - Weights are ALREADY activated - Biased
   - "If there is a remote chance", "May see sensitive data", "Probably will be used" => Not just direct trigger
   - Use verb + "SKILL XYZ", "SUBAGENT ABC", "TOOL 123" => Many tools are only triggered IF keywords ARE present
   - Self-learning
   - Self-organization (make it to define its own checklists, file structures, catalogs/indexes, etc)
