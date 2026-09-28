import json
import os
from uuid import uuid4

import httpx
import pytest
import redis

BASE = os.environ.get("UPSELL_API_BASE", "http://localhost:8000")
TENANT_ID = os.environ["E2E_TENANT_ID"]
ACTOR_ID = os.environ["E2E_ACTOR_ID"]
CUSTOMER_ID = os.environ["E2E_CUSTOMER_ID"]
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

HEADERS = {"X-Tenant-Id": TENANT_ID, "X-Actor-Id": ACTOR_ID}


def _body(text: str, key: str, customer_id: str = CUSTOMER_ID) -> dict:
    return {
        "conversation_id": None,
        "customer_id": customer_id,
        "messages": [{"role": "user", "text": text, "links": [], "media": []}],
        "idempotency_key": key,
        "metadata": {},
    }


def _fresh_key(prefix: str) -> str:
    return f"{prefix}-{uuid4()}"


def _forget(*keys: str) -> None:
    client = redis.from_url(REDIS_URL, decode_responses=True)
    for key in keys:
        client.delete(key)
    client.close()


def _context_key(tenant_id: str = TENANT_ID, customer_id: str = CUSTOMER_ID) -> str:
    return f"agent_context:{tenant_id}:{customer_id}"


def _idempotency_key(key: str, tenant_id: str = TENANT_ID) -> str:
    return f"idempotency:{tenant_id}:{key}"


def test_health() -> None:
    response = httpx.get(f"{BASE}/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["redis"] == "ok"
    assert body["database"] == "ok"


def test_chat_returns_structured_response() -> None:
    response = httpx.post(
        f"{BASE}/v1/chat",
        headers=HEADERS,
        json=_body("olá", _fresh_key("phase-01-structured")),
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"request_id", "run_id", "type", "content", "data", "approval", "error"}
    assert body["type"] == "answer"
    assert body["content"]
    assert response.headers["x-trace-id"]


def test_repeated_requests_reuse_cached_context() -> None:
    first_key = _fresh_key("phase-01-cache")
    second_key = _fresh_key("phase-01-cache")
    _forget(_context_key(), _idempotency_key(first_key), _idempotency_key(second_key))

    client = redis.from_url(REDIS_URL, decode_responses=True)
    try:
        first = httpx.post(f"{BASE}/v1/chat", headers=HEADERS, json=_body("primeira", first_key))
        assert first.status_code == 200
        cached = json.loads(client.get(_context_key()))
        assert [message["text"] for message in cached["messages"]] == ["primeira"]

        second = httpx.post(f"{BASE}/v1/chat", headers=HEADERS, json=_body("segunda", second_key))
        assert second.status_code == 200
        cached = json.loads(client.get(_context_key()))
        assert [message["text"] for message in cached["messages"]] == ["primeira", "segunda"]
        assert cached["products"], "cached context must carry products"
        assert all("price" not in product and "stock" not in product for product in cached["products"])
        assert client.ttl(_context_key()) > 0
    finally:
        client.close()


def test_idempotency_replays_the_stored_response() -> None:
    key = _fresh_key("phase-01-idem")
    _forget(_idempotency_key(key))
    first = httpx.post(f"{BASE}/v1/chat", headers=HEADERS, json=_body("idempotente", key))
    second = httpx.post(f"{BASE}/v1/chat", headers=HEADERS, json=_body("idempotente", key))
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["run_id"] == second.json()["run_id"]


def test_idempotency_conflict_is_rejected() -> None:
    key = _fresh_key("phase-01-conflict")
    _forget(_idempotency_key(key))
    httpx.post(f"{BASE}/v1/chat", headers=HEADERS, json=_body("original", key))
    conflict = httpx.post(f"{BASE}/v1/chat", headers=HEADERS, json=_body("alterado", key))
    assert conflict.status_code == 400
    assert conflict.json()["error"]["code"] == "idempotency_conflict"


def test_missing_tenant_is_rejected() -> None:
    response = httpx.post(
        f"{BASE}/v1/chat",
        json=_body("sem tenant", _fresh_key("phase-01-no-tenant")),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "missing_tenant"


def test_missing_actor_is_rejected() -> None:
    response = httpx.post(
        f"{BASE}/v1/chat",
        headers={"X-Tenant-Id": TENANT_ID},
        json=_body("sem actor", _fresh_key("phase-01-no-actor")),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "missing_tenant"


def test_invalid_request_is_rejected() -> None:
    response = httpx.post(
        f"{BASE}/v1/chat",
        headers=HEADERS,
        json={"customer_id": CUSTOMER_ID, "messages": [], "idempotency_key": _fresh_key("phase-01-invalid")},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_request"
    assert response.json()["error"]["field_errors"]


def test_tenant_isolation_hides_other_business_customer() -> None:
    other_tenant = os.environ["E2E_OTHER_TENANT_ID"]
    response = httpx.post(
        f"{BASE}/v1/chat",
        headers={"X-Tenant-Id": other_tenant, "X-Actor-Id": ACTOR_ID},
        json=_body("cruzado", _fresh_key("phase-01-isolation")),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "not_found"


@pytest.mark.parametrize("payload", [{"role": "user", "text": "   "}])
def test_message_without_content_is_rejected(payload: dict) -> None:
    response = httpx.post(
        f"{BASE}/v1/chat",
        headers=HEADERS,
        json={
            "customer_id": CUSTOMER_ID,
            "messages": [payload],
            "idempotency_key": _fresh_key("phase-01-empty-message"),
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_request"
