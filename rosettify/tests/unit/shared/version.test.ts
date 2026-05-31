/**
 * Unit tests for src/shared/version.ts.
 * Asserts VERSION equals package.json's version field — bump-proof by reading
 * package.json in the test itself rather than hardcoding the expected value.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { VERSION } from "../../../src/shared/version.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkgVersion: string = (
  JSON.parse(readFileSync(join(here, "../../../package.json"), "utf8")) as { version: string }
).version;

describe("VERSION — shared/version.ts", () => {
  it("equals package.json version", () => {
    expect(VERSION).toBe(pkgVersion);
  });

  it("is a non-empty string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION.length).toBeGreaterThan(0);
  });
});
