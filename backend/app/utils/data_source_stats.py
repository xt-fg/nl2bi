import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Callable, Optional

from app.core.config import DATA_SOURCE_STATS_TTL_SECONDS
from app.utils.database import db_manager

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DataSourceStats:
    table_count: int
    row_count: int


def collect_data_source_stats() -> DataSourceStats:
    """Collect active-source statistics outside the async event loop."""
    tables = db_manager.get_tables()
    total_rows = 0
    if not db_manager.engine:
        return DataSourceStats(table_count=0, row_count=0)

    preparer = db_manager.engine.dialect.identifier_preparer
    for table in tables:
        try:
            table_name = preparer.quote(table["name"])
            result = db_manager.execute_query(
                f"SELECT COUNT(*) AS count FROM {table_name}", max_rows=1
            )
            total_rows += int(result.iloc[0]["count"]) if not result.empty else 0
        except Exception:
            logger.warning("统计表行数失败: %s", table["name"], exc_info=True)

    return DataSourceStats(table_count=len(tables), row_count=total_rows)


class DataSourceStatsCache:
    def __init__(
        self,
        ttl_seconds: int = DATA_SOURCE_STATS_TTL_SECONDS,
        collector: Callable[[], DataSourceStats] = collect_data_source_stats,
    ) -> None:
        self.ttl_seconds = ttl_seconds
        self.collector = collector
        self._value: Optional[DataSourceStats] = None
        self._expires_at = 0.0
        self._lock = asyncio.Lock()

    async def get(self) -> DataSourceStats:
        now = time.monotonic()
        if self._value is not None and now < self._expires_at:
            return self._value

        async with self._lock:
            now = time.monotonic()
            if self._value is not None and now < self._expires_at:
                return self._value
            self._value = await asyncio.to_thread(self.collector)
            self._expires_at = now + self.ttl_seconds
            return self._value

    def invalidate(self) -> None:
        self._value = None
        self._expires_at = 0.0


data_source_stats_cache = DataSourceStatsCache()
