import nodePty from 'node-pty';
import type { IPty } from 'node-pty';
import xterm from '@xterm/headless';
import type { Terminal as XtermTerminal } from '@xterm/headless';
import type { SubmitMode } from './types';

// node-pty and @xterm/headless are CommonJS; under native ESM (tsx/forked child)
// only the default export is reliable, so we destructure the named members here.
const { spawn } = nodePty;
const { Terminal } = xterm;

/**
 * `TerminalSession` (§5.3) — node-pty + @xterm/headless, pane-ready. v1 has exactly
 * one pane; the `panes[]` / `primary` surface is the reserved multi-pane seam (§16).
 *
 * PTY rules (§4, binding): the read loop always drains (the `onData` handler is
 * attached before/at spawn and never blocks), writes are chunked and yield the
 * event loop between chunks so a large write can never starve the reader
 * (circular-wait deadlock), and XON/XOFF handling is left to pass-through so agent
 * output is never silently paused. Screen reads go through the rendered grid, never
 * raw ANSI.
 */

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 40;
/** Chunk size for input writes; keeps a single write from flooding the PTY (§4). */
const WRITE_CHUNK = 1024;

/** Settle between the message text and the DISCRETE Enter keystroke (§5.3, binding),
 *  so the composer does not read `text\r` as one paste burst / literal newline. */
const SUBMIT_SETTLE_MS = 200;

export interface Pane {
  readonly id: string;
  /** Rendered visible grid, ANSI-free (§5.3). */
  snapshot(): string;
}

export interface TerminalSpawnOptions {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  /** Profile submit sequencing for line input (§5.2 `submit`). */
  submit: SubmitMode;
  cols?: number;
  rows?: number;
}

type DataListener = (paneId: string, bytes: string) => void;

const yieldToLoop = (): Promise<void> => new Promise((r) => setImmediate(r));

class HeadlessPane implements Pane {
  readonly id: string;
  readonly term: XtermTerminal;

  constructor(id: string, cols: number, rows: number) {
    this.id = id;
    this.term = new Terminal({
      cols,
      rows,
      allowProposedApi: true,
      // No scrollback: the snapshot is the bounded *visible* grid only (§5.3),
      // which keeps any downstream LLM screen-read cost bounded.
      scrollback: 0,
    });
  }

  snapshot(): string {
    const buf = this.term.buffer.active;
    const lines: string[] = [];
    for (let row = 0; row < this.term.rows; row += 1) {
      const line = buf.getLine(buf.viewportY + row);
      lines.push(line ? line.translateToString(true) : '');
    }
    // Drop trailing blank rows so the hash of a "settled" screen is stable.
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  }
}

export class TerminalSession {
  readonly panes: Pane[];
  readonly primary: Pane;

  private readonly pty: IPty;
  private readonly pane: HeadlessPane;
  private readonly submitMode: SubmitMode;
  private readonly listeners = new Set<DataListener>();
  private exited = false;
  private exitInfo: { exitCode: number; signal?: number } | null = null;
  private readonly exitListeners = new Set<(info: { exitCode: number; signal?: number }) => void>();

  constructor(opts: TerminalSpawnOptions) {
    const cols = opts.cols ?? DEFAULT_COLS;
    const rows = opts.rows ?? DEFAULT_ROWS;
    this.submitMode = opts.submit;
    this.pane = new HeadlessPane('primary', cols, rows);
    this.panes = [this.pane];
    this.primary = this.pane;

    this.pty = spawn(opts.command, opts.args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: opts.cwd,
      env: opts.env,
      // Leave flow control as pass-through so XON/XOFF never silently pauses the
      // agent's output stream (§4).
      handleFlowControl: false,
    });

    // Read loop: always draining. Feed the emulator and fan out to listeners.
    this.pty.onData((bytes) => {
      this.pane.term.write(bytes);
      for (const cb of this.listeners) cb(this.pane.id, bytes);
    });

    this.pty.onExit((e) => {
      this.exited = true;
      this.exitInfo = { exitCode: e.exitCode, ...(e.signal !== undefined ? { signal: e.signal } : {}) };
      for (const cb of this.exitListeners) cb(this.exitInfo);
    });
  }

  onData(cb: DataListener): void {
    this.listeners.add(cb);
  }

  onExit(cb: (info: { exitCode: number; signal?: number }) => void): void {
    if (this.exited && this.exitInfo) {
      cb(this.exitInfo);
      return;
    }
    this.exitListeners.add(cb);
  }

  get hasExited(): boolean {
    return this.exited;
  }

  get exitStatus(): { exitCode: number; signal?: number } | null {
    return this.exitInfo;
  }

  /** Raw input write, chunked + event-loop-yielding to honor backpressure (§4). */
  async write(input: string): Promise<void> {
    if (this.exited) return;
    for (let off = 0; off < input.length; off += WRITE_CHUNK) {
      this.pty.write(input.slice(off, off + WRITE_CHUNK));
      // Yield so the concurrent read loop drains before the next chunk.
      await yieldToLoop();
    }
    if (input.length === 0) await yieldToLoop();
  }

  /**
   * Submit a line of typed input using the profile's submit sequencing (§5.2/§5.3/D15).
   *
   * BINDING RULE (§5.3): the Enter keystroke (`\r`) is ALWAYS a SEPARATE PTY write,
   * sent AFTER the message body has flushed and the composer has settled. Writing the
   * text and CR concatenated in one write is read by the claude/codex interactive
   * composers as a bracketed-paste / literal newline INSIDE the input box — NOT a
   * submission (the confirmed root-cause class of the M6.5 codex submit failure: the
   * typed answer sat unsent in `›` until the freeze watchdog fired).
   *
   * **Bracketed paste is the default and only production submit path** (§5.3 ruling):
   * every v1 profile uses `paste+enter`, so ALL submits — single-line included, no
   * content inspection — are FOUR writes: `\x1b[200~`, the text, `\x1b[201~`, then a
   * separate `\r`. Both v1 TUIs enable bracketed paste; wrapping single-line text is
   * harmless, and one code path is one tested path. Embedded `\n` stay literal composer
   * text (never an early submit).
   *
   * `enter` mode is the plain TWO-write fallback (text, then a separate `\r`), kept
   * profile-selectable for a TUI that does not support bracketed paste; it is not used
   * by any v1 profile.
   *
   * This is the only place submit sequencing is applied — raw `write()` (dialog
   * keystrokes, arrow keys, bare `\r`, Ctrl+C terminate) is never wrapped or terminated.
   */
  async submitLine(text: string): Promise<void> {
    if (this.submitMode === 'enter') {
      // Plain fallback: text, then a separate discrete Enter.
      await this.write(text);
    } else {
      // Bracketed paste (default): open marker, body, close marker as DISTINCT writes.
      await this.write('\x1b[200~');
      await this.write(text);
      await this.write('\x1b[201~');
    }
    // Settle so the body flushes, THEN submit with a discrete lone Enter keystroke.
    await new Promise((r) => setTimeout(r, SUBMIT_SETTLE_MS));
    await this.write('\r');
  }

  snapshot(paneId?: string): string {
    if (paneId !== undefined && paneId !== this.pane.id) {
      throw new Error(`Unknown pane id "${paneId}" (v1 has one pane: "${this.pane.id}").`);
    }
    return this.pane.snapshot();
  }

  kill(): void {
    if (this.exited) return;
    try {
      this.pty.kill();
    } catch {
      // Process already gone; ignore.
    }
  }
}
