/**
 * Asserts the help payload's version field equals package.json version.
 * Bump-proof: reads package.json directly instead of hardcoding the value.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { helpToolDef } from "../../../src/commands/help/index.js";
import type { HelpTopLevel } from "../../../src/registry/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkgVersion: string = (
  JSON.parse(readFileSync(join(here, "../../../package.json"), "utf8")) as { version: string }
).version;

describe("help payload version — matches package.json", () => {
  it("top-level help version equals package.json version", async () => {
    const result = await helpToolDef.run({});
    expect(result.ok).toBe(true);
    const r = result.result as HelpTopLevel;
    expect(r.version).toBe(pkgVersion);
  });

  it("unknown-subcommand fallback version equals package.json version", async () => {
    const result = await helpToolDef.run({ subcommand: "nonexistent" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpTopLevel;
    expect(r.version).toBe(pkgVersion);
  });
});
