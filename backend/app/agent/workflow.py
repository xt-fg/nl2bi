import logging
from typing import Dict, Any, Literal

from langgraph.graph import StateGraph, END

from app.agent.state import AgentState
from app.agent.nodes.text2sql import text2sql_node
from app.agent.nodes.execute_sql import execute_sql_node
from app.agent.nodes.generate_echarts import generate_echarts_node

logger = logging.getLogger(__name__)


def should_retry(state: AgentState) -> Literal["text2sql", "generate_echarts"]:
    """决定是否需要重试"""
    retry_count = state.get("retry_count", 0)
    max_retries = state.get("max_retries", 3)
    has_errors = bool(state.get("errors"))

    logger.info("路由判断: retry_count=%d, max_retries=%d, has_errors=%s",
                retry_count, max_retries, has_errors)

    if has_errors and retry_count < max_retries:
        logger.info("决定重试 Text2SQL")
        return "text2sql"

    logger.info("继续生成 Echarts 配置")
    return "generate_echarts"


def create_workflow() -> StateGraph:
    """创建 LangGraph 工作流"""
    workflow = StateGraph(AgentState)

    workflow.add_node("text2sql", text2sql_node)
    workflow.add_node("execute_sql", execute_sql_node)
    workflow.add_node("generate_echarts", generate_echarts_node)

    workflow.set_entry_point("text2sql")
    workflow.add_edge("text2sql", "execute_sql")

    workflow.add_conditional_edges(
        "execute_sql",
        should_retry,
        {
            "text2sql": "text2sql",
            "generate_echarts": "generate_echarts",
        },
    )

    workflow.add_edge("generate_echarts", END)
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
