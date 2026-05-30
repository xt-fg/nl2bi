from typing import Dict, Any
import json

from app.agent.state import AgentState
from app.agent.tools import generate_echarts_config


def generate_echarts_node(state: AgentState) -> Dict[str, Any]:
    """生成 Echarts 配置节点：根据数据生成图表配置"""
    print("[GenerateEcharts] 开始生成 Echarts 配置")

    data = state.get("data")
    if not data:
        error_msg = "没有数据可用于生成图表"
        print(f"[GenerateEcharts] {error_msg}")

        errors = state.get("errors", [])
        errors.append(error_msg)

        return {
            "echarts_config": None,
            "errors": errors,
            "is_complete": True,  # 即使没有图表配置也标记为完成
            "response": {
                "sql": state.get("sql"),
                "data": [],
                "echarts_config": None,
                "error": error_msg,
            },
        }

    try:
        # 准备数据描述
        data_description = f"数据包含 {len(data)} 行记录。\n"

        if data:
            # 添加列信息
            columns = list(data[0].keys())
            data_description += f"列名: {', '.join(columns)}\n"

            # 添加示例数据
            data_description += "示例数据（前3行）:\n"
            for i, record in enumerate(data[:3]):
                data_description += f"行 {i+1}: {json.dumps(record, ensure_ascii=False)}\n"

            # 添加数据统计
            numeric_columns = []
            for col in columns:
                if isinstance(data[0].get(col), (int, float)):
                    numeric_columns.append(col)

            if numeric_columns:
                data_description += f"数值列: {', '.join(numeric_columns)}\n"

        # 生成 Echarts 配置
        echarts_config = generate_echarts_config(data_description, data)

        print(f"[GenerateEcharts] 成功生成 Echarts 配置")

        return {
            "echarts_config": echarts_config,
            "errors": state.get("errors", []),
            "is_complete": True,
            "response": {
                "sql": state.get("sql"),
                "data": data,
                "echarts_config": echarts_config,
                "error": None,
            },
        }

    except Exception as e:
        error_msg = f"生成 Echarts 配置错误: {str(e)}"
        print(f"[GenerateEcharts] {error_msg}")

        errors = state.get("errors", [])
        errors.append(error_msg)

        return {
            "echarts_config": None,
            "errors": errors,
            "is_complete": True,  # 即使生成图表失败也标记为完成
            "response": {
                "sql": state.get("sql"),
                "data": data,
                "echarts_config": None,
                "error": error_msg,
            },
        }