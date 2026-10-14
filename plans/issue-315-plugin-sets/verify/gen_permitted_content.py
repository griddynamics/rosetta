#!/usr/bin/env python3
"""Generate permitted_content.json for ac_equivalence.py. Read-only on the repo (git + files).

  main   --from REF --to REF [--check] [--manifest FILE]
      Layer 1 (main_post_golden): skill READMEs edited on main between two NAMED refs that no path
      class covers. Reads git objects only, never the working tree. --check regenerates the section
      in memory and exits 0 if it equals the committed one, 1 if not (nothing is written).
  branch --tree DIR [--golden DIR] [--base REF] [--manifest FILE]
      Layer 2 (branch_authored): the 15 strict + 7 presence files changed on this branch since --base
      (default 0ad95943, the merge commit). Rendered per target from DIR (the regenerated plugins tree)
      versus the golden. Refuses when a golden->tree hunk of a strict file is neither the layer-1 hunk
      nor maps 1:1 to a source-changed hunk. Source side: `git diff -U0 BASE -- instructions/r3`.

Output is deterministic: sorted keys, 2-space indent, trailing newline.
"""
import argparse, collections, difflib, json, pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import ac_equivalence as eq  # noqa: E402

MANIFEST = HERE / "permitted_content.json"
SCOPE = "instructions/r3/*/skills/*/README.md"
STRICT = ["codemap", "dangerous-actions", "deviation", "orchestration", "post-mortem", "questioning",
          "risk-assessment", "rosetta", "self-learning", "self-organization", "sensitive-data",
          "subagent-directives", "solr-extending", "solr-query"]
PA_SCHEMAS = "instructions/r3/core/skills/coding-agents-prompt-authoring/references/pa-schemas.md"
PRESENCE = ["coding-agents-hooks-authoring", "coding-agents-prompt-authoring", "debugging",
            "load-project-context", "natural-writing", "testing", "requirements-authoring"]
REASONS = {
    "orchestration": "Track E agents path (instructions/r3/workflows/agents) and Track P plugin-relative path",
    "requirements-authoring": "docs/requirements -> docs/REQUIREMENTS rename (7b3e7426)",
    "pa-schemas.md": "Track P rule line: README paths are plugin-relative (owner D1)",
}
DEFAULT_REASON = "Track P: README paths are plugin-relative (owner D1)"
HUNK_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")


def git(*a):
    return subprocess.check_output(["git", *a], cwd=ROOT, text=True)


def src_hunks(diff_args):
    """-U0 hunks as (old_start, removed, added, new_start)."""
    out, cur = [], None
    for ln in git("diff", "-U0", "--no-color", *diff_args).split("\n"):
        m = HUNK_RE.match(ln)
        if m:
            cur = [int(m.group(1)), [], [], int(m.group(3))]
            out.append(cur)
        elif cur is not None and ln[:1] == "-" and not ln.startswith("---"):
            cur[1].append(ln[1:])
        elif cur is not None and ln[:1] == "+" and not ln.startswith("+++"):
            cur[2].append(ln[1:])
    return [(a, tuple(r), tuple(d), n) for a, r, d, n in out]


def dump(obj):
    return json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def build_main(frm, to):
    names = git("diff", "--name-only", frm, to, "--", SCOPE).split()
    skills, seen = {}, {}
    for p in sorted(names):
        name = p.split("/")[-2]
        if eq.classify(f"skills/{name}/README.md"):
            continue  # a path class already covers it
        if name in seen:
            raise SystemExit(f"skill name collision: {p} vs {seen[name]}")
        seen[name] = p
        hs = src_hunks([frm, to, "--", p])
        if not hs or any(r for _, r, _, _ in hs):
            raise SystemExit(f"{p}: main's edit is not pure insertion; layer 1 cannot represent it")
        skills[name] = {"path": p,
                        "hunks": [{"anchor_after_line": a, "added": list(d)} for a, _, d, _ in hs]}
    commits = git("log", "--reverse", "--abbrev=8", "--format=%h %s", f"{frm}..{to}", "--",
                  *[v["path"] for v in skills.values()]).strip().split("\n")
    return {"source": {"from": frm, "to": to, "commits": [c for c in commits if c]},
            "scope": SCOPE, "skills": skills}


def mask(s):
    return re.sub(r"`[^`]*`", "``", s)


def best(line, pool, label, path):
    """The rendered line closest to a source line: ratio >= 0.6 and a clear margin."""
    sc = sorted(((difflib.SequenceMatcher(None, line, c, autojunk=False).ratio(), c) for c in pool), reverse=True)
    if not sc or sc[0][0] < 0.6 or (len(sc) > 1 and sc[0][0] - sc[1][0] < 0.1):
        raise SystemExit(f"{label}: {path}: no unique rendering of source line {line[:60]!r}")
    return sc[0][1]


def build_branch(tree, golden, base, l1, main_ref=None):
    changed = set(git("diff", "--name-only", base, "--", "instructions/r3").split())
    if main_ref:  # files changed since base only by main (worktree == main tip) are main-owned, not branch-authored
        same = [p for p in changed if subprocess.run(["git", "diff", "--quiet", main_ref, "--", p], cwd=ROOT).returncode == 0]
        changed -= set(same)
    decl = {}
    for name in STRICT + PRESENCE:
        c = sorted(pathlib.Path(ROOT).glob(f"instructions/r3/*/skills/{name}/README.md"))
        if len(c) != 1:
            raise SystemExit(f"declared skill {name}: {len(c)} README sources")
        decl[str(c[0].relative_to(ROOT))] = (name, "strict" if name in STRICT else "presence")
    decl[PA_SCHEMAS] = ("pa-schemas.md", "strict")
    readmes_changed = {p for p in changed if p.endswith(("README.md", "pa-schemas.md"))}
    if readmes_changed != set(decl):
        raise SystemExit("changed-since-base != declared 22:\n  only changed: %s\n  only declared: %s" %
                         (sorted(readmes_changed - set(decl)), sorted(set(decl) - readmes_changed)))
    if changed - readmes_changed:
        print("note: other instructions/r3 files changed since base (not shipped as gate files): "
              + ", ".join(sorted(changed - readmes_changed)), file=sys.stderr)
    out = {}
    for src, (name, mode) in sorted(decl.items()):
        shs = src_hunks([base, "--", src])
        targets = {}
        for ide in eq.IDES:
            for suf in ("", "-light"):
                label, gdir = f"rosetta-{ide}{suf}", golden / f"core-{ide}{suf}"
                rx = re.compile(r"(^|/)skills/%s/README\.md$" % re.escape(name)) if name != "pa-schemas.md" \
                    else re.compile(r"(^|/)skills/coding-agents-prompt-authoring/references/pa-schemas\.md$")
                g = eq.files(gdir) or {}
                cand = [p for p in g if rx.search(p)]
                if len(cand) != 1:
                    raise SystemExit(f"{label}: {len(cand)} golden copies of {name}")
                path = cand[0]
                tp = tree / label / path
                if not tp.is_file():
                    raise SystemExit(f"{label}: {path} missing in tree")
                hs = eq.hunks(eq.lines_of(g[path]), eq.lines_of(tp))
                if name in l1["skills"]:
                    for h in [(x["anchor_after_line"], (), tuple(x["added"])) for x in l1["skills"][name]["hunks"]]:
                        if h not in hs:
                            raise SystemExit(f"{label}: {path}: layer-1 hunk {h[0]} not observed")
                        hs.remove(h)
                if mode == "strict":
                    claimed, ent = set(), []
                    for (_, sr, sa, nstart) in shs:  # exact up to backtick-quoted path rendering
                        m = [i for i in range(len(hs)) if i not in claimed
                             and [mask(x) for x in hs[i][1]] == [mask(x) for x in sr]
                             and [mask(x) for x in hs[i][2]] == [mask(x) for x in sa]]
                        if len(m) != 1:
                            raise SystemExit(f"{label}: {path}: source hunk {src}:{nstart} maps to {len(m)} tree hunks")
                        claimed.add(m[0])
                        at, r, a = hs[m[0]]
                        ent.append({"at": at, "removed": list(r), "added": list(a), "source": f"{src}:{nstart}"})
                    if len(claimed) != len(hs):
                        rest = [hs[i] for i in range(len(hs)) if i not in claimed]
                        raise SystemExit(f"{label}: {path}: {len(rest)} unmapped hunk(s) in a strict file: {eq.fmt(rest[0])}")
                else:  # presence: line-level. The line may share a hunk with path-class edits.
                    ent = []
                    pool_a = sorted({x for h in hs for x in h[2]})
                    pool_r = sorted({x for h in hs for x in h[1]})
                    for (_, sr, sa, nstart) in shs:
                        ent.append({"removed": [best(y, pool_r, label, path) for y in sr],
                                    "added": [best(x, pool_a, label, path) for x in sa],
                                    "source": f"{src}:{nstart}"})
                targets[label] = {"path": path, "hunks": ent}
        out[name if name != "pa-schemas.md" else "coding-agents-prompt-authoring/references/pa-schemas.md"] = {
            "mode": mode, "source": src, "reason": REASONS.get(name, DEFAULT_REASON), "targets": targets}
    return {"source": {"diff_base": base, "diff": "git diff -U0 BASE -- instructions/r3 (worktree)", "main_ref": main_ref,
                       "strict": sum(1 for v in out.values() if v["mode"] == "strict"),
                       "presence": sum(1 for v in out.values() if v["mode"] == "presence")},
            "files": out}


def load(path):
    p = pathlib.Path(path)
    return json.loads(p.read_text()) if p.is_file() else {}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("main")
    m.add_argument("--from", dest="frm", required=True)
    m.add_argument("--to", required=True)
    m.add_argument("--check", action="store_true")
    b = sub.add_parser("branch")
    b.add_argument("--tree", type=pathlib.Path, required=True)
    b.add_argument("--golden", type=pathlib.Path, default=eq.GOLD)
    b.add_argument("--base", default="0ad95943")
    b.add_argument("--main-ref", default=None, help="main tip: files changed since base but equal to it are main-owned")
    for s in (m, b):
        s.add_argument("--manifest", type=pathlib.Path, default=MANIFEST)
    a = ap.parse_args(argv)
    cur = load(a.manifest)
    if a.cmd == "main":
        sec = build_main(a.frm, a.to)
        if a.check:
            same = cur.get("main_post_golden") == sec
            print("main_post_golden: " + ("UP TO DATE" if same else "DIFFERS from git (regenerate)"))
            return 0 if same else 1
        cur["main_post_golden"] = sec
        print(f"main_post_golden: {len(sec['skills'])} skills, {len(sec['source']['commits'])} commit(s)")
    else:
        if "main_post_golden" not in cur:
            raise SystemExit("run `main` first: layer 2 needs the layer-1 section")
        sec = build_branch(a.tree.resolve(), a.golden.resolve(), a.base, cur["main_post_golden"], a.main_ref)
        cur["branch_authored"] = sec
        print(f"branch_authored: {sec['source']['strict']} strict + {sec['source']['presence']} presence files")
    a.manifest.write_text(dump(cur))
    return 0


if __name__ == "__main__":
    sys.exit(main())
