import React from 'react';
import type { ReportSummary } from '../services/api';

interface ReportsPageProps {
  reports: ReportSummary[];
  isLoading: boolean;
  onOpenReport: (id: number) => Promise<void>;
  onStartAnalysis: () => void;
}

const formatDate = (value: string) => new Date(value).toLocaleString('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const ReportsPage: React.FC<ReportsPageProps> = ({ reports, isLoading, onOpenReport, onStartAnalysis }) => {
  const [openingId, setOpeningId] = React.useState<number | null>(null);
  const [error, setError] = React.useState('');

  const handleOpen = async (id: number) => {
    setOpeningId(id);
    setError('');
    try {
      await onOpenReport(id);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : '打开报表失败');
    } finally {
      setOpeningId(null);
    }
  };

  if (isLoading) {
    return <div className="card-surface rounded-xl px-6 py-16 text-center text-sm font-semibold text-slate-500">正在加载报表</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="card-surface rounded-xl px-6 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3h8l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2zM15 3v5h5M9 13h6M9 17h6" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-black text-slate-900">还没有保存报表</h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">完成一次数据分析后，可以将图表、明细和洞察保存到这里。</p>
        <button onClick={onStartAnalysis} className="mt-5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
          开始分析
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-500">共 {reports.length} 份已保存报表</p>
        <button onClick={onStartAnalysis} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
          新建分析
        </button>
      </div>
      {error && <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {reports.map((report) => (
          <article key={report.id} className="card-surface flex min-h-56 flex-col rounded-xl p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-400">更新于 {formatDate(report.updated_at)}</span>
            </div>
            <h2 className="mt-4 line-clamp-1 text-base font-black text-slate-900">{report.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-500">
              {report.description || report.insight_summary || report.query}
            </p>
            <div className="mt-auto flex items-end justify-between gap-3 pt-5">
              <p className="line-clamp-1 min-w-0 text-xs font-semibold text-slate-400">{report.query}</p>
              <button
                onClick={() => handleOpen(report.id)}
                disabled={openingId !== null}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
              >
                {openingId === report.id ? '打开中' : '查看报表'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
