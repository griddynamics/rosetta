#!/usr/bin/env python3
"""
Solr skill evals runner.

Loads SKILL.md (+ optionally references) as system prompt, sends each
test case prompt to an OpenAI-compatible chat completions endpoint
(LM Studio by default), grades the response, and prints a summary.

Usage:
    # Against LM Studio with default localhost:1234
    python run_evals.py --provider lmstudio --model qwen2.5-coder-32b

    # Against any OpenAI-compatible endpoint
    python run_evals.py --provider openai \\
        --base-url http://localhost:1234/v1 \\
        --api-key not-needed \\
        --model qwen

    # Filter by category, difficulty, file, or id glob
    python run_evals.py --filter category=block-join
    python run_evals.py --filter difficulty=hard
    python run_evals.py --filter file=04-tag-exclude
    python run_evals.py --filter id=spot-error-*

    # Skill only, no references (useful for measuring how much references help)
    python run_evals.py --skill-only

    # Verbose: print model response for every case
    python run_evals.py --verbose

    # Save results to JSON for later analysis
    python run_evals.py --output results.json
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:
    print(
        "ERROR: missing 'requests'. Install with: pip install -r requirements.txt",
        file=sys.stderr,
    )
    sys.exit(2)

from grader import grade, lint_asserts


# ANSI colors (disabled if not a TTY)
_TTY = sys.stdout.isatty()
GREEN = "\033[32m" if _TTY else ""
RED = "\033[31m" if _TTY else ""
YELLOW = "\033[33m" if _TTY else ""
DIM = "\033[2m" if _TTY else ""
RESET = "\033[0m" if _TTY else ""


# ---------- Loading ----------

def load_skill(skill_dir: Path, with_references: bool = True) -> str:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        raise FileNotFoundError(f"SKILL.md not found in {skill_dir}")
    parts = [skill_md.read_text(encoding="utf-8")]

    if with_references:
        ref_dir = skill_dir / "references"
        if ref_dir.is_dir():
            for f in sorted(ref_dir.glob("*.md")):
                parts.append(
                    f"\n\n---\n\n# Reference: {f.name}\n\n"
                    + f.read_text(encoding="utf-8")
                )
    return "\n".join(parts)


def load_skills_concat(skill_dirs: list[str], with_references: bool = True) -> str:
    """Concatenate multiple skills' SKILL.md (and references) into one prompt.
    Used by --skill all to test cross-skill triggering / interaction."""
    parts = []
    for d in skill_dirs:
        p = Path(d)
        if not (p / "SKILL.md").exists():
            print(f"{YELLOW}WARN: skipping {d} — no SKILL.md{RESET}", file=sys.stderr)
            continue
        parts.append(f"\n\n========== SKILL: {p.name} ==========\n\n")
        parts.append(load_skill(p, with_references=with_references))
    return "\n".join(parts)


def load_cases(cases_dir: Path) -> list[dict]:
    if not cases_dir.is_dir():
        raise FileNotFoundError(f"cases dir not found: {cases_dir}")
    cases = []
    # rglob picks up both cases/*.json (legacy) and cases/<skill>/*.json (new layout)
    for f in sorted(cases_dir.rglob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"{RED}ERROR: invalid JSON in {f}: {e}{RESET}", file=sys.stderr)
            sys.exit(2)
        if not isinstance(data, list):
            print(f"{RED}ERROR: {f} must contain a JSON array{RESET}", file=sys.stderr)
            sys.exit(2)
        for case in data:
            case["_file"] = f.stem
            # Capture the parent directory name (e.g., "query") as a derivable filter key
            case["_skill"] = f.parent.name if f.parent != cases_dir else ""
            cases.append(case)
    return cases


def lint_all_cases(cases: list[dict]) -> int:
    """Lint every case, return number of cases with warnings."""
    bad = 0
    seen_ids: dict[str, str] = {}
    for c in cases:
        cid = c.get("id", "<no-id>")
        warnings = lint_asserts(c.get("asserts", {}))
        if cid in seen_ids:
            warnings.append(f"duplicate id, also in {seen_ids[cid]}")
        seen_ids[cid] = c.get("_file", "?")
        for w in warnings:
            print(
                f"{YELLOW}LINT [{c.get('_file', '?')}/{cid}]: {w}{RESET}",
                file=sys.stderr,
            )
        if warnings:
            bad += 1
    return bad


def parse_filter(filter_str: str | None) -> dict[str, str]:
    """Parse --filter 'key=value[,key2=value2]' into a dict."""
    if not filter_str:
        return {}
    out = {}
    for part in filter_str.split(","):
        part = part.strip()
        if not part:
            continue
        if "=" not in part:
            raise ValueError(f"--filter '{part}' must be key=value")
        k, v = part.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def case_matches_filter(case: dict, filt: dict[str, str]) -> bool:
    for key, val in filt.items():
        if key == "file":
            if not fnmatch.fnmatchcase(case.get("_file", ""), val):
                return False
        elif key == "id":
            if not fnmatch.fnmatchcase(case.get("id", ""), val):
                return False
        else:
            if case.get(key) != val:
                return False
    return True


# ---------- Model invocation ----------

# Anthropic per-million-token pricing (USD). Update as needed.
# Source: https://docs.claude.com/en/docs/about-claude/pricing
ANTHROPIC_PRICING = {
    "claude-opus-4-7": (15.0, 75.0),
    "claude-opus-4-6": (15.0, 75.0),
    "claude-opus-4-5": (15.0, 75.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-sonnet-4-5": (3.0, 15.0),
    "claude-haiku-4-5": (1.0, 5.0),
}


def _call_openai_compat(
    base_url: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    api_key: str | None,
    temperature: float,
    max_tokens: int,
    timeout: int,
) -> dict:
    """OpenAI-compatible chat completions (LM Studio, vLLM, OpenAI itself)."""
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    r = requests.post(url, headers=headers, json=body, timeout=timeout)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code} from {url}: {r.text[:500]}")
    payload = r.json()
    try:
        text = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        raise RuntimeError(
            f"Unexpected response shape: {json.dumps(payload)[:500]}"
        ) from e
    usage = payload.get("usage", {}) or {}
    return {
        "text": text,
        "input_tokens": usage.get("prompt_tokens"),
        "output_tokens": usage.get("completion_tokens"),
        "cost_usd": None,
    }


def _call_anthropic(
    base_url: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    api_key: str | None,
    temperature: float,
    max_tokens: int,
    timeout: int,
) -> dict:
    """Anthropic Messages API. system goes as a top-level param, not in messages."""
    if not api_key:
        raise RuntimeError("Anthropic provider requires --api-key (or ANTHROPIC_API_KEY env var)")
    url = base_url.rstrip("/") + "/v1/messages"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }
    body = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    r = requests.post(url, headers=headers, json=body, timeout=timeout)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code} from {url}: {r.text[:500]}")
    payload = r.json()
    try:
        # content is a list of blocks; collect text blocks
        blocks = payload["content"]
        text = "".join(b["text"] for b in blocks if b.get("type") == "text")
    except (KeyError, IndexError, TypeError) as e:
        raise RuntimeError(
            f"Unexpected response shape: {json.dumps(payload)[:500]}"
        ) from e

    usage = payload.get("usage", {}) or {}
    in_tok = usage.get("input_tokens")
    out_tok = usage.get("output_tokens")

    cost = None
    pricing = ANTHROPIC_PRICING.get(model)
    if pricing and in_tok is not None and out_tok is not None:
        in_price, out_price = pricing
        cost = (in_tok / 1_000_000) * in_price + (out_tok / 1_000_000) * out_price

    return {
        "text": text,
        "input_tokens": in_tok,
        "output_tokens": out_tok,
        "cost_usd": cost,
    }


def call_model(
    provider: str,
    base_url: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    api_key: str | None,
    temperature: float,
    max_tokens: int,
    timeout: int,
) -> dict:
    """Dispatch to provider-specific call. Returns dict with text, usage, cost."""
    if provider == "anthropic":
        return _call_anthropic(
            base_url, model, system_prompt, user_prompt,
            api_key, temperature, max_tokens, timeout,
        )
    return _call_openai_compat(
        base_url, model, system_prompt, user_prompt,
        api_key, temperature, max_tokens, timeout,
    )


# ---------- Reporting ----------

def fmt_case_line(case: dict, status: str, color: str) -> str:
    file_part = f"{DIM}[{case['_file']}]{RESET}"
    id_part = case.get("id", "<no-id>")
    return f"{file_part} {id_part:<40} {color}{status}{RESET}"


def print_summary(results: list[dict]) -> None:
    # If multiple conditions, only summarize the "with" condition for back-compat
    conds = {r.get("condition", "with") for r in results}
    if len(conds) > 1:
        results = [r for r in results if r.get("condition") == "with"]

    total = len(results)
    if total == 0:
        print("\nNo cases were run.")
        return

    passed = sum(1 for r in results if r["passed"])
    errored = sum(1 for r in results if r.get("error"))
    failed = total - passed - errored

    print()
    print("Summary:")
    pct = 100 * passed / total if total else 0
    print(f"  Passed:  {GREEN}{passed}/{total} ({pct:.0f}%){RESET}")
    if failed:
        print(f"  Failed:  {RED}{failed}{RESET}")
    if errored:
        print(f"  Errored: {YELLOW}{errored}{RESET}")

    # Breakdown by category
    by_cat_total: Counter = Counter()
    by_cat_failed: Counter = Counter()
    for r in results:
        cat = r.get("category", "?")
        by_cat_total[cat] += 1
        if not r["passed"]:
            by_cat_failed[cat] += 1
    if by_cat_failed:
        print(f"\n  Failed by category:")
        for cat in sorted(by_cat_failed, key=lambda c: -by_cat_failed[c]):
            print(f"    {cat}: {by_cat_failed[cat]}/{by_cat_total[cat]}")

    # Breakdown by difficulty
    by_diff_total: Counter = Counter()
    by_diff_passed: Counter = Counter()
    for r in results:
        d = r.get("difficulty", "?")
        by_diff_total[d] += 1
        if r["passed"]:
            by_diff_passed[d] += 1
    print(f"\n  By difficulty:")
    for d in ("easy", "medium", "hard"):
        if d in by_diff_total:
            t = by_diff_total[d]
            p = by_diff_passed[d]
            pct = 100 * p / t if t else 0
            print(f"    {d:<7} {p}/{t} ({pct:.0f}%)")


def print_compare_summary(results: list[dict]) -> None:
    """Summary that compares 'with skill' vs 'without skill' conditions."""
    by_id = defaultdict(dict)
    for r in results:
        by_id[r["id"]][r.get("condition", "with")] = r

    total = len(by_id)
    if total == 0:
        print("\nNo cases were run.")
        return

    helped = 0  # without:FAIL → with:PASS
    hurt = 0   # without:PASS → with:FAIL
    both_pass = 0
    both_fail = 0
    incomplete = 0

    for cid, conds in by_id.items():
        w = conds.get("with")
        wo = conds.get("without")
        if not w or not wo:
            incomplete += 1
            continue
        wp, wop = w["passed"], wo["passed"]
        if wp and wop:
            both_pass += 1
        elif not wp and not wop:
            both_fail += 1
        elif wp and not wop:
            helped += 1
        else:
            hurt += 1

    print("\nCompare summary (with skill vs without):")
    pass_w = sum(1 for cid, c in by_id.items() if c.get("with", {}).get("passed"))
    pass_wo = sum(1 for cid, c in by_id.items() if c.get("without", {}).get("passed"))
    pct_w = 100 * pass_w / total if total else 0
    pct_wo = 100 * pass_wo / total if total else 0
    delta = pct_w - pct_wo
    delta_color = GREEN if delta > 0 else (RED if delta < 0 else "")
    print(f"  Without skill: {pass_wo}/{total} ({pct_wo:.0f}%)")
    print(f"  With skill:    {pass_w}/{total} ({pct_w:.0f}%)")
    print(f"  Lift:          {delta_color}{delta:+.0f} pp{RESET}")
    print()
    print(f"  {GREEN}↑ Helped (FAIL → PASS): {helped}{RESET}")
    print(f"  {RED}↓ Hurt   (PASS → FAIL): {hurt}{RESET}")
    print(f"  ✓✓ Both passed: {both_pass}")
    print(f"  ✗✗ Both failed: {both_fail}")
    if incomplete:
        print(f"  {YELLOW}? Incomplete pairs: {incomplete}{RESET}")

    # Per-category lift
    cat_data: dict[str, dict[str, int]] = defaultdict(lambda: {"with": 0, "without": 0, "total": 0})
    for cid, conds in by_id.items():
        if "with" not in conds or "without" not in conds:
            continue
        cat = conds["with"].get("category", "?")
        cat_data[cat]["total"] += 1
        if conds["with"]["passed"]:
            cat_data[cat]["with"] += 1
        if conds["without"]["passed"]:
            cat_data[cat]["without"] += 1

    if cat_data:
        print(f"\n  Per-category lift:")
        # Sort by absolute lift desc
        rows = []
        for cat, d in cat_data.items():
            t = d["total"]
            lift = (d["with"] - d["without"])
            rows.append((cat, d["without"], d["with"], t, lift))
        rows.sort(key=lambda x: -x[4])
        for cat, wo, w, t, lift in rows:
            color = GREEN if lift > 0 else (RED if lift < 0 else "")
            print(f"    {cat:<22} {wo}/{t} → {w}/{t}   {color}{lift:+d}{RESET}")


# ---------- Main ----------

def main() -> int:
    here = Path(__file__).resolve().parent
    repo_root = here.parent.parent  # evals/runner -> evals -> skill bundle root (skills/solr)

    parser = argparse.ArgumentParser(
        description="Run Solr skill evals against an OpenAI-compatible endpoint",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--provider",
        choices=["lmstudio", "openai", "anthropic"],
        default="lmstudio",
        help="lmstudio: local LM Studio at :1234. openai: OpenAI-compatible (--base-url required). anthropic: Claude Messages API.",
    )
    parser.add_argument("--base-url", default=None,
                        help="Base URL. Defaults: lmstudio→http://localhost:1234/v1, anthropic→https://api.anthropic.com")
    parser.add_argument("--api-key", default=None,
                        help="API key. For anthropic also reads ANTHROPIC_API_KEY env var.")
    parser.add_argument("--model", required=True, help="Model identifier as accepted by the endpoint")
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--max-tokens", type=int, default=1024)
    parser.add_argument("--timeout", type=int, default=180,
                        help="HTTP timeout per request in seconds")

    parser.add_argument(
        "--skill",
        choices=["query", "schema", "extending", "semantic-search", "all"],
        default=None,
        help=(
            "Shortcut to set --skill-dir and --cases-dir for one of the three skills. "
            "'query' → solr-query/ + evals/cases/query/. "
            "'all' → concatenates all three SKILL.md files (rare; mostly for cross-skill probes). "
            "Overrides default --skill-dir / --cases-dir; explicit flags still win."
        ),
    )
    parser.add_argument("--cases-dir", default=None,
                        help="Cases directory (default: derived from --skill, or evals/cases/ for legacy single-skill layout)")
    parser.add_argument("--skill-dir", default=None,
                        help="Skill directory containing SKILL.md (default: derived from --skill, or 'solr/' for legacy single-skill layout)")
    parser.add_argument("--skill-only", action="store_true",
                        help="Load only SKILL.md as system prompt, no references")
    parser.add_argument("--no-skill", action="store_true",
                        help="Run with empty system prompt (baseline; useful with --compare)")
    parser.add_argument("--compare", action="store_true",
                        help="Run each case TWICE (with skill and without) and report the lift")

    parser.add_argument("--filter", default=None,
                        help="Filter cases: 'category=X', 'difficulty=Y', 'file=Z', 'id=glob*' (comma-separated)")
    parser.add_argument("--limit", type=int, default=None,
                        help="Stop after N cases (for smoke tests)")
    parser.add_argument("--verbose", action="store_true",
                        help="Print full model response for every case")
    parser.add_argument("--show-failures", action="store_true", default=True,
                        help="Print failure details for failed cases (default: on)")
    parser.add_argument("--no-show-failures", dest="show_failures", action="store_false")
    parser.add_argument("--output", default=None,
                        help="Save full results as JSON to this path")
    parser.add_argument("--lint-only", action="store_true",
                        help="Only lint cases, do not call model")

    args = parser.parse_args()

    # Resolve --skill into skill-dir and cases-dir defaults
    # Three modes:
    #   1. --skill X → standard layout: solr-X/ + evals/cases/X/
    #   2. --skill all → concatenate solr-{query,schema,extending}/ SKILL.md, all cases
    #   3. neither --skill nor explicit dirs → legacy single-skill layout (solr/ + evals/cases/)
    # Explicit --skill-dir / --cases-dir always win.
    if args.skill is None:
        # Legacy defaults
        if args.skill_dir is None:
            args.skill_dir = str(repo_root / "solr")
        if args.cases_dir is None:
            args.cases_dir = str(repo_root / "evals" / "cases")
        skill_concat_list = None
    elif args.skill == "all":
        if args.skill_dir is None:
            # Special marker — load_skill needs to handle this
            args.skill_dir = "__ALL__"
        if args.cases_dir is None:
            args.cases_dir = str(repo_root / "evals" / "cases")
        skill_concat_list = [
            str(repo_root / "solr-query"),
            str(repo_root / "solr-schema"),
            str(repo_root / "solr-extending"),
            str(repo_root / "solr-semantic-search"),
        ]
    else:
        # Single named skill: query / schema / extending
        if args.skill_dir is None:
            args.skill_dir = str(repo_root / f"solr-{args.skill}")
        if args.cases_dir is None:
            args.cases_dir = str(repo_root / "evals" / "cases" / args.skill)
        skill_concat_list = None

    # Resolve base URL per provider
    if args.base_url is None:
        if args.provider == "lmstudio":
            args.base_url = "http://localhost:1234/v1"
        elif args.provider == "anthropic":
            args.base_url = "https://api.anthropic.com"
        else:
            print("ERROR: --base-url is required for --provider openai", file=sys.stderr)
            return 2

    # Resolve api key (env-var fallback for anthropic)
    import os
    if args.api_key is None and args.provider == "anthropic":
        args.api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not args.api_key:
            print("ERROR: --api-key required for anthropic (or set ANTHROPIC_API_KEY)", file=sys.stderr)
            return 2

    # Validate flag combinations
    if args.compare and args.no_skill:
        print("ERROR: --compare and --no-skill are mutually exclusive", file=sys.stderr)
        return 2
    if args.skill_only and args.no_skill:
        print("ERROR: --skill-only and --no-skill are mutually exclusive", file=sys.stderr)
        return 2

    # Load cases
    cases = load_cases(Path(args.cases_dir))
    lint_warnings = lint_all_cases(cases)
    if lint_warnings:
        print(
            f"{YELLOW}Linter found warnings in {lint_warnings} case(s) (see above){RESET}",
            file=sys.stderr,
        )

    if args.lint_only:
        print(f"Loaded {len(cases)} cases. Lint complete.")
        return 0 if lint_warnings == 0 else 1

    # Filter
    try:
        filt = parse_filter(args.filter)
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2
    cases = [c for c in cases if case_matches_filter(c, filt)]

    if args.limit:
        cases = cases[: args.limit]

    if not cases:
        print("No cases matched filter.", file=sys.stderr)
        return 1

    # Load skill (used for "with skill" runs only)
    if skill_concat_list:
        skill_prompt = load_skills_concat(skill_concat_list, with_references=not args.skill_only)
    else:
        skill_prompt = load_skill(Path(args.skill_dir), with_references=not args.skill_only)
    skill_chars = len(skill_prompt)
    skill_label = "SKILL.md only" if args.skill_only else "SKILL.md + references"

    # Determine which condition(s) to run
    # condition: "with" → use skill_prompt, "without" → empty system
    if args.compare:
        conditions = ["without", "with"]
    elif args.no_skill:
        conditions = ["without"]
    else:
        conditions = ["with"]

    print(f"{DIM}Provider: {args.provider}  Endpoint: {args.base_url}{RESET}")
    print(f"{DIM}Model: {args.model}  Temperature: {args.temperature}{RESET}")
    print(f"{DIM}Skill: {skill_chars:,} chars ({skill_label}){RESET}")
    print(f"{DIM}Conditions: {conditions}{RESET}")
    total_calls = len(cases) * len(conditions)
    print(f"\nRunning {len(cases)} cases × {len(conditions)} condition(s) = {total_calls} model calls...\n")

    results: list[dict] = []
    t_start = time.time()

    for case in cases:
        case_results = {}  # condition -> result dict

        for cond in conditions:
            sys_prompt = skill_prompt if cond == "with" else ""

            r = {
                "id": case.get("id"),
                "file": case.get("_file"),
                "category": case.get("category"),
                "difficulty": case.get("difficulty"),
                "condition": cond,
                "passed": False,
                "failures": [],
                "error": None,
                "response": None,
                "duration_s": None,
                "input_tokens": None,
                "output_tokens": None,
                "cost_usd": None,
            }

            t_case = time.time()
            try:
                resp = call_model(
                    provider=args.provider,
                    base_url=args.base_url,
                    model=args.model,
                    system_prompt=sys_prompt,
                    user_prompt=case["prompt"],
                    api_key=args.api_key,
                    temperature=args.temperature,
                    max_tokens=args.max_tokens,
                    timeout=args.timeout,
                )
                r["response"] = resp["text"]
                r["input_tokens"] = resp.get("input_tokens")
                r["output_tokens"] = resp.get("output_tokens")
                r["cost_usd"] = resp.get("cost_usd")
                graded = grade(resp["text"], case.get("asserts", {}))
                r["passed"] = graded["passed"]
                r["failures"] = graded["failures"]
            except Exception as e:
                r["error"] = str(e)

            r["duration_s"] = round(time.time() - t_case, 2)
            results.append(r)
            case_results[cond] = r

        # Live line(s)
        for cond in conditions:
            r = case_results[cond]
            tag = f" [{cond}]" if len(conditions) > 1 else ""
            if r["error"]:
                print(fmt_case_line(case, f"ERROR{tag}", YELLOW))
                print(f"  {YELLOW}{r['error']}{RESET}")
            elif r["passed"]:
                print(fmt_case_line(case, f"✓ PASS{tag}", GREEN))
            else:
                print(fmt_case_line(case, f"✗ FAIL{tag}", RED))
                if args.show_failures:
                    for f in r["failures"]:
                        print(f"    {RED}- {f}{RESET}")

            if args.verbose and r["response"] is not None:
                print(f"    {DIM}response ({len(r['response'])} chars):{RESET}")
                for line in r["response"].splitlines():
                    print(f"    {DIM}| {line}{RESET}")

        # Per-case lift in compare mode
        if args.compare:
            w = case_results["with"]["passed"]
            wo = case_results["without"]["passed"]
            if w and not wo:
                print(f"    {GREEN}↑ skill helped (without:FAIL → with:PASS){RESET}")
            elif wo and not w:
                print(f"    {RED}↓ skill HURT (without:PASS → with:FAIL){RESET}")

    elapsed = time.time() - t_start
    print(f"\n{DIM}Completed in {elapsed:.1f}s ({elapsed/total_calls:.1f}s/call avg){RESET}")

    # Cost summary if any condition had cost data
    total_cost = sum(r["cost_usd"] for r in results if r.get("cost_usd"))
    total_in = sum((r.get("input_tokens") or 0) for r in results)
    total_out = sum((r.get("output_tokens") or 0) for r in results)
    if total_in or total_out:
        cost_str = f"  Total: {total_in:,} in + {total_out:,} out tokens"
        if total_cost:
            cost_str += f"  ≈ ${total_cost:.3f}"
        print(cost_str)

    if args.compare:
        print_compare_summary(results)
    else:
        print_summary(results)

    if args.output:
        Path(args.output).write_text(
            json.dumps(
                {
                    "provider": args.provider,
                    "model": args.model,
                    "base_url": args.base_url,
                    "conditions": conditions,
                    "skill_only": args.skill_only,
                    "filter": args.filter,
                    "elapsed_s": round(elapsed, 2),
                    "total_input_tokens": total_in or None,
                    "total_output_tokens": total_out or None,
                    "total_cost_usd": round(total_cost, 4) if total_cost else None,
                    "results": results,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\nResults saved to {args.output}")

    # Exit code: 0 if all passed (in the "with" condition primarily); 1 otherwise
    primary_cond = "with" if "with" in conditions else "without"
    primary = [r for r in results if r["condition"] == primary_cond]
    return 0 if primary and all(r["passed"] for r in primary) else 1


if __name__ == "__main__":
    sys.exit(main())
