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

<!-- ===== THE PROBLEM IN 2026 ===== -->
<section class="section">
  <h2 class="with-marker">The Problem in 2026</h2>
  <p class="section-subtitle">AI coding agents are everywhere. Consistency and context are not.</p>

  <div class="hiw-grid">
    <div class="hiw-item">
      <div class="hiw-num">1</div>
      <h3>Agent Drift</h3>
      <p>Every developer gets different AI behavior. No shared standards, no consistency across sessions or teammates.</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">2</div>
      <h3>Multi-IDE Fragmentation</h3>
      <p>Cursor, Claude Code, Copilot, Codex, Windsurf. Each has its own config. Context doesn't transfer.</p>
    </div>
    <div class="hiw-item">
      <div class="hiw-num">3</div>
      <h3>Hallucinations Without Context</h3>
      <p>Agents guess architecture, invent APIs, ignore conventions. Without project context loaded first, output is unreliable.</p>
    </div>
  </div>

  <div class="note">
    <strong>Rosetta solves this.</strong> One control plane that gives every agent the same context, standards, and workflows — across any IDE. <a href="#try-rosetta-section">See how it works →</a>
  </div>
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
      <div class="qs-step qs-step--large">
        <div class="qs-step-indicator">
          <span class="qs-step-num">1</span>
          <span class="qs-step-line"></span>
        </div>
        <div class="qs-step-body">
          <h3 class="qs-step-title">Add Rosetta MCP to your IDE</h3>
          <p class="qs-step-desc">Pick your editor. No local install needed — Rosetta connects over HTTP.</p>

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
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"mcpServers":{"Rosetta":{"url":"https://rosetta.evergreen.gcp.griddynamics.net/mcp"}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: Claude Code -->
          <div class="qs-content" id="qs-claude">
            <p class="qs-content-hint">Run this command in your terminal:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-prompt">$</span> claude mcp add --transport http Rosetta \
    https://rosetta.evergreen.gcp.griddynamics.net/mcp</pre>
              <button class="qs-copy" data-copy="claude mcp add --transport http Rosetta https://rosetta.evergreen.gcp.griddynamics.net/mcp">Copy</button>
            </div>
          </div>

          <!-- Tab: Codex -->
          <div class="qs-content" id="qs-codex">
            <p class="qs-content-hint">Run these commands in your terminal:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code"><span class="qs-prompt">$</span> codex mcp add Rosetta \
    --url https://rosetta.evergreen.gcp.griddynamics.net/mcp
<span class="qs-prompt">$</span> codex mcp login Rosetta</pre>
              <button class="qs-copy" data-copy="codex mcp add Rosetta --url https://rosetta.evergreen.gcp.griddynamics.net/mcp">Copy</button>
            </div>
          </div>

          <!-- Tab: VS Code / GitHub Copilot -->
          <div class="qs-content" id="qs-vscode">
            <p class="qs-content-hint">Add to <code>.vscode/mcp.json</code> or <code>~/.mcp.json</code>:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "servers": {
    "Rosetta": {
      "type": "http",
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"servers":{"Rosetta":{"type":"http","url":"https://rosetta.evergreen.gcp.griddynamics.net/mcp"}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: GitHub Copilot (JetBrains) -->
          <div class="qs-content" id="qs-copilot-jetbrains">
            <p class="qs-content-hint">Go to <code>Settings → Tools → GitHub Copilot → MCP Settings</code>, add to <code>~/.config/github-copilot/intellij/mcp.json</code>:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "servers": {
    "Rosetta": {
      "type": "http",
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"servers":{"Rosetta":{"type":"http","url":"https://rosetta.evergreen.gcp.griddynamics.net/mcp"}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: JetBrains Junie -->
          <div class="qs-content" id="qs-junie">
            <p class="qs-content-hint">Go to <code>Settings → Tools → Junie → MCP Settings → + Add → As JSON</code>:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcpServers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"mcpServers":{"Rosetta":{"url":"https://rosetta.evergreen.gcp.griddynamics.net/mcp"}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: Antigravity -->
          <div class="qs-content" id="qs-antigravity">
            <p class="qs-content-hint">Add to your Antigravity MCP config file:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcpServers": {
    "Rosetta": {
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp"
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"mcpServers":{"Rosetta":{"url":"https://rosetta.evergreen.gcp.griddynamics.net/mcp"}}}'>Copy</button>
            </div>
          </div>

          <!-- Tab: OpenCode -->
          <div class="qs-content" id="qs-opencode">
            <p class="qs-content-hint">Add to your <code>opencode.json</code> file:</p>
            <div class="qs-code-wrap">
              <pre class="qs-code">{
  "mcp": {
    "Rosetta": {
      "type": "http",
      "url": "https://rosetta.evergreen.gcp.griddynamics.net/mcp",
      "enabled": true
    }
  }
}</pre>
              <button class="qs-copy" data-copy='{"mcp":{"Rosetta":{"type":"http","url":"https://rosetta.evergreen.gcp.griddynamics.net/mcp","enabled":true}}}'>Copy</button>
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
          <h3 class="qs-step-title">Complete OAuth</h3>
          <p class="qs-step-desc">Your IDE will open a browser window to authenticate. Complete the OAuth flow when prompted.</p>
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
  // IDE tabs (Step 1)
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
  Agent-agnostic by design. Use frontier-class models (<strong>Claude Sonnet/Opus</strong>, <strong>GPT-4o+</strong>, <strong>Gemini Pro</strong>) for best results.
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

