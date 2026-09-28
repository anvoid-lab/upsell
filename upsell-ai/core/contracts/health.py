from typing import Literal

from core.contracts.base import ContractModel

CheckState = Literal["ok", "unavailable", "unknown"]


class HealthResponse(ContractModel):
    status: Literal["ok", "degraded"]
    redis: CheckState
    database: CheckState
