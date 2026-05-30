from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, END

from app.agent.state import AgentState
from app.agent.nodes.text2sql import text2sql_node
from app.agent.nodes.execute_sql import execute_sql_node
from app.agent.nodes.generate_echarts import generate_echarts_node


def should_retry(state: AgentState) -> Literal["text2sql", "generate_echarts"]:
    """决定是否需要重试"""
    print(f"[Router] 检查重试条件: retry_count={state.get('retry_count', 0)}, max_retries={state.get('max_retries', 3)}")

    # 检查是否有错误且未超过最大重试次数
    if state.get("errors") and state.get("retry_count", 0) < state.get("max_retries", 3):
        print("[Router] 决定重试 Text2SQL")
        return "text2sql"

    # 如果没有错误或超过最大重试次数，继续生成 Echarts 配置
    print("[Router] 继续生成 Echarts 配置")
    return "generate_echarts"


def create_workflow() -> StateGraph:
    """创建 LangGraph 工作流"""
    # 创建状态图
    workflow = StateGraph(AgentState)

    # 添加节点
    workflow.add_node("text2sql", text2sql_node)
    workflow.add_node("execute_sql", execute_sql_node)
    workflow.add_node("generate_echarts", generate_echarts_node)

    # 设置入口点
    workflow.set_entry_point("text2sql")

    # 添加边
    workflow.add_edge("text2sql", "execute_sql")

    # 添加条件边：根据是否需要重试
    workflow.add_conditional_edges(
        "execute_sql",
        should_retry,
        {
            "text2sql": "text2sql",  # 重试
            "generate_echarts": "generate_echarts",  # 继续
        },
    )

    # 生成 Echarts 后结束
    workflow.add_edge("generate_echarts", END)

    return workflow


def run_workflow(query: str, schema: str, max_retries: int = 3) -> Dict[str, Any]:
    """运行工作流"""
    print(f"[Workflow] 开始处理查询: {query}")

    # 创建初始状态
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

    # 编译并运行工作流
    workflow = create_workflow()
    app = workflow.compile()

    # 执行工作流
    final_state = app.invoke(initial_state)

    print(f"[Workflow] 工作流完成")

    # 返回最终响应
    return final_state.get("response", {"error": "工作流未产生响应"})