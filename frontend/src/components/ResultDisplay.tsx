import React, { useState, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { QueryResponse, SqlExecuteResponse } from '../services/api';
import apiService from '../services/api';

type ChartType = 'auto' | 'bar' | 'line' | 'pie' | 'table';

interface ResultDisplayProps {
  result: QueryResponse | null;
  isLoading: boolean;
  onSqlRerun?: (response: SqlExecuteResponse) => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, isLoading, onSqlRerun }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSql, setEditedSql] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('auto');
  const chartRef = useRef<ReactECharts>(null);

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
    const chartInstance = chartRef.current?.getEchartsInstance();
    if (!chartInstance) return;
    const url = chartInstance.getDataURL({ type: 'png', pixelRatio: 2 });
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

  // 获取当前应该显示的 echarts 配置
  const getDisplayConfig = useCallback((): Record<string, unknown> | null => {
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
  const showChart = chartType !== 'table' && getDisplayConfig();

  // 加载中
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">正在处理您的查询...</p>
          </div>
        </div>
      </div>
    );
  }

  // 无结果
  if (!result) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium">等待查询</p>
            <p className="text-sm">输入自然语言查询以生成BI报表</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误
  if (result.error && !result.data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-red-600">
            <svg className="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-lg font-medium">查询错误</p>
            <p className="text-sm mt-2">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasData = result.data && result.data.length > 0;
  const columns = hasData ? Object.keys(result.data![0]) : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* 头部：标题 + 操作按钮 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">查询结果</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          {result.execution_time && <span>耗时 {result.execution_time.toFixed(1)}s</span>}
          {result.retry_count !== undefined && result.retry_count > 0 && (
            <span className="text-orange-500">重试 {result.retry_count}次</span>
          )}
        </div>
      </div>

      {/* SQL 区域 */}
      {result.sql && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">生成的 SQL</h4>
            <div className="flex items-center space-x-2">
              <button onClick={copySql} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50" title="复制 SQL">
                📋 复制
              </button>
              <button onClick={handleEditStart} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">
                ✏️ 编辑执行
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedSql}
                onChange={(e) => setEditedSql(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-vertical"
                rows={4}
                spellCheck={false}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEditExecute}
                  disabled={isExecuting || !editedSql.trim()}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isExecuting ? '执行中...' : '▶ 执行'}
                </button>
                <button onClick={handleEditCancel} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                  取消
                </button>
              </div>
            </div>
          ) : (
            <pre className="bg-gray-50 rounded-lg p-3 overflow-x-auto text-sm font-mono text-gray-800">
              {result.sql}
            </pre>
          )}
        </div>
      )}

      {/* 图表类型切换 + 导出按钮 */}
      {hasData && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {([
              { key: 'auto', label: '智能', icon: '🤖' },
              { key: 'bar', label: '柱状', icon: '📊' },
              { key: 'line', label: '折线', icon: '📈' },
              { key: 'pie', label: '饼图', icon: '🥧' },
              { key: 'table', label: '表格', icon: '📋' },
            ] as { key: ChartType; label: string; icon: string }[]).map((item) => (
              <button
                key={item.key}
                onClick={() => setChartType(item.key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  chartType === item.key
                    ? 'bg-white text-blue-600 shadow-sm font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={exportCsv} className="text-xs text-gray-500 hover:text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-50 border border-gray-200">
              📥 导出 CSV
            </button>
            {showChart && (
              <button onClick={exportChartImage} className="text-xs text-gray-500 hover:text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-50 border border-gray-200">
                🖼️ 导出图片
              </button>
            )}
          </div>
        </div>
      )}

      {/* 图表展示 */}
      {showChart && (
        <div className="mb-6" style={{ height: 400 }}>
          <ReactECharts
            ref={chartRef}
            option={getDisplayConfig()}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      )}

      {/* 数据表格 */}
      {hasData && (chartType === 'table' || !showChart) && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {result.data!.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 数据行数提示 */}
      {hasData && result.data!.length > 100 && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          显示前 100 行，共 {result.data!.length} 行
        </p>
      )}
    </div>
  );
};

export default ResultDisplay;
