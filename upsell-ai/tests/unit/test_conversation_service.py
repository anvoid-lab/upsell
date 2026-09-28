"""A conversation turn, resolved through the real routes, the real dependency
injection, and deterministic fakes for the cache and the database."""

from typing import Any

from fastapi.testclient import TestClient

from app.api.chat.chat_route import router as chat_router
from app.api.error_handlers import register_error_handlers
from app.api.middlewares.auth_middleware import AuthMiddleware
from core.context import AppContext
from core.contracts.agent_response import AgentResponse
from tests.unit.test_repository import FakeClient

NOW = "2026-09-25T00:00:00+00:00"
HEADERS = {"X-Tenant-Id": "biz-1", "X-Actor-Id": "actor-1"}

CUSTOMER_ROW = {
    "id": "cust-1",
    "name": "Ada",
    "status": "lead",
    "created_at": NOW,
    "updated_at": NOW,
}
BUSINESS_ROW = {
    "id": "biz-1",
    "name": "Loja",
    "created_at": NOW,
    "updated_at": NOW,
}
PRODUCT_ROW = {
    "id": "prod-1",
    "business_id": "biz-1",
    "sku": "SKU-1",
    "name": "Capulana",
    "price_text": "2500.00",
    "currency": "AOA",
    "stock": 3,
    "active": True,
    "created_at": NOW,
    "updated_at": NOW,
}


class FakeCache:
    def __init__(self) -> None:
        self.contexts: dict[tuple[str, str], dict[str, Any]] = {}
        self.idempotency: dict[tuple[str, str], tuple[str, AgentResponse]] = {}

    async def get(self, tenant_id: str, customer_id: str) -> dict[str, Any] | None:
        return self.contexts.get((tenant_id, customer_id))

    async def set(self, context, tenant_id: str) -> None:
        self.contexts[(tenant_id, context.customer.id)] = context.model_dump(
            mode="json"
        )

    async def refresh(self, context, tenant_id: str) -> None:
        await self.set(context, tenant_id)

    async def invalidate(self, tenant_id: str, customer_id: str) -> None:
        self.contexts.pop((tenant_id, customer_id), None)

    async def get_idempotent(self, tenant_id: str, key: str) -> AgentResponse | None:
        entry = self.idempotency.get((tenant_id, key))
        return entry[1] if entry else None

    async def set_idempotent(
        self, tenant_id: str, key: str, fingerprint: str, response: AgentResponse
    ) -> None:
        self.idempotency[(tenant_id, key)] = (fingerprint, response)

    async def idempotency_fingerprint(self, tenant_id: str, key: str) -> str | None:
        entry = self.idempotency.get((tenant_id, key))
        return entry[0] if entry else None


class RowsClient(FakeClient):
    """Returns a row per table, so one client can serve every repository."""

    def __init__(self, rows: dict[str, Any]) -> None:
        super().__init__(None)
        self._rows = rows

    def table(self, name: str) -> Any:
        query = super().table(name)
        original_execute = query.execute

        async def execute() -> Any:
            from types import SimpleNamespace

            return SimpleNamespace(data=self._rows.get(name))

        query.execute = execute  # type: ignore[method-assign]
        del original_execute
        return query


def _client(rows: dict[str, Any] | None = None) -> TestClient:
    from fastapi import FastAPI

    app = FastAPI()
    app.state = AppContext()
    app.state.db_client = RowsClient(
        rows
        if rows is not None
        else {
            "customers": CUSTOMER_ROW,
            "businesses": BUSINESS_ROW,
            "products": [PRODUCT_ROW],
        }
    )
    app.state.redis = FakeCache()
    app.include_router(chat_router, prefix="/v1")
    register_error_handlers(app)
    app.add_middleware(AuthMiddleware)
    return TestClient(app)


def _body(text: str, key: str) -> dict:
    return {
        "conversation_id": None,
        "customer_id": "cust-1",
        "messages": [{"role": "user", "text": text}],
        "idempotency_key": key,
    }


def test_a_turn_returns_the_domain_envelope() -> None:
    response = _client().post("/v1/chat", headers=HEADERS, json=_body("olá", "key-1"))

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "answer"
    assert body["content"] == "context ready for cust-1"
    assert response.headers["x-trace-id"]


def test_a_repeated_turn_reuses_the_cached_context() -> None:
    client = _client()

    first = client.post("/v1/chat", headers=HEADERS, json=_body("primeira", "key-1"))
    second = client.post("/v1/chat", headers=HEADERS, json=_body("segunda", "key-2"))

    assert first.status_code == second.status_code == 200
    cached = client.app.state.redis.contexts[("biz-1", "cust-1")]
    assert [message["text"] for message in cached["messages"]] == [
        "primeira",
        "segunda",
    ]


def test_a_retried_turn_is_not_executed_twice() -> None:
    client = _client()
    payload = _body("idem", "key-1")

    first = client.post("/v1/chat", headers=HEADERS, json=payload)
    second = client.post("/v1/chat", headers=HEADERS, json=payload)

    assert first.json()["run_id"] == second.json()["run_id"]


def test_reusing_a_key_with_another_payload_is_refused() -> None:
    client = _client()
    client.post("/v1/chat", headers=HEADERS, json=_body("original", "key-1"))

    conflict = client.post("/v1/chat", headers=HEADERS, json=_body("alterado", "key-1"))

    assert conflict.status_code == 400
    assert conflict.json()["error"]["code"] == "idempotency_conflict"


def test_an_unknown_customer_is_a_not_found() -> None:
    response = _client(
        rows={"customers": None, "businesses": BUSINESS_ROW, "products": []}
    ).post("/v1/chat", headers=HEADERS, json=_body("oi", "key-1"))

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "not_found"


def test_a_read_failure_is_retryable() -> None:
    class BrokenClient(FakeClient):
        def table(self, name: str) -> Any:
            raise RuntimeError("connection reset")

    from fastapi import FastAPI

    app = FastAPI()
    app.state = AppContext()
    app.state.db_client = BrokenClient()
    app.state.redis = FakeCache()
    app.include_router(chat_router, prefix="/v1")
    register_error_handlers(app)
    app.add_middleware(AuthMiddleware)

    response = TestClient(app, raise_server_exceptions=False).post(
        "/v1/chat", headers=HEADERS, json=_body("oi", "key-1")
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "dependency_unavailable"
    assert response.json()["error"]["retryable"] is True


def test_a_missing_dependency_is_retryable() -> None:
    from fastapi import FastAPI

    app = FastAPI()
    app.state = AppContext()
    app.state.redis = FakeCache()
    app.include_router(chat_router, prefix="/v1")
    register_error_handlers(app)
    app.add_middleware(AuthMiddleware)

    response = TestClient(app, raise_server_exceptions=False).post(
        "/v1/chat", headers=HEADERS, json=_body("oi", "key-1")
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "dependency_unavailable"
