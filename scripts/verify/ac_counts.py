#!/usr/bin/env python3
"""Count-statement check (live docs vs instructions/r3).

Computes skills / workflows / rules / agents from instructions/<release>, renders
the count-statement sites of docs/definitions/live_counts.json and requires each
rendered string to occur exactly `count` times in its file. Also scans the shared
scope for banned count forms.

Usage: ac_counts.py [--list-files]
Exit: 0 pass, 1 findings, 2 usage/environment error.
Root = this file's location (scripts/verify/..), never the cwd.
"""
import json
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
CONFIG = ROOT / "docs" / "definitions" / "live_counts.json"
NAME = "COUNTS"
WORDS = ("zero one two three four five six seven eight nine ten eleven twelve thirteen "
         "fourteen fifteen sixteen seventeen eighteen nineteen twenty").split()


def die(msg):
    print(f"{NAME}: ERROR {msg}")
    sys.exit(2)


def load_config():
    if not CONFIG.is_file():
        die(f"missing {CONFIG.relative_to(ROOT)}")
    try:
        cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    except (ValueError, OSError) as e:
        die(f"invalid JSON in {CONFIG.relative_to(ROOT)}: {e}")
    if not isinstance(cfg, dict) or cfg.get("schema") != 1:
        die("unknown or missing schema (expected 1)")
    try:
        s, c, ln = cfg["scope"], cfg["counts"], cfg["links"]
        for k in ("root_globs", "dirs", "extensions", "exclude_prefixes",
                  "exclude_basenames", "exclude_dir_names"):
            assert isinstance(s[k], list), k
        for k in ("sets", "banned", "sites"):
            assert isinstance(c[k], list), k
        assert isinstance(c["request_type_exclusions"], dict)
        assert isinstance(ln["release"], str)
        for site in c["sites"]:
            for k in ("id", "path", "template", "count"):
                assert k in site, f"site key {k}"
    except (KeyError, AssertionError, TypeError) as e:
        die(f"missing or malformed key: {e}")
    return cfg


def scope_files(cfg):
    s = cfg["scope"]
    found = set()
    for g in s["root_globs"]:
        for p in ROOT.glob(g):
            if p.is_file():
                found.add(p.relative_to(ROOT).as_posix())
    for d in s["dirs"]:
        base = ROOT / d
        if not base.is_dir():
            continue
        for dp, dn, fn in os.walk(base):
            for f in fn:
                found.add((pathlib.Path(dp) / f).relative_to(ROOT).as_posix())
    out = []
    for rel in sorted(found):
        base = rel.rsplit("/", 1)[-1]
        i = base.rfind(".")
        ext = base[i + 1:] if i > 0 else ""
        if ext not in s["extensions"]:
            continue
        if any(rel.startswith(x) for x in s["exclude_prefixes"]):
            continue
        if base in s["exclude_basenames"]:
            continue
        if any(part in s["exclude_dir_names"] for part in rel.split("/")):
            continue
        out.append(rel)
    return out


def clean(name):
    return re.sub(r"\.md$", "", re.sub(r"~.*~", "", name))


def front_tags(path):
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return []
    if not lines or lines[0].strip() != "---":
        return []
    for ln in lines[1:]:
        if ln.strip() == "---":
            break
        m = re.match(r"^tags:\s*\[(.*)\]\s*$", ln)
        if m:
            return [t.strip().strip("\"'") for t in m.group(1).split(",") if t.strip()]
    return []


def compute(cfg, fails):
    rel = cfg["links"]["release"]
    base = ROOT / "instructions" / rel
    if not base.is_dir():
        die(f"missing {base.relative_to(ROOT)}")
    dirs = sorted(p.name for p in base.iterdir() if p.is_dir())
    if dirs != sorted(cfg["counts"]["sets"]):
        fails.append(f"FAIL SETS instructions/{rel}: found {dirs} expected {sorted(cfg['counts']['sets'])}"
                     f" (found {len(dirs)} sets)")
    per = {}
    for st in dirs:
        d = base / st
        skills = [p for p in (d / "skills").glob("*") if p.is_dir()] if (d / "skills").is_dir() else []
        wf = sorted((d / "workflows").glob("*.md")) if (d / "workflows").is_dir() else []
        ru = sorted((d / "rules").glob("*.md")) if (d / "rules").is_dir() else []
        ag = sorted((d / "agents").glob("*.md")) if (d / "agents").is_dir() else []
        wf_names = {clean(p.name) for p in wf}
        entry = {clean(p.name) for p in wf if "workflow" in front_tags(p)}
        per[st] = {
            "skills": len(skills),
            "workflow_files": len(wf_names),
            "workflows": len(entry),
            "rules": len({clean(p.name) for p in ru}),
            "agents": len({clean(p.name) for p in ag}),
            "agent_files": len(ag),
            "_entry": entry,
        }
    total = {k: sum(v[k] for v in per.values())
             for k in ("skills", "workflow_files", "workflows", "rules", "agents", "agent_files")}
    entry_all = set().union(*[v["_entry"] for v in per.values()]) if per else set()
    excl = cfg["counts"]["request_type_exclusions"]
    for name in excl:
        if name not in entry_all:
            fails.append(f"FAIL EXCLUSION {name}: not an existing workflow in instructions/{rel} ({excl[name]})")
    total["request_types"] = len([n for n in entry_all if n not in excl])
    return per, total


def render(tpl, per, total):
    def sub(m):
        kind = m.group(0)[1:-1].split(":")
        if kind[0] in ("word", "Word") and len(kind) == 2:
            n = total[kind[1]]
            w = WORDS[n] if n < len(WORDS) else str(n)
            return w.capitalize() if kind[0] == "Word" else w
        if kind[0] == "set" and len(kind) == 3:
            return str(per[kind[1]][kind[2]])
        if len(kind) == 1:
            return str(total[kind[0]])
        raise KeyError(m.group(0))
    return re.sub(r"\{[A-Za-z_:]+\}", sub, tpl)


def main(argv):
    if any(a != "--list-files" for a in argv) or len(argv) > 1:
        print("usage: ac_counts.py [--list-files]")
        return 2
    cfg = load_config()
    files = scope_files(cfg)
    if argv:
        print("\n".join(files))
        return 0
    fails = []
    per, total = compute(cfg, fails)
    print("computed:", " ".join(f"{k}={v}" for k, v in total.items()))
    for st, v in per.items():
        print(f"  {st}: " + " ".join(f"{k}={x}" for k, x in v.items() if not k.startswith("_")))
    for site in cfg["counts"]["sites"]:
        sid, path, want = site["id"], site["path"], site["count"]
        try:
            text = render(site["template"], per, total)
        except KeyError as e:
            die(f"site {sid}: unknown placeholder {e}")
        fp = ROOT / path
        if not fp.is_file():
            fails.append(f"FAIL {sid} {path}: file missing")
            continue
        content = fp.read_text(encoding="utf-8", errors="replace")
        got = content.count(text)
        if got == want:
            print(f"PASS {sid} {path}")
        else:
            first = content.find(text)
            where = f"{path}:{content.count(chr(10), 0, first) + 1}" if first >= 0 else path
            fails.append(f"FAIL {sid} {where}: {got} occurrences, expected {want}: {text!r}")
    banned = []
    for pat in cfg["counts"]["banned"]:
        try:
            banned.append((pat, re.compile(pat)))
        except re.error as e:
            die(f"invalid banned regex {pat!r}: {e}")
    nb = 0
    for rel in files:
        try:
            raw = (ROOT / rel).read_bytes()
        except OSError:
            continue
        if b"\0" in raw:
            continue
        for i, line in enumerate(raw.decode("utf-8", errors="replace").splitlines(), 1):
            for pat, rx in banned:
                if rx.search(line):
                    fails.append(f"FAIL BANNED {rel}:{i} /{pat}/")
                    nb += 1
    for f in fails:
        print(f)
    print(f"scanned={len(files)} sites={len(cfg['counts']['sites'])} banned_hits={nb} failures={len(fails)}")
    print(f"{NAME}: {'FAILURES PRESENT' if fails else 'ALL PASS'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
