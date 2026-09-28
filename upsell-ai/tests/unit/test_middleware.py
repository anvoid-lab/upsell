from typing import Annotated, cast

import pytest
from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.testclient import TestClient

from app.api.error_handlers import register_error_handlers
from app.api.middlewares.auth_middleware import AuthMiddleware
from app.api.validators import validated_body
from core.context import TenantContext
from core.contracts.conversation_contract import ConversationRequest

HEADERS = {"X-Tenant-Id": "t1", "X-Actor-Id": "a1"}

ConversationRequestDep = Annotated[
    ConversationRequest, Depends(validated_body(ConversationRequest))
]


def current_tenant(request: Request) -> TenantContext:
    """A service reads the tenant published by authentication, never a header."""
    return cast(TenantContext, request.state.tenant)


def build_app() -> FastAPI:
    app = FastAPI()
    router = APIRouter()

    @router.post("/v1/chat")
    async def chat(
        body: ConversationRequestDep,
        tenant: Annotated[TenantContext, Depends(current_tenant)],
    ) -> dict:
        return {
            "customer_id": body.customer_id,
            "tenant_id": tenant.tenant_id,
            "actor_id": tenant.actor_id,
        }

    app.include_router(router)
    register_error_handlers(app)
    app.add_middleware(AuthMiddleware)
    return app


def _body(**overrides: object) -> dict:
    payload: dict = {
        "customer_id": "c1",
        "messages": [{"role": "user", "text": "hello"}],
        "idempotency_key": "k-123",
    }
    payload.update(overrides)
    return payload


def _post(
    headers: dict | None = None,
    json: object | None = None,
    content: bytes | None = None,
):
    return TestClient(build_app()).post(
        "/v1/chat",
        headers=HEADERS if headers is None else headers,
        json=_body() if json is None else json,
        content=content,
    )


@pytest.mark.parametrize(
    "headers",
    [{}, {"X-Tenant-Id": "t1"}, {"X-Actor-Id": "a1"}],
    ids=["no-headers", "no-actor", "no-tenant"],
)
def test_auth_rejects_unscoped_requests(headers: dict) -> None:
    response = _post(headers=headers)
    assert response.status_code == 400
    data = response.json()
    assert data["type"] == "error"
    assert data["error"]["code"] == "missing_tenant"
    assert data["error"]["retryable"] is False


def test_auth_publishes_the_tenant_context() -> None:
    response = _post()
    assert response.status_code == 200
    assert response.json() == {"customer_id": "c1", "tenant_id": "t1", "actor_id": "a1"}


def test_body_validation_rejects_invalid_json() -> None:
    response = _post(content=b"not json")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_request"


def test_body_validation_rejects_invalid_payload() -> None:
    response = _post(json={"customer_id": "c1", "messages": []})
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "invalid_request"
    assert "messages" in data["error"]["field_errors"] or (
        "idempotency_key" in data["error"]["field_errors"]
    )


def test_valid_body_reaches_the_endpoint_with_a_trace() -> None:
    response = _post()
    assert response.status_code == 200
    assert response.headers["x-trace-id"]


def test_public_path_needs_no_tenant() -> None:
    app = FastAPI()
    router = APIRouter()

    @router.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    app.include_router(router)
    app.add_middleware(AuthMiddleware)
    assert TestClient(app).get("/health").status_code == 200
