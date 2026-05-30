# NL2BI 项目总结

## 项目概述

NL2BI（Natural Language to BI）是一个基于 Multi-Agent 架构的智能数据分析系统，用户可以通过自然语言查询数据库，系统自动生成 SQL 语句、执行查询、并生成可视化图表。

## 核心功能

### 1. 智能查询处理
- **Text2SQL**: 将自然语言转换为 SQL 语句
- **SQL 执行沙盒**: 安全执行 SQL 查询
- **Echarts 配置生成**: 自动生成可视化图表配置

### 2. 轨迹记忆机制
- 维护错误历史列表
- 将错误信息汇编入 Prompt
- 让模型反思修正，避免死循环

### 3. 空值拦截
- 检测 SQL 执行返回空结果
- 视作业务逻辑错误（幻觉）
- 强制重试（最多 3 次）

### 4. 工作流闭环
```
用户查询 → Text2SQL → 执行SQL沙盒 → 生成Echarts配置
                ↑          ↓
                └── 错误重试 ──┘
```

## 技术实现

### 后端架构
- **FastAPI**: 高性能 Web 框架
- **LangGraph**: AI 工作流引擎
- **SQLite**: 内存数据库（模拟数据）
- **langchain-openai**: LLM 集成

### 前端架构
- **React 18** + **TypeScript**
- **Vite**: 构建工具
- **TailwindCSS**: 样式框架
- **echarts-for-react**: 图表组件

## 项目结构

```
nl2bi/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── agent/             # LangGraph 工作流
│   │   │   ├── nodes/         # 工作流节点
│   │   │   ├── state.py       # 状态定义
│   │   │   ├── tools.py       # 工具函数
│   │   │   └── workflow.py    # 工作流定义
│   │   ├── api/               # API 路由
│   │   ├── core/              # 配置
│   │   ├── models/            # 数据模型
│   │   └── utils/             # 工具函数
│   ├── pyproject.toml         # 项目配置
│   └── .env                   # 环境变量
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   ├── services/          # API 服务
│   │   └── types/             # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml          # Docker 部署配置
├── test.sh                     # 测试脚本
└── README.md                   # 项目文档
```

## 核心代码说明

### 1. LangGraph 工作流定义
```python
# backend/app/agent/workflow.py
def create_workflow() -> StateGraph:
    workflow = StateGraph(AgentState)
    workflow.add_node("text2sql", text2sql_node)
    workflow.add_node("execute_sql", execute_sql_node)
    workflow.add_node("generate_echarts", generate_echarts_node)
    workflow.set_entry_point("text2sql")
    workflow.add_edge("text2sql", "execute_sql")
    workflow.add_conditional_edges("execute_sql", should_retry, {...})
    workflow.add_edge("generate_echarts", END)
    return workflow
```

### 2. 状态定义
```python
# backend/app/agent/state.py
class AgentState(TypedDict):
    query: str
    sql: Optional[str]
    data: Optional[List[Dict[str, Any]]]
    echarts_config: Optional[Dict[str, Any]]
    errors: List[str]  # 轨迹记忆
    retry_count: int
    max_retries: int
    is_complete: bool
    schema: Optional[str]
    response: Optional[Dict[str, Any]]
```

### 3. 空值拦截逻辑
```python
# backend/app/agent/nodes/execute_sql.py
if df.empty:
    error_msg = "SQL 执行成功但返回空结果集，可能是业务逻辑错误"
    errors = state.get("errors", [])
    errors.append(error_msg)
    return {
        "data": [],
        "errors": errors,
        "retry_count": state.get("retry_count", 0) + 1,
        "is_complete": False,
    }
```

## 测试结果

### 功能测试
- ✅ 健康检查接口正常
- ✅ 查询接口正常工作
- ✅ 获取表信息正常
- ✅ 获取 schema 正常

### 重试机制测试
- ✅ 空结果触发重试
- ✅ 重试次数限制生效
- ✅ 错误历史正确记录

## 部署方式

### 本地开发
```bash
# 后端
cd backend
uv sync
uv run uvicorn app.main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

### Docker 部署
```bash
docker-compose up -d
```

## 后续优化方向

1. **性能优化**
   - 添加缓存机制
   - 优化 SQL 生成提示
   - 减少 LLM 调用次数

2. **功能扩展**
   - 支持更多数据库类型
   - 添加用户认证
   - 支持保存查询历史

3. **可视化增强**
   - 支持更多图表类型
   - 添加交互式图表
   - 支持图表导出

## 总结

NL2BI 项目成功实现了基于 Multi-Agent 架构的智能数据分析系统，通过 LangGraph 工作流引擎实现了 Text2SQL、SQL 执行、Echarts 配置生成的完整闭环。轨迹记忆机制和空值拦截逻辑确保了系统的稳定性和可靠性。

项目采用前后端分离架构，后端使用 FastAPI + LangGraph，前端使用 React + TypeScript + TailwindCSS，具有良好的可扩展性和可维护性。