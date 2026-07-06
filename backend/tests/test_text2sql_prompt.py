from app.agent.tools import create_text2sql_prompt


def test_text2sql_prompt_includes_error_history():
    prompt = create_text2sql_prompt(
        schema="表 sales (region, amount)",
        errors=["SQL 执行错误: no such column: area"],
    )

    content = prompt.format_messages(query="查询每个地区的销售额")[0].content

    assert "之前的错误" in content
    assert "SQL 执行错误: no such column: area" in content
    assert "{error_context}" not in content


def test_text2sql_prompt_omits_error_section_without_errors():
    prompt = create_text2sql_prompt(schema="表 sales (region, amount)")

    content = prompt.format_messages(query="查询每个地区的销售额")[0].content

    assert "之前的错误" not in content
    assert "{error_context}" not in content
