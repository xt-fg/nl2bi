import json
import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.config import APP_DATABASE_URL, DATABASE_URL, DEFAULT_DATABASE_URL

logger = logging.getLogger(__name__)


DEFAULT_SEMANTIC_FIELDS = [
    ("sales", "amount", "销售额", "metric", "订单成交金额，默认用于销售规模分析", True),
    ("sales", "quantity", "销售数量", "metric", "订单中的商品数量", True),
    (
        "sales",
        "sale_date",
        "销售日期",
        "dimension",
        "销售发生日期，可用于趋势和周期分析",
        True,
    ),
    ("sales", "region", "销售区域", "dimension", "华北、华东等区域维度", True),
    ("sales", "product", "产品", "dimension", "商品名称", True),
    ("sales", "category", "产品类别", "dimension", "商品所属类别", True),
    ("customers", "city", "客户城市", "dimension", "客户所在城市", True),
    ("products", "price", "标价", "metric", "产品标准价格", True),
    ("products", "stock_quantity", "库存数量", "metric", "当前库存数量", True),
]

LLM_API_KEY_OVERRIDE_SETTING = "llm_api_key_override"
LLM_API_BASE_URL_OVERRIDE_SETTING = "llm_api_base_url_override"


class MetadataManager:
    """Stores product metadata outside the analytical database."""

    def __init__(self):
        self.engine: Optional[Engine] = None

    def initialize(self) -> None:
        self.engine = create_engine(APP_DATABASE_URL, echo=False)
        self._create_tables()
        self._seed_defaults()
        logger.info("应用元数据初始化完成")

    def _create_tables(self) -> None:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS data_sources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    connection_url TEXT NOT NULL,
                    connection_label TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """))
            columns = {
                row[1]
                for row in conn.execute(
                    text("PRAGMA table_info(data_sources)")
                ).fetchall()
            }
            if "connection_url" not in columns:
                conn.execute(
                    text("ALTER TABLE data_sources ADD COLUMN connection_url TEXT")
                )
                conn.execute(
                    text(
                        "UPDATE data_sources SET connection_url = :database_url WHERE connection_url IS NULL"
                    ),
                    {"database_url": DATABASE_URL},
                )
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS semantic_fields (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    table_name TEXT NOT NULL,
                    column_name TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    field_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    is_queryable INTEGER NOT NULL DEFAULT 1,
                    updated_at TEXT NOT NULL,
                    UNIQUE(table_name, column_name)
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS query_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query TEXT NOT NULL,
                    sql TEXT,
                    status TEXT NOT NULL,
                    row_count INTEGER NOT NULL DEFAULT 0,
                    execution_time REAL,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    error TEXT,
                    insight_summary TEXT,
                    created_at TEXT NOT NULL
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS saved_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    query TEXT NOT NULL,
                    sql TEXT,
                    data_json TEXT NOT NULL,
                    echarts_config_json TEXT,
                    insight_summary TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS app_settings (
                    setting_key TEXT PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """))

    def get_setting(self, key: str) -> Optional[str]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.connect() as conn:
            value = conn.execute(
                text(
                    "SELECT setting_value FROM app_settings WHERE setting_key = :key"
                ),
                {"key": key},
            ).scalar()
        return str(value) if value is not None else None

    def set_setting(self, key: str, value: str) -> None:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        now = datetime.utcnow().isoformat()
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO app_settings (setting_key, setting_value, updated_at)
                    VALUES (:key, :value, :updated_at)
                    ON CONFLICT(setting_key) DO UPDATE SET
                        setting_value = excluded.setting_value,
                        updated_at = excluded.updated_at
                """),
                {"key": key, "value": value, "updated_at": now},
            )

    def delete_setting(self, key: str) -> None:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.begin() as conn:
            conn.execute(
                text("DELETE FROM app_settings WHERE setting_key = :key"),
                {"key": key},
            )

    def _seed_defaults(self) -> None:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        now = datetime.utcnow().isoformat()
        with self.engine.begin() as conn:
            source_count = conn.execute(
                text("SELECT COUNT(*) FROM data_sources")
            ).scalar()
            if source_count == 0:
                conn.execute(
                    text("""
                        INSERT INTO data_sources
                            (name, kind, connection_url, connection_label, status, created_at, updated_at)
                        VALUES
                            (:name, :kind, :connection_url, :connection_label, :status, :created_at, :updated_at)
                    """),
                    {
                        "name": "默认销售数据源",
                        "kind": "sqlite",
                        "connection_url": DATABASE_URL,
                        "connection_label": self._mask_connection(DATABASE_URL),
                        "status": "active",
                        "created_at": now,
                        "updated_at": now,
                    },
                )
            else:
                conn.execute(
                    text("""
                        UPDATE data_sources
                        SET kind = :kind,
                            connection_url = :connection_url,
                            connection_label = :connection_label,
                            updated_at = :updated_at
                        WHERE name = '默认销售数据源'
                    """),
                    {
                        "kind": (
                            "sqlite" if DATABASE_URL.startswith("sqlite:") else "sql"
                        ),
                        "connection_url": DATABASE_URL,
                        "connection_label": self._mask_connection(DATABASE_URL),
                        "updated_at": now,
                    },
                )
            for (
                table_name,
                column_name,
                display_name,
                field_type,
                description,
                is_queryable,
            ) in DEFAULT_SEMANTIC_FIELDS:
                conn.execute(
                    text("""
                        INSERT OR IGNORE INTO semantic_fields
                            (table_name, column_name, display_name, field_type, description, is_queryable, updated_at)
                        VALUES
                            (:table_name, :column_name, :display_name, :field_type, :description, :is_queryable, :updated_at)
                    """),
                    {
                        "table_name": table_name,
                        "column_name": column_name,
                        "display_name": display_name,
                        "field_type": field_type,
                        "description": description,
                        "is_queryable": 1 if is_queryable else 0,
                        "updated_at": now,
                    },
                )

    @staticmethod
    def _mask_connection(url: str) -> str:
        if url == DEFAULT_DATABASE_URL or url.endswith("/data/nl2bi_analytics.db"):
            return "SQLite 示例数据集"
        if url == "sqlite:///:memory:":
            return "SQLite 临时数据集"
        if "@" in url:
            prefix, suffix = url.rsplit("@", 1)
            scheme = prefix.split("://", 1)[0]
            return f"{scheme}://***@{suffix}"
        return url

    def list_data_sources(self) -> list[dict[str, Any]]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT id, name, kind, connection_label, status, created_at, updated_at
                FROM data_sources
                ORDER BY id
            """)).mappings().all()
        return [dict(row) for row in rows]

    def get_active_data_source(self) -> Optional[dict[str, Any]]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.connect() as conn:
            row = conn.execute(text("""
                SELECT id, name, kind, connection_url, connection_label, status, created_at, updated_at
                FROM data_sources
                WHERE status = 'active'
                ORDER BY id DESC
                LIMIT 1
            """)).mappings().first()
        return dict(row) if row else None

    def save_data_source(
        self, name: str, kind: str, connection_url: str, activate: bool = True
    ) -> dict[str, Any]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        now = datetime.utcnow().isoformat()
        with self.engine.begin() as conn:
            if activate:
                conn.execute(
                    text(
                        "UPDATE data_sources SET status = 'inactive', updated_at = :updated_at"
                    ),
                    {"updated_at": now},
                )
            result = conn.execute(
                text("""
                    INSERT INTO data_sources
                        (name, kind, connection_url, connection_label, status, created_at, updated_at)
                    VALUES
                        (:name, :kind, :connection_url, :connection_label, :status, :created_at, :updated_at)
                """),
                {
                    "name": name,
                    "kind": kind,
                    "connection_url": connection_url,
                    "connection_label": self._mask_connection(connection_url),
                    "status": "active" if activate else "inactive",
                    "created_at": now,
                    "updated_at": now,
                },
            )
            source_id = int(result.lastrowid)

        sources = [
            source for source in self.list_data_sources() if source["id"] == source_id
        ]
        if not sources:
            raise KeyError(f"数据源不存在: {source_id}")
        return sources[0]

    def list_semantic_fields(self) -> list[dict[str, Any]]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT id, table_name, column_name, display_name, field_type,
                       description, is_queryable, updated_at
                FROM semantic_fields
                ORDER BY table_name, field_type, column_name
            """)).mappings().all()
        fields = [dict(row) for row in rows]
        for field in fields:
            field["is_queryable"] = bool(field["is_queryable"])
        return fields

    def update_semantic_field(
        self,
        table_name: str,
        column_name: str,
        display_name: str,
        field_type: str,
        description: str,
        is_queryable: bool,
    ) -> dict[str, Any]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        now = datetime.utcnow().isoformat()
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO semantic_fields
                        (table_name, column_name, display_name, field_type, description, is_queryable, updated_at)
                    VALUES
                        (:table_name, :column_name, :display_name, :field_type, :description, :is_queryable, :updated_at)
                    ON CONFLICT(table_name, column_name) DO UPDATE SET
                        display_name = excluded.display_name,
                        field_type = excluded.field_type,
                        description = excluded.description,
                        is_queryable = excluded.is_queryable,
                        updated_at = excluded.updated_at
                """),
                {
                    "table_name": table_name,
                    "column_name": column_name,
                    "display_name": display_name,
                    "field_type": field_type,
                    "description": description,
                    "is_queryable": 1 if is_queryable else 0,
                    "updated_at": now,
                },
            )
        return self.get_semantic_field(table_name, column_name)

    def get_semantic_field(self, table_name: str, column_name: str) -> dict[str, Any]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.connect() as conn:
            row = (
                conn.execute(
                    text("""
                    SELECT id, table_name, column_name, display_name, field_type,
                           description, is_queryable, updated_at
                    FROM semantic_fields
                    WHERE table_name = :table_name AND column_name = :column_name
                """),
                    {"table_name": table_name, "column_name": column_name},
                )
                .mappings()
                .first()
            )
        if not row:
            raise KeyError(f"语义字段不存在: {table_name}.{column_name}")
        field = dict(row)
        field["is_queryable"] = bool(field["is_queryable"])
        return field

    def build_semantic_context(self) -> str:
        fields = self.list_semantic_fields()
        if not fields:
            return ""

        lines = ["业务语义层:"]
        for field in fields:
            if not field["is_queryable"]:
                continue
            lines.append(
                f"- {field['table_name']}.{field['column_name']} = {field['display_name']}"
                f" ({field['field_type']}): {field['description']}"
            )
        return "\n".join(lines)

    def record_query(
        self,
        query: str,
        sql: Optional[str],
        status: str,
        row_count: int,
        execution_time: Optional[float],
        retry_count: int,
        error: Optional[str],
        insight_summary: Optional[str],
    ) -> int:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        now = datetime.utcnow().isoformat()
        with self.engine.begin() as conn:
            result = conn.execute(
                text("""
                    INSERT INTO query_records
                        (query, sql, status, row_count, execution_time, retry_count, error, insight_summary, created_at)
                    VALUES
                        (:query, :sql, :status, :row_count, :execution_time, :retry_count, :error, :insight_summary, :created_at)
                """),
                {
                    "query": query,
                    "sql": sql,
                    "status": status,
                    "row_count": row_count,
                    "execution_time": execution_time,
                    "retry_count": retry_count,
                    "error": error,
                    "insight_summary": insight_summary,
                    "created_at": now,
                },
            )
            return int(result.lastrowid)

    def list_query_records(self, limit: int = 50) -> list[dict[str, Any]]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.connect() as conn:
            rows = (
                conn.execute(
                    text("""
                    SELECT id, query, sql, status, row_count, execution_time,
                           retry_count, error, insight_summary, created_at
                    FROM query_records
                    ORDER BY id DESC
                    LIMIT :limit
                """),
                    {"limit": limit},
                )
                .mappings()
                .all()
            )
        return [dict(row) for row in rows]

    def save_report(
        self,
        name: str,
        description: Optional[str],
        query: str,
        sql: Optional[str],
        data: list[dict[str, Any]],
        echarts_config: Optional[dict[str, Any]],
        insight_summary: Optional[str],
    ) -> dict[str, Any]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        now = datetime.utcnow().isoformat()
        with self.engine.begin() as conn:
            result = conn.execute(
                text("""
                    INSERT INTO saved_reports
                        (name, description, query, sql, data_json, echarts_config_json,
                         insight_summary, created_at, updated_at)
                    VALUES
                        (:name, :description, :query, :sql, :data_json, :echarts_config_json,
                         :insight_summary, :created_at, :updated_at)
                """),
                {
                    "name": name,
                    "description": description,
                    "query": query,
                    "sql": sql,
                    "data_json": json.dumps(data, ensure_ascii=False),
                    "echarts_config_json": (
                        json.dumps(echarts_config, ensure_ascii=False)
                        if echarts_config
                        else None
                    ),
                    "insight_summary": insight_summary,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            report_id = int(result.lastrowid)
        return self.get_report(report_id)

    def list_reports(self) -> list[dict[str, Any]]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT id, name, description, query, sql, insight_summary, created_at, updated_at
                FROM saved_reports
                ORDER BY id DESC
            """)).mappings().all()
        return [dict(row) for row in rows]

    def get_report(self, report_id: int) -> dict[str, Any]:
        if not self.engine:
            raise RuntimeError("元数据引擎未初始化")

        with self.engine.connect() as conn:
            row = (
                conn.execute(
                    text("""
                    SELECT id, name, description, query, sql, data_json,
                           echarts_config_json, insight_summary, created_at, updated_at
                    FROM saved_reports
                    WHERE id = :report_id
                """),
                    {"report_id": report_id},
                )
                .mappings()
                .first()
            )

        if not row:
            raise KeyError(f"报表不存在: {report_id}")

        report = dict(row)
        report["data"] = json.loads(report.pop("data_json") or "[]")
        chart_json = report.pop("echarts_config_json")
        report["echarts_config"] = json.loads(chart_json) if chart_json else None
        return report


metadata_manager = MetadataManager()
