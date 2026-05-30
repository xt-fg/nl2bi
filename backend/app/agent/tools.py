import json
import logging
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import OPENAI_API_KEY, OPENAI_API_BASE, OPENAI_MODEL

logger = logging.getLogger(__name__)

# LLM 单例
_llm_instance: Optional[ChatOpenAI] = None


def get_llm() -> ChatOpenAI:
    """获取 LLM 单例"""
    global _llm_instance
    if _llm_instance is None:
        logger.info("初始化 LLM 实例: model=%s", OPENAI_MODEL)
        _llm_instance = ChatOpenAI(
            model=OPENAI_MODEL,
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_API_BASE,
            temperature=0,
            max_tokens=4096,
        )
    return _llm_instance


def create_text2sql_prompt(schema: str, errors: list[str] = None, column_samples: str = "") -> ChatPromptTemplate:
    """创建 Text2SQL 提示模板，包含 few-shot 示例和列值采样"""
    error_context = ""
    if errors:
        error_context = "\n\n之前的错误（请避免重复这些错误）:\n" + "\n".join(
            [f"- {error}" for error in errors]
        )

    samples_section = ""
    if column_samples:
        samples_section = f"\n\n列值参考（用于理解枚举值和数据格式）:\n{column_samples}"

    template = f"""你是一个 SQL 专家。根据用户的自然语言查询，生成对应的 SQLite SQL 语句。

数据库 Schema:
{schema}{samples_section}

示例:
用户查询: 查询每个地区的销售总额
SQL: SELECT region, SUM(amount) AS total_sales FROM sales GROUP BY region ORDER BY total_sales DESC LIMIT 1000

用户查询: 显示销售额前5的产品名称和金额
SQL: SELECT s.product, SUM(s.amount) AS total_amount FROM sales s GROUP BY s.product ORDER BY total_amount DESC LIMIT 5

用户查询: 统计每个城市有多少客户
SQL: SELECT city, COUNT(*) AS customer_count FROM customers GROUP BY city ORDER BY customer_count DESC LIMIT 1000

用户查询: 查询2025年的销售记录
SQL: SELECT * FROM sales WHERE sale_date >= '2025-01-01' AND sale_date < '2026-01-01' LIMIT 1000

要求:
1. 只返回 SQL 语句，不要有任何解释、注释或 markdown 标记
2. 使用 SQLite 语法
3. 确保 SQL 语句正确且可执行
4. 如果查询涉及聚合，请使用适当的 GROUP BY 子句
5. 如果查询需要排序，请使用 ORDER BY 子句
6. 使用 LIMIT 限制结果集大小（默认 1000 行）
7. 列名和表名必须与 schema 完全一致
8. 对于日期过滤，使用 sale_date >= 'YYYY-MM-DD' 格式
9. 产品名称在 sales 表的 product 列，类别在 category 列
{{error_context}}

用户查询: {{query}}

SQL:"""

    return ChatPromptTemplate.from_template(template)


def get_column_samples() -> str:
    """获取关键列的采样值，帮助 LLM 理解数据"""
    from sqlalchemy import text
    from app.utils.database import db_manager
    try:
        samples = []
        with db_manager.engine.connect() as conn:
            # 采样 region 列
            result = conn.execute(text("SELECT DISTINCT region FROM sales LIMIT 10"))
            regions = [r[0] for r in result.fetchall()]
            if regions:
                samples.append(f"sales.region 的值: {', '.join(regions)}")

            # 采样 category 列
            result = conn.execute(text("SELECT DISTINCT category FROM sales LIMIT 10"))
            categories = [r[0] for r in result.fetchall()]
            if categories:
                samples.append(f"sales.category 的值: {', '.join(categories)}")

            # 采样 product 列
            result = conn.execute(text("SELECT DISTINCT product FROM sales LIMIT 10"))
            products = [r[0] for r in result.fetchall()]
            if products:
                samples.append(f"sales.product 的值: {', '.join(products)}")

            # 采样 city 列
            result = conn.execute(text("SELECT DISTINCT city FROM customers LIMIT 10"))
            cities = [r[0] for r in result.fetchall()]
            if cities:
                samples.append(f"customers.city 的值: {', '.join(cities)}")

        return "\n".join(samples)
    except Exception as e:
        logger.warning("获取列采样失败: %s", e)
        return ""


def generate_sql(schema: str, query: str, errors: list[str] = None) -> str:
    """生成 SQL 语句"""
    llm = get_llm()
    column_samples = get_column_samples()
    prompt = create_text2sql_prompt(schema, errors, column_samples)
    chain = prompt | llm | StrOutputParser()

    result = chain.invoke({"query": query, "error_context": ""})
    return _clean_sql_output(result)


def _clean_sql_output(raw: str) -> str:
    """清理 LLM 输出的 SQL，移除 markdown 代码块等"""
    cleaned = raw.strip()
    # 移除 markdown 代码块
    if cleaned.startswith("```sql"):
        cleaned = cleaned[6:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    # 移除末尾分号
    if cleaned.endswith(";"):
        cleaned = cleaned[:-1].strip()
    return cleaned


def generate_echarts_config(sql: str, data: list[dict]) -> dict:
    """使用 LLM 智能生成 Echarts 配置"""
    if not data:
        return _default_echarts_config("暂无数据")

    # 构建数据摘要给 LLM
    columns = list(data[0].keys())
    sample_rows = data[:5]

    data_summary = f"列名: {', '.join(columns)}\n"
    data_summary += f"总行数: {len(data)}\n"
    data_summary += "示例数据（前5行）:\n"
    for i, row in enumerate(sample_rows):
        data_summary += f"  {i+1}. {json.dumps(row, ensure_ascii=False)}\n"

    # 统计信息
    numeric_cols = [c for c in columns if isinstance(data[0].get(c), (int, float))]
    if numeric_cols:
        data_summary += f"数值列: {', '.join(numeric_cols)}\n"
        for col in numeric_cols[:3]:
            values = [r[col] for r in data if r.get(col) is not None]
            if values:
                data_summary += f"  {col}: min={min(values):.2f}, max={max(values):.2f}, avg={sum(values)/len(values):.2f}\n"

    template = """你是一个数据可视化专家。根据查询结果，生成最合适的 Echarts 图表配置。

查询 SQL: {sql}

数据摘要:
{data_summary}

要求:
1. 根据数据特征智能选择图表类型：
   - 时间序列/趋势 → 折线图 (line)
   - 分类对比 → 柱状图 (bar)
   - 占比/比例 → 饼图 (pie)
   - 两个数值列的相关性 → 散点图 (scatter)
   - 多维数据 → 雷达图 (radar)
2. 配置标题、坐标轴、图例、tooltip
3. 使用好看的配色方案
4. 只返回 JSON，不要有其他内容

Echarts 配置 JSON:"""

    prompt = ChatPromptTemplate.from_template(template)
    llm = get_llm()
    chain = prompt | llm | StrOutputParser()

    try:
        result = chain.invoke({"sql": sql, "data_summary": data_summary})
        return _parse_echarts_json(result)
    except Exception as e:
        logger.warning("LLM 生成 Echarts 配置失败，使用规则回退: %s", e)
        return _fallback_echarts_config(columns, data)


def _parse_echarts_json(raw: str) -> dict:
    """解析 LLM 返回的 Echarts JSON，带多种修复尝试"""
    import re

    cleaned = raw.strip()
    # 移除 markdown 代码块
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # 1. 直接尝试
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 2. 提取第一个 JSON 对象（贪婪匹配）
    match = re.search(r'\{[\s\S]*\}', cleaned)
    if match:
        candidate = match.group()
        # 2a. 直接解析
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
        # 2b. 修复尾部逗号
        fixed = re.sub(r',\s*([}\]])', r'\1', candidate)
        try:
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass
        # 2c. 修复单引号为双引号
        fixed2 = candidate.replace("'", '"')
        try:
            return json.loads(fixed2)
        except json.JSONDecodeError:
            pass

    # 3. 逐行查找不合法的控制字符
    cleaned2 = re.sub(r'[\x00-\x1f\x7f]', ' ', cleaned)
    match2 = re.search(r'\{[\s\S]*\}', cleaned2)
    if match2:
        try:
            return json.loads(match2.group())
        except json.JSONDecodeError:
            pass

    logger.warning("JSON 解析失败，原始内容前300字符: %s", raw[:300])
    return _default_echarts_config("图表配置解析失败")


def _fallback_echarts_config(columns: list, data: list) -> dict:
    """规则回退：根据列类型生成基础图表"""
    numeric_cols = [c for c in columns if isinstance(data[0].get(c), (int, float))]
    category_cols = [c for c in columns if c not in numeric_cols]

    if category_cols and numeric_cols:
        cat_col = category_cols[0]
        val_col = numeric_cols[0]
        categories = [str(r.get(cat_col, "")) for r in data]
        values = [r.get(val_col, 0) for r in data]
        return {
            "title": {"text": f"{val_col} 按 {cat_col} 分布", "left": "center"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {"type": "category", "data": categories, "axisLabel": {"rotate": 45 if len(categories) > 6 else 0}},
            "yAxis": {"type": "value"},
            "series": [{"name": val_col, "type": "bar", "data": values}],
        }

    return _default_echarts_config("数据格式不适合自动生成图表")


def _default_echarts_config(title: str = "数据可视化") -> dict:
    """默认空图表配置"""
    return {
        "title": {"text": title, "left": "center"},
        "tooltip": {},
        "xAxis": {"type": "category", "data": []},
        "yAxis": {"type": "value"},
        "series": [],
    }
