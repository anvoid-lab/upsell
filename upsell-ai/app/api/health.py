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
    cache = getattr(request.app.state, "redis", None)
    if cache is None:
        return False
    try:
        return await cache.ping()
    except Exception:  # noqa: BLE001
        return False


async def _database_ok(request: Request) -> bool:
    client = getattr(request.app.state, "db_client", None)
    if client is None:
        return False
    try:
        await client.table("businesses").select("id").limit(1).execute()
        return True
    except Exception:
        return False
