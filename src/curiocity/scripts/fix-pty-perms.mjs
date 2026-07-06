// Defensive postinstall (D12): npm can strip the executable bit off node-pty's
// prebuilt `spawn-helper` on macOS/Linux, which makes `pty.fork` fail with
// "posix_spawnp failed". Restore +x on any spawn-helper we can find. No-op on
// Windows (conpty needs no helper) and when node-pty is absent.
import { chmodSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const prebuilds = join(here, '..', 'node_modules', 'node-pty', 'prebuilds');

if (existsSync(prebuilds)) {
  for (const platform of readdirSync(prebuilds)) {
    const helper = join(prebuilds, platform, 'spawn-helper');
    if (existsSync(helper) && statSync(helper).isFile()) {
      try {
        chmodSync(helper, 0o755);
      } catch {
        // best-effort; a non-executable helper only affects PTY-using code paths.
      }
    }
  }
}
