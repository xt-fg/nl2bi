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
- 智能生成 Echarts 可视化配置

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
- 提供预设问题建议

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
└── README.md
```

## 快速开始

### 1. 环境准备

确保已安装：
- Python 3.11+
- Node.js 18+
- uv（Python 包管理器）

### 2. 后端启动

```bash
# 进入后端目录
cd backend

# 安装依赖
uv sync

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 OPENAI_API_KEY

# 启动服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 4. 访问应用

- 前端界面: http://localhost:5173
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

## API 接口

### 查询接口
```http
POST /api/query
Content-Type: application/json

{
  "query": "查询每个地区的销售总额"
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

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| OPENAI_API_KEY | OpenAI API 密钥 | - |
| OPENAI_API_BASE | API 基础 URL | https://api.openai.com/v1 |
| OPENAI_MODEL | 模型名称 | gpt-4o-mini |
| APP_HOST | 服务主机 | 0.0.0.0 |
| APP_PORT | 服务端口 | 8000 |
| DEBUG | 调试模式 | True |
| MAX_RETRIES | 最大重试次数 | 3 |

## 开发说明

### 添加新的查询类型

1. 在 `backend/app/agent/tools.py` 中修改提示模板
2. 在 `backend/app/agent/nodes/` 中添加新的节点
3. 在 `backend/app/agent/workflow.py` 中更新工作流

### 自定义图表类型

1. 在 `backend/app/agent/tools.py` 中修改 `generate_echarts_config` 函数
2. 支持更多 Echarts 图表类型

## 故障排除

### 常见问题

1. **API 密钥错误**
   - 检查 `.env` 文件中的 `OPENAI_API_KEY` 是否正确

2. **数据库连接失败**
   - 确保 SQLite 数据库文件存在且有读写权限

3. **前端无法访问后端**
   - 检查 CORS 配置
   - 确保后端服务已启动

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'Add feature xxx'`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 创建 Pull Request

## 许可证

MIT License