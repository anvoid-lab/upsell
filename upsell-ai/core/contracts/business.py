from datetime import datetime
from typing import Any

from core.contracts.base import RecordModel


class Business(RecordModel):
    id: str
    name: str
    description: str | None = None
    industry: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    logo_url: str | None = None
    country_code: str = "AO"
    timezone: str = "Africa/Luanda"
    locale: str = "pt-AO"
    currency: str = "AOA"
    address: dict[str, Any] | None = None
    business_hours: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
