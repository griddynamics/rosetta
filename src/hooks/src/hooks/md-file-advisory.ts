import path from 'path';
import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { advise  } from '../runtime/result-helpers';

export const advisoryMessage = (filePath: string): string => {
  const name = path.basename(filePath);
  return `[Rosetta Advisory] ${name} is created in non-standard location, think if it is truly needed or you should have updated existing file.`;
};

export const mdFileAdvisoryHook = defineHook({
  name: 'md-file-advisory',
  on: {
    event: 'PostToolUse',
    toolKinds: ['write', 'edit', 'multi-edit', 'patch', 'create', 'replace'],
    filePath: {
      extOneOfCi:         ['.md'],
      notTokenSegmentAny: ['tmp', 'temp'],
      notStartsWithAny:   ['docs/', 'agents/', 'plans/', 'refsrc/'],
      notBasenameOneOf:   ['README.md', 'CHANGELOG.md'],
    },
  },
  run: (ctx) => advise(advisoryMessage(ctx.filePath)),
});

runAsCli(mdFileAdvisoryHook, module);
