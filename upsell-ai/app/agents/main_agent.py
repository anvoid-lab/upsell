from typing import Annotated

from agents import Agent, function_tool
from fastapi import Depends

from app.agents.capabilities import CapabilitySpec, foundation_capabilities
from core.contracts.agent_context import AgentContext
from core.contracts.agent_response import AgentResponse
from core.policy import (
    DeterministicPolicy,
    PolicyDecision,
    denial_response,
)

DEFAULT_CAPABILITY = "echo_context"


class CapabilityRegistry:
    def __init__(self) -> None:
        self._capabilities = {spec.name: spec for spec in foundation_capabilities()}

    @property
    def items(self) -> list[CapabilitySpec]:
        return list(self._capabilities.values())

    def get(self, name: str) -> CapabilitySpec | None:
        return self._capabilities.get(name)

    def names(self) -> list[str]:
        return list(self._capabilities.keys())


class MainAgent:
    def __init__(
        self,
        capabilities: Annotated[CapabilityRegistry, Depends()],
    ) -> None:
        self.agent = Agent(
            name="main",
            instructions=(
                "Select a registered capability. Do not retrieve sales knowledge."
            ),
            tools=[self._as_tool(spec) for spec in capabilities.items],
        )

    @staticmethod
    def _as_tool(spec: CapabilitySpec):
        @function_tool(
            name_override=spec.name,
            description_override=spec.description,
        )
        async def run_capability() -> str:
            return spec.name

        return run_capability


class MainAgentShell:
    def __init__(
        self,
        capabilities: Annotated[CapabilityRegistry, Depends()],
        policy: Annotated[DeterministicPolicy, Depends()],
        main_agent: Annotated[MainAgent, Depends()],
    ) -> None:
        self._capabilities = capabilities
        self._policy = policy
        self.agent = main_agent.agent

    async def run(
        self,
        context: AgentContext,
        capability: str = DEFAULT_CAPABILITY,
    ) -> AgentResponse:
        spec = self._capabilities.get(capability)

        if spec is None:
            return denial_response(
                context,
                PolicyDecision(
                    False,
                    "unknown_capability",
                    "capability is not registered",
                ),
            )

        decision = await self._policy.evaluate(
            capability,
            context,
        )

        if not decision.allowed:
            return denial_response(
                context,
                decision,
            )

        return await spec.handler(context)
