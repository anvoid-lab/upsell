from types import SimpleNamespace

import pytest

from app.agents.main_agent import MainAgentShell, Runner, _agent_input
from core.context import RequestContext, TenantContext
from core.contracts.agent_context import AgentContext
from core.contracts.agent_response import AgentResponse
from core.contracts.message import Media, Message


def test_agent_context_owns_its_mutable_state() -> None:
    context = AgentContext(run_id="run-1")

    context.conversation_id = "conversation-1"
    context.messages.extend([Message(role="user", text="hello")])
    context.state["stage"] = "new"
    context.response = AgentResponse(
        run_id="run-1",
        type="answer",
        content="ready",
    )

    assert context.conversation_id == "conversation-1"
    assert [message.text for message in context.messages] == ["hello"]
    assert context.state == {"stage": "new"}
    assert context.response is not None and context.response.content == "ready"


def test_media_urls_become_sdk_input_items() -> None:
    context = AgentContext(
        run_id="run-1",
        messages=[
            Message(
                role="user",
                text="inspect these",
                media=[
                    Media(url="https://cdn.example/image.png"),
                    Media(url="https://cdn.example/spec.pdf", type="file"),
                ],
            )
        ],
    )

    assert _agent_input(context) == [
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": "inspect these"},
                {"type": "input_image", "image_url": "https://cdn.example/image.png"},
                {"type": "input_file", "file_url": "https://cdn.example/spec.pdf"},
            ],
        }
    ]


@pytest.mark.asyncio
async def test_main_agent_shell_executes_the_sdk_runner(monkeypatch: pytest.MonkeyPatch) -> None:
    context = AgentContext(run_id="run-1", messages=[Message(role="user", text="hello")])
    shell = object.__new__(MainAgentShell)
    shell.agent = object()
    calls = []

    async def fake_run(agent, input, *, context):
        calls.append((agent, input, context))
        return SimpleNamespace(final_output="runner output")

    monkeypatch.setattr(Runner, "run", fake_run)
    token = RequestContext.set(
        RequestContext(
            request=SimpleNamespace(),
            app=SimpleNamespace(),
            tenant=TenantContext(tenant_id="tenant-1", actor_id="actor-1"),
            idempotency_key="key-1",
            run_id="run-1",
            cache_key="idempotency:tenant-1:key-1",
        )
    )
    try:
        response = await shell.run(context)
    finally:
        RequestContext.reset(token)

    assert calls[0][2] is context
    assert response.content == "runner output"
    assert context.response == response
