from typing import Any, TypeVar

from fastapi import status
from pydantic import BaseModel, ValidationError

from core.exception import AppException

T = TypeVar("T", bound=BaseModel)


def validate_contract[T: BaseModel](model_cls: type[T], data: Any) -> T:

    try:
        return model_cls.model_validate(data)
    except ValidationError as exc:
        field_errors: dict[str, list[str]] = {}
        for err in exc.errors():
            loc = ".".join(str(part) for part in err["loc"])
            field_errors.setdefault(loc, []).append(err["msg"])

        raise AppException(
            message="request is invalid",
            status=status.HTTP_400_BAD_REQUEST,
            error={
                "code": "invalid_request",
                "retryable": False,
                "field_errors": field_errors,
            },
        ) from exc
