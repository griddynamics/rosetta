/**
 * Unit tests for shared/actor.ts — resolveActor's ordered fallback chain. FR-SPECS-0041.
 * Mocks child_process.execFileSync and os.userInfo so no test depends on the real machine's
 * git identity or OS user.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return { ...actual, execFileSync: vi.fn() };
});
vi.mock("os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("os")>();
  return { ...actual, userInfo: vi.fn(actual.userInfo) };
});

import { execFileSync } from "child_process";
import * as os from "os";
import { resolveActor } from "../../../src/shared/actor.js";

const ENV_KEYS = ["ROSETTA_ACTOR", "SUDO_USER", "USER", "USERNAME"] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  for (const k of ENV_KEYS) delete process.env[k];
  vi.mocked(execFileSync).mockReset();
  vi.mocked(os.userInfo).mockReset();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.restoreAllMocks();
});

/** Makes execFileSync succeed only for the given git config key, failing every other call. */
function mockGit(matches: Partial<Record<string, string>>): void {
  vi.mocked(execFileSync).mockImplementation(((cmd: string, args?: readonly string[]) => {
    const key = args?.[2];
    if (cmd === "git" && key && key in matches) return matches[key]! as unknown as Buffer;
    throw new Error("not configured");
  }) as typeof execFileSync);
}

describe("resolveActor — explicit param wins over everything", () => {
  it("returns the explicit value even when ROSETTA_ACTOR is also set", () => {
    process.env["ROSETTA_ACTOR"] = "env-actor";
    expect(resolveActor("explicit-actor")).toBe("explicit-actor");
  });
});

describe("resolveActor — ROSETTA_ACTOR env override", () => {
  it("returns ROSETTA_ACTOR when no explicit param is given", () => {
    process.env["ROSETTA_ACTOR"] = "env-actor";
    mockGit({});
    expect(resolveActor()).toBe("env-actor");
  });
});

describe("resolveActor — git config user.email", () => {
  it("falls back to git user.email when no explicit/env value is set", () => {
    mockGit({ "user.email": "dev@example.com" });
    expect(resolveActor()).toBe("dev@example.com");
  });

  it("falls back to git user.name when user.email is unset but user.name is", () => {
    mockGit({ "user.name": "Dev Person" });
    expect(resolveActor()).toBe("Dev Person");
  });
});

describe("resolveActor — OS session identity", () => {
  it("falls back to SUDO_USER when git yields nothing", () => {
    mockGit({});
    process.env["SUDO_USER"] = "sudo-user";
    expect(resolveActor()).toBe("sudo-user");
  });

  it("falls back to os.userInfo().username when SUDO_USER is unset", () => {
    mockGit({});
    vi.mocked(os.userInfo).mockReturnValue({ username: "os-user" } as os.UserInfo<string>);
    expect(resolveActor()).toBe("os-user");
  });

  it("falls back to USER env var when os.userInfo throws", () => {
    mockGit({});
    vi.mocked(os.userInfo).mockImplementation(() => {
      throw new Error("no user info");
    });
    process.env["USER"] = "env-user";
    expect(resolveActor()).toBe("env-user");
  });

  it("falls back to USERNAME (Windows) when USER is unset", () => {
    mockGit({});
    vi.mocked(os.userInfo).mockImplementation(() => {
      throw new Error("no user info");
    });
    process.env["USERNAME"] = "win-user";
    expect(resolveActor()).toBe("win-user");
  });
});

describe("resolveActor — nothing resolves", () => {
  it('returns the literal "unknown" when every candidate is empty', () => {
    mockGit({});
    vi.mocked(os.userInfo).mockImplementation(() => {
      throw new Error("no user info");
    });
    expect(resolveActor()).toBe("unknown");
  });
});

describe("resolveActor — never returns the literal word 'user'", () => {
  it("skips a candidate that resolves to the literal string 'user' and falls through", () => {
    mockGit({});
    vi.mocked(os.userInfo).mockReturnValue({ username: "user" } as os.UserInfo<string>);
    process.env["USER"] = "user";
    // Every candidate resolves to the generic placeholder "user" — must degrade to "unknown",
    // never surface the literal word "user".
    expect(resolveActor()).toBe("unknown");
  });

  it("is case-insensitive when filtering out the literal 'user' placeholder", () => {
    mockGit({});
    vi.mocked(os.userInfo).mockImplementation(() => {
      throw new Error("no user info");
    });
    process.env["USER"] = "User";
    expect(resolveActor()).toBe("unknown");
  });
});

describe("resolveActor — adjacent-tier precedence (adversarial: both populated, higher tier must win)", () => {
  it("ROSETTA_ACTOR wins over a populated git identity (env tier vs git tier)", () => {
    process.env["ROSETTA_ACTOR"] = "env-actor";
    mockGit({ "user.email": "git@example.com", "user.name": "Git Person" });
    expect(resolveActor()).toBe("env-actor");
  });

  it("git user.email wins over a populated git user.name (email tier vs name tier)", () => {
    mockGit({ "user.email": "git@example.com", "user.name": "Git Person" });
    expect(resolveActor()).toBe("git@example.com");
  });

  it("SUDO_USER wins over a populated os.userInfo (SUDO_USER tier vs os.userInfo tier)", () => {
    mockGit({});
    process.env["SUDO_USER"] = "sudo-user";
    vi.mocked(os.userInfo).mockReturnValue({ username: "os-user" } as os.UserInfo<string>);
    expect(resolveActor()).toBe("sudo-user");
  });

  it("os.userInfo wins over a populated USER env var (os.userInfo tier vs USER tier)", () => {
    mockGit({});
    vi.mocked(os.userInfo).mockReturnValue({ username: "os-user" } as os.UserInfo<string>);
    process.env["USER"] = "env-user";
    expect(resolveActor()).toBe("os-user");
  });
});

describe("resolveActor — never throws", () => {
  it("does not throw when execFileSync throws synchronously", () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("git not found");
    });
    vi.mocked(os.userInfo).mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => resolveActor()).not.toThrow();
    expect(resolveActor()).toBe("unknown");
  });

  it("trims whitespace from a resolved value", () => {
    mockGit({ "user.email": "  spaced@example.com  \n" });
    expect(resolveActor()).toBe("spaced@example.com");
  });
});
