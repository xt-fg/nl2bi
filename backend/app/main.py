from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.endpoints import router as api_router
from app.core.config import APP_HOST, APP_PORT, DEBUG
from app.utils.database import db_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化数据库
    print("正在初始化数据库...")
    db_manager.initialize()
    print("数据库初始化完成")
    yield
    # 关闭时清理资源
    print("应用关闭")


app = FastAPI(
    title="NL2BI API",
    description="自然语言转BI报表 API",
    version="0.1.0",
    lifespan=lifespan,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含 API 路由
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """健康检查端点"""
    return {"message": "NL2BI API 运行中", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=APP_HOST,
        port=APP_PORT,
        reload=DEBUG,
    )