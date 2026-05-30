import React, { useState } from 'react';
import QueryInput from './components/QueryInput';
import ResultDisplay from './components/ResultDisplay';
import apiService from './services/api';
import type { QueryResponse } from './services/api';

const App: React.FC = () => {
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuerySubmit = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.query({ query });
      setResult(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '查询失败，请稍后重试';
      setError(errorMessage);
      setResult({
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  NL2BI
                </h1>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">
                  自然语言转BI报表系统
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                基于 Multi-Agent 架构
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：查询输入 */}
          <div className="lg:col-span-1">
            <QueryInput onSubmit={handleQuerySubmit} isLoading={isLoading} />

            {/* 说明卡片 */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                使用说明
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    1
                  </span>
                  <span>输入自然语言查询需求</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    2
                  </span>
                  <span>系统自动生成SQL并执行</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    3
                  </span>
                  <span>生成数据可视化图表</span>
                </li>
              </ul>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  示例查询
                </h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    • 查询每个地区的销售总额
                  </p>
                  <p className="text-sm text-gray-600">
                    • 显示销售额前10的产品
                  </p>
                  <p className="text-sm text-gray-600">
                    • 统计每月的销售趋势
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：结果展示 */}
          <div className="lg:col-span-2">
            <ResultDisplay result={result} isLoading={isLoading} />
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              © 2026 NL2BI. 基于 Multi-Agent 架构的自然语言转BI报表系统
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                技术栈: FastAPI + LangGraph + React + Echarts
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;