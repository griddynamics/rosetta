---
layout: default
title: Overview
permalink: /overview/
---

<section class="hero">
  <h1>Overview</h1>
</section>

## Workflow

<p>Rosetta is a control plane for AI coding agents. It structures every AI task into four deliberate phases — so your team gets consistent, governed results instead of trial-and-error. Same rules, same context, same quality — across Claude Code, Cursor, Codex, Copilot, Windsurf, and every other tool.</p>

<div class="workflow-schema">
  <div class="workflow-step">
    <div class="workflow-num">Phase 1</div>
    <div class="workflow-title">Prepare</div>
    <div class="workflow-desc">Load guardrails, coding conventions, and project-specific rules before touching any code.</div>
    <ul class="workflow-points">
      <li>Agent rules &amp; guardrails</li>
      <li>Coding conventions</li>
      <li>Project context</li>
    </ul>
  </div>
  <div class="workflow-arrow" aria-hidden="true"></div>
  <div class="workflow-step">
    <div class="workflow-num">Phase 2</div>
    <div class="workflow-title">Research</div>
    <div class="workflow-desc">Semantically search the knowledge base for architecture decisions and prior solutions.</div>
    <ul class="workflow-points">
      <li>Architecture decisions</li>
      <li>Tech stack &amp; dependencies</li>
      <li>Prior solutions</li>
    </ul>
  </div>
  <div class="workflow-arrow" aria-hidden="true"></div>
  <div class="workflow-step">
    <div class="workflow-num">Phase 3</div>
    <div class="workflow-title">Plan</div>
    <div class="workflow-desc">Produce an explicit, reviewable plan grounded in your actual codebase.</div>
    <ul class="workflow-points">
      <li>Explicit step-by-step plan</li>
      <li>Grounded in codebase</li>
      <li>Reviewable before action</li>
    </ul>
  </div>
  <div class="workflow-arrow" aria-hidden="true"></div>
  <div class="workflow-step">
    <div class="workflow-num">Phase 4</div>
    <div class="workflow-title">Act</div>
    <div class="workflow-desc">Execute with full context. Outputs are traceable and validated against project standards.</div>
    <ul class="workflow-points">
      <li>Context-aware execution</li>
      <li>Standards validation</li>
      <li>Traceable outputs</li>
    </ul>
  </div>
</div>

## Different Roles. Same Understanding.

<p class="muted">Rosetta gives every role on your project the AI context they need. Developers, architects, managers — same rules, same quality, every session.</p>

<div class="flip-grid">
  <div class="flip-container" tabindex="0" role="button" aria-label="Developers — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Developers</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <ul>
          <li>Talk to Rosetta like a colleague — no special syntax</li>
          <li>Full workflow: plan, approve, implement, validate, test</li>
          <li>Understand any system before changing it</li>
          <li>Project-aware from day one</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="Architects & Tech Leads — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Architects & Tech Leads</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <ul>
          <li>One prompt — get CONTEXT.md, ARCHITECTURE.md, TECHSTACK.md, CODEMAP.md</li>
          <li>Evidence-based technology decisions</li>
          <li>Write standards once — enforced on every request</li>
          <li>Review plans, not just code</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="Managers — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Managers</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <ul>
          <li>Same standards for every developer — no individual drift</li>
          <li>No code without approval — full visibility</li>
          <li>New hires productive immediately</li>
          <li>Standards scale with the team</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
  // Flip cards
  document.querySelectorAll('.flip-container').forEach(function(card) {
    card.addEventListener('click', function() {
      card.classList.toggle('is-flipped');
    });
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('is-flipped');
      }
    });
  });

  // Staggered reveal
  var flips = document.querySelectorAll('.flip-container');
  if ('IntersectionObserver' in window) {
    flips.forEach(function(el, i) { el.style.transitionDelay = (i * 0.15) + 's'; });
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    flips.forEach(function(el) { obs.observe(el); });
  } else {
    flips.forEach(function(el) { el.classList.add('is-visible'); });
  }
})();
</script>

<div class="arch-output" style="margin-bottom:2rem">
  <a href="{{ '/usage/' | relative_url }}" class="arch-output-cta">See what Rosetta generates and how to use it →</a>
</div>

## Architecture

<p>When you type a request in your IDE, the AI agent doesn't respond on its own — it first loads context and rules from Rosetta, then follows your organization's proven workflows.</p>

<div class="arch-flow">
  <div class="arch-node">
    <div class="arch-node-icon">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="6" width="40" height="28" rx="3" stroke="currentColor" stroke-width="2.5"/>
        <path d="M16 38h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M24 34v4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M14 16l4 4-4 4" stroke="var(--gd-gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 24h8" stroke="var(--gd-gold)" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="arch-node-label">Your IDE</div>
    <div class="arch-node-sub">Cursor, Claude Code, Windsurf, VS Code, JetBrains, Codex</div>
  </div>
  <div class="arch-connector" aria-hidden="true">
    <span class="arch-packet"></span>
    <span class="arch-connector-label">MCP protocol</span>
  </div>
  <div class="arch-node arch-node--accent">
    <div class="arch-node-icon">
      <img src="{{ '/assets/brand/rosetta-favicon.png' | relative_url }}" alt="Rosetta" class="arch-node-img">
    </div>
    <div class="arch-node-label">Rosetta MCP Server</div>
    <div class="arch-node-sub">Runs locally via <code>uvx</code> — no source code leaves your machine</div>
  </div>
  <div class="arch-connector" aria-hidden="true">
    <span class="arch-packet"></span>
    <span class="arch-connector-label">Semantic search</span>
  </div>
  <div class="arch-node">
    <div class="arch-node-icon">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="12" rx="16" ry="6" stroke="currentColor" stroke-width="2.5"/>
        <path d="M8 12v12c0 3.3 7.2 6 16 6s16-2.7 16-6V12" stroke="currentColor" stroke-width="2.5"/>
        <path d="M8 24v12c0 3.3 7.2 6 16 6s16-2.7 16-6V24" stroke="currentColor" stroke-width="2.5"/>
        <ellipse cx="24" cy="24" rx="16" ry="6" stroke="currentColor" stroke-width="1.5" opacity=".3"/>
        <circle cx="32" cy="34" r="2" fill="var(--gd-gold)"/>
        <circle cx="18" cy="16" r="2" fill="var(--gd-gold)"/>
      </svg>
    </div>
    <div class="arch-node-label">Knowledge Base</div>
    <div class="arch-node-sub">Workflows, guardrails, coding conventions, and project context</div>
  </div>
</div>

<div class="arch-details">
  <div class="arch-detail-card">
    <h4>Bootstrap Process</h4>
    <p>Every interaction starts automatically: load guardrails → read project context → classify your request → load the right workflow. Only then does the agent begin working.</p>
  </div>
  <div class="arch-detail-card">
    <h4>Progressive Disclosure</h4>
    <p>Instructions load on demand, not all at once. The agent gets only what it needs for your specific request — keeping context focused and responses precise.</p>
  </div>
  <div class="arch-detail-card">
    <h4>MCP Tools</h4>
    <p><code>get_context_instructions</code>, <code>query_instructions</code>, <code>list_instructions</code>, <code>submit_feedback</code>, <code>query/store_project_context</code>, <code>discover_projects</code></p>
  </div>
</div>
