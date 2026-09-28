from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.chat.chat_service import ConversationService
from app.api.validators import validated_body
from core.contracts.agent_response import AgentResponse
from core.contracts.conversation_contract import ConversationRequest

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=AgentResponse)
async def chat(
    body: Annotated[ConversationRequest, Depends(validated_body(ConversationRequest))],
    service: Annotated[ConversationService, Depends()],
) -> AgentResponse:
    return await service.init(body)
