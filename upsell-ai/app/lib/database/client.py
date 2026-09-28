from fastapi import status
from supabase import AsyncClient, acreate_client

from core import config
from core.exception import AppException
from core.logger import logger

type DatabaseClient = AsyncClient


async def db_connection() -> AsyncClient:
    url = config.SUPABASE_URL
    key = config.SUPABASE_KEY or config.SUPABASE_SECRET_KEY

    if not url or not key:
        raise AppException(
            message="SUPABASE_URL and SUPABASE_KEY are required",
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
            error={"code": "dependency_unavailable", "retryable": True},
        )

    try:
        return await acreate_client(url, key)
    except Exception as error:
        logger.warning(f"database connection failed: {type(error).__name__}")
        raise AppException(
            message="trusted data is temporarily unavailable",
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
            error={"code": "dependency_unavailable", "retryable": True},
        ) from error
