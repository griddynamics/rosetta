<security_llm_ai>

<apply_when>
The system uses models, agents, retrieval, tools, MCP, generated content, or AI-managed decisions.
</apply_when>

<inspect>
- Prompt injection, instruction/data separation, and trust boundaries.
- Tool authorization, confused deputy, excessive agency, and side effects.
- Retrieval poisoning, data leakage, tenant isolation, and provenance.
- Output validation, code/content execution, and unsafe automation.
- Model/provider data flow, retention, credentials, and fallback behavior.
</inspect>

<tools>
Prefer local fixtures and application tests. Candidate harnesses/scanners may include garak, promptfoo, PyRIT, and provider eval tools. Verify model/network/data-retention contracts; never submit target data without approval.
</tools>

<evidence>
Retain sanitized prompt class, control path, tool decision, output class, side effect, and reproducible local fixture.
</evidence>

</security_llm_ai>
