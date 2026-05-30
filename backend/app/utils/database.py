import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from typing import List, Dict, Any, Optional

from app.core.config import DATABASE_URL


class DatabaseManager:
    """数据库管理器，用于管理 SQLite 内存数据库"""

    def __init__(self):
        self.engine: Optional[Engine] = None

    def initialize(self):
        """初始化数据库连接"""
        self.engine = create_engine(DATABASE_URL, echo=False)
        self._create_tables()
        self._insert_sample_data()

    def _create_tables(self):
        """创建表结构"""
        if not self.engine:
            raise RuntimeError("数据库引擎未初始化")

        with self.engine.connect() as conn:
            # 销售表
            conn.execute(
                text(
                    """
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
            """
                )
            )

            # 客户表
            conn.execute(
                text(
                    """
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT,
                    registration_date DATE NOT NULL,
                    city TEXT,
                    country TEXT
                )
            """
                )
            )

            # 产品表
            conn.execute(
                text(
                    """
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    price REAL NOT NULL,
                    stock_quantity INTEGER NOT NULL
                )
            """
                )
            )

            conn.commit()

    def _insert_sample_data(self):
        """插入模拟数据"""
        if not self.engine:
            raise RuntimeError("数据库引擎未初始化")

        # 检查是否已有数据
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM sales"))
            count = result.scalar()
            if count > 0:
                return

        # 生成模拟数据
        import numpy as np
        from datetime import datetime, timedelta

        np.random.seed(42)

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
            "product": np.random.choice(products_data["name"], 1000).tolist(),
            "category": [],
            "amount": [],
            "quantity": np.random.randint(1, 10, 1000).tolist(),
            "sale_date": [
                (datetime.now() - timedelta(days=np.random.randint(1, 365))).strftime(
                    "%Y-%m-%d"
                )
                for _ in range(1000)
            ],
            "region": np.random.choice(
                ["华北", "华东", "华南", "西南", "西北", "东北"], 1000
            ).tolist(),
            "customer_id": np.random.randint(1, 51, 1000).tolist(),
        }

        # 根据产品设置类别和金额
        product_price_map = dict(
            zip(products_data["name"], products_data["price"])
        )
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
                    text(
                        """
                    INSERT INTO products (name, category, price, stock_quantity)
                    VALUES (:name, :category, :price, :stock_quantity)
                """
                    ),
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
                    text(
                        """
                    INSERT INTO customers (name, email, registration_date, city, country)
                    VALUES (:name, :email, :registration_date, :city, :country)
                """
                    ),
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
                    text(
                        """
                    INSERT INTO sales (product, category, amount, quantity, sale_date, region, customer_id)
                    VALUES (:product, :category, :amount, :quantity, :sale_date, :region, :customer_id)
                """
                    ),
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

        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(sql))
                columns = result.keys()
                data = result.fetchall()
                return pd.DataFrame(data, columns=columns)
        except Exception as e:
            raise Exception(f"SQL 执行错误: {str(e)}")

    def get_tables(self) -> List[Dict[str, Any]]:
        """获取所有表信息"""
        if not self.engine:
            raise RuntimeError("数据库引擎未初始化")

        tables = []
        with self.engine.connect() as conn:
            # 获取表名
            result = conn.execute(
                text(
                    """
                SELECT name FROM sqlite_master
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            """
                )
            )
            table_names = [row[0] for row in result.fetchall()]

            for table_name in table_names:
                # 获取列信息
                result = conn.execute(text(f"PRAGMA table_info({table_name})"))
                columns = [row[1] for row in result.fetchall()]
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