from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from core.contracts.base import RecordModel

CustomerStatus = Literal["lead", "customer", "inactive"]


class Customer(RecordModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    language: str | None = None
    timezone: str | None = None
    status: CustomerStatus
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
