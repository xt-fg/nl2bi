#!/bin/bash

# NL2BI 启动脚本

echo "=== 启动 NL2BI 系统 ==="

# 检查是否安装了必要的工具
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "错误: 未找到 $1，请先安装"
        exit 1
    fi
}

check_command python3
check_command node
check_command npm

# 检查 uv 是否安装
if ! command -v uv &> /dev/null; then
    echo "正在安装 uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
fi

echo "1. 启动后端服务..."
cd backend

# 安装依赖
echo "   安装后端依赖..."
uv sync

# 启动后端
echo "   启动后端服务..."
nohup uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/nl2bi-backend.log 2>&1 &
BACKEND_PID=$!
echo "   后端服务已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 3

cd ..

echo "2. 启动前端服务..."
cd frontend

# 安装依赖
echo "   安装前端依赖..."
npm install

# 启动前端
echo "   启动前端服务..."
nohup npm run dev > /tmp/nl2bi-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   前端服务已启动 (PID: $FRONTEND_PID)"

cd ..

echo ""
echo "=== NL2BI 系统已启动 ==="
echo "后端服务: http://localhost:8000"
echo "前端界面: http://localhost:5173"
echo "API 文档: http://localhost:8000/docs"
echo ""
echo "日志文件:"
echo "  后端日志: /tmp/nl2bi-backend.log"
echo "  前端日志: /tmp/nl2bi-frontend.log"
echo ""
echo "停止服务:"
echo "  kill $BACKEND_PID $FRONTEND_PID"