---
layout: default
title: Home
permalink: /
---

<!-- ===== HERO ===== -->
<section class="hero-main" id="hero">
  <img src="{{ '/assets/brand/rosetta-logo-full-color-white-text.png' | relative_url }}" alt="Rosetta logo" class="hero-logo logo-dark">
  <img src="{{ '/assets/brand/rosetta-logo-full-color-black-text.png' | relative_url }}" alt="Rosetta logo" class="hero-logo logo-light">
  <h1 class="hero-headline">Meta-prompting, context engineering, and centralized instructions management for AI coding agents</h1>
  <p class="hero-sub">
    Guides AI systems to operate with a deep understanding of system architecture, domain constraints, and engineering standards.<br>
    Gives every agent the same context, standards, and guardrails — across any IDE, any team.
  </p>
  <div class="hero-actions">
    <a href="#hero" class="button">Get Started</a>
    <a href="{{ '/overview/' | relative_url }}" class="button-ghost">See it in action</a>
    <a href="https://github.com/griddynamics/rosetta" class="button-ghost" target="_blank" rel="noopener noreferrer">GitHub</a>
  </div>
</section>

<!-- ===== THE PROBLEM IN 2026 ===== -->
<section class="section diag-section" id="why-rosetta">
  <h2 class="with-marker">Why AI Agents Need Rosetta</h2>
  <p class="section-subtitle">AI coding agents are everywhere. Consistency and context are not.</p>

  <div class="diag-header">
    <span class="diag-dot diag-dot--amber"></span>
    <span class="diag-header-text">System Status: Unmanaged AI Agents</span>
  </div>

  <div class="diag-rows" id="diag-rows">
    <div class="diag-row">
      <div class="diag-status"><span class="diag-dot diag-dot--red"></span></div>
      <div class="diag-body">
        <div class="diag-label">MISSED CONVENTIONS</div>
        <div class="diag-desc">Agents lack your architecture, business rules, and compliance requirements. They produce code that violates conventions, causing expensive rework and high rejection rates.</div>
      </div>
    </div>

    <div class="diag-row">
      <div class="diag-status"><span class="diag-dot diag-dot--red"></span></div>
      <div class="diag-body">
        <div class="diag-label">INSTRUCTIONS DON'T SCALE</div>
        <div class="diag-desc">Every engineer writes their own prompts — or none at all. Crafting effective instructions takes hours of work per task, they go stale fast, and there's no way to version, review, or govern them.</div>
      </div>
    </div>

    <div class="diag-row">
      <div class="diag-status"><span class="diag-dot diag-dot--red"></span></div>
      <div class="diag-body">
        <div class="diag-label">NO CROSS-IDE REUSE</div>
        <div class="diag-desc">Prompt libraries are IDE-specific and fragile. Switch from Cursor to Claude Code? Rewrite everything. New model drops? Start over. The same problem gets solved differently on every team.</div>
      </div>
    </div>

    <div class="diag-row">
      <div class="diag-status"><span class="diag-dot diag-dot--red"></span></div>
      <div class="diag-body">
        <div class="diag-label">SILOED KNOWLEDGE</div>
        <div class="diag-desc">Patterns proven in one project never reach others. Senior expertise stays in people's heads. Breaking changes cascade undetected across services because agents see one repo, not the system.</div>
      </div>
    </div>
  </div>

  <a href="#what-rosetta-adds" class="diag-resolved">
    <span class="diag-resolved-text">Rosetta solves this. See how ↓</span>
  </a>

  <script>
  (function(){
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('diag-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    var el = document.getElementById('diag-rows');
    if (el) observer.observe(el);
  })();
  </script>
</section>

<!-- ===== WHAT ROSETTA ADDS ===== -->
<section class="section" id="what-rosetta-adds">
  <h2 class="with-marker">What Rosetta Adds to AI Coding Agents</h2>
  <p class="section-subtitle">Coding agent system prompts handle tool calls and output formatting. They contain no engineering process, no guardrails, no project awareness. They can't — the system prompt doesn't know if you're building a PoC or enterprise software with regulated data. Rosetta fills that gap with instructions that guide the agent through everything it would otherwise skip.</p>

  <div class="adds-grid">

    <div class="adds-item">
      <div class="adds-num">1</div>
      <div class="adds-body">
        <strong>Project context before every task.</strong>
        Without Rosetta, agents read a few lines around the problem and guess the rest. With Rosetta, the agent reverse-engineers your architecture, tech stack, and business context during initialization — and reads it before every task. No more blind guessing.
      </div>
    </div>

    <div class="adds-item">
      <div class="adds-num">2</div>
      <div class="adds-body">
        <strong>Guardrails that actually enforce.</strong>
        Agents don't assess risk, don't protect sensitive data, don't question dangerous actions. Rosetta instructions require the agent to assess risk, mask sensitive data, detect dangerous operations, and follow behavior boundaries — loaded at startup, always active.
      </div>
    </div>

    <div class="adds-item">
      <div class="adds-num">3</div>
      <div class="adds-body">
        <strong>Human-in-the-loop at decision points.</strong>
        Agents trust user input unconditionally and never stop once started. Rosetta workflows define approval gates after specs, after plans, and before risky actions. The agent stops, asks targeted questions, and waits — instead of getting carried away.
      </div>
    </div>

    <div class="adds-item">
      <div class="adds-num">4</div>
      <div class="adds-body">
        <strong>Request classification and source of truth.</strong>
        Agents treat every request the same. Rosetta auto-classifies each request into one of twelve workflow types — coding, testing, research, requirements, modernization, and others — loading entirely different instructions for each. The agent maintains requirements traceability instead of mixing everything together.
      </div>
    </div>

    <div class="adds-item">
      <div class="adds-num">5</div>
      <div class="adds-body">
        <strong>Analysis before execution.</strong>
        Most agents rush straight to code. Rosetta workflows define preparation, research, planning, and approval phases before a single line is written. Plans and specs are separate artifacts. The process scales by task size.
      </div>
    </div>

    <div class="adds-item">
      <div class="adds-num">6</div>
      <div class="adds-body">
        <strong>Review and validation by separate agents.</strong>
        Self-review doesn't work — the model rubber-stamps its own decisions. Rosetta instructs the agent to delegate review and validation to separate subagents with fresh context windows. They've never seen the implementation struggles. They catch what the implementer can't.
      </div>
    </div>

    <div class="adds-item">
      <div class="adds-num">7</div>
      <div class="adds-body">
        <strong>Workflows built from real failure modes.</strong>
        Ask any AI to design a coding workflow from scratch — it produces 2-3 steps and forgets everything else. Rosetta contains workflows created by humans who observed every category of AI failure and encoded the solutions. The agent stops skipping the steps that matter.
      </div>
    </div>

    <div class="adds-item">
      <div class="adds-num">8</div>
      <div class="adds-body">
        <strong>Self-learning and crash recovery.</strong>
        Agents don't learn from mistakes and don't survive session loss. Rosetta instructs the agent to maintain a memory of errors and lessons, and to write execution state to disk. If a session fails, the next one resumes from the last checkpoint.
      </div>
    </div>

    <div class="adds-item">
      <div class="adds-num">9</div>
      <div class="adds-body">
        <strong>Security by design.</strong>
        Rosetta never sees your code. Instruction delivery is deterministic — the agent requests by tag, not by sending source code. No semantic search over your codebase. Air-gap capable. Runs inside your perimeter.
      </div>
    </div>

    <div class="adds-item">
      <div class="adds-num">10</div>
      <div class="adds-body">
        <strong>One investment, every AI tool.</strong>
        Works across Cursor, Claude Code, VS Code, JetBrains, Codex, Windsurf, and more. Write instructions once. Three layers merge at runtime — core, organization, project — so teams customize without forking. Version-controlled with instant rollback.
      </div>
    </div>

  </div>

  <p style="text-align:center;margin-top:1.5rem;opacity:.7;font-size:.95rem">
    A typical coding task drops from ~75 min to ~25 min. Repository onboarding drops from weeks to minutes. Production teams report 3x–5x productivity gains.
  </p>
</section>

<!-- ===== TRY ROSETTA (INLINE) ===== -->
<section class="section" id="try-rosetta-section">
  <h2 class="with-marker">Try Rosetta</h2>
  <p class="section-subtitle">Pick a scenario and see how Rosetta handles it step by step.</p>

  <div class="try-inline">
    <div class="try-inline-sidebar">
      <div class="try-inline-tabs">
        <button class="try-inline-tab is-active" data-filter="all">All Workflows</button>
      </div>
      <div class="try-inline-list" id="try-inline-scenarios"></div>
    </div>
    <div class="try-inline-main">
      <div class="try-inline-chat-header">Rosetta analyzing your request…</div>
      <div class="try-inline-chat" id="try-inline-chat">
        <div class="try-inline-placeholder">
          <img src="{{ '/assets/brand/rosetta-favicon.png' | relative_url }}" alt="Rosetta" style="width:56px;height:56px;opacity:.6;">
          <p>Pick a scenario on the left to start</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== GET STARTED ===== -->
<section class="section" id="quick-start">
  <h2 class="with-marker">Get Started</h2>
  <p class="section-subtitle">Pick the supported installation path, verify Rosetta is active, initialize the repository, then start using workflows.</p>
  <div class="qs-panel">

    <div class="qs-stepper">

      <!-- Step 1 -->
      <div class="qs-step qs-step--large">
        <div class="qs-step-indicator">
          <span class="qs-step-num">1</span>
          <span class="qs-step-line"></span>
        </div>
        <div class="qs-step-body">
          <h3 class="qs-step-title">Install Rosetta</h3>
          <p class="qs-step-desc">Use plugins where they are supported. Use MCP only for agents without a Rosetta plugin path.</p>
          <div class="qs-trust-badge">
            <svg class="qs-trust-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Rosetta is designed to never use or see your data or IP.</span>
          </div>
          <div class="qs-warning">
            <svg class="qs-warning-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>&nbsp;‼️ You must receive a prior approval from your manager and company to use it. ‼️&nbsp;</span>
          </div>

          <div class="qs-tabs-scroll">
            <div class="qs-tabs" role="tablist">
              <button class="qs-tab active" data-tab="claude" data-mode="plugin" role="tab">Claude Code</button>
              <button class="qs-tab" data-tab="cursor" data-mode="plugin" role="tab">Cursor</button>
              <button class="qs-tab" data-tab="copilot" data-mode="plugin" role="tab">Copilot</button>
              <button class="qs-tab" data-tab="codex" data-mode="plugin" role="tab">Codex</button>
              <button class="qs-tab" data-tab="antigravity" data-mode="mcp" role="tab">Antigravity</button>
              <button class="qs-tab" data-tab="windsurf" data-mode="mcp" role="tab">Windsurf</button>
              <button class="qs-tab" data-tab="opencode" data-mode="mcp" role="tab">OpenCode</button>
              <button class="qs-tab" data-tab="junie" data-mode="mcp" role="tab">JetBrains Junie</button>
              <button class="qs-tab" data-tab="other-mcp" data-mode="mcp" role="tab">Other MCP Client</button>
            </div>
          </div>

          <!-- Tab: Claude Code -->
          <div class="qs-content active" data-tab-content="claude">
            <p class="qs-content-hint">Install the Rosetta plugin from the Claude Code marketplace. Deep links: <a href="{{ '/docs/plugins/#claude-code' | relative_url }}">Plugins</a>, <a href="{{ '/docs/installation/#plugin-based-installation-pre-release' | relative_url }}">Installation</a>.</p>
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-prompt">$</span> claude plugin marketplace add griddynamics/rosetta
<span class="qs-prompt">$</span> claude plugin install rosetta@rosetta</pre>
              <button class="qs-copy" data-copy="claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta">Copy</button>
            </div>
          </div>

          <!-- Tab: Cursor -->
          <div class="qs-content" data-tab-content="cursor">
            <p class="qs-content-hint">Use a Cursor team marketplace when available. If not, extract the standalone package into the repository. Deep links: <a href="{{ '/docs/plugins/#cursor' | relative_url }}">Plugins</a>, <a href="{{ '/docs/installation/#plugin-based-installation-pre-release' | relative_url }}">Installation</a>.</p>
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-comment"># Team marketplace repository</span>
https://github.com/griddynamics/rosetta

<span class="qs-comment"># Standalone fallback</span>
Download core-cursor-standalone-*.zip from the <a href="https://github.com/griddynamics/rosetta/releases/latest">latest release</a> and extract it into the repository.</pre>
              <button class="qs-copy" data-copy="https://github.com/griddynamics/rosetta">Copy</button>
            </div>
          </div>

          <!-- Tab: VS Code / GitHub Copilot -->
          <div class="qs-content" data-tab-content="copilot">
            <p class="qs-content-hint">For VS Code, add Rosetta as a Copilot plugin marketplace and install <code>rosetta</code> from agent customizations. For JetBrains Copilot, use the standalone package. Deep links: <a href="{{ '/docs/plugins/#github-copilot' | relative_url }}">Plugins</a>, <a href="{{ '/docs/installation/#plugin-based-installation-pre-release' | relative_url }}">Installation</a>.</p>
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-comment"># VS Code setting: chat.plugins.marketplaces</span>
https://github.com/griddynamics/rosetta

<span class="qs-comment"># JetBrains Copilot</span>
Download core-copilot-standalone-*.zip from the <a href="https://github.com/griddynamics/rosetta/releases/latest">latest release</a> and extract it into the repository.</pre>
              <button class="qs-copy" data-copy="https://github.com/griddynamics/rosetta">Copy</button>
            </div>
          </div>

          <!-- Tab: Codex -->
          <div class="qs-content" data-tab-content="codex">
            <p class="qs-content-hint">Extract the standalone Codex plugin package into the repository, then enable hooks. Deep links: <a href="{{ '/docs/plugins/#codex' | relative_url }}">Plugins</a>, <a href="{{ '/docs/installation/#plugin-based-installation-pre-release' | relative_url }}">Installation</a>.</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">Download core-codex-*.zip from the <a href="https://github.com/griddynamics/rosetta/releases/latest">latest release</a> and extract it into the repository.

<span class="qs-prompt">$</span> codex features enable hooks</pre>
              <button class="qs-copy" data-copy="codex features enable hooks">Copy</button>
            </div>
          </div>

          <!-- Tab: Antigravity -->
          <div class="qs-content" data-tab-content="antigravity">
            <p class="qs-content-hint">Add Rosetta MCP to Antigravity, then add the bootstrap rule. Deep links: <a href="{{ '/docs/mcps/#antigravity' | relative_url }}">MCPs Installation</a>, <a href="{{ '/docs/installation/#http-transport' | relative_url }}">Installation</a>.</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcpServers": {
    "Rosetta": {
      "serverUrl": "https://mcp.rosetta.griddynamics.net/mcp"
    }
  }
}

Bootstrap rule destination:
.agent/rules/bootstrap.md</pre>
              <button class="qs-copy" data-copy='{"mcpServers":{"Rosetta":{"serverUrl":"https://mcp.rosetta.griddynamics.net/mcp"}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: Windsurf -->
          <div class="qs-content" data-tab-content="windsurf">
            <p class="qs-content-hint">Add Rosetta MCP to Windsurf, then add the bootstrap rule. Deep links: <a href="{{ '/docs/mcps/#windsurf' | relative_url }}">MCPs Installation</a>, <a href="{{ '/docs/installation/#http-transport' | relative_url }}">Installation</a>.</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcpServers": {
    "Rosetta": {
      "url": "https://mcp.rosetta.griddynamics.net/mcp"
    }
  }
}

Bootstrap rule destination:
.windsurf/rules/bootstrap.md</pre>
              <button class="qs-copy" data-copy='{"mcpServers":{"Rosetta":{"url":"https://mcp.rosetta.griddynamics.net/mcp"}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: OpenCode -->
          <div class="qs-content" data-tab-content="opencode">
            <p class="qs-content-hint">Add Rosetta MCP to OpenCode, then add the bootstrap rule. Deep links: <a href="{{ '/docs/mcps/#opencode' | relative_url }}">MCPs Installation</a>, <a href="{{ '/docs/installation/#http-transport' | relative_url }}">Installation</a>.</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcp": {
    "Rosetta": {
      "type": "http",
      "url": "https://mcp.rosetta.griddynamics.net/mcp",
      "enabled": true
    }
  }
}

Bootstrap rule destination:
AGENTS.md</pre>
              <button class="qs-copy" data-copy='{"mcp":{"Rosetta":{"type":"http","url":"https://mcp.rosetta.griddynamics.net/mcp","enabled":true}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: JetBrains Junie -->
          <div class="qs-content" data-tab-content="junie">
            <p class="qs-content-hint">Add Rosetta MCP in Junie settings, then add the bootstrap rule. Deep links: <a href="{{ '/docs/mcps/#jetbrains-junie' | relative_url }}">MCPs Installation</a>, <a href="{{ '/docs/installation/#http-transport' | relative_url }}">Installation</a>.</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcpServers": {
    "Rosetta": {
      "url": "https://mcp.rosetta.griddynamics.net/mcp"
    }
  }
}

Bootstrap rule destination:
.junie/guidelines.md</pre>
              <button class="qs-copy" data-copy='{"mcpServers":{"Rosetta":{"url":"https://mcp.rosetta.griddynamics.net/mcp"}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: Other MCP Client -->
          <div class="qs-content" data-tab-content="other-mcp">
            <p class="qs-content-hint">Use the Rosetta HTTP MCP endpoint in any MCP-compatible IDE or coding agent without a Rosetta plugin path. Add the bootstrap rule to that tool's project instruction file. Deep links: <a href="{{ '/docs/mcps/' | relative_url }}">MCPs Installation</a>, <a href="{{ '/docs/installation/#http-transport' | relative_url }}">Installation</a>.</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">https://mcp.rosetta.griddynamics.net/mcp

Bootstrap rule:
Download bootstrap.md and place it in your IDE or agent's project instruction file.</pre>
              <button class="qs-copy" data-copy="https://mcp.rosetta.griddynamics.net/mcp">Copy</button>
            </div>
          </div>

        </div>
      </div>

      <!-- Step 2 -->
      <div class="qs-step">
        <div class="qs-step-indicator">
          <span class="qs-step-num">2</span>
          <span class="qs-step-line"></span>
        </div>
        <div class="qs-step-body">
          <h3 class="qs-step-title">Verify Rosetta</h3>
          <p class="qs-step-desc">Restart the IDE if you changed files or settings. Then ask the agent this exact question:</p>
          <div class="qs-code-wrap">
            <pre class="qs-code">What can you do, Rosetta?</pre>
          </div>
          <div class="qs-mode-content active" data-mode-content="plugin">
            <p class="qs-step-desc" style="margin-top:.8rem;">A working plugin setup follows Rosetta prompts, shows available workflows, and runs <code>self-help-flow</code> instead of giving a generic model answer.</p>
            <div class="qs-shot-grid" aria-label="Plugin verification examples">
              <button class="qs-shot" type="button" data-full="{{ '/assets/images/Rosetta-ProperResponse.png' | relative_url }}" aria-label="Expand Claude Code plugin verification example">
                <img src="{{ '/assets/images/Rosetta-ProperResponse.png' | relative_url }}" alt="Claude Code plugin verification example">
                <span>Claude Code example</span>
              </button>
              <button class="qs-shot" type="button" data-full="{{ '/assets/images/Rosetta-ProperResponse-Copilot.png' | relative_url }}" aria-label="Expand Copilot plugin verification example">
                <img src="{{ '/assets/images/Rosetta-ProperResponse-Copilot.png' | relative_url }}" alt="Copilot plugin verification example">
                <span>Copilot example</span>
              </button>
            </div>
          </div>
          <div class="qs-mode-content" data-mode-content="mcp">
            <p class="qs-step-desc" style="margin-top:.8rem;">A working MCP setup uses Rosetta MCP to retrieve agents, guardrails, and instructions before answering.</p>
            <div class="qs-shot-grid" aria-label="MCP verification examples">
              <button class="qs-shot" type="button" data-full="{{ '/assets/images/Rosetta-ProperResponse1.png' | relative_url }}" aria-label="Expand MCP verification example one">
                <img src="{{ '/assets/images/Rosetta-ProperResponse1.png' | relative_url }}" alt="MCP verification example one">
                <span>MCP example 1</span>
              </button>
              <button class="qs-shot" type="button" data-full="{{ '/assets/images/Rosetta-ProperResponse2.png' | relative_url }}" aria-label="Expand MCP verification example two">
                <img src="{{ '/assets/images/Rosetta-ProperResponse2.png' | relative_url }}" alt="MCP verification example two">
                <span>MCP example 2</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="qs-step">
        <div class="qs-step-indicator">
          <span class="qs-step-num">3</span>
          <span class="qs-step-line"></span>
        </div>
        <div class="qs-step-body">
          <h3 class="qs-step-title">Initialize The Repository</h3>
          <p class="qs-step-desc">Run once per repository and commit the generated workspace files.</p>
          <div class="qs-code-wrap">
            <p style="margin:0 0 .25rem;font-size:.85rem;opacity:.7;">Greenfield:</p>
            <pre class="qs-code">Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ...</pre>
            <p style="margin:.5rem 0 .25rem;font-size:.85rem;opacity:.7;">Brownfield:</p>
            <pre class="qs-code">Initialize this repository using the respective Rosetta workflow[, this is a composite workspace][, additional information]</pre>
          </div>
          <p class="qs-step-desc" style="margin-top:.8rem;">The agent analyzes the tech stack, creates workspace docs such as <code>TECHSTACK.md</code>, <code>CODEMAP.md</code>, <code>DEPENDENCIES.md</code>, <code>ARCHITECTURE.md</code>, and <code>CONTEXT.md</code>, and asks clarifying questions. Deep links: <a href="{{ '/docs/quickstart/' | relative_url }}">Quick Start</a>, <a href="{{ '/docs/init-workspace-flow/' | relative_url }}">Init Workspace Flow</a>.</p>
        </div>
      </div>

      <!-- Step 4 -->
      <div class="qs-step">
        <div class="qs-step-indicator">
          <span class="qs-step-num">4</span>
          <span class="qs-step-line"></span>
        </div>
        <div class="qs-step-body">
          <h3 class="qs-step-title">Configure The Workspace</h3>
          <p class="qs-step-desc">After initialization, set up the workspace context so agents have the right business and technical grounding: business context, architecture details, reference source, reusable patterns, useful CLIs and MCPs, and modernization-specific setup when relevant. Deep link: <a href="{{ '/docs/configuration/' | relative_url }}">Configuration</a>.</p>
        </div>
      </div>

      <!-- Step 5 -->
      <div class="qs-step qs-step--last">
        <div class="qs-step-indicator">
          <span class="qs-step-num">5</span>
        </div>
        <div class="qs-step-body">
          <h3 class="qs-step-title">Start With A Workflow</h3>
          <p class="qs-step-desc">Ask for the outcome you need. Rosetta routes the task through the matching workflow. Deep link: <a href="{{ '/docs/usage-guide/#workflows' | relative_url }}">Usage Guide workflows</a>.</p>
          <div class="qs-code-wrap">
            <pre class="qs-code">/coding-flow Implement side bar on the home page, ...
/requirements-authoring-flow extract detailed requirements from ...
/modernization-flow Perform modernization phase 1 to reuse library refsrc/...</pre>
          </div>
        </div>
      </div>

    </div>

    <div class="qs-success">
      <span class="qs-success-icon">&#10003;</span>
      <div class="qs-success-body">
        <strong>You're set. Rosetta is active.</strong>
        <span>Use slash commands to invoke workflows — the workflow guides AI and you along the way.</span>
      </div>
      <a href="{{ '/docs/usage-guide/' | relative_url }}" class="qs-success-link">See all workflows →</a>
    </div>
  </div>
</section>

<script>
(function() {
  // IDE tabs (Step 1)
  document.querySelectorAll('.qs-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.qs-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      document.querySelectorAll('.qs-content').forEach(function(c) {
        c.classList.toggle('active', c.dataset.tabContent === tab.dataset.tab);
      });
      document.querySelectorAll('.qs-mode-content').forEach(function(c) {
        c.classList.toggle('active', c.dataset.modeContent === tab.dataset.mode);
      });
    });
  });
  document.querySelectorAll('.qs-copy').forEach(function(btn) {
    btn.addEventListener('click', function() {
      navigator.clipboard.writeText(btn.dataset.copy).then(function() {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = orig; }, 1500);
      });
    });
  });
  document.querySelectorAll('.qs-shot').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var overlay = document.createElement('div');
      overlay.className = 'qs-shot-modal';
      overlay.innerHTML = '<button type="button" class="qs-shot-close" aria-label="Close expanded screenshot">&times;</button><img src="' + btn.dataset.full + '" alt="">';
      document.body.appendChild(overlay);
      function close() {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
      }
      function onKey(e) {
        if (e.key === 'Escape') close();
      }
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay || e.target.className === 'qs-shot-close') close();
      });
      document.addEventListener('keydown', onKey);
      overlay.querySelector('.qs-shot-close').focus();
    });
  });
})();
</script>

<div class="qs-note" style="margin-bottom:2.2rem">
  Agent-agnostic by design. Use frontier-class models (<strong>Claude Sonnet 4.6</strong>, <strong>GPT-5.4-medium</strong>, <strong>Gemini 3.1 Pro</strong>) or better for best results.
</div>

<!-- ===== WITHOUT vs WITH ROSETTA ===== -->
<section class="section">
  <h2 class="with-marker">Without Rosetta vs With Rosetta</h2>
  <p class="section-subtitle">Real enterprise cases. Same task — different results.</p>

  <div class="vs-grid">
    <!-- Case 1: Cross-database migration -->
    <div class="vs-card vs-card--without">
      <div class="vs-label">Without Rosetta</div>
      <div class="vs-prompt">"Implement data changes from an Excel spec across two interconnected databases."</div>
      <ul class="vs-list">
        <li>Started writing queries without understanding the full picture</li>
        <li>Missed cross-schema relationships and dependent services</li>
        <li>Ignored stored procedures, triggers, and legacy integrations</li>
        <li>Produced partial SQL that would break downstream on deploy</li>
      </ul>
      <div class="vs-result vs-result--bad">Broken deploy. Hours of manual debugging.</div>
    </div>
    <div class="vs-card vs-card--with">
      <div class="vs-label">With Rosetta</div>
      <div class="vs-prompt">"Implement data changes from an Excel spec across two interconnected databases."</div>
      <ul class="vs-list">
        <li>Loaded both database schemas and mapped every relationship</li>
        <li>Identified all services and APIs depending on affected tables</li>
        <li>Found missing fields and web services that needed updates</li>
        <li>Discovered additional connections hidden in legacy COBOL code</li>
        <li>Assembled full end-to-end implementation with all dependencies resolved</li>
      </ul>
      <div class="vs-result vs-result--good">Complete implementation. Nothing missed — even legacy connections.</div>
    </div>

    <!-- Case 2: C++ modernization -->
    <div class="vs-card vs-card--without">
      <div class="vs-label">Without Rosetta</div>
      <div class="vs-prompt">"Modernize this C++ service with Windows components into a new architecture."</div>
      <ul class="vs-list">
        <li>Scanned a few files and suggested a generic rewrite</li>
        <li>Missed Windows-specific dependencies and COM components</li>
        <li>Couldn't determine what to reuse vs replace</li>
        <li>Produced a vague spec — team still had to reverse-engineer the original</li>
      </ul>
      <div class="vs-result vs-result--bad">Spec full of gaps. Team starts over manually.</div>
    </div>
    <div class="vs-card vs-card--with">
      <div class="vs-label">With Rosetta</div>
      <div class="vs-prompt">"Modernize this C++ service with Windows components into a new architecture."</div>
      <ul class="vs-list">
        <li>Systematically analyzed every class, method, and dependency</li>
        <li>Mapped Windows components, libraries, and service boundaries</li>
        <li>Determined what to reuse, what to replace, and what to drop</li>
        <li>Created a target spec with interfaces, edge cases, and architecture decisions</li>
        <li>Spec so precise that developers could ask AI follow-ups and get exact answers</li>
      </ul>
      <div class="vs-result vs-result--good">Production-ready spec. Team moved straight to implementation.</div>
    </div>

    <!-- Case 3: Cross-team feature -->
    <div class="vs-card vs-card--without">
      <div class="vs-label">Without Rosetta</div>
      <div class="vs-prompt">"Add discount code support to checkout — requires changes across API gateway, pricing service, and order service."</div>
      <ul class="vs-list">
        <li>Agent modified the pricing service without seeing the API gateway contract</li>
        <li>Broke the order service integration — different payload format expected</li>
        <li>No awareness of shared validation rules or error handling conventions</li>
        <li>Each service fixed separately, introducing new inconsistencies</li>
      </ul>
      <div class="vs-result vs-result--bad">Three services out of sync. Integration tests failing for days.</div>
    </div>
    <div class="vs-card vs-card--with">
      <div class="vs-label">With Rosetta</div>
      <div class="vs-prompt">"Add discount code support to checkout — requires changes across API gateway, pricing service, and order service."</div>
      <ul class="vs-list">
        <li>Rosetta loaded architecture, API contracts, and shared schemas across all three services</li>
        <li>Agent produced a coordinated spec covering gateway routing, pricing logic, and order updates</li>
        <li>Validation rules and error handling followed existing patterns automatically</li>
        <li>Changes reviewed as a single coherent plan before any code was written</li>
      </ul>
      <div class="vs-result vs-result--good">All three services updated in sync. Integration tests green on first run.</div>
    </div>
  </div>
</section>

<script>
(function(){
  // Only activate splash on home page (works with baseurl like /rosetta/)
  var path = window.location.pathname.replace(/\/+$/, '') || '/';
  var base = (document.querySelector('base') || {}).href || '';
  var baseUrl = '{{ site.baseurl }}'.replace(/\/+$/, '') || '';
  if (path !== baseUrl && path !== baseUrl + '/index.html' && path !== '/' && path !== '/index.html') return;

  // Skip splash if navigated via anchor or returning from another page
  if (window.location.hash) return;
  var seen = sessionStorage.getItem('rosetta-splash-seen');
  if (seen) return;

  document.body.classList.add('is-splash');

  // Mark splash as seen when ANY hero button is clicked
  document.querySelectorAll('.hero-actions a').forEach(function(btn) {
    btn.addEventListener('click', function() {
      sessionStorage.setItem('rosetta-splash-seen', '1');
    });
  });

  var getStartedBtn = document.querySelector('.hero-actions .button');
  if (!getStartedBtn) return;

  getStartedBtn.addEventListener('click', function(e) {
    e.preventDefault();
    document.body.classList.remove('is-splash');
    document.body.classList.add('splash-exiting');

    setTimeout(function() {
      document.body.classList.remove('splash-exiting');
      var target = document.getElementById('hero');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }, 650);
  });
})();
</script>

<script>
(function(){
  function init(drawerScenarios) {

  var sidebar = document.getElementById('try-inline-scenarios');
  var chatEl = document.getElementById('try-inline-chat');
  if (!sidebar || !chatEl) return;

  var proTeaserLimit = 2;
  var activeIdx = -1;
  var playSession = 0; /* cancellation token for timeouts */

  /* Build cards */
  drawerScenarios.forEach(function(s, idx) {
    var card = document.createElement('div');
    card.className = 'try-inline-card';
    card.dataset.idx = idx;
    card.dataset.paid = s.paid ? '1' : '0';
    var badge = '';
    card.innerHTML = '<div class="try-inline-card-row"><span class="try-inline-card-tag">' + s.tag + '</span>' + badge + '</div>' + s.title;
    card.addEventListener('click', function() { playInline(idx); });
    sidebar.appendChild(card);
  });

  /* Tab switching */
  var tabs = document.querySelectorAll('.try-inline-tab');
  var chatHeader = document.querySelector('.try-inline-chat-header');
  function filterCards(filter) {
    sidebar.querySelectorAll('.try-inline-card').forEach(function(c) {
      c.style.display = '';
    });
    if (chatHeader) {
      chatHeader.textContent = 'Rosetta analyzing your request\u2026';
    }
    sidebar.querySelectorAll('.try-inline-card-tier').forEach(function(t) {
      t.style.display = 'none';
    });
  }
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      filterCards(tab.dataset.filter);
    });
  });
  filterCards('all');

  function playInline(idx) {
    activeIdx = idx;
    var session = ++playSession; /* new session invalidates all previous timeouts */

    sidebar.querySelectorAll('.try-inline-card').forEach(function(c) { c.classList.remove('is-active'); });
    sidebar.querySelector('[data-idx="' + idx + '"]').classList.add('is-active');

    var s = drawerScenarios[idx];
    chatEl.innerHTML = '';

    var delay = 0;
    s.messages.forEach(function(msg, mi) {
      if (s.paid && msg.role === 'cta') return;
      delay += mi === 0 ? 300 : 1200;

      if (s.paid && mi === proTeaserLimit) {
        setTimeout(function() {
          if (session !== playSession) return;
          var typing = chatEl.querySelector('.try-typing');
          if (typing) typing.remove();
          var blurWrap = document.createElement('div');
          blurWrap.className = 'try-pro-blur-wrap';
          for (var bi = proTeaserLimit; bi < s.messages.length; bi++) {
            if (s.messages[bi].role === 'cta') continue;
            var blurMsg = document.createElement('div');
            blurMsg.className = 'try-msg try-msg--' + s.messages[bi].role + ' try-msg--blurred';
            blurMsg.innerHTML = s.messages[bi].text;
            blurWrap.appendChild(blurMsg);
          }
          var unlock = document.createElement('div');
          unlock.className = 'try-pro-unlock';
          unlock.innerHTML = '<div class="try-pro-unlock-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div><h4>Unlock full workflow</h4><p>See how Rosetta handles this end\u2011to\u2011end with your codebase context.</p><a href="mailto:rosetta-support@griddynamics.com" class="try-pro-unlock-btn">Contact Us \u2192</a>';
          blurWrap.appendChild(unlock);
          chatEl.appendChild(blurWrap);
          chatEl.scrollTop = chatEl.scrollHeight;
        }, delay);
        return;
      }
      if (s.paid && mi > proTeaserLimit) return;

      setTimeout(function() {
        if (session !== playSession) return;
        var typing = chatEl.querySelector('.try-typing');
        if (typing) typing.remove();
        var el = document.createElement('div');
        if (msg.role === 'cta') {
          el.className = 'try-msg try-msg--cta';
          el.innerHTML = '<a href="#quick-start">Ready to try it yourself? \u2192 Get Started</a>';
        } else {
          el.className = 'try-msg try-msg--' + msg.role;
          el.innerHTML = msg.text;
        }
        chatEl.appendChild(el);
        chatEl.scrollTop = chatEl.scrollHeight;

        var nextIdx = mi + 1;
        var showTyping = (!s.paid && nextIdx < s.messages.length && s.messages[nextIdx].role !== 'cta') ||
          (s.paid && nextIdx <= proTeaserLimit && nextIdx < s.messages.length);
        if (showTyping) {
          setTimeout(function() {
            if (session !== playSession) return;
            var dots = document.createElement('div');
            dots.className = 'try-typing';
            dots.innerHTML = '<span></span><span></span><span></span>';
            chatEl.appendChild(dots);
            chatEl.scrollTop = chatEl.scrollHeight;
          }, 400);
        }
      }, delay);
    });
  }

  /* Auto-play first free scenario when section enters viewport */
  var trySection = document.getElementById('try-rosetta-section');
  if (trySection) {
    var autoObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && activeIdx === -1) {
          var firstCard = sidebar.querySelector('.try-inline-card');
          if (firstCard) playInline(parseInt(firstCard.dataset.idx));
          autoObserver.unobserve(trySection);
        }
      });
    }, { threshold: 0.3 });
    autoObserver.observe(trySection);
  }

  /* Hide FAB on homepage */
  var fab = document.getElementById('try-fab');
  if (fab) fab.style.display = 'none';
  }

  /* Data may arrive before or after this script */
  if (window.__tryRosettaScenarios) {
    init(window.__tryRosettaScenarios);
  } else {
    document.addEventListener('tryRosettaReady', function() {
      init(window.__tryRosettaScenarios);
    });
  }
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
