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

  it('type+enter submits the line with a discrete Enter after a settle (§5.2, codex)', async () => {
    // A composer that reads the whole line then echoes it — proves the discrete Enter
    // still terminates the line (the settle only separates text from CR; the line is
    // submitted, not left dangling).
    const s = new TerminalSession({
      command: '/bin/sh',
      args: ['-c', 'read line; echo "got:$line"'],
      cwd: process.cwd(),
      env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin' },
      submit: 'type+enter',
    });
    let exited = false;
    s.onExit(() => {
      exited = true;
    });
    await s.submitLine('English');
    await waitFor(() => s.snapshot().includes('got:English'));
    await waitFor(() => exited);
    expect(s.hasExited).toBe(true);
  });

  // §5.3 binding rule: the Enter keystroke is ALWAYS a SEPARATE PTY write, after the
  // body — never `text\r` in one write (root cause of the M6.5 codex submit failure).
  function captureSubmit(mode: SubmitMode, text: string): Promise<string[]> {
    const s = new TerminalSession({
      command: '/bin/sh',
      args: ['-c', 'sleep 1'],
      cwd: process.cwd(),
      env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin' },
      submit: mode,
    });
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

  // Plain single-line modes: TWO writes — text, then a discrete lone CR.
  for (const mode of ['enter', 'type+enter'] as SubmitMode[]) {
    it(`submitLine (${mode}, single line) → [text, "\\r"]`, async () => {
      const writes = await captureSubmit(mode, 'English');
      expect(writes).toEqual(['English', '\r']);
    });
  }

  // paste+enter: FOUR writes — open marker, text, close marker, discrete CR.
  it('submitLine (paste+enter) → bracketed paste as four separate writes', async () => {
    const writes = await captureSubmit('paste+enter', 'English');
    expect(writes).toEqual(['\x1b[200~', 'English', '\x1b[201~', '\r']);
  });

  // A multi-line payload auto-routes to bracketed paste even under a plain profile, so
  // an embedded newline is never read as an early submit.
  it('submitLine auto-routes a multi-line payload to bracketed paste (enter profile)', async () => {
    const writes = await captureSubmit('enter', 'line one\nline two');
    expect(writes).toEqual(['\x1b[200~', 'line one\nline two', '\x1b[201~', '\r']);
  });
});
