import asyncio

from app.utils.data_source_stats import DataSourceStats, DataSourceStatsCache


def test_stats_cache_reuses_value_until_invalidated():
    calls = 0

    def collect() -> DataSourceStats:
        nonlocal calls
        calls += 1
        return DataSourceStats(table_count=3, row_count=100)

    cache = DataSourceStatsCache(ttl_seconds=60, collector=collect)

    async def exercise_cache():
        first = await cache.get()
        second = await cache.get()
        cache.invalidate()
        third = await cache.get()
        return first, second, third

    first, second, third = asyncio.run(exercise_cache())

    assert first == second == third
    assert calls == 2
