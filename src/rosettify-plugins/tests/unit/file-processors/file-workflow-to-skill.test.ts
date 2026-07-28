// FR-COPY-0080, FR-VAR-0042, FR-STRUCT-0030 — fileWorkflowToSkill: pure processor contract.
// Covers SPECS §3.1 (processor contract) and §3.2 (helper contracts):
//   - placement derives from the INCOMING frame.target (SpecEntry.target is the sole placement
//     owner), never a hardcoded base — this is the core of the workflows-to-skills refactor;
//   - main workflow retains frontmatter, owned phases lose it;
//   - zero-phase workflows emit SKILL.md only;
//   - shortest hyphen-bounded prefix ownership (findWorkflowRoot);
//   - all reference forms rewritten exactly once (rewritePhaseReferences);
//   - unrelated *.md mentions and non-owned phase names survive untouched;
//   - the input frame is not mutated;
//   - binary/null-content frames pass through unchanged.
import { describe, it, expect } from 'vitest';
import { fileWorkflowToSkill } from '../../../src/file-processors/file-workflow-to-skill.js';
import type { FileProcessingFrame, TargetContext, Vfs } from '../../../src/types.js';

function makeCtx(workflowPaths: string[]): TargetContext {
  return {
    spec: {} as unknown as TargetContext['spec'],
    vfs: workflowPaths.map((path) => ({ path, sourceFiles: [] })) as unknown as Vfs,
    release: { name: 'r1', deterministicHooks: false, displayName: 'R1' },
  };
}

/**
 * Build a frame already targeted by its composing SpecEntry, matching real
 * `computeTargetPath` output: `${targetBase}/${filename}` (source is a flat `workflows/*.md`
 * glob, so the relative part is just the filename). `targetBase` is what
 * `fileWorkflowToSkill` must recover from `frame.target` — never hardcode it.
 */
function makeFrame(
  sourcePath: string,
  targetBase: string,
  content: string | Buffer | null,
  isBinary = false,
): FileProcessingFrame {
  const filename = sourcePath.split('/').pop() as string;
  return {
    sourcePath,
    target: `${targetBase}/${filename}`,
    isBinary,
    target_contents: content,
    source: [],
  };
}

const BASES = ['skills', '.agents/skills'] as const;

describe.each(BASES)('fileWorkflowToSkill — placement derives from incoming frame.target (base=%s)', (base) => {
  it('places the main workflow doc at <base>/<name>/SKILL.md and retains frontmatter', () => {
    const ctx = makeCtx(['workflows/demo-flow.md']);
    const content = '---\nname: Demo Flow\n---\n\n# Demo Flow';
    const frame = makeFrame('workflows/demo-flow.md', base, content);
    const result = fileWorkflowToSkill(frame, ctx);

    expect(result.target).toBe(`${base}/demo-flow/SKILL.md`);
    expect(result.target_contents).toContain('---\nname: Demo Flow\n---');
    expect(result.target_contents).toContain('# Demo Flow');
  });

  it('places an owned phase at <base>/<root>/phases/<phase>.md and strips its frontmatter', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const content = '---\nname: Step\n---\n\n# Step body';
    const frame = makeFrame('workflows/demo-flow-step.md', base, content);
    const result = fileWorkflowToSkill(frame, ctx);

    expect(result.target).toBe(`${base}/demo-flow/phases/demo-flow-step.md`);
    expect(result.target_contents).not.toContain('---\nname: Step');
    expect(result.target_contents).not.toContain('---');
    expect(result.target_contents).toContain('# Step body');
  });

  it('a zero-phase workflow emits only SKILL.md — no phases/ path segment anywhere', () => {
    const ctx = makeCtx(['workflows/lonely-flow.md']);
    const frame = makeFrame('workflows/lonely-flow.md', base, 'Mentions unrelated.md but no real phases.');
    const result = fileWorkflowToSkill(frame, ctx);

    expect(result.target).toBe(`${base}/lonely-flow/SKILL.md`);
    expect(result.target).not.toContain('phases/');
    // No phase names -> content passed through untouched (guard: phaseNames.length > 0).
    expect(result.target_contents).toBe('Mentions unrelated.md but no real phases.');
  });
});

describe('fileWorkflowToSkill — placement is never hardcoded (arbitrary/unusual incoming base)', () => {
  it('honors an unconventional incoming target base verbatim (main and phase)', () => {
    const oddBase = 'some/nested/custom-base';
    const ctx = makeCtx(['workflows/odd-flow.md', 'workflows/odd-flow-step.md']);

    const main = makeFrame('workflows/odd-flow.md', oddBase, '# Odd Flow');
    expect(fileWorkflowToSkill(main, ctx).target).toBe('some/nested/custom-base/odd-flow/SKILL.md');

    const phase = makeFrame('workflows/odd-flow-step.md', oddBase, '# Step');
    expect(fileWorkflowToSkill(phase, ctx).target).toBe(
      'some/nested/custom-base/odd-flow/phases/odd-flow-step.md',
    );
  });
});

describe('fileWorkflowToSkill — shortest hyphen-bounded prefix ownership (nested prefix stems)', () => {
  it('routes a phase under the true root (shortest prefix-stem), not under a sibling phase', () => {
    // sample-flow (root), sample-flow-setup (phase), sample-flow-setup-advanced (phase).
    // "sample-flow-setup" is a hyphen-bounded prefix of "sample-flow-setup-advanced" but is
    // itself a phase — the true root is "sample-flow" (the SHORTEST prefix-stem).
    const ctx = makeCtx([
      'workflows/sample-flow.md',
      'workflows/sample-flow-setup.md',
      'workflows/sample-flow-setup-advanced.md',
    ]);

    const advanced = makeFrame('workflows/sample-flow-setup-advanced.md', 'skills', '# Advanced');
    expect(fileWorkflowToSkill(advanced, ctx).target).toBe(
      'skills/sample-flow/phases/sample-flow-setup-advanced.md',
    );

    const setup = makeFrame('workflows/sample-flow-setup.md', 'skills', '# Setup');
    expect(fileWorkflowToSkill(setup, ctx).target).toBe('skills/sample-flow/phases/sample-flow-setup.md');

    // The main doc's references to BOTH phases are rewritten (advanced not silently dropped).
    const main = makeFrame(
      'workflows/sample-flow.md',
      'skills',
      'APPLY PHASE `sample-flow-setup.md` and APPLY PHASE `sample-flow-setup-advanced.md`.',
    );
    expect(fileWorkflowToSkill(main, ctx).target_contents).toBe(
      'APPLY SKILL FILE `phases/sample-flow-setup.md` and APPLY SKILL FILE `phases/sample-flow-setup-advanced.md`.',
    );
  });

  it('two phase names where one is a character-prefix (but not hyphen-bounded) of the other do not cross-contaminate', () => {
    // "demo-red" is a literal character-prefix of "demo-redwood", but NOT a hyphen-bounded
    // prefix (no "-" immediately follows "demo-red" in "demo-redwood"), so both are correctly
    // owned by the same root ("demo").
    const ctx = makeCtx(['workflows/demo.md', 'workflows/demo-red.md', 'workflows/demo-redwood.md']);
    const frame = makeFrame(
      'workflows/demo.md',
      'skills',
      'See demo-red.md and demo-redwood.md for details.\n' +
        'Also APPLY PHASE `demo-red.md` then APPLY PHASE `demo-redwood.md`.',
    );
    const result = fileWorkflowToSkill(frame, ctx);

    expect(result.target_contents).toBe(
      'See demo-red.md and demo-redwood.md for details.\n' +
        'Also APPLY SKILL FILE `phases/demo-red.md` then APPLY SKILL FILE `phases/demo-redwood.md`.',
    );

    const redFrame = makeFrame('workflows/demo-red.md', 'skills', '# Red');
    expect(fileWorkflowToSkill(redFrame, ctx).target).toBe('skills/demo/phases/demo-red.md');
    const redwoodFrame = makeFrame('workflows/demo-redwood.md', 'skills', '# Redwood');
    expect(fileWorkflowToSkill(redwoodFrame, ctx).target).toBe('skills/demo/phases/demo-redwood.md');
  });
});

describe('fileWorkflowToSkill — full-form rewrite (APPLY PHASE)', () => {
  it('rewrites `APPLY PHASE `x.md`` to `APPLY SKILL FILE `phases/x.md``', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame(
      'workflows/demo-flow.md',
      'skills',
      '1. APPLY PHASE `demo-flow-step.md`\n2. Done.',
    );
    const result = fileWorkflowToSkill(frame, ctx);
    expect(result.target_contents).toBe('1. APPLY SKILL FILE `phases/demo-flow-step.md`\n2. Done.');
  });

  it('rewrites BARE full form `APPLY PHASE x.md` (no delimiters) — modernization-flow style', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame('workflows/demo-flow.md', 'skills', '1. APPLY PHASE demo-flow-step.md');
    const result = fileWorkflowToSkill(frame, ctx);
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
      'skills',
      'APPLY PHASE demo-flow-step.md then APPLY PHASE demo-flow-step-extra.md',
    );
    const result = fileWorkflowToSkill(frame, ctx);
    expect(result.target_contents).toBe(
      'APPLY SKILL FILE `phases/demo-flow-step.md` then APPLY SKILL FILE `phases/demo-flow-step-extra.md`',
    );
  });
});

describe('fileWorkflowToSkill — delimited standalone short-form rewrite', () => {
  it('rewrites backtick-, single-quote-, and double-quote-wrapped standalone refs (3); leaves BARE standalone unchanged', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const content =
      'Bare: demo-flow-step.md\n' +
      'Backtick: `demo-flow-step.md`\n' +
      "Single: 'demo-flow-step.md'\n" +
      'Double: "demo-flow-step.md"';
    const frame = makeFrame('workflows/demo-flow.md', 'skills', content);
    const result = fileWorkflowToSkill(frame, ctx);
    const out = result.target_contents as string;

    const occurrences = out.match(/APPLY SKILL FILE `phases\/demo-flow-step\.md`/g) ?? [];
    expect(occurrences.length).toBe(3); // 3 delimited forms rewritten
    // Bare standalone mention (not after APPLY PHASE, not delimited) is left unchanged.
    expect(out).toContain('Bare: demo-flow-step.md');
  });
});

describe('fileWorkflowToSkill — targeted rewrite, not blanket *.md', () => {
  it('leaves a *.md mention that is NOT a real phase name of this workflow unchanged', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame(
      'workflows/demo-flow.md',
      'skills',
      'Real phase: `demo-flow-step.md`. Unrelated: `unrelated-thing.md`.',
    );
    const result = fileWorkflowToSkill(frame, ctx);
    const out = result.target_contents as string;

    expect(out).toContain('APPLY SKILL FILE `phases/demo-flow-step.md`');
    // Arbitrary *.md mention that isn't a real phase name of this workflow: untouched.
    expect(out).toContain('`unrelated-thing.md`');
    expect(out).not.toContain('phases/unrelated-thing.md');
  });

  it('leaves a *.md mention belonging to an UNRELATED workflow (not this one, not a sibling phase) unchanged', () => {
    // "other-flow.md" is a real main workflow doc in the VFS, but it is not owned by
    // "demo-flow" — it must not be treated as one of demo-flow's phases.
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/other-flow.md']);
    const frame = makeFrame(
      'workflows/demo-flow.md',
      'skills',
      'See also `other-flow.md` and APPLY PHASE `other-flow.md`.',
    );
    const result = fileWorkflowToSkill(frame, ctx);
    const out = result.target_contents as string;

    expect(out).toBe('See also `other-flow.md` and APPLY PHASE `other-flow.md`.');
    expect(out).not.toContain('phases/other-flow.md');
  });
});

describe('fileWorkflowToSkill — ordered passes, no double rewrite', () => {
  it('full-form rewritten; a following BARE standalone mention is left alone; no double rewrite', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame(
      'workflows/demo-flow.md',
      'skills',
      '1. APPLY PHASE `demo-flow-step.md`\n2. See demo-flow-step.md again.',
    );
    const result = fileWorkflowToSkill(frame, ctx);
    const out = result.target_contents as string;

    expect(out).toBe('1. APPLY SKILL FILE `phases/demo-flow-step.md`\n2. See demo-flow-step.md again.');
    const occurrences = out.match(/APPLY SKILL FILE `phases\/demo-flow-step\.md`/g) ?? [];
    expect(occurrences.length).toBe(1);
    // No evidence of the short-form pass re-wrapping the full-form pass's own output.
    expect(out).not.toContain('phases/phases/');
    expect(out).not.toMatch(/APPLY SKILL FILE `phases\/APPLY/);
  });

  it('does not re-match already-rewritten output when run a second time (idempotent on rewritten content)', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame(
      'workflows/demo-flow.md',
      'skills',
      'APPLY PHASE `demo-flow-step.md`',
    );
    const once = fileWorkflowToSkill(frame, ctx);
    // Feed the already-rewritten content back through as if it were a fresh frame's content.
    const secondPass = makeFrame('workflows/demo-flow.md', 'skills', once.target_contents as string);
    const twice = fileWorkflowToSkill(secondPass, ctx);
    expect(twice.target_contents).toBe(once.target_contents);
  });
});

describe('fileWorkflowToSkill — input frame is not mutated', () => {
  it('leaves the original frame object and its fields unchanged after the call', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const original = makeFrame(
      'workflows/demo-flow.md',
      'skills',
      '---\nname: Demo\n---\n\nAPPLY PHASE `demo-flow-step.md`',
    );
    const snapshotBeforeCall = JSON.parse(JSON.stringify(original));

    const result = fileWorkflowToSkill(original, ctx);

    expect(original).toEqual(snapshotBeforeCall);
    expect(original.target).toBe('skills/demo-flow.md');
    expect(original.target_contents).toBe('---\nname: Demo\n---\n\nAPPLY PHASE `demo-flow-step.md`');
    // Sanity: the returned frame is actually different from the input (proves the assertions
    // above are not vacuously true because nothing changed).
    expect(result).not.toBe(original);
    expect(result.target).not.toBe(original.target);
  });
});

describe('fileWorkflowToSkill — binary and null-content frames pass through unchanged', () => {
  it('a binary frame is relocated but its byte content and binary flag are untouched', () => {
    const ctx = makeCtx(['workflows/demo-flow.md']);
    const bytes = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    const frame = makeFrame('workflows/demo-flow.md', 'skills', bytes, true);

    const result = fileWorkflowToSkill(frame, ctx);

    expect(result.target).toBe('skills/demo-flow/SKILL.md');
    expect(result.isBinary).toBe(true);
    expect(result.target_contents).toBe(bytes);
  });

  it('a binary phase frame is relocated under phases/ and its byte content is untouched', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const bytes = Buffer.from([0x10, 0x20]);
    const frame = makeFrame('workflows/demo-flow-step.md', 'skills', bytes, true);

    const result = fileWorkflowToSkill(frame, ctx);

    expect(result.target).toBe('skills/demo-flow/phases/demo-flow-step.md');
    expect(result.isBinary).toBe(true);
    expect(result.target_contents).toBe(bytes);
  });

  it('a null-content main-doc frame is relocated but target_contents stays null', () => {
    const ctx = makeCtx(['workflows/demo-flow.md']);
    const frame = makeFrame('workflows/demo-flow.md', 'skills', null);

    const result = fileWorkflowToSkill(frame, ctx);

    expect(result.target).toBe('skills/demo-flow/SKILL.md');
    expect(result.target_contents).toBeNull();
  });

  it('a null-content phase frame is relocated under phases/ but target_contents stays null (no frontmatter-strip attempt)', () => {
    const ctx = makeCtx(['workflows/demo-flow.md', 'workflows/demo-flow-step.md']);
    const frame = makeFrame('workflows/demo-flow-step.md', 'skills', null);

    const result = fileWorkflowToSkill(frame, ctx);

    expect(result.target).toBe('skills/demo-flow/phases/demo-flow-step.md');
    expect(result.target_contents).toBeNull();
  });
});
