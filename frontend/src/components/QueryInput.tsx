import React, { useState } from 'react';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

const QueryInput: React.FC<QueryInputProps> = ({ onSubmit, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  const exampleQueries = [
    '查询每个地区的销售总额',
    '显示销售额前10的产品',
    '统计每月的销售趋势',
    '查看各个产品类别的销售占比',
  ];

  return (
    <div className="card-surface rounded-lg p-5">
      <div className="mb-4">
        <p className="panel-eyebrow">Ask</p>
        <h2 className="panel-title mt-1">自然语言查询</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="sr-only">查询内容</span>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：查询每个地区的销售总额"
            className="min-h-32 w-full resize-none rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
            rows={5}
            disabled={isLoading}
          />
        </label>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">常用问题</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition ${
            !query.trim() || isLoading
              ? 'cursor-not-allowed bg-slate-200 text-slate-500'
              : 'bg-slate-950 text-white shadow-sm hover:bg-blue-700'
          }`}
        >
          {isLoading && (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
            </svg>
          )}
          {isLoading ? '分析中' : '执行查询'}
        </button>
      </form>
    </div>
  );
};

export default QueryInput;
