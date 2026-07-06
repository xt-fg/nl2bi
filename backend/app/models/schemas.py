from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class QueryRequest(BaseModel):
    """查询请求"""
    query: str = Field(..., description="自然语言查询", min_length=1, max_length=1000)


class LoginRequest(BaseModel):
    """登录请求"""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    """登录响应"""
    token: str
    username: str
    role: str


class CurrentUserResponse(BaseModel):
    """当前用户"""
    username: str
    role: str


class QueryResponse(BaseModel):
    """查询响应"""
    query_id: Optional[int] = Field(None, description="持久化查询记录 ID")
    sql: Optional[str] = Field(None, description="生成的 SQL 语句")
    data: Optional[List[Dict[str, Any]]] = Field(None, description="查询结果数据")
    echarts_config: Optional[Dict[str, Any]] = Field(None, description="Echarts 图表配置")
    insight_summary: Optional[str] = Field(None, description="自动生成的数据洞察摘要")
    error: Optional[str] = Field(None, description="错误信息")
    error_detail: Optional[str] = Field(None, description="错误详情")
    suggestions: Optional[List[str]] = Field(None, description="失败后的调整建议")
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
    insight_summary: Optional[str] = Field(None, description="自动生成的数据洞察摘要")
    error: Optional[str] = Field(None, description="错误信息")
    execution_time: Optional[float] = Field(None, description="执行时间")


class DataSourceInfo(BaseModel):
    """数据源信息"""
    id: int
    name: str
    kind: str
    connection_label: str
    status: str
    table_count: int = 0
    row_count: int = 0
    created_at: str
    updated_at: str


class DataSourceTestRequest(BaseModel):
    """测试数据源连接"""
    database_url: str = Field(..., min_length=1, description="SQLAlchemy 数据库连接 URL")


class DataSourceCreateRequest(DataSourceTestRequest):
    """创建并激活数据源"""
    name: str = Field(..., min_length=1, max_length=100)
    kind: str = Field("sqlalchemy", min_length=1, max_length=50)
    activate: bool = True


class DataSourceTestResponse(BaseModel):
    """数据源测试结果"""
    ok: bool
    message: str


class SemanticField(BaseModel):
    """语义层字段"""
    id: int
    table_name: str
    column_name: str
    display_name: str
    field_type: str
    description: str
    is_queryable: bool
    updated_at: str


class SemanticFieldUpdate(BaseModel):
    """语义层字段更新"""
    display_name: str = Field(..., min_length=1)
    field_type: str = Field(..., pattern="^(metric|dimension|attribute)$")
    description: str = Field("", max_length=500)
    is_queryable: bool = True


class QueryRecord(BaseModel):
    """持久化查询记录"""
    id: int
    query: str
    sql: Optional[str] = None
    status: str
    row_count: int
    execution_time: Optional[float] = None
    retry_count: int
    error: Optional[str] = None
    insight_summary: Optional[str] = None
    created_at: str


class ReportCreateRequest(BaseModel):
    """保存报表请求"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    query: str = Field(..., min_length=1)
    sql: Optional[str] = None
    data: List[Dict[str, Any]] = Field(default_factory=list)
    echarts_config: Optional[Dict[str, Any]] = None
    insight_summary: Optional[str] = None


class ReportSummary(BaseModel):
    """报表摘要"""
    id: int
    name: str
    description: Optional[str] = None
    query: str
    sql: Optional[str] = None
    insight_summary: Optional[str] = None
    created_at: str
    updated_at: str


class ReportDetail(ReportSummary):
    """报表详情"""
    data: List[Dict[str, Any]]
    echarts_config: Optional[Dict[str, Any]] = None
