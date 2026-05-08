import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { evalPatternOnly, hasRosettaReviewedOverride } from './dangerous-actions/evaluate';
import { hashCall, isWithinCooldown, recordDeny } from './dangerous-actions/cooldown-store';
import { appendOverrideAudit } from './dangerous-actions/audit-log';
import { deny } from '../runtime/result-helpers';

export const dangerousActionsHook = defineHook({
  name: 'dangerous-actions',
  on: {
    event: 'PreToolUse',
    toolKinds: ['bash', 'write', 'edit', 'multi-edit', 'mcp-call'],
  },
  run: (ctx) => {
    const patternResult = evalPatternOnly(ctx);
    if (patternResult === null) return null;

    const cwd = ctx.cwd || process.cwd();
    const input = ctx.toolInput as Record<string, unknown>;
    const hash = hashCall(ctx.toolName, input);
    const hasOverride = hasRosettaReviewedOverride(input, ctx.toolName);

    // Layer B: cooldown — block immediate self-retry with override.
    if (isWithinCooldown(cwd, hash) && hasOverride) {
      appendOverrideAudit(cwd, { toolName: ctx.toolName, blockedByCooldown: true, sessionId: ctx.sessionId });
      return deny(
        'Blocked: repeated dangerous call within 5-second cooldown — `# Rosetta-reviewed` override ignored.\n' +
        'Wait 5 seconds before retrying with the override, or confirm the action explicitly.',
      );
    }

    // Layer A: override in user-visible fields → allow and log.
    if (hasOverride) {
      appendOverrideAudit(cwd, { toolName: ctx.toolName, blockedByCooldown: false, sessionId: ctx.sessionId });
      return null;
    }

    // No override → deny and record for cooldown tracking.
    recordDeny(cwd, hash);
    return patternResult;
  },
});

runAsCli(dangerousActionsHook, module);
