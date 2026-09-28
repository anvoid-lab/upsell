"""Boundary validation shared by routes."""

import json
from collections.abc import Callable
from typing import Any

from fastapi import Request, status
from pydantic import BaseModel

from core.contracts.validate_contract import validate_contract
from core.exception import AppException


def validated_body[T: BaseModel](model: type[T]) -> Callable[[Request], T]:
    async def dependency(request: Request) -> T:
        return validate_contract(model, await _json_body(request))

    return dependency


async def _json_body(request: Request) -> Any:
    body = await request.body()
    if not body:
        return {}
    try:
        payload = json.loads(body)
    except ValueError as error:
        raise AppException(
            message="request body must be valid JSON",
            status=status.HTTP_400_BAD_REQUEST,
            error={"code": "invalid_request", "retryable": False},
        ) from error
    if not isinstance(payload, dict):
        raise AppException(
            message="request body must be a JSON object",
            status=status.HTTP_400_BAD_REQUEST,
            error={"code": "invalid_request", "retryable": False},
        )
    return payload
