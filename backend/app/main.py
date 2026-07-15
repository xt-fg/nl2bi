import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import router as api_router
from app.agent.tools import configure_llm_api_base_url, configure_llm_api_key
from app.core.config import APP_HOST, APP_PORT, DATABASE_URL, DEBUG
from app.utils.database import db_manager
from app.utils.metadata import (
    LLM_API_BASE_URL_OVERRIDE_SETTING,
    LLM_API_KEY_OVERRIDE_SETTING,
    metadata_manager,
)

# 配置日志
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("正在初始化数据库...")
    db_manager.initialize()
    logger.info("数据库初始化完成，共 %d 张表", len(db_manager.get_tables()))
    logger.info("正在初始化应用元数据...")
    metadata_manager.initialize()
    configure_llm_api_key(
        metadata_manager.get_setting(LLM_API_KEY_OVERRIDE_SETTING)
    )
    configure_llm_api_base_url(
        metadata_manager.get_setting(LLM_API_BASE_URL_OVERRIDE_SETTING)
    )
    active_source = metadata_manager.get_active_data_source()
    if active_source and active_source.get("connection_url") != DATABASE_URL:
        logger.info("切换到已激活数据源: %s", active_source["connection_label"])
        db_manager.switch_database(active_source["connection_url"])
    yield
    logger.info("应用关闭")


app = FastAPI(
    title="NL2BI API",
    description="自然语言转BI报表 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "NL2BI API 运行中", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=APP_HOST, port=APP_PORT, reload=DEBUG)
