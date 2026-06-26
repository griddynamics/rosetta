// src/hooks/src/hooks/lint-format-advisory.ts
import path from 'path';
import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { advise } from '../runtime/result-helpers';
import { debugLogHookBranch } from '../runtime/debug-log';

const MONITORED_EXTENSIONS = [
  '.html', '.css', '.js', '.ts', '.jsx', '.tsx',
  '.py', '.cs', '.ps1', '.cmd', '.java', '.go', '.rs', '.md',
] as const;

export const advisoryMessage = (filePath: string): string => {
  const name = path.basename(filePath);
  return `[Rosetta Advisory] ${name} modified. If not already planned, add a step to run syntax, type, lint, and format checks before commit.`;
};

export const lintFormatAdvisoryHook = defineHook({
  name: 'lint-format-advisory',
  on: {
    event: 'PostToolUse',
    toolKinds: ['write', 'edit', 'multi-edit', 'patch', 'create', 'replace'],
    filePath: {
      extOneOfCi: MONITORED_EXTENSIONS,
      notContainsAny: [
        'node_modules/', '.venv/', '__pycache__/',
        'dist/', 'build/', '.git/',
      ],
    },
  },
  throttle: { dedupBy: ['session', 'filePath'] },
  run: (ctx) => {
    const message = advisoryMessage(ctx.filePath);
    debugLogHookBranch('lint-format-advisory', 'advisory-issued', {
      filePath: ctx.filePath,
      basename: path.basename(ctx.filePath),
      message,
    });
    return advise(message);
  },
});

runAsCli(lintFormatAdvisoryHook, module);
