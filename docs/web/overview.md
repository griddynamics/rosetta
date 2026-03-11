---
layout: default
title: Overview
permalink: /overview/
---

<section class="hero">
  <h1>Overview</h1>
  <p>Rosetta is an open-source control plane for AI coding agents. It gives every agent the same context, standards, and workflows — across any IDE.</p>
</section>

## Architecture

<p>When you type a request in your IDE, the agent loads context from Rosetta first — then follows your organization's proven workflows. Source code never leaves your machine.</p>

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
    <div class="arch-node-sub">Cursor · Claude Code · VS Code · JetBrains · Codex</div>
  </div>
  <div class="arch-connector" aria-hidden="true">
    <span class="arch-packet"></span>
    <span class="arch-connector-label">HTTP + OAuth</span>
  </div>
  <div class="arch-node arch-node--accent">
    <div class="arch-node-icon">
      <img src="{{ '/assets/brand/rosetta-favicon.png' | relative_url }}" alt="Rosetta" class="arch-node-img">
    </div>
    <div class="arch-node-label">Rosetta MCP</div>
    <div class="arch-node-sub">VFS · Bundler · Tags · Context headers</div>
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
    <div class="arch-node-label">Rosetta Server</div>
    <div class="arch-node-sub">RAGFlow · parse · chunk · embed · retrieve</div>
  </div>
</div>

<div class="arch-annotations">
  <div class="arch-anno">
    <h4>Session Lifecycle</h4>
    <p>Bootstrap → Classify → Load → Execute. Guardrails and project context load automatically before the agent acts.</p>
  </div>
  <div class="arch-anno">
    <h4>Progressive Disclosure</h4>
    <p>Instructions load on demand. The agent gets only what it needs for your specific request — context stays focused, responses stay precise.</p>
  </div>
  <div class="arch-anno">
    <h4>Three-Layer Instructions</h4>
    <p><strong>Core</strong> · <strong>Organization</strong> · <strong>Project</strong> — merged at runtime into a single resource path. Published via Rosetta CLI from your Instructions Repo.</p>
  </div>
</div>

## Why Rosetta Matters Now

<div class="arch-annotations">
  <div class="arch-anno">
    <h4>Agents Everywhere, Standards Nowhere</h4>
    <p>Teams run 3-5 AI tools. No shared control plane. Every agent invents its own understanding of your codebase.</p>
  </div>
  <div class="arch-anno">
    <h4>Context Is the Bottleneck</h4>
    <p>Models are powerful enough. The constraint is input quality. Without structured context, agents produce plausible but wrong code at scale.</p>
  </div>
  <div class="arch-anno">
    <h4>Governance Gap</h4>
    <p>No approval gates, no consistency enforcement, no audit trail. Enterprises have compliance exposure.</p>
  </div>
</div>

<div class="note">
  Rosetta closes these gaps with a single control plane. <a href="#workflow">See the workflow →</a>
</div>

## Workflow

<p>Rosetta is a control plane for AI coding agents. It structures every AI task into four deliberate phases — so your team gets consistent, governed results instead of trial-and-error. Same rules, same context, same quality — across Claude Code, Cursor, Codex, Copilot, Windsurf, and every other tool.</p>

<div class="workflow-schema">
  <div class="workflow-step">
    <div class="workflow-num">Phase 1</div>
    <div class="workflow-title">Prepare</div>
    <div class="workflow-desc">One-time repository initialization. Rosetta reverse-engineers your codebase and generates structured context docs.</div>
    <ul class="workflow-points">
      <li>Generates TECHSTACK.md, CODEMAP.md</li>
      <li>Generates CONTEXT.md, ARCHITECTURE.md</li>
      <li>Configures agent rules per project</li>
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

<p class="muted">Rosetta gives every role on your project the AI context they need. Same rules, same quality, every session — across every IDE.</p>

<div class="flip-grid">
  <div class="flip-container" tabindex="0" role="button" aria-label="Developers — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Developers</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <ul>
          <li>Describe intent naturally — auto-classified into the right workflow</li>
          <li>Subagents handle planning, reviewing, and validating</li>
          <li>Full context on any codebase from the first command</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="Architects & Tech Leads — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Architects &amp; Tech Leads</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <ul>
          <li>One command generates CONTEXT.md, ARCHITECTURE.md, TECHSTACK.md, CODEMAP.md</li>
          <li>Write standards once — enforced on every AI request</li>
          <li>Review plans before execution, not just code after</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="QA Engineers — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>QA Engineers</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <ul>
          <li>Dedicated workflows for automated QA and test generation</li>
          <li>Strategy, scenario design, implementation, and reporting</li>
          <li>Tests grounded in real architecture and business rules</li>
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
          <li>Same AI behavior across all developers — no individual drift</li>
          <li>Approval gates before any code change — full visibility</li>
          <li>New hires productive immediately with full project context</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
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
})();
</script>

## Data & Privacy

<div class="note">
  <strong>Source code never leaves your machine.</strong> Rosetta MCP runs locally alongside your IDE. Only document metadata and search queries reach the Rosetta Server. No code, no prompts, no proprietary content is transmitted.
</div>

<div class="arch-output" style="margin-bottom:2rem">
  <a href="{{ '/usage/' | relative_url }}" class="arch-output-cta">See what Rosetta generates →</a>
  <span style="margin:0 .6rem;color:var(--muted)">·</span>
  <a href="https://github.com/griddynamics/rosetta" class="arch-output-cta" target="_blank" rel="noopener noreferrer">GitHub →</a>
</div>
