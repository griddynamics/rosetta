import { describe, it, expect, vi } from 'vitest';
import { TerminalSession } from '../../src/terminal/session';
import type { SubmitMode } from '../../src/terminal/types';

/**
 * TerminalSession (§5.3): PTY + headless emulator. Snapshots are the rendered,
 * ANSI-free visible grid; input honors backpressure via chunked writes.
 */

function waitFor(pred: () => boolean, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = (): void => {
      if (pred()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('waitFor timeout'));
      setTimeout(tick, 20);
    };
    tick();
  });
}

describe('TerminalSession', () => {
  it('renders a bounded, ANSI-free snapshot of the visible grid', async () => {
    const s = new TerminalSession({
      command: '/bin/sh',
      args: ['-c', 'printf "\\033[31mRED\\033[0m plain\\n"; sleep 0.2'],
      cwd: process.cwd(),
      env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin' },
      submit: 'enter',
    });
    await waitFor(() => s.snapshot().includes('RED'));
    const snap = s.snapshot();
    expect(snap).toContain('RED plain');
    expect(snap).not.toContain('['); // no raw ANSI escapes
    expect(s.panes).toHaveLength(1);
    expect(s.primary.id).toBe('primary');
    s.kill();
  });

  it('reports exit and delivers input written to the PTY', async () => {
    const s = new TerminalSession({
      command: '/bin/sh',
      args: ['-c', 'read line; echo "got:$line"'],
      cwd: process.cwd(),
      env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin' },
      submit: 'enter',
    });
    let exited = false;
    s.onExit(() => {
      exited = true;
    });
    await s.submitLine('hello');
    await waitFor(() => s.snapshot().includes('got:hello'));
    await waitFor(() => exited);
    expect(s.hasExited).toBe(true);
  });

  it('paste+enter delivers a submitted line over a real PTY (markers stripped by consumer)', async () => {
    // End-to-end over a real PTY with the PRODUCTION submit path (bracketed paste, §5.3):
    // a consumer that enables bracketed-paste mode (DECSET 2004) at startup, accumulates
    // stdin, strips the paste markers, and echoes on the trailing CR — proving the
    // discrete Enter terminates the paste as a genuine submit AND that the harness only
    // wraps once it has OBSERVED the app's mode.
    const consumer = [
      "process.stdout.write('\\x1b[?2004h');",
      "let b='';",
      "process.stdin.on('data',d=>{",
      "  b+=d.toString();",
      "  if(b.includes('\\r')||b.includes('\\n')){",
      "    const s=b.replace(/\\x1b\\[20[01]~/g,'').replace(/[\\r\\n]+/g,'');",
      "    process.stdout.write('got:'+s+'\\n');",
      "    process.exit(0);",
      "  }",
      "});",
    ].join('');
    const s = new TerminalSession({
      command: process.execPath,
      args: ['-e', consumer],
      cwd: process.cwd(),
      env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin' },
      submit: 'paste+enter',
    });
    let exited = false;
    s.onExit(() => {
      exited = true;
    });
    // Wait until the harness has OBSERVED the app's bracketed-paste mode before submitting.
    await waitFor(() => s.bracketedPasteMode);
    await s.submitLine('English');
    await waitFor(() => s.snapshot().includes('got:English'));
    await waitFor(() => exited);
    expect(s.hasExited).toBe(true);
  });

  // §5.3 binding rule: the Enter keystroke is ALWAYS a SEPARATE PTY write, after the
  // body — never `text\r` in one write (root cause of the M6.5 codex submit failure).
  // §5.3 DECSET ruling: wrapping is MODE-OBSERVED — the paste markers are sent only while
  // the app has bracketed-paste mode enabled (it emitted `ESC[?2004h`).
  //
  // `enablePaste` picks the child: one that turns bracketed-paste mode ON at startup, or
  // one that never does. When ON, we wait until the session has OBSERVED the mode before
  // capturing the submit sequence.
  async function captureSubmit(
    mode: SubmitMode,
    text: string,
    enablePaste: boolean,
  ): Promise<string[]> {
    const script = enablePaste
      ? "process.stdout.write('\\x1b[?2004h'); setTimeout(()=>{}, 3000);"
      : 'setTimeout(()=>{}, 3000);';
    const s = new TerminalSession({
      command: process.execPath,
      args: ['-e', script],
      cwd: process.cwd(),
      env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin' },
      submit: mode,
    });
    if (enablePaste) await waitFor(() => s.bracketedPasteMode);
    const writes: string[] = [];
    const spy = vi.spyOn(s, 'write').mockImplementation(async (input: string) => {
      writes.push(input);
    });
    return s.submitLine(text).then(() => {
      spy.mockRestore();
      s.kill();
      return writes;
    });
  }

  // WRAPPED state (mode observed enabled): every paste submit (paste+enter and the
  // type+enter alias) is FOUR writes — open marker, text, close marker, discrete CR.
  for (const mode of ['paste+enter', 'type+enter'] as SubmitMode[]) {
    it(`submitLine (${mode}, mode enabled) → bracketed paste as four separate writes`, async () => {
      const writes = await captureSubmit(mode, 'English', true);
      expect(writes).toEqual(['\x1b[200~', 'English', '\x1b[201~', '\r']);
    });
  }

  // WRAPPED state: single-line text is wrapped just the same — no content inspection.
  it('submitLine (paste+enter, mode enabled) wraps single-line text with no \\n-detection', async () => {
    const writes = await captureSubmit('paste+enter', 'one-word', true);
    expect(writes).toEqual(['\x1b[200~', 'one-word', '\x1b[201~', '\r']);
  });

  // WRAPPED state: a multi-line payload keeps its embedded newline as literal composer
  // text inside the paste (never an early submit); the ONE Enter at the end submits.
  it('submitLine (paste+enter, mode enabled) keeps embedded newlines literal inside the paste', async () => {
    const writes = await captureSubmit('paste+enter', 'line one\nline two', true);
    expect(writes).toEqual(['\x1b[200~', 'line one\nline two', '\x1b[201~', '\r']);
  });

  // UNWRAPPED fallback (mode NOT enabled): a paste profile degrades to the plain two-write
  // sequence — the markers would be meaningless to an app that never turned the mode on.
  it('submitLine (paste+enter, mode NOT enabled) → plain [text, "\\r"] with no paste markers', async () => {
    const writes = await captureSubmit('paste+enter', 'English', false);
    expect(writes).toEqual(['English', '\r']);
  });

  // `enter` is the plain two-write FALLBACK — never wrapped, even when the app HAS enabled
  // bracketed-paste mode. This is also the "raw text is never wrapped" assertion.
  it('submitLine (enter, mode enabled) → plain [text, "\\r"] — never wrapped', async () => {
    const writes = await captureSubmit('enter', 'English', true);
    expect(writes).toEqual(['English', '\r']);
  });

  // Mode-toggle mid-session: a child that turns bracketed paste ON then OFF. The FIRST
  // submit (mode on) wraps; after the app disables the mode, the SECOND submit degrades to
  // plain — proving the wrap decision tracks the app's live mode, not a static profile bit.
  it('submitLine tracks the app mode across a mid-session DECSET toggle', async () => {
    const script =
      "process.stdout.write('\\x1b[?2004h');" +
      "setTimeout(()=>process.stdout.write('\\x1b[?2004l'), 300);" +
      'setTimeout(()=>{}, 3000);';
    const s = new TerminalSession({
      command: process.execPath,
      args: ['-e', script],
      cwd: process.cwd(),
      env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin' },
      submit: 'paste+enter',
    });

    await waitFor(() => s.bracketedPasteMode); // app enabled the mode
    const wrapped: string[] = [];
    let spy = vi.spyOn(s, 'write').mockImplementation(async (input: string) => {
      wrapped.push(input);
    });
    await s.submitLine('first');
    spy.mockRestore();
    expect(wrapped).toEqual(['\x1b[200~', 'first', '\x1b[201~', '\r']);

    await waitFor(() => !s.bracketedPasteMode); // app disabled the mode
    const plain: string[] = [];
    spy = vi.spyOn(s, 'write').mockImplementation(async (input: string) => {
      plain.push(input);
    });
    await s.submitLine('second');
    spy.mockRestore();
    expect(plain).toEqual(['second', '\r']);

    s.kill();
  });
});
