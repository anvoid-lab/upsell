---
type: contract
title: Sales Agent Output
updated: 2026-09-25
source:
  - "[[../../exemple-output.json]]"
related:
  - "[[03 Contracts/Agent Runtime]]"
  - "[[01 Backlog/Phase 03 - Sales Reasoning and Knowledge Base]]"
---

# Sales Agent Output

`exemple-output.json` defines the `SalesAgentResponse` payload placed in
`AgentResponse.data` when the response type is `sales_copilot`. It separates
analysis, recommendation, follow-up, evidence, confidence, and human-review
signaling.

## SalesAgentResponse

```json
{
  "conversation_id": "conv-demo-1",
  "evaluated_at": "2026-09-19T23:52:15.571412Z",
  "analysis": {
      "summary": "...",
      "intent": "discover_products",
      "sales_stage": "discovery",
      "signals": ["product_inquiry"],
      "known_information": {},
      "missing_information": ["use_case"]
  },
  "recommendation": {
      "primary_action": "discovery_question",
      "reason": "...",
      "alternative_actions": ["present_product_catalog"]
  },
  "follow_up": {
      "objective": "...",
      "message": "...",
      "products": [],
      "questions": [],
      "sales_techniques": [],
      "next_expected_action": "...",
      "schedule": {
        "send_in": "now",
        "send_at": null,
        "timezone": "Africa/Luanda",
        "reason": "..."
      }
  },
  "evidence": [],
  "confidence": 0.9,
  "requires_human": false,
  "warnings": []
}
```

## Field rules

- `analysis.known_information` contains facts from trusted context, while
  `missing_information` drives clarification or discovery questions.
- `recommendation.primary_action` is a typed enum, not arbitrary executable code.
- `follow_up.products[*].evidence_ids` must resolve to returned evidence or a
  trusted product-tool result. The model cannot create price or availability facts.
- `follow_up.message` is a recommendation, not an external side effect. Sending
  is owned by a separate action executor and policy check.
- `follow_up.schedule` expresses intent only. Eligibility, quiet hours,
  permission, and scheduling are deterministic application rules.
- `evidence` carries source metadata and a concise excerpt. Evidence can be
  linked to a trusted product-tool result, a policy, or a playbook. Conversation
  media may inform understanding but is not authoritative product evidence.
- `confidence`, `requires_human`, and `warnings` are signals for the application;
  `requires_human` never overrides a policy that requires approval.

## Normalizations from the example

- Rename the apparent typo `nex_questions` to `questions`.
- Replace empty objects in `sales_techniques` with typed technique identifiers.
- `type: "sales_copilot"` belongs to the outer `AgentResponse`; this
  payload does not need a second response type.
- Treat `image_url` as optional reference metadata, never as proof of stock,
  price, or product suitability.
- Keep evidence excerpts bounded and do not expose hidden prompts or private
  retrieval metadata.

## E2E examples to preserve

1. Product discovery: analysis identifies missing context, recommends one focused
   question, and returns relevant product evidence.
2. Price objection: recommendation is grounded in trusted pricing/policy data and
   marks approval when a discount or exceptional term is proposed.
3. No support: evidence is empty or insufficient, warnings explain the gap, and
   the agent asks for clarification instead of inventing an answer.
4. Follow-up: schedule intent is returned, but the scheduler and policy engine
   remain responsible for whether and when anything is sent.
