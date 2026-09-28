from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import Field, field_validator

from core.contracts.base import RecordModel


class ProductImage(RecordModel):
    url: str = Field(min_length=1)


class Product(RecordModel):
    id: str
    business_id: str
    sku: str
    name: str
    description: str | None = None
    category: str | None = None
    subcategory: str | None = None
    price: Decimal
    currency: str
    stock: int = Field(ge=0)
    images: list[ProductImage] = Field(default_factory=list)
    attributes: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    active: bool = True
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    @field_validator("price", mode="before")
    @classmethod
    def parse_price(cls, value: Any) -> Decimal:
        if isinstance(value, float):
            raise ValueError("price must be a fixed-precision decimal, not float")
        return Decimal(str(value)) if not isinstance(value, Decimal) else value
