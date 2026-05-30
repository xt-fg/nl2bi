from typing import TypedDict, List, Optional, Dict, Any


class AgentState(TypedDict):
    """LangGraph Agent 状态定义"""

    # 原始查询
    query: str

    # 生成的 SQL
    sql: Optional[str]

    # 查询结果数据
    data: Optional[List[Dict[str, Any]]]

    # Echarts 配置
    echarts_config: Optional[Dict[str, Any]]

    # 错误历史列表 - 轨迹记忆
    errors: List[str]

    # 当前重试次数
    retry_count: int

    # 最大重试次数
    max_retries: int

    # 是否完成
    is_complete: bool

    # 数据库 schema
    schema: Optional[str]

    # 最终响应
    response: Optional[Dict[str, Any]]