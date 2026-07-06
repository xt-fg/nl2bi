import logging
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool
from typing import List, Dict, Any, Optional

from app.core.config import (
    DATA_DIR,
    DATABASE_URL,
    DEFAULT_DATABASE_URL,
    SAMPLE_DATA_ROWS,
)

logger = logging.getLogger(__name__)


class DatabaseManager:
    """数据库管理器，用于管理当前分析数据源"""

    def __init__(self):
        self.engine: Optional[Engine] = None
        self.database_url = DATABASE_URL

    def initialize(self, database_url: Optional[str] = None):
        """初始化数据库连接"""
        self.database_url = database_url or DATABASE_URL

        kwargs: Dict[str, Any] = {}
        if self._is_sqlite_url(self.database_url):
            kwargs["connect_args"] = {"check_same_thread": False}
        if self.database_url == "sqlite:///:memory:":
            # 临时 SQLite 连接需要 StaticPool 保证多线程共享同一份数据
            kwargs["poolclass"] = StaticPool
        sqlite_path = self._sqlite_database_path(self.database_url)
        if sqlite_path:
            sqlite_path.parent.mkdir(parents=True, exist_ok=True)

        self.engine = create_engine(self.database_url, echo=False, **kwargs)
        if self._is_builtin_sample_source(self.database_url):
            self._create_tables()
            self._insert_sample_data()
        else:
            self.test_connection(self.database_url)
        logger.info("数据库初始化完成")

    def switch_database(self, database_url: str):
        """切换当前分析数据源"""
        self.test_connection(database_url)
        self.initialize(database_url)

    @staticmethod
    def test_connection(database_url: str) -> None:
        """测试数据库连接"""
        kwargs: Dict[str, Any] = {}
        if DatabaseManager._is_sqlite_url(database_url):
            kwargs["connect_args"] = {"check_same_thread": False}
        if database_url == "sqlite:///:memory:":
            kwargs["poolclass"] = StaticPool
        engine = create_engine(database_url, echo=False, **kwargs)
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        finally:
            engine.dispose()

    @staticmethod
    def _is_sqlite_url(database_url: str) -> bool:
        return database_url.startswith("sqlite:")

    @staticmethod
    def _is_builtin_sample_source(database_url: str) -> bool:
        sqlite_path = DatabaseManager._sqlite_database_path(database_url)
        return (
            database_url in {DEFAULT_DATABASE_URL, "sqlite:///:memory:"}
            or sqlite_path == DATA_DIR / "nl2bi_analytics.db"
        )

    @staticmethod
    def _sqlite_database_path(database_url: str) -> Optional[Path]:
        if (
            not database_url.startswith("sqlite:///")
            or database_url == "sqlite:///:memory:"
        ):
            return None
        raw_path = database_url.removeprefix("sqlite:///")
        path = Path(raw_path)
        if not path.is_absolute():
            path = Path.cwd() / path
        return path.resolve()

    def _create_tables(self):
        """创建表结构"""
        if not self.engine:
            raise RuntimeError("数据库引擎未初始化")

        with self.engine.connect() as conn:
            # 销售表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS sales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product TEXT NOT NULL,
                    category TEXT NOT NULL,
                    amount REAL NOT NULL,
                    quantity INTEGER NOT NULL,
                    sale_date DATE NOT NULL,
                    region TEXT NOT NULL,
                    customer_id INTEGER
                )
            """))

            # 客户表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT,
                    registration_date DATE NOT NULL,
                    city TEXT,
                    country TEXT
                )
            """))

            # 产品表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    price REAL NOT NULL,
                    stock_quantity INTEGER NOT NULL
                )
            """))

            conn.commit()

    def _insert_sample_data(self):
        """插入内置示例数据"""
        if not self.engine:
            raise RuntimeError("数据库引擎未初始化")

        # 检查是否已有数据
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM sales"))
            count = result.scalar()
            if count > 0:
                return

        # 生成示例数据
        import numpy as np
        from datetime import datetime, timedelta

        np.random.seed(42)
        row_count = SAMPLE_DATA_ROWS

        # 产品数据
        products_data = {
            "name": [
                "笔记本电脑",
                "智能手机",
                "平板电脑",
                "智能手表",
                "耳机",
                "键盘",
                "鼠标",
                "显示器",
                "打印机",
                "路由器",
            ],
            "category": [
                "电脑",
                "手机",
                "平板",
                "穿戴",
                "配件",
                "配件",
                "配件",
                "显示器",
                "办公",
                "网络",
            ],
            "price": [
                5999,
                3999,
                2999,
                1599,
                899,
                499,
                299,
                1999,
                1299,
                399,
            ],
            "stock_quantity": [100, 150, 80, 200, 300, 250, 400, 120, 90, 180],
        }

        # 客户数据
        customers_data = {
            "name": [f"客户{i}" for i in range(1, 51)],
            "email": [f"customer{i}@example.com" for i in range(1, 51)],
            "registration_date": [
                (datetime.now() - timedelta(days=np.random.randint(1, 365))).strftime(
                    "%Y-%m-%d"
                )
                for _ in range(50)
            ],
            "city": np.random.choice(
                ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "南京"], 50
            ).tolist(),
            "country": ["中国"] * 50,
        }

        # 销售数据
        sales_data = {
            "product": np.random.choice(products_data["name"], row_count).tolist(),
            "category": [],
            "amount": [],
            "quantity": np.random.randint(1, 10, row_count).tolist(),
            "sale_date": [
                (datetime.now() - timedelta(days=np.random.randint(1, 365))).strftime(
                    "%Y-%m-%d"
                )
                for _ in range(row_count)
            ],
            "region": np.random.choice(
                ["华北", "华东", "华南", "西南", "西北", "东北"], row_count
            ).tolist(),
            "customer_id": np.random.randint(1, 51, row_count).tolist(),
        }

        # 根据产品设置类别和金额
        product_price_map = dict(zip(products_data["name"], products_data["price"]))
        product_category_map = dict(
            zip(products_data["name"], products_data["category"])
        )

        for product in sales_data["product"]:
            sales_data["category"].append(product_category_map[product])
            sales_data["amount"].append(
                product_price_map[product]
                * sales_data["quantity"][len(sales_data["amount"])]
            )

        # 插入数据
        with self.engine.connect() as conn:
            # 插入产品数据
            for i in range(len(products_data["name"])):
                conn.execute(
                    text("""
                    INSERT INTO products (name, category, price, stock_quantity)
                    VALUES (:name, :category, :price, :stock_quantity)
                """),
                    {
                        "name": products_data["name"][i],
                        "category": products_data["category"][i],
                        "price": products_data["price"][i],
                        "stock_quantity": products_data["stock_quantity"][i],
                    },
                )

            # 插入客户数据
            for i in range(len(customers_data["name"])):
                conn.execute(
                    text("""
                    INSERT INTO customers (name, email, registration_date, city, country)
                    VALUES (:name, :email, :registration_date, :city, :country)
                """),
                    {
                        "name": customers_data["name"][i],
                        "email": customers_data["email"][i],
                        "registration_date": customers_data["registration_date"][i],
                        "city": customers_data["city"][i],
                        "country": customers_data["country"][i],
                    },
                )

            # 插入销售数据
            for i in range(len(sales_data["product"])):
                conn.execute(
                    text("""
                    INSERT INTO sales (product, category, amount, quantity, sale_date, region, customer_id)
                    VALUES (:product, :category, :amount, :quantity, :sale_date, :region, :customer_id)
                """),
                    {
                        "product": sales_data["product"][i],
                        "category": sales_data["category"][i],
                        "amount": sales_data["amount"][i],
                        "quantity": sales_data["quantity"][i],
                        "sale_date": sales_data["sale_date"][i],
                        "region": sales_data["region"][i],
                        "customer_id": sales_data["customer_id"][i],
                    },
                )

            conn.commit()

    def execute_query(self, sql: str) -> pd.DataFrame:
        """执行 SQL 查询并返回 DataFrame"""
        if not self.engine:
            raise RuntimeError("数据库引擎未初始化")

        logger.debug("执行 SQL: %s", sql)
        self._check_sql_safety(sql)
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(sql))
                columns = result.keys()
                data = result.fetchall()
                df = pd.DataFrame(data, columns=columns)
                logger.debug("查询返回 %d 行", len(df))
                return df
        except Exception as e:
            logger.error("SQL 执行错误: %s", e)
            raise Exception(f"SQL 执行错误: {e}") from e

    @staticmethod
    def _check_sql_safety(sql: str):
        """检查 SQL 安全性，拦截危险操作"""
        normalized = sql.strip().upper()
        # 只允许 SELECT 和 WITH (CTE)
        if not (normalized.startswith("SELECT") or normalized.startswith("WITH")):
            raise Exception(
                f"安全拦截: 只允许 SELECT 查询，不允许 {normalized.split()[0]} 操作"
            )

        dangerous_keywords = [
            "DROP",
            "DELETE",
            "UPDATE",
            "INSERT",
            "ALTER",
            "TRUNCATE",
            "EXEC",
            "EXECUTE",
        ]
        for keyword in dangerous_keywords:
            # 检查是否作为独立关键字出现（避免误匹配如 "UPDATED_AT"）
            if f" {keyword} " in f" {normalized} " or normalized.startswith(
                f"{keyword} "
            ):
                raise Exception(f"安全拦截: 检测到危险关键字 {keyword}")

    def get_tables(self) -> List[Dict[str, Any]]:
        """获取所有表信息"""
        if not self.engine:
            raise RuntimeError("数据库引擎未初始化")

        tables = []
        with self.engine.connect() as conn:
            # 获取表名
            inspector_query = text("""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                """)
            try:
                result = conn.execute(inspector_query)
                table_names = [row[0] for row in result.fetchall()]
            except Exception:
                from sqlalchemy import inspect

                table_names = inspect(self.engine).get_table_names()

            for table_name in table_names:
                # 获取列信息
                try:
                    result = conn.execute(text(f"PRAGMA table_info({table_name})"))
                    columns = [row[1] for row in result.fetchall()]
                except Exception:
                    from sqlalchemy import inspect

                    columns = [
                        column["name"]
                        for column in inspect(self.engine).get_columns(table_name)
                    ]
                tables.append({"name": table_name, "columns": columns})

        return tables

    def get_schema(self) -> str:
        """获取数据库 schema 的文本描述"""
        tables = self.get_tables()
        schema_parts = []
        for table in tables:
            columns_str = ", ".join(table["columns"])
            schema_parts.append(f"表 {table['name']} ({columns_str})")
        return "\n".join(schema_parts)


# 全局数据库管理器实例
db_manager = DatabaseManager()
