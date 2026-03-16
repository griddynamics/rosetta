---
layout: default
title: Overview
permalink: /overview/
---

## Architecture

<p>Rosetta is a consulting control plane for AI coding agents. It consults them with versioned, expert-prepared instructions so every agent follows your organization's rules, conventions, and knowledge — from day one.</p>
<p>When you type a request in your IDE, the agent loads context from Rosetta first — then follows your organization's proven workflows. Source code never leaves your machine.</p>

<div class="arch-v2" id="arch-v2">

  <div class="arch-v2-flow">
    <!-- Left: IDE -->
    <div class="arch-v2-satellite">
      <div class="arch-v2-sat-icon">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="6" width="40" height="28" rx="3" stroke="currentColor" stroke-width="2.5"/>
          <path d="M16 38h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M24 34v4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M14 16l4 4-4 4" stroke="var(--gd-gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M21 24h8" stroke="var(--gd-gold)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="arch-v2-sat-label">Your IDE</div>
      <div class="arch-v2-sat-sub">Cursor · Claude Code · VS Code<br>JetBrains · Windsurf · Codex<br>Antigravity · OpenCode</div>
    </div>

    <!-- Connector left -->
    <div class="arch-v2-conn">
      <div class="arch-v2-conn-line">
        <span class="arch-v2-particle"></span>
        <span class="arch-v2-particle arch-v2-particle--delay"></span>
      </div>
      <span class="arch-v2-conn-label">HTTP + OAuth</span>
    </div>

    <!-- Center: Rosetta MCP (hero) -->
    <div class="arch-v2-hub">
      <div class="arch-v2-hub-glow"></div>
      <div class="arch-v2-hub-inner">
        <img src="{{ '/assets/brand/rosetta-favicon.png' | relative_url }}" alt="Rosetta" class="arch-v2-hub-logo">
        <div class="arch-v2-hub-title">Rosetta MCP</div>
        <div class="arch-v2-hub-desc">VFS · Bundler · Tags · Context headers</div>
        <div class="arch-v2-layers-label">Instruction Layers</div>
        <div class="arch-v2-layers">
          <span class="arch-v2-layer">Core</span>
          <span class="arch-v2-layer">Organization</span>
          <span class="arch-v2-layer">Project</span>
        </div>
        <div class="arch-v2-lifecycle">
          <span class="arch-v2-lc-step" data-step="1">Start</span>
          <span class="arch-v2-lc-arrow">→</span>
          <span class="arch-v2-lc-step" data-step="2">Bootstrap</span>
          <span class="arch-v2-lc-arrow">→</span>
          <span class="arch-v2-lc-step" data-step="3">Classify</span>
          <span class="arch-v2-lc-arrow">→</span>
          <span class="arch-v2-lc-step" data-step="4">Load</span>
          <span class="arch-v2-lc-arrow">→</span>
          <span class="arch-v2-lc-step" data-step="5">Execute</span>
          <span class="arch-v2-lc-arrow">→</span>
          <span class="arch-v2-lc-step" data-step="6">Evolve</span>
        </div>
      </div>
    </div>

    <!-- Connector right -->
    <div class="arch-v2-conn">
      <div class="arch-v2-conn-line">
        <span class="arch-v2-particle"></span>
        <span class="arch-v2-particle arch-v2-particle--delay"></span>
      </div>
      <span class="arch-v2-conn-label">Tags + Search</span>
    </div>

    <!-- Right: Server -->
    <div class="arch-v2-satellite">
      <div class="arch-v2-sat-icon">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="24" cy="12" rx="16" ry="6" stroke="currentColor" stroke-width="2.5"/>
          <path d="M8 12v12c0 3.3 7.2 6 16 6s16-2.7 16-6V12" stroke="currentColor" stroke-width="2.5"/>
          <path d="M8 24v12c0 3.3 7.2 6 16 6s16-2.7 16-6V24" stroke="currentColor" stroke-width="2.5"/>
          <ellipse cx="24" cy="24" rx="16" ry="6" stroke="currentColor" stroke-width="1.5" opacity=".3"/>
          <circle cx="32" cy="34" r="2" fill="var(--gd-gold)"/>
          <circle cx="18" cy="16" r="2" fill="var(--gd-gold)"/>
        </svg>
      </div>
      <div class="arch-v2-sat-label">Rosetta Server</div>
      <div class="arch-v2-sat-sub">RAGFlow · parse<br>chunk · embed · retrieve</div>
    </div>
  </div>

  <!-- Annotations -->
  <div class="arch-v2-annotations">
    <div class="arch-v2-anno">
      <h4>Progressive Disclosure</h4>
      <p>Instructions load on demand. The agent gets only what it needs for your specific request — context stays focused, responses stay precise.</p>
    </div>
    <div class="arch-v2-anno">
      <h4>Three-Layer Instructions</h4>
      <p><strong>Core</strong> · <strong>Organization</strong> · <strong>Project</strong> — merged at runtime into a single resource path. Published via Rosetta CLI from your Instructions Repo.</p>
    </div>
  </div>
</div>

<script>
(function(){
  var section = document.getElementById('arch-v2');
  if (!section) return;
  var steps = section.querySelectorAll('.arch-v2-lc-step');
  var idx = 0;
  function cycle() {
    steps.forEach(function(s) { s.classList.remove('is-active'); });
    steps[idx].classList.add('is-active');
    idx = (idx + 1) % steps.length;
  }
  var obs = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) {
      cycle();
      setInterval(cycle, 1200);
      obs.unobserve(section);
    }
  }, { threshold: 0.3 });
  obs.observe(section);
})();
</script>


## Design Principles

<div class="principles-list">
  <div class="principle">
    <h4>Agent-agnostic</h4>
    <p>Works across Cursor, Claude Code, VS Code, Windsurf, JetBrains, GitHub Copilot, Codex, and any MCP-compatible IDE. Adopts agent-specific features where available, simulates them where not.</p>
  </div>
  <div class="principle">
    <h4>Progressive disclosure</h4>
    <p>Instructions load in stages — bootstrap, classification, workflow-specific. The agent gets only what it needs for the current task. Prevents context overflow.</p>
  </div>
  <div class="principle">
    <h4>Classification-first</h4>
    <p>Every request is auto-classified into a workflow type before any work begins. Classification drives which instructions, skills, and rules load.</p>
  </div>
  <div class="principle">
    <h4>Release-based versioning</h4>
    <p>Instructions organized by release (r1, r2, r3). New instructions develop without breaking stable agents. Rollback is always possible.</p>
  </div>
  <div class="principle">
    <h4>Rules-as-code</h4>
    <p>AI behavior is authored, versioned, reviewed, and approved through standard engineering workflows — same rigor as application code.</p>
  </div>
  <div class="principle">
    <h4>Security by design</h4>
    <p>No source code transfer. Air-gap capable. Runs inside the organization's perimeter.</p>
  </div>
  <div class="principle">
    <h4>Batteries included</h4>
    <p>Ships proven defaults from real-world projects. Makes the right thing the easy thing.</p>
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


<div class="rm-feedback" style="margin-top:3rem;flex-direction:column;align-items:flex-start;gap:.75rem">
  <div class="rm-feedback-text">
    <strong>Want the full picture?</strong>
    <p>Key concepts, session lifecycle, three-layer architecture, workflow patterns, and everything else in one place.</p>
  </div>
  <div class="rm-feedback-actions">
    <a href="{{ '/docs/introduction/' | relative_url }}" class="rm-feedback-btn rm-feedback-btn--lg">Docs</a>
  </div>
</div>
