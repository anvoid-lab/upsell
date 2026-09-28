from dataclasses import dataclass
from typing import Protocol

from core.context import RequestContext
from core.contracts.agent_context import AgentContext
from core.contracts.agent_response import AgentResponse

DEFAULT_DENIED_ACTIONS = frozenset(
    {
        "forbidden_action",
    }
)


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    code: str = ""
    message: str = ""


class Policy(Protocol):
    async def evaluate(
        self,
        action: str,
        context: AgentContext,
    ) -> PolicyDecision: ...


class DeterministicPolicy:
    def __init__(self) -> None:
        self._denied = DEFAULT_DENIED_ACTIONS

    async def evaluate(
        self,
        action: str,
        context: AgentContext,
    ) -> PolicyDecision:
        del context

        if action in self._denied:
            return PolicyDecision(
                allowed=False,
                code="policy_denied",
                message="action is not allowed",
            )

        return PolicyDecision(allowed=True)


def denial_response(
    context: AgentContext,
    decision: PolicyDecision,
) -> AgentResponse:
    return AgentResponse(
        run_id=RequestContext.get().run_id,
        type="error",
        content=decision.message,
        data={
            "code": decision.code,
            "retryable": False,
        },
    )
