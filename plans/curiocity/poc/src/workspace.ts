/**
 * Workspace provisioning: unzip the source archive into an isolated temp dir.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createReadStream } from 'fs';
import unzipper from 'unzipper';

export interface Workspace {
  dir: string;
  cleanup: () => Promise<void>;
}

/**
 * Unzip the given zip archive into a freshly-created temp directory.
 * Returns the workspace root and a cleanup function.
 */
export async function provisionWorkspace(zipPath: string): Promise<Workspace> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'curion-'));

  await new Promise<void>((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: dir }))
      .on('close', resolve)
      .on('error', reject);
  });

  // The zip contains one real top-level folder (macOS zips also add __MACOSX noise).
  // Find the first non-__MACOSX directory entry as the project root.
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const realDir = entries.find(e => e.isDirectory() && e.name !== '__MACOSX');
  const projectRoot = realDir ? path.join(dir, realDir.name) : dir;

  return {
    dir: projectRoot,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
