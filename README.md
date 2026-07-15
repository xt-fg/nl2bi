<div align="center">

# 🧠 NL2BI

### 基于 Multi-Agent 架构的自然语言智能数据分析系统

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agent_Framework-blue?style=flat)](https://langchain-ai.github.io/langgraph/)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ECharts](https://img.shields.io/badge/ECharts-Visualization-AA3366?style=flat)](https://echarts.apache.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📖 项目简介

NL2BI 是一个**智能数据分析系统**，用户只需用自然语言描述需求，系统自动完成 SQL 生成、数据查询、图表可视化，并支持基于结果的智能追问。

### ✨ 核心特性

- 🔐 **登录与角色权限** - 内置 admin / analyst 角色，管理员可管理数据源和语义层
- 🔑 **LLM 连接管理** - 管理员可在系统设置中覆盖 API Key 和 Base URL，并分别恢复 `.env` 默认值
- 🔌 **数据源管理** - 支持测试并激活 SQLAlchemy 数据库连接，默认提供 SQLite 示例数据集
- 🧾 **语义层配置** - 为字段维护中文名、指标/维度类型和业务口径，提升 Text2SQL 稳定性
- 🗂️ **查询审计持久化** - 保存查询、SQL、耗时、行数、错误、重试次数和洞察摘要
- 📌 **报表保存** - 将查询结果、图表配置和洞察摘要保存为可复用报表
- 🧩 **业务洞察摘要** - 自动生成结果摘要，突出行数、最大值、最小值、均值和表现最高维度
- 🤖 **Multi-Agent 工作流** - LangGraph 状态机驱动的 Text2SQL → SQL 执行 → 图表生成闭环
- 🧠 **轨迹记忆机制** - 错误历史汇编入 Prompt，让模型反思修正，避免死循环
- 🛡️ **空值拦截** - 检测空结果集，视作业务逻辑幻觉，强制重试（最多 3 次）
- 🎨 **智能图表选择** - LLM 根据数据特征自动选择折线图、柱状图、饼图等
- 💬 **数据问答对话** - 基于查询结果追问细节，支持趋势分析和异常检测
- 📜 **查询历史** - 自动保存查询记录，支持一键回填
- 🔒 **SQL 安全防护** - 只允许 SELECT 查询，拦截危险操作
- ✏️ **SQL 可编辑** - 支持手动修改 SQL 后重新执行，灵活微调查询
- 📊 **图表类型切换** - 一键切换柱状图/折线图/饼图/表格，满足不同分析场景
- 🧯 **图表错误降级** - 动态图表配置无法渲染时保留结果并引导切换表格，避免整页白屏
- 📥 **导出能力** - 支持导出 CSV 数据和图表 PNG 图片

---

## 🏗️ 系统架构

```mermaid
graph TB
    subgraph "前端 (React + TypeScript)"
        LOGIN[登录/角色] --> UI
        UI[查询输入] --> |自然语言| API
        API --> |SQL + 数据 + 图表| RESULT[结果展示]
        RESULT --> CHART[Echarts 图表]
        RESULT --> CHAT[数据问答]
        RESULT --> REPORT[保存报表]
    end
    
    subgraph "后端 (FastAPI + LangGraph)"
        API[API Layer] --> WF[LangGraph 工作流]
        API --> AUTH[Token 权限校验]
        API --> META[元数据服务<br/>数据源/语义层/审计/报表]
        
        WF --> T2S[Text2SQL 节点<br/>LLM 生成 SQL]
        T2S --> EXEC[SQL 执行沙盒]
        EXEC --> |成功| ECHART[Echarts 配置生成<br/>LLM 智能选图]
        EXEC --> INSIGHT[规则洞察摘要]
        EXEC --> |失败/空结果| ROUTE{重试?}
        ROUTE --> |未超限| T2S
        ROUTE --> |超限| ERR[返回错误]
        ECHART --> |结果| API
        
        EXEC --> SAFE[SQL 安全检查<br/>拦截危险操作]
    end
    
    subgraph "数据层"
        DB[(业务数据库<br/>SQLite / SQLAlchemy)]
        APPDB[(应用元数据库<br/>查询审计/报表/语义层/系统设置)]
        DB --> EXEC
        APPDB --> META
    end
    
    style T2S fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style EXEC fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style ECHART fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style ROUTE fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

---

## 🔄 工作流详解

### LangGraph 状态机

NL2BI 的核心是一个 **LangGraph 状态机**，包含三个节点和条件边：

| 节点 | 功能 | 输入 | 输出 |
|------|------|------|------|
| Text2SQL | 自然语言转 SQL | 用户查询 + Schema + 错误历史 | SQL 语句 |
| Execute SQL | 执行 SQL 查询 | SQL 语句 | DataFrame / 错误 |
| Generate Echarts | 生成图表配置 | 查询结果数据 | Echarts JSON |

### 轨迹记忆机制

```
第1次尝试: 用户查询 → 生成SQL → 执行失败(空结果)
                                    ↓
第2次尝试: 错误历史 + 用户查询 → 生成SQL → 执行失败
                                              ↓
第3次尝试: 更多错误历史 + 用户查询 → 生成SQL → 执行成功 ✓
```

错误历史被汇编到 Prompt 中，让 LLM 反思之前的错误，逐步修正 SQL。

### 智能图表选择

LLM 根据数据特征自动选择最合适的图表类型：

| 数据特征 | 推荐图表 | 示例 |
|----------|----------|------|
| 时间序列/趋势 | 折线图 (line) | 每月销售趋势 |
| 分类对比 | 柱状图 (bar) | 各地区销售额 |
| 占比/比例 | 饼图 (pie) | 产品类别占比 |
| 两列相关性 | 散点图 (scatter) | 价格 vs 销量 |

---

## 🛠️ 技术栈

### 后端

| 技术 | 用途 |
|------|------|
| Python 3.11+ | 主语言 |
| FastAPI | Web 框架 |
| LangGraph | Agent 工作流引擎 |
| langchain-openai | LLM 调用 |
| SQLite / SQLAlchemy | 内置样例数据源与外部业务库连接 |
| Pandas | 数据处理 |
| uv | 包管理器 |

### 前端

| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| TailwindCSS | 样式框架 |
| Echarts | 图表可视化 |

---

## 🚀 快速开始

### 前置要求

- Python 3.11+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) 包管理器（启动脚本会自动安装）
- OpenAI 兼容服务（API Key 和 Base URL 可通过 `.env` 或管理员界面配置）

### 1. 克隆项目

```bash
git clone git@github.com:xt-fg/nl2bi.git
cd nl2bi
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`。可以在这里配置 LLM，也可以先留空，启动后由管理员在「系统设置」中配置：

```env
OPENAI_API_KEY=
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=sqlite:///./data/nl2bi_analytics.db
APP_DATABASE_URL=sqlite:///./nl2bi_app.db
AUTH_USERS=admin:admin123:admin;analyst:analyst123:analyst
```

### 3. 一键启动

```bash
chmod +x start.sh
./start.sh
```

启动脚本会自动：
- ✅ 检查并安装 uv（如缺失）
- ✅ 安装后端 Python 依赖
- ✅ 启动后端服务（端口 8000）
- ✅ 安装前端 Node 依赖
- ✅ 启动前端服务（端口 5173）

启动成功后输出：

```
=== NL2BI 系统已启动 ===
后端服务: http://localhost:8000
前端界面: http://localhost:5173
API 文档: http://localhost:8000/docs

停止服务:
  kill <PID1> <PID2>
```

### 4. 访问应用

| 地址 | 说明 |
|------|------|
| http://localhost:5173 | 前端界面 |
| http://localhost:8000/docs | API 文档（Swagger） |
| http://localhost:8000/health | 健康检查 |

默认登录账号：

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| `admin` | `admin123` | 管理员 | 查询、报表、数据源、语义层、LLM 连接配置 |
| `analyst` | `analyst123` | 分析员 | 查询、追问、保存报表、查看数据源和语义层 |

生产环境请通过 `AUTH_USERS` 修改默认账号密码。

### 5. 配置 LLM 连接

管理员登录后进入「系统设置 → LLM 连接配置」，可以：

- 查看当前 API Key 的掩码、来源、模型和 Base URL
- 分别覆盖 API Key 与 Base URL，保存后立即用于后续请求
- 分别删除覆盖值，恢复使用 `.env` 中的 `OPENAI_API_KEY` 与 `OPENAI_API_BASE`

完整 API Key 不会由后端回传前端。管理员覆盖值保存在 `APP_DATABASE_URL` 指向的应用元数据库中，服务重启后仍然有效。

### 6. 配置真实数据源

登录后，管理员可进入「数据资产」，在「接入数据源」中输入 SQLAlchemy URL，例如：

```text
sqlite:///./data.db
postgresql://user:password@host:5432/dbname
mysql+pymysql://user:password@host:3306/dbname
```

点击「测试连接」验证可用性，点击「保存激活」后，后续自然语言查询会使用该数据源。默认 `sqlite:///./data/nl2bi_analytics.db` 会创建一个可持久化的本地样例数据集，包含销售、客户和产品三张表；外部数据源只读取 schema，不会自动建表或写入样例数据。

### 7. 停止服务

```bash
# 方式一：使用启动时输出的 PID
kill <后端PID> <前端PID>

# 方式二：杀掉所有相关进程
pkill -f uvicorn
pkill -f vite
```

---

## 📁 项目结构

```
nl2bi/
├── backend/                           # FastAPI 后端
│   ├── app/
│   │   ├── agent/                    # LangGraph 查询工作流
│   │   │   ├── nodes/                # Text2SQL / 执行 / 图表节点
│   │   │   ├── state.py              # 工作流状态
│   │   │   ├── tools.py              # LLM 客户端、运行时配置与 Prompt
│   │   │   └── workflow.py           # 状态机和重试路由
│   │   ├── api/endpoints.py           # 登录、分析、资产、报表、系统设置 API
│   │   ├── core/                      # 认证与环境配置
│   │   ├── models/schemas.py          # Pydantic 请求/响应模型
│   │   ├── utils/
│   │   │   ├── database.py            # 数据源管理、SQL 安全与结果上限
│   │   │   ├── data_source_stats.py   # 数据源统计缓存
│   │   │   ├── insights.py            # 规则洞察摘要
│   │   │   └── metadata.py            # 语义层、审计、报表和设置持久化
│   │   └── main.py                    # 应用入口与生命周期
│   ├── tests/                          # 后端单元测试
│   ├── pyproject.toml
│   └── .env.example
├── frontend/                          # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.tsx           # 主导航和页面框架
│   │   │   ├── DataAssetsPage.tsx     # 数据源与语义层
│   │   │   ├── ReportsPage.tsx        # 报表中心
│   │   │   ├── QueryRecordsPage.tsx   # 查询审计
│   │   │   ├── SettingsPage.tsx       # 账户、工作区与 LLM 配置
│   │   │   ├── ResultDisplay.tsx      # SQL、洞察、图表与表格
│   │   │   ├── ChartRenderer.tsx      # 懒加载 ECharts
│   │   │   └── ChartErrorBoundary.tsx # 图表错误降级
│   │   ├── hooks/useWorkspaceData.ts  # 工作区数据与精准刷新
│   │   ├── services/api.ts             # API 类型与调用封装
│   │   └── App.tsx                     # 页面编排
│   └── package.json
├── start.sh                           # 一键启动脚本
├── test.sh                            # 接口冒烟脚本
├── docker-compose.yml                 # Docker 开发编排
├── LICENSE                            # MIT License
└── README.md
```

---

## 📚 API 文档

除 `/api/auth/login` 外，业务接口默认需要 `Authorization: Bearer <token>`。

### 登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

响应：

```json
{
  "token": "...",
  "username": "admin",
  "role": "admin"
}
```

### LLM 连接配置（仅管理员）

查询当前生效配置；响应只包含 API Key 掩码：

```http
GET /api/settings/llm
Authorization: Bearer <admin-token>
```

```json
{
  "configured": true,
  "source": "environment",
  "masked_key": "••••abcd",
  "model": "gpt-4o-mini",
  "base_url": "https://api.openai.com/v1",
  "base_url_source": "environment"
}
```

设置或恢复管理员覆盖的 API Key：

```http
PUT /api/settings/llm/api-key
Content-Type: application/json
Authorization: Bearer <admin-token>

{"api_key": "your-api-key"}
```

```http
DELETE /api/settings/llm/api-key
Authorization: Bearer <admin-token>
```

设置或恢复管理员覆盖的 Base URL：

```http
PUT /api/settings/llm/base-url
Content-Type: application/json
Authorization: Bearer <admin-token>

{"base_url": "https://api.openai.com/v1"}
```

```http
DELETE /api/settings/llm/base-url
Authorization: Bearer <admin-token>
```

### 自然语言查询

```http
POST /api/query
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "查询每个地区的销售总额"
}
```

**响应示例：**

```json
{
  "query_id": 1,
  "sql": "SELECT region, SUM(amount) AS total_sales FROM sales GROUP BY region",
  "data": [
    {"region": "华东", "total_sales": 1872808.0},
    {"region": "华北", "total_sales": 1728733.0}
  ],
  "echarts_config": {
    "title": {"text": "各区域销售总额对比"},
    "series": [{"type": "bar", "data": [...]}]
  },
  "insight_summary": "本次查询返回 6 行数据；total_sales 的最大值为 1,872,808...",
  "error": null,
  "execution_time": 12.5,
  "retry_count": 0
}
```

服务端通过 `QUERY_MAX_ROWS` 限制单次查询返回量，默认最多返回 1000 行，避免大结果集占满后端内存。

### 数据问答

```http
POST /api/chat
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "这些数据的最大值是多少？",
  "context": {
    "sql": "SELECT ...",
    "data": [...]
  }
}
```

### 获取表信息

```http
GET /api/tables
Authorization: Bearer <token>
```

### 获取 Schema

```http
GET /api/schema
Authorization: Bearer <token>
```

### 数据源管理

```http
GET /api/data-sources
Authorization: Bearer <token>
```

```http
POST /api/data-sources/test
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "database_url": "sqlite:///./data.db"
}
```

```http
POST /api/data-sources
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "name": "生产销售库",
  "kind": "postgresql",
  "database_url": "postgresql://user:password@host:5432/dbname",
  "activate": true
}
```

### 语义层

```http
GET /api/semantic-layer
Authorization: Bearer <token>
```

```http
PUT /api/semantic-layer/sales/amount
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "display_name": "销售额",
  "field_type": "metric",
  "description": "订单成交金额，默认用于销售规模分析",
  "is_queryable": true
}
```

### 查询审计与报表

```http
GET /api/query-history?limit=50
Authorization: Bearer <token>
```

```http
POST /api/reports
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "地区销售总额",
  "description": "按区域汇总销售额",
  "query": "查询每个地区的销售总额",
  "sql": "SELECT ...",
  "data": [],
  "echarts_config": {},
  "insight_summary": "本次查询返回 6 行数据..."
}
```

```http
GET /api/reports
Authorization: Bearer <token>
```

---

## 🎯 使用示例

### 查询示例

| 自然语言查询 | 系统行为 |
|-------------|----------|
| 查询每个地区的销售总额 | 生成聚合 SQL + 柱状图 |
| 统计每月的销售趋势 | 生成时间序列 SQL + 折线图 |
| 显示各产品类别占比 | 生成分组 SQL + 饼图 |
| 销售额前10的产品 | 生成排序 SQL + 柱状图 |

### 追问示例

查询完成后，可以基于结果追问：

- "这些数据的最大值/最小值是多少？"
- "有什么异常值吗？"
- "请总结一下这些数据的趋势"
- "哪个区域表现最好？为什么？"

---

## ⚙️ 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `OPENAI_API_KEY` | 默认 API 密钥；可由管理员界面覆盖 | 空 |
| `OPENAI_API_BASE` | API 基础 URL | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 模型名称 | `gpt-4o-mini` |
| `DATABASE_URL` | 默认分析数据源 URL | `sqlite:///./data/nl2bi_analytics.db` |
| `APP_DATABASE_URL` | 应用元数据库 URL，用于保存数据源、语义层、审计、报表和管理员设置 | `sqlite:///./nl2bi_app.db` |
| `AUTH_USERS` | 登录用户配置，格式 `用户名:密码:角色;...` | `admin:admin123:admin;analyst:analyst123:analyst` |
| `APP_PORT` | 后端端口 | `8000` |
| `DEBUG` | 调试模式 | `True` |
| `MAX_RETRIES` | 最大重试次数 | `3` |
| `QUERY_MAX_ROWS` | 单次查询最大返回行数 | `1000` |
| `DATA_SOURCE_STATS_TTL_SECONDS` | 数据源表/行统计缓存时间（秒） | `60` |

---

## 🐳 Docker 部署

```bash
# 配置环境变量
cp backend/.env.example backend/.env
# 可编辑 backend/.env，也可启动后由管理员配置 LLM

# Compose 默认不会自动读取 backend/.env，需要显式指定
docker compose --env-file backend/.env up -d

# 访问
# 前端: http://localhost:5173
# 后端: http://localhost:8000
```

---

## ❓ 常见问题

**Q: 查询提示“尚未配置 LLM API Key”**

A: 可以在 `backend/.env` 中设置 `OPENAI_API_KEY`，也可以使用管理员账号进入「系统设置 → LLM 连接配置」保存 API Key。Base URL 同样支持 `.env` 默认值和管理员覆盖值。

**Q: 前端显示 `Failed to fetch`**

A: 确保后端服务已启动。访问 http://localhost:8000/health 验证。

**Q: 登录账号是什么？**

A: 默认管理员账号是 `admin / admin123`，分析员账号是 `analyst / analyst123`。生产部署必须通过 `AUTH_USERS` 修改默认密码。

**Q: 登录后接口仍返回 401**

A: 前端会把 token 存在浏览器 localStorage。退出后重新登录；开发态后端重启后登录会话会失效，也需要重新登录。

**Q: 如何接入真实数据库？**

A: 管理员登录后进入「数据资产」，在「接入数据源」中填写 SQLAlchemy URL 并点击「保存并激活」。也可以通过 `DATABASE_URL` 指定默认数据源。外部数据源只读取 schema，不会自动写入示例数据。

**Q: 报表和查询历史保存在哪里？**

A: 保存在 `APP_DATABASE_URL` 指向的应用元数据库中，默认是后端目录下的 `nl2bi_app.db`。管理员覆盖的 LLM Key 与 Base URL 也保存在该数据库中。

**Q: 查询返回"图表配置解析失败"**

A: 通常是 LLM 返回的 JSON 格式或组件不兼容。系统会保留查询数据并提供“查看表格”降级入口，不会让整个页面白屏；可以检查后端日志 `/tmp/nl2bi-backend.log` 获取详情。

**Q: SQL 被安全防护拦截**

A: 系统定位为只读分析，只允许 SELECT/CTE 查询。请使用只读数据库账号；写入和 DDL 操作不在产品能力范围内。

---

## ✅ 测试与质量检查

后端当前覆盖查询限制、数据源统计缓存、LLM 配置回退、Prompt 和工作流路由：

```bash
cd backend
uv run pytest
```

前端使用 ESLint、TypeScript 和 Vite 生产构建检查：

```bash
cd frontend
npm run lint
npm run build
```

运行中的本地服务可以在项目根目录执行 `./test.sh` 做认证后的接口冒烟检查。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

---

## 📄 License

本项目采用 MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 高性能 Python Web 框架
- [LangGraph](https://langchain-ai.github.io/langgraph/) - Agent 工作流引擎
- [LangChain](https://www.langchain.com/) - LLM 应用开发框架
- [React](https://react.dev/) - 用户界面库
- [Echarts](https://echarts.apache.org/) - 数据可视化库
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！⭐**

</div>
