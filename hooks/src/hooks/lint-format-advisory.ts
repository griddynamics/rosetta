// hooks/src/hooks/lint-format-advisory.ts
import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { advise } from '../runtime/result-helpers';

const MONITORED_EXTENSIONS = [
  '.html', '.css', '.js', '.ts', '.jsx', '.tsx',
  '.py', '.cs', '.ps1', '.cmd', '.java', '.go', '.rs', '.md',
] as const;

export const advisoryMessage = (filePath: string): string =>
  `Files were modified. Add a plan step (if not already present) to run syntax, type, lint, and format checks on: ${filePath}.`;

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
  run: (ctx) => advise(advisoryMessage(ctx.filePath)),
});

runAsCli(lintFormatAdvisoryHook, module);
