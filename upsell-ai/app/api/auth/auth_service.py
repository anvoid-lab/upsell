from dataclasses import dataclass

from core.base.base_repository import BaseRepository
from core.base.base_service import BaseService
from core.contracts.business import Business


@dataclass
class AuthService(BaseService[Business]):
    @property
    def repo(self):
        return BaseRepository[Business](
            client=self.ctx.dbconn,
            table="businesses",
            model=Business,
            tenant=self.ctx.tenant,
        )

    async def get_account_business(self) -> Business | None:
        return await self.repo.get(self.ctx.tenant.tenant_id)
