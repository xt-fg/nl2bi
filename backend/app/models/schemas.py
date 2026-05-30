from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class QueryRequest(BaseModel):
    """查询请求"""
    query: str = Field(..., description="自然语言查询", min_length=1, max_length=1000)


class QueryResponse(BaseModel):
    """查询响应"""
    sql: Optional[str] = Field(None, description="生成的 SQL 语句")
    data: Optional[List[Dict[str, Any]]] = Field(None, description="查询结果数据")
    echarts_config: Optional[Dict[str, Any]] = Field(None, description="Echarts 图表配置")
    error: Optional[str] = Field(None, description="错误信息")
    execution_time: Optional[float] = Field(None, description="执行时间（秒）")
    retry_count: Optional[int] = Field(0, description="重试次数")


class ChatRequest(BaseModel):
    """基于查询结果的追问请求"""
    message: str = Field(..., description="用户问题", min_length=1)
    context: Dict[str, Any] = Field(..., description="查询结果上下文")


class ChatResponse(BaseModel):
    """追问响应"""
    response: str = Field("", description="回答内容")
    error: Optional[str] = Field(None, description="错误信息")


class TableInfo(BaseModel):
    """表信息"""
    name: str = Field(..., description="表名")
    columns: List[str] = Field(..., description="列名列表")


class SchemaResponse(BaseModel):
    """数据库 schema 响应"""
    tables: List[TableInfo] = Field(..., description="表信息列表")
    description: Optional[str] = Field(None, description="数据库描述")


class SqlExecuteRequest(BaseModel):
    """SQL 直接执行请求"""
    sql: str = Field(..., description="SQL 语句", min_length=1)


class SqlExecuteResponse(BaseModel):
    """SQL 直接执行响应"""
    sql: str = Field(..., description="执行的 SQL")
    data: Optional[List[Dict[str, Any]]] = Field(None, description="查询结果")
    echarts_config: Optional[Dict[str, Any]] = Field(None, description="Echarts 配置")
    error: Optional[str] = Field(None, description="错误信息")
    execution_time: Optional[float] = Field(None, description="执行时间")
