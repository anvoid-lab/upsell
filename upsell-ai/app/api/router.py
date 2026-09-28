from fastapi import APIRouter

from app.api.chat.chat_route import router as chat_router

router = APIRouter(
    prefix="/v1",
)
router.include_router(chat_router)
