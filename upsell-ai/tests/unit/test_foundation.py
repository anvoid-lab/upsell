from datetime import UTC, datetime
from decimal import Decimal

import pytest
from app.lib.cache.keys import context_key
from fastapi import status
from pydantic import ValidationError

from app.agents.capabilities import (
    CapabilitySpec,
    assert_no_sales_knowledge,
    echo_context,
)
from app.agents.main_agent import MainAgentShell, main_agent_tool_names
from app.lib.redis import strip_authoritative
from core.base.base_repository import (
    decimal_fields,
    normalize_row,
    require_tenant,
    select_clause,
    serialize_row,
)
from core.context import TenantContext
from core.contracts.agent_context import AgentContext
from core.contracts.agent_response import AgentResponse
from core.contracts.business import Business
from core.contracts.conversation_contract import ConversationRequest
from core.contracts.customer import Customer
from core.contracts.message import Message
from core.contracts.product import Product
from core.exception import AppException
from core.policy import DeterministicPolicy

NOW = datetime(2026, 9, 25, tzinfo=UTC)


def _tenant() -> TenantContext:
    return TenantContext(tenant_id="biz-1", actor_id="actor-1", trace_id="trace-1")


def _customer() -> Customer:
    return Customer(
        id="cust-1",
        name="Ada",
        status="lead",
        created_at=NOW,
        updated_at=NOW,
    )


def _business(**overrides: object) -> Business:
    payload = {
        "id": "biz-1",
        "name": "Loja",
        "created_at": NOW,
        "updated_at": NOW,
    }
    payload.update(overrides)
    return Business.model_validate(payload)


def _context() -> AgentContext:
    return AgentContext(
        request_id="req-1",
        run_id="run-1",
        customer=_customer(),
        business=_business(),
        products=[
            Product(
                id="prod-1",
                business_id="biz-1",
                sku="SKU-1",
                name="Capulana",
                price=Decimal("2500.00"),
                currency="AOA",
                stock=3,
                created_at=NOW,
                updated_at=NOW,
            )
        ],
        messages=[Message(role="user", text="olá")],
    )


def test_business_defaults_match_database() -> None:
    business = _business()
    assert business.country_code == "AO"
    assert business.timezone == "Africa/Luanda"
    assert business.locale == "pt-AO"
    assert business.currency == "AOA"


def test_nullable_jsonb_stays_null() -> None:
    business = _business()
    dumped = business.model_dump()
    assert dumped["address"] is None
    assert dumped["business_hours"] is None
    assert dumped["metadata"] is None
    again = Business.model_validate(dumped)
    assert again.address is None


def test_price_rejects_float_and_negative_stock() -> None:
    with pytest.raises(ValidationError):
        Product(
            id="prod-1",
            business_id="biz-1",
            sku="SKU-1",
            name="Capulana",
            price=12.5,
            currency="AOA",
            stock=1,
            created_at=NOW,
            updated_at=NOW,
        )
    with pytest.raises(ValidationError):
        Product(
            id="prod-1",
            business_id="biz-1",
            sku="SKU-1",
            name="Capulana",
            price=Decimal("12.50"),
            currency="AOA",
            stock=-1,
            created_at=NOW,
            updated_at=NOW,
        )


def test_cache_keys_are_tenant_scoped() -> None:
    first = context_key("biz-1", "cust-1")
    second = context_key("biz-2", "cust-1")
    assert first == "agent_context:biz-1:cust-1"
    assert first != second
    with pytest.raises(ValueError):
        context_key("", "cust-1")


def test_cached_context_drops_price_and_stock() -> None:
    payload = strip_authoritative(_context())
    assert "price" not in payload["products"][0]
    assert "stock" not in payload["products"][0]
    assert payload["products"][0]["sku"] == "SKU-1"


def test_decimal_columns_are_read_as_text() -> None:
    assert select_clause(Product) == "*,price_text:price::text"
    assert decimal_fields(Product) == ["price"]
    assert select_clause(Business) == "*"


def test_text_cast_alias_is_normalized_before_validation() -> None:
    row = {"sku": "SKU-1", "price": 12.5, "price_text": "12.50"}
    normalized = normalize_row(Product, row)
    assert normalized["price"] == "12.50"
    assert "price_text" not in normalized
    assert row["price"] == 12.5, "the source row must not be mutated"


def test_product_tolerates_additive_columns() -> None:
    product = Product.model_validate(
        {
            "id": "prod-1",
            "business_id": "biz-1",
            "sku": "SKU-1",
            "name": "Capulana",
            "price": "2500.00",
            "currency": "AOA",
            "stock": 3,
            "created_at": NOW,
            "updated_at": NOW,
            "added_by_a_later_migration": "ignored",
        }
    )
    assert product.price == Decimal("2500.00")


def test_money_is_written_as_text() -> None:
    payload = serialize_row(Product, {"id": "prod-1", "price": Decimal("2500.00")})
    assert payload["price"] == "2500.00"
    assert isinstance(payload["price"], str)


def test_queries_require_a_tenant_context() -> None:
    assert require_tenant(_tenant()) == "biz-1"
    with pytest.raises(ValueError):
        require_tenant(TenantContext(tenant_id="", actor_id="a1", trace_id="t1"))


def test_tenant_context_carries_business_and_customer() -> None:
    tenant = (
        _tenant()
        .with_customer_id("cust-1")
        .with_records(business=_business(), customer=_customer())
    )
    assert tenant.customer_id == "cust-1"
    assert tenant.business is not None and tenant.business.id == "biz-1"
    assert tenant.customer is not None and tenant.customer.id == "cust-1"
    assert tenant.tenant_id == "biz-1"


def test_app_error_maps_to_the_error_envelope() -> None:
    error = AppException(
        message="customer or business was not found",
        status=status.HTTP_400_BAD_REQUEST,
        error={"code": "not_found", "retryable": False},
    )
    assert error.status == status.HTTP_400_BAD_REQUEST
    assert error.error["code"] == "not_found"
    assert error.error["retryable"] is False


def test_retryable_error_is_a_service_unavailable() -> None:
    error = AppException(
        message="trusted data is temporarily unavailable",
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
        error={"code": "dependency_unavailable", "retryable": True},
    )
    assert error.status == status.HTTP_503_SERVICE_UNAVAILABLE
    assert error.error["retryable"] is True


def test_the_status_is_declared_by_the_error() -> None:
    error = AppException(
        message="nope",
        status=status.HTTP_401_UNAUTHORIZED,
        error={"code": "missing_tenant", "retryable": False},
    )
    assert error.status == status.HTTP_401_UNAUTHORIZED


def test_main_agent_has_no_sales_knowledge() -> None:
    names = main_agent_tool_names()
    assert names == ["echo_context"]
    assert_no_sales_knowledge(names)


@pytest.mark.asyncio
async def test_policy_denial_is_structured() -> None:
    policy = DeterministicPolicy()
    decision = await policy.evaluate("forbidden_action", _context())
    assert decision.allowed is False
    assert decision.code == "policy_denied"


@pytest.mark.asyncio
async def test_denied_capability_returns_error_envelope() -> None:
    spec = CapabilitySpec(
        name="forbidden_action",
        description="Denied by policy.",
        handler=echo_context,
    )
    shell = MainAgentShell(capabilities=[spec])
    response = await shell.run(_context(), capability="forbidden_action")
    assert response.type == "error"
    assert response.data is not None
    assert response.data["code"] == "policy_denied"
    assert response.data["retryable"] is False


@pytest.mark.asyncio
async def test_allowed_capability_returns_answer_envelope() -> None:
    shell = MainAgentShell()
    response = await shell.run(_context(), capability="echo_context")
    assert response.type == "answer"
    assert response.content


@pytest.mark.asyncio
async def test_unknown_capability_returns_error_envelope() -> None:
    shell = MainAgentShell()
    response = await shell.run(_context(), capability="not_registered")
    assert response.type == "error"
    assert response.data is not None
    assert response.data["code"] == "unknown_capability"


def test_response_envelope_keeps_every_key() -> None:
    response = AgentResponse(
        request_id="req-1",
        run_id="run-1",
        type="answer",
        content="ok",
    )
    dumped = response.model_dump()
    assert set(dumped) == {
        "request_id",
        "run_id",
        "type",
        "content",
        "data",
        "approval",
    }


def test_request_requires_message_content() -> None:
    with pytest.raises(ValidationError):
        ConversationRequest(
            customer_id="cust-1",
            messages=[Message(role="user", text=" ")],
            idempotency_key="key-1",
        )
