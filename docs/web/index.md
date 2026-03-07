---
layout: default
title: Home
permalink: /
---

<!-- ===== HERO ===== -->
<section class="hero-main">
  <img src="{{ '/assets/brand/rosetta-logo-full-color-white-text.png' | relative_url }}" alt="Rosetta logo" class="hero-logo logo-dark">
  <img src="{{ '/assets/brand/rosetta-logo-full-color-black-text.png' | relative_url }}" alt="Rosetta logo" class="hero-logo logo-light">
  <h1 class="hero-headline">Make your AI actually understand your project.</h1>
  <p class="hero-sub">No guessing. No hallucinations. Just your code, your standards, your way.</p>
  <div class="hero-actions">
    <a href="#quick-start" class="button">Get Started</a>
    <a href="{{ '/overview/' | relative_url }}" class="button-ghost">Learn More</a>
    <a href="https://github.com/griddynamics/rosetta" class="button-ghost" target="_blank" rel="noopener noreferrer">GitHub</a>
  </div>
  <div class="splash-copyright">&copy; {{ 'now' | date: '%Y' }} Grid Dynamics. All rights reserved.</div>
</section>

<!-- ===== GET STARTED ===== -->
<section class="section" id="quick-start">
  <div class="qs-panel">
    <h2 class="with-marker">Get Started</h2>

    <div class="qs-stepper">

      <!-- Step 1 -->
      <div class="qs-step">
        <div class="qs-step-indicator">
          <span class="qs-step-num">1</span>
          <span class="qs-step-line"></span>
        </div>
        <div class="qs-step-body">
          <h3 class="qs-step-title">Install uv</h3>
          <p class="qs-step-desc">Fast Python package runner. Required for the MCP server.</p>

          <div class="qs-os-tabs" role="tablist">
            <button class="qs-os-tab active" data-os="mac" role="tab">macOS</button>
            <button class="qs-os-tab" data-os="linux" role="tab">Linux / WSL</button>
            <button class="qs-os-tab" data-os="win" role="tab">Windows</button>
          </div>

          <div class="qs-os-content active" id="qs-os-mac">
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-prompt">$</span> brew install uv</pre>
              <button class="qs-copy" data-copy="brew install uv">Copy</button>
            </div>
          </div>
          <div class="qs-os-content" id="qs-os-linux">
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-prompt">$</span> curl -LsSf https://astral.sh/uv/install.sh | sh</pre>
              <button class="qs-copy" data-copy="curl -LsSf https://astral.sh/uv/install.sh | sh">Copy</button>
            </div>
          </div>
          <div class="qs-os-content" id="qs-os-win">
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-prompt">&gt;</span> winget install --id=astral-sh.uv -e</pre>
              <button class="qs-copy" data-copy="winget install --id=astral-sh.uv -e">Copy</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="qs-step qs-step--large">
        <div class="qs-step-indicator">
          <span class="qs-step-num">2</span>
          <span class="qs-step-line"></span>
        </div>
        <div class="qs-step-body">
          <h3 class="qs-step-title">Install Rosetta MCP in your IDE</h3>
          <p class="qs-step-desc">Pick your editor and follow the instructions below.</p>

          <div class="qs-tabs-scroll">
            <div class="qs-tabs" role="tablist">
              <button class="qs-tab active" data-tab="cursor" role="tab">Cursor / Windsurf</button>
              <button class="qs-tab" data-tab="claude" role="tab">Claude Code</button>
              <button class="qs-tab" data-tab="codex" role="tab">Codex</button>
              <button class="qs-tab" data-tab="vscode" role="tab">VS Code / GitHub Copilot</button>
              <button class="qs-tab" data-tab="copilot-jetbrains" role="tab">GitHub Copilot (JetBrains)</button>
              <button class="qs-tab" data-tab="junie" role="tab">JetBrains Junie</button>
              <button class="qs-tab" data-tab="antigravity" role="tab">Antigravity</button>
              <button class="qs-tab" data-tab="opencode" role="tab">OpenCode</button>
            </div>
          </div>

          <!-- Tab: Cursor / Windsurf -->
          <div class="qs-content active" id="qs-cursor">
            <p class="qs-content-hint"><strong>Cursor:</strong> <code>Settings → Cursor Settings → MCP → Add new global MCP server</code> or paste into <code>~/.cursor/mcp.json</code><br><strong>Windsurf:</strong> add via MCP settings in IDE</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcpServers": {
    "KnowledgeBase": {
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "R2R_API_BASE": "https://your-r2r-instance.example.com/",
        "R2R_COLLECTION": "your-collection",
        "R2R_EMAIL": "your-email@example.com",
        "R2R_PASSWORD": "your-password"
      }
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"mcpServers":{"KnowledgeBase":{"command":"uvx","args":["ims-mcp@latest"],"env":{"R2R_API_BASE":"https://your-r2r-instance.example.com/","R2R_COLLECTION":"your-collection","R2R_EMAIL":"your-email@example.com","R2R_PASSWORD":"your-password"}}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: Claude Code -->
          <div class="qs-content" id="qs-claude">
            <p class="qs-content-hint">Run this command in your terminal:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-prompt">$</span> claude mcp add --transport stdio KnowledgeBase \
    --env R2R_API_BASE=https://your-r2r-instance.example.com/ \
    --env R2R_COLLECTION=your-collection \
    --env R2R_EMAIL=your-email@example.com \
    --env R2R_PASSWORD=your-password \
    -- uvx ims-mcp@latest</pre>
              <button class="qs-copy" data-copy="claude mcp add --transport stdio KnowledgeBase --env R2R_API_BASE=https://your-r2r-instance.example.com/ --env R2R_COLLECTION=your-collection --env R2R_EMAIL=your-email@example.com --env R2R_PASSWORD=your-password -- uvx ims-mcp@latest">Copy</button>
            </div>
          </div>

          <!-- Tab: Codex -->
          <div class="qs-content" id="qs-codex">
            <p class="qs-content-hint">Run this command in your terminal:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-prompt">$</span> codex mcp add KnowledgeBase \
    --env R2R_API_BASE=https://your-r2r-instance.example.com/ \
    --env R2R_COLLECTION=your-collection \
    --env R2R_EMAIL=your-email@example.com \
    --env R2R_PASSWORD=your-password \
    -- uvx ims-mcp@latest</pre>
              <button class="qs-copy" data-copy="codex mcp add KnowledgeBase --env R2R_API_BASE=https://your-r2r-instance.example.com/ --env R2R_COLLECTION=your-collection --env R2R_EMAIL=your-email@example.com --env R2R_PASSWORD=your-password -- uvx ims-mcp@latest">Copy</button>
            </div>
          </div>

          <!-- Tab: VS Code / GitHub Copilot -->
          <div class="qs-content" id="qs-vscode">
            <p class="qs-content-hint">Add to <code>.vscode/mcp.json</code> or <code>~/.mcp.json</code>:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "servers": {
    "KnowledgeBase": {
      "type": "stdio",
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "R2R_API_BASE": "https://your-r2r-instance.example.com/",
        "R2R_COLLECTION": "your-collection",
        "R2R_EMAIL": "your-email@example.com",
        "R2R_PASSWORD": "your-password"
      }
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"servers":{"KnowledgeBase":{"type":"stdio","command":"uvx","args":["ims-mcp@latest"],"env":{"R2R_API_BASE":"https://your-r2r-instance.example.com/","R2R_COLLECTION":"your-collection","R2R_EMAIL":"your-email@example.com","R2R_PASSWORD":"your-password"}}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: GitHub Copilot (JetBrains) -->
          <div class="qs-content" id="qs-copilot-jetbrains">
            <p class="qs-content-hint">Go to <code>Settings → Tools → GitHub Copilot → MCP Settings</code>, add to <code>~/.config/github-copilot/intellij/mcp.json</code>:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "servers": {
    "KnowledgeBase": {
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "type": "stdio",
      "env": {
        "R2R_API_BASE": "https://your-r2r-instance.example.com/",
        "R2R_COLLECTION": "your-collection",
        "R2R_EMAIL": "your-email@example.com",
        "R2R_PASSWORD": "your-password"
      }
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"servers":{"KnowledgeBase":{"command":"uvx","args":["ims-mcp@latest"],"type":"stdio","env":{"R2R_API_BASE":"https://your-r2r-instance.example.com/","R2R_COLLECTION":"your-collection","R2R_EMAIL":"your-email@example.com","R2R_PASSWORD":"your-password"}}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: JetBrains Junie -->
          <div class="qs-content" id="qs-junie">
            <p class="qs-content-hint">Go to <code>Settings → Tools → Junie → MCP Settings → + Add → As JSON</code>:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcpServers": {
    "KnowledgeBase": {
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "R2R_API_BASE": "https://your-r2r-instance.example.com/",
        "R2R_COLLECTION": "your-collection",
        "R2R_EMAIL": "your-email@example.com",
        "R2R_PASSWORD": "your-password"
      }
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"mcpServers":{"KnowledgeBase":{"command":"uvx","args":["ims-mcp@latest"],"env":{"R2R_API_BASE":"https://your-r2r-instance.example.com/","R2R_COLLECTION":"your-collection","R2R_EMAIL":"your-email@example.com","R2R_PASSWORD":"your-password"}}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: Antigravity -->
          <div class="qs-content" id="qs-antigravity">
            <p class="qs-content-hint">Add to your Antigravity MCP config file:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcpServers": {
    "KnowledgeBase": {
      "command": "uvx",
      "args": ["ims-mcp@latest"],
      "env": {
        "R2R_API_BASE": "https://your-r2r-instance.example.com/",
        "R2R_COLLECTION": "your-collection",
        "R2R_EMAIL": "your-email@example.com",
        "R2R_PASSWORD": "your-password"
      }
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"mcpServers":{"KnowledgeBase":{"command":"uvx","args":["ims-mcp@latest"],"env":{"R2R_API_BASE":"https://your-r2r-instance.example.com/","R2R_COLLECTION":"your-collection","R2R_EMAIL":"your-email@example.com","R2R_PASSWORD":"your-password"}}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: OpenCode -->
          <div class="qs-content" id="qs-opencode">
            <p class="qs-content-hint">Add to your <code>opencode.json</code> file:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcp": {
    "KnowledgeBase": {
      "type": "local",
      "command": ["uvx", "ims-mcp@latest"],
      "enabled": true,
      "environment": {
        "R2R_API_BASE": "https://your-r2r-instance.example.com/",
        "R2R_COLLECTION": "your-collection",
        "R2R_EMAIL": "your-email@example.com",
        "R2R_PASSWORD": "your-password"
      }
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"mcp":{"KnowledgeBase":{"type":"local","command":["uvx","ims-mcp@latest"],"enabled":true,"environment":{"R2R_API_BASE":"https://your-r2r-instance.example.com/","R2R_COLLECTION":"your-collection","R2R_EMAIL":"your-email@example.com","R2R_PASSWORD":"your-password"}}}}'>Copy</button>
            </div>
          </div>

        </div>
      </div>

      <!-- Step 3 -->
      <div class="qs-step qs-step--last">
        <div class="qs-step-indicator">
          <span class="qs-step-num qs-step-num--done">&#10003;</span>
        </div>
        <div class="qs-step-body">
          <h3 class="qs-step-title">Initialize &amp; Verify</h3>
          <p class="qs-step-desc">Restart your IDE, then ask your assistant:</p>
          <div class="qs-code-wrap">
            <pre class="qs-code"><span class="qs-comment"># "Initialize this repository using Rosetta"</span></pre>
          </div>
          <p class="qs-step-desc" style="margin-top:.8rem;">Then verify everything works:</p>
          <div class="qs-code-wrap">
            <pre class="qs-code"><span class="qs-comment"># "What can you do, Rosetta?"</span></pre>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>

<script>
(function() {
  // OS tabs (Step 1)
  document.querySelectorAll('.qs-os-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.qs-os-tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.qs-os-content').forEach(function(c) { c.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('qs-os-' + tab.dataset.os).classList.add('active');
    });
  });
  // IDE tabs (Step 2)
  document.querySelectorAll('.qs-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.qs-tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.qs-content').forEach(function(c) { c.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('qs-' + tab.dataset.tab).classList.add('active');
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
})();
</script>

<div class="qs-note">
  Agent-agnostic by design. Use <strong>Sonnet 4.6</strong>, <strong>GPT-5.3-codex-medium</strong>, <strong>gemini-3.1-pro</strong> or better models.
</div>

<!-- ===== PLAIN AI vs ROSETTA ===== -->
<section class="section">
  <h2 class="with-marker">Without Rosetta vs With Rosetta</h2>

  <div class="vs-grid">
    <!-- Example 1: Building a feature -->
    <div class="vs-card vs-card--without">
      <div class="vs-label">Without Rosetta</div>
      <div class="vs-prompt">You: "Add password reset functionality"</div>
      <ul class="vs-list">
        <li>Searches a few files that look relevant</li>
        <li>Skims without reading the full auth flow</li>
        <li>Writes code based on generic patterns</li>
        <li>Misses services, utilities, and conventions</li>
        <li>No plan, no approval, no tests</li>
      </ul>
      <div class="vs-result vs-result--bad">You spend time fixing the gaps.</div>
    </div>
    <div class="vs-card vs-card--with">
      <div class="vs-label">With Rosetta</div>
      <div class="vs-prompt">You: "Add password reset functionality"</div>
      <ul class="vs-list">
        <li>Reads your auth service, session handling, email integration</li>
        <li>Produces a plan specific to your project</li>
        <li>Waits for your approval before writing a single line</li>
        <li>Implements following your patterns and naming conventions</li>
        <li>Validates the result and writes tests</li>
      </ul>
      <div class="vs-result vs-result--good">Done means actually done.</div>
    </div>

    <!-- Example 2: Understanding code -->
    <div class="vs-card vs-card--without">
      <div class="vs-label">Without Rosetta</div>
      <div class="vs-prompt">You: "Explain how the auth system works"</div>
      <ul class="vs-list">
        <li>Searches files with "auth" in the name</li>
        <li>Reads a couple of them</li>
        <li>Misses middleware, token utilities, session handling</li>
        <li>Fills gaps with generic assumptions</li>
      </ul>
      <div class="vs-result vs-result--bad">Partial picture presented as complete.</div>
    </div>
    <div class="vs-card vs-card--with">
      <div class="vs-label">With Rosetta</div>
      <div class="vs-prompt">You: "Explain how the auth system works"</div>
      <ul class="vs-list">
        <li>Locates all auth-related files systematically</li>
        <li>Traces the real login flow through your actual code</li>
        <li>Produces a Mermaid diagram of your actual flow</li>
        <li>Saves analysis to docs/ — reusable, not a lost chat message</li>
      </ul>
      <div class="vs-result vs-result--good">Full picture. Nothing missed.</div>
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

  var getStartedBtn = document.querySelector('.hero-actions .button');
  if (!getStartedBtn) return;

  getStartedBtn.addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.setItem('rosetta-splash-seen', '1');
    document.body.classList.remove('is-splash');
    document.body.classList.add('splash-exiting');

    setTimeout(function() {
      document.body.classList.remove('splash-exiting');
      var target = document.getElementById('quick-start');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }, 650);
  });
})();
</script>

