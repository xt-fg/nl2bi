from typing import Dict, Any
import pandas as pd

from app.agent.state import AgentState
from app.utils.database import db_manager


def execute_sql_node(state: AgentState) -> Dict[str, Any]:
    """SQL 执行沙盒节点：执行 SQL 并返回结果"""
    print(f"[ExecuteSQL] 开始执行 SQL: {state.get('sql')}")

    sql = state.get("sql")
    if not sql:
        error_msg = "没有可执行的 SQL 语句"
        print(f"[ExecuteSQL] {error_msg}")

        errors = state.get("errors", [])
        errors.append(error_msg)

        return {
            "data": None,
            "errors": errors,
            "retry_count": state.get("retry_count", 0) + 1,
            "is_complete": False,
            "response": {"error": error_msg},
        }

    try:
        # 执行 SQL 查询
        df = db_manager.execute_query(sql)

        # 空值拦截：检查 DataFrame 是否为空
        if df.empty:
            error_msg = "SQL 执行成功但返回空结果集，可能是业务逻辑错误"
            print(f"[ExecuteSQL] {error_msg}")

            errors = state.get("errors", [])
            errors.append(error_msg)

            return {
                "data": [],
                "errors": errors,
                "retry_count": state.get("retry_count", 0) + 1,
                "is_complete": False,
                "response": {"error": error_msg},
            }

        # 转换为字典列表
        data = df.to_dict("records")

        # 处理日期类型
        for record in data:
            for key, value in record.items():
                if isinstance(value, pd.Timestamp):
                    record[key] = value.isoformat()

        print(f"[ExecuteSQL] 查询成功，返回 {len(data)} 行数据")

        return {
            "data": data,
            "errors": state.get("errors", []),
            "retry_count": state.get("retry_count", 0),
            "is_complete": False,  # 还需要生成 Echarts 配置
        }

    except Exception as e:
        error_msg = f"SQL 执行错误: {str(e)}"
        print(f"[ExecuteSQL] {error_msg}")

        errors = state.get("errors", [])
        errors.append(error_msg)

        return {
            "data": None,
            "errors": errors,
            "retry_count": state.get("retry_count", 0) + 1,
            "is_complete": False,
            "response": {"error": error_msg},
        }