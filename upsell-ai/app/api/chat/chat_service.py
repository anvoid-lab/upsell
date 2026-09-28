from typing import Annotated

from fastapi import Depends

from app.agents.main_agent import MainAgentShell
from core.base.base_service import BaseService
from core.contracts.agent_context import AgentContext
from core.contracts.agent_response import AgentResponse
from core.contracts.conversation_contract import ConversationRequest
from core.logger import logger


class ConversationService(BaseService[ConversationRequest]):
    def __init__(
        self,
        agent: Annotated[MainAgentShell, Depends()],
    ):
        self.agent = agent

    async def init(self, body: ConversationRequest) -> AgentResponse:
        agent_context = AgentContext(run_id=self.ctx.run_id)
        agent_context.conversation_id = body.conversation_id
        agent_context.messages.extend(body.messages)

        response = await self.agent.run(agent_context)

        logger.info(
            "conversation turn completed",
            run_id=self.ctx.run_id,
        )
        return response
