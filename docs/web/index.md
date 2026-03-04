---
layout: default
title: Home
permalink: /
---

<!-- ===== HERO ===== -->
<section class="hero-main">
  <img src="{{ '/assets/brand/rosetta-logo-full-color-white-text.png' | relative_url }}" alt="Rosetta logo" class="hero-logo logo-dark">
  <img src="{{ '/assets/brand/rosetta-logo-full-color-black-text.png' | relative_url }}" alt="Rosetta logo" class="hero-logo logo-light">
  <p class="hero-tagline">Control plane for AI coding agents. Governs behavior, packages proven workflows, and delivers consistent engineering quality across your entire organization.</p>
  <div class="hero-actions">
    <a href="#quick-start" class="button">Get Started</a>
    <a href="{{ '/overview/' | relative_url }}" class="button-ghost">Learn More</a>
    <a href="https://github.com/griddynamics/rosetta" class="button-ghost" target="_blank" rel="noopener noreferrer">GitHub</a>
  </div>
</section>

<!-- ===== QUICK START ===== -->
<section class="section" id="quick-start">
  <div class="qs-panel">
    <h2 class="with-marker">Quick Start</h2>
    <p class="qs-sub">Add Rosetta MCP to your AI coding client in minutes. No source code sharing required.</p>

    <p class="qs-step-label">Step 1 — Install uv</p>
      <div class="qs-code-wrap">
        <pre class="qs-code"><span class="qs-prompt">$</span> brew install uv          <span class="qs-comment"># macOS</span>
<span class="qs-prompt">$</span> curl -LsSf https://astral.sh/uv/install.sh | sh  <span class="qs-comment"># Linux / Windows (WSL)</span></pre>
      </div>
      <p class="qs-step-label">Step 2 — Configure all supported IDEs</p>
      <div class="qs-code-wrap">
        <pre class="qs-code"><span class="qs-prompt">$</span> npx rosetta configure</pre>
        <button class="qs-copy" data-copy="npx rosetta configure">Copy</button>
      </div>
      <p class="qs-step-label">Step 3 — Initialize your repository</p>
      <div class="qs-code-wrap">
        <pre class="qs-code"><span class="qs-comment"># Restart your IDE, then ask your assistant:</span>
<span class="qs-comment"># "Initialize this repository"</span></pre>
      </div>
      <p class="qs-step-label">Step 4 — Verify</p>
      <div class="qs-code-wrap">
        <pre class="qs-code"><span class="qs-comment"># Ask your assistant:</span>
<span class="qs-comment"># "What can you do?"</span></pre>
      </div>

  </div>
</section>

<script>
(function() {
  document.querySelectorAll('.qs-copy').forEach(function(btn) {
    btn.addEventListener('click', function() {
      navigator.clipboard.writeText(btn.dataset.copy).then(function() {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = orig; }, 1500);
      });
    });
  });
})();
</script>

<!-- ===== KEY FEATURES ===== -->
<section class="section">
  <h2 class="with-marker">Key Features</h2>
  <ul class="features-list">
    <li>Based on SOTA Meta-Prompting technology</li>
    <li>Project-specific, dynamically composed context</li>
    <li>Replaces static, one-size-fits-all rule sets</li>
    <li>Progressive disclosure</li>
    <li>Air gap security — no source code is transferred</li>
    <li>MCP-based: one-line installation &amp; centralized management</li>
    <li>Agent agnostic: Claude Code, Cursor, Codex, and more</li>
    <li>Rich dynamic context with rules, workflows, skills, and sub-agents</li>
    <li>Continuously updated centralized knowledge base</li>
    <li>Cloud, on-prem, open source, and enterprise editions</li>
  </ul>
</section>


<!-- ===== WORKS WITH ===== -->
<section class="section">
  <h2 class="with-marker">Works With</h2>
  <p class="muted">Rosetta runs through any MCP-capable AI coding client. One setup, any tool, no vendor lock-in.</p>
  <div class="integrations-list">
    <span class="integration-tag">Cursor</span>
    <span class="integration-tag">Claude Code</span>
    <span class="integration-tag">GitHub Copilot</span>
    <span class="integration-tag">Windsurf</span>
    <span class="integration-tag">VS Code</span>
    <span class="integration-tag">Codex CLI</span>
    <span class="integration-tag">Any MCP Client</span>
  </div>
</section>
