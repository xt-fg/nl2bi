from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import time

from app.models.schemas import QueryRequest, QueryResponse, TableInfo, SchemaResponse
from app.agent.workflow import run_workflow
from app.utils.database import db_manager
from app.core.config import MAX_RETRIES

router = APIRouter()


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