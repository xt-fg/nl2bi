import logging
from typing import Dict, Any

import pandas as pd

from app.agent.state import AgentState
from app.utils.database import db_manager

logger = logging.getLogger(__name__)


def execute_sql_node(state: AgentState) -> Dict[str, Any]:
    """SQL 执行沙盒节点：执行 SQL 并返回结果"""
    sql = state.get("sql")
    logger.info("开始执行 SQL: %s", sql)

    if not sql:
        error_msg = "没有可执行的 SQL 语句"
        logger.warning(error_msg)
        return {
            "data": None,
            "errors": state.get("errors", []) + [error_msg],
            "retry_count": state.get("retry_count", 0) + 1,
            "is_complete": False,
            "response": {"error": error_msg},
        }

    try:
        df = db_manager.execute_query(sql)

        # 空值拦截：DataFrame 为空视作业务逻辑错误
        if df.empty:
            error_msg = "SQL 执行成功但返回空结果集，可能是业务逻辑错误"
            logger.warning(error_msg)
            return {
                "data": [],
                "errors": state.get("errors", []) + [error_msg],
                "retry_count": state.get("retry_count", 0) + 1,
                "is_complete": False,
                "response": {"error": error_msg},
            }

        # 转换为字典列表，处理特殊类型
        data = df.to_dict("records")
        for record in data:
            for key, value in record.items():
                if isinstance(value, pd.Timestamp):
                    record[key] = value.isoformat()

        logger.info("查询成功，返回 %d 行数据", len(data))

        return {
            "data": data,
            "errors": state.get("errors", []),
            "retry_count": state.get("retry_count", 0),
            "is_complete": False,
        }

    except Exception as e:
        error_msg = f"SQL 执行错误: {e}"
        logger.exception(error_msg)
        return {
            "data": None,
            "errors": state.get("errors", []) + [error_msg],
            "retry_count": state.get("retry_count", 0) + 1,
            "is_complete": False,
            "response": {"error": error_msg},
        }
