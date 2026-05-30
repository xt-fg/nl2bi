import os
from pathlib import Path

from dotenv import load_dotenv

# 加载环境变量
load_dotenv(override=True)

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///:memory:")

# OpenAI 配置
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# 应用配置
APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", "8000"))
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

# 重试配置
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))

# 模拟数据配置
SAMPLE_DATA_ROWS = int(os.getenv("SAMPLE_DATA_ROWS", "1000"))