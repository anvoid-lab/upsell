from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, TypeVar

from fastapi import status
from pydantic import BaseModel

from app.lib.database.client import DatabaseClient
from core.context import TenantContext
from core.exception import AppException

ModelT = TypeVar("ModelT", bound=BaseModel)


@dataclass
class BaseRepository[ModelT: BaseModel]:
    client: DatabaseClient
    table: str
    model: type[ModelT]
    tenant: TenantContext

    async def get(self, id: str) -> ModelT | None:
        try:
            response = await (
                self.client.table(self.table)
                .select("*")
                .eq("id", id)
                .eq("business_id", self.tenant.tenant_id)
                .maybe_single()
                .execute()
            )

            if not response.data:  # type: ignore
                return None

            return self.model.model_validate(response.data)  # type: ignore

        except Exception as exc:
            raise AppException(
                message=str(exc),
                status=status.HTTP_400_BAD_REQUEST,
            ) from exc

    async def findAll(self, limit: int = 20, page: int = 1) -> list[ModelT]:
        try:
            start = (page - 1) * limit
            end = start + limit - 1

            response = await (
                self.client.table(self.table).select("*").range(start, end).execute()
            )

            return [self.model.model_validate(item) for item in response.data]

        except Exception as exc:
            raise AppException(
                status=status.HTTP_400_BAD_REQUEST,
                message="repository_find_all_error",
                error=str(exc),
            ) from exc

    async def set(
        self, data: BaseModel | dict[str, Any], upsert: bool = False
    ) -> ModelT:
        try:
            payload = (
                data.model_dump(exclude_unset=True)
                if isinstance(data, BaseModel)
                else dict(data)
            )

            # payload.setdefault("id", new_id())

            query = self.client.table(self.table)

            if upsert:
                response = await query.upsert(payload).execute()
            else:
                response = await query.insert(payload).execute()

            return self.model.model_validate(response.data[0])

        except Exception as exc:
            raise AppException(
                message="repository_set_error",
                status=status.HTTP_400_BAD_REQUEST,
                error=str(exc),
            ) from exc

    async def delete(self, ids: list[str], softdelete: bool = False) -> None:
        try:
            if not ids:
                return

            query = self.client.table(self.table)

            if softdelete:
                await (
                    query.update({"deleted_at": datetime.now(UTC).isoformat()})
                    .in_("id", ids)
                    .execute()
                )
            else:
                await query.delete().in_("id", ids).execute()

        except Exception as exc:
            raise AppException(
                message="repository_delete_error",
                status=status.HTTP_400_BAD_REQUEST,
                error=str(exc),
            ) from exc

    async def query(self, query: str, params: tuple[Any, ...] = ()) -> Any:
        try:
            response = await self.client.rpc(
                "exec_sql",
                {"query": query, "params": list(params)},
            ).execute()

            return response.data

        except Exception as exc:
            raise AppException(
                message="repository_query_error",
                status=status.HTTP_400_BAD_REQUEST,
                error=str(exc),
            ) from exc

    async def transaction(self, operations: list[dict[str, Any]]) -> Any:
        try:
            response = await self.client.rpc(
                "exec_transaction",
                {
                    "operations": operations,
                },
            ).execute()

            return response.data

        except Exception as exc:
            raise AppException(
                message="repository_transaction_error",
                status=status.HTTP_400_BAD_REQUEST,
                error=str(exc),
            ) from exc
