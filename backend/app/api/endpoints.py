import asyncio
import logging
import time

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import AuthUser, get_current_user, login_user, require_admin
from app.models.schemas import (
    LoginRequest, LoginResponse, CurrentUserResponse,
    QueryRequest, QueryResponse,
    ChatRequest, ChatResponse,
    TableInfo, SchemaResponse,
    SqlExecuteRequest, SqlExecuteResponse,
    DataSourceInfo, DataSourceCreateRequest, DataSourceTestRequest, DataSourceTestResponse,
    SemanticField, SemanticFieldUpdate,
    QueryRecord, ReportCreateRequest, ReportSummary, ReportDetail,
)
from app.agent.workflow import run_workflow
from app.agent.tools import get_llm
from app.utils.database import db_manager
from app.utils.insights import generate_insight_summary
from app.utils.metadata import metadata_manager
from app.core.config import MAX_RETRIES

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/auth/login", response_model=LoginResponse)
async def login_endpoint(request: LoginRequest):
    """登录并获取 API Token"""
    token, user = login_user(request.username, request.password)
    return LoginResponse(token=token, username=user.username, role=user.role)


@router.get("/auth/me", response_model=CurrentUserResponse)
async def me_endpoint(user: AuthUser = Depends(get_current_user)):
    """获取当前登录用户"""
    return CurrentUserResponse(username=user.username, role=user.role)


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest, user: AuthUser = Depends(get_current_user)):
    """处理自然语言查询，返回 SQL、数据和 Echarts 配置"""
    logger.info("收到查询请求: %s", request.query)
    start_time = time.time()

    try:
        base_schema = await asyncio.to_thread(db_manager.get_schema)
        semantic_context = await asyncio.to_thread(metadata_manager.build_semantic_context)
        schema = f"{base_schema}\n\n{semantic_context}" if semantic_context else base_schema
        result = await asyncio.to_thread(
            lambda: run_workflow(query=request.query, schema=schema, max_retries=MAX_RETRIES)
        )

        execution_time = time.time() - start_time
        data = result.get("data")
        row_count = len(data or [])
        insight_summary = generate_insight_summary(data)
        status = "failed" if result.get("error") else "success"
        query_id = await asyncio.to_thread(
            metadata_manager.record_query,
            request.query,
            result.get("sql"),
            status,
            row_count,
            execution_time,
            result.get("retry_count", 0),
            result.get("error"),
            insight_summary,
        )
        logger.info("查询完成，耗时: %.2f秒", execution_time)

        return QueryResponse(
            query_id=query_id,
            sql=result.get("sql"),
            data=data,
            echarts_config=result.get("echarts_config"),
            insight_summary=insight_summary,
            error=result.get("error"),
            error_detail=result.get("error_detail"),
            suggestions=result.get("suggestions"),
            execution_time=execution_time,
            retry_count=result.get("retry_count", 0),
        )

    except Exception as e:
        execution_time = time.time() - start_time
        error_msg = f"处理查询时发生错误: {e}"
        logger.exception(error_msg)
        query_id = await asyncio.to_thread(
            metadata_manager.record_query,
            request.query,
            None,
            "failed",
            0,
            execution_time,
            0,
            error_msg,
            None,
        )

        return QueryResponse(
            query_id=query_id,
            error=error_msg,
            execution_time=execution_time,
        )


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, user: AuthUser = Depends(get_current_user)):
    """基于查询结果进行问答"""
    logger.info("收到聊天请求: %s", request.message)

    try:
        context = request.context
        sql = context.get("sql", "")
        data = context.get("data", [])

        # 构建数据摘要
        data_summary = ""
        if data:
            columns = list(data[0].keys())
            data_summary = f"查询结果包含 {len(data)} 条数据，列名: {', '.join(columns)}\n"
            data_summary += "示例数据（前5条）:\n"
            for i, row in enumerate(data[:5]):
                data_summary += f"  {i+1}. {row}\n"

        template = """你是一个数据分析专家。用户基于之前的查询结果向你提问。

之前的查询 SQL:
{sql}

查询结果摘要:
{data_summary}

用户问题: {message}

请基于查询结果，用简洁明了的中文回答。如果数据不足以回答，请说明原因。"""

        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | get_llm() | StrOutputParser()

        response = await asyncio.to_thread(
            chain.invoke,
            {"sql": sql, "data_summary": data_summary, "message": request.message},
        )

        logger.info("聊天回答生成完成")
        return ChatResponse(response=response.strip())

    except Exception as e:
        error_msg = f"处理聊天请求时发生错误: {e}"
        logger.exception(error_msg)
        return ChatResponse(response="", error=error_msg)


@router.post("/execute-sql", response_model=SqlExecuteResponse)
async def execute_sql_endpoint(request: SqlExecuteRequest, user: AuthUser = Depends(get_current_user)):
    """直接执行 SQL 并返回结果和图表配置"""
    logger.info("收到 SQL 执行请求: %s", request.sql)
    start_time = time.time()

    try:
        import pandas as pd
        df = await asyncio.to_thread(db_manager.execute_query, request.sql)

        if df.empty:
            return SqlExecuteResponse(
                sql=request.sql,
                data=[],
                echarts_config=None,
                insight_summary=None,
                error="查询返回空结果",
                execution_time=time.time() - start_time,
            )

        data = df.to_dict("records")
        for record in data:
            for key, value in record.items():
                if isinstance(value, pd.Timestamp):
                    record[key] = value.isoformat()

        # 生成图表配置
        from app.agent.tools import generate_echarts_config
        echarts_config = generate_echarts_config(request.sql, data)
        insight_summary = generate_insight_summary(data)

        execution_time = time.time() - start_time
        logger.info("SQL 执行完成，返回 %d 行，耗时: %.2f秒", len(data), execution_time)

        return SqlExecuteResponse(
            sql=request.sql,
            data=data,
            echarts_config=echarts_config,
            insight_summary=insight_summary,
            execution_time=execution_time,
        )

    except Exception as e:
        execution_time = time.time() - start_time
        error_msg = f"SQL 执行错误: {e}"
        logger.exception(error_msg)
        return SqlExecuteResponse(
            sql=request.sql,
            error=error_msg,
            execution_time=execution_time,
        )


@router.get("/tables", response_model=list[TableInfo])
async def get_tables(user: AuthUser = Depends(get_current_user)):
    """获取数据库中的表信息"""
    try:
        tables = db_manager.get_tables()
        return [TableInfo(name=t["name"], columns=t["columns"]) for t in tables]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取表信息失败: {e}")


@router.get("/schema", response_model=SchemaResponse)
async def get_schema(user: AuthUser = Depends(get_current_user)):
    """获取数据库 schema"""
    try:
        tables = db_manager.get_tables()
        return SchemaResponse(
            tables=[TableInfo(name=t["name"], columns=t["columns"]) for t in tables],
            description=db_manager.get_schema(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取 schema 失败: {e}")


@router.get("/data-sources", response_model=list[DataSourceInfo])
async def get_data_sources(user: AuthUser = Depends(get_current_user)):
    """获取已配置数据源，包含当前连接的基础统计"""
    try:
        sources = metadata_manager.list_data_sources()
        tables = db_manager.get_tables()
        total_rows = 0
        for table in tables:
            try:
                df = db_manager.execute_query(f"SELECT COUNT(*) AS count FROM {table['name']}")
                total_rows += int(df.iloc[0]["count"]) if not df.empty else 0
            except Exception:
                logger.exception("统计表行数失败: %s", table["name"])

        return [
            DataSourceInfo(
                **source,
                table_count=len(tables),
                row_count=total_rows,
            )
            for source in sources
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取数据源失败: {e}")


@router.post("/data-sources/test", response_model=DataSourceTestResponse)
async def test_data_source(
    request: DataSourceTestRequest,
    user: AuthUser = Depends(require_admin),
):
    """测试 SQLAlchemy 数据库连接"""
    try:
        await asyncio.to_thread(db_manager.test_connection, request.database_url)
        return DataSourceTestResponse(ok=True, message="连接测试成功")
    except Exception as e:
        logger.exception("数据源连接测试失败")
        return DataSourceTestResponse(ok=False, message=f"连接测试失败: {e}")


@router.post("/data-sources", response_model=DataSourceInfo)
async def create_data_source(
    request: DataSourceCreateRequest,
    user: AuthUser = Depends(require_admin),
):
    """保存数据源；activate=true 时切换为当前分析数据源"""
    try:
        await asyncio.to_thread(db_manager.test_connection, request.database_url)
        source = await asyncio.to_thread(
            metadata_manager.save_data_source,
            request.name,
            request.kind,
            request.database_url,
            request.activate,
        )
        if request.activate:
            await asyncio.to_thread(db_manager.switch_database, request.database_url)

        tables = db_manager.get_tables()
        return DataSourceInfo(**source, table_count=len(tables), row_count=0)
    except Exception as e:
        logger.exception("保存数据源失败")
        raise HTTPException(status_code=500, detail=f"保存数据源失败: {e}")


@router.get("/semantic-layer", response_model=list[SemanticField])
async def get_semantic_layer(user: AuthUser = Depends(get_current_user)):
    """获取字段业务语义层配置"""
    try:
        return [SemanticField(**field) for field in metadata_manager.list_semantic_fields()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取语义层失败: {e}")


@router.put("/semantic-layer/{table_name}/{column_name}", response_model=SemanticField)
async def update_semantic_layer_field(
    table_name: str,
    column_name: str,
    request: SemanticFieldUpdate,
    user: AuthUser = Depends(require_admin),
):
    """更新字段业务语义"""
    try:
        field = metadata_manager.update_semantic_field(
            table_name=table_name,
            column_name=column_name,
            display_name=request.display_name,
            field_type=request.field_type,
            description=request.description,
            is_queryable=request.is_queryable,
        )
        return SemanticField(**field)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新语义字段失败: {e}")


@router.get("/query-history", response_model=list[QueryRecord])
async def get_persisted_query_history(limit: int = 50, user: AuthUser = Depends(get_current_user)):
    """获取持久化查询审计记录"""
    try:
        bounded_limit = min(max(limit, 1), 200)
        return [
            QueryRecord(**record)
            for record in metadata_manager.list_query_records(limit=bounded_limit)
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取查询历史失败: {e}")


@router.post("/reports", response_model=ReportDetail)
async def create_report(request: ReportCreateRequest, user: AuthUser = Depends(get_current_user)):
    """将当前查询结果保存为报表"""
    try:
        report = metadata_manager.save_report(
            name=request.name,
            description=request.description,
            query=request.query,
            sql=request.sql,
            data=request.data,
            echarts_config=request.echarts_config,
            insight_summary=request.insight_summary,
        )
        return ReportDetail(**report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存报表失败: {e}")


@router.get("/reports", response_model=list[ReportSummary])
async def list_reports(user: AuthUser = Depends(get_current_user)):
    """获取已保存报表列表"""
    try:
        return [ReportSummary(**report) for report in metadata_manager.list_reports()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取报表列表失败: {e}")


@router.get("/reports/{report_id}", response_model=ReportDetail)
async def get_report(report_id: int, user: AuthUser = Depends(get_current_user)):
    """获取报表详情"""
    try:
        return ReportDetail(**metadata_manager.get_report(report_id))
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取报表失败: {e}")
