---
layout: default
title: Contribute
permalink: /contribute/
---

<section class="hero">
  <h1>How To Contribute</h1>
  <p>First-time or returning contributor. Read this before your first PR, use as a checklist for every PR after.</p>
</section>

<!-- ===== BEFORE YOU START ===== -->
<section class="section">
  <h2 class="with-marker">Before You Start</h2>
  <p class="section-subtitle">Get familiar with the project before diving in.</p>

  <div class="arch-annotations">
    <div class="arch-anno">
      <h4>Read the README</h4>
      <p>Understand what Rosetta is, its goals, and supported IDEs. <a href="https://github.com/griddynamics/rosetta/blob/main/README.md" target="_blank" rel="noopener noreferrer">README →</a></p>
    </div>
    <div class="arch-anno">
      <h4>Follow the Quickstart</h4>
      <p>Get a working setup end-to-end before making changes. <a href="https://github.com/griddynamics/rosetta/blob/main/QUICKSTART.md" target="_blank" rel="noopener noreferrer">Quickstart →</a></p>
    </div>
    <div class="arch-anno">
      <h4>Skim the Developer Guide</h4>
      <p>Repo layout, local workflows, and development conventions. <a href="https://github.com/griddynamics/rosetta/blob/main/DEVELOPER_GUIDE.md" target="_blank" rel="noopener noreferrer">Developer Guide →</a></p>
    </div>
  </div>
</section>

<!-- ===== WHAT'S WELCOME ===== -->
<section class="section">
  <h2 class="with-marker">What Contributions Are Welcome</h2>
  <p class="section-subtitle">Not sure where your idea fits? Open an issue first.</p>

  <div class="hiw-grid">
    <div class="hiw-item">
      <div class="hiw-num">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
      </div>
      <strong>Documentation</strong>
      <p>Fixes, clarifications, new guides</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      </div>
      <strong>Prompt Artifacts</strong>
      <p>Agents, skills, workflows, rules, templates</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
      </div>
      <strong>Tooling</strong>
      <p>CLI, MCP, publishing tools</p>
    </div>
  </div>

  <div class="hiw-grid" style="margin-top:1rem">
    <div class="hiw-item">
      <div class="hiw-num">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></svg>
      </div>
      <strong>Bug Fixes</strong>
      <p>In any component</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
      </div>
      <strong>Website</strong>
      <p>Content and layout in docs/web/</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </div>
      <strong>Feedback</strong>
      <p>Issues, discussions, feature requests</p>
    </div>
  </div>
</section>

<!-- ===== FAST PATH ===== -->
<section class="section">
  <h2 class="with-marker">Fast Path to Your First PR</h2>
  <p class="section-subtitle">Small PRs get reviewed faster and merged sooner.</p>

  <div class="hiw-grid hiw-grid--4">
    <div class="hiw-item">
      <div class="hiw-num">1</div>
      <strong>Pick</strong>
      <p>Choose a small, scoped issue or open one with your proposal</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">2</div>
      <strong>Edit</strong>
      <p>Make focused edits. One concern per PR.</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">3</div>
      <strong>Validate</strong>
      <p>Build, lint, type-check, verify MCP</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">4</div>
      <strong>Submit</strong>
      <p>PR with rationale and expected impact</p>
    </div>
  </div>
</section>

<!-- ===== DEVELOPMENT WORKFLOW ===== -->
<section class="section">
  <h2 class="with-marker">Development Workflow</h2>

  <div class="qs-code-wrap" style="margin-bottom:1.2rem">
    <pre class="qs-code">fork/clone → branch → edit → validate → push → PR</pre>
  </div>

  <div class="arch-annotations">
    <div class="arch-anno">
      <h4>Branching</h4>
      <p>Branch from <code>main</code>. Use descriptive branch names. Commit messages: short summary line, body if needed.</p>
    </div>
    <div class="arch-anno">
      <h4>Validation</h4>
      <p>Run local validation before pushing. Build, lint, and type-check must pass.</p>
    </div>
    <div class="arch-anno">
      <h4>Pull Request</h4>
      <p>Open a PR against <code>main</code>. Fill in the PR template. Explain <em>why</em>, not just <em>what</em>.</p>
    </div>
  </div>
</section>

<!-- ===== PROMPT CHANGES ===== -->
<section class="section">
  <h2 class="with-marker">Prompt Changes</h2>
  <p class="section-subtitle">Rosetta is a prompt engineering system. Prompt changes have outsized impact and need extra care.</p>

  <div class="note">
    <strong>Use the prompting flow.</strong> The <code>coding-agents-prompting-flow</code> with <code>coding-agents-prompt-authoring</code> skill helps you author, design, refactor, harden, and modernize prompt families. It understands Rosetta internals. Use it with Opus 4.6 model.
  </div>

  <div class="arch-annotations" style="margin-top:1.5rem">
    <div class="arch-anno">
      <h4>Include in Your PR</h4>
      <p>A prompt brief (goal, non-goals, constraints), before/after behavior examples, and validation evidence.</p>
    </div>
    <div class="arch-anno">
      <h4>Static AI Review</h4>
      <p>Automated pipeline validates prompt changes for structure, quality, correctness, and governance.</p>
    </div>
    <div class="arch-anno">
      <h4>Scenario Comparison</h4>
      <p>Runs scenarios with old and new prompts, then validates the behavioral difference. Both checks must pass.</p>
    </div>
  </div>
</section>

<!-- ===== AI-ASSISTED CONTRIBUTIONS ===== -->
<section class="section">
  <h2 class="with-marker">AI-Assisted Contributions</h2>
  <p class="section-subtitle">AI help is welcome. These norms apply.</p>

  <div class="hiw-grid">
    <div class="hiw-item">
      <div class="hiw-num">!</div>
      <strong>You Own the Result</strong>
      <p>The author is responsible for every line, whether hand-written or generated.</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">&Delta;</div>
      <strong>Show the Difference</strong>
      <p>No unexplained bulk diffs. Prompt and rule changes require before/after examples.</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">&check;</div>
      <strong>No Fabrication</strong>
      <p>No fake docs, fake benchmarks, or unverifiable claims. Small, focused PRs only.</p>
    </div>
  </div>
</section>

<!-- ===== PR CHECKLIST ===== -->
<section class="section">
  <h2 class="with-marker">Pull Request Checklist</h2>
  <p class="section-subtitle">Before requesting review:</p>

  <div class="note">
    <ul style="margin:0;padding-left:1.2rem;list-style:none">
      <li>&check;&ensp;Scope is narrow and explicit</li>
      <li>&check;&ensp;No duplicate rules or ambiguous wording introduced</li>
      <li>&check;&ensp;Safety, privacy, and approval checkpoints preserved</li>
      <li>&check;&ensp;Prompt changes include a brief, examples, and validation evidence</li>
      <li>&check;&ensp;Architecture changes update <code>docs/ARCHITECTURE.md</code> in the same changeset</li>
      <li>&check;&ensp;Local validation passes (build, lint, relevant checks)</li>
      <li>&check;&ensp;PR description explains <em>why</em>, not just <em>what</em></li>
    </ul>
  </div>
</section>

<!-- ===== DEEPER DOCS ===== -->
<section class="section">
  <h2 class="with-marker">Deeper Docs</h2>

  <div class="docs-grid">
    <a href="https://github.com/griddynamics/rosetta/blob/main/README.md" target="_blank" rel="noopener noreferrer" class="docs-card">
      <svg class="docs-card-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div class="docs-card-title">README</div>
      <p class="docs-card-desc">What Rosetta is, quick setup, and supported IDEs.</p>
    </a>
    <a href="https://github.com/griddynamics/rosetta/blob/main/OVERVIEW.md" target="_blank" rel="noopener noreferrer" class="docs-card">
      <svg class="docs-card-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" stroke-width="1.5"/></svg>
      <div class="docs-card-title">Overview</div>
      <p class="docs-card-desc">How to think about Rosetta and its design principles.</p>
    </a>
    <a href="https://github.com/griddynamics/rosetta/blob/main/QUICKSTART.md" target="_blank" rel="noopener noreferrer" class="docs-card">
      <svg class="docs-card-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div class="docs-card-title">Quickstart</div>
      <p class="docs-card-desc">Install, configure, and run your first Rosetta session.</p>
    </a>
    <a href="https://github.com/griddynamics/rosetta/blob/main/docs/ARCHITECTURE.md" target="_blank" rel="noopener noreferrer" class="docs-card">
      <svg class="docs-card-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="8.5" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10v2.5a1.5 1.5 0 001.5 1.5h0M17.5 10v2.5a1.5 1.5 0 01-1.5 1.5h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <div class="docs-card-title">Architecture</div>
      <p class="docs-card-desc">How the system works end-to-end.</p>
    </a>
  </div>
</section>

<!-- ===== COMMUNITY ===== -->
<section class="section">
  <h2 class="with-marker">Community</h2>
  <p class="section-subtitle">Licensed under <a href="https://github.com/griddynamics/rosetta/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">Apache-2.0</a>. Treat every interaction with respect. No gatekeeping, no condescension.</p>

  <div class="rm-feedback" style="margin-top:1.5rem">
    <div class="rm-feedback-text">
      <strong>Ready to contribute?</strong>
      <p>Browse open issues, pick one, and send your first PR.</p>
    </div>
    <div class="rm-feedback-actions">
      <a href="https://github.com/griddynamics/rosetta/issues" target="_blank" rel="noopener noreferrer" class="rm-feedback-btn">Open Issues</a>
      <a href="https://discord.gg/QzZ2cWg36g" target="_blank" rel="noopener noreferrer" class="rm-feedback-btn rm-feedback-btn--discord">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
        Join Community
      </a>
    </div>
  </div>
</section>
