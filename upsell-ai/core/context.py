from contextvars import ContextVar, Token
from dataclasses import dataclass
from typing import cast

from fastapi import Request

from app.lib.database.client import DatabaseClient
from app.lib.redis import RedisCacheManager


@dataclass()
class AppContext:
    dbconn: DatabaseClient | None
    cache: RedisCacheManager

    @staticmethod
    def get(req: Request):
        return cast(AppContext, req.state.ctx)


_request_ctx: ContextVar[RequestContext] = ContextVar("request_ctx")


@dataclass
class RequestContext:
    request: Request
    app: AppContext
    tenant: TenantContext

    idempotency_key: str
    run_id: str
    cache_key: str

    @classmethod
    def get(cls) -> RequestContext:
        return _request_ctx.get()

    @classmethod
    def set(cls, ctx: RequestContext) -> Token:
        return _request_ctx.set(ctx)

    @classmethod
    def reset(cls, token: Token) -> None:
        _request_ctx.reset(token)


@dataclass(frozen=True)
class TenantContext:
    tenant_id: str
    actor_id: str
    customer_id: str | None = None
    tenant_id_column: str = "business_id"
