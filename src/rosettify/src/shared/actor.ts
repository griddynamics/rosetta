// Implements FR-SPECS-0041 (actor identity resolution).
// Ordered fallback chain, first non-empty value wins. Never performs network calls, never
// throws, and never fails the caller's write — an unresolved identity degrades to "unknown".

import { execFileSync } from "child_process";
import * as os from "os";

const GIT_TIMEOUT_MS = 500;

/** Runs `git config <scope> <key>` and returns the trimmed value, or "" on any failure. */
function tryGitConfig(scope: "--local" | "--global", key: string): string {
  try {
    const out = execFileSync("git", ["config", scope, key], {
      timeout: GIT_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return out.trim();
  } catch {
    // Not a git repo, no such key, git absent, or timed out — all treated the same: skip.
    return "";
  }
}

/** Best-effort os.userInfo().username lookup; never throws. */
function tryOsUserInfo(): string {
  try {
    return os.userInfo().username?.trim() ?? "";
  } catch {
    return "";
  }
}

// FR-SPECS-0041 — ordered fallback chain: (1) explicit/ROSETTA_ACTOR, (2) SCM identity,
// (3) OS session identity, (4) literal "unknown". Each entry is evaluated lazily and only
// on demand, so a cheap earlier match (e.g. an explicit actor) never pays for a git subprocess.
function candidateChain(explicit?: string): Array<() => string> {
  return [
    () => explicit ?? "",
    () => process.env["ROSETTA_ACTOR"] ?? "",
    () => tryGitConfig("--local", "user.email") || tryGitConfig("--global", "user.email"),
    () => tryGitConfig("--local", "user.name") || tryGitConfig("--global", "user.name"),
    () => process.env["SUDO_USER"] ?? "",
    () => tryOsUserInfo(),
    () => process.env["USER"] ?? process.env["USERNAME"] ?? "",
  ];
}

/**
 * Resolves the acting user's identity for changed_by/approved_by stamping.
 * MUST NOT throw, MUST NOT perform network calls, and MUST NOT return the literal word
 * "user" (some sandboxed environments report that as a generic placeholder — skip it and
 * keep falling through the chain). Falls back to "unknown" when nothing resolves.
 */
export function resolveActor(explicit?: string): string {
  for (const candidate of candidateChain(explicit)) {
    let value = "";
    try {
      value = (candidate() ?? "").trim();
    } catch {
      value = "";
    }
    if (value && value.toLowerCase() !== "user") return value;
  }
  return "unknown";
}
