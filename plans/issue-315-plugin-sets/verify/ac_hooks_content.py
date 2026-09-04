#!/usr/bin/env python3
"""B2 — content gate over the hooks.json family. Read-only.

WHY THIS EXISTS
    NFR-0001's parity gate compares output file PATHS only, and ac_equivalence.py
    blanket-permits every content change to a file named hooks.json (permitted
    difference #2). Between them, a document that changed SHAPE while keeping its
    path passed every gate in PR #340: <set>-copilot/hooks/hooks.json went from the
    60-byte standalone form to a 24443-byte copy of the plugin form, and nothing
    noticed. A path-set oracle cannot see that. This gate can.

WHAT IT ASSERTS, per (set x target)
    A  PATHS     the exact hooks.json path set the target is supposed to emit
    B  IDENTITY  documents required to be byte-identical are     (codex mirror pair,
                 copilot root <-> .github/plugin)
    C  DISTINCT  documents required to DIFFER actually do        (copilot plugin form
                 vs standalone-form staging; cursor's two forms at posture=true)
    D  FORM      each document carries its own form's markers, not the other's
    E  JSON      every emitted document parses
    F  HASH      sha256 per document, printed, so any future content change is
                 visible in a diff of this gate's output rather than silently permitted

USAGE
    python3 ac_hooks_content.py [--tree DIR] [--posture true|false]
      --tree     plugin output tree to check      (default: <repo>/plugins)
      --posture  the --deterministic-hooks value  (default: false, the shipped one)
                 the value that BUILT the tree; some assertions only apply at true

Build a posture=true tree into scratch first, never into plugins/:
    npm --prefix src/rosettify-plugins start -- --release r3 \
        --deterministic-hooks true --source $PWD --output /tmp/hooks-true
"""
import argparse, hashlib, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
GOLD = ROOT / "agents/TEMP/315-golden"

# Every set that emits hooks, as the destination stem before the target suffix.
HOOK_SETS = ["core", "rosetta", "rosetta-light"]

# The hooks.json path set each target must emit, and the relations between them.
# 'identical' / 'distinct' are lists of (path_a, path_b).
TARGETS = {
    "antigravity": {
        "paths": ["hooks.json"],
    },
    "claude": {
        "paths": ["hooks/hooks.json"],
    },
    "codex": {
        # .codex/hooks.json is a sync-time mirror of .codex-plugin/hooks.json
        "paths": [".codex-plugin/hooks.json", ".codex/hooks.json"],
        "identical": [(".codex-plugin/hooks.json", ".codex/hooks.json")],
    },
    "copilot": {
        # FR-VAR-0030: exactly three documents, three purposes.
        #   hooks.json (root)            -- alternate-name copy of the plugin form
        #   .github/plugin/hooks.json    -- the plugin form proper
        #   hooks/hooks.json             -- the STANDALONE form, staging source for
        #                                   the copilot-standalone target
        "paths": ["hooks.json", ".github/plugin/hooks.json", "hooks/hooks.json"],
        "identical": [("hooks.json", ".github/plugin/hooks.json")],
        "distinct": [("hooks.json", "hooks/hooks.json")],
        "standalone_form": ["hooks/hooks.json"],
        "plugin_form": ["hooks.json", ".github/plugin/hooks.json"],
    },
    "copilot-standalone": {
        "paths": [".github/hooks/hooks.json"],
        "standalone_form": [".github/hooks/hooks.json"],
    },
    "cursor": {
        #   hooks.json (root)   -- the STANDALONE form, staging for cursor-standalone
        #   hooks/hooks.json    -- the plugin form (what plugin.json points at)
        "paths": ["hooks.json", "hooks/hooks.json"],
        # At posture=false both legitimately reduce to {"version":1,"hooks":{}},
        # so the distinctness of the two forms is only observable at posture=true.
        "distinct_at_true": [("hooks.json", "hooks/hooks.json")],
    },
    "cursor-standalone": {
        "paths": [".cursor/hooks.json"],
    },
}

# Markers that tell the two Copilot forms apart. The standalone form addresses hooks
# at .github/hooks/ and carries a present-but-empty sessionStart; the plugin form
# probes the marketplace install root instead.
PLUGIN_FORM_MARKER = "agent-plugins"       # the $HOME/.vscode/agent-plugins probe loop
STANDALONE_FORM_MARKER = ".github/hooks/"  # in-repo extraction path


def digest(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


class Check:
    def __init__(self):
        self.failures = []
        self.checked = 0

    def fail(self, plugin, msg):
        self.failures.append(f"  FAIL  {plugin}: {msg}")

    def ok(self):
        self.checked += 1


def check_plugin(tree: pathlib.Path, plugin: str, spec: dict, posture_true: bool, c: Check):
    base = tree / plugin
    if not base.is_dir():
        return  # set/target pair not built in this tree; AC1 owns folder presence

    # --- A. PATHS -----------------------------------------------------------
    expected = set(spec["paths"])
    actual = {
        str(p.relative_to(base).as_posix())
        for p in base.rglob("hooks.json")
        if "harness/references/hooks/" not in str(p.as_posix())
    }
    if actual != expected:
        for extra in sorted(actual - expected):
            c.fail(plugin, f"unexpected hooks.json at {extra}")
        for missing in sorted(expected - actual):
            c.fail(plugin, f"missing hooks.json at {missing}")
        return
    c.ok()

    present = {rel: base / rel for rel in expected}

    # --- E. JSON validity ---------------------------------------------------
    parsed = {}
    for rel, path in present.items():
        try:
            parsed[rel] = json.loads(path.read_text())
            c.ok()
        except json.JSONDecodeError as e:
            c.fail(plugin, f"{rel} is not valid JSON: {e}")

    # --- B. IDENTITY --------------------------------------------------------
    for a, b in spec.get("identical", []):
        if digest(present[a]) != digest(present[b]):
            c.fail(plugin, f"{a} and {b} must be byte-identical, they differ")
        else:
            c.ok()

    # --- C. DISTINCTNESS ----------------------------------------------------
    pairs = list(spec.get("distinct", []))
    if posture_true:
        pairs += list(spec.get("distinct_at_true", []))
    for a, b in pairs:
        if digest(present[a]) == digest(present[b]):
            c.fail(
                plugin,
                f"{a} and {b} must be DIFFERENT documents, they are byte-identical "
                f"({present[a].stat().st_size} B) — the two forms have collapsed",
            )
        else:
            c.ok()

    # --- D. FORM MARKERS ----------------------------------------------------
    for rel in spec.get("standalone_form", []):
        text = present[rel].read_text()
        doc = parsed.get(rel, {})
        if PLUGIN_FORM_MARKER in text:
            c.fail(plugin, f"{rel} is the standalone form but carries the plugin-form "
                           f"marketplace probe ({PLUGIN_FORM_MARKER!r})")
        else:
            c.ok()
        hooks = doc.get("hooks", {}) if isinstance(doc, dict) else {}
        if "sessionStart" not in hooks:
            c.fail(plugin, f"{rel} standalone form must carry a present sessionStart key")
        elif hooks["sessionStart"] != []:
            c.fail(plugin, f"{rel} standalone form must carry an EMPTY sessionStart, "
                           f"found {len(hooks['sessionStart'])} entr(y/ies)")
        else:
            c.ok()

    for rel in spec.get("plugin_form", []):
        if STANDALONE_FORM_MARKER in present[rel].read_text():
            c.fail(plugin, f"{rel} is the plugin form but addresses hooks at "
                           f"{STANDALONE_FORM_MARKER!r}, the standalone path")
        else:
            c.ok()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tree", default=str(ROOT / "plugins"))
    ap.add_argument("--posture", default="false", choices=["true", "false"])
    args = ap.parse_args()

    tree = pathlib.Path(args.tree)
    posture_true = args.posture == "true"
    print(f"=== B2 hooks.json content gate — tree={tree} "
          f"--deterministic-hooks {args.posture} ===")

    c = Check()
    for target, spec in TARGETS.items():
        for s in HOOK_SETS:
            # rosetta-light is the -light variant suffix, not a set stem
            plugin = f"rosetta-{target}-light" if s == "rosetta-light" else f"{s}-{target}"
            check_plugin(tree, plugin, spec, posture_true, c)

    # --- F. HASHES ----------------------------------------------------------
    print("\n--- content hashes per (set x target) ---")
    for target in TARGETS:
        for s in HOOK_SETS:
            plugin = f"rosetta-{target}-light" if s == "rosetta-light" else f"{s}-{target}"
            base = tree / plugin
            if not base.is_dir():
                continue
            for rel in TARGETS[target]["paths"]:
                p = base / rel
                if p.is_file():
                    print(f"  {digest(p)[:16]}  {p.stat().st_size:>7} B  {plugin}/{rel}")

    # --- golden cross-check: the standalone-form staging document ------------
    print("\n--- golden cross-check (posture=false only) ---")
    gold = GOLD / "core-copilot/hooks/hooks.json"
    if not posture_true and gold.is_file():
        for s in HOOK_SETS:
            plugin = "rosetta-copilot-light" if s == "rosetta-light" else f"{s}-copilot"
            cur = tree / plugin / "hooks/hooks.json"
            if not cur.is_file():
                continue
            if digest(cur) == digest(gold):
                print(f"  PASS  {plugin}/hooks/hooks.json matches golden standalone form")
                c.ok()
            else:
                c.fail(plugin, f"hooks/hooks.json ({cur.stat().st_size} B) does not match "
                               f"the golden standalone form ({gold.stat().st_size} B) at "
                               f"agents/TEMP/315-golden/core-copilot/hooks/hooks.json")
    else:
        print("  skipped")

    print()
    if c.failures:
        print(f"{len(c.failures)} failure(s), {c.checked} assertion(s) passed:")
        for f in c.failures:
            print(f)
        print("\nHOOKS CONTENT: FAILURES PRESENT")
        return 1
    print(f"all {c.checked} assertion(s) passed")
    print("HOOKS CONTENT: ALL PASS")
    return 0


sys.exit(main())
