from typing import Annotated, Any

from agents import (
    Agent,
    OpenAIChatCompletionsModel,
    RunContextWrapper,
    Runner,
    function_tool,
    set_tracing_disabled,
)
from fastapi import Depends
from openai import AsyncOpenAI

from app.agents.capabilities import CapabilitySpec, foundation_capabilities
from core import config
from core.contracts.agent_context import AgentContext
from core.contracts.agent_response import AgentResponse
from core.policy import DeterministicPolicy


class CapabilityRegistry:
    def __init__(self) -> None:
        self._capabilities = {spec.name: spec for spec in foundation_capabilities()}

    @property
    def items(self) -> list[CapabilitySpec]:
        return list(self._capabilities.values())

    def names(self) -> list[str]:
        return list(self._capabilities)


class MainAgent:
    def __init__(
        self,
        capabilities: Annotated[CapabilityRegistry, Depends()],
        policy: Annotated[DeterministicPolicy, Depends()],
    ) -> None:
        set_tracing_disabled(True)
        client = AsyncOpenAI(
            base_url=config.LLM_BASE_URL,
            api_key=config.LLM_API_KEY,
        )
        model = OpenAIChatCompletionsModel(
            model=config.LLM_MODEL,
            openai_client=client,
        )
        self.agent = Agent[AgentContext](
            name="main",
            model=model,
            instructions=(
                "You are the Upsell AI main agent. Use the registered capability "
                "when it helps. Do not retrieve sales knowledge or invent business data."
            ),
            tools=[self._as_tool(spec, policy) for spec in capabilities.items],
        )

    @staticmethod
    def _as_tool(spec: CapabilitySpec, policy: DeterministicPolicy):
        @function_tool(
            name_override=spec.name,
            description_override=spec.description,
        )
        async def run_capability(
            run_context: RunContextWrapper[AgentContext],
        ) -> str:
            decision = await policy.evaluate(spec.name, run_context.context)
            if not decision.allowed:
                return f"capability denied: {decision.code}"
            response = await spec.handler(run_context.context)
            run_context.context.response = response
            return response.content or "capability completed"

        return run_capability


class MainAgentShell:
    def __init__(
        self,
        main_agent: Annotated[MainAgent, Depends()],
    ) -> None:
        self.agent = main_agent.agent

    async def run(self, context: AgentContext) -> AgentResponse:
        result = await Runner.run(
            self.agent,
            _agent_input(context),
            context=context,
        )
        response = AgentResponse(
            run_id=context.run_id,
            type="answer",
            content=str(result.final_output),
        )
        context.response = response
        return response


def _agent_input(context: AgentContext) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for message in context.messages:
        content: list[dict[str, str]] = []
        if message.text:
            content.append({"type": "input_text", "text": message.text})
        for media in message.media:
            if media.type == "image":
                content.append({"type": "input_image", "image_url": media.url})
            else:
                content.append({"type": "input_file", "file_url": media.url})
        for link in message.links:
            content.append({"type": "input_text", "text": link})
        items.append({"role": message.role, "content": content})
    return items
