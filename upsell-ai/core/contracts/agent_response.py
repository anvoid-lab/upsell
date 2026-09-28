from typing import Any, Literal

from core.contracts.base import ContractModel
from core.exception import ErrorDetail

ResponseType = Literal["answer", "sales_copilot", "approval", "error"]


class AgentResponse(ContractModel):
    type: ResponseType
    run_id: str
    content: str | None = None
    data: dict[str, Any] | None = None
    approval: dict[str, Any] | None = None
    error: ErrorDetail | None = None
