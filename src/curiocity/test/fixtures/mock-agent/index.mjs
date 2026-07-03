#!/usr/bin/env node
// Mock coding-agent TUI (§10.3). Plain Node, zero deps, runs under a real PTY.
// It is scripted by a JSON scene (MOCK_SCENE) and itself writes the ctrl files the
// canonical hooks would (§5.2): session-start.json once, stop.jsonl per turn, plus
// its own transcript dialect. Paths arrive via env from MockAdapter.renderHooks
// (session-start / stop) and buildLaunch (transcript / session id). The task prompt
// is argv[2] (a launch argument, auto-submitted — D15).

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const scenePath = process.env.MOCK_SCENE;
const sessionStartPath = process.env.MOCK_SESSION_START;
const stopPath = process.env.MOCK_STOP;
const transcriptPath = process.env.MOCK_TRANSCRIPT;
const sessionId = process.env.MOCK_SESSION_ID ?? 'mock-session';
const prompt = process.argv[2] ?? '';
const cwd = process.cwd();

const scene = JSON.parse(readFileSync(scenePath, 'utf8'));

function out(s) {
  process.stdout.write(s);
}
function nowIso() {
  return new Date().toISOString();
}
function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}
function appendTranscript(obj) {
  ensureDir(transcriptPath);
  appendFileSync(transcriptPath, `${JSON.stringify({ ts: nowIso(), ...obj })}\n`);
}

// --- stdin line reader ------------------------------------------------------
let stdinBuf = '';
const lineQueue = [];
const lineWaiters = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  stdinBuf += chunk;
  let idx;
  while ((idx = stdinBuf.indexOf('\n')) >= 0) {
    // Strip CR (submit sends CRLF-ish) and bracketed-paste wrappers if present.
    let line = stdinBuf.slice(0, idx).replace(/\r$/, '');
    line = line.replace(/\x1b\[200~/g, '').replace(/\x1b\[201~/g, '');
    stdinBuf = stdinBuf.slice(idx + 1);
    const w = lineWaiters.shift();
    if (w) w(line);
    else lineQueue.push(line);
  }
});
function readLine() {
  if (lineQueue.length > 0) return Promise.resolve(lineQueue.shift());
  return new Promise((resolve) => lineWaiters.push(resolve));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- session start ----------------------------------------------------------
function writeSessionStart() {
  const payload = {
    session_id: sessionId,
    transcript_path: transcriptPath,
    cwd,
    model: 'mock-model',
    source: 'startup',
  };
  ensureDir(sessionStartPath);
  writeFileSync(sessionStartPath, JSON.stringify(payload));
}

function appendStop(message) {
  const payload = {
    session_id: sessionId,
    transcript_path: transcriptPath,
    last_assistant_message: message,
  };
  ensureDir(stopPath);
  appendFileSync(stopPath, `${JSON.stringify(payload)}\n`);
}

async function runStep(step) {
  switch (step.type) {
    case 'print':
      out(`${step.text}\n`);
      appendTranscript({ type: 'assistant', text: step.text });
      break;
    case 'tool':
      out(`[tool:${step.name}] ${step.text ?? ''}\n`);
      appendTranscript({ type: 'tool_call', name: step.name, text: step.text ?? '' });
      break;
    case 'file': {
      const path = `${cwd}/${step.path}`;
      ensureDir(path);
      writeFileSync(path, step.text ?? '');
      appendTranscript({ type: 'tool_call', name: 'Write', text: step.path });
      break;
    }
    case 'structured-question':
      out(`? ${step.question} [${(step.options ?? []).join('/')}]\n`);
      appendTranscript({
        type: 'tool_call',
        name: 'AskUserQuestion',
        question: step.question,
        options: step.options ?? [],
      });
      break;
    case 'await-input': {
      const answer = await readLine();
      appendTranscript({ type: 'user', text: answer, record: step.record ?? 'free-text' });
      out(`(received: ${answer})\n`);
      break;
    }
    case 'stop':
      if (step.message) appendTranscript({ type: 'assistant', text: step.message });
      // A `task_complete` marker (like Codex's) makes done deterministic (no LLM).
      if (step.complete) appendTranscript({ type: 'lifecycle', name: 'task_complete' });
      appendStop(step.message ?? '');
      break;
    case 'spin': {
      const frames = ['|', '/', '-', '\\'];
      const end = Date.now() + (step.ms ?? 1000);
      let i = 0;
      while (Date.now() < end) {
        out(`\rworking ${frames[i % frames.length]} ${i}`);
        i += 1;
        await sleep(40);
      }
      out('\n');
      break;
    }
    case 'freeze':
      await sleep(step.ms ?? 1000);
      break;
    case 'sleep':
      await sleep(step.ms ?? 0);
      break;
    case 'exit':
      appendTranscript({ type: 'usage', inputTokens: 100, outputTokens: 50 });
      process.exit(step.code ?? 0);
      break;
    default:
      out(`[mock] unknown step ${JSON.stringify(step.type)}\n`);
  }
}

async function idleUntilTerminated() {
  // Wait for the harness's terminate() (`/exit`) after the scene completes.
  for (;;) {
    const line = await readLine();
    if (line.trim() === '/exit') {
      appendTranscript({ type: 'usage', inputTokens: 100, outputTokens: 50 });
      process.exit(0);
    }
  }
}

async function main() {
  // Enable bracketed-paste mode (DECSET 2004) at startup like the real v1 TUIs do, so the
  // harness observes it and exercises the WRAPPED submit path (§5.3). A scene may opt out
  // with `"bracketedPaste": false` to exercise the plain (unwrapped) fallback instead.
  if (scene.bracketedPaste !== false) out('\x1b[?2004h');
  if (scene.banner) out(`${scene.banner}\n`);
  writeSessionStart();
  appendTranscript({ type: 'user', text: prompt });
  for (const step of scene.steps ?? []) {
    await runStep(step);
  }
  await idleUntilTerminated();
}

main().catch((err) => {
  process.stderr.write(`[mock] fatal: ${err?.stack ?? err}\n`);
  process.exit(3);
});
