"""Replay completed API requests that reuse an idempotency key."""

import hashlib
import json
from typing import Any

from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from core.context import RequestContext
from core.exception import AppException


class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.url.path == "/health":
            return await call_next(request)

        context = RequestContext.get()
        body = await request.body()
        fingerprint = self._fingerprint(request, body)
        cached = await context.app.cache.get(context.cache_key)

        if cached is not None:
            if cached.get("fingerprint") != fingerprint:
                return AppException.json(
                    status.HTTP_400_BAD_REQUEST,
                    "idempotency key was already used for another request",
                    {"code": "idempotency_conflict", "retryable": False},
                )
            return JSONResponse(
                status_code=cached["status"],
                content=cached["body"],
            )

        response = await call_next(request)
        response_body = b"".join([chunk async for chunk in response.body_iterator])
        headers = dict(response.headers)
        headers.pop("content-length", None)
        if 200 <= response.status_code < 300:
            payload = self._payload(response_body)
            if payload is not None:
                await context.app.cache.set(
                    context.cache_key,
                    data={
                        "fingerprint": fingerprint,
                        "status": response.status_code,
                        "body": payload,
                    },
                )
        return Response(
            content=response_body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type,
        )

    @staticmethod
    def _fingerprint(request: Request, body: bytes) -> str:
        digest = hashlib.sha256()
        digest.update(request.method.encode())
        digest.update(b"\0")
        digest.update(request.url.path.encode())
        digest.update(b"\0")
        digest.update(body)
        return digest.hexdigest()

    @staticmethod
    def _payload(raw: bytes) -> dict[str, Any] | None:
        if not raw:
            return None
        try:
            payload = json.loads(raw)
        except (TypeError, ValueError):
            return None
        return payload if isinstance(payload, dict) else None
