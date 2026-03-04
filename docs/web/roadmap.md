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
    <p>Delivered the core Rosetta MCP experience — centralized knowledge retrieval, automated repo initialization, and the Prepare → Research → Plan → Act workflow across all major AI coding clients.</p>
  </div>

  <div class="rm-group">
    <div class="rm-label">MCP &amp; Clients</div>
    <ul class="rm-list">
      <li>Single-command install via <code>uvx ims-mcp</code> with stdio transport</li>
      <li>Supports Claude Code, Cursor, Windsurf, VS Code, JetBrains, OpenCode, and any MCP-compatible tool</li>
      <li>Semantic knowledge retrieval and context injection into every AI session</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Repository Initialization</div>
    <ul class="rm-list">
      <li>Automated analysis of tech stack, dependencies, and architecture</li>
      <li>Generates <code>TECHSTACK.md</code>, <code>CODEMAP.md</code>, <code>ARCHITECTURE.md</code>, and <code>CONTEXT.md</code></li>
      <li>Configures agent rules and subagents per project</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Knowledge Base</div>
    <ul class="rm-list">
      <li>R2R vector store with centralized <code>aia-r1</code> instruction collection</li>
      <li>Rules, guardrails, workflows, and best practices</li>
      <li>IMS CLI for publishing, dataset management, and change detection</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Workflow Engine</div>
    <ul class="rm-list">
      <li>Prepare → Research → Plan → Act execution model</li>
      <li>Task classification across coding, QA, research, and modernization</li>
      <li>Progressive disclosure and meta-prompting for project-adaptive context</li>
    </ul>
  </div>
</div>

<!-- R2 -->
<div class="rm-panel active" id="rm-r2">
  <div class="rm-panel-intro">
    <span class="release-badge release-badge--stable">Production · Stable</span>
    <p>A major architectural evolution bringing enterprise security, scalable deployment, an expanded skill and workflow taxonomy, and a new automated setup CLI. Fully backwards-compatible with R1.</p>
  </div>

  <div class="rm-group">
    <div class="rm-label">Infrastructure</div>
    <ul class="rm-list">
      <li>RAGFlow backend replacing R2R — Docker Compose and Kubernetes Helm charts included</li>
      <li>HTTP transport mode for remote and centralized MCP server deployment</li>
      <li>Redis session store enabling horizontal scaling across multiple instances</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Security &amp; Access Control</div>
    <ul class="rm-list">
      <li>OAuth 2.0 / Keycloak with token introspection and origin validation middleware</li>
      <li>Role-based access control with read/write/create policies per dataset and team</li>
      <li>Project-scoped collections (<code>project-{name}</code>) with auto-invite and team-based access</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Skills &amp; Workflows</div>
    <ul class="rm-list">
      <li>30+ structured skills including discovery, planning, code-review, security, and validation</li>
      <li>15+ named workflows: <code>coding-flow</code>, <code>testing-flow</code>, <code>validation-flow</code>, <code>modernization-flow</code>, and more</li>
      <li>Full subagent taxonomy — orchestrator, researcher, planner, architect, engineer, reviewer, validator</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Developer Experience</div>
    <ul class="rm-list">
      <li><code>npx rosetta configure</code> — one command sets up MCP config across all supported IDEs</li>
      <li>FastMCP v3 upgrade; CLI 3–77× faster via MD5 change detection and server-side filtering</li>
    </ul>
  </div>
</div>

<!-- Backlog -->
<div class="rm-panel" id="rm-backlog">
  <div class="rm-panel-intro">
    <p>Accepted into scope but not yet scheduled. Subject to change based on community feedback and delivery priorities.</p>
  </div>

  <div class="rm-group">
    <div class="rm-label">Quality</div>
    <ul class="rm-list">
      <li>Instructions validation pipeline with comparative test-case evaluation</li>
      <li>AI-assisted prompt and workflow authoring with HITL checkpoints</li>
      <li>Advanced prompt refactoring and prompt diagnosis tooling</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Flows</div>
    <ul class="rm-list">
      <li>Playwright self-healing test automation flow</li>
      <li>Infrastructure-as-code generation and review flow</li>
      <li>FR/NFR extraction and template generation flow</li>
    </ul>
  </div>

  <div class="rm-group">
    <div class="rm-label">Adoption</div>
    <ul class="rm-list">
      <li>Self-hosting product guidance and documentation</li>
      <li>Composite workspace best practices and usage templates</li>
      <li>Community contribution model for prompts and flows</li>
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
      <a href="https://discord.gg/qRUfPGBwWT" target="_blank" rel="noopener noreferrer" class="rm-feedback-btn rm-feedback-btn--discord">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
        Join Discord
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
