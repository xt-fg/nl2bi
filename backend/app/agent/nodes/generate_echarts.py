import logging
from typing import Dict, Any

from app.agent.state import AgentState
from app.agent.tools import generate_echarts_config

logger = logging.getLogger(__name__)


def generate_echarts_node(state: AgentState) -> Dict[str, Any]:
    """生成 Echarts 配置节点：根据数据生成图表配置"""
    logger.info("开始生成 Echarts 配置")

    data = state.get("data")
    sql = state.get("sql", "")

    if not data:
        error_msg = "没有数据可用于生成图表"
        logger.warning(error_msg)
        return {
            "echarts_config": None,
            "errors": state.get("errors", []),
            "is_complete": True,
            "response": {
                "sql": sql,
                "data": [],
                "echarts_config": None,
                "error": error_msg,
                "error_detail": "请先完成一次有结果的数据查询，再生成图表。",
                "suggestions": [
                    "换一种说法重新提问，明确要统计的指标和维度",
                    "减少时间、地区、产品或类别等筛选条件后再试",
                    "使用数据中存在的取值，例如 华北、华东、手机、电脑",
                ],
                "retry_count": state.get("retry_count", 0),
            },
        }

    try:
        echarts_config = generate_echarts_config(sql, data)
        logger.info("成功生成 Echarts 配置")

        return {
            "echarts_config": echarts_config,
            "errors": state.get("errors", []),
            "is_complete": True,
            "response": {
                "sql": sql,
                "data": data,
                "echarts_config": echarts_config,
                "error": None,
                "retry_count": state.get("retry_count", 0),
            },
        }

    except Exception as e:
        error_msg = f"生成 Echarts 配置错误: {e}"
        logger.exception(error_msg)

        return {
            "echarts_config": None,
            "errors": state.get("errors", []) + [error_msg],
            "is_complete": True,
            "response": {
                "sql": sql,
                "data": data,
                "echarts_config": None,
                "error": error_msg,
                "retry_count": state.get("retry_count", 0),
            },
        }
