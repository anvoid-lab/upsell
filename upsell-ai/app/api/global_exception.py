from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError

from app.app import app
from core.exception import AppException


def register_exception_handlers(target: FastAPI) -> None:
    @target.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return AppException.json(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Internal Server Error",
            details={"code": "internal_error", "retryable": True},
        )

    @target.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return AppException.json(
            exc.status,
            message=exc.message,
            details=exc.error,
        )

    @target.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ):
        return AppException.json(
            status=status.HTTP_422_UNPROCESSABLE_CONTENT,
            message="request is invalid",
            details={"code": "invalid_request", "retryable": False},
        )


def global_exception_handlers() -> None:
    register_exception_handlers(app)
