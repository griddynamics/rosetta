import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { evalPatternAndPolicy, hasAIReviewedMarker } from './dangerous-actions/evaluate';
import { debugLog } from '../runtime/debug-log';

export const dangerousActionsHook = defineHook({
  name: 'dangerous-actions',
  on: {
    event: 'PreToolUse',
    toolKinds: ['bash', 'write', 'edit', 'multi-edit', 'mcp-call'],
  },
  run: (ctx) => {
    const { result, pattern } = evalPatternAndPolicy(ctx);
    if (result === null) return null;

    if (pattern?.policy === 'hard-deny') {
      debugLog('[dangerous-actions] hard-deny', { id: pattern.id, toolName: ctx.toolName });
      return result;
    }

    const input = ctx.toolInput as Record<string, unknown>;
    if (hasAIReviewedMarker(input, ctx.toolName)) {
      debugLog('[dangerous-actions] AI-reviewed marker honored', { id: pattern?.id, toolName: ctx.toolName });
      return null;
    }

    debugLog('[dangerous-actions] denied — reconsider', { id: pattern?.id, toolName: ctx.toolName });
    return result;
  },
});

runAsCli(dangerousActionsHook, module);
