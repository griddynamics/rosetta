import { parentToChildSchema, type ChildToParentMessage, type TrialSpec } from '../shared/ipc';
import { writeTrial } from '../results/store';
import { runTrial } from './lifecycle';

/**
 * Curion child entry (§4, §7). Receives one `TrialSpec` over IPC, runs the full
 * lifecycle, writes its trial artifacts into the run dir (§14), and sends the final
 * `result` message. The child is forked with an allow-listed env (§4) — `process.env`
 * here is already scrubbed, so it is the safe base for the agent PTY env.
 */

function send(msg: ChildToParentMessage): void {
  process.send?.(msg);
}

function baseEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (typeof v === 'string') out[k] = v;
  return out;
}

export async function handleSpec(spec: TrialSpec): Promise<void> {
  try {
    const { result, artifacts } = await runTrial(spec, {
      baseEnv: baseEnv(),
      log: (msg, fields) => send({ type: 'log', level: 'info', msg, ...(fields ? { fields } : {}) }),
      onQna: (entry) => send({ type: 'qna', entry }),
      ...(spec.mirror ? { onMirror: (data) => send({ type: 'mirror', paneId: 'primary', data }) } : {}),
    });
    writeTrial(spec.runDir, result, artifacts);
    send({ type: 'status', status: result.status });
    send({ type: 'result', result });
  } catch (err) {
    send({ type: 'fatal', error: (err as Error).stack ?? String(err) });
  }
}

function start(): void {
  process.on('message', (raw) => {
    const parsed = parentToChildSchema.safeParse(raw);
    if (!parsed.success) {
      send({ type: 'fatal', error: `invalid parent message: ${parsed.error.message}` });
      return;
    }
    void handleSpec(parsed.data.spec).finally(() => {
      // Give the IPC channel a tick to flush the result before exiting.
      setTimeout(() => process.exit(0), 20);
    });
  });
}

// Only attach the IPC listener when actually forked (has an IPC channel). When
// imported by tests we just export `handleSpec` / `runTrial` without side effects.
if (process.send && process.channel) {
  start();
}
