# NL2BI - 自然语言转BI报表系统

基于 Multi-Agent 架构的 NL2BI（自然语言转BI报表）全栈项目。

## 项目概述

NL2BI 是一个智能数据分析系统，用户可以通过自然语言查询数据库，系统自动生成 SQL 语句、执行查询、并生成可视化图表。

## 技术栈

### 后端
- **Python 3.11+**
- **FastAPI** - 高性能 Web 框架
- **SQLite** - 内存数据库（模拟数据）
- **LangGraph** - AI 工作流引擎
- **langchain-openai** - LLM 集成
- **uv** - 包管理器

### 前端
- **React 18** + **TypeScript**
- **Vite** - 构建工具
- **TailwindCSS** - 样式框架
- **echarts-for-react** - 图表组件

## 核心特性

### 1. 智能查询处理
- 自然语言转 SQL（Text2SQL）
- 自动执行查询并返回结果
- LLM 智能选择图表类型（折线图、柱状图、饼图等）

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

### 5. 数据问答对话
- 基于查询结果进行智能问答
- 支持追问数据细节和趋势分析

### 6. 查询历史
- 自动保存查询记录（最多 20 条）
- 点击历史项快速回填查询

### 7. SQL 安全防护
- 只允许 SELECT 查询
- 拦截 DROP、DELETE、UPDATE 等危险操作

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
│   ├── pyproject.toml
│   └── .env.example           # 环境变量模板
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── ChatPanel.tsx      # 数据问答
│   │   │   ├── QueryHistory.tsx   # 查询历史
│   │   │   ├── QueryInput.tsx     # 查询输入
│   │   │   └── ResultDisplay.tsx  # 结果展示
│   │   ├── services/          # API 服务
│   │   └── types/             # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
├── start.sh                    # 一键启动脚本
├── test.sh                     # 测试脚本
├── docker-compose.yml          # Docker 部署配置
└── README.md
```

## 快速开始

### 1. 环境准备

确保已安装：
- Python 3.11+
- Node.js 18+
- uv（Python 包管理器）

> 如果未安装 uv，启动脚本会自动安装。

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

### 3. 一键启动

```bash
./start.sh
```

启动脚本会自动：
- 检查并安装 uv（如果缺失）
- 安装后端 Python 依赖
- 启动后端服务（端口 8000）
- 安装前端 Node 依赖
- 启动前端服务（端口 5173）

启动成功后会显示：
```
=== NL2BI 系统已启动 ===
后端服务: http://localhost:8000
前端界面: http://localhost:5173
API 文档: http://localhost:8000/docs

日志文件:
  后端日志: /tmp/nl2bi-backend.log
  前端日志: /tmp/nl2bi-frontend.log

停止服务:
  kill <PID1> <PID2>
```

### 4. 访问应用

| 地址 | 说明 |
|------|------|
| http://localhost:5173 | 前端界面 |
| http://localhost:8000/docs | API 文档（Swagger） |
| http://localhost:8000/health | 健康检查 |

### 5. 停止服务

```bash
# 方式一：使用启动时输出的 PID
kill <后端PID> <前端PID>

# 方式二：直接杀掉所有相关进程
pkill -f uvicorn
pkill -f "vite"
```

## 手动启动（开发模式）

如果需要分别启动前后端以便调试：

```bash
# 终端 1：启动后端
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 终端 2：启动前端
cd frontend
npm install
npm run dev
```

## Docker 部署

```bash
# 需要先配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 填入 API Key

docker-compose up -d
```

## API 接口

### 查询接口
```http
POST /api/query
Content-Type: application/json

{
  "query": "查询每个地区的销售总额"
}
```

### 数据问答
```http
POST /api/chat
Content-Type: application/json

{
  "message": "这些数据的最大值是多少？",
  "context": { "sql": "...", "data": [...] }
}
```

### 获取表信息
```http
GET /api/tables
```

### 获取数据库 Schema
```http
GET /api/schema
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| OPENAI_API_KEY | API 密钥 | （必填） |
| OPENAI_API_BASE | API 基础 URL | https://api.openai.com/v1 |
| OPENAI_MODEL | 模型名称 | gpt-4o-mini |
| APP_PORT | 后端端口 | 8000 |
| DEBUG | 调试模式 | True |
| MAX_RETRIES | 最大重试次数 | 3 |

## 常见问题

**Q: 启动报错 "OPENAI_API_KEY is not set"**
A: 检查 `backend/.env` 文件是否已创建并填入了有效的 API Key。

**Q: 前端页面显示 "Failed to fetch"**
A: 确保后端服务已启动（http://localhost:8000/health 能访问）。

**Q: 查询返回错误但没有重试**
A: 检查日志文件 `/tmp/nl2bi-backend.log`，可能是 SQL 语法错误导致超过最大重试次数。

## 许可证

MIT License
