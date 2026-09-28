from dataclasses import dataclass, field
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.agents.main_agent import MainAgentShell
from app.api.chat.chat_route import router as chat_router
from app.api.global_exception import register_exception_handlers
from app.api.health import router as health_router
from app.api.middlewares.auth_middleware import AuthMiddleware
from app.api.middlewares.idempotency_middleware import IdempotencyMiddleware
from core.context import AppContext
from core.contracts.agent_context import AgentContext
from core.contracts.agent_response import AgentResponse


@dataclass
class FakeCache:
    values: dict[str, Any] = field(default_factory=dict)

    async def get(self, *keys: str) -> Any | None:
        return self.values.get(":".join(keys))

    async def set(self, *keys: str, data: Any, ttl: int | None = None) -> None:
        del ttl
        self.values[":".join(keys)] = data

    async def ping(self) -> bool:
        return True


class FakeDatabase:
    def table(self, _table: str) -> FakeDatabase:
        return self

    def select(self, _columns: str) -> FakeDatabase:
        return self

    def limit(self, _amount: int) -> FakeDatabase:
        return self

    async def execute(self) -> object:
        return object()


class FakeAgent:
    def __init__(self) -> None:
        self.contexts: list[AgentContext] = []

    async def run(self, context: AgentContext) -> AgentResponse:
        self.contexts.append(context)
        return AgentResponse(
            run_id=context.run_id,
            type="answer",
            content="completed",
        )


def build_app() -> tuple[FastAPI, FakeAgent]:
    app = FastAPI()
    fake_agent = FakeAgent()
    app.state.ctx = AppContext(dbconn=FakeDatabase(), cache=FakeCache())
    app.dependency_overrides[MainAgentShell] = lambda: fake_agent
    app.include_router(health_router)
    app.include_router(chat_router, prefix="/v1")
    register_exception_handlers(app)
    app.add_middleware(IdempotencyMiddleware)
    app.add_middleware(AuthMiddleware)
    return app, fake_agent


HEADERS = {
    "X-Tenant-Id": "tenant-1",
    "X-Actor-Id": "actor-1",
    "X-Customer-Id": "customer-1",
    "X-Idempotency-Key": "key-1",
}


def test_chat_populates_agent_context_from_the_request() -> None:
    app, agent = build_app()

    response = TestClient(app).post(
        "/v1/chat",
        headers=HEADERS,
        json={"conversation_id": "conversation-1", "messages": [{"role": "user", "text": "hello"}]},
    )

    assert response.status_code == 200
    assert response.json()["type"] == "answer"
    assert len(agent.contexts) == 1
    assert agent.contexts[0].conversation_id == "conversation-1"
    assert [message.text for message in agent.contexts[0].messages] == ["hello"]


def test_idempotency_replays_matching_request_and_rejects_conflicts() -> None:
    app, agent = build_app()
    client = TestClient(app)
    payload = {"messages": [{"role": "user", "text": "hello"}]}

    first = client.post("/v1/chat", headers=HEADERS, json=payload)
    replay = client.post("/v1/chat", headers=HEADERS, json=payload)
    conflict = client.post(
        "/v1/chat",
        headers=HEADERS,
        json={"messages": [{"role": "user", "text": "changed"}]},
    )

    assert first.status_code == replay.status_code == 200
    assert first.json() == replay.json()
    assert len(agent.contexts) == 1
    assert conflict.status_code == 400
    assert conflict.json()["error"]["details"]["code"] == "idempotency_conflict"


def test_health_is_public_and_uses_application_context() -> None:
    app, _agent = build_app()
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "redis": "ok", "database": "ok"}
