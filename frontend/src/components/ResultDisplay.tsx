import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { QueryResponse } from '../services/api';

interface ResultDisplayProps {
  result: QueryResponse | null;
  isLoading: boolean;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-gray-600">正在处理您的查询...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <svg
              className="h-12 w-12 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-lg font-medium">等待查询</p>
            <p className="text-sm">输入自然语言查询以生成BI报表</p>
          </div>
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-red-600">
            <svg
              className="h-12 w-12 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-lg font-medium">查询错误</p>
            <p className="text-sm mt-2">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const renderTable = () => {
    if (!result.data || result.data.length === 0) return null;

    const columns = Object.keys(result.data[0]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {result.data.slice(0, 20).map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {row[column] !== null && row[column] !== undefined
                      ? String(row[column])
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderChart = () => {
    if (!result.echarts_config) return null;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">数据可视化</h3>
        <div className="h-96">
          <ReactECharts
            option={result.echarts_config}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">查询结果</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          {result.execution_time && (
            <span>耗时: {result.execution_time.toFixed(2)}秒</span>
          )}
          {result.retry_count !== undefined && result.retry_count > 0 && (
            <span>重试: {result.retry_count}次</span>
          )}
        </div>
      </div>

      {/* SQL 显示 */}
      {result.sql && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">生成的 SQL</h4>
          <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-gray-800">
            {result.sql}
          </pre>
        </div>
      )}

      {/* 数据表格 */}
      {result.data && result.data.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            数据结果 ({result.data.length} 行)
          </h4>
          <div className="border rounded-lg overflow-hidden">
            {renderTable()}
          </div>
          {result.data.length > 20 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              显示前 20 行，共 {result.data.length} 行
            </p>
          )}
        </div>
      )}

      {/* Echarts 图表 */}
      {renderChart()}
    </div>
  );
};

export default ResultDisplay;