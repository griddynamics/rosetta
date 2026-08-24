<harness_environment>

Isolated ephemeral environment where the agent develops, runs, tests, and validates without fear of destroying anything.

<runnable_set>

What "running" actually requires:

- the service(s) under change
- data services: databases, caches, brokers, object storage, search
- schema and data: migrations, sanitized backup restore, init scripts, fixtures
- supporting infra: reverse proxy, mail catcher, identity stub
- config: env files, ports, service discovery names

Empty schema ≠ runnable. Data is part of the environment.

</runnable_set>

<artifacts>

- `devcontainer.json` — image or compose reference, features, post-create and post-start commands, forwarded ports.
- compose file — topology, health checks, dependency ordering, named volumes.
- Dockerfile — only when image plus features cannot express it.
- seed and restore scripts — idempotent, re-runnable, fast, sanitized data only.
- reset command — tear down, recreate from scratch. Ephemeral is the point.

Extend the project's existing local-run assets; never fork a parallel setup beside them.

</artifacts>

<dependency_triage>

Classify EVERY dependency leaving the box. No blanket mocking, no blanket allowing.

Safe to consume directly:

- read-only — identity/OAuth authenticate, config or feature-flag read, catalog lookup
- fully own-scoped lifecycle — we create, we process, we delete; nothing pre-existing touched
- dedicated sandbox tenant, unshared

Unsafe:

- acts on records it did not create — batch processors, schedulers, queue consumers, reconcilers
- shared database, queue, or index — other people's data and test runs
- side effects reaching real humans — email, SMS, push, payments, outbound webhooks
- global state — shared feature flags, shared config, shared cache invalidation

Uncertain = unsafe until the user decides otherwise.

</dependency_triage>

<containment_options>

Options with cost and fidelity; the user chooses. Cheapest first:

1. Interceptor — block at the client boundary, fail loud. Cheapest; proves nothing about the integration.
2. Feature flag — path never executes. Cheap; hides that path from testing.
3. Echo/validate mock — accept, validate contract, log, return canned response. Fits outbound side effects.
4. Filter proxy — real pass-through, our own data only, in and out. Preserves behavior; filter rule must be exact and reviewed.
5. Run it locally — own container, or its team's devcontainer/harness. Highest fidelity, highest effort; best when the dependency is ours.
6. Sandbox tenant — real service, isolated scope. Only if the provider offers one.

Record the chosen option per dependency, and why.

</containment_options>

<hitl>

Gate, never assume:

- every dependency classified unsafe or uncertain
- the containment choice for each
- any backup used for seeding, and how it is sanitized
- any credential the environment needs
- resource cost when the full set is heavy

</hitl>

<proof>

- Clean checkout → open in container → environment up → a harness action or smoke request succeeds, documented commands only.
- Reset returns to the same working state.
- No unsafe dependency reachable from inside — verify by attempting the call, not by reading config.

</proof>

<registration>

`ARCHITECTURE.md` under `## Harness`: how to start it, what runs inside, which externals are contained and by which option.

</registration>

</harness_environment>
