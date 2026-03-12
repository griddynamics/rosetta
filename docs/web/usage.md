---
layout: default
title: Usage
permalink: /usage/
---

<section class="hero">
  <h1>Usage Guide</h1>
  <p>How to work with Rosetta in day-to-day development. Describe what you need — Rosetta handles classification, context loading, and execution.</p>
</section>

<!-- ===== REQUEST LIFECYCLE ===== -->
<section class="section">
  <h2 class="with-marker">Request Lifecycle</h2>
  <p class="section-subtitle">No special syntax. No commands to memorize.</p>

  <div class="workflow-schema">
    <div class="workflow-step">
      <div class="workflow-num workflow-num--circle">1</div>
      <div class="workflow-title">Bootstrap</div>
      <div class="workflow-desc">Agent loads Rosetta's bootstrap rules automatically when your session starts.</div>
    </div>
    <div class="workflow-arrow" aria-hidden="true"></div>
    <div class="workflow-step">
      <div class="workflow-num workflow-num--circle">2</div>
      <div class="workflow-title">Classify</div>
      <div class="workflow-desc">Your request is classified — coding, research, init, and so on — and the matching workflow is selected.</div>
    </div>
    <div class="workflow-arrow" aria-hidden="true"></div>
    <div class="workflow-step">
      <div class="workflow-num workflow-num--circle">3</div>
      <div class="workflow-title">Load</div>
      <div class="workflow-desc">Only the relevant workflow, skills, and guardrails load into context. Nothing unnecessary.</div>
    </div>
    <div class="workflow-arrow" aria-hidden="true"></div>
    <div class="workflow-step">
      <div class="workflow-num workflow-num--circle">4</div>
      <div class="workflow-title">Execute</div>
      <div class="workflow-desc">The agent runs with approval gates, safety constraints, and traceable artifacts.</div>
    </div>
  </div>
</section>

<!-- ===== WORKFLOWS ===== -->
<section class="section">
  <h2 class="with-marker">Workflows</h2>
  <p class="section-subtitle">Rosetta routes your request to the right workflow automatically.</p>

  <div class="wf-list">
    <div class="wf-list-group">
      <div class="try-section-label">Free</div>
      <ul>
        <li><strong>Init Workspace</strong> — Sets up a repository for AI-assisted development. Generates TECHSTACK.md, CODEMAP.md, CONTEXT.md, ARCHITECTURE.md, patterns, and IDE shells.</li>
        <li><strong>Coding</strong> — The main development workflow. Scales with task size — small tasks skip phases. Produces specs, plans, code, reviews, and tests with two approval gates.</li>
        <li><strong>Requirements</strong> — Produces structured, testable, approved requirements in EARS format. Saves to <code>docs/REQUIREMENTS/</code> with a traceability matrix.</li>
        <li><strong>Research</strong> — Deep, project-grounded investigation using meta-prompting. Every claim backed by evidence. You approve the research direction before it runs.</li>
        <li><strong>Ad-hoc</strong> — Adaptive meta-workflow for tasks that don't fit a fixed structure. Builds a custom execution plan from building blocks and adapts mid-execution.</li>
        <li><strong>Self Help</strong> — Answers questions about Rosetta itself. Lists capabilities, explains workflows, and hands off to the real workflow if you decide to act.</li>
      </ul>
    </div>
    <div class="wf-list-group">
      <div class="try-section-label try-section-label--pro">Pro</div>
      <ul>
        <li><strong>Code Analysis</strong> — Systematic understanding of existing codebases. Component identification, pattern analysis, logic flow, sequence diagrams, and dependency mapping.</li>
        <li><strong>Automated QA</strong> — Test automation workflow with approval gate before implementation. Covers strategy, scenario generation, spec, implementation, and coverage reporting.</li>
        <li><strong>Modernization</strong> — Large-scale code conversions, upgrades, and re-architecture. Pattern detection drives consistency across the transformation.</li>
        <li><strong>Test Case Generation</strong> — Generates test cases from Jira tickets and Confluence docs. Includes gap analysis, clarification, and TestRail export.</li>
        <li><strong>External Library</strong> — Onboards private or external libraries for AI understanding. Uses Repomix for analysis and publishes compressed docs to the knowledge base.</li>
        <li><strong>Coding Agents Prompting</strong> — Specialized workflow for authoring and adapting prompts for AI coding agents. Covers design, authoring, hardening, simulation, and validation.</li>
      </ul>
    </div>
  </div>
</section>


<!-- ===== CUSTOMIZATION ===== -->
<section class="section">
  <h2 class="with-marker">Customization</h2>
  <p class="section-subtitle">Custom overrides work in all installation modes. No Rosetta files need to be modified.</p>

  <div class="arch-annotations">
    <div class="arch-anno">
      <h4>CONTEXT.md</h4>
      <p>The <em>why</em> — purpose, business context, design principles, key workflows, constraints. The single most effective way to improve AI output.</p>
    </div>
    <div class="arch-anno">
      <h4>ARCHITECTURE.md</h4>
      <p>The <em>how</em> — system structure, component relationships, data flow, deployment topology. More detail here means fewer follow-up questions.</p>
    </div>
    <div class="arch-anno">
      <h4>TECHSTACK.md</h4>
      <p>The <em>what</em> — technologies, frameworks, tools, and the reasoning behind each choice. Run init to generate all three, then customize.</p>
    </div>
  </div>
</section>

<!-- ===== BEST PRACTICES ===== -->
<section class="section">
  <h2 class="with-marker">Best Practices</h2>

  <div style="display:flex;flex-direction:column;gap:.5rem;max-width:720px">
    <div class="note"><strong>Modernization.</strong> Clone source repositories into a <code>RefSrc/</code> subfolder. Add <code>RefSrc/</code> to <code>.gitignore</code> so reference sources stay out of your repo history.</div>
    <div class="note"><strong>Coding.</strong> Prepare scaffolding and documentation for each component or service before coding starts. Keep a component registry in <code>ARCHITECTURE.md</code> — the agent uses it for navigation and dependency resolution.</div>
    <div class="note"><strong>Big repositories.</strong> Use Registry &amp; Chaining for progressive disclosure: a global context file lists all components, each component has its own detail file. The agent loads only what it needs.</div>
    <div class="note"><strong>Composite workspaces.</strong> One workspace folder, multiple cloned repositories. Initialize each repository separately first, then initialize the workspace and tell the agent it is a composite workspace. The agent can then make changes end-to-end across repos.</div>
  </div>
</section>

<!-- ===== VIDEO TUTORIALS ===== -->
<section class="section">
  <h2 class="with-marker">Video Tutorials</h2>

  <div class="arch-annotations">
    <div class="arch-anno">
      <h4>Setup</h4>
      <p>
        <a href="https://drive.google.com/file/d/16N2h5R_0JYMiE_PhfPVRcaCcH_52_qvG/view?usp=drive_link" target="_blank" rel="noopener noreferrer">Install Using MCP</a> (3 min)<br>
        <a href="https://drive.google.com/file/d/1ClktG-QxZJr3nkCVHJ815ZJ1esp2WI6F/view?usp=drive_link" target="_blank" rel="noopener noreferrer">Install without MCP</a> (2 min)<br>
        <a href="https://drive.google.com/file/d/1BcloxAXzrvdY1Uc5rNF6b_g1MzePLYpn/view?usp=drive_link" target="_blank" rel="noopener noreferrer">Initialize a Repo</a> (4 min)
      </p>
    </div>
    <div class="arch-anno">
      <h4>Workflows</h4>
      <p>
        <a href="https://drive.google.com/file/d/1FFgXYGT3A5OjLqjdKe6o07qAF1zz3Yi6/view?usp=drive_link" target="_blank" rel="noopener noreferrer">Code, Validate, QA, Testing</a><br>
        <a href="https://drive.google.com/file/d/1aSEjPSsD3M750t8WES4ExXdYeISW5v7Q/view?usp=drive_link" target="_blank" rel="noopener noreferrer">Code Comprehension</a><br>
        <a href="https://drive.google.com/file/d/1CjqqddtgCChM6TUyQZyuQ3xF-vpA5qyf/view?usp=drive_link" target="_blank" rel="noopener noreferrer">Help, Research, Modernization</a>
      </p>
    </div>
    <div class="arch-anno">
      <h4>Configuration</h4>
      <p>
        <a href="https://drive.google.com/file/d/1GnFLr6ljAV29e4lHPDj0u6qYNQat0CDk/view?usp=drive_link" target="_blank" rel="noopener noreferrer">Subagents, Skills, Commands, and Workflows in Claude Code</a>
      </p>
    </div>
  </div>
</section>

<!-- ===== FULL GUIDE ===== -->
<section class="section">
  <div class="rm-feedback">
    <div class="rm-feedback-text">
      <strong>Everything in one place</strong>
      <p>Workflow phases, skills and agents reference, per-IDE custom rules, recommended MCP servers, guardrail details, plugin modes, and troubleshooting.</p>
    </div>
    <div class="rm-feedback-actions">
      <a href="https://github.com/griddynamics/rosetta/blob/main/USAGE_GUIDE.md" target="_blank" rel="noopener noreferrer" class="rm-feedback-btn">Read USAGE_GUIDE.md</a>
    </div>
  </div>
</section>

