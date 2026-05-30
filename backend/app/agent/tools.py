from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import Optional

from app.core.config import OPENAI_API_KEY, OPENAI_API_BASE, OPENAI_MODEL


def get_llm() -> ChatOpenAI:
    """获取 LLM 实例"""
    return ChatOpenAI(
        model=OPENAI_MODEL,
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_API_BASE,
        temperature=0,
        max_tokens=2000,
    )


def create_text2sql_prompt(schema: str, errors: list[str] = None) -> ChatPromptTemplate:
    """创建 Text2SQL 提示模板"""
    error_context = ""
    if errors:
        error_context = "\n\n之前的错误:\n" + "\n".join(
            [f"- {error}" for error in errors]
        )

    template = f"""你是一个 SQL 专家。根据用户的自然语言查询，生成对应的 SQL 语句。

数据库 Schema:
{schema}

要求:
1. 只返回 SQL 语句，不要有其他内容
2. 使用标准 SQL 语法
3. 确保 SQL 语句正确且可执行
4. 如果查询涉及聚合，请使用适当的 GROUP BY 子句
5. 如果查询需要排序，请使用 ORDER BY 子句
6. 使用 LIMIT 限制结果集大小（默认 1000 行）
{{error_context}}

用户查询: {{query}}

SQL:"""

    return ChatPromptTemplate.from_template(template)


def create_echarts_prompt(data_description: str) -> ChatPromptTemplate:
    """创建 Echarts 配置生成提示模板"""
    template = """你是一个数据可视化专家。根据查询结果数据，生成 Echarts 图表配置。

数据描述:
{data_description}

要求:
1. 返回完整的 Echarts 配置 JSON
2. 选择合适的图表类型（柱状图、折线图、饼图等）
3. 配置标题、坐标轴、图例等
4. 确保配置可以直接在 Echarts 中使用
5. 如果数据不适合可视化，返回空配置

请返回 Echarts 配置 JSON:"""

    return ChatPromptTemplate.from_template(template)


def generate_sql(schema: str, query: str, errors: list[str] = None) -> str:
    """生成 SQL 语句"""
    llm = get_llm()
    prompt = create_text2sql_prompt(schema, errors)
    chain = prompt | llm | StrOutputParser()

    result = chain.invoke({"query": query, "error_context": ""})
    
    # 清理 SQL 输出，移除 markdown 代码块
    cleaned = result.strip()
    if cleaned.startswith("```sql"):
        cleaned = cleaned[6:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    # 移除末尾的分号（如果存在）
    if cleaned.endswith(";"):
        cleaned = cleaned[:-1].strip()
    
    return cleaned


def generate_echarts_config(data_description: str, data: list = None) -> dict:
    """生成 Echarts 配置"""
    # 如果没有数据，返回默认配置
    if not data:
        return {
            "title": {"text": "数据可视化"},
            "tooltip": {},
            "xAxis": {"type": "category", "data": []},
            "yAxis": {"type": "value"},
            "series": [{"type": "bar", "data": []}],
        }
    
    # 根据数据自动生成配置
    import json
    
    # 获取列名
    columns = list(data[0].keys())
    
    # 确定图表类型
    # 如果有2列，第一列作为类别，第二列作为数值
    if len(columns) >= 2:
        category_column = columns[0]
        value_column = columns[1]
        
        # 提取数据
        categories = [str(row[category_column]) for row in data]
        values = [row[value_column] for row in data]
        
        # 生成配置
        config = {
            "title": {"text": f"{value_column} 按 {category_column} 分布"},
            "tooltip": {
                "trigger": "axis",
                "axisPointer": {"type": "shadow"}
            },
            "xAxis": {
                "type": "category",
                "data": categories,
                "axisLabel": {"rotate": 45}
            },
            "yAxis": {"type": "value"},
            "series": [{
                "name": value_column,
                "type": "bar",
                "data": values,
                "itemStyle": {
                    "color": "#3B82F6"
                }
            }]
        }
        
        return config
    
    # 如果只有一列，返回默认配置
    return {
        "title": {"text": "数据可视化"},
        "tooltip": {},
        "xAxis": {"type": "category", "data": []},
        "yAxis": {"type": "value"},
        "series": [{"type": "bar", "data": []}],
    }