#!/usr/bin/env node

import { runCli } from "../frontends/cli.js";
import { runMcp } from "../frontends/mcp.js";

const args = process.argv.slice(2);

if (args.includes("--mcp")) {
  // Remove --mcp from args, verify no command args remain
  const filtered = args.filter((a) => a !== "--mcp");
  if (filtered.length > 0) {
    process.stderr.write(
      JSON.stringify({
        ok: false,
        error: "--mcp is mutually exclusive with commands",
        result: null,
        include_help: false,
      }) + "\n",
    );
    process.exit(1);
  }
  await runMcp();
} else {
  await runCli(args);
}
