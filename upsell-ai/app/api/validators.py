# """Boundary validation of an incoming body.

# A route declares the contract of the body it accepts as a dependency, so an
# invalid payload is rejected before the endpoint and the service run, and the
# rejection is the same error envelope used everywhere else.
# """

# import json
# from collections.abc import Callable
# from typing import Any, TypeVar

# from fastapi import Request, status

# from core.contracts.validate_contract import validate_contract
# from core.exception import AppException

# T = TypeVar("T")


# def validated_body[T](model: type[T]) -> Callable[[Request], T]:
#     """A dependency that returns the body validated against `model`."""

#     async def dependency(request: Request) -> T:
#         return validate_contract(model, await _json_body(request))  # pyright: ignore[reportArgumentType]

#     return dependency  # pyright: ignore[reportReturnType]


# async def _json_body(request: Request) -> Any:
#     body = await request.body()
#     if not body:
#         return {}
#     try:
#         payload = json.loads(body)
#     except ValueError as error:
#         raise AppException(
#             message="request body must be valid JSON",
#             status=status.HTTP_400_BAD_REQUEST,
#             error={"code": "invalid_request", "retryable": False},
#         ) from error
#     if not isinstance(payload, dict):
#         raise AppException(
#             message="request body must be a JSON object",
#             status=status.HTTP_400_BAD_REQUEST,
#             error={"code": "invalid_request", "retryable": False},
#         )
#     return payload
