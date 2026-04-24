#!/usr/bin/env node
// dump-stdin.js — helper to capture raw hook stdin for fixture creation
// Usage: configure as a hook in settings.json, then trigger the hook event.
// The captured JSON will be appended to /tmp/hook-stdin-dump.jsonl (one line per invocation).
//
// settings.json example:
//   "PostToolUse": [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "node /path/to/dump-stdin.js" }] }]

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = '/tmp/hook-stdin-dump.jsonl';

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), input: JSON.parse(raw || 'null') });
  fs.appendFileSync(OUTPUT_FILE, line + '\n');
  // Pass through silently — do not interfere with hook chain
  process.exit(0);
});
