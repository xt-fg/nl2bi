from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime


class QueryRequest(BaseModel):
    """查询请求模型"""
    query: str = Field(..., description="自然语言查询", min_length=1, max_length=1000)


class QueryResponse(BaseModel):
    """查询响应模型"""
    sql: Optional[str] = Field(None, description="生成的 SQL 语句")
    data: Optional[List[Dict[str, Any]]] = Field(None, description="查询结果数据")
    echarts_config: Optional[Dict[str, Any]] = Field(
        None, description="Echarts 图表配置"
    )
    error: Optional[str] = Field(None, description="错误信息")
    execution_time: Optional[float] = Field(None, description="执行时间（秒）")
    retry_count: Optional[int] = Field(0, description="重试次数")


class TableInfo(BaseModel):
    """表信息模型"""
    name: str = Field(..., description="表名")
    columns: List[str] = Field(..., description="列名列表")
    row_count: Optional[int] = Field(None, description="行数")


class SchemaResponse(BaseModel):
    """数据库 schema 响应模型"""
    tables: List[TableInfo] = Field(..., description="表信息列表")
    description: Optional[str] = Field(None, description="数据库描述")


class ErrorResponse(BaseModel):
    """错误响应模型"""
    error: str = Field(..., description="错误信息")
    details: Optional[str] = Field(None, description="错误详情")
    timestamp: datetime = Field(default_factory=datetime.now, description="错误时间")


class HealthResponse(BaseModel):
    """健康检查响应模型"""
    status: str = Field(..., description="服务状态")
    version: str = Field(..., description="API 版本")
    timestamp: datetime = Field(default_factory=datetime.now, description="检查时间")


class AgentState(BaseModel):
    """LangGraph Agent 状态模型"""
    query: str = Field(..., description="原始查询")
    sql: Optional[str] = Field(None, description="生成的 SQL")
    data: Optional[List[Dict[str, Any]]] = Field(None, description="查询结果")
    echarts_config: Optional[Dict[str, Any]] = Field(
        None, description="Echarts 配置"
    )
    errors: List[str] = Field(default_factory=list, description="错误历史")
    retry_count: int = Field(0, description="当前重试次数")
    max_retries: int = Field(3, description="最大重试次数")
    is_complete: bool = Field(False, description="是否完成")
    schema: Optional[str] = Field(None, description="数据库 schema")