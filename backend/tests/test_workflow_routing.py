from app.agent.workflow import finalize_error_node, should_retry


def test_should_retry_routes_successful_data_to_chart_even_with_error_history():
    state = {
        "query": "查询每个地区的销售额",
        "sql": "SELECT region, SUM(amount) AS total_sales FROM sales GROUP BY region",
        "data": [{"region": "华北", "total_sales": 1000}],
        "echarts_config": None,
        "errors": ["上一次 SQL 执行返回空结果"],
        "retry_count": 1,
        "max_retries": 3,
        "is_complete": False,
        "schema": "表 sales (region, amount)",
        "response": None,
    }

    assert should_retry(state) == "generate_echarts"


def test_should_retry_routes_error_below_limit_to_text2sql():
    state = {
        "query": "查询每个地区的销售额",
        "sql": "SELECT area, SUM(amount) FROM sales GROUP BY area",
        "data": None,
        "echarts_config": None,
        "errors": ["SQL 执行错误: no such column: area"],
        "retry_count": 1,
        "max_retries": 3,
        "is_complete": False,
        "schema": "表 sales (region, amount)",
        "response": None,
    }

    assert should_retry(state) == "text2sql"


def test_should_retry_routes_exhausted_errors_to_finalize_error():
    state = {
        "query": "查询每个地区的销售额",
        "sql": "SELECT area, SUM(amount) FROM sales GROUP BY area",
        "data": None,
        "echarts_config": None,
        "errors": ["SQL 执行错误: no such column: area"],
        "retry_count": 3,
        "max_retries": 3,
        "is_complete": False,
        "schema": "表 sales (region, amount)",
        "response": None,
    }

    assert should_retry(state) == "finalize_error"


def test_finalize_error_response_preserves_context():
    state = {
        "query": "查询每个地区的销售额",
        "sql": "SELECT area, SUM(amount) FROM sales GROUP BY area",
        "data": None,
        "echarts_config": None,
        "errors": ["第一次失败", "SQL 执行错误: no such column: area"],
        "retry_count": 3,
        "max_retries": 3,
        "is_complete": False,
        "schema": "表 sales (region, amount)",
        "response": None,
    }

    result = finalize_error_node(state)

    assert result["is_complete"] is True
    assert result["response"]["sql"] == state["sql"]
    assert result["response"]["error"] == "查询失败，已自动重试 3 次仍未得到有效结果。"
    assert result["response"]["error_detail"] == "最后错误：SQL 执行错误: no such column: area"
    assert result["response"]["errors"] == state["errors"]
    assert result["response"]["suggestions"]
    assert result["response"]["retry_count"] == 3
