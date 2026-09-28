import json
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

from core.logger import logger


class RedisCacheManager:
    def __init__(
        self,
        client: Redis,
        ttl_seconds: int,
        prefix: str = "",
    ) -> None:
        self._client = client
        self._ttl = ttl_seconds
        self._prefix = prefix

    def _key(self, *keys: str) -> str:
        if not keys or any(not key for key in keys):
            raise ValueError("cache key requires valid parts")

        key = ":".join(keys)

        if self._prefix:
            return f"{self._prefix}:{key}"

        return key

    def _decode(self, raw: bytes | str | None) -> Any | None:
        if raw is None:
            return None

        try:
            return json.loads(raw)
        except (ValueError, TypeError) as exc:
            logger.warning(
                "cache payload decode failed",
                code=type(exc).__name__,
            )
            return None

    async def ping(self) -> bool:
        try:
            return bool(await self._client.ping())

        except RedisError as exc:
            logger.warning(
                "cache ping failed",
                code=type(exc).__name__,
            )
            return False

    async def get(self, *keys: str) -> str | bytes | None:
        try:
            raw = await self._client.get(
                self._key(*keys),
            )

            return self._decode(raw)

        except RedisError as exc:
            logger.warning(
                "cache read failed",
                code=type(exc).__name__,
            )
            return None

    async def list(self, *keys: str) -> list[str | bytes | None]:
        if not keys:
            return []

        try:
            cache_keys = [self._key(key) for key in keys]

            values = await self._client.mget(cache_keys)

            return [self._decode(value) for value in values]

        except RedisError as exc:
            logger.warning(
                "cache list failed",
                code=type(exc).__name__,
            )
            return []

    async def set(self, *keys: str, data: Any, ttl: int | None = None) -> None:
        try:
            await self._client.set(
                self._key(*keys),
                json.dumps(data),
                ex=ttl if ttl is not None else self._ttl,
            )

        except (RedisError, ValueError, TypeError) as exc:
            logger.warning(
                "cache write failed",
                code=type(exc).__name__,
            )

    async def refresh(
        self,
        *keys: str,
        data: Any,
        ttl: int | None = None,
    ) -> None:
        await self.set(
            *keys,
            data=data,
            ttl=ttl,
        )

    async def invalidate(self, *keys: str) -> None:
        try:
            await self._client.delete(
                self._key(*keys),
            )

        except RedisError as exc:
            logger.warning(
                "cache invalidate failed",
                code=type(exc).__name__,
            )
