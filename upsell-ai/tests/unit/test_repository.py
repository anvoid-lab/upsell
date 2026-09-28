"""The base repository owns scoping, soft deletion, exact money, and the CRUD
operations every service needs."""

from decimal import Decimal
from types import SimpleNamespace
from typing import Any

import pytest

from core.base.base_repository import BaseRepository
from core.context import TenantContext
from core.contracts.business import Business
from core.contracts.product import Product

NOW = "2026-09-25T00:00:00+00:00"


class FakeQuery:
    def __init__(self, client: FakeClient, table: str) -> None:
        self._client = client
        self._table = table

    def select(self, clause: str) -> FakeQuery:
        self._client.calls.append(("select", self._table, clause))
        return self

    def eq(self, column: str, value: Any) -> FakeQuery:
        self._client.calls.append(("eq", column, value))
        return self

    def is_(self, column: str, value: Any) -> FakeQuery:
        self._client.calls.append(("is", column, value))
        return self

    def in_(self, column: str, values: list[str]) -> FakeQuery:
        self._client.calls.append(("in", column, values))
        return self

    def order(self, column: str) -> FakeQuery:
        self._client.calls.append(("order", column))
        return self

    def maybe_single(self) -> FakeQuery:
        return self

    def insert(self, payload: dict[str, Any]) -> FakeQuery:
        self._client.calls.append(("insert", self._table, payload))
        return self

    def upsert(self, payload: dict[str, Any]) -> FakeQuery:
        self._client.calls.append(("upsert", self._table, payload))
        return self

    def update(self, payload: dict[str, Any]) -> FakeQuery:
        self._client.calls.append(("update", self._table, payload))
        return self

    def delete(self) -> FakeQuery:
        self._client.calls.append(("delete", self._table, None))
        return self

    async def execute(self) -> SimpleNamespace:
        self._client.calls.append(("execute", self._table, None))
        return SimpleNamespace(data=self._client.rows)


class FakeClient:
    def __init__(self, rows: Any = None) -> None:
        self.calls: list[tuple] = []
        self.rows = rows

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self, name)


def _tenant() -> TenantContext:
    return TenantContext(tenant_id="biz-1", actor_id="actor-1", trace_id="trace-1")


def _products(rows: Any = None) -> tuple[FakeClient, BaseRepository[Product]]:
    client = FakeClient(rows)
    return client, BaseRepository(client, "products", Product, soft_delete=True)


@pytest.mark.asyncio
async def test_reads_are_scoped_to_the_tenant_and_tenant_column() -> None:
    client, repo = _products(None)
    business = BaseRepository(client, "businesses", Business, tenant_column="id")

    assert await business.get(_tenant()) is None
    assert ("eq", "id", "biz-1") in client.calls


@pytest.mark.asyncio
async def test_reads_exclude_soft_deleted_rows() -> None:
    client, repo = _products([])

    assert await repo.find(_tenant(), equals={"active": True}) == []
    assert ("is", "deleted_at", "null") in client.calls
    assert ("eq", "business_id", "biz-1") in client.calls
    assert ("eq", "active", True) in client.calls


@pytest.mark.asyncio
async def test_empty_id_list_never_queries() -> None:
    client, repo = _products([])

    assert await repo.find(_tenant(), ids=[]) == []
    assert await repo.delete_many(_tenant(), ids=[]) == 0
    assert client.calls == []


@pytest.mark.asyncio
async def test_decimal_columns_are_selected_as_text() -> None:
    client, repo = _products([])

    await repo.find(_tenant())
    assert ("select", "products", "*,price_text:price::text") in client.calls


@pytest.mark.asyncio
async def test_insert_writes_money_as_text() -> None:
    client, repo = _products(None)

    with pytest.raises(ValueError):
        await repo.insert(_tenant(), {"id": "prod-1", "price": Decimal("2500.00")})

    assert ("insert", "products", {"id": "prod-1", "price": "2500.00"}) in client.calls


@pytest.mark.asyncio
async def test_insert_can_upsert() -> None:
    client, repo = _products(None)

    with pytest.raises(ValueError):
        await repo.insert(_tenant(), {"id": "prod-1"}, upsert=True)

    assert ("upsert", "products", {"id": "prod-1"}) in client.calls


@pytest.mark.asyncio
async def test_insert_returns_the_written_row() -> None:
    row = {
        "id": "prod-1",
        "business_id": "biz-1",
        "sku": "SKU-1",
        "name": "Capulana",
        "price_text": "2500.00",
        "currency": "AOA",
        "stock": 3,
        "created_at": NOW,
        "updated_at": NOW,
    }
    _client, repo = _products([row])

    product = await repo.insert(
        _tenant(), {"id": "prod-1", "price": Decimal("2500.00")}
    )

    assert product.price == Decimal("2500.00")
    assert product.id == "prod-1"


@pytest.mark.asyncio
async def test_update_requires_at_least_one_column() -> None:
    _, repo = _products([])

    with pytest.raises(ValueError):
        await repo.update(_tenant(), "prod-1", {})


@pytest.mark.asyncio
async def test_soft_deletion_marks_the_row_instead_of_removing_it() -> None:
    client, repo = _products([])

    assert await repo.delete(_tenant(), "prod-1") is False
    updates = [call for call in client.calls if call[0] == "update"]
    assert updates and "deleted_at" in updates[0][2]
    assert not [call for call in client.calls if call[0] == "delete"]


@pytest.mark.asyncio
async def test_delete_many_reports_how_many_rows_were_touched() -> None:
    client, repo = _products([{"id": "prod-1"}, {"id": "prod-2"}])

    assert await repo.delete_many(_tenant(), ids=["prod-1", "prod-2"]) == 2
    assert ("in", "id", ["prod-1", "prod-2"]) in client.calls


@pytest.mark.asyncio
async def test_a_table_without_soft_delete_is_removed_for_real() -> None:
    client = FakeClient([{"id": "biz-1"}])
    repo = BaseRepository(client, "businesses", Business, tenant_column="id")

    await repo.delete(_tenant(), "biz-1")

    assert ("delete", "businesses", None) in client.calls


@pytest.mark.asyncio
async def test_a_query_without_a_tenant_is_refused() -> None:
    _, repo = _products([])
    anonymous = TenantContext(tenant_id="", actor_id="a1", trace_id="t1")

    with pytest.raises(ValueError):
        await repo.find(anonymous)
