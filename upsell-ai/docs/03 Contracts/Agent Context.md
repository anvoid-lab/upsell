---
type: contract
title: Agent Context
updated: 2026-09-28
---

# Agent Context

`AgentContext` is the mutable state of one agent run. It is created by the chat
service and passed to `Runner.run()` as local SDK context. The SDK and tools can
read or update the same object, but it is not automatically visible to the
model.

```yaml
run_id: string
conversation_id: string | null
messages: Message[]
state: Record<string, unknown>
response: AgentResponse | null
```

The context is a mutable Pydantic model. The service changes only the fields
that need to change, using normal assignment and built-in list/dict methods:

```python
agent_context.conversation_id = body.conversation_id
agent_context.messages.extend(body.messages)
agent_context.state["key"] = value
agent_context.response = response
```

It contains no customer, business, product, price, stock, or persisted media.
Those concepts remain available as contracts for later phases only.

## Request identity

`TenantContext` owns `tenant_id`, `actor_id`, and optional opaque `customer_id`.
The latter is supplied through `X-Customer-Id` and is not resolved by Phase 01.

## Message media

`Message.media` accepts a URL and a `type` of `image` or `file`. Image URLs are
passed as SDK image input and file URLs as SDK file input. The service does not
download or store either resource. Message media belongs to the conversation
and helps the LLM understand the user's input; it is not a product source.

Products are retrieved separately through product tools when the agent needs
catalog, price, availability, or product media data. Product tool results do not
become fields on `AgentContext`.
