from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import time

from app.models.schemas import QueryRequest, QueryResponse, TableInfo, SchemaResponse
from app.agent.workflow import run_workflow
from app.utils.database import db_manager
from app.core.config import MAX_RETRIES
from app.agent.tools import get_llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context: Dict[str, Any]


class ChatResponse(BaseModel):
    response: str
    error: Optional[str] = None


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest):
    """处理自然语言查询，返回 SQL、数据和 Echarts 配置"""
    print(f"[API] 收到查询请求: {request.query}")

    start_time = time.time()

    try:
        # 获取数据库 schema
        schema = db_manager.get_schema()

        # 运行工作流
        result = run_workflow(
            query=request.query,
            schema=schema,
            max_retries=MAX_RETRIES,
        )

        execution_time = time.time() - start_time

        # 构建响应
        response = QueryResponse(
            sql=result.get("sql"),
            data=result.get("data"),
            echarts_config=result.get("echarts_config"),
            error=result.get("error"),
            execution_time=execution_time,
            retry_count=result.get("retry_count", 0),
        )

        print(f"[API] 查询完成，耗时: {execution_time:.2f}秒")
        return response

    except Exception as e:
        execution_time = time.time() - start_time
        error_msg = f"处理查询时发生错误: {str(e)}"
        print(f"[API] {error_msg}")

        return QueryResponse(
            sql=None,
            data=None,
            echarts_config=None,
            error=error_msg,
            execution_time=execution_time,
            retry_count=0,
        )


@router.get("/tables", response_model=List[TableInfo])
async def get_tables():
    """获取数据库中的表信息"""
    try:
        tables = db_manager.get_tables()
        return [
            TableInfo(name=table["name"], columns=table["columns"])
            for table in tables
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取表信息失败: {str(e)}")


@router.get("/schema", response_model=SchemaResponse)
async def get_schema():
    """获取数据库 schema"""
    try:
        tables = db_manager.get_tables()
        schema_description = db_manager.get_schema()

        return SchemaResponse(
            tables=[
                TableInfo(name=table["name"], columns=table["columns"])
                for table in tables
            ],
            description=schema_description,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取 schema 失败: {str(e)}")


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """基于查询结果进行问答"""
    print(f"[API] 收到聊天请求: {request.message}")

    try:
        # 准备上下文信息
        context = request.context
        sql = context.get("sql", "")
        data = context.get("data", [])
        
        # 构建数据摘要
        data_summary = ""
        if data:
            data_summary = f"查询结果包含 {len(data)} 条数据。\n"
            if data:
                columns = list(data[0].keys())
                data_summary += f"列名: {', '.join(columns)}\n"
                # 添加前5条数据作为示例
                data_summary += "示例数据（前5条）:\n"
                for i, row in enumerate(data[:5]):
                    data_summary += f"{i+1}. {row}\n"
        
        # 创建提示模板
        template = """你是一个数据分析专家。用户基于之前的查询结果向你提问。

之前的查询 SQL:
{sql}

查询结果摘要:
{data_summary}

用户问题: {message}

请基于查询结果，用简洁明了的中文回答用户的问题。如果数据不足以回答问题，请说明原因。"""
        
        prompt = ChatPromptTemplate.from_template(template)
        llm = get_llm()
        chain = prompt | llm | StrOutputParser()
        
        # 生成回答
        response = chain.invoke({
            "sql": sql,
            "data_summary": data_summary,
            "message": request.message
        })
        
        print(f"[API] 聊天回答生成完成")
        return ChatResponse(response=response.strip())
        
    except Exception as e:
        error_msg = f"处理聊天请求时发生错误: {str(e)}"
        print(f"[API] {error_msg}")
        return ChatResponse(response="", error=error_msg)