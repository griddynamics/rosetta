import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// src/shared/version.ts  -> ../../package.json = rosettify/package.json (vitest)
// dist/shared/version.js -> ../../package.json = rosettify/package.json (built)
export const VERSION: string = (
  JSON.parse(readFileSync(join(here, "../../package.json"), "utf8")) as { version: string }
).version;
