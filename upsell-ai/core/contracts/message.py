from typing import Literal

from pydantic import Field, model_validator

from core.contracts.base import ContractModel

MessageRole = Literal["user", "assistant"]


class Media(ContractModel):
    url: str = Field(min_length=1)
    type: Literal["image", "file"] = "image"


class Message(ContractModel):
    role: MessageRole
    text: str | None = None
    links: list[str] = Field(default_factory=list)
    media: list[Media] = Field(default_factory=list)

    @model_validator(mode="after")
    def has_content(self) -> Message:
        if self.text and self.text.strip():
            return self
        if self.links or self.media:
            return self
        raise ValueError("message requires text, a link, or media")
