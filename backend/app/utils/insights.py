from typing import Any


def generate_insight_summary(data: list[dict[str, Any]] | None) -> str | None:
    """Generate a deterministic business summary for query results."""
    if not data:
        return None

    columns = list(data[0].keys())
    numeric_columns = [
        column for column in columns
        if any(isinstance(row.get(column), (int, float)) for row in data)
    ]
    dimension_columns = [column for column in columns if column not in numeric_columns]

    parts = [f"本次查询返回 {len(data)} 行数据"]

    for column in numeric_columns[:2]:
        values = [
            float(row[column])
            for row in data
            if isinstance(row.get(column), (int, float))
        ]
        if not values:
            continue
        average = sum(values) / len(values)
        parts.append(
            f"{column} 的最大值为 {_format_number(max(values))}，"
            f"最小值为 {_format_number(min(values))}，平均值为 {_format_number(average)}"
        )

    if dimension_columns and numeric_columns:
        dimension = dimension_columns[0]
        metric = numeric_columns[0]
        ranked_rows = [
            row for row in data
            if isinstance(row.get(metric), (int, float)) and row.get(dimension) is not None
        ]
        if ranked_rows:
            top_row = max(ranked_rows, key=lambda row: float(row[metric]))
            parts.append(
                f"{dimension} 中表现最高的是 {top_row[dimension]}，"
                f"{metric} 为 {_format_number(float(top_row[metric]))}"
            )

    return "；".join(parts) + "。"


def _format_number(value: float) -> str:
    if value.is_integer():
        return f"{int(value):,}"
    return f"{value:,.2f}"
