import logging
import time

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    QueryRequest, QueryResponse,
    ChatRequest, ChatResponse,
    TableInfo, SchemaResponse,
)
from app.agent.workflow import run_workflow
from app.agent.tools import get_llm
from app.utils.database import db_manager
from app.core.config import MAX_RETRIES

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest):
    """处理自然语言查询，返回 SQL、数据和 Echarts 配置"""
    logger.info("收到查询请求: %s", request.query)
    start_time = time.time()

    try:
        schema = db_manager.get_schema()
        result = run_workflow(
            query=request.query,
            schema=schema,
            max_retries=MAX_RETRIES,
        )

        execution_time = time.time() - start_time
        logger.info("查询完成，耗时: %.2f秒", execution_time)

        return QueryResponse(
            sql=result.get("sql"),
            data=result.get("data"),
            echarts_config=result.get("echarts_config"),
            error=result.get("error"),
            execution_time=execution_time,
            retry_count=result.get("retry_count", 0),
        )

    except Exception as e:
        execution_time = time.time() - start_time
        error_msg = f"处理查询时发生错误: {e}"
        logger.exception(error_msg)

        return QueryResponse(
            error=error_msg,
            execution_time=execution_time,
        )


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
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

        response = chain.invoke({
            "sql": sql,
            "data_summary": data_summary,
            "message": request.message,
        })

        logger.info("聊天回答生成完成")
        return ChatResponse(response=response.strip())

    except Exception as e:
        error_msg = f"处理聊天请求时发生错误: {e}"
        logger.exception(error_msg)
        return ChatResponse(response="", error=error_msg)


@router.get("/tables", response_model=list[TableInfo])
async def get_tables():
    """获取数据库中的表信息"""
    try:
        tables = db_manager.get_tables()
        return [TableInfo(name=t["name"], columns=t["columns"]) for t in tables]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取表信息失败: {e}")


@router.get("/schema", response_model=SchemaResponse)
async def get_schema():
    """获取数据库 schema"""
    try:
        tables = db_manager.get_tables()
        return SchemaResponse(
            tables=[TableInfo(name=t["name"], columns=t["columns"]) for t in tables],
            description=db_manager.get_schema(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取 schema 失败: {e}")
