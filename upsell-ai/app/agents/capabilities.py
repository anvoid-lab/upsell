from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from core.contracts.agent_context import AgentContext
from core.contracts.agent_response import AgentResponse

Capability = Callable[[AgentContext], Awaitable[AgentResponse]]


@dataclass(frozen=True)
class CapabilitySpec:
    name: str
    description: str
    handler: Capability


async def echo_context(context: AgentContext) -> AgentResponse:
    return AgentResponse(
        request_id="",
        run_id="",
        type="answer",
        # content=f"context ready for {context.customer.id}",
        data=None,
        approval=None,
    )


def foundation_capabilities() -> list[CapabilitySpec]:
    return [
        CapabilitySpec(
            name="echo_context",
            description="Return a deterministic answer from the loaded agent context. No model call.",
            handler=echo_context,
        )
    ]


def assert_no_sales_knowledge(names: list[str]) -> None:
    blocked = [
        name for name in names if "sales_knowledge" in name or name.startswith("rag_")
    ]
    if blocked:
        raise RuntimeError(f"main agent cannot access sales knowledge: {blocked}")
