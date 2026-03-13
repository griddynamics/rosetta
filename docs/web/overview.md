---
layout: default
title: Overview
permalink: /overview/
---

<section class="hero">
  <h1>Overview</h1>
  <p>Rosetta is a consulting control plane for AI coding agents. It consults them with versioned, expert-prepared instructions so every agent follows your organization's rules, conventions, and knowledge — from day one.</p>
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


## Design Principles

<div class="flip-grid">
  <div class="flip-container" tabindex="0" role="button" aria-label="Agent-agnostic — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Agent-agnostic</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <p>Works across Cursor, Claude Code, VS Code, Windsurf, JetBrains, GitHub Copilot, Codex, and any MCP-compatible IDE. Adopts agent-specific features where available, simulates them where not.</p>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="Progressive disclosure — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Progressive disclosure</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <p>Instructions load in stages — bootstrap, classification, workflow-specific. The agent gets only what it needs for the current task. Prevents context overflow.</p>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="Classification-first — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Classification-first</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <p>Every request is auto-classified into a workflow type before any work begins. Classification drives which instructions, skills, and rules load.</p>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="Release-based versioning — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Release-based versioning</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <p>Instructions organized by release (r1, r2, r3). New instructions develop without breaking stable agents. Rollback is always possible.</p>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="Rules-as-code — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Rules-as-code</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <p>AI behavior is authored, versioned, reviewed, and approved through standard engineering workflows — same rigor as application code.</p>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="Security by design — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Security by design</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <p>No source code transfer. Air-gap capable. Runs inside the organization's perimeter.</p>
      </div>
    </div>
  </div>
  <div class="flip-container" tabindex="0" role="button" aria-label="Batteries included — click to reveal details">
    <div class="flip-card">
      <div class="flip-front">
        <h3>Batteries included</h3>
        <span class="flip-hint">Click to explore</span>
      </div>
      <div class="flip-back">
        <p>Ships proven defaults from real-world projects. Makes the right thing the easy thing.</p>
      </div>
    </div>
  </div>
</div>

## How It Works

<p>Rosetta structures every AI task into five deliberate phases. Reusable prompts apply without modification for each service — consistent, governed results across every IDE and every team. Human review at each transition is critically important.</p>

<div class="workflow-schema">
  <div class="workflow-step">
    <div class="workflow-num">Phase 1</div>
    <div class="workflow-title">Preparation</div>
    <div class="workflow-desc">Codify the task as reusable prompts. The task is repeatable and can be structured once, then applied everywhere.</div>
    <ul class="workflow-points">
      <li>Business &amp; technology context</li>
      <li>Replace old patterns with modern counterparts</li>
      <li>Update tests, move components, update dependents</li>
    </ul>
  </div>
  <div class="workflow-arrow" aria-hidden="true"></div>
  <div class="workflow-step">
    <div class="workflow-num">Phase 2</div>
    <div class="workflow-title">Research</div>
    <div class="workflow-desc">AI identifies all affected code parts needed to perform the task.</div>
    <ul class="workflow-points">
      <li>Dependencies &amp; dependents of migrated services</li>
      <li>Project structure: modules, imports, libraries</li>
      <li>Legacy code to rewrite, bridge between frameworks</li>
    </ul>
  </div>
  <div class="workflow-arrow" aria-hidden="true"></div>
  <div class="workflow-step">
    <div class="workflow-num">Phase 3</div>
    <div class="workflow-title">Plan</div>
    <div class="workflow-desc">Generate a detailed, resilient step-by-step plan split into phases that mimic the engineer's workflow.</div>
    <ul class="workflow-points">
      <li>Small code changes per phase — review before they apply</li>
      <li>Task description, motivation, and required change per step</li>
      <li>Automated validation (e.g. unit tests) at end of each phase</li>
    </ul>
  </div>
  <div class="workflow-arrow" aria-hidden="true"></div>
  <div class="workflow-step">
    <div class="workflow-num">Phase 4</div>
    <div class="workflow-title">Act</div>
    <div class="workflow-desc">Implement the plan one phase at a time. Resumable across sessions — same prompt continues where it left off.</div>
    <ul class="workflow-points">
      <li>Phase completion tracked inside the prompt itself</li>
      <li>Grounding rules enforced: tests run, commits after each phase</li>
      <li>New session picks up with the same prompt if context fills</li>
    </ul>
  </div>
  <div class="workflow-arrow" aria-hidden="true"></div>
  <div class="workflow-step">
    <div class="workflow-num">Phase 5</div>
    <div class="workflow-title">Validate</div>
    <div class="workflow-desc">Integrated QA by AI — verifies the implementation against specs for the product's API and UI.</div>
    <ul class="workflow-points">
      <li>Systematically validates implementation against specs</li>
      <li>Implements integration and E2E tests</li>
      <li>Compatible with subagents and background agents</li>
    </ul>
  </div>
</div>

<script>
(function(){
  document.querySelectorAll('.flip-container').forEach(function(card) {
    card.addEventListener('click', function() { card.classList.toggle('is-flipped'); });
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('is-flipped'); }
    });
  });
})();
</script>

<div class="rm-feedback" style="margin-top:3rem;flex-direction:column;align-items:flex-start;gap:.75rem">
  <div class="rm-feedback-text">
    <strong>Want the full picture?</strong>
    <p>Key concepts, session lifecycle, three-layer architecture, workflow patterns, and everything else in one place.</p>
  </div>
  <div class="rm-feedback-actions">
    <a href="{{ '/docs/introduction/' | relative_url }}" class="rm-feedback-btn rm-feedback-btn--lg">Docs</a>
  </div>
</div>
