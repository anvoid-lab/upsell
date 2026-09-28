from fastapi import Request, status
from fastapi.exceptions import RequestValidationError

from app.app import app
from core.exception import AppException


def global_exception_handlers():
    @app.exception_handler(Exception)
    async def gobal_exception_handler(request: Request, exc: Exception):
        print(" exception")
        return AppException.json(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Internal Server Error",
            details=str(exc),
        )

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        print("app exception")
        return AppException.json(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Internal Server Error",
            details=exc,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ):
        first_error = exc.errors()[0]
        print(first_error)

        return AppException.json(
            status=status.HTTP_422_UNPROCESSABLE_CONTENT,
            message="",
            details=exc.errors(),
        )
