# NL2BI 项目开发任务看板

## 项目概述
基于 Multi-Agent 架构的 NL2BI（自然语言转BI报表）全栈项目。

## 技术栈
- **后端**: Python + FastAPI + SQLite (内存数据库) + uv
- **AI 框架**: LangGraph + langchain-openai
- **前端**: React + Vite + TypeScript + TailwindCSS + echarts-for-react

## 开发阶段

### 阶段 1: 项目初始化与基础架构
- [x] 1.1 初始化 git 仓库
- [x] 1.2 创建项目根目录结构
- [x] 1.3 创建后端项目骨架 (FastAPI + uv)
- [x] 1.4 创建前端项目骨架 (React + Vite + TypeScript + TailwindCSS)
- [x] 1.5 配置开发环境变量 (.env)

### 阶段 2: 后端核心 - 数据库与数据模型
- [x] 2.1 设计 SQLite 内存数据库 schema (销售数据表)
- [x] 2.2 实现数据库初始化与模拟数据生成
- [x] 2.3 定义 Pydantic 数据模型 (请求/响应)
- [x] 2.4 创建数据库工具函数

### 阶段 3: LangGraph 工作流核心
- [x] 3.1 定义 LangGraph State (包含 errors 列表)
- [x] 3.2 实现 Text2SQL 节点 (调用 LLM)
- [x] 3.3 实现 SQL 执行沙盒节点
- [x] 3.4 实现空值拦截逻辑 (DataFrame 为空检查)
- [x] 3.5 实现 Echarts 配置生成节点
- [x] 3.6 构建 LangGraph 状态机 (条件边与重试逻辑)
- [x] 3.7 实现轨迹记忆机制 (错误历史汇编)

### 阶段 4: 后端 API 接口
- [x] 4.1 创建 FastAPI 应用入口
- [x] 4.2 实现 /api/query 接口 (自然语言查询)
- [x] 4.3 实现 /api/tables 接口 (获取表信息)
- [x] 4.4 实现 /api/schema 接口 (获取数据库 schema)
- [x] 4.5 配置 CORS 中间件
- [x] 4.6 添加错误处理与日志

### 阶段 5: 前端开发
- [x] 5.1 搭建前端基础框架 (路由、布局)
- [x] 5.2 创建查询输入组件
- [x] 5.3 创建结果展示组件 (SQL、数据表格)
- [x] 5.4 集成 Echarts 图表组件
- [x] 5.5 实现 API 调用服务层
- [x] 5.6 添加加载状态与错误处理
- [x] 5.7 样式美化与响应式设计

### 阶段 6: 集成与测试
- [x] 6.1 前后端联调
- [x] 6.2 测试完整工作流 (查询 → SQL → 数据 → 图表)
- [x] 6.3 测试错误处理与重试机制
- [x] 6.4 测试空值拦截逻辑
- [ ] 6.5 性能优化与边界情况处理

### 阶段 7: 文档与部署准备
- [x] 7.1 编写项目 README.md
- [ ] 7.2 编写 API 文档
- [ ] 7.3 编写部署说明
- [ ] 7.4 创建 docker-compose 配置 (可选)

## 关键设计决策
1. **轨迹记忆**: State 中维护 `errors: List[str]`，每次 SQL 执行失败时追加错误信息
2. **空值拦截**: DataFrame 为空时视作业务逻辑错误，强制重试（最多 3 次）
3. **状态机**: 使用 LangGraph 的 `StateGraph` 定义节点与条件边

## 进度跟踪
- 开始时间: 2026-05-30
- 当前阶段: 阶段 7 - 文档与部署准备
- 完成任务数: 29/30