from contextvars import ContextVar, Token
from dataclasses import dataclass
from typing import Annotated, cast

from fastapi import Request

from app.lib.database.client import DatabaseClient
from app.lib.redis import RedisCacheManager


@dataclass()
class AppContext:
    dbconn: DatabaseClient
    cache: RedisCacheManager

    @staticmethod
    def get(req: Request):
        return cast(AppContext, req.state.ctx)


_request_ctx: ContextVar[RequestContext] = ContextVar("request_ctx")


@dataclass
class RequestContext:
    request: Request
    app: Annotated
    tenant: TenantContext

    idempotency_key: str
    run_id: str
    cache_key: str

    @classmethod
    def get(cls):
        return _request_ctx.get()

    @classmethod
    def set(cls, ctx) -> Token:
        return _request_ctx.set(ctx)

    @classmethod
    def reset(cls, token: Token) -> None:
        _request_ctx.reset(token)


@dataclass(frozen=True)
class TenantContext:
    tenant_id: str
    actor_id: str
    tenant_id_column: str = "business_id"

    # async def get_account(self, ctx: RequestContext) -> TenantContext:
    #     return replace(self, customer_id=customer_id)
