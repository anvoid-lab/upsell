import uvicorn

from app.api.global_exception import global_exception_handlers
from app.api.middlewares.auth_middleware import AuthMiddleware
from app.app import app
from core import config

# Middleware
app.add_middleware(AuthMiddleware)

# Exception Handlers
global_exception_handlers()

# Register routes
# app.include_router(health_router)
# app.include_router(router)


def main() -> None:
    uvicorn.run(
        "app.main:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=True,
    )
