from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from app.utils.database import DatabaseManager


def _manager_with_rows(row_count: int = 10) -> DatabaseManager:
    manager = DatabaseManager()
    manager.engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with manager.engine.begin() as conn:
        conn.execute(text("CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT)"))
        conn.execute(
            text("INSERT INTO items (id, value) VALUES (:id, :value)"),
            [{"id": index, "value": f"item-{index}"} for index in range(row_count)],
        )
    return manager


def test_execute_query_caps_rows_without_rewriting_sql():
    manager = _manager_with_rows(10)

    result = manager.execute_query(
        "SELECT id, value FROM items ORDER BY id", max_rows=3
    )

    assert result.to_dict("records") == [
        {"id": 0, "value": "item-0"},
        {"id": 1, "value": "item-1"},
        {"id": 2, "value": "item-2"},
    ]


def test_execute_query_returns_all_rows_below_cap():
    manager = _manager_with_rows(2)

    result = manager.execute_query("SELECT id FROM items ORDER BY id", max_rows=10)

    assert result["id"].tolist() == [0, 1]
