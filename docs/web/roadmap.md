---
layout: default
title: Roadmap
permalink: /roadmap/
---

<section class="hero">
  <h1>Roadmap</h1>
  <p>R2 is now live. See what shipped, what's coming next, and what's in the backlog.</p>
</section>

<div class="rm-tabs" role="tablist">
  <button class="rm-tab active" data-tab="r2" role="tab">R2 — Current Release</button>
  <button class="rm-tab" data-tab="r1" role="tab">R1 — Previous Release</button>
  <button class="rm-tab" data-tab="backlog" role="tab">Backlog</button>
</div>

<!-- R1 -->
<div class="rm-panel" id="rm-r1">
  <div class="rm-panel-intro">
    <span class="release-badge release-badge--stable">Previous Release</span>
    <p>Delivered the core Rosetta experience — centralized knowledge delivery, automated repo initialization, and structured workflows across all major AI coding IDEs.</p>
  </div>

  <div class="rm-group">
    <div class="rm-label">IDE Integration</div>
    <ul class="rm-list">
      <li>One-command setup across Cursor, Claude Code, VS Code, Windsurf, JetBrains, and any MCP-compatible tool</li>
      <li>Automatic knowledge retrieval and context injection into every AI session</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Repository Onboarding</div>
    <ul class="rm-list">
      <li>Automated analysis of tech stack, dependencies, and architecture</li>
      <li>Project documentation generated in minutes, not days</li>
      <li>Agent rules and workflows configured per project</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Knowledge &amp; Workflows</div>
    <ul class="rm-list">
      <li>Centralized knowledge base with rules, guardrails, and best practices</li>
      <li>CLI for publishing and managing instructions as code</li>
      <li>Prepare → Research → Plan → Act execution model with task classification</li>
    </ul>
  </div>
</div>

<!-- R2 -->
<div class="rm-panel active" id="rm-r2">
  <div class="rm-panel-intro">
    <span class="release-badge release-badge--stable">Production · Stable</span>
    <p>Enterprise-grade release with flexible deployment, built-in security, an expanded workflow library, and intelligent agent orchestration. Backwards-compatible with R1.</p>
  </div>

  <div class="rm-group">
    <div class="rm-label">Deploy Anywhere</div>
    <ul class="rm-list">
      <li>Multiple connection modes — cloud, local, plugin, and fully offline</li>
      <li>Scales horizontally for teams of any size</li>
      <li>Air-gap capable — runs inside your perimeter with no external dependencies</li>
      <li>Container-ready with Docker Compose and Kubernetes support</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Enterprise Security</div>
    <ul class="rm-list">
      <li>Industry-standard authentication with support for major identity providers</li>
      <li>Tokens encrypted at rest; policy-based access control per team and project</li>
      <li>Human-in-the-loop approval gates at every critical decision point</li>
      <li>Sensitive data protection, risk assessment, and scope enforcement built in</li>
      <li>No source code ever leaves your organization</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Workflows &amp; Skills</div>
    <ul class="rm-list">
      <li>14+ structured workflows covering the full SDLC — from initialization to validation</li>
      <li>30 skills spanning coding, testing, planning, research, security, and documentation</li>
      <li>Every request auto-classified and routed to the right workflow</li>
      <li>Context loads progressively — agents get only what they need, when they need it</li>
      <li>Five-phase execution: Prepare, Research, Plan, Act, Validate</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Intelligent Agents</div>
    <ul class="rm-list">
      <li>Specialized agents for discovery, planning, implementation, review, and validation</li>
      <li>Persistent execution plans — resume where you left off, even across sessions</li>
      <li>Parallel delegation with scoped context for large workspaces</li>
      <li>Automatic bootstrapping — project context loads before the agent acts</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Knowledge Architecture</div>
    <ul class="rm-list">
      <li>Three-layer instructions: core standards + organization rules + project-specific context</li>
      <li>Instructions versioned and published as code — rollback anytime</li>
      <li>Automatic workspace documentation generated during onboarding</li>
      <li>Incremental publishing — only changed instructions are updated</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Developer Experience</div>
    <ul class="rm-list">
      <li>One-file bootstrap — single rule file gets any IDE connected</li>
      <li>Works across 9 IDEs: Cursor, Claude Code, VS Code, Windsurf, JetBrains, Codex, Antigravity, OpenCode</li>
      <li>CLI with dry-run, offline mode, and fast incremental updates</li>
      <li>Works with any MCP-compatible tool — present and future</li>
    </ul>
  </div>
</div>

<!-- Backlog -->
<div class="rm-panel" id="rm-backlog">
  <div class="rm-panel-intro">
    <p>We're focused on R2. The backlog captures directions we're exploring — not commitments. Priorities shift based on community feedback and production learnings.</p>
  </div>

  <div class="rm-group">
    <div class="rm-label">Quality</div>
    <ul class="rm-list">
      <li>Automated quality scoring for instructions and workflows</li>
      <li>Before-and-after evaluation when instructions change</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Scale</div>
    <ul class="rm-list">
      <li>Multi-agent parallel execution for large tasks</li>
      <li>Cross-project awareness — catch breaking changes before they ship</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Community</div>
    <ul class="rm-list">
      <li>Open contribution model for workflows and skills</li>
      <li>Self-hosting guides and expanded integrations</li>
    </ul>
  </div>

  <div class="rm-feedback">
    <div class="rm-feedback-text">
      <strong>Shape the backlog</strong>
      <p>Missing a feature? Have a use case we haven't covered? Your feedback directly influences what gets prioritized next.</p>
    </div>
    <div class="rm-feedback-actions">
      <a href="mailto:rosetta-support@griddynamics.com" class="rm-feedback-btn">
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 7l8 5 8-5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        Send feedback
      </a>
      <a href="https://discord.gg/QzZ2cWg36g" target="_blank" rel="noopener noreferrer" class="rm-feedback-btn rm-feedback-btn--discord">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
        Join Community
      </a>
    </div>
  </div>
</div>

<script>
(function(){
  document.querySelectorAll('.rm-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.rm-tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.rm-panel').forEach(function(p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('rm-' + tab.dataset.tab).classList.add('active');
    });
  });
})();
</script>
