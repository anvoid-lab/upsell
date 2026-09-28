from typing import Any

from pydantic import BaseModel, Field

from core.context import RequestContext
from core.contracts.agent_response import AgentResponse
from core.contracts.message import Message


class AgentContext(BaseModel):
    conversation_id: str | None = None
    messages: list[Message] = Field(default_factory=list)
    state: dict[str, Any] = Field(default_factory=dict)
    response: AgentResponse | None = None

    # ctx: RequestContext = Field(
    #     default_factory=RequestContext.get,
    #     init=False,
    #     exclude=True,
    # )

    @classmethod
    async def get(cls, ctx: RequestContext) -> AgentContext | None:
        cached = await ctx.app.cache.get(ctx.idempotency_key)

        if cached:
            return cls.model_validate(cached)

        return None

    async def set(self, ctx: RequestContext, data: AgentContext):
        await ctx.app.cache.set(
            ctx.idempotency_key,
            data=data.model_dump(mode="json"),
        )

        return data
