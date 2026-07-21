/**
 * Unit tests for commands/specs/errors.ts — describeError fallback. FR-SPECS-0043.
 */
import { describe, it, expect } from "vitest";
import { describeError, ERR_SPECS_NOT_FOUND } from "../../../src/commands/specs/errors.js";

describe("describeError", () => {
  it("returns the authored template for a known code", () => {
    expect(describeError(ERR_SPECS_NOT_FOUND)).toBe("The specs document was not found at the given path.");
  });

  it("returns the code itself when it has no authored template", () => {
    expect(describeError("some_unmapped_code")).toBe("some_unmapped_code");
  });
});
