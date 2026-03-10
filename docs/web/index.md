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
    <a href="#try-rosetta-section" class="button">Get Started</a>
    <a href="{{ '/overview/' | relative_url }}" class="button-ghost">Learn More</a>
    <a href="https://github.com/griddynamics/rosetta" class="button-ghost" target="_blank" rel="noopener noreferrer">GitHub</a>
  </div>
  <div class="splash-copyright">&copy; {{ 'now' | date: '%Y' }} Grid Dynamics. All rights reserved.</div>
</section>

<!-- ===== TRY ROSETTA (INLINE) ===== -->
<section class="section" id="try-rosetta-section">
  <h2 class="with-marker">Try Rosetta</h2>
  <p class="section-subtitle">Pick a scenario and see how Rosetta handles it step by step.</p>

  <div class="try-inline">
    <div class="try-inline-sidebar">
      <div class="try-inline-tabs">
        <button class="try-inline-tab is-active" data-filter="free">Free</button>
        <button class="try-inline-tab" data-filter="pro">Pro</button>
      </div>
      <div class="try-inline-list" id="try-inline-scenarios"></div>
    </div>
    <div class="try-inline-chat" id="try-inline-chat">
      <div class="try-inline-placeholder">
        <img src="{{ '/assets/brand/rosetta-favicon.png' | relative_url }}" alt="Rosetta" style="width:56px;height:56px;opacity:.6;">
        <p>Select a scenario to start the demo</p>
      </div>
    </div>
  </div>
</section>

<!-- ===== GET STARTED ===== -->
<section class="section" id="quick-start">
  <h2 class="with-marker">Get Started</h2>
  <p class="section-subtitle">Three steps to connect Rosetta to your IDE and start coding smarter.</p>
  <div class="qs-panel">

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

<!-- ===== REAL-WORLD CASES ===== -->
<section class="section" id="real-world">
  <h2 class="with-marker">Real-World Results</h2>
  <p class="section-subtitle">How teams solved complex enterprise problems — plain AI vs Rosetta.</p>

  <div class="cases">

    <!-- Case 1 -->
    <div class="case">
      <div class="case-tag">Enterprise Data Migration</div>

      <div class="case-step case-step--challenge">
        <div class="case-step-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <div class="case-step-line"></div>
        <div class="case-step-body">
          <div class="case-step-label">Challenge</div>
          <p>Implement data changes from an Excel spec across two interconnected databases — with dozens of dependent services, stored procedures, and legacy code.</p>
        </div>
      </div>

      <div class="case-step case-step--fail">
        <div class="case-step-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        </div>
        <div class="case-step-line"></div>
        <div class="case-step-body">
          <div class="case-step-label">Plain AI</div>
          <ul>
            <li>Started writing queries without understanding the full picture</li>
            <li>Missed cross-schema relationships and dependent services</li>
            <li>Ignored stored procedures, triggers, and legacy integrations</li>
            <li>Produced partial SQL that would break downstream on deploy</li>
          </ul>
          <div class="case-step-verdict case-step-verdict--bad">Broken deploy. Hours of manual debugging.</div>
        </div>
      </div>

      <div class="case-step case-step--win">
        <div class="case-step-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
        </div>
        <div class="case-step-line"></div>
        <div class="case-step-body">
          <div class="case-step-label">With Rosetta</div>
          <ul>
            <li>Loaded both database schemas and mapped every relationship</li>
            <li>Identified all services and APIs depending on affected tables</li>
            <li>Found missing fields and web services that needed updates</li>
            <li>Discovered additional connections hidden in legacy COBOL code</li>
          </ul>
        </div>
      </div>

      <div class="case-step case-step--result">
        <div class="case-step-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div class="case-step-body">
          <div class="case-step-label">Result</div>
          <p class="case-result-text">Complete end-to-end implementation. Nothing missed — even legacy connections.</p>
        </div>
      </div>
    </div>

    <!-- Case 2 -->
    <div class="case">
      <div class="case-tag">Legacy Modernization</div>

      <div class="case-step case-step--challenge">
        <div class="case-step-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <div class="case-step-line"></div>
        <div class="case-step-body">
          <div class="case-step-label">Challenge</div>
          <p>Modernize a C++ service with Windows components and multiple dependencies into a new architecture — while preserving all business logic and edge cases.</p>
        </div>
      </div>

      <div class="case-step case-step--fail">
        <div class="case-step-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        </div>
        <div class="case-step-line"></div>
        <div class="case-step-body">
          <div class="case-step-label">Plain AI</div>
          <ul>
            <li>Scanned a few files and suggested a generic rewrite</li>
            <li>Missed Windows-specific dependencies and COM components</li>
            <li>Couldn't determine what to reuse vs replace</li>
            <li>Produced a vague spec — team still had to reverse-engineer the original</li>
          </ul>
          <div class="case-step-verdict case-step-verdict--bad">Spec full of gaps. Team starts over manually.</div>
        </div>
      </div>

      <div class="case-step case-step--win">
        <div class="case-step-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
        </div>
        <div class="case-step-line"></div>
        <div class="case-step-body">
          <div class="case-step-label">With Rosetta</div>
          <ul>
            <li>Systematically analyzed every class, method, and dependency</li>
            <li>Mapped Windows components, libraries, and service boundaries</li>
            <li>Created a target spec with interfaces, edge cases, and architecture decisions</li>
            <li>Spec so precise that developers could ask AI follow-ups and get exact answers</li>
          </ul>
        </div>
      </div>

      <div class="case-step case-step--result">
        <div class="case-step-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div class="case-step-body">
          <div class="case-step-label">Result</div>
          <p class="case-result-text">Production-ready spec. Team moved straight to implementation.</p>
        </div>
      </div>
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
      var target = document.getElementById('try-rosetta-section');
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
    card.innerHTML = '<span class="try-inline-card-tag">' + s.tag + '</span>' + s.title;
    card.addEventListener('click', function() { playInline(idx); });
    sidebar.appendChild(card);
  });

  /* Tab switching */
  var tabs = document.querySelectorAll('.try-inline-tab');
  function filterCards(filter) {
    var isPro = filter === 'pro';
    sidebar.querySelectorAll('.try-inline-card').forEach(function(c) {
      c.style.display = (c.dataset.paid === (isPro ? '1' : '0')) ? '' : 'none';
    });
  }
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      filterCards(tab.dataset.filter);
    });
  });
  filterCards('free');

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

