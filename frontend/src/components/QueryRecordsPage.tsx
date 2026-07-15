import React, { useMemo, useState } from 'react';
import type { QueryRecord } from '../services/api';

interface QueryRecordsPageProps {
  records: QueryRecord[];
  isLoading: boolean;
  onRunAgain: (query: string) => void;
}

const QueryRecordsPage: React.FC<QueryRecordsPageProps> = ({ records, isLoading, onRunAgain }) => {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'success' | 'failed'>('all');

  const visibleRecords = useMemo(() => records.filter((record) => {
    const matchesKeyword = !keyword.trim()
      || record.query.toLowerCase().includes(keyword.trim().toLowerCase())
      || record.sql?.toLowerCase().includes(keyword.trim().toLowerCase());
    const isSuccess = record.status === 'success';
    const matchesStatus = status === 'all' || (status === 'success' ? isSuccess : !isSuccess);
    return matchesKeyword && matchesStatus;
  }), [keyword, records, status]);

  if (isLoading) {
    return <div className="card-surface rounded-xl px-6 py-16 text-center text-sm font-semibold text-slate-500">正在加载查询记录</div>;
  }

  return (
    <section className="card-surface rounded-xl p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">执行记录</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">当前保留最近 {records.length} 条查询</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索问题或 SQL"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">全部状态</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
          </select>
        </div>
      </div>

      {visibleRecords.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm font-medium text-slate-500">
          没有符合条件的查询记录
        </div>
      ) : (
        <div className="subtle-scrollbar overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['问题', '状态', '返回行数', '耗时', '执行时间', ''].map((heading, index) => (
                  <th key={`${heading}-${index}`} className="whitespace-nowrap px-4 py-3 text-left text-xs font-black text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleRecords.map((record) => {
                const isSuccess = record.status === 'success';
                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="max-w-lg px-4 py-3">
                      <p className="line-clamp-1 text-sm font-bold text-slate-800">{record.query}</p>
                      <p className="mt-1 line-clamp-1 font-mono text-xs font-medium text-slate-400">{record.sql || record.error || '未生成 SQL'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {isSuccess ? '成功' : '失败'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600">{record.row_count.toLocaleString('zh-CN')}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600">{record.execution_time == null ? '-' : `${record.execution_time.toFixed(2)}s`}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-500">{new Date(record.created_at).toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onRunAgain(record.query)} className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
                        再次运行
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default QueryRecordsPage;
