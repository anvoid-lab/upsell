from fastapi import APIRouter, Request, Response

from core.contracts.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(request: Request, response: Response) -> HealthResponse:
    redis_ok = await _redis_ok(request)
    database_ok = await _database_ok(request)
    healthy = redis_ok and database_ok
    if not healthy:
        response.status_code = 503
    return HealthResponse(
        status="ok" if healthy else "degraded",
        redis="ok" if redis_ok else "unavailable",
        database="ok" if database_ok else "unavailable",
    )


async def _redis_ok(request: Request) -> bool:
    ctx = getattr(request.app.state, "ctx", None)
    if ctx is None or ctx.dbconn is None:
        return False
    try:
        return await ctx.cache.ping()
    except Exception:  # noqa: BLE001
        return False


async def _database_ok(request: Request) -> bool:
    ctx = getattr(request.app.state, "ctx", None)
    if ctx is None:
        return False
    try:
        await ctx.dbconn.table("businesses").select("id").limit(1).execute()
        return True
    except Exception:  # noqa: BLE001
        return False
