from typing import Dict, Any
from app.agent.state import AgentState
from app.agent.tools import generate_sql


def text2sql_node(state: AgentState) -> Dict[str, Any]:
    """Text2SQL 节点：将自然语言转换为 SQL"""
    print(f"[Text2SQL] 开始处理查询: {state['query']}")

    try:
        # 获取数据库 schema
        schema = state.get("schema", "")
        if not schema:
            raise ValueError("数据库 schema 未提供")

        # 获取错误历史
        errors = state.get("errors", [])

        # 生成 SQL
        sql = generate_sql(schema, state["query"], errors)

        print(f"[Text2SQL] 生成的 SQL: {sql}")

        return {
            "sql": sql,
            "errors": errors,  # 保持错误历史
            "retry_count": state.get("retry_count", 0),
        }

    except Exception as e:
        error_msg = f"Text2SQL 错误: {str(e)}"
        print(f"[Text2SQL] {error_msg}")

        # 将错误添加到历史
        errors = state.get("errors", [])
        errors.append(error_msg)

        return {
            "sql": None,
            "errors": errors,
            "retry_count": state.get("retry_count", 0) + 1,
            "is_complete": False,
            "response": {"error": error_msg},
        }