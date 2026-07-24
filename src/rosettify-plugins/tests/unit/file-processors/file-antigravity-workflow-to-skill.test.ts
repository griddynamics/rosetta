// FR-COPY-0080 — Antigravity workflow→skill transform: phase-ref rewrite edge cases
// Two ordered passes (full form, then short form), wrapper-aware, targeted-only (never blanket
// *.md), non-overlapping (short pass never re-matches the full pass's own output).
import { describe, it, expect } from 'vitest';
import { fileAntigravityWorkflowToSkill } from '../../../src/file-processors/file-antigravity-workflow-to-skill.js';
import type { FileProcessingFrame, TargetContext, Vfs } from '../../../src/types.js';

function makeCtx(workflowPaths: string[]): TargetContext {
  return {
    spec: {} as unknown as TargetContext['spec'],
    vfs: workflowPaths.map((path) => ({ path, sourceFiles: [] })) as unknown as Vfs,
    release: { name: 'r1', deterministicHooks: false, displayName: 'R1' },
  };
}

function makeFrame(sourcePath: string, content: string): FileProcessingFrame {
  return {
    sourcePath,
    target: sourcePath,
    isBinary: false,
    target_contents: content,
    source: [],
  };
}

describe('fileAntigravityWorkflowToSkill — target renaming', () => {
  it('renames the main workflow doc to skills/<name>/SKILL.md', () => {
    const ctx = makeCtx(['workflows/demo-flow.md']);
    const frame = makeFrame('workflows/demo-flow.md', '# Demo Flow');
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    expect(result.target).toBe('skills/demo-flow/SKILL.md');
  });

  it('renames a phase file to skills/<root>/phases/<phase>.md', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame('workflows/demo-flow-step.md', '# Step');
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    expect(result.target).toBe('skills/demo-flow/phases/demo-flow-step.md');
  });

  it('a workflow with no phase files produces SKILL.md and no phases/ folder (no rewrite call)', () => {
    const ctx = makeCtx(['workflows/lonely-flow.md']);
    const frame = makeFrame('workflows/lonely-flow.md', 'Mentions unrelated.md but no real phases.');
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    expect(result.target).toBe('skills/lonely-flow/SKILL.md');
    // No phase names → content passed through untouched (guard: phaseNames.length > 0)
    expect(result.target_contents).toBe('Mentions unrelated.md but no real phases.');
  });
});

describe('fileAntigravityWorkflowToSkill — full-form rewrite (APPLY PHASE)', () => {
  it('rewrites `APPLY PHASE `x.md`` to `APPLY SKILL FILE `phases/x.md``', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame(
      'workflows/demo-flow.md',
      '1. APPLY PHASE `demo-flow-step.md`\n2. Done.',
    );
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    expect(result.target_contents).toBe(
      '1. APPLY SKILL FILE `phases/demo-flow-step.md`\n2. Done.',
    );
  });

  it('rewrites BARE full form `APPLY PHASE x.md` (no delimiters) — modernization-flow style', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame('workflows/demo-flow.md', '1. APPLY PHASE demo-flow-step.md');
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    expect(result.target_contents).toBe('1. APPLY SKILL FILE `phases/demo-flow-step.md`');
  });

  it('a bare full-form name does not partial-match a longer sibling phase', () => {
    const ctx = makeCtx([
      'workflows/demo-flow.md',
      'workflows/demo-flow-step.md',
      'workflows/demo-flow-step-extra.md',
    ]);
    const frame = makeFrame(
      'workflows/demo-flow.md',
      'APPLY PHASE demo-flow-step.md then APPLY PHASE demo-flow-step-extra.md',
    );
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    expect(result.target_contents).toBe(
      'APPLY SKILL FILE `phases/demo-flow-step.md` then APPLY SKILL FILE `phases/demo-flow-step-extra.md`',
    );
  });
});

describe('fileAntigravityWorkflowToSkill — delimited standalone short-form rewrite', () => {
  it('rewrites backtick-, single-quote-, and double-quote-wrapped standalone refs (3); leaves BARE standalone unchanged', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const content =
      'Bare: demo-flow-step.md\n' +
      'Backtick: `demo-flow-step.md`\n' +
      "Single: 'demo-flow-step.md'\n" +
      'Double: "demo-flow-step.md"';
    const frame = makeFrame('workflows/demo-flow.md', content);
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    const out = result.target_contents as string;

    const occurrences = out.match(/APPLY SKILL FILE `phases\/demo-flow-step\.md`/g) ?? [];
    expect(occurrences.length).toBe(3); // 3 delimited forms rewritten
    // Bare standalone mention (not after APPLY PHASE, not delimited) is left unchanged.
    expect(out).toContain('Bare: demo-flow-step.md');
  });
});

describe('fileAntigravityWorkflowToSkill — targeted rewrite, not blanket *.md', () => {
  it('leaves a *.md mention that is NOT a real phase name unchanged', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame(
      'workflows/demo-flow.md',
      'Real phase: `demo-flow-step.md`. Unrelated: `unrelated-thing.md`.',
    );
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    const out = result.target_contents as string;

    expect(out).toContain('APPLY SKILL FILE `phases/demo-flow-step.md`');
    // Arbitrary *.md mention that isn't a real phase name of this workflow: untouched.
    expect(out).toContain('`unrelated-thing.md`');
    expect(out).not.toContain('phases/unrelated-thing.md');
  });
});

describe('fileAntigravityWorkflowToSkill — ordered passes, no double rewrite', () => {
  it('full-form rewritten; a following BARE standalone mention is left alone; no double rewrite', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame(
      'workflows/demo-flow.md',
      '1. APPLY PHASE `demo-flow-step.md`\n2. See demo-flow-step.md again.',
    );
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    const out = result.target_contents as string;

    // Full form → rewritten. The bare standalone mention on line 2 is NOT rewritten (delimiter required).
    expect(out).toBe(
      '1. APPLY SKILL FILE `phases/demo-flow-step.md`\n2. See demo-flow-step.md again.',
    );
    const occurrences = out.match(/APPLY SKILL FILE `phases\/demo-flow-step\.md`/g) ?? [];
    expect(occurrences.length).toBe(1);
    // No evidence of the short-form pass re-wrapping the full-form pass's own output.
    expect(out).not.toContain('phases/phases/');
    expect(out).not.toMatch(/APPLY SKILL FILE `phases\/APPLY/);
  });
});

describe('fileAntigravityWorkflowToSkill — phase name that is a substring of another', () => {
  it('two phase names where one is a prefix substring of the other are each rewritten to their own target independently', () => {
    // "demo-red" is a literal character-prefix of "demo-redwood", but NOT a hyphen-bounded
    // prefix (no "-" immediately follows "demo-red" in "demo-redwood"), so both are correctly
    // owned by the same root ("demo") and must not cross-contaminate each other's rewrite.
    const ctx = makeCtx(['workflows/demo.md', 'workflows/demo-red.md', 'workflows/demo-redwood.md']);
    const frame = makeFrame(
      'workflows/demo.md',
      'See demo-red.md and demo-redwood.md for details.\n' +
        'Also APPLY PHASE `demo-red.md` then APPLY PHASE `demo-redwood.md`.',
    );
    const result = fileAntigravityWorkflowToSkill(frame, ctx);
    const out = result.target_contents as string;

    // Bare standalone mentions (line 1) untouched; full-form wrapped refs (line 2) each rewritten
    // to their own target with no cross-contamination between the substring-related names.
    expect(out).toBe(
      'See demo-red.md and demo-redwood.md for details.\n' +
        'Also APPLY SKILL FILE `phases/demo-red.md` then APPLY SKILL FILE `phases/demo-redwood.md`.',
    );

    // Each phase file's own frame also lands under the same (correct) skill root.
    const redFrame = makeFrame('workflows/demo-red.md', '# Red');
    expect(fileAntigravityWorkflowToSkill(redFrame, ctx).target).toBe('skills/demo/phases/demo-red.md');
    const redwoodFrame = makeFrame('workflows/demo-redwood.md', '# Redwood');
    expect(fileAntigravityWorkflowToSkill(redwoodFrame, ctx).target).toBe('skills/demo/phases/demo-redwood.md');
  });
});

describe('fileAntigravityWorkflowToSkill — nested phase whose stem prefixes a sibling phase', () => {
  it('routes a phase under the true root (shortest prefix-stem), not under a sibling phase', () => {
    // sample-flow (root), sample-flow-setup (phase), sample-flow-setup-advanced (phase).
    // "sample-flow-setup" is a hyphen-bounded prefix of "sample-flow-setup-advanced" but is itself
    // a phase — the true root is "sample-flow" (the SHORTEST prefix-stem). Regression for the
    // longest-prefix bug that misrouted the advanced phase under skills/sample-flow-setup/.
    const ctx = makeCtx([
      'workflows/sample-flow.md',
      'workflows/sample-flow-setup.md',
      'workflows/sample-flow-setup-advanced.md',
    ]);
    const advanced = makeFrame('workflows/sample-flow-setup-advanced.md', '# Advanced');
    expect(fileAntigravityWorkflowToSkill(advanced, ctx).target).toBe(
      'skills/sample-flow/phases/sample-flow-setup-advanced.md',
    );
    const setup = makeFrame('workflows/sample-flow-setup.md', '# Setup');
    expect(fileAntigravityWorkflowToSkill(setup, ctx).target).toBe(
      'skills/sample-flow/phases/sample-flow-setup.md',
    );
    // The main doc's references to BOTH phases are rewritten (advanced not silently dropped).
    const main = makeFrame(
      'workflows/sample-flow.md',
      'APPLY PHASE `sample-flow-setup.md` and APPLY PHASE `sample-flow-setup-advanced.md`.',
    );
    expect(fileAntigravityWorkflowToSkill(main, ctx).target_contents).toBe(
      'APPLY SKILL FILE `phases/sample-flow-setup.md` and APPLY SKILL FILE `phases/sample-flow-setup-advanced.md`.',
    );
  });
});
