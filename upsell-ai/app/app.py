from contextlib import asynccontextmanager

from fastapi import FastAPI
from redis.asyncio import Redis

from app.api.health import router as health_router
from app.api.router import router
from app.lib.database.client import db_connection
from app.lib.redis import RedisCacheManager
from core import config
from core.context import AppContext


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = Redis.from_url(config.REDIS_URL, decode_responses=True)

    dbconn = await db_connection()
    redis_ctx = RedisCacheManager(
        redis,
        config.CONTEXT_TTL_SECONDS,
    )

    app.state.ctx = AppContext(dbconn=dbconn, cache=redis_ctx)

    yield
    await redis.aclose()


app = FastAPI(title="Upsell AI", version="0.1.0", lifespan=lifespan)

# Register routes
app.include_router(health_router)
app.include_router(router)
