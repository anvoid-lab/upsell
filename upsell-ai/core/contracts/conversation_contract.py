from typing import Any

from pydantic import BaseModel, Field

from core.contracts.message import Message


class ConversationRequest(BaseModel):
    conversation_id: str | None = None
    messages: list[Message] = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
