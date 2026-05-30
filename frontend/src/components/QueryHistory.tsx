import React from 'react';

export interface HistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  hasError: boolean;
  rowCount: number;
}

interface QueryHistoryProps {
  history: HistoryItem[];
  onSelect: (query: string) => void;
  onClear: () => void;
}

const QueryHistory: React.FC<QueryHistoryProps> = ({ history, onSelect, onClear }) => {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">查询历史</h3>
        <p className="text-sm text-gray-500 text-center py-4">
          暂无查询记录
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">查询历史</h3>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-red-500 transition-colors"
        >
          清空
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.query)}
            className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">
                {item.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  item.hasError
                    ? 'bg-red-100 text-red-600'
                    : 'bg-green-100 text-green-600'
                }`}
              >
                {item.hasError ? '失败' : `${item.rowCount} 行`}
              </span>
            </div>
            <p className="text-sm text-gray-700 truncate group-hover:text-blue-700">
              {item.query}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QueryHistory;
