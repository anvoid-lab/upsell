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

        tenant_id = request.headers.get("X-Tenant-Id")
        actor_id = request.headers.get("X-Actor-Id")
        idempotency_key = request.headers.get("X-Idempotency-Key")

        if not tenant_id or not actor_id or not idempotency_key:
            return AppException.json(
                status=status.HTTP_400_BAD_REQUEST,
                message="Bad request format",
                details={"code": "missing_tenant"},
            )

        token = RequestContext.set(
            RequestContext(
                request=request,
                app=request.app.state._state.get("ctx"),
                run_id=new_id(),
                idempotency_key=idempotency_key,
                cache_key=f"idempotency_key:{idempotency_key}",
                tenant=TenantContext(
                    tenant_id=tenant_id,
                    actor_id=actor_id,
                ),
            )
        )

        try:
            return await call_next(request)
        finally:
            RequestContext.reset(token)
