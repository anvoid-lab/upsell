from typing import Literal

from pydantic import Field

from core.contracts.base import ContractModel

MessageRole = Literal["user", "assistant"]


class Media(ContractModel):
    url: str = Field(min_length=1)


class Message(ContractModel):
    role: MessageRole
    text: str | None = None
    links: list[str] = Field(default_factory=list)
    media: list[Media] = Field(default_factory=list)
