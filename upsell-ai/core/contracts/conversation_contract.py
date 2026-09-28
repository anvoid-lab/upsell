from typing import Any

from pydantic import Field

from core.contracts.base import ContractModel
from core.contracts.message import Message


class ConversationRequest(ContractModel):
    conversation_id: str | None = None
    messages: list[Message] = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
