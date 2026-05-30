import logging
from typing import Dict, Any

from app.agent.state import AgentState
from app.agent.tools import generate_sql

logger = logging.getLogger(__name__)


def text2sql_node(state: AgentState) -> Dict[str, Any]:
    """Text2SQL 节点：将自然语言转换为 SQL"""
    logger.info("Text2SQL 开始处理: %s", state["query"])

    try:
        schema = state.get("schema", "")
        if not schema:
            raise ValueError("数据库 schema 未提供")

        errors = state.get("errors", [])
        sql = generate_sql(schema, state["query"], errors)

        logger.info("生成的 SQL: %s", sql)

        return {
            "sql": sql,
            "errors": errors,
            "retry_count": state.get("retry_count", 0),
        }

    except Exception as e:
        error_msg = f"Text2SQL 错误: {e}"
        logger.exception(error_msg)

        errors = state.get("errors", []) + [error_msg]
        return {
            "sql": None,
            "errors": errors,
            "retry_count": state.get("retry_count", 0) + 1,
            "is_complete": False,
            "response": {"error": error_msg},
        }
