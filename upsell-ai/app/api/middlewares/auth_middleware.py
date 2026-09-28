from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from core.context import RequestContext, TenantContext
from core.exception import AppException
from core.ids import new_id


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:

        if request.url.path == "/health":
            return await call_next(request)

        tenant_id = request.headers.get("X-Tenant-Id")
        actor_id = request.headers.get("X-Actor-Id")
        idempotency_key = request.headers.get("X-Idempotency-Key")

        if not tenant_id or not actor_id or not idempotency_key:
            return AppException.json(
                status=status.HTTP_400_BAD_REQUEST,
                message="tenant, actor, and idempotency headers are required",
                details={"code": "missing_request_scope", "retryable": False},
            )

        token = RequestContext.set(
            RequestContext(
                request=request,
                app=request.app.state._state.get("ctx"),
                run_id=new_id(),
                idempotency_key=idempotency_key,
                cache_key=f"idempotency:{tenant_id}:{idempotency_key}",
                tenant=TenantContext(
                    tenant_id=tenant_id,
                    actor_id=actor_id,
                    customer_id=request.headers.get("X-Customer-Id"),
                ),
            )
        )

        try:
            return await call_next(request)
        finally:
            RequestContext.reset(token)
