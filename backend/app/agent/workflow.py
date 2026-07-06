import logging
from typing import Dict, Any, Literal

from langgraph.graph import StateGraph, END

from app.agent.state import AgentState
from app.agent.nodes.text2sql import text2sql_node
from app.agent.nodes.execute_sql import execute_sql_node
from app.agent.nodes.generate_echarts import generate_echarts_node

logger = logging.getLogger(__name__)


def _failure_suggestions(error_msg: str) -> list[str]:
    """根据失败原因给用户可操作的调整建议"""
    suggestions = [
        "换一种说法重新提问，明确要统计的指标和维度",
        "减少时间、地区、产品或类别等筛选条件后再试",
        "使用数据中存在的取值，例如 华北、华东、手机、电脑",
    ]

    if "空结果" in error_msg:
        return suggestions

    if "no such column" in error_msg.lower() or "no such table" in error_msg.lower():
        return [
            "换一种说法重新提问，尽量使用销售额、地区、产品、类别、客户等业务词",
            "避免使用数据表中不存在的字段名或别名",
            "也可以展开最后生成的 SQL，手动调整后执行",
        ]

    return suggestions


def finalize_error_node(state: AgentState) -> Dict[str, Any]:
    """失败终止节点：重试耗尽后返回清晰的错误响应"""
    errors = state.get("errors", [])
    error_msg = errors[-1] if errors else "查询失败，未产生有效结果"
    retry_count = state.get("retry_count", 0)

    logger.warning(
        "工作流失败终止: retry_count=%d, max_retries=%d, error=%s",
        retry_count,
        state.get("max_retries", 3),
        error_msg,
    )

    return {
        "is_complete": True,
        "response": {
            "sql": state.get("sql"),
            "data": state.get("data"),
            "echarts_config": None,
            "error": f"查询失败，已自动重试 {retry_count} 次仍未得到有效结果。",
            "error_detail": f"最后错误：{error_msg}",
            "errors": errors,
            "suggestions": _failure_suggestions(error_msg),
            "retry_count": retry_count,
        },
    }


def should_retry(state: AgentState) -> Literal["text2sql", "generate_echarts", "finalize_error"]:
    """决定是否需要重试"""
    retry_count = state.get("retry_count", 0)
    max_retries = state.get("max_retries", 3)
    has_errors = bool(state.get("errors"))
    has_data = bool(state.get("data"))

    logger.info(
        "路由判断: retry_count=%d, max_retries=%d, has_errors=%s, has_data=%s",
        retry_count,
        max_retries,
        has_errors,
        has_data,
    )

    if has_data:
        logger.info("SQL 已返回数据，继续生成 Echarts 配置")
        return "generate_echarts"

    if has_errors and retry_count < max_retries:
        logger.info("决定重试 Text2SQL")
        return "text2sql"

    logger.info("重试耗尽，返回失败响应")
    return "finalize_error"


def create_workflow() -> StateGraph:
    """创建 LangGraph 工作流"""
    workflow = StateGraph(AgentState)

    workflow.add_node("text2sql", text2sql_node)
    workflow.add_node("execute_sql", execute_sql_node)
    workflow.add_node("generate_echarts", generate_echarts_node)
    workflow.add_node("finalize_error", finalize_error_node)

    workflow.set_entry_point("text2sql")
    workflow.add_edge("text2sql", "execute_sql")

    workflow.add_conditional_edges(
        "execute_sql",
        should_retry,
        {
            "text2sql": "text2sql",
            "generate_echarts": "generate_echarts",
            "finalize_error": "finalize_error",
        },
    )

    workflow.add_edge("generate_echarts", END)
    workflow.add_edge("finalize_error", END)
    return workflow


# 工作流单例
_workflow_app = None


def _get_workflow_app():
    """获取编译后的工作流单例"""
    global _workflow_app
    if _workflow_app is None:
        workflow = create_workflow()
        _workflow_app = workflow.compile()
    return _workflow_app


def run_workflow(query: str, schema: str, max_retries: int = 3) -> Dict[str, Any]:
    """运行工作流"""
    logger.info("开始处理查询: %s", query)

    initial_state: AgentState = {
        "query": query,
        "sql": None,
        "data": None,
        "echarts_config": None,
        "errors": [],
        "retry_count": 0,
        "max_retries": max_retries,
        "is_complete": False,
        "schema": schema,
        "response": None,
    }

    app = _get_workflow_app()
    final_state = app.invoke(initial_state)

    logger.info("工作流完成")
    return final_state.get("response", {"error": "工作流未产生响应"})
