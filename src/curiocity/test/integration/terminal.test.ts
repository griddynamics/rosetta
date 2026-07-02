import { describe, it, expect } from 'vitest';
import { TerminalSession } from '../../src/terminal/session';

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
});
