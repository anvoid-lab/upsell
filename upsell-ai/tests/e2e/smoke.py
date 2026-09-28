import os
from uuid import uuid4

import httpx

BASE = os.environ.get("UPSELL_API_BASE", "http://localhost:8000")
TENANT_ID = os.environ["E2E_TENANT_ID"]
ACTOR_ID = os.environ["E2E_ACTOR_ID"]
CUSTOMER_ID = os.environ.get("E2E_CUSTOMER_ID")


def _key(prefix: str) -> str:
    return f"{prefix}-{uuid4()}"


def _headers(key: str, tenant_id: str = TENANT_ID) -> dict[str, str]:
    headers = {
        "X-Tenant-Id": tenant_id,
        "X-Actor-Id": ACTOR_ID,
        "X-Idempotency-Key": key,
    }
    if CUSTOMER_ID:
        headers["X-Customer-Id"] = CUSTOMER_ID
    return headers


def _body(text: str) -> dict:
    return {
        "conversation_id": None,
        "messages": [{"role": "user", "text": text, "links": [], "media": []}],
        "metadata": {},
    }


def test_health() -> None:
    response = httpx.get(f"{BASE}/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "redis": "ok", "database": "ok"}


def test_chat_returns_the_agent_response_contract() -> None:
    response = httpx.post(
        f"{BASE}/v1/chat",
        headers=_headers(_key("structured")),
        json=_body("olá"),
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"run_id", "type", "content", "data", "approval", "error"}
    assert body["type"] == "answer"


def test_idempotency_replays_the_stored_response() -> None:
    headers = _headers(_key("replay"))
    payload = _body("idempotente")

    first = httpx.post(f"{BASE}/v1/chat", headers=headers, json=payload)
    second = httpx.post(f"{BASE}/v1/chat", headers=headers, json=payload)

    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()


def test_idempotency_conflict_uses_the_error_json() -> None:
    headers = _headers(_key("conflict"))
    httpx.post(f"{BASE}/v1/chat", headers=headers, json=_body("original"))

    conflict = httpx.post(
        f"{BASE}/v1/chat",
        headers=headers,
        json=_body("changed"),
    )

    assert conflict.status_code == 400
    assert conflict.json()["error"]["details"]["code"] == "idempotency_conflict"


def test_missing_request_scope_is_rejected() -> None:
    response = httpx.post(f"{BASE}/v1/chat", json=_body("sem tenant"))

    assert response.status_code == 400
    assert response.json()["error"]["details"]["code"] == "missing_request_scope"


def test_remote_media_is_accepted_without_uploading_a_file() -> None:
    payload = _body("inspect this")
    payload["messages"][0]["media"] = [
        {"url": "https://example.com/product.png", "type": "image"}
    ]

    response = httpx.post(
        f"{BASE}/v1/chat",
        headers=_headers(_key("media")),
        json=payload,
    )

    assert response.status_code == 200
