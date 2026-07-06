#!/usr/bin/env node
// Example `external` evaluator (§11), shipped with the healthcheck demo case and reused
// by the unit tests. Hook-style contract: read a JSON OBJECT STRING on stdin carrying
// PATHS (not blobs), print `{"values":[{"name","value"}]}` on stdout with each value
// normalized to 0-100.
//
// This one counts the files touched in the workspace diff and reports it as a metric.
// It is deliberately dependency-free and deterministic.
import { readFileSync } from 'node:fs';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

const input = JSON.parse(readStdin() || '{}');

let diff = '';
try {
  if (input.workspaceDiffPath) diff = readFileSync(input.workspaceDiffPath, 'utf8');
} catch {
  diff = '';
}

// `diff -ruN` emits one `+++ ` header per added/modified file and `Only in ` lines for
// files present on just one side — count both as "files changed".
let changed = 0;
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ ') || line.startsWith('Only in ')) changed += 1;
}

// Normalize to 0-100 (the contract requires it): clamp the raw count.
const value = Math.max(0, Math.min(100, changed));

process.stdout.write(JSON.stringify({ values: [{ name: 'files-changed', value }] }));
