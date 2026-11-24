/**
 * Release r2 E2E — `--release r2` on the REAL repo inputs (FR-CLI-0010, FR-CLI-0041).
 *
 * `r2` is still a declared release of the `core` set in plugins.json, so the committed
 * `instructions/r2` tree must build without errors. Every other r2 test runs the fixture tree
 * (tests/fixtures/sample-instructions), so an error that only the real r2 wording triggers was
 * not caught by the suite.
 *
 * Generation runs: exactly ONE generate() call, into a fresh temp directory.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from '../../src/index.js';
import { captureStderr } from '../helpers/cust-repo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root: up from tests/e2e/ → tests/ → rosettify-plugins/ → src/ → <repo root>.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

describe('Release r2 E2E — real instructions/r2 (FR-CLI-0010, FR-CLI-0041)', () => {
  it('generate({ release: "r2" }) reports no error, exits 0 and roots the Codex SKILL glob', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-r2-e2e-'));
    try {
      const { result, stderr } = await captureStderr(() => generate({
        sources: {
          instructionsSource: path.join(REPO_ROOT, 'instructions'),
          pluginsSource: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins'),
          hooksSource: path.join(REPO_ROOT, 'src', 'hooks'),
          outputDir,
          profileSource: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'profiles'),
          configPath: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins.json'),
        },
        release: 'r2',
        dryRun: false,
        verbose: false,
      }));
      // Error lines first: on a failure this shows which target and document reported it.
      expect(stderr).toBe('');
      expect(result).toBe(0);
      // The Codex mode rule lists the SKILL glob relative to the repo root, like its neighbours.
      const codexRule = fs.readFileSync(
        path.join(outputDir, 'core-codex', '.agents', 'rules', 'plugin-files-mode.md'), 'utf-8');
      expect(codexRule).toContain('SKILL in `.agents/skills/*/SKILL.md`');
      expect(codexRule).not.toContain('SKILL in `skills/*/SKILL.md`');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  }, 60_000);
});
