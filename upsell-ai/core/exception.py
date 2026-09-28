from dataclasses import dataclass
from typing import Any

from fastapi.responses import JSONResponse
from pydantic import Field

from core.contracts.base import ContractModel
from core.logger import logger


class ErrorDetail(ContractModel):
    message: str
    retryable: bool
    field_errors: dict[str, list[str]] = Field(default_factory=dict)


@dataclass
class AppException(Exception):
    message: str
    status: int
    run_id: str | None = None
    error: Any = None
    details: Any = None

    def __post_init__(self) -> None:
        super().__init__(self.message)

        if self.error:
            logger.error(self.message)
            logger.error(f"Error: {self.error}")

    @classmethod
    def json(cls, status: int, message: str, details: Any = None):
        return JSONResponse(
            status_code=status,
            content={
                "message": "Invalid request",
                "error": {
                    "details": details,
                },
            },
        )
