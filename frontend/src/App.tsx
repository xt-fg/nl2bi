import React, { useState, useCallback } from 'react';
import QueryInput from './components/QueryInput';
import QueryHistory from './components/QueryHistory';
import type { HistoryItem } from './components/QueryHistory';
import ResultDisplay from './components/ResultDisplay';
import ChatPanel from './components/ChatPanel';
import apiService from './services/api';
import type { QueryResponse } from './services/api';

const App: React.FC = () => {
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleQuerySubmit = useCallback(async (query: string) => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await apiService.query({ query });
      setResult(response);

      // 添加到历史
      const item: HistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date(),
        hasError: !!response.error,
        rowCount: response.data?.length ?? 0,
      };
      setHistory((prev) => [item, ...prev].slice(0, 20)); // 最多保留20条
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '查询失败，请稍后重试';
      setResult({ error: errorMessage });

      const item: HistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date(),
        hasError: true,
        rowCount: 0,
      };
      setHistory((prev) => [item, ...prev].slice(0, 20));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChatMessage = useCallback(
    async (message: string, context: QueryResponse): Promise<string> => {
      const response = await apiService.chat({ message, context });
      if (response.error) throw new Error(response.error);
      return response.response;
    },
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">NL2BI</h1>
              <span className="ml-4 text-sm text-gray-500">自然语言转BI报表系统</span>
            </div>
            <span className="text-sm text-gray-500">基于 Multi-Agent 架构</span>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧：查询输入 + 历史 */}
          <div className="lg:col-span-1 space-y-6">
            <QueryInput onSubmit={handleQuerySubmit} isLoading={isLoading} />
            <QueryHistory
              history={history}
              onSelect={handleQuerySubmit}
              onClear={() => setHistory([])}
            />

            {/* 使用说明 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">使用说明</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {['输入自然语言查询需求', '系统自动生成SQL并执行', '生成数据可视化图表'].map(
                  (step, i) => (
                    <li key={i} className="flex items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>

          {/* 右侧：结果展示 + 对话 */}
          <div className="lg:col-span-3 space-y-6">
            <ResultDisplay result={result} isLoading={isLoading} />
            <ChatPanel queryResult={result} onSendMessage={handleChatMessage} />
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>© 2026 NL2BI. 基于 Multi-Agent 架构的自然语言转BI报表系统</span>
            <span>FastAPI + LangGraph + React + Echarts</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
