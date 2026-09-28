from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.chat.chat_service import ConversationService
from core.contracts.agent_response import AgentResponse
from core.contracts.conversation_contract import ConversationRequest

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=AgentResponse)
async def chat(
    body: ConversationRequest,
    service: Annotated[ConversationService, Depends()],
) -> AgentResponse:
    return await service.init(body)
