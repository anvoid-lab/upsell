import pytest
from fastapi import status

from core.contracts.conversation_contract import ConversationRequest
from core.contracts.message import Message
from core.contracts.validate_contract import validate_contract
from core.exception import AppException


def test_validate_contract_success() -> None:
    data = {
        "customer_id": "cust-123",
        "messages": [{"role": "user", "text": "hello"}],
        "idempotency_key": "idem-123",
    }
    request = validate_contract(ConversationRequest, data)
    assert request.customer_id == "cust-123"
    assert len(request.messages) == 1
    assert request.messages[0].text == "hello"


def test_validate_contract_missing_required_fields() -> None:
    data = {
        "customer_id": "cust-123",
    }
    with pytest.raises(AppException) as exc_info:
        validate_contract(ConversationRequest, data)

    error = exc_info.value
    assert error.status == status.HTTP_400_BAD_REQUEST
    assert error.error["code"] == "invalid_request"
    assert error.error["retryable"] is False
    assert "messages" in error.error["field_errors"]
    assert "idempotency_key" in error.error["field_errors"]


def test_validate_contract_empty_message() -> None:
    data = {
        "customer_id": "cust-123",
        "messages": [{"role": "user", "text": "   "}],
        "idempotency_key": "idem-123",
    }
    with pytest.raises(AppException) as exc_info:
        validate_contract(ConversationRequest, data)

    assert exc_info.value.error["code"] == "invalid_request"
    assert "messages.0" in exc_info.value.error["field_errors"] or any(
        "messages" in key for key in exc_info.value.error["field_errors"]
    )


def test_validated_message_requires_content() -> None:
    with pytest.raises(Exception):  # noqa: B017
        Message(role="user", text=" ")
