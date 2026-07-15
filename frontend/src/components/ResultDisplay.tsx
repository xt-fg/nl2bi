import React, { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import ChartErrorBoundary from './ChartErrorBoundary';
import type { ChartRendererHandle } from './ChartRenderer';
import type { QueryResponse, SqlExecuteResponse } from '../services/api';
import apiService from '../services/api';

const ChartRenderer = lazy(() => import('./ChartRenderer'));

type ChartType = 'auto' | 'bar' | 'line' | 'pie' | 'table';

interface ResultDisplayProps {
  result: QueryResponse | null;
  isLoading: boolean;
  onSqlRerun?: (response: SqlExecuteResponse) => void;
  onSaveReport?: (name: string, description?: string) => Promise<void>;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  isLoading,
  onSqlRerun,
  onSaveReport,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSql, setEditedSql] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('auto');
  const [reportName, setReportName] = useState('');
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const chartRef = useRef<ChartRendererHandle>(null);

  // SQL 编辑相关
  const handleEditStart = useCallback(() => {
    setEditedSql(result?.sql || '');
    setIsEditing(true);
  }, [result]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditedSql('');
  }, []);

  const handleEditExecute = useCallback(async () => {
    if (!editedSql.trim()) return;
    setIsExecuting(true);
    try {
      const response = await apiService.executeSql({ sql: editedSql.trim() });
      if (onSqlRerun) {
        onSqlRerun(response);
      }
      setIsEditing(false);
    } catch (err) {
      alert(`执行失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsExecuting(false);
    }
  }, [editedSql, onSqlRerun]);

  // 导出 CSV
  const exportCsv = useCallback(() => {
    if (!result?.data || result.data.length === 0) return;
    const columns = Object.keys(result.data[0]);
    const header = columns.join(',');
    const rows = result.data.map(row =>
      columns.map(col => {
        const val = String(row[col] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nl2bi_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // 导出图表为图片
  const exportChartImage = useCallback(() => {
    const url = chartRef.current?.getDataUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `nl2bi_chart_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }, []);

  // 复制 SQL
  const copySql = useCallback(() => {
    if (result?.sql) {
      navigator.clipboard.writeText(result.sql);
    }
  }, [result]);

  const handleSaveReport = useCallback(async () => {
    if (!onSaveReport || !result?.data?.length) return;
    const name = reportName.trim() || `数据报表 ${new Date().toLocaleString('zh-CN')}`;
    setIsSavingReport(true);
    setSaveMessage('');
    try {
      await onSaveReport(name, result.insight_summary);
      setReportName('');
      setSaveMessage('已保存为报表');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : '保存报表失败');
    } finally {
      setIsSavingReport(false);
    }
  }, [onSaveReport, reportName, result]);

  // 获取当前应该显示的 echarts 配置
  const displayConfig = useMemo((): Record<string, unknown> | null => {
    if (!result?.echarts_config || !result?.data || result.data.length === 0) return null;
    if (chartType === 'table') return null; // 表格模式不显示图表

    const config = { ...result.echarts_config } as Record<string, unknown>;

    if (chartType === 'auto') return config;

    // 切换图表类型
    const series = Array.isArray(config.series) ? [...config.series] : [];
    const newSeries = series.map((s: Record<string, unknown>) => ({ ...s, type: chartType }));
    config.series = newSeries;

    // 饼图需要特殊处理
    if (chartType === 'pie') {
      const data = result.data;
      const columns = Object.keys(data[0]);
      if (columns.length >= 2) {
        const catCol = columns[0];
        const valCol = columns[1];
        config.series = [{
          type: 'pie',
          radius: '50%',
          data: data.map(row => ({ name: String(row[catCol]), value: row[valCol] })),
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
        }];
        delete config.xAxis;
        delete config.yAxis;
      }
    }

    return config;
  }, [result, chartType]);

  // 判断是否应该显示图表区域
  const showChart = chartType !== 'table' && displayConfig !== null;

  // 加载中
  if (isLoading) {
    return (
      <div className="card-surface rounded-lg p-6">
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70">
          <div className="text-center">
            <svg className="mx-auto mb-4 h-9 w-9 animate-spin text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold text-slate-700">正在生成数据分析结果</p>
            <p className="mt-1 text-xs font-medium text-slate-500">SQL、数据和图表将自动同步更新</p>
          </div>
        </div>
      </div>
    );
  }

  // 无结果
  if (!result) {
    return (
      <div className="card-surface rounded-lg p-6">
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70">
          <div className="text-center text-slate-500">
            <svg className="mx-auto mb-4 h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-base font-bold text-slate-700">等待查询</p>
            <p className="mt-1 text-sm font-medium">结果区会展示 SQL、图表和明细数据</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误
  if (result.error && !result.data) {
    return (
      <div className="card-surface rounded-lg border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="panel-eyebrow text-red-600">Error</p>
                <h3 className="panel-title mt-1">查询失败</h3>
                <p className="mt-1 text-sm leading-6 text-slate-700">{result.error}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
                {result.execution_time && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">耗时 {result.execution_time.toFixed(1)}s</span>
                )}
                {result.retry_count !== undefined && result.retry_count > 0 && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">重试 {result.retry_count} 次</span>
                )}
              </div>
            </div>

            {result.error_detail && (
              <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm leading-6 text-slate-700">
                {result.error_detail}
              </p>
            )}

            {result.suggestions && result.suggestions.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-bold text-slate-800">可以尝试</h4>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start text-sm leading-6 text-slate-600">
                      <span className="mr-2 mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.sql && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-700">最后生成的 SQL</h4>
                  <div className="flex items-center gap-2">
                    <button onClick={copySql} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="复制 SQL">
                      复制
                    </button>
                    <button onClick={handleEditStart} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-700">
                      编辑执行
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedSql}
                      onChange={(e) => setEditedSql(e.target.value)}
                      className="w-full resize-y rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      rows={4}
                      spellCheck={false}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleEditExecute}
                        disabled={isExecuting || !editedSql.trim()}
                        className="rounded-lg bg-slate-950 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        {isExecuting ? '执行中' : '执行'}
                      </button>
                      <button onClick={handleEditCancel} className="rounded-lg px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100">
                    {result.sql}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const hasData = result.data && result.data.length > 0;
  const columns = hasData ? Object.keys(result.data![0]) : [];

  return (
    <div className="card-surface min-w-0 overflow-hidden rounded-lg p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="panel-eyebrow">Result</p>
          <h3 className="panel-title mt-1">查询结果</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          {result.execution_time && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1">耗时 {result.execution_time.toFixed(1)}s</span>
          )}
          {result.retry_count !== undefined && result.retry_count > 0 && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">重试 {result.retry_count} 次</span>
          )}
          {hasData && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{result.data!.length} 行</span>
          )}
        </div>
      </div>

      {result.sql && (
        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-700">生成的 SQL</h4>
            <div className="flex items-center gap-2">
              <button onClick={copySql} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="复制 SQL">
                复制
              </button>
              <button onClick={handleEditStart} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-700">
                编辑执行
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedSql}
                onChange={(e) => setEditedSql(e.target.value)}
                className="w-full resize-y rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                rows={4}
                spellCheck={false}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditExecute}
                  disabled={isExecuting || !editedSql.trim()}
                  className="rounded-lg bg-slate-950 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isExecuting ? '执行中' : '执行'}
                </button>
                <button onClick={handleEditCancel} className="rounded-lg px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                  取消
                </button>
              </div>
            </div>
          ) : (
            <pre className="subtle-scrollbar overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100">
              {result.sql}
            </pre>
          )}
        </div>
      )}

      {result.insight_summary && (
        <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs font-black uppercase text-blue-700">Insight</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
            {result.insight_summary}
          </p>
        </div>
      )}

      {hasData && (
        <div className="mb-5 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <div className="flex w-full flex-wrap gap-1 rounded-lg bg-slate-100 p-1 xl:w-auto">
            {([
              { key: 'auto', label: '智能' },
              { key: 'bar', label: '柱状' },
              { key: 'line', label: '折线' },
              { key: 'pie', label: '饼图' },
              { key: 'table', label: '表格' },
            ] as { key: ChartType; label: string }[]).map((item) => (
              <button
                key={item.key}
                onClick={() => setChartType(item.key)}
                className={`min-h-9 flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition xl:flex-none ${
                  chartType === item.key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSaveReport && (
              <div className="flex min-w-0 flex-1 items-center gap-2 xl:flex-none">
                <input
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="报表名称"
                  className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  onClick={handleSaveReport}
                  disabled={isSavingReport}
                  className="h-9 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingReport ? '保存中' : '保存报表'}
                </button>
              </div>
            )}
            <button onClick={exportCsv} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
              导出 CSV
            </button>
            {showChart && (
              <button onClick={exportChartImage} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                导出图片
              </button>
            )}
          </div>
          {saveMessage && (
            <p className="text-xs font-semibold text-slate-500 xl:w-full">{saveMessage}</p>
          )}
        </div>
      )}

      {showChart && (
        <div className="mb-6 h-[420px] rounded-lg border border-slate-200 bg-white p-3">
          <Suspense fallback={(
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
              正在加载图表
            </div>
          )}>
            <ChartErrorBoundary
              key={`${result.query_id ?? result.sql ?? 'result'}-${chartType}`}
              onUseTable={() => setChartType('table')}
            >
              <ChartRenderer ref={chartRef} option={displayConfig!} />
            </ChartErrorBoundary>
          </Suspense>
        </div>
      )}

      {hasData && (chartType === 'table' || !showChart) && (
        <div className="subtle-scrollbar overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {result.data!.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-blue-50/50">
                  {columns.map((col) => (
                    <td key={col} className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-700">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasData && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-500">本次查询未返回数据行</p>
        </div>
      )}

      {hasData && result.data!.length > 100 && (
        <p className="mt-3 text-center text-xs font-medium text-slate-500">
          显示前 100 行，共 {result.data!.length} 行
        </p>
      )}
    </div>
  );
};

export default ResultDisplay;
