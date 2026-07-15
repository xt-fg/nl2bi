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
  onClear?: () => void;
}

const QueryHistory: React.FC<QueryHistoryProps> = ({ history, onSelect, onClear }) => {
  if (history.length === 0) {
    return (
      <div className="card-surface rounded-lg p-5">
        <div className="mb-4">
          <p className="panel-eyebrow">History</p>
          <h3 className="panel-title mt-1">查询历史</h3>
        </div>
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-500">暂无查询记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="panel-eyebrow">History</p>
          <h3 className="panel-title mt-1">查询历史</h3>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            清空
          </button>
        )}
      </div>

      <div className="subtle-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.query)}
            className="group w-full rounded-lg border border-slate-100 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/70"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-400">
                {item.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  item.hasError
                    ? 'bg-red-50 text-red-600'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {item.hasError ? '失败' : `${item.rowCount} 行`}
              </span>
            </div>
            <p className="line-clamp-2 text-sm font-medium leading-5 text-slate-700 group-hover:text-blue-700">
              {item.query}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QueryHistory;
